// src/types/database.ts
// Shared TypeScript types for the IRIS Distributor Platform

/**
 * PRODUCTS
 */
export interface Product {
  id: string;
  name: string;
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
  product_line: string;
  description?: string;
  price: number;
  currency?: string;
  status?: 'draft' | 'published';
  image?: File;
  specifications?: Record<string, any>;
  features?: string[];
}

export interface UpdateProductInput {
  name?: string;
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
 * DISTRIBUTORS
 */
export interface Distributor {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  address?: string;
  postal_code?: string;
  status: 'active' | 'inactive' | 'pending';
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  commission_rate?: number;
  website?: string;
  logo_url?: string;
  logo_path?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDistributorInput {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  address?: string;
  postal_code?: string;
  status?: 'active' | 'inactive' | 'pending';
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  commission_rate?: number;
  website?: string;
  logo?: File;
  notes?: string;
}

export interface UpdateDistributorInput {
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  status?: 'active' | 'inactive' | 'pending';
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  commission_rate?: number;
  website?: string;
  logo?: File;
  notes?: string;
}

/**
 * DOCUMENTS
 */
export interface Document {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: 'technical' | 'marketing' | 'training' | 'legal' | 'other';
  product_id?: string;
  distributor_id?: string;
  is_public: boolean;
  downloads: number;
  views: number;
  version?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  title: string;
  description?: string;
  file: File;
  category: 'technical' | 'marketing' | 'training' | 'legal' | 'other';
  product_id?: string;
  distributor_id?: string;
  is_public?: boolean;
  version?: string;
  tags?: string[];
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  file?: File;
  category?: 'technical' | 'marketing' | 'training' | 'legal' | 'other';
  product_id?: string;
  distributor_id?: string;
  is_public?: boolean;
  version?: string;
  tags?: string[];
}

/**
 * MARKETING MATERIALS
 */
export interface MarketingMaterial {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
  material_type: 'brochure' | 'flyer' | 'presentation' | 'video' | 'image' | 'other';
  product_id?: string;
  language?: string;
  is_public: boolean;
  downloads: number;
  views: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateMarketingMaterialInput {
  title: string;
  description?: string;
  file: File;
  material_type: 'brochure' | 'flyer' | 'presentation' | 'video' | 'image' | 'other';
  product_id?: string;
  language?: string;
  is_public?: boolean;
  tags?: string[];
}

/**
 * TRAINING VIDEOS
 */
export interface TrainingVideo {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  video_path: string;
  thumbnail_url?: string;
  duration?: number;
  product_id?: string;
  category?: 'installation' | 'operation' | 'maintenance' | 'troubleshooting' | 'overview';
  is_public: boolean;
  views: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingVideoInput {
  title: string;
  description?: string;
  video: File;
  thumbnail?: File;
  duration?: number;
  product_id?: string;
  category?: 'installation' | 'operation' | 'maintenance' | 'troubleshooting' | 'overview';
  is_public?: boolean;
  tags?: string[];
}

/**
 * DISTRIBUTOR ACCESS
 */
export interface DistributorAccess {
  id: string;
  distributor_id: string;
  product_id?: string;
  document_id?: string;
  marketing_material_id?: string;
  training_video_id?: string;
  access_granted_at: string;
  access_expires_at?: string;
  granted_by: string;
}

export interface GrantAccessInput {
  distributor_id: string;
  resource_type: 'product' | 'document' | 'marketing_material' | 'training_video';
  resource_id: string;
  expires_at?: string;
}

/**
 * ANALYTICS
 */
export interface ProductAnalytics {
  product_id: string;
  product_name: string;
  views: number;
  downloads: number;
  unique_distributors: number;
  total_revenue?: number;
}

export interface DistributorAnalytics {
  distributor_id: string;
  company_name: string;
  total_purchases: number;
  total_revenue: number;
  most_viewed_products: string[];
  last_active: string;
}

/**
 * STORAGE
 */
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
 * FILTERS
 */
export interface ProductFilters {
  status?: ('draft' | 'published' | 'archived')[];
  product_line?: string[];
  search?: string;
  min_price?: number;
  max_price?: number;
}

export interface DistributorFilters {
  status?: ('active' | 'inactive' | 'pending')[];
  tier?: ('platinum' | 'gold' | 'silver' | 'bronze')[];
  country?: string[];
  search?: string;
}

export interface DocumentFilters {
  category?: ('technical' | 'marketing' | 'training' | 'legal' | 'other')[];
  product_id?: string;
  distributor_id?: string;
  is_public?: boolean;
  search?: string;
}

/**
 * API RESPONSES
 */
export interface ApiResponse<T> {
  data: T | null;
  error: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * FORM STATES
 */
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * UI STATES
 */
export type ViewMode = 'grid' | 'list';
export type SortOrder = 'asc' | 'desc';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
