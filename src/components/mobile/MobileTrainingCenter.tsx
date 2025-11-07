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
  Presentation,
  Sheet as SheetIcon,
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

// Helper function to get file type styling
const getFileTypeConfig = (fileType: string) => {
  const upperType = fileType?.toUpperCase() || '';
  const configs: Record<string, { icon: any; bgColor: string; textColor: string; label: string }> = {
    'PPTX': { icon: Presentation, bgColor: 'bg-orange-600', textColor: 'text-white', label: 'PowerPoint' },
    'PPT': { icon: Presentation, bgColor: 'bg-orange-600', textColor: 'text-white', label: 'PowerPoint' },
    'POWERPOINT': { icon: Presentation, bgColor: 'bg-orange-600', textColor: 'text-white', label: 'PowerPoint' },
    'XLSX': { icon: SheetIcon, bgColor: 'bg-green-600', textColor: 'text-white', label: 'Excel' },
    'XLS': { icon: SheetIcon, bgColor: 'bg-green-600', textColor: 'text-white', label: 'Excel' },
    'EXCEL': { icon: SheetIcon, bgColor: 'bg-green-600', textColor: 'text-white', label: 'Excel' },
    'EXCEL WORKBOOK': { icon: SheetIcon, bgColor: 'bg-green-600', textColor: 'text-white', label: 'Excel' },
    'DOCX': { icon: FileType, bgColor: 'bg-blue-600', textColor: 'text-white', label: 'Word' },
    'DOC': { icon: FileType, bgColor: 'bg-blue-600', textColor: 'text-white', label: 'Word' },
    'WORD': { icon: FileType, bgColor: 'bg-blue-600', textColor: 'text-white', label: 'Word' },
    'WORD DOCUMENT': { icon: FileType, bgColor: 'bg-blue-600', textColor: 'text-white', label: 'Word' },
    'PDF': { icon: FileText, bgColor: 'bg-red-600', textColor: 'text-white', label: 'PDF' },
    'PDF GUIDE': { icon: FileText, bgColor: 'bg-red-600', textColor: 'text-white', label: 'PDF' },
    'MP4': { icon: Video, bgColor: 'bg-purple-600', textColor: 'text-white', label: 'Video' },
    'VIDEO': { icon: Video, bgColor: 'bg-purple-600', textColor: 'text-white', label: 'Video' },
    'WEBINAR': { icon: Video, bgColor: 'bg-purple-600', textColor: 'text-white', label: 'Video' },
    'WEBINAR RECORDING': { icon: Video, bgColor: 'bg-purple-600', textColor: 'text-white', label: 'Video' },
  };
  return configs[upperType] || { icon: FileText, bgColor: 'bg-slate-600', textColor: 'text-white', label: fileType || 'File' };
};

