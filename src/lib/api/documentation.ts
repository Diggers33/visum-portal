// Frontend API: Documentation Management
// Provides clean interface for React components to interact with documentation Edge Function

import { supabase } from '../supabase';

export interface Documentation {
  id: string;
  title: string;
  product: string;
  category: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  language: string;
  file_url?: string;
  file_size?: number;
  format?: string;
  downloads: number;
  internal_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentationInput {
  title: string;
  product: string;
  category: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  language: string;
  file_url?: string;
  file_size?: number;
  format?: string;
  internal_notes?: string;
}

export interface UpdateDocumentationInput extends Partial<CreateDocumentationInput> {}

const EDGE_FUNCTION_URL = `https://fssjmqgolghfwmikydhy.supabase.co/functions/v1/documentation-management`;

/**
 * Fetch all documentation
 */
export async function fetchDocumentation(): Promise<Documentation[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // ✅ ADDED
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch documentation');
  }

  return response.json();
}

/**
 * Fetch single document by ID
 */
export async function fetchDocumentById(id: string): Promise<Documentation> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // ✅ ADDED
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch document');
  }

  return response.json();
}

/**
 * Create new documentation
 */
export async function createDocumentation(input: CreateDocumentationInput): Promise<Documentation> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Session error:', sessionError);
    throw new Error('Not authenticated - please log in again');
  }

  console.log('Creating documentation with session:', session.user.email);

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
    console.error('API Error:', error);
    throw new Error(error.error || 'Failed to create documentation');
  }

  return response.json();
}

/**
 * Update existing documentation
 */
export async function updateDocumentation(
  id: string,
  input: UpdateDocumentationInput
): Promise<Documentation> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // ✅ ADDED
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update documentation');
  }

  return response.json();
}

/**
 * Delete documentation
 */
export async function deleteDocumentation(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // ✅ ADDED
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete documentation');
  }
}

/**
 * Increment download count for a document
 */
export async function incrementDownloads(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?action=increment_downloads&id=${id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // ✅ ADDED
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to increment downloads');
  }
}

/**
 * Upload documentation file to Supabase Storage
 */
export async function uploadDocumentationFile(
  file: File,
  documentId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${documentId}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from('documentation')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('documentation')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete documentation file from Supabase Storage
 */
export async function deleteDocumentationFile(fileUrl: string): Promise<void> {
  const filePath = fileUrl.split('/').pop();
  
  if (!filePath) {
    throw new Error('Invalid file URL');
  }

  const { error } = await supabase.storage
    .from('documentation')
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
