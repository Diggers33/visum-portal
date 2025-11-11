import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft,
  ShoppingCart,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Loader2,
  AlertCircle,
  Package
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useProductResources } from '../hooks/useData';

interface Product {
  id: string;
  name: string;
  product_line: string;
  description: string;
  price: number;
  currency: string;
  status: string;
  image_url?: string;
  datasheet_url?: string;
  manual_url?: string;
  brochure_url?: string;
  product_images?: string[];
  case_study_url?: string;
  whitepaper_url?: string;
  presentation_url?: string;
  video_url?: string;
  demo_video_url?: string;
  social_image_url?: string;
  press_release_url?: string;
  views: number;
  downloads: number;
  created_at: string;
  updated_at: string;
}

export default function ProductDetail() {
  const { t, i18n } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  console.log('🔍 ProductDetail component mounted!');
  console.log('🔍 Product ID from URL:', id);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Fetch product resources from database
  const { resources, loading: resourcesLoading } = useProductResources(id);

  useEffect(() => {
    if (id) {
      loadProduct();
      incrementViewCount();
    }
  }, [id, i18n.language]); // Re-fetch when language changes

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        setError('Product not found');
        return;
      }

      // Load translations if user language is not English
      const userLang = localStorage.getItem('i18nextLng') || 'en';
      if (userLang !== 'en') {
        const { data: translations } = await supabase
          .from('content_translations')
          .select('*')
          .eq('content_type', 'product')
          .eq('content_id', id)
          .eq('language_code', userLang);

        if (translations && translations.length > 0) {
          const translatedData: any = {};
          translations.forEach(t => {
            translatedData[t.field_name] = t.translated_text;
          });
          
          // Merge translations with product data
          setProduct({
            ...data,
            name: translatedData.name || data.name,
            description: translatedData.description || data.description,
            short_description: translatedData.short_description || data.short_description
          });
        } else {
          setProduct(data);
        }
      } else {
        setProduct(data);
      }
      
      setSelectedImage(data.image_url || '');
    } catch (err: any) {
      console.error('Error loading product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_product_views', { product_id: id });
    } catch (err) {
      console.error('Error incrementing view count:', err);
    }
  };

  const handleDownload = async (url: string, type: string) => {
    try {
      // Increment download count
      await supabase.rpc('increment_product_downloads', { product_id: id });
      
      // Open in new tab
      window.open(url, '_blank');
      
      toast.success(`${type} downloaded`);
    } catch (err) {
      console.error('Error downloading:', err);
      toast.error('Failed to download');
    }
  };

  const handleAddToQuote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to add to quote');
        return;
      }

      // Add to quote builder (you'll need to implement this table)
      const { error } = await supabase
        .from('quote_items')
        .insert({
          user_id: user.id,
          product_id: product?.id,
          quantity: 1
        });

      if (error) throw error;

      toast.success('Added to quote builder');
    } catch (err) {
      console.error('Error adding to quote:', err);
      toast.error('Failed to add to quote');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return 'Contact for pricing';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    return `Starting at ${formatter.format(price)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-slate-600 mb-6">{error || 'This product does not exist or is no longer available.'}</p>
        <Button onClick={() => navigate('/portal/products')} className="bg-[#00a8b5] hover:bg-[#008a95]">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('buttons.backToProducts')}
        </Button>
      </div>
    );
  }

  // Filter resources by category
  const documentationResources = resources.filter(r =>
    ['datasheet', 'manual', 'brochure'].includes(r.resource_type)
  );
  const marketingResources = resources.filter(r =>
    ['case_study', 'whitepaper', 'presentation', 'press_release', 'social_image', 'demo_video'].includes(r.resource_type)
  );
  const trainingResources = resources.filter(r =>
    ['video', 'training_video'].includes(r.resource_type)
  );

  // Fallback to old product URLs if no resources in database
  const hasTechnicalDocs = documentationResources.length > 0 || product.datasheet_url || product.manual_url || product.brochure_url;
  const hasMarketingAssets = marketingResources.length > 0 || product.case_study_url || product.whitepaper_url || product.presentation_url || product.press_release_url;
  const hasTrainingMaterials = trainingResources.length > 0 || product.video_url || product.demo_video_url;

  // Helper to get icon for resource type
  const getResourceIcon = (resourceType: string) => {
    if (resourceType.includes('video')) return Video;
    if (resourceType === 'presentation') return ImageIcon;
    return FileText;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center text-sm text-slate-600">
            <Link to="/portal" className="hover:text-[#00a8b5]">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/portal/products" className="hover:text-[#00a8b5]">Products</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate('/portal/products')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('buttons.backToProducts')}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Images */}
          <div>
            <Card className="border-slate-200 overflow-hidden mb-4">
              <CardContent className="p-0">
                <div className="aspect-square bg-slate-100 flex items-center justify-center">
                  {selectedImage ? (
                    <ImageWithFallback
                      src={selectedImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-32 w-32 text-slate-300" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Image Thumbnails */}
            {product.product_images && product.product_images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.image_url && (
                  <button
                    onClick={() => setSelectedImage(product.image_url!)}
                    className={`aspect-square border-2 rounded-lg overflow-hidden ${
                      selectedImage === product.image_url ? 'border-[#00a8b5]' : 'border-slate-200'
                    }`}
                  >
                    <ImageWithFallback
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
                {product.product_images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-square border-2 rounded-lg overflow-hidden ${
                      selectedImage === img ? 'border-[#00a8b5]' : 'border-slate-200'
                    }`}
                  >
                    <ImageWithFallback
                      src={img}
                      alt={`${product.name} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Product Info */}
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[#00a8b5] uppercase tracking-wide">
                  {product.product_line}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">{product.name}</h1>
              <p className="text-2xl font-semibold text-slate-900 mb-4">
                {formatPrice(product.price, product.currency)}
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                {product.description || 'No description available'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-slate-500 mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-1">
                <span>{product.views} views</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span>{product.downloads} downloads</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToQuote}
                className="w-full bg-[#00a8b5] hover:bg-[#008a95] text-white"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Quote Builder
              </Button>
              
              {product.datasheet_url && (
                <Button
                  variant="outline"
                  onClick={() => handleDownload(product.datasheet_url!, 'Datasheet')}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Datasheet
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for Additional Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="technical">Technical Specs</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
            <TabsTrigger value="marketing">Marketing Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Product Overview</h2>
                <div className="prose max-w-none">
                  <p className="text-slate-600 leading-relaxed">
                    {product.description || 'No detailed description available.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Technical Specifications</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Product Line</p>
                      <p className="text-base font-medium text-slate-900">{product.product_line}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Technology</p>
                      <p className="text-base font-medium text-slate-900">{product.product_line}</p>
                    </div>
                  </div>
                  
                  {product.datasheet_url && (
                    <div className="pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(product.datasheet_url!, 'Technical Datasheet')}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Download Full Specifications
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentation">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Documentation</h2>

                {resourcesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                  </div>
                ) : hasTechnicalDocs ? (
                  <div className="grid gap-4">
                    {/* Render resources from database */}
                    {documentationResources.map((resource) => {
                      const Icon = getResourceIcon(resource.resource_type);
                      return (
                        <div key={resource.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="h-10 w-10 text-[#00a8b5]" />
                            <div>
                              <h3 className="font-medium text-slate-900">{resource.title}</h3>
                              <p className="text-sm text-slate-500">{resource.description || 'Document'}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(resource.file_url, resource.title)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      );
                    })}

                    {/* Fallback: Render old product URLs if no database resources */}
                    {documentationResources.length === 0 && product.datasheet_url && (
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-10 w-10 text-[#00a8b5]" />
                          <div>
                            <h3 className="font-medium text-slate-900">Product Datasheet</h3>
                            <p className="text-sm text-slate-500">Technical specifications and features</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(product.datasheet_url!, 'Datasheet')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}

                    {documentationResources.length === 0 && product.manual_url && (
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-10 w-10 text-[#00a8b5]" />
                          <div>
                            <h3 className="font-medium text-slate-900">User Manual</h3>
                            <p className="text-sm text-slate-500">Installation and operation guide</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(product.manual_url!, 'Manual')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}

                    {documentationResources.length === 0 && product.brochure_url && (
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-10 w-10 text-[#00a8b5]" />
                          <div>
                            <h3 className="font-medium text-slate-900">Product Brochure</h3>
                            <p className="text-sm text-slate-500">Marketing and product information</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(product.brochure_url!, 'Brochure')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">No documentation available for this product.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Marketing Assets</h2>

                {resourcesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                  </div>
                ) : hasMarketingAssets ? (
                  <div className="grid gap-4">
                    {/* Render resources from database */}
                    {marketingResources.map((resource) => {
                      const Icon = getResourceIcon(resource.resource_type);
                      const isVideo = resource.resource_type.includes('video');

                      return (
                        <div key={resource.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="h-10 w-10 text-[#00a8b5]" />
                            <div>
                              <h3 className="font-medium text-slate-900">{resource.title}</h3>
                              <p className="text-sm text-slate-500">{resource.description || 'Marketing asset'}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => isVideo
                              ? window.open(resource.file_url, '_blank')
                              : handleDownload(resource.file_url, resource.title)
                            }
                          >
                            {isVideo ? (
                              <>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Watch
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}

                    {/* Fallback: Render old product URLs if no database resources */}
                    {marketingResources.length === 0 && product.presentation_url && (
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="h-10 w-10 text-[#00a8b5]" />
                          <div>
                            <h3 className="font-medium text-slate-900">Sales Presentation</h3>
                            <p className="text-sm text-slate-500">PowerPoint deck for customer presentations</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(product.presentation_url!, 'Presentation')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}

                    {marketingResources.length === 0 && product.case_study_url && (
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-10 w-10 text-[#00a8b5]" />
                          <div>
                            <h3 className="font-medium text-slate-900">Case Study</h3>
                            <p className="text-sm text-slate-500">Real-world implementation examples</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(product.case_study_url!, 'Case Study')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}

                    {marketingResources.length === 0 && product.demo_video_url && (
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Video className="h-10 w-10 text-[#00a8b5]" />
                          <div>
                            <h3 className="font-medium text-slate-900">Product Demo Video</h3>
                            <p className="text-sm text-slate-500">See the product in action</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(product.demo_video_url!, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">No marketing assets available for this product.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Related Training Materials */}
        {hasTrainingMaterials && (
          <Card className="border-slate-200 mt-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Training Materials</h2>
              {resourcesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Render resources from database */}
                  {trainingResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Video className="h-10 w-10 text-[#00a8b5]" />
                        <div>
                          <h3 className="font-medium text-slate-900">{resource.title}</h3>
                          <p className="text-sm text-slate-500">{resource.description || 'Training material'}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resource.file_url, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Watch
                      </Button>
                    </div>
                  ))}

                  {/* Fallback: Render old product URL if no database resources */}
                  {trainingResources.length === 0 && product.video_url && (
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Video className="h-10 w-10 text-[#00a8b5]" />
                        <div>
                          <h3 className="font-medium text-slate-900">Training Video</h3>
                          <p className="text-sm text-slate-500">Learn how to use this product</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(product.video_url!, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Watch
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
