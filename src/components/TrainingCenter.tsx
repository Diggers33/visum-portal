import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  Search, 
  PlayCircle, 
  Download, 
  Clock,
  FileText,
  Video,
  FileDown,
  Presentation,
  Sheet,
  FileType,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { fetchAccessibleTraining } from '../lib/api/distributor-content';

const products = ['Visum Palm', 'Raman RXN5', 'HyperSpec HS400', 'Vision Series', 'General/Sales'];
const types = ['Product Training', 'Sales Training', 'Technical Guides', 'Application Videos'];
const formats = ['Video', 'PDF Guide', 'Webinar Recording', 'PowerPoint', 'Excel Workbook', 'Word Document'];
const levels = ['Beginner', 'Intermediate', 'Advanced'];

// Helper function to get file type styling
const getFileTypeConfig = (fileType: string) => {
  const configs: Record<string, { icon: any; bgColor: string; textColor: string; label: string }> = {
    'PPTX': { icon: Presentation, bgColor: 'bg-orange-600', textColor: 'text-white', label: 'PowerPoint' },
    'XLSX': { icon: Sheet, bgColor: 'bg-green-600', textColor: 'text-white', label: 'Excel' },
    'DOCX': { icon: FileType, bgColor: 'bg-blue-600', textColor: 'text-white', label: 'Word' },
    'PDF': { icon: FileText, bgColor: 'bg-red-600', textColor: 'text-white', label: 'PDF' },
    'MP4': { icon: Video, bgColor: 'bg-purple-600', textColor: 'text-white', label: 'Video' },
  };
  return configs[fileType] || { icon: FileText, bgColor: 'bg-slate-600', textColor: 'text-white', label: fileType };
};

// Helper function to generate video thumbnail from URL
const getVideoThumbnail = (url: string): string | null => {
  if (!url) return null;
  
  // YouTube thumbnail
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  
  // Vimeo thumbnail
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://vumbnail.com/${videoId}.jpg`;
  }
  
  return null;
};

// Helper to convert format to fileType
const formatToFileType = (format: string): string => {
  const mapping: Record<string, string> = {
    'Video': 'MP4',
    'Webinar Recording': 'MP4',
    'PDF Guide': 'PDF',
    'PowerPoint': 'PPTX',
    'Excel Workbook': 'XLSX',
    'Word Document': 'DOCX',
  };
  return mapping[format] || 'FILE';
};

