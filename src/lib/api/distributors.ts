import { supabase } from '../supabase';

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
 * NOTE: The following admin functions (createDistributor, deleteDistributor) are
 * only used in Edge Functions, not in the frontend. They are commented out here
 * to prevent bundling supabaseAdmin in the client code.
 */

/*
export async function createDistributor(
  input: CreateDistributorInput
): Promise<{ data: Distributor | null; error: any }> {
  console.log('🔧 createDistributor called:', input);

  try {
    // Check if email already exists in user_profiles
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', input.email.toLowerCase())
      .single();

    if (existingProfile) {
      return {
        data: null,
        error: { message: 'A user with this email already exists in user profiles' },
      };
    }

    // Check if email already exists in auth.users
    console.log('🔍 Checking if email exists in auth.users...');
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (!listError && authUsers?.users) {
      const existingAuthUser = authUsers.users.find(
        user => user.email?.toLowerCase() === input.email.toLowerCase()
      );

      if (existingAuthUser) {
        console.error('❌ User already exists in auth.users:', existingAuthUser.id);
        return {
          data: null,
          error: { message: 'A user with this email already exists in the authentication system' },
        };
      }
    }

    let authUserId: string;
    let userCreated = false;

    if (input.send_invite) {
      console.log('📧 Inviting new distributor user...');

      // Send invitation email - this creates the user and sends invitation
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        input.email.toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/callback?type=invite`,
          data: {
            full_name: input.full_name,
            company_name: input.company_name,
            role: 'distributor',
            territory: input.territory,
          }
        }
      );

      if (inviteError) {
        console.error('❌ Invitation error:', inviteError);
        return { data: null, error: { message: `Failed to invite user: ${inviteError.message}` } };
      }

      if (!inviteData?.user) {
        console.error('❌ No user returned from invitation');
        return { data: null, error: { message: 'Invitation failed - no user returned' } };
      }

      authUserId = inviteData.user.id;
      userCreated = true;

      console.log('✅ Invitation sent successfully, user created:', authUserId);
    } else {
      // Create a placeholder profile without auth user
      authUserId = crypto.randomUUID();
      console.log('ℹ️ Creating profile without auth user:', authUserId);
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
*/

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

/*
 * Delete a distributor (removes both profile and auth user)
 * NOTE: Commented out - only used in Edge Functions
 */
/*
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
*/

/**
 * Resend invitation email to a distributor
 * NOTE: This function is safe to call from the frontend - it uses the regular Supabase client
 */
export async function resendInvitation(id: string): Promise<{ success: boolean; error: any }> {
  try {
    const { data: distributor } = await fetchDistributorById(id);

    if (!distributor) {
      return { success: false, error: { message: 'Distributor not found' } };
    }

    // Send password reset email (as invitation) - uses regular client, no admin needed
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      distributor.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (resetError) {
      console.error('❌ Resend invitation error:', resetError);
      return { success: false, error: { message: `Failed to resend invitation: ${resetError.message}` } };
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
    console.error('💥 Resend invitation exception:', error);
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
