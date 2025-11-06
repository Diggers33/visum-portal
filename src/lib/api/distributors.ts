import { supabase } from '../supabase';
import { supabaseAdmin } from '../supabase-admin';

export interface Distributor {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  role: 'distributor';
  territory?: string;
  account_type?: string;
  status?: 'invited' | 'active' | 'inactive' | 'pending_acceptance';
  invited_at?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDistributorInput {
  email: string;
  full_name?: string;
  company_name?: string;
  territory?: string;
  account_type?: string;
  send_invite?: boolean;
}

export interface UpdateDistributorInput {
  full_name?: string;
  company_name?: string;
  territory?: string;
  account_type?: string;
  status?: 'active' | 'inactive';
}

/**
 * Fetch all distributors
 */
export async function fetchDistributors(filters?: {
  status?: string[];
  territory?: string[];
  search?: string;
}): Promise<{ data: Distributor[] | null; error: any }> {
  try {
    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'distributor')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    // Apply territory filter
    if (filters?.territory && filters.territory.length > 0) {
      query = query.in('territory', filters.territory);
    }

    // Apply search filter
    if (filters?.search) {
      query = query.or(
        `email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch distributors error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Fetch distributors exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single distributor by ID
 */
export async function fetchDistributorById(
  id: string
): Promise<{ data: Distributor | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'distributor')
      .single();

    if (error) {
      console.error('Fetch distributor error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Fetch distributor exception:', error);
    return { data: null, error };
  }
}

/**
 * Create a new distributor with real auth user and invitation
 */
export async function createDistributor(
  input: CreateDistributorInput
): Promise<{ data: Distributor | null; error: any }> {
  console.log('🔧 createDistributor called:', input);

  try {
    // Check if email already exists in auth.users or user_profiles
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', input.email.toLowerCase())
      .single();

    if (existingProfile) {
      return {
        data: null,
        error: { message: 'A user with this email already exists' },
      };
    }

    let authUserId: string;
    let userCreated = false;

    if (input.send_invite) {
      console.log('📧 Creating auth user and sending invitation...');
      
      // Create auth user using admin client
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email.toLowerCase(),
        email_confirm: false, // They'll confirm via invitation
        user_metadata: {
          full_name: input.full_name,
          company_name: input.company_name,
          role: 'distributor',
          territory: input.territory,
        }
      });

      if (authError) {
        console.error('❌ Auth user creation error:', authError);
        return { data: null, error: authError };
      }

      authUserId = authUser.user.id;
      userCreated = true;

      // Send invitation email
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        input.email.toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/callback?type=invite`,
          data: {
            role: 'distributor',
            full_name: input.full_name,
            company_name: input.company_name,
            territory: input.territory,
          }
        }
      );

      if (inviteError) {
        console.error('❌ Invitation email error:', inviteError);
        // Clean up created user if invitation fails
        if (userCreated) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }
        return { data: null, error: inviteError };
      }

      console.log('✅ Invitation email sent successfully');
    } else {
      // Create a placeholder profile without auth user
      authUserId = crypto.randomUUID();
    }

    // Create user profile
    const profileData = {
      id: authUserId,
      email: input.email.toLowerCase(),
      full_name: input.full_name,
      company_name: input.company_name,
      role: 'distributor',
      territory: input.territory,
      account_type: input.account_type,
      status: input.send_invite ? 'invited' : 'pending_acceptance',
      invited_at: input.send_invite ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('❌ Create profile error:', error);
      // Clean up created auth user if profile creation fails
      if (userCreated) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return { data: null, error };
    }

    console.log('✅ Distributor created successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 Create distributor exception:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing distributor
 */
export async function updateDistributor(
  id: string,
  input: UpdateDistributorInput
): Promise<{ data: Distributor | null; error: any }> {
  console.log('🔧 updateDistributor called:', { id, input });

  try {
    // Prepare update data - only include defined, non-empty values
    const updateData: any = {};

    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.company_name !== undefined) updateData.company_name = input.company_name;
    if (input.territory !== undefined) updateData.territory = input.territory;
    if (input.account_type !== undefined) updateData.account_type = input.account_type;
    if (input.status !== undefined) updateData.status = input.status;

    console.log('📝 Updating distributor with:', updateData);

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'distributor')
      .select()
      .single();

    if (error) {
      console.error('❌ Update distributor error:', error);
      return { data: null, error };
    }

    console.log('✅ Distributor updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 Update distributor exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a distributor (removes both profile and auth user)
 */
export async function deleteDistributor(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    // Get distributor info first
    const { data: distributor } = await fetchDistributorById(id);
    
    if (!distributor) {
      return { success: false, error: { message: 'Distributor not found' } };
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)
      .eq('role', 'distributor');

    if (profileError) {
      console.error('Delete profile error:', profileError);
      return { success: false, error: profileError };
    }

    // Try to delete auth user (may not exist if it was just a profile)
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError && !authError.message?.includes('User not found')) {
        console.warn('Auth user deletion warning:', authError);
      }
    } catch (authError) {
      console.warn('Auth user deletion failed (may not exist):', authError);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Delete distributor exception:', error);
    return { success: false, error };
  }
}

/**
 * Resend invitation email to a distributor
 */
export async function resendInvitation(id: string): Promise<{ success: boolean; error: any }> {
  try {
    const { data: distributor } = await fetchDistributorById(id);

    if (!distributor) {
      return { success: false, error: { message: 'Distributor not found' } };
    }

    // Send invitation email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      distributor.email,
      {
        redirectTo: `${window.location.origin}/auth/callback?type=invite`,
        data: {
          role: 'distributor',
          full_name: distributor.full_name,
          company_name: distributor.company_name,
          territory: distributor.territory,
        }
      }
    );

    if (inviteError) {
      console.error('Resend invitation error:', inviteError);
      return { success: false, error: inviteError };
    }

    // Update invited_at timestamp
    await supabase
      .from('user_profiles')
      .update({ 
        invited_at: new Date().toISOString(),
        status: 'invited'
      })
      .eq('id', id);

    console.log('✅ Invitation resent successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('Resend invitation exception:', error);
    return { success: false, error };
  }
}

/**
 * Activate a distributor
 */
export async function activateDistributor(
  id: string
): Promise<{ data: Distributor | null; error: any }> {
  return updateDistributor(id, { status: 'active' });
}

/**
 * Deactivate a distributor
 */
export async function deactivateDistributor(
  id: string
): Promise<{ data: Distributor | null; error: any }> {
  return updateDistributor(id, { status: 'inactive' });
}

/**
 * Get distributor statistics
 */
export async function getDistributorStats(): Promise<{
  data: {
    total: number;
    active: number;
    invited: number;
    pending_acceptance: number;
    inactive: number;
  } | null;
  error: any;
}> {
  try {
    const { data: distributors, error } = await fetchDistributors();

    if (error || !distributors) {
      return { data: null, error };
    }

    const stats = {
      total: distributors.length,
      active: distributors.filter((d) => d.status === 'active').length,
      invited: distributors.filter((d) => d.status === 'invited').length,
      pending_acceptance: distributors.filter((d) => d.status === 'pending_acceptance').length,
      inactive: distributors.filter((d) => d.status === 'inactive').length,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Get distributor stats exception:', error);
    return { data: null, error };
  }
}
