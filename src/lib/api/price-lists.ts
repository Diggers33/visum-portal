import { supabase } from '../supabase';
import { supabaseAdmin } from '../supabase-admin';

export interface PriceList {
  id: string;
  name: string;
  currency: 'EUR' | 'USD';
  description?: string;
  file_url?: string;
  file_path?: string;
  file_size?: number;
  status: 'draft' | 'published' | 'archived';
  valid_from?: string;
  valid_until?: string;
  downloads: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceListInput {
  name: string;
  currency: 'EUR' | 'USD';
  description?: string;
  file_url?: string;
  file_path?: string;
  file_size?: number;
  status: 'draft' | 'published' | 'archived';
  valid_from?: string;
  valid_until?: string;
}

export interface UpdatePriceListInput extends Partial<CreatePriceListInput> {}

/** Admin: fetch all price lists */
export async function fetchPriceLists(): Promise<{ data: PriceList[] | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('price_lists')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
}

/** Admin: create a price list record */
export async function createPriceList(
  input: CreatePriceListInput
): Promise<{ data: PriceList | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabaseAdmin
    .from('price_lists')
    .insert({ ...input, created_by: user?.id, updated_at: new Date().toISOString() })
    .select()
    .single();

  return { data, error };
}

/** Admin: update a price list record */
export async function updatePriceList(
  id: string,
  input: UpdatePriceListInput
): Promise<{ data: PriceList | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('price_lists')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

/** Admin: delete a price list record */
export async function deletePriceList(id: string): Promise<{ error: any }> {
  const { error } = await supabaseAdmin
    .from('price_lists')
    .delete()
    .eq('id', id);

  return { error };
}

/** Upload price list file to storage */
export async function uploadPriceListFile(file: File): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from('price-lists')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabaseAdmin.storage.from('price-lists').getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

/** Delete price list file from storage */
export async function deletePriceListFile(filePath: string): Promise<void> {
  await supabaseAdmin.storage.from('price-lists').remove([filePath]);
}

/** Increment download count */
export async function incrementPriceListDownloads(id: string): Promise<void> {
  await supabaseAdmin.rpc('increment_price_list_downloads', { list_id: id });
}
