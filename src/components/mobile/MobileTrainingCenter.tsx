import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Search, 
  PlayCircle,
  Clock,
  FileText,
  Video,
  FileType,
  Download,
  Filter,
  X,
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
import { useTrainingMaterials } from '../../hooks/useData';

const getLevelColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'beginner':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'intermediate':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'advanced':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getFormatIcon = (format: string) => {
  const lowerFormat = format?.toLowerCase() || '';
  if (lowerFormat.includes('video') || lowerFormat === 'mp4') return Video;
  if (lowerFormat.includes('pdf')) return FileText;
  return FileType;
};

export default function MobileTrainingCenter() {
  const { materials, loading, error } = useTrainingMaterials();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  // Extract unique values for filters
  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));
  const products = Array.from(new Set(materials.map(m => m.product_name).filter(Boolean)));
  const levels = Array.from(new Set(materials.map(m => m.difficulty_level).filter(Boolean)));
  const formats = Array.from(new Set(materials.map(m => m.content_format).filter(Boolean)));

  // Filter materials
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = 
      searchQuery === '' ||
      material.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      selectedCategories.length === 0 || 
      selectedCategories.includes(material.category || '');

    const matchesProduct = 
      selectedProducts.length === 0 || 
      selectedProducts.includes(material.product_name || '');

    const matchesLevel = 
      selectedLevels.length === 0 || 
      selectedLevels.includes(material.difficulty_level || '');

    const matchesFormat = 
      selectedFormats.length === 0 || 
      selectedFormats.includes(material.content_format || '');

    return matchesSearch && matchesCategory && matchesProduct && matchesLevel && matchesFormat;
  });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleProductToggle = (product: string) => {
    setSelectedProducts(prev =>
      prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
    );
  };

  const handleLevelToggle = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedProducts([]);
    setSelectedLevels([]);
    setSelectedFormats([]);
  };

  const activeFiltersCount = 
    selectedCategories.length + 
    selectedProducts.length + 
    selectedLevels.length + 
    selectedFormats.length;

  const handleAccess = (material: any) => {
    if (material.content_url) {
      window.open(material.content_url, '_blank');
      toast.success(`Opening ${material.title}`);
    } else {
      toast.error('Content not available');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading training materials...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load training materials</h2>
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
            placeholder="Search training materials..."
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
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Category</h3>
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center gap-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={() => handleCategoryToggle(category)}
                          />
                          <Label htmlFor={`category-${category}`} className="text-sm">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {categories.length > 0 && products.length > 0 && <Separator />}

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

                {products.length > 0 && levels.length > 0 && <Separator />}

                {/* Level Filter */}
                {levels.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Level</h3>
                    <div className="space-y-3">
                      {levels.map((level) => (
                        <div key={level} className="flex items-center gap-2">
                          <Checkbox
                            id={`level-${level}`}
                            checked={selectedLevels.includes(level)}
                            onCheckedChange={() => handleLevelToggle(level)}
                          />
                          <Label htmlFor={`level-${level}`} className="text-sm">
                            {level}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {levels.length > 0 && formats.length > 0 && <Separator />}

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

      {/* Training Materials Grid */}
      <div className="p-4 space-y-4">
        {filteredMaterials.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">No training materials found matching your filters</p>
            {activeFiltersCount > 0 && (
              <Button variant="link" onClick={clearAllFilters} className="mt-2 text-[#00a8b5]">
                Clear all filters
              </Button>
            )}
          </Card>
        ) : (
          filteredMaterials.map((material) => {
            const FormatIcon = getFormatIcon(material.content_format || '');
            
            return (
              <Card key={material.id} className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  {material.thumbnail_url && (
                    <div className="relative h-48 bg-slate-100">
                      <img 
                        src={material.thumbnail_url} 
                        alt={material.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-2">
                          <FormatIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Material Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium text-slate-900 leading-tight mb-2">
                        {material.title}
                      </h3>
                      {material.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {material.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {material.category && (
                        <Badge variant="secondary" className="text-xs">
                          {material.category}
                        </Badge>
                      )}
                      {material.difficulty_level && (
                        <Badge variant="outline" className={`text-xs ${getLevelColor(material.difficulty_level)}`}>
                          {material.difficulty_level}
                        </Badge>
                      )}
                      {material.product_name && (
                        <Badge variant="outline" className="text-xs">
                          {material.product_name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {material.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{material.duration}</span>
                        </div>
                      )}
                      {material.content_format && (
                        <div className="flex items-center gap-1">
                          <FormatIcon className="h-3 w-3" />
                          <span>{material.content_format}</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-[#00a8b5] hover:bg-[#008a95]"
                      onClick={() => handleAccess(material)}
                      size="sm"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Access Training
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
