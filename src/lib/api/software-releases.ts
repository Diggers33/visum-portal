import { supabase } from '../supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface SoftwareRelease {
  id: string;
  name: string;
  version: string;
  release_type: 'firmware' | 'software' | 'patch' | 'hotfix' | 'driver';
  product_id?: string;
  product_name?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  checksum?: string;
  description?: string;
  release_notes?: string;
  changelog?: string;
  min_previous_version?: string;
  target_type: 'all' | 'distributors' | 'devices';
  is_mandatory: boolean;
  status: 'draft' | 'published' | 'deprecated' | 'recalled';
  published_at?: string;
  release_date: string;
  notify_on_publish: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  target_count?: number;
  download_count?: number;
  install_count?: number;
  target_distributors?: { id: string; company_name: string }[];
  target_devices?: { id: string; device_name: string; serial_number: string }[];
}

export interface CreateReleaseInput {
  name: string;
  version: string;
  release_type: SoftwareRelease['release_type'];
  product_id?: string;
  product_name?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  checksum?: string;
  description?: string;
  release_notes?: string;
  changelog?: string;
  min_previous_version?: string;
  target_type?: SoftwareRelease['target_type'];
  is_mandatory?: boolean;
  release_date?: string;
  notify_on_publish?: boolean;
}

export interface UpdateReleaseInput {
  name?: string;
  version?: string;
  release_type?: SoftwareRelease['release_type'];
  product_id?: string;
  product_name?: string;
  description?: string;
  release_notes?: string;
  changelog?: string;
  min_previous_version?: string;
  target_type?: SoftwareRelease['target_type'];
  is_mandatory?: boolean;
  release_date?: string;
  notify_on_publish?: boolean;
}

export interface DeviceUpdateHistory {
  id: string;
  device_id: string;
  release_id?: string;
  version_installed: string;
  release_type?: string;
  release_name?: string;
  previous_version?: string;
  installed_at: string;
  installed_by?: string;
  installation_notes?: string;
  status: 'success' | 'failed' | 'rolled_back';
  // Computed fields from joins
  device?: {
    id: string;
    device_name: string;
    serial_number: string;
  };
  release?: {
    id: string;
    name: string;
    version: string;
  };
}

export interface ReleaseStats {
  total_downloads: number;
  unique_downloads: number;
  total_installs: number;
  successful_installs: number;
  failed_installs: number;
  rollbacks: number;
  target_count: number;
  install_percentage: number;
}

export interface ReleaseFilters {
  status?: SoftwareRelease['status'];
  release_type?: SoftwareRelease['release_type'];
  product_id?: string;
  search?: string;
}

export interface ReleaseUploadResult {
  data: { url: string; path: string } | null;
  error: any;
}

// Storage bucket name
const STORAGE_BUCKET = 'software-releases';

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Fetch all software releases with optional filters
 * Admin-only function
 *
 * @param filters - Optional filters for status, type, product, search
 * @returns Promise with releases array or error
 */
