// Database Types for IRIS Distributor Portal

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  specifications: Record<string, any>;
  features: string[] | null;
  applications: string[] | null;
  image_url: string | null;
  thumbnail_url: string | null;
  brochure_url: string | null;
  datasheet_url: string | null;
  manual_url: string | null;
  status: 'active' | 'discontinued' | 'coming_soon';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Form types for creating/updating
export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate = Partial<ProductInsert>;
