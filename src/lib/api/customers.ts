import { supabase } from '../supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface Customer {
  id: string;
  distributor_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  status: 'active' | 'inactive' | 'prospect';
  internal_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  device_count?: number;
  document_count?: number;
}

export interface CreateCustomerInput {
  distributor_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  status?: 'active' | 'inactive' | 'prospect';
  internal_notes?: string;
}

export interface UpdateCustomerInput {
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  status?: 'active' | 'inactive' | 'prospect';
  internal_notes?: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  prospect: number;
  by_country: Record<string, number>;
  total_devices: number;
  total_documents: number;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch all customers, optionally filtered by distributor
 *
 * @param distributorId - Optional distributor ID to filter by
 * @returns Promise with customers array or error
 */
export async function fetchCustomers(
  distributorId?: string
): Promise<{ data: Customer[] | null; error: any }> {
  try {
    console.log('📊 Fetching customers...', distributorId ? `for distributor: ${distributorId}` : 'all');

    let query = supabase
      .from('customers')
      .select(`
        *,
        devices:devices(count)
      `)
      .order('company_name');

    // Filter by distributor if provided
    if (distributorId) {
      query = query.eq('distributor_id', distributorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Fetch customers error:', error);
      return { data: null, error };
    }

    // Transform the data to include device_count
    const customersWithCounts = data?.map((customer: any) => ({
      ...customer,
      device_count: customer.devices?.[0]?.count || 0,
      devices: undefined // Remove the nested devices array
    })) || [];

    console.log(`✅ Fetched ${customersWithCounts.length} customers`);
    return { data: customersWithCounts, error: null };
  } catch (error) {
    console.error('💥 Fetch customers exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single customer by ID with device and document counts
 *
 * @param id - Customer UUID
 * @returns Promise with customer data or error
 */
export async function fetchCustomerById(
  id: string
): Promise<{ data: Customer | null; error: any }> {
  try {
    console.log('🔍 Fetching customer by ID:', id);

    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        devices:devices(
          id,
          device_documents:device_documents(count)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Fetch customer error:', error);
      return { data: null, error };
    }

    // Calculate counts
    const deviceCount = data?.devices?.length || 0;
    const documentCount = data?.devices?.reduce((acc: number, device: any) => {
      return acc + (device.device_documents?.[0]?.count || 0);
    }, 0) || 0;

    const customer: Customer = {
      ...data,
      device_count: deviceCount,
      document_count: documentCount,
      devices: undefined // Remove nested data
    };

    console.log('✅ Fetched customer:', customer.company_name);
    return { data: customer, error: null };
  } catch (error) {
    console.error('💥 Fetch customer exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// CREATE/UPDATE/DELETE FUNCTIONS
// ============================================================================

/**
 * Create a new customer
 *
 * @param input - Customer data to create
 * @returns Promise with created customer or error
 */
export async function createCustomer(
  input: CreateCustomerInput
): Promise<{ data: Customer | null; error: any }> {
  try {
    console.log('➕ Creating customer:', input.company_name);

    // Get current user ID for created_by field
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = {
      ...input,
      status: input.status || 'prospect',
      created_by: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Create customer error:', error);
      return { data: null, error };
    }

    console.log('✅ Customer created successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Create customer exception:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing customer
 *
 * @param id - Customer UUID to update
 * @param input - Updated customer data
 * @returns Promise with updated customer or error
 */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<{ data: Customer | null; error: any }> {
  try {
    console.log('🔧 Updating customer:', id);

    const updateData = {
      ...input,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update customer error:', error);
      return { data: null, error };
    }

    console.log('✅ Customer updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 Update customer exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a customer (also deletes associated devices via CASCADE)
 *
 * @param id - Customer UUID to delete
 * @returns Promise with success status or error
 */
export async function deleteCustomer(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🗑️ Deleting customer:', id);

    // Check if customer has devices
    const { data: devices } = await supabase
      .from('devices')
      .select('id')
      .eq('customer_id', id);

    if (devices && devices.length > 0) {
      console.warn(`⚠️ Customer has ${devices.length} devices that will be deleted`);
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete customer error:', error);
      return { success: false, error };
    }

    console.log('✅ Customer deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Delete customer exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get customer statistics, optionally filtered by distributor
 *
 * @param distributorId - Optional distributor ID to filter by
 * @returns Promise with statistics or error
 */
export async function getCustomerStats(
  distributorId?: string
): Promise<{ data: CustomerStats | null; error: any }> {
  try {
    console.log('📊 Calculating customer statistics...');

    // Fetch customers
    let customersQuery = supabase
      .from('customers')
      .select('id, status, country');

    if (distributorId) {
      customersQuery = customersQuery.eq('distributor_id', distributorId);
    }

    const { data: customers, error: customersError } = await customersQuery;

    if (customersError) {
      console.error('❌ Fetch customers for stats error:', customersError);
      return { data: null, error: customersError };
    }

    // Fetch device counts
    let devicesQuery = supabase
      .from('devices')
      .select('id, customer_id');

    const { data: devices, error: devicesError } = await devicesQuery;

    if (devicesError) {
      console.error('❌ Fetch devices for stats error:', devicesError);
      return { data: null, error: devicesError };
    }

    // Filter devices by customer IDs if we have a distributor filter
    const customerIds = customers?.map(c => c.id) || [];
    const filteredDevices = distributorId
      ? devices?.filter(d => customerIds.includes(d.customer_id)) || []
      : devices || [];

    // Fetch document counts for those devices
    const deviceIds = filteredDevices.map(d => d.id);
    let documentsCount = 0;

    if (deviceIds.length > 0) {
      const { count } = await supabase
        .from('device_documents')
        .select('id', { count: 'exact', head: true })
        .in('device_id', deviceIds);

      documentsCount = count || 0;
    }

    // Calculate statistics
    const stats: CustomerStats = {
      total: customers?.length || 0,
      active: customers?.filter(c => c.status === 'active').length || 0,
      inactive: customers?.filter(c => c.status === 'inactive').length || 0,
      prospect: customers?.filter(c => c.status === 'prospect').length || 0,
      by_country: {},
      total_devices: filteredDevices.length,
      total_documents: documentsCount
    };

    // Count by country
    customers?.forEach(customer => {
      if (customer.country) {
        stats.by_country[customer.country] = (stats.by_country[customer.country] || 0) + 1;
      }
    });

    console.log('✅ Customer statistics calculated:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('💥 Get customer stats exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Search customers by company name or contact info
 *
 * @param query - Search query string
 * @param distributorId - Optional distributor ID to filter by
 * @returns Promise with matching customers or error
 */
export async function searchCustomers(
  query: string,
  distributorId?: string
): Promise<{ data: Customer[] | null; error: any }> {
  try {
    console.log('🔍 Searching customers:', query);

    let dbQuery = supabase
      .from('customers')
      .select('*')
      .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%,contact_email.ilike.%${query}%`)
      .order('company_name');

    if (distributorId) {
      dbQuery = dbQuery.eq('distributor_id', distributorId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('❌ Search customers error:', error);
      return { data: null, error };
    }

    console.log(`✅ Found ${data?.length || 0} customers matching "${query}"`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Search customers exception:', error);
    return { data: null, error };
  }
}

/**
 * Get customers with their devices for a dropdown/select
 *
 * @param distributorId - Optional distributor ID to filter by
 * @returns Promise with customers including devices or error
 */
export async function fetchCustomersWithDevices(
  distributorId?: string
): Promise<{ data: (Customer & { devices: any[] })[] | null; error: any }> {
  try {
    console.log('📊 Fetching customers with devices...');

    let query = supabase
      .from('customers')
      .select(`
        *,
        devices:devices(
          id,
          serial_number,
          device_name,
          status
        )
      `)
      .order('company_name');

    if (distributorId) {
      query = query.eq('distributor_id', distributorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Fetch customers with devices error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} customers with devices`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch customers with devices exception:', error);
    return { data: null, error };
  }
}
