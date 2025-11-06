// File Upload Utility for Supabase Storage
import { supabase } from '../supabase';

export interface UploadResult {
  url: string;
  path: string;
  error: string | null;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  bucket: string,
  folder?: string
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
      error: null,
    };
  } catch (error: any) {
    console.error('Unexpected upload error:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload file',
    };
  }
}

/**
 * Upload an image with validation
 */
export async function uploadImage(
  file: File,
  bucket: string,
  folder?: string,
  maxSizeMB: number = 5
): Promise<UploadResult> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      url: '',
      path: '',
      error: 'Invalid file type. Please upload JPG, PNG, or WebP.',
    };
  }

  // Validate file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      url: '',
      path: '',
      error: `File size exceeds ${maxSizeMB}MB limit.`,
    };
  }

  return uploadFile(file, bucket, folder);
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete file',
    };
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
