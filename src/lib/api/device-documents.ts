import { supabase } from '../supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceDocument {
  id: string;
  device_id: string;
  title: string;
  description?: string;
  document_type: 'manual' | 'datasheet' | 'certificate' | 'calibration' | 'maintenance_report' | 'installation_guide' | 'custom' | 'other';
  version: string;
  is_latest: boolean;
  previous_version_id?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  status: 'active' | 'archived' | 'superseded';
  shared_with_customer: boolean;
  shared_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  device?: {
    id: string;
    device_name: string;
    serial_number: string;
    customer_id: string;
  };
}

export interface CreateDocumentInput {
  device_id: string;
  title: string;
  description?: string;
  document_type: DeviceDocument['document_type'];
  version?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  shared_with_customer?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  document_type?: DeviceDocument['document_type'];
  status?: 'active' | 'archived' | 'superseded';
  shared_with_customer?: boolean;
}

export interface DocumentHistoryEntry {
  id: string;
  document_id: string;
  device_id: string;
  action_type: string;
  action_description?: string;
  old_value?: any;
  new_value?: any;
  performed_by?: string;
  performed_at: string;
}

export interface DocumentUploadResult {
  data: DeviceDocument | null;
  error: any;
  url?: string;
}

// Storage bucket name
const STORAGE_BUCKET = 'device-documents';

// ============================================================================
// DOCUMENT HISTORY LOGGING
// ============================================================================

/**
 * Log an action to the document history table
 *
 * @param documentId - Document UUID
 * @param deviceId - Device UUID
 * @param actionType - Type of action (e.g., 'created', 'updated', 'shared', 'versioned')
 * @param description - Optional description of the action
 * @param oldValue - Optional old value (for updates)
 * @param newValue - Optional new value (for updates)
 */
