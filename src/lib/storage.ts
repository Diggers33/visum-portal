import { supabase } from './supabase';

export type StorageBucket = 
  | 'product-images'
  | 'product-documents' 
  | 'marketing-materials'
  | 'training-videos'
  | 'distributor-documents';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param folder - Optional folder path within the bucket
 * @returns Upload result with URL or error
 */
export async function uploadFile(
  file: File,
  bucket: StorageBucket,
  folder?: string
): Promise<UploadResult> {
  try {
    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    
    // Build the full path
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
      path: data.path
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @param bucket - The storage bucket name
 * @param folder - Optional folder path within the bucket
 * @returns Array of upload results
 */
export async function uploadMultipleFiles(
  files: File[],
  bucket: StorageBucket,
  folder?: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadFile(file, bucket, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Supabase Storage
 * @param path - The file path to delete
 * @param bucket - The storage bucket name
 * @returns Success boolean
 */
export async function deleteFile(
  path: string,
  bucket: StorageBucket
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param paths - Array of file paths to delete
 * @param bucket - The storage bucket name
 * @returns Success boolean
 */
export async function deleteMultipleFiles(
  paths: string[],
  bucket: StorageBucket
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error('Delete multiple error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete multiple exception:', error);
    return false;
  }
}

/**
 * Get the public URL for a file
 * @param path - The file path
 * @param bucket - The storage bucket name
 * @returns Public URL string
 */
export function getPublicUrl(path: string, bucket: StorageBucket): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * List files in a bucket folder
 * @param bucket - The storage bucket name
 * @param folder - Optional folder path
 * @returns Array of file metadata
 */
export async function listFiles(
  bucket: StorageBucket,
  folder?: string
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('List files error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('List files exception:', error);
    return [];
  }
}
