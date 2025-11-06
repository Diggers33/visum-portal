// Frontend API: Training Materials Management
// Provides clean interface for React components to interact with training materials Edge Function

import { supabase } from '../supabase';

export interface TrainingMaterial {
  id: string;
  title: string;
  type: string;
  format: string;
  level: string;
  duration?: string;
  modules?: number;
  views: number;
  product: string;
  status: 'draft' | 'published' | 'archived';
  description?: string;
  video_url?: string;
  file_url?: string;
  internal_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingMaterialInput {
  title: string;
  type: string;
  format: string;
  level: string;
  duration?: string;
  modules?: number;
  product: string;
  status: 'draft' | 'published' | 'archived';
  description?: string;
  video_url?: string;
  file_url?: string;
  internal_notes?: string;
}

export interface UpdateTrainingMaterialInput extends Partial<CreateTrainingMaterialInput> {}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/training-materials-management`;

/**
 * Fetch all training materials
 */
export async function fetchTrainingMaterials(): Promise<TrainingMaterial[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch training materials');
  }

  return response.json();
}

/**
 * Fetch single training material by ID
 */
export async function fetchTrainingMaterialById(id: string): Promise<TrainingMaterial> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch training material');
  }

  return response.json();
}

/**
 * Create new training material
 */
export async function createTrainingMaterial(input: CreateTrainingMaterialInput): Promise<TrainingMaterial> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create training material');
  }

  return response.json();
}

/**
 * Update existing training material
 */
export async function updateTrainingMaterial(
  id: string,
  input: UpdateTrainingMaterialInput
): Promise<TrainingMaterial> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update training material');
  }

  return response.json();
}

/**
 * Delete training material
 */
export async function deleteTrainingMaterial(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete training material');
  }
}

/**
 * Increment view count for a training material
 */
export async function incrementTrainingViews(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?action=increment_views&id=${id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to increment views');
  }
}

/**
 * Upload training material file to Supabase Storage
 */
export async function uploadTrainingFile(
  file: File,
  materialId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${materialId}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from('training-resources')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('training-resources')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete training material file from Supabase Storage
 */
export async function deleteTrainingFile(fileUrl: string): Promise<void> {
  const filePath = fileUrl.split('/').pop();
  
  if (!filePath) {
    throw new Error('Invalid file URL');
  }

  const { error } = await supabase.storage
    .from('training-resources')
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
