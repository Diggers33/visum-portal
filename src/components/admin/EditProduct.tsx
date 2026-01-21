import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { ChevronRight, X, Plus, Eye, Download, Upload, Loader2, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../lib/storage';
import ImageWithFallback from '../ImageWithFallback';
import MarketingAssetsSection from './MarketingAssetsSection';

// Interface for batch file upload
interface PendingFile {
  file: File;
  name: string;
  preview?: string;
}

// Extract title from filename
function extractTitleFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const withSpaces = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const titleCase = withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
  return titleCase || filename;
}

// Fallback images
import visumPalmImage from 'figma:asset/215b8c1c8daeedb44f8accf3bbf4cccf350afc13.png';
import ramanImage from 'figma:asset/af6775da0ad9e0b649beed01dcc3abcea85154c7.png';
import hyperspecImage from 'figma:asset/f1bd5ef18a2205dca276525d60d195ea7415771b.png';

const defaultImages: Record<string, string> = {
  'NIR / FT-NIR Spectroscopy': visumPalmImage,
  'Raman Spectroscopy': ramanImage,
  'Hyperspectral Imaging': hyperspecImage,
};

interface Specification {
  id: string;
  label: string;
  value: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  hs_code: string | null;
  category: string;
  description: string | null;
  specifications: any;
  features: string | null;
  applications: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  brochure_url: string | null;
  datasheet_url: string | null;
  manual_url: string | null;
  status: string;
  product_line: string | null;
  price: number | null;
  currency: string;
  views: number;
  downloads: number;
  created_at: string;
  updated_at: string;
}

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Batch upload states
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Product state
  const [product, setProduct] = useState<Product | null>(null);
  
  // Form state
  const [productData, setProductData] = useState({
    name: '',
    sku: '',
    hs_code: '',
    product_line: '',
    category: '',
    description: '',
    price: '',
    currency: 'EUR',
    status: 'draft',
    features: '',
    applications: '',
    datasheet_url: '',
    manual_url: '',
    brochure_url: '',
    image_url: '',
  });

  const [specifications, setSpecifications] = useState<Specification[]>([]);

  // Load product
  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setProduct(data);
        // Convert features array to newline-separated text
        const featuresText = Array.isArray(data.features)
          ? data.features.join('\n')
          : (data.features || '');

        // Convert applications array to newline-separated text
        const applicationsText = Array.isArray(data.applications)
          ? data.applications.join('\n')
          : (data.applications || '');

        setProductData({
          name: data.name || '',
          sku: data.sku || '',
          hs_code: data.hs_code || '',
          product_line: data.product_line || '',
          category: data.category || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          currency: data.currency || 'EUR',
          status: data.status || 'draft',
          features: featuresText,
          applications: applicationsText,
          datasheet_url: data.datasheet_url || '',
          manual_url: data.manual_url || '',
          brochure_url: data.brochure_url || '',
          image_url: data.image_url || '',
        });

        // Parse specifications from JSON
        if (data.specifications && typeof data.specifications === 'object') {
          const specs = Object.entries(data.specifications).map(([label, value], index) => ({
            id: `spec-${index}`,
            label: label,
            value: String(value),
          }));
          setSpecifications(specs);
        }
      }
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setProductData({ ...productData, [field]: value });
    setHasUnsavedChanges(true);
  };

  // Batch file selection handler
  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: PendingFile[] = Array.from(files).map(file => ({
        file,
        name: extractTitleFromFilename(file.name),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      }));
      setPendingFiles(prev => [...prev, ...newFiles]);
      setHasUnsavedChanges(true);
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  };

  // Remove a pending file from queue
  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Update pending file name
  const updatePendingFileName = (index: number, name: string) => {
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, name } : f));
  };

  const addSpecification = () => {
    const newSpec: Specification = {
      id: Date.now().toString(),
      label: '',
      value: '',
    };
    setSpecifications([...specifications, newSpec]);
    setHasUnsavedChanges(true);
  };

  const removeSpecification = (id: string) => {
    setSpecifications(specifications.filter(spec => spec.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateSpecification = (id: string, field: 'label' | 'value', value: string) => {
    setSpecifications(
      specifications.map(spec =>
        spec.id === id ? { ...spec, [field]: value } : spec
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!productData.name || !productData.category) {
      toast.error('Please fill in product name and category');
      return;
    }

    try {
      setSaving(true);

      // Upload pending images first (use the first one as main image)
      let newImageUrl = productData.image_url;
      let newImagePath: string | undefined;

      if (pendingFiles.length > 0) {
        setUploadProgress({ current: 0, total: pendingFiles.length });

        // Upload the first image as the main product image
        const firstFile = pendingFiles[0];
        setUploadProgress({ current: 1, total: pendingFiles.length });

        const uploadResult = await uploadFile(firstFile.file, 'product-images', 'products');
        if (uploadResult.success && uploadResult.url) {
          newImageUrl = uploadResult.url;
          newImagePath = uploadResult.path;
        } else {
          toast.error('Failed to upload image');
          setUploadProgress(null);
          setSaving(false);
          return;
        }

        setUploadProgress(null);
      }

      // Convert specifications array to object
      const specificationsObject = specifications.reduce((acc, spec) => {
        if (spec.label && spec.value) {
          acc[spec.label] = spec.value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Convert newline-separated features to PostgreSQL array
      const featuresArray = productData.features
        ? productData.features.split('\n').filter(f => f.trim() !== '')
        : null;

      // Convert newline-separated applications to PostgreSQL array
      const applicationsArray = productData.applications
        ? productData.applications.split('\n').filter(a => a.trim() !== '')
        : null;

      const updateData: any = {
        name: productData.name,
        sku: productData.sku || null,
        hs_code: productData.hs_code || null,
        product_line: productData.product_line || null,
        category: productData.category,
        description: productData.description || null,
        price: productData.price ? parseFloat(productData.price) : null,
        currency: productData.currency,
        status: productData.status,
        features: featuresArray,
        applications: applicationsArray,
        specifications: Object.keys(specificationsObject).length > 0 ? specificationsObject : null,
        datasheet_url: productData.datasheet_url || null,
        manual_url: productData.manual_url || null,
        brochure_url: productData.brochure_url || null,
        image_url: newImageUrl || null,
        updated_at: new Date().toISOString(),
      };

      // Add image_path if a new image was uploaded
      if (newImagePath) {
        updateData.image_path = newImagePath;
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Clean up object URLs
      pendingFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
      setPendingFiles([]);

      const imageCount = pendingFiles.length;
      toast.success(`Product updated${imageCount > 0 ? ` with ${imageCount} new image${imageCount !== 1 ? 's' : ''}` : ''}`);
      setHasUnsavedChanges(false);
      navigate('/admin/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      navigate('/admin/products');
    }
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    navigate('/admin/products');
  };

  const getProductImage = (): string => {
    if (!product) return visumPalmImage;
    return product.thumbnail_url || product.image_url || defaultImages[product.category] || visumPalmImage;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-600">Product not found</p>
        <Button onClick={() => navigate('/admin/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin/products">Products</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Product</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Edit Product</h1>
          <p className="text-[16px] text-[#6b7280]">{productData.name}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-[#00a8b5] hover:bg-[#008a95]"
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">Basic Information</h2>

              <div className="space-y-2">
                <Label htmlFor="productName">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="productName"
                  value={productData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={productData.sku}
                    onChange={(e) => handleFieldChange('sku', e.target.value)}
                    placeholder="e.g. VP-NIR-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hs_code">HS Code</Label>
                  <Input
                    id="hs_code"
                    value={productData.hs_code}
                    onChange={(e) => handleFieldChange('hs_code', e.target.value)}
                    placeholder="e.g. 9027.50.00"
                  />
                  <p className="text-xs text-muted-foreground">For customs and tariff checks</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productLine">Product Line</Label>
                <Input
                  id="productLine"
                  value={productData.product_line}
                  onChange={(e) => handleFieldChange('product_line', e.target.value)}
                  placeholder="e.g., Visum Series"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Technology Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={productData.category}
                  onValueChange={(value) => handleFieldChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIR / FT-NIR Spectroscopy">NIR / FT-NIR Spectroscopy</SelectItem>
                    <SelectItem value="Raman Spectroscopy">Raman Spectroscopy</SelectItem>
                    <SelectItem value="Hyperspectral Imaging">Hyperspectral Imaging</SelectItem>
                    <SelectItem value="UV-Vis Spectroscopy">UV-Vis Spectroscopy</SelectItem>
                    <SelectItem value="Spare Parts">Spare Parts</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={productData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Enter product description"
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Image */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">Product Image</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-[14px] text-slate-700 mb-3">Current Image:</p>
                  <div className="w-48 h-48 bg-slate-100 rounded-lg border-2 border-slate-200 flex items-center justify-center p-4">
                    <ImageWithFallback
                      src={getProductImage()}
                      alt={product.name}
                      fallbackSrc={defaultImages[product.category] || visumPalmImage}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Batch Upload Zone */}
                <div className="space-y-3">
                  <Label>Upload New Images</Label>
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-[#00a8b5] transition-colors cursor-pointer"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        const newFiles: PendingFile[] = Array.from(files)
                          .filter(f => f.type.startsWith('image/'))
                          .map(file => ({
                            file,
                            name: extractTitleFromFilename(file.name),
                            preview: URL.createObjectURL(file)
                          }));
                        setPendingFiles(prev => [...prev, ...newFiles]);
                        setHasUnsavedChanges(true);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-10 w-10 text-slate-400" />
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBatchFileChange}
                        className="max-w-xs"
                      />
                      <p className="text-[13px] text-[#6b7280]">
                        Select multiple images or drag & drop (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pending files queue */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{pendingFiles.length} image{pendingFiles.length !== 1 ? 's' : ''} ready to upload</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          pendingFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
                          setPendingFiles([]);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {pendingFiles.map((pf, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                          {pf.preview && (
                            <img src={pf.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <Input
                              value={pf.name}
                              onChange={(e) => updatePendingFileName(idx, e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Image title"
                            />
                            <p className="text-xs text-slate-500 truncate mt-1">{pf.file.name}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePendingFile(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload progress bar */}
                {uploadProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading images...</span>
                      <span>{uploadProgress.current} of {uploadProgress.total}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00a8b5] transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="image-url">Product Image URL</Label>
                  <Input
                    id="image-url"
                    type="url"
                    value={productData.image_url}
                    onChange={(e) => handleFieldChange('image_url', e.target.value)}
                    placeholder="https://example.com/product.jpg"
                  />
                  <p className="text-[12px] text-[#6b7280]">
                    Or enter a URL to an image hosted online
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-slate-900">
                  Technical Specifications
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSpecification}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Spec
                </Button>
              </div>

              <div className="space-y-3">
                {specifications.map((spec) => (
                  <div key={spec.id} className="flex gap-3">
                    <Input
                      placeholder="Specification name"
                      value={spec.label}
                      onChange={(e) => updateSpecification(spec.id, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={spec.value}
                      onChange={(e) => updateSpecification(spec.id, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpecification(spec.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {specifications.length === 0 && (
                  <p className="text-[14px] text-slate-500 text-center py-4">
                    No specifications added yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">Key Features</h2>

              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={productData.features}
                  onChange={(e) => handleFieldChange('features', e.target.value)}
                  placeholder="Enter each feature on a new line"
                  className="min-h-[120px]"
                />
                <p className="text-[12px] text-[#6b7280]">
                  Enter each feature on a separate line
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Applications */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">Applications</h2>

              <div className="space-y-2">
                <Label htmlFor="applications">Target Applications (one per line)</Label>
                <Textarea
                  id="applications"
                  value={productData.applications}
                  onChange={(e) => handleFieldChange('applications', e.target.value)}
                  placeholder="Pharmaceutical\nFood & Beverage\nChemical"
                  className="min-h-[120px]"
                />
                <p className="text-[12px] text-[#6b7280]">
                  Enter each application/industry on a separate line
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Related Content - NOW WITH ACTUAL URL INPUTS! */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">
                Related Content
              </h2>

              <p className="text-[14px] text-slate-600">
                Add URLs to technical documents, marketing materials, and training resources
              </p>

              <div className="space-y-4">
                {/* Technical Documents */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <Label className="text-[15px] font-medium text-slate-900">
                    Technical Documents
                  </Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="datasheet" className="text-sm">Datasheet URL</Label>
                    <Input
                      id="datasheet"
                      type="url"
                      value={productData.datasheet_url}
                      onChange={(e) => handleFieldChange('datasheet_url', e.target.value)}
                      placeholder="https://example.com/datasheet.pdf"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual" className="text-sm">User Manual URL</Label>
                    <Input
                      id="manual"
                      type="url"
                      value={productData.manual_url}
                      onChange={(e) => handleFieldChange('manual_url', e.target.value)}
                      placeholder="https://example.com/manual.pdf"
                    />
                  </div>
                </div>

                {/* Marketing Materials */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <Label className="text-[15px] font-medium text-slate-900">
                    Marketing Materials
                  </Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="brochure" className="text-sm">Product Brochure URL</Label>
                    <Input
                      id="brochure"
                      type="url"
                      value={productData.brochure_url}
                      onChange={(e) => handleFieldChange('brochure_url', e.target.value)}
                      placeholder="https://example.com/brochure.pdf"
                    />
                  </div>
                </div>

                {/* Training Resources - Placeholder */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <Label className="text-[15px] font-medium text-slate-900">
                    Training Resources
                  </Label>
                  <p className="text-sm text-slate-500">
                    Training video URLs will be available in future updates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing Assets Section */}
          <MarketingAssetsSection 
            productName={product.name}
            productId={product.id}
          />
          {/* Publication Status */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">Publication Status</h2>

              <div className="space-y-3">
                <Label>
                  Status <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={productData.status}
                  onValueChange={(value) => handleFieldChange('status', value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="published" id="published" />
                    <Label htmlFor="published" className="font-normal cursor-pointer">
                      Published (visible to all distributors)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active" className="font-normal cursor-pointer">
                      Active (visible to distributors)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="draft" id="draft" />
                    <Label htmlFor="draft" className="font-normal cursor-pointer">
                      Draft (only visible to admins)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="archived" id="archived" />
                    <Label htmlFor="archived" className="font-normal cursor-pointer">
                      Archived (hidden from distributors)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Analytics */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 sticky top-6">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-slate-900">Product Analytics</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Eye className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-slate-900">{product.views}</p>
                    <p className="text-[13px] text-slate-600">Views</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Download className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-slate-900">{product.downloads}</p>
                    <p className="text-[13px] text-slate-600">Downloads</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-600">Last updated:</span>
                    <span className="text-slate-900">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-600">Created:</span>
                    <span className="text-slate-900">
                      {new Date(product.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 p-4 z-20">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-[#00a8b5] hover:bg-[#008a95]"
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Page</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
