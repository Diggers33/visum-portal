// Frontend API: Marketing Assets Management
// Provides clean interface for React components to interact with marketing assets Edge Function

import { supabase } from '../supabase';

export interface MarketingAsset {
  id: string;
  name: string;
  type: string;
  product: string;
  language: string;
  format: string;
  size?: number;
  status: 'draft' | 'published' | 'archived';
  description?: string;
  file_url?: string;
  downloads: number;
  internal_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMarketingAssetInput {
  name: string;
  type: string;
  product: string;
  language: string;
  format: string;
  size?: number;
  status: 'draft' | 'published' | 'archived';
  description?: string;
  file_url?: string;
  internal_notes?: string;
}

export interface UpdateMarketingAssetInput extends Partial<CreateMarketingAssetInput> {}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-assets-management`;

/**
 * Fetch all marketing assets
 */
export async function fetchMarketingAssets(): Promise<MarketingAsset[]> {
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
    throw new Error(error.error || 'Failed to fetch marketing assets');
  }

  return response.json();
}

/**
 * Fetch single marketing asset by ID
 */
export async function fetchMarketingAssetById(id: string): Promise<MarketingAsset> {
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
    throw new Error(error.error || 'Failed to fetch marketing asset');
  }

  return response.json();
}

/**
 * Create new marketing asset
 */
export async function createMarketingAsset(input: CreateMarketingAssetInput): Promise<MarketingAsset> {
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
    throw new Error(error.error || 'Failed to create marketing asset');
  }

  return response.json();
}

/**
 * Update existing marketing asset
 */
export async function updateMarketingAsset(
  id: string,
  input: UpdateMarketingAssetInput
): Promise<MarketingAsset> {
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
    throw new Error(error.error || 'Failed to update marketing asset');
  }

  return response.json();
}

/**
 * Delete marketing asset
 */
export async function deleteMarketingAsset(id: string): Promise<void> {
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
    throw new Error(error.error || 'Failed to delete marketing asset');
  }
}

/**
 * Increment download count for a marketing asset
 */
export async function incrementAssetDownloads(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?action=increment_downloads&id=${id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to increment downloads');
  }
}

/**
 * Upload marketing asset file to Supabase Storage
 */
export async function uploadMarketingAssetFile(
  file: File,
  assetId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${assetId}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from('marketing-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('marketing-assets')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete marketing asset file from Supabase Storage
 */
export async function deleteMarketingAssetFile(fileUrl: string): Promise<void> {
  const filePath = fileUrl.split('/').pop();
  
  if (!filePath) {
    throw new Error('Invalid file URL');
  }

  const { error } = await supabase.storage
    .from('marketing-assets')
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
