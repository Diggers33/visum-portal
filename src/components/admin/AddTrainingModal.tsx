import React, { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Upload, Video, FileText, X, Image as ImageIcon, ExternalLink, Play } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AddTrainingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (training: any) => void;
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

// Helper function to extract video ID from YouTube URL
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Helper function to extract video ID from Vimeo URL
const getVimeoVideoId = (url: string): string | null => {
  const regExp = /vimeo.com\/(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Helper function to get embed URL
const getEmbedUrl = (url: string): string | null => {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`;
  }
  
  const vimeoId = getVimeoVideoId(url);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`;
  }
  
  return null;
};

export default function AddTrainingModal({ open, onOpenChange, onAdd }: AddTrainingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [contentSource, setContentSource] = useState<'videoLink' | 'uploadFile'>('videoLink');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPreview, setVideoPreview] = useState<{
    embedUrl: string;
    title: string;
    duration: string;
    thumbnail: string;
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    product: '',
    level: '',
    duration: '',
    moduleCount: '',
    description: '',
    status: 'published',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleContentSourceChange = (source: 'videoLink' | 'uploadFile') => {
    setContentSource(source);
    // Clear relevant errors and state
    setSelectedFile(null);
    setVideoUrl('');
    setVideoPreview(null);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.file;
      delete newErrors.videoUrl;
      return newErrors;
    });
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    setVideoPreview(null);
    if (errors.videoUrl) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.videoUrl;
        return newErrors;
      });
    }
  };

  const handlePreviewVideo = () => {
    // Validate URL
    if (!videoUrl.trim()) {
      setErrors(prev => ({ ...prev, videoUrl: 'Please enter a video URL' }));
      return;
    }

    const embedUrl = getEmbedUrl(videoUrl);
    if (!embedUrl) {
      setErrors(prev => ({ ...prev, videoUrl: 'Please enter a valid YouTube or Vimeo URL' }));
      return;
    }

    setIsPreviewing(true);

    // Simulate fetching video metadata
    setTimeout(() => {
      // Mock video metadata based on URL
      const isYouTube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be');
      const mockTitle = isYouTube 
        ? 'NIR Spectroscopy Technology Overview' 
        : 'Advanced Raman Analysis Techniques';
      const mockDuration = isYouTube ? '12:34' : '18:45';
      const videoId = isYouTube ? getYouTubeVideoId(videoUrl) : getVimeoVideoId(videoUrl);
      const mockThumbnail = isYouTube 
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : `https://vumbnail.com/${videoId}.jpg`;

      setVideoPreview({
        embedUrl,
        title: mockTitle,
        duration: mockDuration,
        thumbnail: mockThumbnail,
      });

      // Auto-fill form fields
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: mockTitle }));
      }
      if (!formData.duration) {
        setFormData(prev => ({ ...prev, duration: mockDuration + ' min' }));
      }

      setIsPreviewing(false);
      toast.success('Video preview loaded');
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.mp4', '.mov', '.avi', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        setErrors(prev => ({ ...prev, file: 'Please upload a valid video (MP4, MOV, AVI) or PDF file' }));
        return;
      }

      // Validate file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, file: 'File size must be less than 500MB' }));
        return;
      }

      setSelectedFile(file);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.file;
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
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate content source
    if (contentSource === 'uploadFile') {
      if (!selectedFile) {
        newErrors.file = 'Please upload a training file';
      }
    } else {
      if (!videoUrl.trim()) {
        newErrors.videoUrl = 'Please enter a video URL';
      } else if (!getEmbedUrl(videoUrl)) {
        newErrors.videoUrl = 'Please enter a valid YouTube or Vimeo URL';
      }
    }

    if (!formData.title.trim()) {
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

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Validate duration format if provided
    if (formData.duration && !/^\d+:?\d*\s*(min|mins|minutes|hr|hrs|hours)?$/i.test(formData.duration.trim())) {
      newErrors.duration = 'Duration format: e.g., "45 min" or "12:34"';
    }

    // Validate module count if provided
    if (formData.moduleCount && (isNaN(Number(formData.moduleCount)) || Number(formData.moduleCount) < 1)) {
      newErrors.moduleCount = 'Module count must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Use startTransition for optimistic update
    startTransition(() => {
      // Simulate API call
      setTimeout(() => {
        let format = 'Video';
        let fileName = '';
        let fileSize = '';

        if (contentSource === 'uploadFile' && selectedFile) {
          const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
          const isVideo = ['mp4', 'mov', 'avi'].includes(fileExtension || '');
          format = isVideo ? 'Video' : 'PDF Guide';
          fileName = selectedFile.name;
          fileSize = (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
        } else {
          format = 'Video Link';
          fileName = videoUrl;
          fileSize = 'External';
        }

        const newTraining = {
          id: Date.now(),
          title: formData.title,
          type: formData.type,
          product: formData.product || 'General',
          level: formData.level,
          format: format,
          duration: formData.duration || (format === 'Video' || format === 'Video Link' ? 'N/A' : '-'),
          modules: Number(formData.moduleCount) || 1,
          views: 0,
          status: formData.status,
          description: formData.description,
          fileName: fileName,
          fileSize: fileSize,
          videoUrl: contentSource === 'videoLink' ? videoUrl : undefined,
          embedUrl: contentSource === 'videoLink' ? getEmbedUrl(videoUrl) : undefined,
          thumbnail: thumbnailFile?.name || videoPreview?.thumbnail,
          created: new Date().toLocaleDateString(),
          contentSource: contentSource,
        };

        onAdd(newTraining);
        toast.success('Training material uploaded successfully');
        onOpenChange(false);
        
        // Reset form
        setFormData({
          title: '',
          type: '',
          product: '',
          level: '',
          duration: '',
          moduleCount: '',
          description: '',
          status: 'published',
        });
        setSelectedFile(null);
        setThumbnailFile(null);
        setVideoUrl('');
        setVideoPreview(null);
        setContentSource('videoLink');
        setErrors({});
      }, 1000);
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form after modal closes
    setTimeout(() => {
      setFormData({
        title: '',
        type: '',
        product: '',
        level: '',
        duration: '',
        moduleCount: '',
        description: '',
        status: 'published',
      });
      setSelectedFile(null);
      setThumbnailFile(null);
      setVideoUrl('');
      setVideoPreview(null);
      setContentSource('videoLink');
      setErrors({});
    }, 200);
  };

  const isVideo = contentSource === 'videoLink' || (selectedFile && ['mp4', 'mov', 'avi'].includes(selectedFile.name.split('.').pop()?.toLowerCase() || ''));
  const isFormValid = 
    formData.title.trim() && 
    formData.type && 
    formData.level && 
    (contentSource === 'uploadFile' ? selectedFile : videoUrl.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Training Material</DialogTitle>
          <DialogDescription>Upload a new training video or guide, or link to external video</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Content Source Selection */}
          <div className="space-y-3">
            <Label className="text-[14px] font-semibold">
              Content Source <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="source-video-link"
                  name="contentSource"
                  value="videoLink"
                  checked={contentSource === 'videoLink'}
                  onChange={(e) => handleContentSourceChange('videoLink')}
                  className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                />
                <Label htmlFor="source-video-link" className="font-normal cursor-pointer text-[14px]">
                  Video Link <span className="text-[#6b7280]">(YouTube, Vimeo - recommended)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="source-upload-file"
                  name="contentSource"
                  value="uploadFile"
                  checked={contentSource === 'uploadFile'}
                  onChange={(e) => handleContentSourceChange('uploadFile')}
                  className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                />
                <Label htmlFor="source-upload-file" className="font-normal cursor-pointer text-[14px]">
                  Upload File <span className="text-[#6b7280]">(Host on portal)</span>
                </Label>
              </div>
            </div>
          </div>

          {/* Video Link Section */}
          {contentSource === 'videoLink' && (
            <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="space-y-2">
                <Label htmlFor="videoUrl" className="text-[14px]">
                  Video URL <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="videoUrl"
                      value={videoUrl}
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                      className={errors.videoUrl ? 'border-red-500' : ''}
                    />
                    {errors.videoUrl && (
                      <p className="text-[13px] text-red-500 mt-1">{errors.videoUrl}</p>
                    )}
                    <p className="text-[12px] text-[#6b7280] mt-1">
                      Supported: YouTube, Vimeo, Wistia
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handlePreviewVideo}
                    disabled={isPreviewing || !videoUrl.trim()}
                    className="border-[#00a8b5] text-[#00a8b5] hover:bg-[#00a8b5] hover:text-white shrink-0"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {isPreviewing ? 'Loading...' : 'Preview Video'}
                  </Button>
                </div>
              </div>

              {/* Video Preview */}
              {videoPreview && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <Label className="text-[14px] font-semibold">Video Preview</Label>
                  <div className="aspect-video rounded-lg overflow-hidden bg-slate-900">
                    <iframe
                      src={videoPreview.embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="flex items-center gap-2 text-[#6b7280]">
                      <Play className="h-4 w-4" />
                      <span>Duration: {videoPreview.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6b7280]">
                      <Video className="h-4 w-4" />
                      <span className="truncate max-w-[300px]">{videoPreview.title}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Upload Section */}
          {contentSource === 'uploadFile' && (
            <div className="space-y-2">
              <Label className="text-[14px]">
                Upload File <span className="text-red-500">*</span>
              </Label>
              
              {!selectedFile ? (
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-[#00a8b5] transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-[13px] text-[#6b7280] mb-1">Click to upload or drag and drop</p>
                      <p className="text-[12px] text-[#9ca3af]">Video (MP4, MOV, AVI) or PDF Guide • Max 500MB</p>
                    </div>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".mp4,.mov,.avi,.pdf,video/mp4,video/quicktime,video/x-msvideo,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-start gap-3">
                    {isVideo ? (
                      <Video className="h-10 w-10 text-[#00a8b5] mt-1" />
                    ) : (
                      <FileText className="h-10 w-10 text-[#00a8b5] mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{selectedFile.name}</p>
                      <p className="text-[13px] text-[#6b7280] mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {errors.file && (
                <p className="text-[13px] text-red-500">{errors.file}</p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[14px]">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g., NIR Spectroscopy Fundamentals"
              maxLength={100}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-[13px] text-red-500">{errors.title}</p>
            )}
            <p className="text-[12px] text-[#9ca3af]">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Type and Product */}
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
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label htmlFor="level" className="text-[14px]">
              Difficulty Level <span className="text-red-500">*</span>
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

          {/* Duration and Module Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-[14px]">
                Duration {isVideo && <span className="text-[#6b7280]">(optional if auto-filled)</span>}
              </Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleFieldChange('duration', e.target.value)}
                placeholder="e.g., 45 min or 12:34"
                className={errors.duration ? 'border-red-500' : ''}
              />
              {errors.duration && (
                <p className="text-[13px] text-red-500">{errors.duration}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="moduleCount" className="text-[14px]">Module Count</Label>
              <Input
                id="moduleCount"
                type="number"
                min="1"
                value={formData.moduleCount}
                onChange={(e) => handleFieldChange('moduleCount', e.target.value)}
                placeholder="e.g., 6"
                className={errors.moduleCount ? 'border-red-500' : ''}
              />
              {errors.moduleCount && (
                <p className="text-[13px] text-red-500">{errors.moduleCount}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[14px]">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Brief description of the training content..."
              maxLength={500}
              className={`min-h-[80px] ${errors.description ? 'border-red-500' : ''}`}
            />
            {errors.description && (
              <p className="text-[13px] text-red-500">{errors.description}</p>
            )}
            <p className="text-[12px] text-[#9ca3af]">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Thumbnail Upload (for videos only) */}
          {isVideo && (
            <div className="space-y-2">
              <Label className="text-[14px]">
                {videoPreview ? 'Custom Thumbnail (Optional)' : 'Thumbnail Image (Optional)'}
              </Label>
              {videoPreview && (
                <p className="text-[12px] text-[#6b7280] -mt-1">
                  Using default thumbnail from video. Upload custom if needed.
                </p>
              )}
              
              {!thumbnailFile ? (
                <div>
                  <label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-[#00a8b5] transition-colors">
                      <ImageIcon className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-[12px] text-[#6b7280]">Upload custom thumbnail</p>
                      <p className="text-[11px] text-[#9ca3af]">JPG, PNG, WEBP • Max 5MB</p>
                    </div>
                  </label>
                  <input
                    id="thumbnail-upload"
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
                      <p className="text-[13px] font-medium text-slate-900 truncate">{thumbnailFile.name}</p>
                      <p className="text-[12px] text-[#6b7280]">
                        {(thumbnailFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeThumbnail}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
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
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="bg-[#00a8b5] hover:bg-[#008a95]"
            onClick={handleSubmit}
            disabled={!isFormValid || isPending}
          >
            {isPending ? 'Uploading...' : 'Upload Training Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
