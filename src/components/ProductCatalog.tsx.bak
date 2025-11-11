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
  'NIR Spectroscopy': visumPalmImage,
  'Raman Spectroscopy': ramanImage,
  'Hyperspectral Imaging': hyperspecImage,
};

interface Product {
  id: string; // UUID from database
  name: string;
  sku: string | null;
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

export default function ProductCatalog() {
  const { t, i18n } = useTranslation('common');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');

  // Load products from database
  useEffect(() => {
    fetchProducts();
  }, [i18n.language]); // Re-fetch when language changes

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .in('status', ['active', 'published'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Load translations if user language is not English
      const userLang = localStorage.getItem('i18nextLng') || 'en';
      if (userLang !== 'en' && data && data.length > 0) {
        const productIds = data.map(p => p.id);
        const { data: translations } = await supabase
          .from('content_translations')
          .select('*')
          .eq('content_type', 'product')
          .in('content_id', productIds)
          .eq('language_code', userLang);

        // Merge translations with products
        const productsWithTranslations = data.map(product => {
          const productTranslations = translations?.filter(t => t.content_id === product.id) || [];
          const translatedData: any = {};
          productTranslations.forEach(t => {
            translatedData[t.field_name] = t.translated_text;
          });
          return {
            ...product,
            name: translatedData.name || product.name,
            description: translatedData.description || product.description,
            short_description: translatedData.short_description || product.short_description
          };
        });
        setProducts(productsWithTranslations);
      } else {
        setProducts(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Set document title
  useEffect(() => {
    document.title = 'Product Catalog - Visum Portal';
    return () => {
      document.title = 'Visum Portal';
    };
  }, []);

  // Extract unique values for filters
  const technologies = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  
  // Extract industries from applications field
  const allIndustries = products
    .map(p => p.applications)
    .filter(Boolean)
    .join(',')
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);
  const industries = Array.from(new Set(allIndustries)).sort();
  
  const series = Array.from(new Set(products.map(p => p.product_line).filter(Boolean))).sort();

  // Helper functions
  const handleTechnologyToggle = (tech: string) => {
    setSelectedTechnologies(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  const handleSeriesToggle = (s: string) => {
    setSelectedSeries(prev =>
      prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
    );
  };

  const handlePriceRangeToggle = (range: string) => {
    setSelectedPriceRanges(prev =>
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const clearAllFilters = () => {
    setSelectedTechnologies([]);
    setSelectedIndustries([]);
    setSelectedSeries([]);
    setSelectedPriceRanges([]);
    setSearchQuery('');
  };

  const getPriceRange = (price: number | null): string => {
    if (!price) return '';
    if (price < 10000) return 'under-10k';
    if (price <= 50000) return '10k-50k';
    return 'over-50k';
  };

  const getPriceRangeLabel = (range: string) => {
    if (range === 'under-10k') return 'Under €10K';
    if (range === '10k-50k') return '€10K - €50K';
    if (range === 'over-50k') return 'Over €50K';
    return range;
  };

  const formatPrice = (price: number | null, currency: string): string => {
    if (!price) return 'Contact for pricing';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getProductImage = (product: Product): string => {
    return product.thumbnail_url || product.image_url || defaultImages[product.category] || visumPalmImage;
  };

  const parseFeatures = (features: string | null): string[] => {
    if (!features) return [];
    return features
      .split(/[\n,]/)
      .map(f => f.trim())
      .filter(f => f.length > 0)
      .slice(0, 3); // First 3 for card display
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesTech = selectedTechnologies.length === 0 || selectedTechnologies.includes(product.category);
    
    const matchesIndustry = selectedIndustries.length === 0 || 
      (product.applications && selectedIndustries.some(ind => 
        product.applications?.toLowerCase().includes(ind.toLowerCase())
      ));
    
    const matchesSeries = selectedSeries.length === 0 || 
      (product.product_line && selectedSeries.includes(product.product_line));
    
    const productPriceRange = getPriceRange(product.price);
    const matchesPriceRange = selectedPriceRanges.length === 0 || 
      selectedPriceRanges.includes(productPriceRange);
    
    return matchesSearch && matchesTech && matchesIndustry && matchesSeries && matchesPriceRange;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    // newest (default)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Calculate filter counts
  const getTechCount = (tech: string) => products.filter(p => p.category === tech).length;
  const getIndustryCount = (industry: string) => 
    products.filter(p => p.applications?.toLowerCase().includes(industry.toLowerCase())).length;
  const getSeriesCount = (s: string) => products.filter(p => p.product_line === s).length;
  const getPriceRangeCount = (range: string) => 
    products.filter(p => getPriceRange(p.price) === range).length;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchProducts} className="bg-[#00a8b5] hover:bg-[#008a95]">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#6b7280] mb-4">
        <Link to="/portal" className="hover:text-[#00a8b5] flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900">Products</span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('products.title')}</h1>
        <p className="text-slate-600">{t('products.subtitle')}</p>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        <aside className="w-64 flex-shrink-0">
          <Card className="border-slate-200 sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[18px]">
                <SlidersHorizontal className="h-5 w-5" />
                {t('common.filters')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Technology filter */}
              <div>
                <h4 className="text-[14px] font-semibold text-slate-900 mb-3">{t('products.technology')}</h4>
                <div className="space-y-2">
                  {technologies.map(tech => (
                    <div key={tech} className="flex items-center space-x-2">
                      <Checkbox
                        id={tech}
                        checked={selectedTechnologies.includes(tech)}
                        onCheckedChange={() => handleTechnologyToggle(tech)}
                      />
                      <Label htmlFor={tech} className="text-[14px] text-slate-700 cursor-pointer flex-1">
                        {t(`productCategories.${tech}`, tech)}
                      </Label>
                      <span className="text-[13px] text-[#9ca3af]">({getTechCount(tech)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {industries.length > 0 && (
                <>
                  <Separator />
                  {/* Industry filter */}
                  <div>
                    <h4 className="text-[14px] font-semibold text-slate-900 mb-3">{t('products.industry')}</h4>
                    <div className="space-y-2">
                      {industries.slice(0, 6).map(industry => (
                        <div key={industry} className="flex items-center space-x-2">
                          <Checkbox
                            id={industry}
                            checked={selectedIndustries.includes(industry)}
                            onCheckedChange={() => handleIndustryToggle(industry)}
                          />
                          <Label htmlFor={industry} className="text-[14px] text-slate-700 cursor-pointer flex-1">
                            {industry}
                          </Label>
                          <span className="text-[13px] text-[#9ca3af]">({getIndustryCount(industry)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {series.length > 0 && (
                <>
                  <Separator />
                  {/* Product line filter */}
                  <div>
                    <h4 className="text-[14px] font-semibold text-slate-900 mb-3">{t('products.series')}</h4>
                    <div className="space-y-2">
                      {series.map(s => (
                        <div key={s} className="flex items-center space-x-2">
                          <Checkbox
                            id={s}
                            checked={selectedSeries.includes(s)}
                            onCheckedChange={() => handleSeriesToggle(s)}
                          />
                          <Label htmlFor={s} className="text-[14px] text-slate-700 cursor-pointer flex-1">
                            {t(`productCategories.${s} Series`, `${s} Series`)}
                          </Label>
                          <span className="text-[13px] text-[#9ca3af]">({getSeriesCount(s)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Price Range filter */}
              <div>
                <h4 className="text-[14px] font-semibold text-slate-900 mb-3">{t('products.priceRange')}</h4>
                <div className="space-y-2">
                  {['under-10k', '10k-50k', 'over-50k'].map(range => (
                    <div key={range} className="flex items-center space-x-2">
                      <Checkbox
                        id={range}
                        checked={selectedPriceRanges.includes(range)}
                        onCheckedChange={() => handlePriceRangeToggle(range)}
                      />
                      <Label htmlFor={range} className="text-[14px] text-slate-700 cursor-pointer flex-1">
                        {getPriceRangeLabel(range)}
                      </Label>
                      <span className="text-[13px] text-[#9ca3af]">({getPriceRangeCount(range)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {(selectedTechnologies.length > 0 || selectedIndustries.length > 0 || 
                selectedSeries.length > 0 || selectedPriceRanges.length > 0) && (
                <>
                  <Separator />
                  <Button 
                    variant="outline" 
                    className="w-full text-[14px]"
                    onClick={clearAllFilters}
                  >
                    {t('buttons.clearAll')} {t('common.filters')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder={t('products.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-white border-slate-200"
              />
            </div>
          </div>

          {/* Results count and sort */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[14px] text-slate-600">
              {t('common.showing')} {sortedProducts.length} {sortedProducts.length === 1 ? t('products.product') : t('products.products')}
            </p>
            <div className="flex items-center gap-2">
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

          {/* Product grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedProducts.map(product => (
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
                        {parseFeatures(product.features).map((spec, index) => (
                          <p key={index} className="text-[12px] text-slate-600 line-clamp-1">• {spec}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Industry tags from applications */}
                  {product.applications && (
                    <div className="flex flex-wrap gap-1">
                      {product.applications.split(',').slice(0, 3).map((app, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[11px]">
                          {app.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                {/* Card footer with actions */}
                <CardFooter className="mt-auto pt-3 flex gap-2">
                  <Link to={`/portal/products/${product.id}`} className="flex-1">
                    <Button className="w-full bg-[#00a8b5] hover:bg-[#008a95] text-white">
                      {t('buttons.viewDetails')}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
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
    </div>
  );
}