export default function MobileTrainingCenter() {
  const { materials, loading, error } = useTrainingMaterials();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Safely handle materials array and filter published only
  const safeMaterials = materials || [];
  const publishedMaterials = safeMaterials.filter(m => m.status === 'published');

  // Extract unique values for filters
  const products = Array.from(new Set(publishedMaterials.map(m => m.product).filter(Boolean)));
  const types = Array.from(new Set(publishedMaterials.map(m => m.type).filter(Boolean)));
  const formats = Array.from(new Set(publishedMaterials.map(m => m.format).filter(Boolean)));
  const levels = Array.from(new Set(publishedMaterials.map(m => m.level).filter(Boolean)));

  // Quick filter by type
  const handleQuickFilter = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([type]);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = 
    selectedProducts.length > 0 || 
    selectedTypes.length > 0 || 
    selectedFormats.length > 0 || 
    selectedLevels.length > 0;

  const activeFiltersCount = 
    selectedProducts.length + 
    selectedTypes.length + 
    selectedFormats.length + 
    selectedLevels.length;

  const clearAllFilters = () => {
    setSelectedProducts([]);
    setSelectedTypes([]);
    setSelectedFormats([]);
    setSelectedLevels([]);
  };

  // Filter materials
  const filteredMaterials = publishedMaterials.filter(material => {
    const matchesSearch = 
      searchQuery === '' ||
      material.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(material.product);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(material.type);
    const matchesFormat = selectedFormats.length === 0 || selectedFormats.includes(material.format);
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(material.level);
    
    return matchesSearch && matchesProduct && matchesType && matchesFormat && matchesLevel;
  });

  const handleAccess = (material: any) => {
    const url = material.video_url || material.file_url;
    if (url) {
      window.open(url, '_blank');
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <h1 className="text-slate-900 mb-1">Training Center</h1>
        <p className="text-sm text-slate-600">Access product training videos and technical guides</p>
      </div>

      {/* Quick Filter Chips */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button 
            size="sm"
            variant={selectedTypes.length === 0 ? "default" : "outline"}
            className={`rounded-full shrink-0 h-8 ${selectedTypes.length === 0 ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}`}
            onClick={() => setSelectedTypes([])}
          >
            All Materials
          </Button>
          {types.slice(0, 3).map(type => (
            <Button 
              key={type}
              size="sm"
              variant={selectedTypes.includes(type) ? "default" : "outline"}
              className={`rounded-full shrink-0 h-8 ${selectedTypes.includes(type) ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}`}
              onClick={() => handleQuickFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search training materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-10 rounded-xl"
          />
        </div>

        {/* Filter Button */}
        <div className="flex items-center gap-2">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1 justify-start h-10 rounded-xl border-slate-300"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-auto bg-[#00a8b5] text-white rounded-full h-5 min-w-[20px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader className="pb-4">
                <SheetTitle>Filter Training Materials</SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(85vh-140px)]">
                <div className="space-y-6 pr-4">
                  {/* Product filter */}
                  {products.length > 0 && (
                    <div>
                      <h4 className="text-sm text-slate-900 mb-3">Product</h4>
                      <div className="space-y-3">
                        {products.map(product => (
                          <div key={product} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-product-${product}`}
                              checked={selectedProducts.includes(product)}
                              onCheckedChange={() => {
                                setSelectedProducts(prev =>
                                  prev.includes(product) 
                                    ? prev.filter(p => p !== product) 
                                    : [...prev, product]
                                );
                              }}
                            />
                            <Label htmlFor={`mobile-product-${product}`} className="text-sm">
                              {product}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {products.length > 0 && <Separator />}

                  {/* Type filter */}
                  {types.length > 0 && (
                    <div>
                      <h4 className="text-sm text-slate-900 mb-3">Type</h4>
                      <div className="space-y-3">
                        {types.map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-type-${type}`}
                              checked={selectedTypes.includes(type)}
                              onCheckedChange={() => {
                                setSelectedTypes(prev =>
                                  prev.includes(type) 
                                    ? prev.filter(t => t !== type) 
                                    : [...prev, type]
                                );
                              }}
                            />
                            <Label htmlFor={`mobile-type-${type}`} className="text-sm">
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {types.length > 0 && <Separator />}

                  {/* Format filter */}
                  {formats.length > 0 && (
                    <div>
                      <h4 className="text-sm text-slate-900 mb-3">Format</h4>
                      <div className="space-y-3">
                        {formats.map(format => (
                          <div key={format} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-format-${format}`}
                              checked={selectedFormats.includes(format)}
                              onCheckedChange={() => {
                                setSelectedFormats(prev =>
                                  prev.includes(format) 
                                    ? prev.filter(f => f !== format) 
                                    : [...prev, format]
                                );
                              }}
                            />
                            <Label htmlFor={`mobile-format-${format}`} className="text-sm">
                              {format}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formats.length > 0 && <Separator />}

                  {/* Level filter */}
                  {levels.length > 0 && (
                    <div>
                      <h4 className="text-sm text-slate-900 mb-3">Level</h4>
                      <div className="space-y-3">
                        {levels.map(level => (
                          <div key={level} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-level-${level}`}
                              checked={selectedLevels.includes(level)}
                              onCheckedChange={() => {
                                setSelectedLevels(prev =>
                                  prev.includes(level) 
                                    ? prev.filter(l => l !== level) 
                                    : [...prev, level]
                                );
                              }}
                            />
                            <Label htmlFor={`mobile-level-${level}`} className="text-sm">
                              {level}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extra padding at bottom for scrolling */}
                  <div className="h-20" />
                </div>
              </ScrollArea>

              <div className="p-4 bg-white border-t border-slate-200">
                <Button 
                  className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl"
                  onClick={() => setFilterOpen(false)}
                >
                  View {filteredMaterials.length} materials
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAllFilters}
              className="h-10 w-10 rounded-xl shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-600">
          Showing {filteredMaterials.length} {filteredMaterials.length === 1 ? 'material' : 'materials'}
        </p>
      </div>

      {/* Training Materials List */}
      <div className="p-4 space-y-4 pb-20">
        {filteredMaterials.map(material => {
          const fileConfig = getFileTypeConfig(material.format);
          const FileIcon = fileConfig.icon;
          
          return (
            <Card key={material.id} className="overflow-hidden border-slate-200 shadow-sm">
              {/* File Type Header Stripe */}
              <div className={`h-1.5 ${fileConfig.bgColor}`} />
              
              {/* Thumbnail Section */}
              <div 
                className="relative h-40 bg-slate-100"
                style={{
                  backgroundImage: material.thumbnail 
                    ? `linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(51, 65, 85, 0.5)), url(${material.thumbnail})`
                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(51, 65, 85, 0.7))',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  {material.type && (
                    <Badge className="bg-white/95 text-slate-900 text-[10px] px-2 py-0.5">
                      {material.type}
                    </Badge>
                  )}
                  {material.level && (
                    <Badge 
                      className={`text-white text-[10px] px-2 py-0.5 ${
                        material.level === 'Beginner' ? 'bg-green-500' :
                        material.level === 'Intermediate' ? 'bg-cyan-500' :
                        'bg-purple-500'
                      }`}
                    >
                      {material.level}
                    </Badge>
                  )}
                </div>
                
                {/* Centered File Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`${fileConfig.bgColor} ${fileConfig.textColor} rounded-2xl p-5 shadow-xl`}>
                    <FileIcon className="h-14 w-14" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* File Type Badge */}
                <div className="absolute bottom-3 left-3">
                  <Badge className={`${fileConfig.bgColor} ${fileConfig.textColor} text-[10px] px-2 py-1 flex items-center gap-1`}>
                    <FileIcon className="h-3 w-3" />
                    {material.format}
                  </Badge>
                </div>
              </div>
              
              {/* Content */}
              <CardContent className="p-4">
                <h3 className="text-slate-900 mb-1.5 line-clamp-2 leading-snug">
                  {material.title}
                </h3>
                {material.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {material.description}
                  </p>
                )}
                
                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-slate-600 mb-4 pb-3 border-b border-slate-200">
                  {material.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{material.duration}</span>
                    </div>
                  )}
                  {material.modules && (
                    <>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <div className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>{material.modules} modules</span>
                      </div>
                    </>
                  )}
                  <div className="flex-1" />
                  <div className={`text-[10px] px-2 py-0.5 rounded ${fileConfig.bgColor} ${fileConfig.textColor}`}>
                    {fileConfig.label}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {(material.format?.toLowerCase().includes('video') || material.format?.toLowerCase().includes('webinar')) ? (
                    <Button 
                      className="flex-1 bg-[#00a8b5] hover:bg-[#008a95] h-10 rounded-xl"
                      onClick={() => handleAccess(material)}
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Watch
                    </Button>
                  ) : (
                    <Button 
                      className="flex-1 bg-[#00a8b5] hover:bg-[#008a95] h-10 rounded-xl"
                      onClick={() => handleAccess(material)}
                    >
                      <FileIcon className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl border-slate-300"
                    onClick={() => handleAccess(material)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredMaterials.length === 0 && (
          <div className="text-center py-16">
            <div className="rounded-full bg-slate-100 p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 mb-2">No materials found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