export async function logDocumentAction(
  documentId: string,
  deviceId: string,
  actionType: string,
  description?: string,
  oldValue?: any,
  newValue?: any
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('document_history')
      .insert({
        document_id: documentId,
        device_id: deviceId,
        action_type: actionType,
        action_description: description,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        performed_by: user?.id,
        performed_at: new Date().toISOString()
      });

    console.log(`📝 Logged action: ${actionType} for document ${documentId}`);
  } catch (error) {
    console.error('❌ Failed to log document action:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Get the complete history of actions for a document
 *
 * @param documentId - Document UUID
 * @returns Promise with history entries or error
 */
export async function getDocumentHistory(
  documentId: string
): Promise<{ data: DocumentHistoryEntry[] | null; error: any }> {
  try {
    console.log('📜 Fetching document history:', documentId);

    const { data, error } = await supabase
      .from('document_history')
      .select('*')
      .eq('document_id', documentId)
      .order('performed_at', { ascending: false });

    if (error) {
      console.error('❌ Fetch document history error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} history entries`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch document history exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch all documents for a device
 *
 * @param deviceId - Device UUID
 * @returns Promise with documents array or error
 */
export async function fetchDeviceDocuments(
  deviceId: string
): Promise<{ data: DeviceDocument[] | null; error: any }> {
  try {
    console.log('📊 Fetching documents for device:', deviceId);

    const { data, error } = await supabase
      .from('device_documents')
      .select(`
        *,
        device:devices(
          id,
          device_name,
          serial_number,
          customer_id
        )
      `)
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Fetch device documents error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} documents`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch device documents exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch only the latest version of each document type for a device
 *
 * @param deviceId - Device UUID
 * @returns Promise with documents array or error
 */
export async function fetchLatestDeviceDocuments(
  deviceId: string
): Promise<{ data: DeviceDocument[] | null; error: any }> {
  try {
    console.log('📊 Fetching latest documents for device:', deviceId);

    const { data, error } = await supabase
      .from('device_documents')
      .select('*')
      .eq('device_id', deviceId)
      .eq('is_latest', true)
      .eq('status', 'active')
      .order('document_type');

    if (error) {
      console.error('❌ Fetch latest documents error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} latest documents`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch latest documents exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch documents shared with customer for a device
 *
 * @param deviceId - Device UUID
 * @returns Promise with shared documents array or error
 */
export async function fetchSharedDocuments(
  deviceId: string
): Promise<{ data: DeviceDocument[] | null; error: any }> {
  try {
    console.log('📊 Fetching shared documents for device:', deviceId);

    const { data, error } = await supabase
      .from('device_documents')
      .select('*')
      .eq('device_id', deviceId)
      .eq('shared_with_customer', true)
      .eq('status', 'active')
      .order('document_type');

    if (error) {
      console.error('❌ Fetch shared documents error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} shared documents`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch shared documents exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single document by ID
 *
 * @param id - Document UUID
 * @returns Promise with document data or error
 */
export async function fetchDocumentById(
  id: string
): Promise<{ data: DeviceDocument | null; error: any }> {
  try {
    console.log('🔍 Fetching document by ID:', id);

    const { data, error } = await supabase
      .from('device_documents')
      .select(`
        *,
        device:devices(
          id,
          device_name,
          serial_number,
          customer_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Fetch document error:', error);
      return { data: null, error };
    }

    console.log('✅ Fetched document:', data.title);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch document exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch all versions of a document (by document type and device)
 *
 * @param documentId - Document UUID (will trace back through previous_version_id)
 * @returns Promise with all versions or error
 */
export async function fetchDocumentVersions(
  documentId: string
): Promise<{ data: DeviceDocument[] | null; error: any }> {
  try {
    console.log('📊 Fetching document versions for:', documentId);

    // First get the current document to find device_id and document_type
    const { data: currentDoc, error: fetchError } = await supabase
      .from('device_documents')
      .select('device_id, document_type, title')
      .eq('id', documentId)
      .single();

    if (fetchError || !currentDoc) {
      console.error('❌ Fetch current document error:', fetchError);
      return { data: null, error: fetchError };
    }

    // Fetch all documents of the same type for this device
    const { data, error } = await supabase
      .from('device_documents')
      .select('*')
      .eq('device_id', currentDoc.device_id)
      .eq('document_type', currentDoc.document_type)
      .eq('title', currentDoc.title)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Fetch document versions error:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} versions`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Fetch document versions exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload a file to storage and create document record
 *
 * @param deviceId - Device UUID
 * @param file - File to upload
 * @param metadata - Document metadata
 * @returns Promise with created document or error
 */
export async function uploadDeviceDocument(
  deviceId: string,
  file: File,
  metadata: Partial<CreateDocumentInput>
): Promise<DocumentUploadResult> {
  try {
    console.log('📤 Uploading document:', file.name, 'for device:', deviceId);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExt = file.name.split('.').pop();
    const fileName = `${deviceId}/${timestamp}-${randomString}.${fileExt}`;

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

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Create document record
    const documentData: CreateDocumentInput = {
      device_id: deviceId,
      title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      description: metadata.description,
      document_type: metadata.document_type || 'other',
      version: metadata.version || '1.0',
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || fileExt,
      shared_with_customer: metadata.shared_with_customer || false
    };

    const { data: document, error: insertError } = await supabase
      .from('device_documents')
      .insert({
        ...documentData,
        is_latest: true,
        status: 'active',
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Create document record error:', insertError);
      // Try to clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      return { data: null, error: insertError };
    }

    // Log the action
    await logDocumentAction(
      document.id,
      deviceId,
      'created',
      `Document "${document.title}" (v${document.version}) uploaded`
    );

    console.log('✅ Document uploaded successfully:', document.id);
    return { data: document, error: null, url: publicUrl };
  } catch (error) {
    console.error('💥 Upload document exception:', error);
    return { data: null, error };
  }
}

/**
 * Create a new version of an existing document
 *
 * @param documentId - Existing document UUID to version
 * @param file - New file to upload
 * @param newVersion - Optional version string (auto-incremented if not provided)
 * @returns Promise with new document version or error
 */
export async function createNewVersion(
  documentId: string,
  file: File,
  newVersion?: string
): Promise<DocumentUploadResult> {
  try {
    console.log('📤 Creating new version for document:', documentId);

    // Fetch existing document
    const { data: existingDoc, error: fetchError } = await supabase
      .from('device_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !existingDoc) {
      console.error('❌ Fetch existing document error:', fetchError);
      return { data: null, error: fetchError || { message: 'Document not found' } };
    }

    // Auto-increment version if not provided
    const version = newVersion || incrementVersion(existingDoc.version);

    // Mark existing document as superseded
    await supabase
      .from('device_documents')
      .update({
        is_latest: false,
        status: 'superseded',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    // Upload new version
    const result = await uploadDeviceDocument(
      existingDoc.device_id,
      file,
      {
        title: existingDoc.title,
        description: existingDoc.description,
        document_type: existingDoc.document_type,
        version: version,
        shared_with_customer: existingDoc.shared_with_customer
      }
    );

    if (result.error) {
      // Rollback the superseded status
      await supabase
        .from('device_documents')
        .update({
          is_latest: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      return result;
    }

    // Update the new document with previous_version_id
    if (result.data) {
      await supabase
        .from('device_documents')
        .update({ previous_version_id: documentId })
        .eq('id', result.data.id);

      result.data.previous_version_id = documentId;

      // Log the action
      await logDocumentAction(
        result.data.id,
        existingDoc.device_id,
        'versioned',
        `New version ${version} created (previous: ${existingDoc.version})`,
        { version: existingDoc.version },
        { version: version }
      );
    }

    console.log('✅ New version created successfully');
    return result;
  } catch (error) {
    console.error('💥 Create new version exception:', error);
    return { data: null, error };
  }
}

// ============================================================================
// UPDATE/DELETE FUNCTIONS
// ============================================================================

/**
 * Update document metadata (not the file itself)
 *
 * @param id - Document UUID
 * @param input - Updated metadata
 * @returns Promise with updated document or error
 */
export async function updateDocumentMetadata(
  id: string,
  input: UpdateDocumentInput
): Promise<{ data: DeviceDocument | null; error: any }> {
  try {
    console.log('🔧 Updating document metadata:', id);

    // Fetch existing for history logging
    const { data: existingDoc } = await supabase
      .from('device_documents')
      .select('*')
      .eq('id', id)
      .single();

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
      .from('device_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update document error:', error);
      return { data: null, error };
    }

    // Log the action
    if (existingDoc) {
      const changedFields = Object.keys(input).filter(
        key => input[key as keyof UpdateDocumentInput] !== existingDoc[key as keyof typeof existingDoc]
      );

      if (changedFields.length > 0) {
        await logDocumentAction(
          id,
          data.device_id,
          'updated',
          `Updated fields: ${changedFields.join(', ')}`,
          Object.fromEntries(changedFields.map(k => [k, existingDoc[k as keyof typeof existingDoc]])),
          Object.fromEntries(changedFields.map(k => [k, input[k as keyof UpdateDocumentInput]]))
        );
      }
    }

    console.log('✅ Document metadata updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 Update document exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a document (removes file from storage and record from database)
 *
 * @param id - Document UUID
 * @returns Promise with success status or error
 */
export async function deleteDocument(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('🗑️ Deleting document:', id);

    // Fetch document to get file path
    const { data: document, error: fetchError } = await supabase
      .from('device_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      console.error('❌ Document not found:', fetchError);
      return { success: false, error: fetchError || { message: 'Document not found' } };
    }

    // Extract file path from URL
    const urlParts = document.file_url.split('/');
    const bucketIndex = urlParts.indexOf(STORAGE_BUCKET);
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.warn('⚠️ Failed to delete file from storage:', storageError);
      // Continue with database deletion anyway
    }

    // Log before deletion
    await logDocumentAction(
      id,
      document.device_id,
      'deleted',
      `Document "${document.title}" (v${document.version}) deleted`
    );

    // Delete document record
    const { error: deleteError } = await supabase
      .from('device_documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Delete document error:', deleteError);
      return { success: false, error: deleteError };
    }

    // If this was the latest, mark the previous version as latest
    if (document.is_latest && document.previous_version_id) {
      await supabase
        .from('device_documents')
        .update({
          is_latest: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', document.previous_version_id);
    }

    console.log('✅ Document deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Delete document exception:', error);
    return { success: false, error };
  }
}

/**
 * Archive a document (soft delete - keeps file but marks as archived)
 *
 * @param id - Document UUID
 * @returns Promise with success status or error
 */
export async function archiveDocument(
  id: string
): Promise<{ success: boolean; error: any }> {
  try {
    console.log('📦 Archiving document:', id);

    const { data, error } = await supabase
      .from('device_documents')
      .update({
        status: 'archived',
        is_latest: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Archive document error:', error);
      return { success: false, error };
    }

    // Log the action
    await logDocumentAction(
      id,
      data.device_id,
      'archived',
      `Document "${data.title}" archived`
    );

    console.log('✅ Document archived successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Archive document exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// SHARING FUNCTIONS
// ============================================================================

/**
 * Share or unshare a document with the customer
 *
 * @param id - Document UUID
 * @param share - True to share, false to unshare
 * @returns Promise with success status or error
 */
export async function shareWithCustomer(
  id: string,
  share: boolean
): Promise<{ success: boolean; error: any }> {
  try {
    console.log(`${share ? '🔓' : '🔒'} ${share ? 'Sharing' : 'Unsharing'} document:`, id);

    const updateData: any = {
      shared_with_customer: share,
      updated_at: new Date().toISOString()
    };

    if (share) {
      updateData.shared_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('device_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Share document error:', error);
      return { success: false, error };
    }

    // Log the action
    await logDocumentAction(
      id,
      data.device_id,
      share ? 'shared' : 'unshared',
      `Document ${share ? 'shared with' : 'unshared from'} customer`
    );

    console.log(`✅ Document ${share ? 'shared' : 'unshared'} successfully`);
    return { success: true, error: null };
  } catch (error) {
    console.error('💥 Share document exception:', error);
    return { success: false, error };
  }
}

/**
 * Bulk share/unshare multiple documents
 *
 * @param documentIds - Array of document UUIDs
 * @param share - True to share, false to unshare
 * @returns Promise with success count and errors
 */
export async function bulkShareDocuments(
  documentIds: string[],
  share: boolean
): Promise<{ successCount: number; errors: any[] }> {
  console.log(`${share ? '🔓' : '🔒'} Bulk ${share ? 'sharing' : 'unsharing'} ${documentIds.length} documents`);

  const errors: any[] = [];
  let successCount = 0;

  for (const id of documentIds) {
    const result = await shareWithCustomer(id, share);
    if (result.success) {
      successCount++;
    } else {
      errors.push({ id, error: result.error });
    }
  }

  console.log(`✅ Bulk operation complete: ${successCount}/${documentIds.length} successful`);
  return { successCount, errors };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Increment a semantic version string
 *
 * @param version - Current version string (e.g., "1.0", "1.2.3")
 * @returns Incremented version string
 */
function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);

  if (parts.length === 1) {
    return `${parts[0] + 1}.0`;
  }

  // Increment the last part
  parts[parts.length - 1]++;
  return parts.join('.');
}

/**
 * Get document type label for display
 *
 * @param type - Document type enum value
 * @returns Human-readable label
 */
export function getDocumentTypeLabel(type: DeviceDocument['document_type']): string {
  const labels: Record<DeviceDocument['document_type'], string> = {
    manual: 'User Manual',
    datasheet: 'Datasheet',
    certificate: 'Certificate',
    calibration: 'Calibration Report',
    maintenance_report: 'Maintenance Report',
    installation_guide: 'Installation Guide',
    custom: 'Custom Document',
    other: 'Other'
  };

  return labels[type] || type;
}

/**
 * Get all available document types
 *
 * @returns Array of document type options
 */
export function getDocumentTypes(): Array<{ value: DeviceDocument['document_type']; label: string }> {
  return [
    { value: 'manual', label: 'User Manual' },
    { value: 'datasheet', label: 'Datasheet' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'calibration', label: 'Calibration Report' },
    { value: 'maintenance_report', label: 'Maintenance Report' },
    { value: 'installation_guide', label: 'Installation Guide' },
    { value: 'custom', label: 'Custom Document' },
    { value: 'other', label: 'Other' }
  ];
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
 * Search documents across all devices
 *
 * @param query - Search query string
 * @param deviceId - Optional device ID to filter by
 * @returns Promise with matching documents or error
 */
export async function searchDocuments(
  query: string,
  deviceId?: string
): Promise<{ data: DeviceDocument[] | null; error: any }> {
  try {
    console.log('🔍 Searching documents:', query);

    let dbQuery = supabase
      .from('device_documents')
      .select(`
        *,
        device:devices(
          id,
          device_name,
          serial_number
        )
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,file_name.ilike.%${query}%`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (deviceId) {
      dbQuery = dbQuery.eq('device_id', deviceId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('❌ Search documents error:', error);
      return { data: null, error };
    }

    console.log(`✅ Found ${data?.length || 0} documents matching "${query}"`);
    return { data, error: null };
  } catch (error) {
    console.error('💥 Search documents exception:', error);
    return { data: null, error };
  }
}
