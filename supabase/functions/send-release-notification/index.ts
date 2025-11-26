// Send Release Notification Edge Function
// Sends email notifications to distributors about new software releases
// Supports only_unnotified parameter to notify only new targets

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  release_id: string;
  only_unnotified?: boolean;
}

interface DistributorTarget {
  distributor_id: string;
  notified_at: string | null;
  distributors: {
    id: string;
    company_name: string;
    user_profiles: Array<{
      id: string;
      email: string;
      full_name: string;
    }>;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { release_id, only_unnotified = false }: RequestBody = await req.json();

    if (!release_id) {
      return new Response(
        JSON.stringify({ error: 'release_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing notifications for release ${release_id}, only_unnotified: ${only_unnotified}`);

    // Fetch release details
    const { data: release, error: releaseError } = await supabase
      .from('software_releases')
      .select('id, name, version, release_type, product_name, target_type, release_notes')
      .eq('id', release_id)
      .single();

    if (releaseError || !release) {
      console.error('Release not found:', releaseError);
      return new Response(
        JSON.stringify({ error: 'Release not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Release found: ${release.name} v${release.version}`);

    // Collect email recipients based on target type
    const recipients: Array<{ email: string; name: string; distributorId?: string; deviceId?: string }> = [];

    if (release.target_type === 'distributors') {
      // Query distributor targets
      let query = supabase
        .from('software_release_distributors')
        .select(`
          distributor_id,
          notified_at,
          distributors (
            id,
            company_name,
            user_profiles (id, email, full_name)
          )
        `)
        .eq('release_id', release_id);

      // Filter to only unnotified if requested
      if (only_unnotified) {
        query = query.is('notified_at', null);
      }

      const { data: distributorTargets, error: distError } = await query;

      if (distError) {
        console.error('Error fetching distributor targets:', distError);
      } else if (distributorTargets) {
        for (const target of distributorTargets as unknown as DistributorTarget[]) {
          const distributor = target.distributors;
          if (distributor?.user_profiles) {
            for (const profile of distributor.user_profiles) {
              if (profile.email) {
                recipients.push({
                  email: profile.email,
                  name: profile.full_name || distributor.company_name,
                  distributorId: target.distributor_id,
                });
              }
            }
          }
        }
      }
    } else if (release.target_type === 'devices') {
      // Query device targets - get distributors through customers
      let query = supabase
        .from('software_release_devices')
        .select(`
          device_id,
          notified_at,
          devices (
            id,
            customers (
              distributor_id,
              distributors (
                id,
                company_name,
                user_profiles (id, email, full_name)
              )
            )
          )
        `)
        .eq('release_id', release_id);

      if (only_unnotified) {
        query = query.is('notified_at', null);
      }

      const { data: deviceTargets, error: devError } = await query;

      if (devError) {
        console.error('Error fetching device targets:', devError);
      } else if (deviceTargets) {
        // Track seen distributor IDs to avoid duplicate emails
        const seenDistributors = new Set<string>();

        for (const target of deviceTargets as any[]) {
          const device = target.devices;
          const customer = device?.customers;
          const distributor = customer?.distributors;

          if (distributor && !seenDistributors.has(distributor.id)) {
            seenDistributors.add(distributor.id);

            if (distributor.user_profiles) {
              for (const profile of distributor.user_profiles) {
                if (profile.email) {
                  recipients.push({
                    email: profile.email,
                    name: profile.full_name || distributor.company_name,
                    deviceId: target.device_id,
                  });
                }
              }
            }
          }
        }
      }
    } else if (release.target_type === 'all') {
      // For 'all' releases, notify all active distributors
      // But if only_unnotified is true, we'd need a different tracking mechanism
      // For now, skip 'all' type when only_unnotified is true
      if (!only_unnotified) {
        const { data: allDistributors, error: allError } = await supabase
          .from('distributors')
          .select(`
            id,
            company_name,
            user_profiles (id, email, full_name)
          `)
          .eq('status', 'active');

        if (allError) {
          console.error('Error fetching all distributors:', allError);
        } else if (allDistributors) {
          for (const distributor of allDistributors as any[]) {
            if (distributor.user_profiles) {
              for (const profile of distributor.user_profiles) {
                if (profile.email) {
                  recipients.push({
                    email: profile.email,
                    name: profile.full_name || distributor.company_name,
                  });
                }
              }
            }
          }
        }
      }
    }

    console.log(`Found ${recipients.length} recipients to notify`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new recipients to notify',
          sent_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send emails using Resend (if API key is configured)
    let sentCount = 0;
    const errors: string[] = [];

    if (resendApiKey) {
      const emailSubject = `New ${release.release_type} Release: ${release.name} v${release.version}`;
      const productInfo = release.product_name ? ` for ${release.product_name}` : '';

      for (const recipient of recipients) {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Visum Medical <releases@visum-medical.com>',
              to: recipient.email,
              subject: emailSubject,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #00a8b5;">New Software Release Available</h2>
                  <p>Hello ${recipient.name},</p>
                  <p>A new ${release.release_type} release is now available${productInfo}:</p>
                  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0 0 8px 0;">${release.name}</h3>
                    <p style="margin: 0; color: #666;">Version: ${release.version}</p>
                  </div>
                  ${release.release_notes ? `
                    <h4>Release Notes:</h4>
                    <p style="white-space: pre-wrap;">${release.release_notes}</p>
                  ` : ''}
                  <p>
                    <a href="https://portal.visum-medical.com/software-releases"
                       style="display: inline-block; background: #00a8b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                      View Release
                    </a>
                  </p>
                  <p style="color: #666; font-size: 12px; margin-top: 32px;">
                    This is an automated message from the Visum Medical Portal.
                  </p>
                </div>
              `,
            }),
          });

          if (response.ok) {
            sentCount++;

            // Update notified_at timestamp
            if (recipient.distributorId) {
              await supabase
                .from('software_release_distributors')
                .update({ notified_at: new Date().toISOString() })
                .eq('release_id', release_id)
                .eq('distributor_id', recipient.distributorId);
            } else if (recipient.deviceId) {
              await supabase
                .from('software_release_devices')
                .update({ notified_at: new Date().toISOString() })
                .eq('release_id', release_id)
                .eq('device_id', recipient.deviceId);
            }
          } else {
            const errorText = await response.text();
            errors.push(`Failed to send to ${recipient.email}: ${errorText}`);
          }
        } catch (emailError) {
          errors.push(`Error sending to ${recipient.email}: ${emailError}`);
        }
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping actual email send');
      // Still update notified_at for tracking purposes
      for (const recipient of recipients) {
        if (recipient.distributorId) {
          await supabase
            .from('software_release_distributors')
            .update({ notified_at: new Date().toISOString() })
            .eq('release_id', release_id)
            .eq('distributor_id', recipient.distributorId);
        } else if (recipient.deviceId) {
          await supabase
            .from('software_release_devices')
            .update({ notified_at: new Date().toISOString() })
            .eq('release_id', release_id)
            .eq('device_id', recipient.deviceId);
        }
        sentCount++;
      }
    }

    console.log(`Sent ${sentCount} notifications, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        total_recipients: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
