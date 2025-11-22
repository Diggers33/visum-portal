import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Loader2, MoreVertical, Video, FileText, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchTrainingMaterials,
  createTrainingMaterial,
  updateTrainingMaterial,
  deleteTrainingMaterial,
  uploadTrainingFile,
  type TrainingMaterial,
  type CreateTrainingMaterialInput,
} from '../../lib/api/training-materials';
import { supabase } from '../../lib/supabase';
import { DistributorSelector } from './DistributorSelector';
import { saveContentSharing, getContentDistributors } from '../../lib/api/sharing';

interface Product {
  id: string;
  name: string;
}

const TYPES = [
  'Product Training',
  'Sales Training',
  'Technical Guide',
];

const FORMATS = [
  'Video',
  'PDF Guide',
  'Interactive',
  'Webinar Recording',
];

const LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
];

export default function TrainingManagement() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<TrainingMaterial | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateTrainingMaterialInput>({
    title: '',
    type: '',
    format: '',
    level: '',
    product: '',
    status: 'draft',
    duration: '',
    modules: 0,
    description: '',
    video_url: '',
    internal_notes: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([]);

  // Sidebar filter states
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  useEffect(() => {
    loadMaterials();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await fetchTrainingMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading training materials:', error);
      toast.error('Failed to load training materials');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!formData.title || !formData.type || !formData.format || !formData.level || !formData.product) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Either file or video_url is required
    if (!selectedFile && !formData.video_url) {
      toast.error('Please provide either a file or video URL');
      return;
    }

    try {
      setUploading(true);
      
      let fileUrl = formData.video_url;
      
      // Upload file if provided
      if (selectedFile) {
        const tempId = `temp-${Date.now()}`;
        fileUrl = await uploadTrainingFile(selectedFile, tempId);
      }

      const materialData: CreateTrainingMaterialInput = {
        ...formData,
        file_url: selectedFile ? fileUrl : undefined,
        video_url: formData.video_url || undefined,
        modules: formData.modules || 0,
      };

      const newMaterial = await createTrainingMaterial(materialData);

      // Save distributor sharing
      if (newMaterial) {
        await saveContentSharing('training_materials', newMaterial.id, selectedDistributorIds);
      }

      toast.success('Training material added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add training material');
    } finally {
      setUploading(false);
    }
  };

  const handleEditMaterial = async () => {
    if (!selectedMaterial) return;

    if (!formData.title || !formData.type || !formData.format || !formData.level || !formData.product) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      
      let fileUrl = selectedMaterial.file_url;
      let videoUrl = formData.video_url;
      
      // If new file selected, upload it
      if (selectedFile) {
        fileUrl = await uploadTrainingFile(selectedFile, selectedMaterial.id);
      }

      await updateTrainingMaterial(selectedMaterial.id, {
        ...formData,
        file_url: selectedFile ? fileUrl : fileUrl,
        video_url: videoUrl,
        modules: formData.modules || 0,
      });

      // Save distributor sharing
      await saveContentSharing('training_materials', selectedMaterial.id, selectedDistributorIds);

      toast.success('Training material updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Failed to update training material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMaterial) return;

    try {
      await deleteTrainingMaterial(selectedMaterial.id);
      toast.success('Training material deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedMaterial(null);
      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete training material');
    }
  };

  const openEditDialog = async (material: TrainingMaterial) => {
    setSelectedMaterial(material);
    setFormData({
      title: material.title,
      type: material.type,
      format: material.format,
      level: material.level,
      product: material.product,
      status: material.status,
      duration: material.duration || '',
      modules: material.modules || 0,
      description: material.description || '',
      video_url: material.video_url || '',
      internal_notes: material.internal_notes || '',
    });
    setSelectedFile(null);

    // Load existing sharing
    const distributorIds = await getContentDistributors('training_materials', material.id);
    setSelectedDistributorIds(distributorIds);

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (material: TrainingMaterial) => {
    setSelectedMaterial(material);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: '',
      format: '',
      level: '',
      product: '',
      status: 'draft',
      duration: '',
      modules: 0,
      description: '',
      video_url: '',
      internal_notes: '',
    });
    setSelectedFile(null);
    setSelectedMaterial(null);
    setSelectedDistributorIds([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const getEmbedUrl = (url: string): string => {
    // Convert YouTube URLs to embed format
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert Vimeo URLs to embed format
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

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
    
    // Vimeo thumbnail - using vumbnail service
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://vumbnail.com/${videoId}.jpg`;
    }
    
    return null;
  };

  const handlePlayVideo = (material: TrainingMaterial) => {
    if (material.video_url) {
      setSelectedMaterial(material);
      setIsVideoModalOpen(true);
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         material.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(material.type);
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(material.level);
    
    return matchesSearch && matchesType && matchesLevel;
  });

  const getTypeCount = (type: string) => {
    return materials.filter(m => m.type === type).length;
  };

  const getLevelCount = (level: string) => {
    return materials.filter(m => m.level === level).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Training Content</h1>
        <p className="text-[16px] text-[#6b7280]">Manage training videos and guides</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Training Material
        </Button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search training..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters Sidebar + Cards Grid */}
      <div className="flex gap-6">
        {/* Filters */}
        <Card className="w-64 h-fit border-slate-200 hidden lg:block">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Type</h3>
              <div className="space-y-2">
                {TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <Label htmlFor={type} className="text-[13px] font-normal cursor-pointer">
                      {type} ({getTypeCount(type)})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Level</h3>
              <div className="space-y-2">
                {LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={level}
                      checked={selectedLevels.includes(level)}
                      onCheckedChange={() => toggleLevel(level)}
                    />
                    <Label htmlFor={level} className="text-[13px] font-normal cursor-pointer">
                      {level} ({getLevelCount(level)})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => {
            const Icon = material.format === 'Video' ? Video : FileText;
            const hasVideo = material.video_url || material.file_url?.includes('youtube') || material.file_url?.includes('vimeo');
            const thumbnailUrl = material.video_url ? getVideoThumbnail(material.video_url) : null;
            
            // Determine document type and color scheme
            const getDocumentStyle = () => {
              const fileUrl = material.file_url || '';
              const isPPT = fileUrl.includes('.ppt') || fileUrl.includes('.pptx');
              const isPDF = fileUrl.includes('.pdf');
              
              // Check file extension first, then format
              if (isPDF || material.format === 'PDF Guide') {
                return { bg: 'bg-red-50', icon: 'text-red-500', label: 'PDF', color: 'red' };
              } else if (isPPT || material.format === 'Presentation') {
                return { bg: 'bg-orange-50', icon: 'text-orange-500', label: 'PPT', color: 'orange' };
              } else if (material.format === 'Interactive') {
                return { bg: 'bg-purple-50', icon: 'text-purple-500', label: 'Interactive', color: 'purple' };
              } else if (material.format === 'Webinar Recording') {
                return { bg: 'bg-blue-50', icon: 'text-blue-500', label: 'Webinar', color: 'blue' };
              } else {
                return { bg: 'bg-slate-50', icon: 'text-slate-500', label: 'Doc', color: 'slate' };
              }
            };
            
            const docStyle = getDocumentStyle();
            
            return (
              <Card 
                key={material.id} 
                className={`border-slate-200 hover:shadow-lg transition-shadow ${hasVideo ? 'cursor-pointer' : ''}`}
              >
                <CardContent className="p-4">
                  {/* Thumbnail */}
                  <div 
                    className="aspect-video rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
                    onClick={() => hasVideo && handlePlayVideo(material)}
                  >
                    {thumbnailUrl ? (
                      <>
                        {/* Video Thumbnail */}
                        <img 
                          src={thumbnailUrl} 
                          alt={material.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if thumbnail fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-12 h-12 bg-[#ef4444]/90 rounded-full flex items-center justify-center hover:bg-[#ef4444] transition-all shadow-xl hover:scale-110">
                            <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Document Styled Background */}
                        <div className={`absolute inset-0 ${docStyle.bg} flex flex-col items-center justify-center`}>
                          <FileText className={`h-16 w-16 ${docStyle.icon} mb-2`} />
                          <span className={`text-xs font-semibold ${docStyle.icon} uppercase tracking-wider`}>
                            {docStyle.label}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 mb-2">
                    <Badge className="text-[11px] bg-slate-900">{material.type}</Badge>
                    <Badge variant="outline" className="text-[11px]">{material.level}</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-900 mb-1 text-[14px]">{material.title}</h3>

                  {/* Meta Info */}
                  <p className="text-[12px] text-[#6b7280] mb-2">
                    {material.duration || '-'} • {material.modules || 0} modules
                  </p>
                  <p className="text-[12px] text-[#9ca3af] mb-3">
                    Views: {material.views}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-[12px]"
                      onClick={() => openEditDialog(material)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {hasVideo && (
                          <>
                            <DropdownMenuItem onClick={() => handlePlayVideo(material)}>
                              <Play className="mr-2 h-4 w-4" />
                              Play Video
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => openDeleteDialog(material)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No training materials found</p>
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Training Material</DialogTitle>
            <DialogDescription>
              Create a new training material for distributors
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleAddMaterial(); }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., NIR Spectroscopy Fundamentals"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product}
                    onValueChange={(value) => setFormData({ ...formData, product: value })}
                  >
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Format *</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData({ ...formData, format: value })}
                  >
                    <SelectTrigger id="format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level *</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 45 min"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modules">Modules</Label>
                  <Input
                    id="modules"
                    type="number"
                    value={formData.modules || ''}
                    onChange={(e) => setFormData({ ...formData, modules: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">Video URL (YouTube, Vimeo, etc.)</Label>
                <Input
                  id="video_url"
                  value={formData.video_url || ''}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-[12px] text-[#6b7280]">
                  Or upload a file below
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Training File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept="video/*,.pdf,.ppt,.pptx"
                />
                <p className="text-[12px] text-[#6b7280]">
                  Video files, PDFs, or presentations
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the training content..."
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={2}
                  placeholder="Add any internal notes..."
                />
              </div>

              {/* Distributor Sharing */}
              <div className="border-t pt-4">
                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                  label="Share with"
                  description="Select which distributors can access this training material"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading} className="bg-[#00a8b5] hover:bg-[#008a95]">
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Training Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Training Material</DialogTitle>
            <DialogDescription>
              Update training material information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleEditMaterial(); }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., NIR Spectroscopy Fundamentals"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-product">Product *</Label>
                  <Select
                    key={`product-${formData.product}`}
                    value={formData.product}
                    onValueChange={(value) => setFormData({ ...formData, product: value })}
                  >
                    <SelectTrigger id="edit-product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type *</Label>
                  <Select
                    key={`type-${formData.type}`}
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-format">Format *</Label>
                  <Select
                    key={`format-${formData.format}`}
                    value={formData.format}
                    onValueChange={(value) => setFormData({ ...formData, format: value })}
                  >
                    <SelectTrigger id="edit-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-level">Level *</Label>
                  <Select
                    key={`level-${formData.level}`}
                    value={formData.level}
                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger id="edit-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duration</Label>
                  <Input
                    id="edit-duration"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 45 min"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-modules">Modules</Label>
                  <Input
                    id="edit-modules"
                    type="number"
                    value={formData.modules || ''}
                    onChange={(e) => setFormData({ ...formData, modules: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  key={`status-${formData.status}`}
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-video_url">Video URL</Label>
                <Input
                  id="edit-video_url"
                  value={formData.video_url || ''}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-file">Training File</Label>
                <Input
                  id="edit-file"
                  type="file"
                  onChange={handleFileChange}
                  accept="video/*,.pdf,.ppt,.pptx"
                />
                <p className="text-[12px] text-[#6b7280]">
                  {selectedFile 
                    ? 'New file selected - will replace existing file' 
                    : 'Upload a new file to replace the existing one (optional)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the training content..."
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={2}
                  placeholder="Add any internal notes..."
                />
              </div>

              {/* Distributor Sharing */}
              <div className="border-t pt-4">
                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                  label="Share with"
                  description="Select which distributors can access this training material"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading} className="bg-[#00a8b5] hover:bg-[#008a95]">
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Training Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMaterial?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
