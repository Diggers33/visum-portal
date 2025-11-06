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
  ExternalLink
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
    'NIR Spectroscopy',
    'Raman Spectroscopy',
    'Hyperspectral Imaging'
  ]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    product_line: 'NIR Spectroscopy',
    description: '',
    price: '',
    currency: 'EUR',
    status: 'draft' as 'draft' | 'published',
    datasheet_url: '',
    manual_url: '',
    brochure_url: '',
    image_url: '',
    // Marketing assets
    product_images: [''],
    case_study_url: '',
    whitepaper_url: '',
    presentation_url: '',
    video_url: '',
    demo_video_url: '',
    social_image_url: '',
    press_release_url: '',
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
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
    if (!newProduct.name || !newProduct.price) {
      toast.error('Please fill in required fields');
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

    startTransition(async () => {
      const { data, error } = await createProduct({
        name: newProduct.name,
        product_line: newProduct.product_line,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        currency: newProduct.currency,
        status: newProduct.status,
        image: productImage || undefined,
        datasheet_url: newProduct.datasheet_url || undefined,
        manual_url: newProduct.manual_url || undefined,
        brochure_url: newProduct.brochure_url || undefined,
        image_url: newProduct.image_url || undefined,
        // Marketing assets
        product_images: newProduct.product_images.filter(img => img.trim() !== ''),
        case_study_url: newProduct.case_study_url || undefined,
        whitepaper_url: newProduct.whitepaper_url || undefined,
        presentation_url: newProduct.presentation_url || undefined,
        video_url: newProduct.video_url || undefined,
        demo_video_url: newProduct.demo_video_url || undefined,
        social_image_url: newProduct.social_image_url || undefined,
        press_release_url: newProduct.press_release_url || undefined,
      });

      if (error) {
        toast.error('Failed to create product');
        console.error(error);
      } else {
        toast.success('Product created successfully');
        
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
    });
  };

  const resetNewProductForm = () => {
    setNewProduct({
      name: '',
      product_line: 'NIR Spectroscopy',
      description: '',
      price: '',
      currency: 'EUR',
      status: 'draft',
      datasheet_url: '',
      manual_url: '',
      brochure_url: '',
      image_url: '',
      product_images: [''],
      case_study_url: '',
      whitepaper_url: '',
      presentation_url: '',
      video_url: '',
      demo_video_url: '',
      social_image_url: '',
      press_release_url: '',
    });
    setProductImage(null);
    setImagePreview('');
    setCurrentStep(1);
    setShowTechnicalDocs(false);
    setShowMarketingMaterials(false);
    setShowTrainingVideos(false);
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Step {currentStep} of 4: {
                    currentStep === 1 ? 'Basic Information' :
                    currentStep === 2 ? 'Pricing & Availability' :
                    currentStep === 3 ? 'Media & Assets' :
                    'Related Content'
                  }
                </DialogDescription>
              </DialogHeader>

              <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value))} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="1">Basic</TabsTrigger>
                  <TabsTrigger value="2">Pricing</TabsTrigger>
                  <TabsTrigger value="3">Media</TabsTrigger>
                  <TabsTrigger value="4">Content</TabsTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="product-line">Product Line *</Label>
                    <Select
                      value={newProduct.product_line}
                      onValueChange={(value) => setNewProduct({ ...newProduct, product_line: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIR Spectroscopy">NIR Spectroscopy</SelectItem>
                        <SelectItem value="Raman Spectroscopy">Raman Spectroscopy</SelectItem>
                        <SelectItem value="Hyperspectral Imaging">Hyperspectral Imaging</SelectItem>
                        <SelectItem value="UV-Vis Spectroscopy">UV-Vis Spectroscopy</SelectItem>
                        <SelectItem value="FTIR Spectroscopy">FTIR Spectroscopy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed product description..."
                      rows={4}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="2" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="24500"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={newProduct.currency}
                        onValueChange={(value) => setNewProduct({ ...newProduct, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Initial Status</Label>
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

                <TabsContent value="3" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Product Image</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6">
                      <div className="flex flex-col items-center gap-3">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="max-h-48 rounded" />
                        ) : (
                          <Upload className="h-12 w-12 text-slate-400" />
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="max-w-xs"
                        />
                        <p className="text-[13px] text-[#6b7280]">
                          Upload product image (JPG, PNG, WebP)
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="4" className="space-y-4 mt-4">
                  <p className="text-[13px] text-[#6b7280]">Link related content to this product (optional)</p>
                  
                  <div className="space-y-4">
                    {/* Technical Documents */}
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowTechnicalDocs(!showTechnicalDocs)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Technical Documents
                      </Button>
                      
                      {showTechnicalDocs && (
                        <div className="pl-4 space-y-3 border-l-2 border-[#00a8b5]">
                          <div className="space-y-2">
                            <Label htmlFor="datasheet-url" className="text-sm">Datasheet URL</Label>
                            <Input
                              id="datasheet-url"
                              type="url"
                              placeholder="https://example.com/datasheet.pdf"
                              value={newProduct.datasheet_url}
                              onChange={(e) => setNewProduct({ ...newProduct, datasheet_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-url" className="text-sm">User Manual URL</Label>
                            <Input
                              id="manual-url"
                              type="url"
                              placeholder="https://example.com/manual.pdf"
                              value={newProduct.manual_url}
                              onChange={(e) => setNewProduct({ ...newProduct, manual_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="whitepaper-url" className="text-sm">White Paper URL</Label>
                            <Input
                              id="whitepaper-url"
                              type="url"
                              placeholder="https://example.com/whitepaper.pdf"
                              value={newProduct.whitepaper_url}
                              onChange={(e) => setNewProduct({ ...newProduct, whitepaper_url: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Marketing Materials - EXPANDED */}
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowMarketingMaterials(!showMarketingMaterials)}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Marketing Materials
                      </Button>
                      
                      {showMarketingMaterials && (
                        <div className="pl-4 space-y-4 border-l-2 border-[#00a8b5]">
                          <div className="space-y-2">
                            <Label htmlFor="brochure-url" className="text-sm">Product Brochure URL</Label>
                            <Input
                              id="brochure-url"
                              type="url"
                              placeholder="https://example.com/brochure.pdf"
                              value={newProduct.brochure_url}
                              onChange={(e) => setNewProduct({ ...newProduct, brochure_url: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Product Images (Gallery)</Label>
                            {newProduct.product_images.map((img, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  type="url"
                                  placeholder="https://example.com/product-image.jpg"
                                  value={img}
                                  onChange={(e) => updateProductImageUrl(idx, e.target.value)}
                                />
                                {newProduct.product_images.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeProductImageUrl(idx)}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addProductImageUrl}
                              className="w-full"
                            >
                              <Plus className="mr-2 h-3 w-3" />
                              Add Image URL
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="case-study-url" className="text-sm">Case Study URL</Label>
                            <Input
                              id="case-study-url"
                              type="url"
                              placeholder="https://example.com/case-study.pdf"
                              value={newProduct.case_study_url}
                              onChange={(e) => setNewProduct({ ...newProduct, case_study_url: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="presentation-url" className="text-sm">Product Presentation URL</Label>
                            <Input
                              id="presentation-url"
                              type="url"
                              placeholder="https://example.com/presentation.pptx"
                              value={newProduct.presentation_url}
                              onChange={(e) => setNewProduct({ ...newProduct, presentation_url: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="social-image-url" className="text-sm">Social Media Image URL</Label>
                            <Input
                              id="social-image-url"
                              type="url"
                              placeholder="https://example.com/social-image.jpg"
                              value={newProduct.social_image_url}
                              onChange={(e) => setNewProduct({ ...newProduct, social_image_url: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="press-release-url" className="text-sm">Press Release URL</Label>
                            <Input
                              id="press-release-url"
                              type="url"
                              placeholder="https://example.com/press-release.pdf"
                              value={newProduct.press_release_url}
                              onChange={(e) => setNewProduct({ ...newProduct, press_release_url: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Training Videos */}
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowTrainingVideos(!showTrainingVideos)}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Training & Demo Videos
                      </Button>
                      
                      {showTrainingVideos && (
                        <div className="pl-4 space-y-3 border-l-2 border-[#00a8b5]">
                          <div className="space-y-2">
                            <Label htmlFor="video-url" className="text-sm">Product Video URL</Label>
                            <Input
                              id="video-url"
                              type="url"
                              placeholder="https://youtube.com/watch?v=..."
                              value={newProduct.video_url}
                              onChange={(e) => setNewProduct({ ...newProduct, video_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="demo-video-url" className="text-sm">Demo Video URL</Label>
                            <Input
                              id="demo-video-url"
                              type="url"
                              placeholder="https://youtube.com/watch?v=..."
                              value={newProduct.demo_video_url}
                              onChange={(e) => setNewProduct({ ...newProduct, demo_video_url: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex gap-2">
                {currentStep > 1 && (
                  <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                    Previous
                  </Button>
                )}
                {currentStep < 4 ? (
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
                {['NIR Spectroscopy', 'Raman Spectroscopy', 'Hyperspectral Imaging'].map((tech) => (
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
