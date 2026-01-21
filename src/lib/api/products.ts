import { supabase } from '../supabase';
import { uploadFile, deleteFile } from '../storage';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  hs_code?: string;
  product_line: string;
  description?: string;
  price: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  image_url?: string;
  image_path?: string;
  views: number;
  downloads: number;
  specifications?: Record<string, any>;
  features?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  hs_code?: string;
  product_line: string;
  description?: string;
  price?: number;
  currency?: string;
  status?: 'draft' | 'published';
  image?: File;
  specifications?: Record<string, any>;
  features?: string[];
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  hs_code?: string;
  product_line?: string;
  description?: string;
  price?: number;
  currency?: string;
  status?: 'draft' | 'published' | 'archived';
  image?: File;
  specifications?: Record<string, any>;
  features?: string[];
}

/**
 * Fetch all products with optional filtering
 */
export async function fetchProducts(filters?: {
  status?: string[];
  product_line?: string[];
  search?: string;
}): Promise<{ data: Product[] | null; error: any }> {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    // Apply product line filter
    if (filters?.product_line && filters.product_line.length > 0) {
      query = query.in('product_line', filters.product_line);
    }

    // Apply search filter
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,product_line.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch products error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Fetch products exception:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single product by ID
 */
export async function fetchProductById(id: string): Promise<{ data: Product | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fetch product error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Fetch product exception:', error);
    return { data: null, error };
  }
}

/**
 * Create a new product
 */
export async function createProduct(input: CreateProductInput): Promise<{ data: Product | null; error: any }> {
  try {
    let imageUrl: string | undefined;
    let imagePath: string | undefined;

    // Upload image if provided
    if (input.image) {
      const uploadResult = await uploadFile(input.image, 'product-images', 'products');
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
        imagePath = uploadResult.path;
      } else {
        return { data: null, error: { message: 'Failed to upload image' } };
      }
    }

    // Insert product into database
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: input.name,
        product_line: input.product_line,
        description: input.description,
        price: input.price,
        currency: input.currency || 'EUR',
        status: input.status || 'draft',
        image_url: imageUrl,
        image_path: imagePath,
        specifications: input.specifications,
        features: input.features,
        views: 0,
        downloads: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Create product error:', error);
      // Clean up uploaded image if database insert failed
      if (imagePath) {
        await deleteFile(imagePath, 'product-images');
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Create product exception:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<{ data: Product | null; error: any }> {
  console.log('🔧 updateProduct called:', { id, input });
  
  try {
    let imageUrl: string | undefined;
    let imagePath: string | undefined;

    // Upload new image if provided
    if (input.image) {
      console.log('📤 Image provided, uploading...');
      
      // Fetch current product to get old image path
      const { data: currentProduct } = await fetchProductById(id);
      console.log('📦 Current product fetched:', currentProduct?.name);
      
      // Upload new image
      const uploadResult = await uploadFile(input.image, 'product-images', 'products');
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
        imagePath = uploadResult.path;
        console.log('✅ Image uploaded:', { imageUrl, imagePath });

        // Delete old image if it exists
        if (currentProduct?.image_path) {
          console.log('🗑️ Deleting old image:', currentProduct.image_path);
          await deleteFile(currentProduct.image_path, 'product-images');
        }
      } else {
        console.error('❌ Image upload failed:', uploadResult.error);
        return { data: null, error: { message: 'Failed to upload image' } };
      }
    } else {
      console.log('ℹ️ No image to upload');
    }

    // Prepare update data - only include defined, non-empty values
    const updateData: any = {};
    
    // Only add fields that are explicitly defined and not null
    if (input.name !== undefined) updateData.name = input.name;
    if (input.product_line !== undefined) updateData.product_line = input.product_line;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.status !== undefined) updateData.status = input.status;
    
    // Only add specifications if it's a non-empty object
    if (input.specifications && Object.keys(input.specifications).length > 0) {
      updateData.specifications = input.specifications;
    }
    
    // Only add features if it's a non-empty array
    if (input.features && input.features.length > 0) {
      updateData.features = input.features;
    }
    
    // Add image URLs if new image was uploaded
    if (imageUrl) {
      updateData.image_url = imageUrl;
      updateData.image_path = imagePath;
    }

    console.log('📝 Updating database with:', updateData);
    console.log('📊 Fields being updated:', Object.keys(updateData));

    // Update product in database with timeout
    const updatePromise = supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database update timeout after 15 seconds')), 15000)
    );

    const { data, error } = await Promise.race([
      updatePromise,
      timeoutPromise
    ]) as any;

    console.log('📊 Database response:', { data, error });

    if (error) {
      console.error('❌ Update product error:', error);
      // Clean up uploaded image if database update failed
      if (imagePath) {
        console.log('🗑️ Cleaning up uploaded image');
        await deleteFile(imagePath, 'product-images');
      }
      return { data: null, error };
    }

    console.log('✅ Product updated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('💥 Update product exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error: any }> {
  try {
    // Fetch product to get image path
    const { data: product } = await fetchProductById(id);

    // Delete product from database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete product error:', error);
      return { success: false, error };
    }

    // Delete associated image if it exists
    if (product?.image_path) {
      await deleteFile(product.image_path, 'product-images');
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Delete product exception:', error);
    return { success: false, error };
  }
}

/**
 * Archive a product (soft delete)
 */
export async function archiveProduct(id: string): Promise<{ data: Product | null; error: any }> {
  return updateProduct(id, { status: 'archived' });
}

/**
 * Duplicate a product
 */
export async function duplicateProduct(id: string): Promise<{ data: Product | null; error: any }> {
  try {
    // Fetch original product
    const { data: originalProduct, error: fetchError } = await fetchProductById(id);
    
    if (fetchError || !originalProduct) {
      return { data: null, error: fetchError || { message: 'Product not found' } };
    }

    // Create new product with copied data
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: `${originalProduct.name} (Copy)`,
        product_line: originalProduct.product_line,
        description: originalProduct.description,
        price: originalProduct.price,
        currency: originalProduct.currency,
        status: 'draft',
        image_url: originalProduct.image_url,
        image_path: originalProduct.image_path,
        specifications: originalProduct.specifications,
        features: originalProduct.features,
        views: 0,
        downloads: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Duplicate product error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Duplicate product exception:', error);
    return { data: null, error };
  }
}

/**
 * Increment product views
 */
export async function incrementViews(id: string): Promise<void> {
  try {
    await supabase.rpc('increment_product_views', { product_id: id });
  } catch (error) {
    console.error('Increment views error:', error);
  }
}

/**
 * Increment product downloads
 */
export async function incrementDownloads(id: string): Promise<void> {
  try {
    await supabase.rpc('increment_product_downloads', { product_id: id });
  } catch (error) {
    console.error('Increment downloads error:', error);
  }
}
