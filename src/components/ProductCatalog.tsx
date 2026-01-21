import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  Home,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { supabase } from '../lib/supabase';
import ImageWithFallback from './ImageWithFallback';

// Import fallback images
import visumPalmImage from 'figma:asset/215b8c1c8daeedb44f8accf3bbf4cccf350afc13.png';
import ramanImage from 'figma:asset/af6775da0ad9e0b649beed01dcc3abcea85154c7.png';
import hyperspecImage from 'figma:asset/f1bd5ef18a2205dca276525d60d195ea7415771b.png';

const defaultImages: Record<string, string> = {
  'NIR / FT-NIR Spectroscopy': visumPalmImage,
  'Raman Spectroscopy': ramanImage,
  'Hyperspectral Imaging': hyperspecImage,
};

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  specifications: any;
  features: string | string[] | null;
  applications: string | string[] | null;
  image_url: string | null;
  thumbnail_url: string | null;
  brochure_url: string | null;
  datasheet_url: string | null;
  manual_url: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  product_line: string | null;
  price: number;
  currency: string;
  industries: string[];
}

export default function ProductCatalog() {
  // ============ CRITICAL DEBUG MARKER ============
  console.log('🟢🟢🟢 DESKTOP/BROWSER ProductCatalog.tsx IS RENDERING 🟢🟢🟢');
  console.log('Component: ProductCatalog (NOT MobileProductCatalog)');
  console.log('Location: src/components/ProductCatalog.tsx');
  // ===============================================

  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchProducts();
  }, [i18n.language]); // Re-fetch when language changes

  const fetchProducts = async () => {
    try {
      console.log('📡 ProductCatalog: Fetching products from Supabase...');
      console.log('🌐 Current language:', i18n.language);
      
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('❌ ProductCatalog: Error fetching products:', productsError);
        throw productsError;
      }

      console.log('✅ ProductCatalog: Products fetched:', productsData?.length || 0);

      // If language is English, no need to fetch translations
      if (i18n.language === 'en') {
        setProducts(productsData || []);
        return;
      }

      // Fetch translations for current language
      const productIds = productsData?.map(p => p.id) || [];
      
      if (productIds.length > 0) {
        console.log('🔤 ProductCatalog: Fetching translations for language:', i18n.language);
        
        const { data: translationsData, error: translationsError } = await supabase
          .from('content_translations')
          .select('*')
          .eq('content_type', 'product')
          .eq('language_code', i18n.language)
          .in('content_id', productIds);

        if (translationsError) {
          console.error('⚠️ ProductCatalog: Error fetching translations:', translationsError);
          // Continue with English if translations fail
          setProducts(productsData || []);
          return;
        }

        console.log('✅ ProductCatalog: Translations fetched:', translationsData?.length || 0);

        // Merge translations into products
        const translatedProducts = productsData?.map(product => {
          const productTranslations = translationsData?.filter(
            t => t.content_id === product.id
          ) || [];

          // Create a map of field -> translation
          const translationMap: Record<string, string> = {};
          productTranslations.forEach(t => {
            translationMap[t.field_name] = t.translated_text;
          });

          // Apply translations
          return {
            ...product,
            name: translationMap['name'] || product.name,
            description: translationMap['description'] || product.description,
            // Features translation - handle both array and string formats
            features: (() => {
              // Check if we have translated features
              const translatedFeatures = Object.keys(translationMap)
                .filter(key => key.startsWith('features['))
                .map(key => {
                  const index = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
                  return { index, value: translationMap[key] };
                })
                .sort((a, b) => a.index - b.index)
                .map(item => item.value);

              if (translatedFeatures.length > 0) {
                return translatedFeatures;
              }

              return product.features;
            })()
          };
        }) || [];

        console.log('🌍 ProductCatalog: Products with translations:', {
          total: translatedProducts.length,
          firstProduct: translatedProducts[0] ? {
            id: translatedProducts[0].id,
            name: translatedProducts[0].name,
            hasTranslation: translatedProducts[0].name !== productsData?.[0]?.name
          } : null
        });

        setProducts(translatedProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ ProductCatalog: Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories and industries
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const industries = Array.from(new Set(products.flatMap(p => p.industries || []).filter(Boolean)));

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedIndustries([]);
    setSearchQuery('');
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategories.length === 0 || 
      selectedCategories.includes(product.category);
    
    const matchesIndustry = 
      selectedIndustries.length === 0 || 
      (product.industries && product.industries.some(i => selectedIndustries.includes(i)));
    
    return matchesSearch && matchesCategory && matchesIndustry;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      default:
        return 0;
    }
  });

  console.log('📊 ProductCatalog: Rendering state:', {
    loading,
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    sortedProducts: sortedProducts.length,
    firstProduct: sortedProducts[0]
  });

  const formatPrice = (price: number | null, currency: string = 'EUR') => {
    if (!price) return 'Contact for price';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price);
  };

  const parseFeatures = (features: string | string[] | null) => {
    if (!features) return [];

    // Handle array format (new PostgreSQL format)
    if (Array.isArray(features)) {
      return features.slice(0, 3);
    }

    // Handle string format (old format)
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
      } catch {
        return features.split('\n').filter(f => f.trim()).slice(0, 3);
      }
    }

    return [];
  };

  const getProductImage = (product: Product) => {
    return product.thumbnail_url || product.image_url || null;
  };

  if (loading) {
    console.log('⏳ ProductCatalog: Rendering loading state');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading products...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 ProductCatalog: Rendering main content with', sortedProducts.length, 'products');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center text-[14px] text-slate-600">
            <Link to="/portal" className="hover:text-[#00a8b5] flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>{t('navigation.home')}</span>
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-slate-900 font-medium">{t('navigation.products')}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 mb-3">{t('products.title')}</h1>
          <p className="text-[16px] text-slate-600">
            {t('products.subtitle')} ({sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'})
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder={t('products.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {}}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('products.filters')}
                {(selectedCategories.length + selectedIndustries.length > 0) && (
                  <Badge className="ml-1 bg-[#00a8b5] text-white">
                    {selectedCategories.length + selectedIndustries.length}
                  </Badge>
                )}
              </Button>

              <Separator orientation="vertical" className="h-8" />

              <span className="text-[14px] text-slate-600">{t('products.sortBy')}:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('products.newest')}</SelectItem>
                  <SelectItem value="oldest">{t('products.oldest')}</SelectItem>
                  <SelectItem value="name-asc">{t('products.nameAsc')}</SelectItem>
                  <SelectItem value="name-desc">{t('products.nameDesc')}</SelectItem>
                  <SelectItem value="price-low">{t('products.priceLow')}</SelectItem>
                  <SelectItem value="price-high">{t('products.priceHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(() => {
            console.log('🔄 ProductCatalog: Map function executing with', sortedProducts.length, 'products');
            return sortedProducts.map((product, index) => {
              console.log(`🃏 ProductCatalog: Rendering card ${index + 1}:`, {
                id: product.id,
                name: product.name,
                category: product.category,
                hasImage: !!getProductImage(product),
                price: product.price
              });

              return (
                <Card key={product.id} className="border-slate-200 hover:shadow-lg transition-shadow overflow-hidden group flex flex-col">
                  {/* Product image */}
                  <div className="h-[200px] bg-slate-100 overflow-hidden relative">
                    <ImageWithFallback
                      src={getProductImage(product)}
                      alt={product.name}
                      fallbackSrc={defaultImages[product.category] || visumPalmImage}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Card content */}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[18px] leading-tight mb-2">{product.name}</CardTitle>
                    <Badge variant="outline" className="w-fit text-[12px]">
                      {product.category}
                    </Badge>
                    
                    {/* Pricing */}
                    <p className="text-[20px] font-semibold text-[#1a1a1a] mt-3 mb-2">
                      Starting at {formatPrice(product.price, product.currency)}
                    </p>

                    {/* Short description */}
                    <CardDescription className="text-[14px] line-clamp-1">
                      {product.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-3">
                    {/* Key specs */}
                    {product.features && (
                      <div className="mb-3">
                        <p className="text-[13px] font-medium text-slate-700 mb-2">Key Specs:</p>
                        <div className="space-y-1">
                          {parseFeatures(product.features).map((spec, idx) => (
                            <p key={idx} className="text-[12px] text-slate-600 line-clamp-1">• {spec}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Industry tags */}
                    {product.applications && (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          // Handle both array and string formats
                          const applicationsArray = Array.isArray(product.applications)
                            ? product.applications
                            : product.applications.split('\n').filter(a => a.trim());

                          return applicationsArray.slice(0, 3).map((app, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[11px]">
                              {app.trim()}
                            </Badge>
                          ));
                        })()}
                      </div>
                    )}
                  </CardContent>

                  {/* Card footer */}
                  <CardFooter className="mt-auto pt-3 flex gap-2">
                    <Link to={`/portal/products/${product.id}`} className="flex-1">
                      <Button className="w-full bg-[#00a8b5] hover:bg-[#008a95] text-white">
                        {t('buttons.viewDetails')}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            });
          })()}
        </div>

        {/* Empty state */}
        {sortedProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No products found matching your criteria.</p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
