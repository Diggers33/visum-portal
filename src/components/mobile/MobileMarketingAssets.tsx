import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Search, 
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Filter,
  X,
  Languages,
  Loader2
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { useMarketingAssets } from '../../hooks/useData';

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

const getFileIcon = (format: string) => {
  const upperFormat = format?.toUpperCase() || '';
  switch (upperFormat) {
    case 'PDF':
    case 'PPTX':
      return FileText;
    case 'ZIP':
      return File;
    case 'MP4':
    case 'AVI':
    case 'MOV':
      return Video;
    case 'JPG':
    case 'PNG':
    case 'JPEG':
    case 'GIF':
      return ImageIcon;
    default:
      return FileText;
  }
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function MobileMarketingAssets() {
  const { assets, loading, error } = useMarketingAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  // Extract unique values for filters
  const assetTypes = Array.from(new Set(assets.map(a => a.asset_type || a.category).filter(Boolean)));
  const products = Array.from(new Set(assets.map(a => a.product_name).filter(Boolean)));
  const languages = Array.from(new Set(assets.map(a => a.language).filter(Boolean)));
  const formats = Array.from(new Set(assets.map(a => a.file_format).filter(Boolean)));

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      searchQuery === '' ||
      asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = 
      selectedTypes.length === 0 || 
      selectedTypes.includes(asset.asset_type || asset.category || '');

    const matchesProduct = 
      selectedProducts.length === 0 || 
      selectedProducts.includes(asset.product_name || '');

    const matchesLanguage = 
      selectedLanguages.length === 0 || 
      selectedLanguages.includes(asset.language || '');

    const matchesFormat = 
      selectedFormats.length === 0 || 
      selectedFormats.includes(asset.file_format || '');

    return matchesSearch && matchesType && matchesProduct && matchesLanguage && matchesFormat;
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

  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedProducts([]);
    setSelectedLanguages([]);
    setSelectedFormats([]);
  };

  const activeFiltersCount = 
    selectedTypes.length + 
    selectedProducts.length + 
    selectedLanguages.length + 
    selectedFormats.length;

  const handleDownload = (asset: any) => {
    if (asset.file_url) {
      window.open(asset.file_url, '_blank');
      toast.success(`Downloading ${asset.title}`);
    } else {
      toast.error('Download link not available');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading marketing assets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load assets</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#00a8b5] hover:bg-[#008a95]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-4">
      {/* Search Bar */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 focus:border-[#00a8b5]"
          />
        </div>

        {/* Filters Button */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between" size="sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-[20px] rounded-full bg-[#00a8b5] text-white">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh]">
            <SheetHeader className="pb-4">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-[#00a8b5]">
                    Clear all
                  </Button>
                )}
              </div>
            </SheetHeader>
            
            <ScrollArea className="h-[calc(85vh-100px)]">
              <div className="space-y-6 pb-4">
                {/* Asset Type Filter */}
                {assetTypes.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Asset Type</h3>
                    <div className="space-y-3">
                      {assetTypes.map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={() => handleTypeToggle(type)}
                          />
                          <Label htmlFor={`type-${type}`} className="text-sm">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assetTypes.length > 0 && products.length > 0 && <Separator />}

                {/* Product Filter */}
                {products.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Product</h3>
                    <div className="space-y-3">
                      {products.map((product) => (
                        <div key={product} className="flex items-center gap-2">
                          <Checkbox
                            id={`product-${product}`}
                            checked={selectedProducts.includes(product)}
                            onCheckedChange={() => handleProductToggle(product)}
                          />
                          <Label htmlFor={`product-${product}`} className="text-sm">
                            {product}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {products.length > 0 && languages.length > 0 && <Separator />}

                {/* Language Filter */}
                {languages.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Language</h3>
                    <div className="space-y-3">
                      {languages.map((language) => (
                        <div key={language} className="flex items-center gap-2">
                          <Checkbox
                            id={`language-${language}`}
                            checked={selectedLanguages.includes(language)}
                            onCheckedChange={() => handleLanguageToggle(language)}
                          />
                          <Label htmlFor={`language-${language}`} className="text-sm">
                            {language}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {languages.length > 0 && formats.length > 0 && <Separator />}

                {/* Format Filter */}
                {formats.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Format</h3>
                    <div className="space-y-3">
                      {formats.map((format) => (
                        <div key={format} className="flex items-center gap-2">
                          <Checkbox
                            id={`format-${format}`}
                            checked={selectedFormats.includes(format)}
                            onCheckedChange={() => handleFormatToggle(format)}
                          />
                          <Label htmlFor={`format-${format}`} className="text-sm">
                            {format}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* Assets Grid */}
      <div className="p-4 space-y-4">
        {filteredAssets.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">No assets found matching your filters</p>
            {activeFiltersCount > 0 && (
              <Button variant="link" onClick={clearAllFilters} className="mt-2 text-[#00a8b5]">
                Clear all filters
              </Button>
            )}
          </Card>
        ) : (
          filteredAssets.map((asset) => {
            const FileIcon = getFileIcon(asset.file_format || '');
            
            return (
              <Card key={asset.id} className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  {/* Asset Image/Thumbnail */}
                  {asset.thumbnail_url && (
                    <div className="relative h-48 bg-slate-100">
                      <img 
                        src={asset.thumbnail_url} 
                        alt={asset.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Asset Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-slate-900 leading-tight">
                          {asset.title}
                        </h3>
                        <Badge variant="outline" className="shrink-0">
                          {asset.file_format}
                        </Badge>
                      </div>
                      {asset.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {asset.asset_type && (
                        <Badge variant="secondary" className="text-xs">
                          {asset.asset_type}
                        </Badge>
                      )}
                      {asset.product_name && (
                        <Badge variant="outline" className="text-xs">
                          {asset.product_name}
                        </Badge>
                      )}
                      {asset.language && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Languages className="h-3 w-3" />
                          {asset.language}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        {asset.file_size && (
                          <span>{formatFileSize(asset.file_size)}</span>
                        )}
                        {asset.updated_at && (
                          <span>{formatDate(asset.updated_at)}</span>
                        )}
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-[#00a8b5] hover:bg-[#008a95]"
                      onClick={() => handleDownload(asset)}
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