export async function fetchAllReleases(
  filters?: ReleaseFilters
): Promise<{ data: SoftwareRelease[] | null; error: any }> {
  try {
    console.log('📊 [ADMIN] Fetching all software releases...');

    let query = supabase
      .from('software_releases')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.release_type) {
      query = query.eq('release_type', filters.release_type);
    }
    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,version.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [ADMIN] Fetch releases error:', error);
      return { data: null, error };
    }

    // Get download and install counts for each release
    if (data && data.length > 0) {
      const releaseIds = data.map(r => r.id);

      // Get download counts
      const { data: downloadCounts } = await supabase
        .from('software_release_downloads')
        .select('release_id')
        .in('release_id', releaseIds);

      const downloadMap = downloadCounts?.reduce((acc, d) => {
        acc[d.release_id] = (acc[d.release_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get install counts
      const { data: installCounts } = await supabase
        .from('device_update_history')
        .select('release_id, status')
        .in('release_id', releaseIds);

      const installMap = installCounts?.reduce((acc, i) => {
        if (!acc[i.release_id]) acc[i.release_id] = 0;
        if (i.status === 'success') acc[i.release_id]++;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get target counts
      const { data: distributorTargets } = await supabase
        .from('software_release_distributors')
        .select('release_id')
        .in('release_id', releaseIds);

      const { data: deviceTargets } = await supabase
        .from('software_release_devices')
        .select('release_id')
        .in('release_id', releaseIds);

      const distTargetMap = distributorTargets?.reduce((acc, d) => {
        acc[d.release_id] = (acc[d.release_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const deviceTargetMap = deviceTargets?.reduce((acc, d) => {
        acc[d.release_id] = (acc[d.release_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Enrich releases with counts
      data.forEach(release => {
        release.download_count = downloadMap[release.id] || 0;
        release.install_count = installMap[release.id] || 0;
        if (release.target_type === 'distributors') {
          release.target_count = distTargetMap[release.id] || 0;
        } else if (release.target_type === 'devices') {
          release.target_count = deviceTargetMap[release.id] || 0;
        } else {
          release.target_count = 0; // 'all' means no specific targets
        }
      });
    }

    console.log(`✅ [ADMIN] Fetched ${data?.length || 0} releases`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Fetch releases exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single release by ID with target information
 * Admin-only function
 *
 * @param id - Release UUID
 * @returns Promise with release data or error
 */
export async function fetchReleaseById(
  id: string
): Promise<{ data: SoftwareRelease | null; error: any }> {
  try {
    console.log('🔍 [ADMIN] Fetching release by ID:', id);

    const { data, error } = await supabase
      .from('software_releases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [ADMIN] Fetch release error:', error);
      return { data: null, error };
    }

    // Get target distributors
    const { data: distTargets } = await supabase
      .from('software_release_distributors')
      .select(`
        distributor_id,
        distributor:distributors(id, company_name)
      `)
      .eq('release_id', id);

    data.target_distributors = distTargets?.map(t => ({
      id: t.distributor_id,
      company_name: (t.distributor as any)?.company_name
    })) || [];

    // Get target devices
    const { data: deviceTargets } = await supabase
      .from('software_release_devices')
      .select(`
        device_id,
        device:devices(id, device_name, serial_number)
      `)
      .eq('release_id', id);

    data.target_devices = deviceTargets?.map(t => ({
      id: t.device_id,
      device_name: (t.device as any)?.device_name,
      serial_number: (t.device as any)?.serial_number
    })) || [];

    // Get counts
    const { count: downloadCount } = await supabase
      .from('software_release_downloads')
      .select('id', { count: 'exact', head: true })
      .eq('release_id', id);

    const { count: installCount } = await supabase
      .from('device_update_history')
      .select('id', { count: 'exact', head: true })
      .eq('release_id', id)
      .eq('status', 'success');

    data.download_count = downloadCount || 0;
    data.install_count = installCount || 0;
    data.target_count = data.target_distributors.length || data.target_devices.length;

    console.log('✅ [ADMIN] Fetched release:', data.name);
    return { data, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Fetch release exception:', error);
    return { data: null, error };
  }
}

/**
 * Create a new software release (draft status)
 * Admin-only function
 *
 * @param input - Release data to create
 * @returns Promise with created release or error
 */
export async function createRelease(
  input: CreateReleaseInput
): Promise<{ data: SoftwareRelease | null; error: any }> {
  try {
    console.log('➕ [ADMIN] Creating software release:', input.name);

    // Check for duplicate version
    const { data: existing } = await supabase
      .from('software_releases')
      .select('id')
      .eq('version', input.version)
      .eq('release_type', input.release_type)
      .maybeSingle();

    if (existing) {
      const error = { message: `A ${input.release_type} release with version "${input.version}" already exists` };
      console.error('❌ Duplicate version:', error);
      return { data: null, error };
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = {
      ...input,
      target_type: input.target_type || 'all',
      is_mandatory: input.is_mandatory || false,
      status: 'draft' as const,
      release_date: input.release_date || new Date().toISOString(),
      notify_on_publish: input.notify_on_publish ?? true,
      created_by: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('software_releases')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Create release error:', error);
      return { data: null, error };
    }

    console.log('✅ [ADMIN] Release created successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Create release exception:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing software release
 * Admin-only function
 *
 * @param id - Release UUID to update
 * @param input - Updated release data
 * @returns Promise with updated release or error
 */
export async function updateRelease(
  id: string,
  input: UpdateReleaseInput
): Promise<{ data: SoftwareRelease | null; error: any }> {
  try {
    console.log('🔧 [ADMIN] Updating release:', id);

    // Check version uniqueness if updating version
    if (input.version) {
      const { data: current } = await supabase
        .from('software_releases')
        .select('release_type')
        .eq('id', id)
        .single();

      if (current) {
        const { data: existing } = await supabase
          .from('software_releases')
          .select('id')
          .eq('version', input.version)
          .eq('release_type', input.release_type || current.release_type)
          .neq('id', id)
          .maybeSingle();

        if (existing) {
          const error = { message: `A release with version "${input.version}" already exists` };
          console.error('❌ Duplicate version:', error);
          return { data: null, error };
        }
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
      .from('software_releases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Update release error:', error);
      return { data: null, error };
    }

    console.log('✅ [ADMIN] Release updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Update release exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a software release and its file from storage
 * Admin-only function
 *
 * @param id - Release UUID to delete
 * @returns Promise with success status or error
 */
export async function deleteRelease(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🗑️ [ADMIN] Deleting release:', id);

    // Fetch release to get file path
    const { data: release, error: fetchError } = await supabase
      .from('software_releases')
      .select('file_url, name, status')
      .eq('id', id)
      .single();

    if (fetchError || !release) {
      console.error('❌ Release not found:', fetchError);
      return { success: false, error: fetchError || { message: 'Release not found' } };
    }

    // Don't allow deleting published releases
    if (release.status === 'published') {
      const error = { message: 'Cannot delete a published release. Deprecate it first.' };
      console.error('❌ Cannot delete published release');
      return { success: false, error };
    }

    // Delete file from storage
    if (release.file_url) {
      const urlParts = release.file_url.split('/');
      const bucketIndex = urlParts.indexOf(STORAGE_BUCKET);
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);

        if (storageError) {
          console.warn('⚠️ Failed to delete file from storage:', storageError);
        }
      }
    }

    // Delete target associations
    await supabase
      .from('software_release_distributors')
      .delete()
      .eq('release_id', id);

    await supabase
      .from('software_release_devices')
      .delete()
      .eq('release_id', id);

    // Delete download records
    await supabase
      .from('software_release_downloads')
      .delete()
      .eq('release_id', id);

    // Delete the release
    const { error: deleteError } = await supabase
      .from('software_releases')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [ADMIN] Delete release error:', deleteError);
      return { success: false, error: deleteError };
    }

    console.log('✅ [ADMIN] Release deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Delete release exception:', error);
    return { success: false, error };
  }
}

/**
 * Upload a release file to storage
 * Admin-only function
 *
 * @param file - File to upload
 * @returns Promise with file URL and path or error
 */
export async function uploadReleaseFile(
  file: File
): Promise<ReleaseUploadResult> {
  try {
    console.log('📤 [ADMIN] Uploading release file:', file.name);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExt = file.name.split('.').pop();
    const fileName = `releases/${timestamp}-${randomString}.${fileExt}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ File upload error:', uploadError);
      return { data: null, error: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    console.log('✅ [ADMIN] File uploaded successfully:', publicUrl);
    return {
      data: { url: publicUrl, path: uploadData.path },
      error: null
    };
  } catch (error) {
    console.error('💥 [ADMIN] Upload file exception:', error);
    return { data: null, error };
  }
}

/**
 * Publish a software release
 * Admin-only function
 *
 * @param id - Release UUID to publish
 * @returns Promise with updated release or error
 */
export async function publishRelease(
  id: string
): Promise<{ data: SoftwareRelease | null; error: any }> {
  try {
    console.log('📢 [ADMIN] Publishing release:', id);

    const { data, error } = await supabase
      .from('software_releases')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'draft') // Only draft releases can be published
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Publish release error:', error);
      return { data: null, error };
    }

    // TODO: If notify_on_publish is true, send notifications

    console.log('✅ [ADMIN] Release published successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Publish release exception:', error);
    return { data: null, error };
  }
}

/**
 * Deprecate a software release
 * Admin-only function
 *
 * @param id - Release UUID to deprecate
 * @returns Promise with updated release or error
 */
export async function deprecateRelease(
  id: string
): Promise<{ data: SoftwareRelease | null; error: any }> {
  try {
    console.log('📦 [ADMIN] Deprecating release:', id);

    const { data, error } = await supabase
      .from('software_releases')
      .update({
        status: 'deprecated',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Deprecate release error:', error);
      return { data: null, error };
    }

    console.log('✅ [ADMIN] Release deprecated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Deprecate release exception:', error);
    return { data: null, error };
  }
}

/**
 * Set target distributors for a release
 * Admin-only function
 *
 * @param releaseId - Release UUID
 * @param distributorIds - Array of distributor UUIDs to target
 * @returns Promise with success status or error
 */
export async function setReleaseTargetDistributors(
  releaseId: string,
  distributorIds: string[]
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🎯 [ADMIN] Setting target distributors for release:', releaseId);

    // Delete existing targets
    await supabase
      .from('software_release_distributors')
      .delete()
      .eq('release_id', releaseId);

    // Insert new targets
    if (distributorIds.length > 0) {
      const targets = distributorIds.map(distributorId => ({
        release_id: releaseId,
        distributor_id: distributorId,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('software_release_distributors')
        .insert(targets);

      if (error) {
        console.error('❌ [ADMIN] Set distributor targets error:', error);
        return { success: false, error };
      }
    }

    // Update release target_type
    await supabase
      .from('software_releases')
      .update({
        target_type: distributorIds.length > 0 ? 'distributors' : 'all',
        updated_at: new Date().toISOString()
      })
      .eq('id', releaseId);

    console.log(`✅ [ADMIN] Set ${distributorIds.length} distributor targets`);
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Set distributor targets exception:', error);
    return { success: false, error };
  }
}

/**
 * Set target devices for a release
 * Admin-only function
 *
 * @param releaseId - Release UUID
 * @param deviceIds - Array of device UUIDs to target
 * @returns Promise with success status or error
 */
export async function setReleaseTargetDevices(
  releaseId: string,
  deviceIds: string[]
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🎯 [ADMIN] Setting target devices for release:', releaseId);

    // Delete existing targets
    await supabase
      .from('software_release_devices')
      .delete()
      .eq('release_id', releaseId);

    // Insert new targets
    if (deviceIds.length > 0) {
      const targets = deviceIds.map(deviceId => ({
        release_id: releaseId,
        device_id: deviceId,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('software_release_devices')
        .insert(targets);

      if (error) {
        console.error('❌ [ADMIN] Set device targets error:', error);
        return { success: false, error };
      }
    }

    // Update release target_type
    await supabase
      .from('software_releases')
      .update({
        target_type: deviceIds.length > 0 ? 'devices' : 'all',
        updated_at: new Date().toISOString()
      })
      .eq('id', releaseId);

    console.log(`✅ [ADMIN] Set ${deviceIds.length} device targets`);
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Set device targets exception:', error);
    return { success: false, error };
  }
}

/**
 * Get detailed statistics for a release
 * Admin-only function
 *
 * @param releaseId - Release UUID
 * @returns Promise with release stats or error
 */
export async function getReleaseStats(
  releaseId: string
): Promise<{ data: ReleaseStats | null; error: any }> {
  try {
    console.log('📊 [ADMIN] Getting release stats:', releaseId);

    // Get download stats
    const { data: downloads } = await supabase
      .from('software_release_downloads')
      .select('user_id')
      .eq('release_id', releaseId);

    const totalDownloads = downloads?.length || 0;
    const uniqueDownloads = new Set(downloads?.map(d => d.user_id)).size;

    // Get install stats
    const { data: installs } = await supabase
      .from('device_update_history')
      .select('status')
      .eq('release_id', releaseId);

    const totalInstalls = installs?.length || 0;
    const successfulInstalls = installs?.filter(i => i.status === 'success').length || 0;
    const failedInstalls = installs?.filter(i => i.status === 'failed').length || 0;
    const rollbacks = installs?.filter(i => i.status === 'rolled_back').length || 0;

    // Get target count
    const { data: release } = await supabase
      .from('software_releases')
      .select('target_type')
      .eq('id', releaseId)
      .single();

    let targetCount = 0;
    if (release?.target_type === 'distributors') {
      const { count } = await supabase
        .from('software_release_distributors')
        .select('id', { count: 'exact', head: true })
        .eq('release_id', releaseId);
      targetCount = count || 0;
    } else if (release?.target_type === 'devices') {
      const { count } = await supabase
        .from('software_release_devices')
        .select('id', { count: 'exact', head: true })
        .eq('release_id', releaseId);
      targetCount = count || 0;
    }

    const installPercentage = targetCount > 0
      ? Math.round((successfulInstalls / targetCount) * 100)
      : 0;

    const stats: ReleaseStats = {
      total_downloads: totalDownloads,
      unique_downloads: uniqueDownloads,
      total_installs: totalInstalls,
      successful_installs: successfulInstalls,
      failed_installs: failedInstalls,
      rollbacks,
      target_count: targetCount,
      install_percentage: installPercentage
    };

    console.log('✅ [ADMIN] Release stats calculated:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Get release stats exception:', error);
    return { data: null, error };
  }
}

/**
 * Get devices that are not on the specified release version
 * Admin-only function
 *
 * @param releaseId - Release UUID to check against
 * @returns Promise with outdated devices or error
 */
export async function getOutdatedDevices(
  releaseId: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('📊 [ADMIN] Getting outdated devices for release:', releaseId);

    // Get release info
    const { data: release, error: releaseError } = await supabase
      .from('software_releases')
      .select('version, release_type, target_type, product_id')
      .eq('id', releaseId)
      .single();

    if (releaseError || !release) {
      return { data: null, error: releaseError || { message: 'Release not found' } };
    }

    // Build query based on target type
    let query = supabase
      .from('devices')
      .select(`
        id,
        device_name,
        serial_number,
        device_model,
        current_firmware_version,
        current_software_version,
        last_update_date,
        customer:customers(
          id,
          company_name,
          distributor_id
        )
      `)
      .eq('status', 'active');

    // Filter by product if specified
    if (release.product_id) {
      query = query.eq('product_id', release.product_id);
    }

    const { data: devices, error: devicesError } = await query;

    if (devicesError) {
      console.error('❌ [ADMIN] Get devices error:', devicesError);
      return { data: null, error: devicesError };
    }

    // Filter to devices not on this version
    const versionField = release.release_type === 'firmware'
      ? 'current_firmware_version'
      : 'current_software_version';

    const outdatedDevices = devices?.filter(device => {
      const currentVersion = device[versionField];
      return !currentVersion || compareVersions(currentVersion, release.version) < 0;
    }) || [];

    // If targeting specific distributors, filter further
    if (release.target_type === 'distributors') {
      const { data: targetDists } = await supabase
        .from('software_release_distributors')
        .select('distributor_id')
        .eq('release_id', releaseId);

      const targetDistIds = new Set(targetDists?.map(t => t.distributor_id));

      const filtered = outdatedDevices.filter(device =>
        targetDistIds.has((device.customer as any)?.distributor_id)
      );

      console.log(`✅ [ADMIN] Found ${filtered.length} outdated devices (filtered by distributor)`);
      return { data: filtered, error: null };
    }

    // If targeting specific devices, filter to those
    if (release.target_type === 'devices') {
      const { data: targetDevices } = await supabase
        .from('software_release_devices')
        .select('device_id')
        .eq('release_id', releaseId);

      const targetDeviceIds = new Set(targetDevices?.map(t => t.device_id));

      const filtered = outdatedDevices.filter(device =>
        targetDeviceIds.has(device.id)
      );

      console.log(`✅ [ADMIN] Found ${filtered.length} outdated devices (filtered by device targets)`);
      return { data: filtered, error: null };
    }

    console.log(`✅ [ADMIN] Found ${outdatedDevices.length} outdated devices`);
    return { data: outdatedDevices, error: null };
  } catch (error) {
    console.error('💥 [ADMIN] Get outdated devices exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// DISTRIBUTOR FUNCTIONS
// ============================================================================

/**
 * Fetch available releases for the current distributor
 * Only returns published releases targeted to this distributor or all
 *
 * @param distributorId - Distributor UUID
 * @returns Promise with releases array or error
 */
export async function fetchAvailableReleases(
  distributorId: string
): Promise<{ data: SoftwareRelease[] | null; error: any }> {
  try {
    console.log('📊 Fetching available releases for distributor:', distributorId);

    // Get releases targeted to all
    const { data: allReleases, error: allError } = await supabase
      .from('software_releases')
      .select('*')
      .eq('status', 'published')
      .eq('target_type', 'all')
      .order('release_date', { ascending: false });

    if (allError) {
      console.error('❌ Fetch all-targeted releases error:', allError);
      return { data: null, error: allError };
    }

    // Get releases targeted to this distributor
    const { data: distTargets } = await supabase
      .from('software_release_distributors')
      .select('release_id')
      .eq('distributor_id', distributorId);

    const distReleaseIds = distTargets?.map(t => t.release_id) || [];

    let distributorReleases: SoftwareRelease[] = [];
    if (distReleaseIds.length > 0) {
      const { data, error } = await supabase
        .from('software_releases')
        .select('*')
        .eq('status', 'published')
        .in('id', distReleaseIds)
        .order('release_date', { ascending: false });

      if (error) {
        console.error('❌ Fetch distributor-targeted releases error:', error);
      } else {
        distributorReleases = data || [];
      }
    }

    // Combine and deduplicate
    const allReleaseIds = new Set<string>();
    const combinedReleases: SoftwareRelease[] = [];

    [...(allReleases || []), ...distributorReleases].forEach(release => {
      if (!allReleaseIds.has(release.id)) {
        allReleaseIds.add(release.id);
        combinedReleases.push(release);
      }
    });

    // Sort by release date
    combinedReleases.sort((a, b) =>
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    );

    console.log(`✅ Fetched ${combinedReleases.length} available releases`);
    return { data: combinedReleases, error: null };
  } catch (error) {
    console.error('💥 Fetch available releases exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch available updates for a specific device
 *
 * @param deviceId - Device UUID
 * @returns Promise with releases array or error
 */
export async function fetchReleasesForDevice(
  deviceId: string
): Promise<{ data: SoftwareRelease[] | null; error: any }> {
  try {
    console.log('📊 Fetching releases for device:', deviceId);

    // Get device info including current versions
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select(`
        id,
        current_firmware_version,
        current_software_version,
        product_id,
        customer:customers(distributor_id)
      `)
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return { data: null, error: deviceError || { message: 'Device not found' } };
    }

    const distributorId = (device.customer as any)?.distributor_id;

    // Get all available releases for this distributor
    const { data: availableReleases, error: releasesError } = await fetchAvailableReleases(distributorId);

    if (releasesError) {
      return { data: null, error: releasesError };
    }

    // Also get device-specific releases
    const { data: deviceTargets } = await supabase
      .from('software_release_devices')
      .select('release_id')
      .eq('device_id', deviceId);

    const deviceReleaseIds = deviceTargets?.map(t => t.release_id) || [];

    let deviceReleases: SoftwareRelease[] = [];
    if (deviceReleaseIds.length > 0) {
      const { data } = await supabase
        .from('software_releases')
        .select('*')
        .eq('status', 'published')
        .in('id', deviceReleaseIds);

      deviceReleases = data || [];
    }

    // Combine releases
    const allReleaseIds = new Set<string>();
    const combinedReleases: SoftwareRelease[] = [];

    [...(availableReleases || []), ...deviceReleases].forEach(release => {
      if (!allReleaseIds.has(release.id)) {
        allReleaseIds.add(release.id);

        // Filter by product if device has a product_id
        if (device.product_id && release.product_id && release.product_id !== device.product_id) {
          return; // Skip releases for different products
        }

        // Check if this is a newer version than what's installed
        const currentVersion = release.release_type === 'firmware'
          ? device.current_firmware_version
          : device.current_software_version;

        if (!currentVersion || compareVersions(currentVersion, release.version) < 0) {
          combinedReleases.push(release);
        }
      }
    });

    // Sort by release date (newest first)
    combinedReleases.sort((a, b) =>
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    );

    console.log(`✅ Fetched ${combinedReleases.length} applicable releases for device`);
    return { data: combinedReleases, error: null };
  } catch (error) {
    console.error('💥 Fetch releases for device exception:', error);
    return { data: null, error };
  }
}

/**
 * Log a download of a software release
 *
 * @param releaseId - Release UUID that was downloaded
 * @returns Promise with success status or error
 */
export async function logReleaseDownload(
  releaseId: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('📥 Logging release download:', releaseId);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('software_release_downloads')
      .insert({
        release_id: releaseId,
        user_id: user?.id,
        downloaded_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Log download error:', error);
      return { success: false, error };
    }

    console.log('✅ Download logged successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Log download exception:', error);
    return { success: false, error };
  }
}

/**
 * Mark a device as updated with a release
 * Updates device version fields and creates update history record
 *
 * @param deviceId - Device UUID
 * @param releaseId - Release UUID that was installed
 * @param notes - Optional installation notes
 * @returns Promise with success status or error
 */
export async function markDeviceUpdated(
  deviceId: string,
  releaseId: string,
  notes?: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🔄 Marking device as updated:', deviceId, 'with release:', releaseId);

    // Get release info
    const { data: release, error: releaseError } = await supabase
      .from('software_releases')
      .select('version, release_type, name')
      .eq('id', releaseId)
      .single();

    if (releaseError || !release) {
      return { success: false, error: releaseError || { message: 'Release not found' } };
    }

    // Get device current version
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('current_firmware_version, current_software_version')
      .eq('id', deviceId)
      .single();

    if (deviceError) {
      return { success: false, error: deviceError };
    }

    const previousVersion = release.release_type === 'firmware'
      ? device?.current_firmware_version
      : device?.current_software_version;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Create update history record
    const { error: historyError } = await supabase
      .from('device_update_history')
      .insert({
        device_id: deviceId,
        release_id: releaseId,
        version_installed: release.version,
        release_type: release.release_type,
        release_name: release.name,
        previous_version: previousVersion,
        installed_at: new Date().toISOString(),
        installed_by: user?.id,
        installation_notes: notes,
        status: 'success'
      });

    if (historyError) {
      console.error('❌ Create update history error:', historyError);
      return { success: false, error: historyError };
    }

    // Update device version fields
    const updateFields: any = {
      last_update_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (release.release_type === 'firmware') {
      updateFields.current_firmware_version = release.version;
    } else {
      updateFields.current_software_version = release.version;
    }

    const { error: updateError } = await supabase
      .from('devices')
      .update(updateFields)
      .eq('id', deviceId);

    if (updateError) {
      console.error('❌ Update device version error:', updateError);
      return { success: false, error: updateError };
    }

    console.log('✅ Device marked as updated successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Mark device updated exception:', error);
    return { success: false, error };
  }
}

/**
 * Get update history for a device
 *
 * @param deviceId - Device UUID
 * @returns Promise with update history or error
 */
export async function getDeviceUpdateHistory(
  deviceId: string
): Promise<{ data: DeviceUpdateHistory[] | null; error: any }> {
  try {
    console.log('📜 Fetching update history for device:', deviceId);

    const { data, error } = await supabase
      .from('device_update_history')
      .select(`
        *,
        release:software_releases(id, name, version)
      `)
      .eq('device_id', deviceId)
      .order('installed_at', { ascending: false });

    if (error) {
      console.error('❌ Fetch update history error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} update history entries`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch update history exception:', error);
    return { data: null, error };
  }
}

/**
 * Get count of pending updates for devices owned by a distributor
 * Useful for displaying a badge count
 *
 * @param distributorId - Distributor UUID
 * @returns Promise with pending update count or error
 */
export async function getPendingUpdatesCount(
  distributorId: string
): Promise<{ count: number; error: any }> {
  try {
    console.log('🔔 Getting pending updates count for distributor:', distributorId);

    // Get all devices for this distributor
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select(`
        id,
        current_firmware_version,
        current_software_version,
        product_id,
        customer:customers!inner(distributor_id)
      `)
      .eq('status', 'active')
      .eq('customer.distributor_id', distributorId);

    if (devicesError) {
      console.error('❌ Fetch devices error:', devicesError);
      return { count: 0, error: devicesError };
    }

    if (!devices || devices.length === 0) {
      return { count: 0, error: null };
    }

    // Get available releases
    const { data: releases, error: releasesError } = await fetchAvailableReleases(distributorId);

    if (releasesError || !releases || releases.length === 0) {
      return { count: 0, error: null };
    }

    // Count devices with pending updates
    let pendingCount = 0;
    for (const device of devices) {
      for (const release of releases) {
        // Check product compatibility
        if (release.product_id && device.product_id && release.product_id !== device.product_id) {
          continue;
        }

        const currentVersion = release.release_type === 'firmware'
          ? device.current_firmware_version
          : device.current_software_version;

        if (!currentVersion || compareVersions(currentVersion, release.version) < 0) {
          pendingCount++;
          break; // Count each device only once
        }
      }
    }

    console.log(`✅ Found ${pendingCount} devices with pending updates`);
    return { count: pendingCount, error: null };
  } catch (error) {
    console.error('💥 Get pending updates count exception:', error);
    return { count: 0, error };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get human-readable label for a release type
 *
 * @param type - Release type enum value
 * @returns Human-readable label
 */
export function getReleaseTypeLabel(type: SoftwareRelease['release_type']): string {
  const labels: Record<SoftwareRelease['release_type'], string> = {
    firmware: 'Firmware',
    software: 'Software',
    patch: 'Patch',
    hotfix: 'Hotfix',
    driver: 'Driver'
  };

  return labels[type] || type;
}

/**
 * Get all available release types with labels
 *
 * @returns Array of release type options
 */
export function getReleaseTypes(): Array<{ value: SoftwareRelease['release_type']; label: string }> {
  return [
    { value: 'firmware', label: 'Firmware' },
    { value: 'software', label: 'Software' },
    { value: 'patch', label: 'Patch' },
    { value: 'hotfix', label: 'Hotfix' },
    { value: 'driver', label: 'Driver' }
  ];
}

/**
 * Get human-readable label for a release status
 *
 * @param status - Release status enum value
 * @returns Human-readable label
 */
export function getReleaseStatusLabel(status: SoftwareRelease['status']): string {
  const labels: Record<SoftwareRelease['status'], string> = {
    draft: 'Draft',
    published: 'Published',
    deprecated: 'Deprecated',
    recalled: 'Recalled'
  };

  return labels[status] || status;
}

/**
 * Get status badge color configuration
 *
 * @param status - Release status enum value
 * @returns Tailwind color classes
 */
export function getReleaseStatusColor(status: SoftwareRelease['status']): string {
  const colors: Record<SoftwareRelease['status'], string> = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-green-100 text-green-800',
    deprecated: 'bg-yellow-100 text-yellow-800',
    recalled: 'bg-red-100 text-red-800'
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Compare two version strings
 *
 * @param v1 - First version string (e.g., "1.2.3")
 * @param v2 - Second version string (e.g., "1.2.4")
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Calculate a simple checksum for a file (MD5-like hash simulation)
 * Note: For production, use a proper crypto library
 *
 * @param file - File to calculate checksum for
 * @returns Promise with checksum string
 */
export async function calculateChecksum(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(data);

      // Simple hash calculation (not cryptographically secure)
      let hash = 0;
      for (let i = 0; i < bytes.length; i++) {
        hash = ((hash << 5) - hash) + bytes[i];
        hash = hash & hash; // Convert to 32bit integer
      }

      resolve(Math.abs(hash).toString(16).padStart(8, '0'));
    };
    reader.readAsArrayBuffer(file);
  });
}
