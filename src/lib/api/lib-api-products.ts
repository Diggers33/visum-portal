// Products API - Database operations for products
import { supabase } from '../supabase';
import type { Product, ProductInsert, ProductUpdate } from './types';

/**
 * Fetch all products
 */
export async function getProducts(): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching products:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Fetch single product by ID
 */
export async function getProduct(id: string): Promise<{ data: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching product:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  product: ProductInsert
): Promise<{ data: Product | null; error: string | null }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const productData = {
      ...product,
      created_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error creating product:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  updates: ProductUpdate
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error updating product:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search products
 */
export async function searchProducts(query: string): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching products:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error searching products:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get products by category
 */
export async function getProductsByCategory(category: string): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products by category:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching products by category:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get products by status
 */
export async function getProductsByStatus(status: 'active' | 'discontinued' | 'coming_soon'): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products by status:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching products by status:', error);
    return { data: null, error: error.message };
  }
}
