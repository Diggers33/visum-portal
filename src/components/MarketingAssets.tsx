import React, { useState, useTransition, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  Search, 
  Download, 
  Grid3x3, 
  List, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File,
  Languages,
  Loader2
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';

interface MarketingAsset {
  id: string;
  name: string;
  type: string;
  product: string;
  language: string;
  format: string;
  size: string | null;
  status: string;
  description: string | null;
  file_url: string;
  downloads: number;
  created_at: string;
  updated_at: string;
  translated_name?: string;
  translated_description?: string;
}

const assetTypes = ['Brochure', 'Product Photos', 'Video', 'Logo', 'Case Study', 'White Paper', 'Presentation'];
const formats = ['PDF', 'ZIP', 'MP4', 'PPTX', 'JPG', 'PNG'];

// Language mapping: DB value -> Display value
const languageMap: Record<string, string> = {
  'English': 'EN',
  'German': 'DE',
  'French': 'FR',
  'Spanish': 'ES',
  'All': 'All'
};

const languages = ['English', 'German', 'French', 'Spanish', 'All'];

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

const getFileIcon = (format: string) => {
  switch (format) {
    case 'PDF':
      return FileText;
    case 'ZIP':
      return File;
    case 'MP4':
      return Video;
    case 'JPG':
    case 'PNG':
      return ImageIcon;
    default:
      return FileText;
  }
};

export default function MarketingAssets() {
  const { t, i18n } = useTranslation('common');
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load assets and products from Supabase
  useEffect(() => {
    loadAssets();
    loadProducts();
  }, []);

  // Reload translations when language changes
  useEffect(() => {
    if (assets.length > 0) {
      loadTranslations();
    }
  }, [i18n.language]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Loaded assets:', data);
      if (data && data.length > 0) {
        console.log('Sample asset:', data[0]);
        console.log('Has file_url?', !!data[0].file_url);
      }
      
      setAssets(data || []);
      
      // Load translations after assets are loaded
      if (data && data.length > 0) {
        await loadTranslations(data);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load marketing assets');
    } finally {
      setLoading(false);
    }
  };

  const loadTranslations = async (assetsData?: MarketingAsset[]) => {
    const currentAssets = assetsData || assets;
    if (currentAssets.length === 0) return;

    // Map language codes
    const languageCode = i18n.language === 'en' ? 'en' : 
                         i18n.language === 'de' ? 'de' :
                         i18n.language === 'es' ? 'es' :
                         i18n.language === 'fr' ? 'fr' :
                         i18n.language === 'it' ? 'it' : 'en';

    // If English, no need to load translations
    if (languageCode === 'en') {
      setAssets(currentAssets.map(asset => ({
        ...asset,
        translated_name: undefined,
        translated_description: undefined
      })));
      return;
    }

    try {
      // Get all asset IDs
      const assetIds = currentAssets.map(a => a.id);

      // Fetch translations for all assets in current language
      const { data: translations, error } = await supabase
        .from('content_translations')
        .select('content_id, field, translation')
        .eq('content_type', 'marketing_asset')
        .eq('language', languageCode)
        .in('content_id', assetIds);

      if (error) {
        console.error('Error loading translations:', error);
        return;
      }

      // Create a map of translations
      const translationMap: Record<string, { name?: string; description?: string }> = {};
      
      translations?.forEach((t: any) => {
        if (!translationMap[t.content_id]) {
          translationMap[t.content_id] = {};
        }
        if (t.field === 'name') {
          translationMap[t.content_id].name = t.translation;
        } else if (t.field === 'description') {
          translationMap[t.content_id].description = t.translation;
        }
      });

      // Apply translations to assets
      const translatedAssets = currentAssets.map(asset => ({
        ...asset,
        translated_name: translationMap[asset.id]?.name,
        translated_description: translationMap[asset.id]?.description
      }));

      setAssets(translatedAssets);
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .order('name');

      if (error) throw error;
      
      const productNames = data?.map(p => p.name) || [];
      // Add General/Company option
      setProducts(['General/Company', ...productNames]);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Set document title
  useEffect(() => {
    document.title = 'Marketing Assets - Visum Portal';
    return () => {
      document.title = 'Visum Portal';
    };
  }, []);

  const handleDownload = async (assetId: string, assetName: string, fileUrl: string) => {
    console.log('=== DOWNLOAD CLICKED ===');
    console.log('Asset ID:', assetId);
    console.log('Asset Name:', assetName);
    console.log('File URL:', fileUrl);
    console.log('File URL type:', typeof fileUrl);
    console.log('File URL length:', fileUrl?.length);
    
    // Validate file URL exists
    if (!fileUrl || fileUrl.trim() === '') {
      console.error('❌ File URL is missing or empty');
      toast.error('Download failed', {
        description: 'File URL is missing. Please contact administrator.',
      });
      return;
    }

    console.log('✅ File URL validation passed');

    // Optimistic update - increment download count immediately
    setAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { ...asset, downloads: asset.downloads + 1 }
        : asset
    ));
    
    // Show downloading state
    setDownloadingIds(prev => new Set(prev).add(assetId));
    
    try {
      console.log('📊 Updating download count in database...');
      
      // First, get current download count
      const { data: currentAsset, error: fetchError } = await supabase
        .from('marketing_assets')
        .select('downloads')
        .eq('id', assetId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching current downloads:', fetchError);
        throw fetchError;
      }

      console.log('Current downloads:', currentAsset?.downloads);

      // Increment download count
      const newDownloadCount = (currentAsset?.downloads || 0) + 1;
      console.log('New download count:', newDownloadCount);
      
      const { data: updateResult, error } = await supabase
        .from('marketing_assets')
        .update({ downloads: newDownloadCount })
        .eq('id', assetId)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Database updated successfully. Result:', updateResult);
      console.log('Updated asset downloads:', updateResult?.[0]?.downloads);

      console.log('✅ Database updated successfully');
      console.log('🌐 Opening file in new tab:', fileUrl);
      
      // Open file in new tab
      const newWindow = window.open(fileUrl, '_blank');
      
      if (!newWindow) {
        console.error('❌ Pop-up blocked! Window.open returned null');
        toast.error('Pop-up blocked', {
          description: 'Please allow pop-ups for this site to download files.',
        });
      } else {
        console.log('✅ File opened successfully in new tab');
        toast.success('Download started');
      }
    } catch (error: any) {
      console.error('Error during download:', error);
      toast.error('Failed to record download');
      
      // Revert optimistic update
      setAssets(prev => prev.map(asset => 
        asset.id === assetId 
          ? { ...asset, downloads: asset.downloads - 1 }
          : asset
      ));
    } finally {
      // Remove downloading state after a brief delay
      setTimeout(() => {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(assetId);
          return newSet;
        });
      }, 1000);
    }
  };

  // Filter assets based on search and filters
  const filteredAssets = assets.filter(asset => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const name = asset.translated_name || asset.name;
    const description = asset.translated_description || asset.description || '';
    
    const matchesSearch = !searchQuery || 
      name.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower) ||
      asset.type.toLowerCase().includes(searchLower) ||
      asset.product.toLowerCase().includes(searchLower);

    // Type filter
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(asset.type);

    // Product filter
    const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(asset.product);

    // Language filter
    const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(asset.language);

    return matchesSearch && matchesType && matchesProduct && matchesLanguage;
  });

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleProductToggle = (product: string) => {
    setSelectedProducts(prev => 
      prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
    );
  };

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedProducts([]);
    setSelectedLanguages([]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedProducts.length > 0 || selectedLanguages.length > 0 || searchQuery !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[36px] font-bold text-slate-900 mb-2">
            {t('marketingAssets.title')}
          </h1>
          <p className="text-[18px] text-slate-600">
            {t('marketingAssets.subtitle')}
          </p>
        </div>

        <div className="flex gap-8">
          {/* Filters sidebar */}
          <aside className="w-80 flex-shrink-0">
            <Card className="border-slate-200 sticky top-8">
              <CardHeader>
                <CardTitle className="text-[18px]">{t('marketingAssets.filters')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Asset Type Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    {t('marketingAssets.assetType')}
                  </Label>
                  <div className="space-y-2">
                    {assetTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => handleTypeToggle(type)}
                        />
                        <Label htmlFor={type} className="text-sm text-slate-700 cursor-pointer">
                          {t(`marketingAssets.assetTypes.${type}`) || type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Product Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    {t('marketingAssets.product')}
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {products.map(product => (
                      <div key={product} className="flex items-center space-x-2">
                        <Checkbox
                          id={product}
                          checked={selectedProducts.includes(product)}
                          onCheckedChange={() => handleProductToggle(product)}
                        />
                        <Label htmlFor={product} className="text-sm text-slate-700 cursor-pointer">
                          {product}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Language Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    {t('marketingAssets.language')}
                  </Label>
                  <div className="space-y-2">
                    {languages.map(lang => (
                      <div key={lang} className="flex items-center space-x-2">
                        <Checkbox
                          id={lang}
                          checked={selectedLanguages.includes(lang)}
                          onCheckedChange={() => handleLanguageToggle(lang)}
                        />
                        <Label htmlFor={lang} className="text-sm text-slate-700 cursor-pointer">
                          {lang === 'All' ? 'All Languages' : languageMap[lang]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear all filters link */}
                {hasActiveFilters && (
                  <>
                    <Separator />
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-[#00a8b5] hover:text-[#008a95] underline cursor-pointer w-full text-center"
                    >
                      Clear all filters
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Assets grid/list */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder={t('marketingAssets.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-white border-slate-200"
                />
              </div>
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid3x3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t('marketingAssets.bulkDownload')}
              </Button>
            </div>

            {/* Results count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {t('marketingAssets.showing')} {filteredAssets.length} assets
              </p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg text-slate-600 mb-2">{t('marketingAssets.noAssetsFound')}</p>
                <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <>
                {/* Grid view */}
                {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map(asset => {
                  const FileIcon = getFileIcon(asset.format);
                  const displayName = asset.translated_name || asset.name;
                  const displayDescription = asset.translated_description || asset.description;
                  
                  return (
                    <Card key={asset.id} className="border-slate-200 overflow-hidden group hover:shadow-lg transition-shadow h-[400px] flex flex-col">
                      <div 
                        className="aspect-video bg-slate-100 relative flex-shrink-0"
                        style={asset.thumbnail ? {
                          backgroundImage: `url(${asset.thumbnail})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        } : {}}
                      >
                        {/* Show icon if no thumbnail */}
                        {!asset.thumbnail && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileIcon className="h-20 w-20 text-slate-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {/* Language badge - top left */}
                        {asset.language !== 'All' && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 text-slate-900 px-2 py-0.5 text-xs">
                              {languageMap[asset.language] || asset.language}
                            </Badge>
                          </div>
                        )}
                        {/* File format badge - top right */}
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-slate-900 px-2 py-0.5 text-xs">
                            {asset.format}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 flex flex-col flex-1">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-cyan-50 rounded-lg flex-shrink-0">
                            <FileIcon className="h-5 w-5 text-[#00a8b5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-slate-900 mb-1 line-clamp-2">{displayName}</h4>
                            <p className="text-xs text-slate-600 mb-2">
                              {t(`marketingAssets.assetTypes.${asset.type}`) || asset.type} • {asset.size}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-500">
                                {asset.downloads} {t('marketingAssets.downloads')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Updated {formatDate(asset.updated_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-4 bg-[#00a8b5] hover:bg-[#008a95]"
                          onClick={() => handleDownload(asset.id, displayName, asset.file_url)}
                          disabled={downloadingIds.has(asset.id) || !asset.file_url}
                          title={!asset.file_url ? 'File URL missing - contact administrator' : ''}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {downloadingIds.has(asset.id) ? 'Downloading...' : !asset.file_url ? 'No File' : t('marketingAssets.download')}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* List view */}
            {viewMode === 'list' && (
              <Card className="border-slate-200">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-200">
                    {filteredAssets.map(asset => {
                      const FileIcon = getFileIcon(asset.format);
                      const displayName = asset.translated_name || asset.name;
                      
                      return (
                        <div key={asset.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                          <div className="p-3 bg-cyan-50 rounded-lg">
                            <FileIcon className="h-6 w-6 text-[#00a8b5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-slate-900 mb-1">{displayName}</h4>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <span>{t(`marketingAssets.assetTypes.${asset.type}`) || asset.type}</span>
                              <span>•</span>
                              <span>{asset.format}</span>
                              <span>•</span>
                              <span>{asset.size}</span>
                              {asset.language !== 'All' && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Languages className="h-3 w-3" />
                                    {languageMap[asset.language] || asset.language}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-600 mb-1">
                              {asset.downloads} {t('marketingAssets.downloads')}
                            </p>
                            <p className="text-xs text-slate-500">Updated {formatDate(asset.updated_at)}</p>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-[#00a8b5] hover:bg-[#008a95]"
                            onClick={() => handleDownload(asset.id, displayName, asset.file_url)}
                            disabled={downloadingIds.has(asset.id) || !asset.file_url}
                            title={!asset.file_url ? 'File URL missing - contact administrator' : ''}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {downloadingIds.has(asset.id) ? 'Downloading...' : !asset.file_url ? 'No File' : t('marketingAssets.download')}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
