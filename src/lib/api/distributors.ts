import { supabase } from '../supabase';

// ============================================================================
// TYPES - Updated for distributors table with joined users
// ============================================================================

export interface DistributorUser {
  id: string;
  distributor_id: string;
  email: string;
  full_name: string;
  company_role: 'admin' | 'manager' | 'user';
  status: 'active' | 'pending' | 'inactive';
  invited_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Distributor {
  id: string;
  company_name: string;
  territory: string;
  account_type: 'exclusive' | 'non-exclusive';
  status: 'active' | 'pending' | 'inactive';
  contact_email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  users?: DistributorUser[]; // Joined data from user_profiles
}

export interface CreateDistributorInput {
  company_name: string;
  territory: string;
  account_type: 'exclusive' | 'non-exclusive';
  contact_email?: string;
  phone?: string;
  address?: string;
  // First user details
  user_email: string;
  user_full_name: string;
  user_company_role?: 'admin' | 'manager' | 'user';
  send_invite?: boolean;
}

export interface UpdateDistributorInput {
  company_name?: string;
  territory?: string;
  account_type?: 'exclusive' | 'non-exclusive';
  status?: 'active' | 'inactive';
  contact_email?: string;
  phone?: string;
  address?: string;
}

// ============================================================================
// MAIN DISTRIBUTOR FUNCTIONS - Query distributors table with joins
// ============================================================================

/**
 * Fetch all distributors (companies) with their users
 *
 * CORRECT APPROACH: Queries distributors table and joins user_profiles
 */
export async function fetchDistributors(filters?: {
  status?: string[];
  territory?: string[];
  search?: string;
}): Promise<{ data: Distributor[] | null; error: any }> {
  try {
    console.log('📊 Fetching distributors from distributors table...');

    let query = supabase
      .from('distributors')
      .select(`
        *,
        users:user_profiles!distributor_id(
          id,
          distributor_id,
          email,
          full_name,
          company_role,
          status,
          invited_at,
          created_at,
          updated_at
        )
      `)
      .order('company_name');

    // Apply status filter
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    // Apply territory filter
    if (filters?.territory && filters.territory.length > 0) {
      query = query.in('territory', filters.territory);
    }

    // Apply search filter (searches company name and contact email)
    if (filters?.search) {
      query = query.or(
        `company_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Fetch distributors error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} distributors`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch distributors exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single distributor (company) by ID with all users
 */
export async function fetchDistributorById(
  id: string
): Promise<{ data: Distributor | null; error: any }> {
  try {
    console.log('🔍 Fetching distributor by ID:', id);

    const { data, error } = await supabase
      .from('distributors')
      .select(`
        *,
        users:user_profiles!distributor_id(
          id,
          distributor_id,
          email,
          full_name,
          company_role,
          status,
          invited_at,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Fetch distributor error:', error);
      return { data: null, error };
    }

    console.log('✅ Fetched distributor:', data?.company_name);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch distributor exception:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing distributor (company)
 *
 * Updates the distributors table, NOT user_profiles
 */
export async function updateDistributor(
  id: string,
  input: UpdateDistributorInput
): Promise<{ data: Distributor | null; error: any }> {
  console.log('🔧 updateDistributor called:', { id, input });

  try {
    // Prepare update data - only include defined values
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (input.company_name !== undefined) updateData.company_name = input.company_name;
    if (input.territory !== undefined) updateData.territory = input.territory;
    if (input.account_type !== undefined) updateData.account_type = input.account_type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.contact_email !== undefined) updateData.contact_email = input.contact_email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;

    console.log('📝 Updating distributor with:', updateData);

    const { data, error } = await supabase
      .from('distributors')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        users:user_profiles!distributor_id(
          id,
          distributor_id,
          email,
          full_name,
          company_role,
          status,
          invited_at
        )
      `)
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
 * Activate a distributor (company)
 */
export async function activateDistributor(
  id: string
): Promise<{ data: Distributor | null; error: any }> {
  return updateDistributor(id, { status: 'active' });
}

/**
 * Deactivate a distributor (company)
 */
export async function deactivateDistributor(
  id: string
): Promise<{ data: Distributor | null; error: any }> {
  return updateDistributor(id, { status: 'inactive' });
}

// ============================================================================
// USER MANAGEMENT FUNCTIONS - Manage users within a distributor company
// ============================================================================

/**
 * Get all users for a specific distributor company
 */
export async function getDistributorUsers(
  distributorId: string
): Promise<{ data: DistributorUser[] | null; error: any }> {
  try {
    console.log('👥 Fetching users for distributor:', distributorId);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('distributor_id', distributorId)
      .order('email');

    if (error) {
      console.error('❌ Fetch distributor users error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} users`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch distributor users exception:', error);
    return { data: null, error };
  }
}

/**
 * Get a single user by ID
 */
export async function getDistributorUserById(
  userId: string
): Promise<{ data: DistributorUser | null; error: any }> {
  try {
    console.log('👤 Fetching user by ID:', userId);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Fetch user error:', error);
      return { data: null, error };
    }

    console.log('✅ Fetched user:', data?.email);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch user exception:', error);
    return { data: null, error };
  }
}

/**
 * Update a distributor user's details
 *
 * Updates user_profiles table
 */
export async function updateDistributorUser(
  userId: string,
  updates: {
    full_name?: string;
    company_role?: 'admin' | 'manager' | 'user';
    status?: 'active' | 'pending' | 'inactive';
  }
): Promise<{ data: DistributorUser | null; error: any }> {
  try {
    console.log('🔧 Updating distributor user:', { userId, updates });

    const updateData: any = {
      updated_at: new Date().toISOString(),
      ...updates
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Update user error:', error);
      return { data: null, error };
    }

    console.log('✅ User updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 Update user exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a distributor user
 *
 * Deletes from user_profiles table
 * Note: This does NOT delete the auth.users record - that requires admin privileges
 */
export async function deleteDistributorUser(
  userId: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🗑️ Deleting distributor user:', userId);

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('❌ Delete user error:', error);
      return { success: false, error };
    }

    console.log('✅ User deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Delete user exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// INVITATION FUNCTIONS - Uses regular Supabase client (safe for frontend)
// ============================================================================

/**
 * Resend invitation email to a distributor user
 *
 * NOTE: This function is safe to call from the frontend
 * It uses the regular Supabase client to trigger password reset email
 */
export async function resendInvitation(
  userId: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('📧 Resending invitation to user:', userId);

    // Get user details
    const { data: user } = await getDistributorUserById(userId);

    if (!user) {
      return { success: false, error: { message: 'User not found' } };
    }

    // Get distributor details for the redirect URL
    const { data: distributor } = await fetchDistributorById(user.distributor_id);

    if (!distributor) {
      return { success: false, error: { message: 'Distributor company not found' } };
    }

    // Send password reset email (used as invitation)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (resetError) {
      console.error('❌ Resend invitation error:', resetError);
      return {
        success: false,
        error: { message: `Failed to resend invitation: ${resetError.message}` }
      };
    }

    // Update invited_at timestamp
    await supabase
      .from('user_profiles')
      .update({
        invited_at: new Date().toISOString(),
        status: 'pending'
      })
      .eq('id', userId);

    console.log('✅ Invitation resent successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Resend invitation exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get distributor statistics
 *
 * Returns company-level statistics (not user counts)
 */
export async function getDistributorStats(): Promise<{
  data: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
    by_territory: { [key: string]: number };
    by_account_type: { [key: string]: number };
  } | null;
  error: any;
}> {
  try {
    console.log('📊 Calculating distributor statistics...');

    const { data: distributors, error } = await fetchDistributors();

    if (error || !distributors) {
      return { data: null, error };
    }

    // Calculate statistics
    const stats = {
      total: distributors.length,
      active: distributors.filter((d) => d.status === 'active').length,
      pending: distributors.filter((d) => d.status === 'pending').length,
      inactive: distributors.filter((d) => d.status === 'inactive').length,
      by_territory: {} as { [key: string]: number },
      by_account_type: {} as { [key: string]: number }
    };

    // Count by territory
    distributors.forEach(d => {
      if (d.territory) {
        stats.by_territory[d.territory] = (stats.by_territory[d.territory] || 0) + 1;
      }
    });

    // Count by account type
    distributors.forEach(d => {
      if (d.account_type) {
        stats.by_account_type[d.account_type] = (stats.by_account_type[d.account_type] || 0) + 1;
      }
    });

    console.log('✅ Statistics calculated:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('💥 Get distributor stats exception:', error);
    return { data: null, error };
  }
}

/**
 * Get user statistics across all distributors
 */
export async function getDistributorUserStats(): Promise<{
  data: {
    total_users: number;
    active_users: number;
    pending_users: number;
    inactive_users: number;
    by_company_role: { [key: string]: number };
  } | null;
  error: any;
}> {
  try {
    console.log('📊 Calculating user statistics...');

    const { data, error } = await supabase
      .from('user_profiles')
      .select('status, company_role')
      .not('distributor_id', 'is', null);

    if (error) {
      console.error('❌ Get user stats error:', error);
      return { data: null, error };
    }

    const stats = {
      total_users: data.length,
      active_users: data.filter((u) => u.status === 'active').length,
      pending_users: data.filter((u) => u.status === 'pending').length,
      inactive_users: data.filter((u) => u.status === 'inactive').length,
      by_company_role: {} as { [key: string]: number }
    };

    // Count by company role
    data.forEach(u => {
      if (u.company_role) {
        stats.by_company_role[u.company_role] = (stats.by_company_role[u.company_role] || 0) + 1;
      }
    });

    console.log('✅ User statistics calculated:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('💥 Get user stats exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// LEGACY COMPATIBILITY (for components not yet updated)
// ============================================================================

/**
 * Legacy function for backward compatibility
 *
 * DEPRECATED: Use fetchDistributors() instead
 * This flattens the distributor companies into individual user records
 * for components that haven't been updated yet
 */
export async function fetchDistributorsLegacy(): Promise<{
  data: any[] | null;
  error: any
}> {
  try {
    const { data: distributors, error } = await fetchDistributors();

    if (error || !distributors) {
      return { data: null, error };
    }

    // Flatten: Return one record per user with company info embedded
    const flattened = distributors.flatMap(distributor =>
      (distributor.users || []).map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        company_name: distributor.company_name,
        role: 'distributor',
        territory: distributor.territory,
        account_type: distributor.account_type,
        status: user.status,
        invited_at: user.invited_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // Include distributor reference
        distributor_id: distributor.id,
        company_role: user.company_role
      }))
    );

    return { data: flattened, error: null };
  } catch (error) {
    console.error('💥 Fetch distributors legacy exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// NOTE: CREATE AND DELETE OPERATIONS
// ============================================================================
/**
 * NOTE: The following admin functions (createDistributor, deleteDistributor,
 * createDistributorUser, deleteDistributorUser) are ONLY used in Edge Functions,
 * NOT in the frontend.
 *
 * They require admin privileges and use the Supabase Admin SDK.
 *
 * Frontend should call the Edge Functions via HTTP:
 * - POST /functions/v1/create-distributor
 * - DELETE /functions/v1/delete-distributor
 * - POST /functions/v1/create-distributor-user
 * - DELETE /functions/v1/delete-distributor-user
 *
 * These functions are commented out to prevent bundling supabaseAdmin in client code.
 */
