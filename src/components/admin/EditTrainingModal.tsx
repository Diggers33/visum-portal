import React, { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { Upload, Video, FileText, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Training {
  id: number;
  title: string;
  type: string;
  format: string;
  level: string;
  duration: string;
  modules: number;
  views: number;
  product: string;
  status?: string;
  description?: string;
  internalNotes?: string;
  fileName?: string;
  fileSize?: string;
  thumbnail?: string;
  lastViewed?: string;
  lastViewedBy?: string;
  created?: string;
  videoUrl?: string;
  embedUrl?: string;
  contentSource?: 'uploadFile' | 'videoLink';
}

interface EditTrainingModalProps {
  training: Training | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTraining: Training) => void;
}

const trainingTypes = [
  'Product Training',
  'Sales Training',
  'Technical Guide',
  'Application Video',
  'Installation Guide',
  'Troubleshooting',
  'Best Practices',
];

const products = [
  'Visum Palm',
  'Raman RXN5',
  'HyperSpec HS-2000',
  'Visum Pro',
  'Vision Series',
  'General/All Products',
];

const levels = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

// Helper function to get embed URL
const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  
  // YouTube
  const youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const youtubeMatch = url.match(youtubeRegExp);
  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${youtubeMatch[2]}`;
  }
  
  // Vimeo
  const vimeoRegExp = /vimeo.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  return null;
};

export default function EditTrainingModal({ training, open, onOpenChange, onSave }: EditTrainingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Partial<Training>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);

  // Initialize form data when training changes
  useEffect(() => {
    if (training) {
      setFormData({
        ...training,
        status: training.status || 'published',
      });
      setHasChanges(false);
      setErrors({});
      setThumbnailFile(null);
      setRemoveThumbnail(false);
    }
  }, [training]);

  if (!training) return null;

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate image type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPG, PNG, WEBP)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail must be less than 5MB');
        return;
      }

      setThumbnailFile(file);
      setRemoveThumbnail(false);
      setHasChanges(true);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setRemoveThumbnail(true);
    setHasChanges(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!formData.type) {
      newErrors.type = 'Training type is required';
    }

    if (!formData.level) {
      newErrors.level = 'Difficulty level is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (formData.internalNotes && formData.internalNotes.length > 500) {
      newErrors.internalNotes = 'Internal notes must be 500 characters or less';
    }

    // Validate duration format if provided
    if (formData.duration && formData.duration !== '-' && formData.duration !== 'N/A') {
      if (!/^\d+\s*(min|mins|minutes|hr|hrs|hours)$/i.test(formData.duration.trim())) {
        newErrors.duration = 'Duration format: e.g., "45 min" or "1.5 hours"';
      }
    }

    // Validate module count
    if (formData.modules !== undefined && formData.modules < 1) {
      newErrors.modules = 'Module count must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Use startTransition for optimistic update
    startTransition(() => {
      // Simulate API call
      setTimeout(() => {
        const updatedTraining = {
          ...formData,
          thumbnail: thumbnailFile ? thumbnailFile.name : (removeThumbnail ? undefined : formData.thumbnail),
        } as Training;
        
        onSave(updatedTraining);
        toast.success('Training material updated successfully');
        onOpenChange(false);
        setHasChanges(false);
      }, 800);
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowDiscardDialog(false);
    onOpenChange(false);
    setHasChanges(false);
    setFormData(training);
    setThumbnailFile(null);
    setRemoveThumbnail(false);
  };

  const handleReplaceFile = () => {
    setIsReplacingFile(true);
    // Simulate file picker
    setTimeout(() => {
      setIsReplacingFile(false);
      toast.success('File replaced successfully');
      setHasChanges(true);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Get appropriate icon for file type
  const isVideo = training.format === 'Video' || training.format === 'Video Link';
  const isVideoLink = training.contentSource === 'videoLink' || training.format === 'Video Link';
  const FileIcon = isVideo ? Video : FileText;
  const isFormValid = formData.title?.trim() && formData.type && formData.level && formData.status;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-[700px] max-h-[85vh] overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle>Edit Training Material</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Content Source Selection */}
            <div className="space-y-3">
              <Label className="text-[14px] font-semibold">Content Source</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('contentSource', 'videoLink');
                    handleFieldChange('format', 'Video Link');
                    setHasChanges(true);
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    isVideoLink
                      ? 'border-[#00a8b5] bg-[#00a8b5]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className={`h-5 w-5 ${isVideoLink ? 'text-[#00a8b5]' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className={`text-[14px] font-medium ${isVideoLink ? 'text-[#00a8b5]' : 'text-slate-700'}`}>
                        Video Link
                      </p>
                      <p className="text-[12px] text-[#6b7280]">YouTube, Vimeo, Wistia</p>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('contentSource', 'uploadFile');
                    handleFieldChange('format', formData.format?.includes('PDF') ? 'PDF Guide' : 'Video');
                    setHasChanges(true);
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    !isVideoLink
                      ? 'border-[#00a8b5] bg-[#00a8b5]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Upload className={`h-5 w-5 ${!isVideoLink ? 'text-[#00a8b5]' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className={`text-[14px] font-medium ${!isVideoLink ? 'text-[#00a8b5]' : 'text-slate-700'}`}>
                        Upload File
                      </p>
                      <p className="text-[12px] text-[#6b7280]">Video or PDF document</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* File/Video Link Section */}
            <div className="space-y-3">
              <Label className="text-[14px] font-semibold">
                {isVideoLink ? 'Video URL' : 'File'}
              </Label>
              
              {isVideoLink ? (
                // Video Link Section
                <div className="space-y-3">
                  {/* Video URL Input */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    {(formData.videoUrl || training.videoUrl) && (
                      <div className="flex items-start gap-3 mb-3 pb-3 border-b border-slate-200">
                        <ExternalLink className="h-10 w-10 text-[#00a8b5] mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#6b7280] mb-1">Current Video URL</p>
                          <a 
                            href={formData.videoUrl || training.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00a8b5] hover:underline text-[13px] break-all"
                          >
                            {formData.videoUrl || training.videoUrl}
                          </a>
                          <div className="flex gap-2 mt-1 text-[12px] text-[#6b7280]">
                            <span>Hosted externally</span>
                            {training.created && (
                              <>
                                <span>•</span>
                                <span>Added {training.created}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Change/Add URL Section - Always Visible */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-video-url" className="text-[13px] font-medium">
                        {(formData.videoUrl || training.videoUrl) ? 'Change Video URL' : 'Add Video URL'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-video-url"
                          value={formData.videoUrl || training.videoUrl || ''}
                          onChange={(e) => handleFieldChange('videoUrl', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                          className="text-[13px]"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newEmbedUrl = getEmbedUrl(formData.videoUrl || '');
                            if (newEmbedUrl) {
                              handleFieldChange('embedUrl', newEmbedUrl);
                              toast.success('Video preview updated');
                            } else {
                              toast.error('Invalid video URL');
                            }
                          }}
                          className="shrink-0 border-[#00a8b5] text-[#00a8b5] hover:bg-[#00a8b5] hover:text-white"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          {(formData.videoUrl || training.videoUrl) ? 'Update' : 'Load'}
                        </Button>
                      </div>
                      <p className="text-[12px] text-[#6b7280]">
                        Supported: YouTube, Vimeo, Wistia
                      </p>
                    </div>
                  </div>
                  
                  {/* Video Preview */}
                  {(formData.embedUrl || training.embedUrl) && (
                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-[#6b7280]">Video Preview</Label>
                      <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                        <iframe
                          src={formData.embedUrl || training.embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <p className="text-[12px] text-[#6b7280]">
                        Preview of external video
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Uploaded File Section
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start gap-3">
                      <FileIcon className="h-10 w-10 text-slate-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {training.fileName || `${training.title}.${isVideo ? 'mp4' : 'pdf'}`}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 text-[13px] text-[#6b7280]">
                          <span>{training.fileSize || (isVideo ? '125 MB' : '3.2 MB')}</span>
                          <span>•</span>
                          <span>Uploaded {training.created || 'Sep 20, 2025'}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-slate-300"
                      onClick={handleReplaceFile}
                      disabled={isReplacingFile}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isReplacingFile ? 'Replacing...' : 'Replace File'}
                    </Button>
                  </div>

                  {/* Video Preview for Uploaded Videos */}
                  {isVideo && (
                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-[#6b7280]">Video Preview</Label>
                      <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                        <video
                          controls
                          className="w-full h-full"
                          preload="metadata"
                        >
                          <source 
                            src={`/mock-videos/${training.fileName || 'sample-video.mp4'}`} 
                            type="video/mp4" 
                          />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <p className="text-[12px] text-[#6b7280]">
                        Preview of uploaded video file
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[14px]">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g., NIR Spectroscopy Fundamentals"
                maxLength={100}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-[13px] text-red-500">{errors.title}</p>
              )}
              <p className="text-[12px] text-[#9ca3af]">
                {formData.title?.length || 0}/100 characters
              </p>
            </div>

            {/* Type and Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-[14px]">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleFieldChange('type', value)}
                >
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-[13px] text-red-500">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="level" className="text-[14px]">
                  Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => handleFieldChange('level', value)}
                >
                  <SelectTrigger className={errors.level ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level && (
                  <p className="text-[13px] text-red-500">{errors.level}</p>
                )}
              </div>
            </div>

            {/* Product */}
            <div className="space-y-2">
              <Label htmlFor="product" className="text-[14px]">Product</Label>
              <Select
                value={formData.product}
                onValueChange={(value) => handleFieldChange('product', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration and Module Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-[14px]">
                  Duration {isVideo && <span className="text-[#6b7280]">(for videos)</span>}
                </Label>
                <Input
                  id="duration"
                  value={formData.duration || ''}
                  onChange={(e) => handleFieldChange('duration', e.target.value)}
                  placeholder="e.g., 45 min"
                  className={errors.duration ? 'border-red-500' : ''}
                />
                {errors.duration && (
                  <p className="text-[13px] text-red-500">{errors.duration}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modules" className="text-[14px]">Module Count</Label>
                <Input
                  id="modules"
                  type="number"
                  min="1"
                  value={formData.modules || ''}
                  onChange={(e) => handleFieldChange('modules', parseInt(e.target.value) || 1)}
                  placeholder="e.g., 6"
                  className={errors.modules ? 'border-red-500' : ''}
                />
                {errors.modules && (
                  <p className="text-[13px] text-red-500">{errors.modules}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[14px]">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Brief description of the training content..."
                maxLength={500}
                className={`min-h-[80px] ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-[13px] text-red-500">{errors.description}</p>
              )}
              <p className="text-[12px] text-[#9ca3af]">
                {formData.description?.length || 0}/500 characters
              </p>
            </div>

            {/* Thumbnail Upload (for videos only) */}
            {isVideo && (
              <div className="space-y-2">
                <Label className="text-[14px]">Thumbnail Image</Label>
                
                {!thumbnailFile && !training.thumbnail && !removeThumbnail ? (
                  <div>
                    <label htmlFor="thumbnail-upload-edit" className="cursor-pointer">
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-[#00a8b5] transition-colors">
                        <ImageIcon className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                        <p className="text-[12px] text-[#6b7280]">Upload video thumbnail</p>
                        <p className="text-[11px] text-[#9ca3af]">JPG, PNG, WEBP • Max 5MB</p>
                      </div>
                    </label>
                    <input
                      id="thumbnail-upload-edit"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-8 w-8 text-[#00a8b5]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 truncate">
                          {thumbnailFile?.name || training.thumbnail || 'thumbnail.jpg'}
                        </p>
                        {thumbnailFile && (
                          <p className="text-[12px] text-[#6b7280]">
                            {(thumbnailFile.size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveThumbnail}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {!thumbnailFile && (
                      <label htmlFor="thumbnail-upload-edit" className="cursor-pointer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('thumbnail-upload-edit')?.click();
                          }}
                        >
                          Replace Thumbnail
                        </Button>
                      </label>
                    )}
                    <input
                      id="thumbnail-upload-edit"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-[14px]">
                Status <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-published"
                    name="status"
                    value="published"
                    checked={formData.status === 'published'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                  />
                  <Label htmlFor="status-published" className="font-normal cursor-pointer text-[14px]">
                    Published <span className="text-[#6b7280]">(visible to all distributors)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-draft"
                    name="status"
                    value="draft"
                    checked={formData.status === 'draft'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                  />
                  <Label htmlFor="status-draft" className="font-normal cursor-pointer text-[14px]">
                    Draft <span className="text-[#6b7280]">(only admins can see)</span>
                  </Label>
                </div>
              </div>
              {errors.status && (
                <p className="text-[13px] text-red-500">{errors.status}</p>
              )}
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label htmlFor="internalNotes" className="text-[14px]">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes || ''}
                onChange={(e) => handleFieldChange('internalNotes', e.target.value)}
                placeholder="Add any internal notes about this training material..."
                maxLength={500}
                className={`min-h-[80px] ${errors.internalNotes ? 'border-red-500' : ''}`}
              />
              {errors.internalNotes && (
                <p className="text-[13px] text-red-500">{errors.internalNotes}</p>
              )}
              <p className="text-[12px] text-[#9ca3af]">
                {formData.internalNotes?.length || 0}/500 characters • Only visible to IRIS staff
              </p>
            </div>

            {/* Analytics Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-[13px] font-semibold text-slate-900 mb-3">Training Analytics</h4>
              <div className="space-y-2 text-[13px] text-[#6b7280]">
                <div className="flex justify-between">
                  <span>Total Views:</span>
                  <span className="font-medium text-slate-900">{training.views}</span>
                </div>
                {training.lastViewed && (
                  <div className="flex justify-between">
                    <span>Last Viewed:</span>
                    <span className="font-medium text-slate-900">
                      {training.lastViewed}
                      {training.lastViewedBy && ` by ${training.lastViewedBy}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-slate-900">
                    {training.created || 'Sep 20, 2025'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-[#00a8b5] hover:bg-[#008a95]"
              onClick={handleSave}
              disabled={!isFormValid || isPending}
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardDialog(false)}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
