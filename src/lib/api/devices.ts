import { supabase } from '../supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface Device {
  id: string;
  customer_id: string;
  serial_number: string;
  device_name: string;
  device_model?: string;
  product_id?: string;
  product_name?: string;
  installation_date?: string;
  warranty_expiry?: string;
  location_description?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  internal_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  document_count?: number;
  customer_name?: string;
  customer?: {
    id: string;
    company_name: string;
    distributor_id: string;
  };
}

export interface CreateDeviceInput {
  customer_id: string;
  serial_number: string;
  device_name: string;
  device_model?: string;
  product_id?: string;
  product_name?: string;
  installation_date?: string;
  warranty_expiry?: string;
  location_description?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  internal_notes?: string;
}

export interface UpdateDeviceInput {
  serial_number?: string;
  device_name?: string;
  device_model?: string;
  product_id?: string;
  product_name?: string;
  installation_date?: string;
  warranty_expiry?: string;
  location_description?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  internal_notes?: string;
}

export interface DeviceStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  decommissioned: number;
  by_model: Record<string, number>;
  warranty_expiring_soon: number;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch all devices, optionally filtered by customer
 *
 * @param customerId - Optional customer ID to filter by
 * @returns Promise with devices array or error
 */
export async function fetchDevices(
  customerId?: string
): Promise<{ data: Device[] | null; error: any }> {
  try {
    console.log('📊 Fetching devices...', customerId ? `for customer: ${customerId}` : 'all');

    let query = supabase
      .from('devices')
      .select(`
        *,
        customer:customers(
          id,
          company_name,
          distributor_id
        ),
        device_documents:device_documents(count)
      `)
      .order('device_name');

    // Filter by customer if provided
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Fetch devices error:', error);
      return { data: null, error };
    }

    // Transform the data to include computed fields
    const devicesWithCounts = data?.map((device: any) => ({
      ...device,
      document_count: device.device_documents?.[0]?.count || 0,
      customer_name: device.customer?.company_name,
      device_documents: undefined // Remove the nested array
    })) || [];

    console.log(`✅ Fetched ${devicesWithCounts.length} devices`);
    return { data: devicesWithCounts, error: null };
  } catch (error) {
    console.error('💥 Fetch devices exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch devices by distributor ID (through customer relationship)
 *
 * @param distributorId - Distributor ID to filter by
 * @returns Promise with devices array or error
 */
export async function fetchDevicesByDistributor(
  distributorId: string
): Promise<{ data: Device[] | null; error: any }> {
  try {
    console.log('📊 Fetching devices for distributor:', distributorId);

    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        customer:customers!inner(
          id,
          company_name,
          distributor_id
        ),
        device_documents:device_documents(count)
      `)
      .eq('customer.distributor_id', distributorId)
      .order('device_name');

    if (error) {
      console.error('❌ Fetch devices by distributor error:', error);
      return { data: null, error };
    }

    // Transform the data
    const devicesWithCounts = data?.map((device: any) => ({
      ...device,
      document_count: device.device_documents?.[0]?.count || 0,
      customer_name: device.customer?.company_name,
      device_documents: undefined
    })) || [];

    console.log(`✅ Fetched ${devicesWithCounts.length} devices for distributor`);
    return { data: devicesWithCounts, error: null };
  } catch (error) {
    console.error('💥 Fetch devices by distributor exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single device by ID with customer info and document count
 *
 * @param id - Device UUID
 * @returns Promise with device data or error
 */
export async function fetchDeviceById(
  id: string
): Promise<{ data: Device | null; error: any }> {
  try {
    console.log('🔍 Fetching device by ID:', id);

    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        customer:customers(
          id,
          company_name,
          distributor_id
        ),
        device_documents:device_documents(count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Fetch device error:', error);
      return { data: null, error };
    }

    const device: Device = {
      ...data,
      document_count: data.device_documents?.[0]?.count || 0,
      customer_name: data.customer?.company_name,
      device_documents: undefined
    };

    console.log('✅ Fetched device:', device.device_name);
    return { data: device, error: null };
  } catch (error) {
    console.error('💥 Fetch device exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch device by serial number
 *
 * @param serialNumber - Device serial number
 * @returns Promise with device data or error
 */
export async function fetchDeviceBySerialNumber(
  serialNumber: string
): Promise<{ data: Device | null; error: any }> {
  try {
    console.log('🔍 Fetching device by serial number:', serialNumber);

    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        customer:customers(
          id,
          company_name,
          distributor_id
        )
      `)
      .eq('serial_number', serialNumber)
      .single();

    if (error) {
      console.error('❌ Fetch device by serial error:', error);
      return { data: null, error };
    }

    const device: Device = {
      ...data,
      customer_name: data.customer?.company_name
    };

    console.log('✅ Fetched device:', device.device_name);
    return { data: device, error: null };
  } catch (error) {
    console.error('💥 Fetch device by serial exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// CREATE/UPDATE/DELETE FUNCTIONS
// ============================================================================

/**
 * Create a new device
 *
 * @param input - Device data to create
 * @returns Promise with created device or error
 */
export async function createDevice(
  input: CreateDeviceInput
): Promise<{ data: Device | null; error: any }> {
  try {
    console.log('➕ Creating device:', input.device_name);

    // Check for duplicate serial number
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('serial_number', input.serial_number)
      .maybeSingle();

    if (existing) {
      const error = { message: `A device with serial number "${input.serial_number}" already exists` };
      console.error('❌ Duplicate serial number:', error);
      return { data: null, error };
    }

    // Get current user ID for created_by field
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = {
      ...input,
      status: input.status || 'active',
      created_by: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('devices')
      .insert(insertData)
      .select(`
        *,
        customer:customers(
          id,
          company_name,
          distributor_id
        )
      `)
      .single();

    if (error) {
      console.error('❌ Create device error:', error);
      return { data: null, error };
    }

    const device: Device = {
      ...data,
      customer_name: data.customer?.company_name
    };

    console.log('✅ Device created successfully:', device.id);
    return { data: device, error: null };
  } catch (error) {
    console.error('💥 Create device exception:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing device
 *
 * @param id - Device UUID to update
 * @param input - Updated device data
 * @returns Promise with updated device or error
 */
export async function updateDevice(
  id: string,
  input: UpdateDeviceInput
): Promise<{ data: Device | null; error: any }> {
  try {
    console.log('🔧 Updating device:', id);

    // Check for duplicate serial number if updating it
    if (input.serial_number) {
      const { data: existing } = await supabase
        .from('devices')
        .select('id')
        .eq('serial_number', input.serial_number)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        const error = { message: `A device with serial number "${input.serial_number}" already exists` };
        console.error('❌ Duplicate serial number:', error);
        return { data: null, error };
      }
    }

    const updateData: any = {
      ...input,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customer:customers(
          id,
          company_name,
          distributor_id
        )
      `)
      .single();

    if (error) {
      console.error('❌ Update device error:', error);
      return { data: null, error };
    }

    const device: Device = {
      ...data,
      customer_name: data.customer?.company_name
    };

    console.log('✅ Device updated successfully');
    return { data: device, error: null };
  } catch (error) {
    console.error('💥 Update device exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a device (also deletes associated documents via CASCADE)
 *
 * @param id - Device UUID to delete
 * @returns Promise with success status or error
 */
export async function deleteDevice(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🗑️ Deleting device:', id);

    // Check if device has documents
    const { count } = await supabase
      .from('device_documents')
      .select('id', { count: 'exact', head: true })
      .eq('device_id', id);

    if (count && count > 0) {
      console.warn(`⚠️ Device has ${count} documents that will be deleted`);
    }

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete device error:', error);
      return { success: false, error };
    }

    console.log('✅ Device deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Delete device exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// PRODUCT LINKING
// ============================================================================

/**
 * Link a device to a product
 *
 * @param deviceId - Device UUID
 * @param productId - Product UUID
 * @returns Promise with success status or error
 */
export async function linkDeviceToProduct(
  deviceId: string,
  productId: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🔗 Linking device to product:', { deviceId, productId });

    // Get product name for denormalization
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('❌ Product not found:', productError);
      return { success: false, error: productError };
    }

    const { error } = await supabase
      .from('devices')
      .update({
        product_id: productId,
        product_name: product.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', deviceId);

    if (error) {
      console.error('❌ Link device to product error:', error);
      return { success: false, error };
    }

    console.log('✅ Device linked to product successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Link device to product exception:', error);
    return { success: false, error };
  }
}

/**
 * Unlink a device from its product
 *
 * @param deviceId - Device UUID
 * @returns Promise with success status or error
 */
export async function unlinkDeviceFromProduct(
  deviceId: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🔓 Unlinking device from product:', deviceId);

    const { error } = await supabase
      .from('devices')
      .update({
        product_id: null,
        product_name: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', deviceId);

    if (error) {
      console.error('❌ Unlink device error:', error);
      return { success: false, error };
    }

    console.log('✅ Device unlinked from product successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Unlink device exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get device statistics, optionally filtered by customer
 *
 * @param customerId - Optional customer ID to filter by
 * @returns Promise with statistics or error
 */
export async function getDeviceStats(
  customerId?: string
): Promise<{ data: DeviceStats | null; error: any }> {
  try {
    console.log('📊 Calculating device statistics...');

    let query = supabase
      .from('devices')
      .select('id, status, device_model, warranty_expiry');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: devices, error } = await query;

    if (error) {
      console.error('❌ Fetch devices for stats error:', error);
      return { data: null, error };
    }

    // Calculate warranty expiring soon (within 90 days)
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const stats: DeviceStats = {
      total: devices?.length || 0,
      active: devices?.filter(d => d.status === 'active').length || 0,
      inactive: devices?.filter(d => d.status === 'inactive').length || 0,
      maintenance: devices?.filter(d => d.status === 'maintenance').length || 0,
      decommissioned: devices?.filter(d => d.status === 'decommissioned').length || 0,
      by_model: {},
      warranty_expiring_soon: devices?.filter(d => {
        if (!d.warranty_expiry) return false;
        const expiry = new Date(d.warranty_expiry);
        return expiry > now && expiry <= ninetyDaysFromNow;
      }).length || 0
    };

    // Count by model
    devices?.forEach(device => {
      if (device.device_model) {
        stats.by_model[device.device_model] = (stats.by_model[device.device_model] || 0) + 1;
      }
    });

    console.log('✅ Device statistics calculated:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('💥 Get device stats exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Search devices by serial number, name, or model
 *
 * @param query - Search query string
 * @param customerId - Optional customer ID to filter by
 * @returns Promise with matching devices or error
 */
export async function searchDevices(
  query: string,
  customerId?: string
): Promise<{ data: Device[] | null; error: any }> {
  try {
    console.log('🔍 Searching devices:', query);

    let dbQuery = supabase
      .from('devices')
      .select(`
        *,
        customer:customers(
          id,
          company_name
        )
      `)
      .or(`serial_number.ilike.%${query}%,device_name.ilike.%${query}%,device_model.ilike.%${query}%`)
      .order('device_name');

    if (customerId) {
      dbQuery = dbQuery.eq('customer_id', customerId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('❌ Search devices error:', error);
      return { data: null, error };
    }

    const devices = data?.map((device: any) => ({
      ...device,
      customer_name: device.customer?.company_name
    })) || [];

    console.log(`✅ Found ${devices.length} devices matching "${query}"`);
    return { data: devices, error: null };
  } catch (error) {
    console.error('💥 Search devices exception:', error);
    return { data: null, error };
  }
}

/**
 * Get devices with warranty expiring within specified days
 *
 * @param days - Number of days to check for warranty expiry
 * @param customerId - Optional customer ID to filter by
 * @returns Promise with devices or error
 */
export async function getDevicesWithExpiringWarranty(
  days: number = 90,
  customerId?: string
): Promise<{ data: Device[] | null; error: any }> {
  try {
    console.log(`📊 Fetching devices with warranty expiring in ${days} days...`);

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('devices')
      .select(`
        *,
        customer:customers(
          id,
          company_name
        )
      `)
      .gte('warranty_expiry', now.toISOString())
      .lte('warranty_expiry', futureDate.toISOString())
      .order('warranty_expiry');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Fetch expiring warranty error:', error);
      return { data: null, error };
    }

    const devices = data?.map((device: any) => ({
      ...device,
      customer_name: device.customer?.company_name
    })) || [];

    console.log(`✅ Found ${devices.length} devices with warranty expiring soon`);
    return { data: devices, error: null };
  } catch (error) {
    console.error('💥 Get expiring warranty exception:', error);
    return { data: null, error };
  }
}
