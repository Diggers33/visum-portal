import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TranslateButton } from './TranslateButton';
import {
  Plus,
  Search,
  Upload,
  Edit,
  Copy,
  Archive,
  Grid,
  List,
  MoreVertical,
  Eye,
  Download,
  Loader2,
  Package,
  FileText,
  Image as ImageIcon,
  Video,
  Presentation,
  ExternalLink,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import {
  fetchProducts,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  createProduct,
  archiveProduct,
  type Product
} from '../../lib/api/products';
import { sendProductNotification } from '../../lib/notificationService';

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

export default function ProductsManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['published']);
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([
    'NIR / FT-NIR Spectroscopy',
    'Raman Spectroscopy',
    'Hyperspectral Imaging',
    'UV-Vis Spectroscopy',
    'Spare Parts',
    'Accessories'
  ]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    hs_code: '',
    product_line: 'NIR / FT-NIR Spectroscopy',
    description: '',
    status: 'draft' as 'draft' | 'published',
    datasheet_url: '',
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Batch upload states
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const [showTechnicalDocs, setShowTechnicalDocs] = useState(false);
  const [showMarketingMaterials, setShowMarketingMaterials] = useState(false);
  const [showTrainingVideos, setShowTrainingVideos] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [selectedStatuses, selectedTechnologies]);

  const loadProducts = async () => {
    setIsLoading(true);
    const { data, error } = await fetchProducts({
      status: selectedStatuses,
      product_line: selectedTechnologies,
    });

    if (error) {
      toast.error('Failed to load products');
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    const product = products.find((p) => p.id === productId);
    const oldStatus = product?.status;
    
    // If changing TO published (not FROM published), ask about notification
    if (newStatus === 'published' && oldStatus !== 'published') {
      const shouldNotify = window.confirm(
        `Publish "${product?.name}" and send notification to distributors?\n\n` +
        `Click OK to publish and notify distributors.\n` +
        `Click Cancel to publish without notification.`
      );
      
      // Update status optimistically
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: newStatus as any } : p))
      );
      
      startTransition(async () => {
        const { error } = await updateProduct(productId, { status: newStatus as any });
        
        if (error) {
          toast.error('Failed to update status');
          loadProducts();
          return;
        }
        
        toast.success(`Product published`);
        
        // Send notification if user confirmed
        if (shouldNotify && product) {
          try {
            await sendProductNotification({
              id: product.id,
              name: product.name,
              category: product.product_line || 'Product',
              description: product.description || '',
              image_url: product.image_url
            });
          } catch (notificationError) {
            console.error('Notification error:', notificationError);
            // Don't fail the publish if notification fails
          }
        }
      });
    } else {
      // For other status changes, just update normally
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: newStatus as any } : p))
      );
      
      startTransition(async () => {
        const { error } = await updateProduct(productId, { status: newStatus as any });
        
        if (error) {
          toast.error('Failed to update status');
          loadProducts();
        } else {
          toast.success(`Product ${newStatus === 'draft' ? 'saved as draft' : 'archived'}`);
        }
      });
    }
  };

  const handleArchive = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    
    startTransition(async () => {
      const { error } = await archiveProduct(productId);
      
      if (error) {
        toast.error('Failed to archive product');
        loadProducts();
      } else {
        toast.success(`${product?.name} archived`);
      }
    });
  };

  const handleDuplicate = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    
    startTransition(async () => {
      const { data, error } = await duplicateProduct(productId);
      
      if (error) {
        toast.error('Failed to duplicate product');
      } else {
        toast.success(`${product?.name} duplicated`);
        loadProducts();
      }
    });
  };

  const handleDelete = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    
    if (!confirm(`Are you sure you want to permanently delete "${product?.name}"?`)) {
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    
    startTransition(async () => {
      const { error } = await deleteProduct(productId);
      
      if (error) {
        toast.error('Failed to delete product');
        loadProducts();
      } else {
        toast.success(`${product?.name} deleted`);
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const addProductImageUrl = () => {
    setNewProduct({
      ...newProduct,
      product_images: [...newProduct.product_images, '']
    });
  };

  const updateProductImageUrl = (index: number, value: string) => {
    const newImages = [...newProduct.product_images];
    newImages[index] = value;
    setNewProduct({ ...newProduct, product_images: newImages });
  };

  const removeProductImageUrl = (index: number) => {
    const newImages = newProduct.product_images.filter((_, i) => i !== index);
    setNewProduct({ ...newProduct, product_images: newImages });
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) {
      toast.error('Please enter a product name');
      return;
    }

    // Ask about notification if publishing
    let shouldNotify = false;
    if (newProduct.status === 'published') {
      shouldNotify = window.confirm(
        `Publish "${newProduct.name}" and send notification to distributors?\n\n` +
        `Click OK to publish and notify distributors.\n` +
        `Click Cancel to publish without notification.`
      );
    }

    // Use first pending file as main product image if available
    const mainImage = pendingFiles.length > 0 ? pendingFiles[0].file : productImage;

    // Show progress if there are pending files
    if (pendingFiles.length > 0) {
      setUploadProgress({ current: 0, total: pendingFiles.length });
    }

    startTransition(async () => {
      try {
        // Update progress for first image upload
        if (pendingFiles.length > 0) {
          setUploadProgress({ current: 1, total: pendingFiles.length });
        }

        const { data, error } = await createProduct({
          name: newProduct.name,
          sku: newProduct.sku || undefined,
          hs_code: newProduct.hs_code || undefined,
          product_line: newProduct.product_line,
          description: newProduct.description,
          status: newProduct.status,
          image: mainImage || undefined,
        });

        if (error) {
          toast.error('Failed to create product');
          console.error(error);
          setUploadProgress(null);
        } else {
          const imageCount = pendingFiles.length || (productImage ? 1 : 0);
          toast.success(`Product created${imageCount > 0 ? ` with ${imageCount} image${imageCount !== 1 ? 's' : ''}` : ''}`);

          // Send notification if user confirmed and product was published
          if (shouldNotify && data) {
            try {
              await sendProductNotification({
                id: data.id,
                name: newProduct.name,
                category: newProduct.product_line,
                description: newProduct.description,
                image_url: newProduct.image_url
              });
            } catch (notificationError) {
              console.error('Notification error:', notificationError);
              // Don't fail the creation if notification fails
            }
          }

          setIsAddDialogOpen(false);
          resetNewProductForm();
          loadProducts();
        }
      } finally {
        setUploadProgress(null);
      }
    });
  };

  const resetNewProductForm = () => {
    setNewProduct({
      name: '',
      sku: '',
      hs_code: '',
      product_line: 'NIR / FT-NIR Spectroscopy',
      description: '',
      status: 'draft',
      datasheet_url: '',
    });
    setProductImage(null);
    setImagePreview('');
    // Clear pending files and revoke object URLs
    pendingFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    setPendingFiles([]);
    setUploadProgress(null);
    setCurrentStep(1);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleTechnology = (tech: string) => {
    setSelectedTechnologies((prev) =>
      prev.includes(tech)
        ? prev.filter((t) => t !== tech)
        : [...prev, tech]
    );
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_line.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Products</h1>
        <p className="text-[16px] text-[#6b7280]">Manage your product catalog</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00a8b5] hover:bg-[#008a95] text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Step {currentStep} of 2: {currentStep === 1 ? 'Basic Information' : 'Media & Files'}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value))} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="1">Basic Info</TabsTrigger>
                  <TabsTrigger value="2">Media</TabsTrigger>
                </TabsList>

                <TabsContent value="1" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Product Name *</Label>
                    <Input
                      id="product-name"
                      placeholder="e.g. Visum Palm NIR Analyzer"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        placeholder="e.g. VP-NIR-001"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hs-code">HS Code</Label>
                      <Input
                        id="hs-code"
                        placeholder="e.g. 9027.50.00"
                        value={newProduct.hs_code}
                        onChange={(e) => setNewProduct({ ...newProduct, hs_code: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">For customs and tariff checks</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-line">Technology Category *</Label>
                    <Select
                      value={newProduct.product_line}
                      onValueChange={(value) => setNewProduct({ ...newProduct, product_line: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief product description..."
                      rows={3}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newProduct.status}
                      onValueChange={(value: 'draft' | 'published') => setNewProduct({ ...newProduct, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="2" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Product Image (optional)</Label>
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
                          Drag & drop or select images (JPG, PNG, WebP)
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
                              <p className="text-sm truncate">{pf.file.name}</p>
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
                        <span>Uploading...</span>
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
                    <Label htmlFor="datasheet-url">Datasheet URL (optional)</Label>
                    <Input
                      id="datasheet-url"
                      type="url"
                      placeholder="https://example.com/datasheet.pdf"
                      value={newProduct.datasheet_url}
                      onChange={(e) => setNewProduct({ ...newProduct, datasheet_url: e.target.value })}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex gap-2">
                {currentStep > 1 && (
                  <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                    Previous
                  </Button>
                )}
                {currentStep < 2 ? (
                  <Button onClick={() => setCurrentStep(currentStep + 1)} className="bg-[#00a8b5] hover:bg-[#008a95]">
                    Next
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewProduct({ ...newProduct, status: 'draft' });
                        handleAddProduct();
                      }}
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save as Draft
                    </Button>
                    <Button
                      onClick={() => {
                        setNewProduct({ ...newProduct, status: 'published' });
                        handleAddProduct();
                      }}
                      className="bg-[#00a8b5] hover:bg-[#008a95]"
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Publish Product
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <Card className="w-64 h-fit border-slate-200 hidden lg:block">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Technology</h3>
              <div className="space-y-2">
                {['NIR / FT-NIR Spectroscopy', 'Raman Spectroscopy', 'Hyperspectral Imaging', 'UV-Vis Spectroscopy', 'Spare Parts', 'Accessories'].map((tech) => (
                  <div key={tech} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tech-${tech}`}
                      checked={selectedTechnologies.includes(tech)}
                      onCheckedChange={() => toggleTechnology(tech)}
                    />
                    <Label htmlFor={`tech-${tech}`} className="text-[13px] font-normal cursor-pointer">
                      {tech}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Status</h3>
              <div className="space-y-2">
                {[
                  { value: 'published', label: 'Published' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'archived', label: 'Archived' }
                ].map((status) => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={selectedStatuses.includes(status.value)}
                      onCheckedChange={() => toggleStatus(status.value)}
                    />
                    <Label htmlFor={`status-${status.value}`} className="text-[13px] font-normal cursor-pointer">
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-[#6b7280] text-lg mb-2">No products found</p>
              <p className="text-[#6b7280] text-sm">Try adjusting your filters or add a new product</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-[4/3] relative bg-slate-100">
                    {product.image_url ? (
                      <ImageWithFallback
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="h-16 w-16" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Select
                        value={product.status}
                        onValueChange={(value) => handleStatusChange(product.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-[12px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-900 mb-1">{product.name}</h3>
                    <p className="text-[13px] text-[#6b7280] mb-3">
                      {formatPrice(product.price, product.currency)}
                    </p>
                    
                    <div className="flex items-center gap-4 text-[12px] text-[#6b7280] mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{product.views} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        <span>{product.downloads} downloads</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-[13px]"
                        onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <TranslateButton
                        contentType="product"
                        contentId={product.id}
                        sourceData={{
                          name: product.name,
                          description: product.description,
                          short_description: product.short_description || '',
                          features: product.features || []
                        }}
                        onTranslationComplete={() => {
                          console.log('Translation completed for product:', product.id);
                        }}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchive(product.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