export default function TrainingCenter() {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  // State for Supabase data
  const [trainingMaterials, setTrainingMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Video modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  // Load materials from Supabase
  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);

      // Fetch only training materials accessible to this distributor
      const data = await fetchAccessibleTraining();

      // Transform database materials to match component structure
      const transformedMaterials = (data || []).map((material: any) => {
        const fileType = formatToFileType(material.format || 'Video');
        const thumbnail = material.video_url ?
                         getVideoThumbnail(material.video_url) || 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400' :
                         'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400';

        return {
          id: material.id,
          title: material.title,
          description: material.description,
          category: material.type,
          type: material.type,
          product: material.product,
          level: material.level,
          format: material.format,
          duration: material.duration || 'N/A',
          modules: material.modules,
          thumbnail: thumbnail,
          fileType: fileType,
          video_url: material.video_url,
          file_url: material.file_url,
        };
      });

      // Sort by created_at descending
      const sortedMaterials = transformedMaterials.sort((a: any, b: any) => {
        // Note: original data may not have created_at after transformation
        // We'll keep the order from fetchAccessibleTraining
        return 0;
      });

      setTrainingMaterials(transformedMaterials);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error('Failed to load training materials');
    } finally {
      setLoading(false);
    }
  };

  // Convert video URL to embeddable format
  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // YouTube
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Vimeo
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    return url;
  };

  const handlePlayVideo = (material: any) => {
    if (material.video_url) {
      setSelectedMaterial(material);
      setIsVideoModalOpen(true);
    }
  };

  const handleDownload = (material: any) => {
    if (material.file_url) {
      window.open(material.file_url, '_blank');
    } else {
      toast.error('Download not available for this material');
    }
  };

  // Set document title
  useEffect(() => {
    document.title = 'Training Center - Visum Portal';
    return () => {
      document.title = 'Visum Portal';
    };
  }, []);

  // Count materials per category
  const productCounts = products.map(product => ({
    name: product,
    count: trainingMaterials.filter(m => m.product === product).length,
  }));

  const typeCounts = types.map(type => ({
    name: type,
    count: trainingMaterials.filter(m => m.type === type).length,
  }));

  const formatCounts = formats.map(format => ({
    name: format,
    count: trainingMaterials.filter(m => m.format === format).length,
  }));

  const levelCounts = levels.map(level => ({
    name: level,
    count: trainingMaterials.filter(m => m.level === level).length,
  }));

  // Check if any filters are active
  const hasActiveFilters = 
    selectedProducts.length > 0 || 
    selectedTypes.length > 0 || 
    selectedFormats.length > 0 || 
    selectedLevels.length > 0;

  const clearAllFilters = () => {
    setSelectedProducts([]);
    setSelectedTypes([]);
    setSelectedFormats([]);
    setSelectedLevels([]);
  };

  // Quick filter by type
  const handleQuickFilter = (type: string) => {
    setSelectedTypes([type]);
  };

  // Filter materials
  const filteredMaterials = trainingMaterials.filter(material => {
    const matchesSearch = 
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(material.product);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(material.type);
    const matchesFormat = selectedFormats.length === 0 || selectedFormats.includes(material.format);
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(material.level);
    
    return matchesSearch && matchesProduct && matchesType && matchesFormat && matchesLevel;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-slate-900 mb-2">{t('training.title')}</h1>
        <p className="text-slate-600">{t('training.subtitle')}</p>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar filters */}
        <aside className="w-64 flex-shrink-0">
          <Card className="border-slate-200 sticky top-24">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Product</h4>
                <div className="space-y-2">
                  {productCounts.map(product => (
                    <div key={product.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.name}`}
                        checked={selectedProducts.includes(product.name)}
                        onCheckedChange={() => {
                          setSelectedProducts(prev =>
                            prev.includes(product.name) 
                              ? prev.filter(p => p !== product.name) 
                              : [...prev, product.name]
                          );
                        }}
                      />
                      <Label htmlFor={`product-${product.name}`} className="text-sm text-slate-700 cursor-pointer">
                        {product.name} ({product.count})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Type filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Type</h4>
                <div className="space-y-2">
                  {typeCounts.map(type => (
                    <div key={type.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type.name}`}
                        checked={selectedTypes.includes(type.name)}
                        onCheckedChange={() => {
                          setSelectedTypes(prev =>
                            prev.includes(type.name) 
                              ? prev.filter(t => t !== type.name) 
                              : [...prev, type.name]
                          );
                        }}
                      />
                      <Label htmlFor={`type-${type.name}`} className="text-sm text-slate-700 cursor-pointer">
                        {type.name} ({type.count})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Format filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Format</h4>
                <div className="space-y-2">
                  {formatCounts.map(format => (
                    <div key={format.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`format-${format.name}`}
                        checked={selectedFormats.includes(format.name)}
                        onCheckedChange={() => {
                          setSelectedFormats(prev =>
                            prev.includes(format.name) 
                              ? prev.filter(f => f !== format.name) 
                              : [...prev, format.name]
                          );
                        }}
                      />
                      <Label htmlFor={`format-${format.name}`} className="text-sm text-slate-700 cursor-pointer">
                        {format.name} ({format.count})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Level filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Level</h4>
                <div className="space-y-2">
                  {levelCounts.map(level => (
                    <div key={level.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`level-${level.name}`}
                        checked={selectedLevels.includes(level.name)}
                        onCheckedChange={() => {
                          setSelectedLevels(prev =>
                            prev.includes(level.name) 
                              ? prev.filter(l => l !== level.name) 
                              : [...prev, level.name]
                          );
                        }}
                      />
                      <Label htmlFor={`level-${level.name}`} className="text-sm text-slate-700 cursor-pointer">
                        {level.name} ({level.count})
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

        {/* Main content */}
        <div className="flex-1">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Materials</CardTitle>
                  <CardDescription>
                    Browse and access our training library
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Quick filter buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Button 
                  variant={selectedTypes.length === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={clearAllFilters}
                  className={selectedTypes.length === 0 ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}
                >
                  All Materials
                </Button>
                <Button 
                  variant={selectedTypes.includes('Product Training') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('Product Training')}
                  className={selectedTypes.includes('Product Training') ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}
                >
                  Product Training
                </Button>
                <Button 
                  variant={selectedTypes.includes('Sales Training') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('Sales Training')}
                  className={selectedTypes.includes('Sales Training') ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}
                >
                  Sales Training
                </Button>
                <Button 
                  variant={selectedTypes.includes('Technical Guides') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('Technical Guides')}
                  className={selectedTypes.includes('Technical Guides') ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}
                >
                  Technical Guides
                </Button>
              </div>

              {/* Search bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder={t('training.searchVideos')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Results count */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {filteredMaterials.length} {filteredMaterials.length === 1 ? 'material' : 'materials'}
                  {trainingMaterials.length !== filteredMaterials.length && ` of ${trainingMaterials.length}`}
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
              ) : (
                <>
                  {/* Training materials grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map(material => {
                      const fileConfig = getFileTypeConfig(material.fileType);
                      const FileIcon = fileConfig.icon;
                      
                      return (
                        <Card key={material.id} className="border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all group">
                          {/* File Type Header Banner */}
                          <div className={`h-2 ${fileConfig.bgColor}`} />
                          
                          <div className="relative">
                            {/* Thumbnail with gradient overlay */}
                            <div 
                              className="h-48 bg-slate-100 relative overflow-hidden cursor-pointer"
                              onClick={() => material.fileType === 'MP4' && handlePlayVideo(material)}
                              style={{
                                backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(51, 65, 85, 0.4)), url(${material.thumbnail})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            >
                              {/* Top badges */}
                              <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                                <Badge className="bg-white/95 text-slate-900 hover:bg-white backdrop-blur-sm shadow-sm">
                                  {material.category}
                                </Badge>
                                <Badge 
                                  className={
                                    material.level === 'Beginner' ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' :
                                    material.level === 'Intermediate' ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md' :
                                    'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                                  }
                                >
                                  {material.level}
                                </Badge>
                              </div>
                              
                              {/* Large centered file type icon */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div 
                                  className={`${fileConfig.bgColor} ${fileConfig.textColor} flex items-center justify-center shadow-2xl backdrop-blur-sm bg-opacity-95 group-hover:scale-110 transition-transform`}
                                  style={{ borderRadius: '16px', width: '100px', height: '116px' }}
                                >
                                  <FileIcon className="h-16 w-16" strokeWidth={1.5} />
                                </div>
                              </div>
                              
                              {/* File type badge */}
                              <div className="absolute bottom-3 left-3">
                                <Badge className={`${fileConfig.bgColor} ${fileConfig.textColor} shadow-lg backdrop-blur-sm font-medium px-3 py-1`}>
                                  <FileIcon className="h-3.5 w-3.5 mr-1.5" />
                                  {material.fileType}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <CardHeader className="pb-3">
                            <CardTitle className="text-[17px] line-clamp-2 leading-snug group-hover:text-[#00a8b5] transition-colors">
                              {material.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 text-[14px]">
                              {material.description}
                            </CardDescription>
                          </CardHeader>
                          
                          <CardContent className="space-y-4 pt-0">
                            {/* Metadata row */}
                            <div className="flex items-center gap-4 text-[13px] text-slate-600 pb-2">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>{material.duration}</span>
                              </div>
                              {material.modules && (
                                <>
                                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{material.modules} modules</span>
                                  </div>
                                </>
                              )}
                              <div className="flex-1" />
                              <div className={`text-[12px] px-2 py-0.5 rounded ${fileConfig.bgColor} ${fileConfig.textColor} font-medium`}>
                                {fileConfig.label}
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex gap-2">
                              {(material.fileType === 'MP4' || material.format === 'Webinar Recording') ? (
                                <Button 
                                  className="flex-1 bg-[#00a8b5] hover:bg-[#008a95] shadow-sm"
                                  onClick={() => handlePlayVideo(material)}
                                >
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Watch
                                </Button>
                              ) : (
                                <Button 
                                  className="flex-1 bg-[#00a8b5] hover:bg-[#008a95] shadow-sm"
                                  onClick={() => handleDownload(material)}
                                >
                                  <FileIcon className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="hover:bg-slate-50 border-slate-300"
                                onClick={() => handleDownload(material)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {filteredMaterials.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No training materials found matching your search</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Playback Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedMaterial?.title}</DialogTitle>
            <DialogDescription>
              {selectedMaterial?.description || 'Training video'}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full">
            {selectedMaterial?.video_url && (
              <iframe
                src={getEmbedUrl(selectedMaterial.video_url)}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
