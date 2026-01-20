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
import { Plus, Search, Edit, Trash2, Loader2, MoreVertical, FileText, Image, Download, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMarketingAssets,
  createMarketingAsset,
  updateMarketingAsset,
  deleteMarketingAsset,
  uploadMarketingAssetFile,
  type MarketingAsset,
  type CreateMarketingAssetInput,
} from '../../lib/api/marketing-assets';
import { supabase } from '../../lib/supabase';
import TranslateButton from '../TranslateButton';
import { DistributorSelector, filterDistributorIds } from './DistributorSelector';
import { saveContentSharing, getContentDistributors } from '../../lib/api/sharing';

interface Product {
  id: string;
  name: string;
}

interface PendingFile {
  file: File;
  name: string;
  format: string;
  preview?: string;
}

/**
 * Extract a clean title from a filename
 * e.g., "visum_palm_with_background_render.png" -> "Visum Palm With Background Render"
 */
function extractTitleFromFilename(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Replace common separators with spaces
  const withSpaces = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // camelCase to spaces

  // Capitalize each word
  const titleCase = withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return titleCase || filename;
}

const TYPES = [
  'Application Note',
  'Banner',
  'Brochure',
  'Case Study',
  'Datasheet',
  'Images & Renders',
  'Logo',
  'Presentation',
  'Video',
  'White Paper',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese',
  'Japanese',
];

const FORMATS = [
  'PDF',
  'PPT',
  'PPTX',
  'DOC',
  'DOCX',
  'JPG',
  'PNG',
  'SVG',
  'MP4',
  'ZIP',
];

const PRODUCTS = [
  'Visum Palm™',
  'Visum Palm GxP™',
  'Visum Master Software™',
  'Visum NIR In-Line™',
  'Visum Raman In-Line™',
  'Visum HSI™',
  'Others',
];

export default function MarketingManagement() {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MarketingAsset | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateMarketingAssetInput>({
    name: '',
    type: '',
    product: '',
    language: '',
    format: '',
    status: 'draft',
    description: '',
    internal_notes: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Sidebar filter states
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  useEffect(() => {
    loadAssets();
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

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await fetchMarketingAssets();
      setAssets(data);
    } catch (error) {
      console.error('Error loading marketing assets:', error);
      toast.error('Failed to load marketing assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async () => {
    // Batch mode: upload multiple files
    if (pendingFiles.length > 0) {
      if (!formData.type || !formData.language) {
        toast.error('Please select type and language');
        return;
      }

      try {
        setUploading(true);
        setUploadProgress({ current: 0, total: pendingFiles.length });

        const productString = selectedProducts.length > 0 ? selectedProducts.join(', ') : '';
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < pendingFiles.length; i++) {
          const pendingFile = pendingFiles[i];
          setUploadProgress({ current: i + 1, total: pendingFiles.length });

          try {
            // Create the asset first to get an ID
            const assetData: CreateMarketingAssetInput = {
              name: pendingFile.name,
              type: formData.type,
              product: productString,
              language: formData.language,
              format: pendingFile.format,
              size: pendingFile.file.size,
              status: formData.status,
              description: formData.description,
              internal_notes: formData.internal_notes,
            };

            const createdAsset = await createMarketingAsset(assetData);

            // Upload file
            const fileUrl = await uploadMarketingAssetFile(pendingFile.file, createdAsset.id);

            // Update asset with file URL
            await updateMarketingAsset(createdAsset.id, { file_url: fileUrl });

            // Save distributor sharing
            await saveContentSharing('marketing_assets', createdAsset.id, filterDistributorIds(selectedDistributorIds));

            successCount++;
          } catch (fileError) {
            console.error(`Error uploading ${pendingFile.file.name}:`, fileError);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully uploaded ${successCount} asset${successCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
          toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
        }

        setIsAddDialogOpen(false);
        resetForm();
        loadAssets();
      } catch (error) {
        console.error('Error adding assets:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to add marketing assets');
      } finally {
        setUploading(false);
        setUploadProgress({ current: 0, total: 0 });
      }
      return;
    }

    // Single file mode (legacy)
    if (!formData.name || !formData.type || !formData.language || !formData.format) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedFile) {
      toast.error('Please upload a file');
      return;
    }

    try {
      setUploading(true);

      const productString = selectedProducts.length > 0 ? selectedProducts.join(', ') : formData.product;

      // Create the asset first to get an ID
      const assetData: CreateMarketingAssetInput = {
        ...formData,
        product: productString,
        size: selectedFile.size,
      };

      const createdAsset = await createMarketingAsset(assetData);

      // Upload file
      const fileUrl = await uploadMarketingAssetFile(selectedFile, createdAsset.id);

      // Update asset with file URL
      await updateMarketingAsset(createdAsset.id, { file_url: fileUrl });

      // Save distributor sharing
      await saveContentSharing('marketing_assets', createdAsset.id, filterDistributorIds(selectedDistributorIds));

      toast.success('Marketing asset added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add marketing asset');
    } finally {
      setUploading(false);
    }
  };

  const handleEditAsset = async () => {
    if (!selectedAsset) return;

    // Product is now optional - removed from validation
    if (!formData.name || !formData.type || !formData.language || !formData.format) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);

      let fileUrl = selectedAsset.file_url;

      // If new file selected, upload it
      if (selectedFile) {
        fileUrl = await uploadMarketingAssetFile(selectedFile, selectedAsset.id);
      }

      const productString = selectedProducts.length > 0 ? selectedProducts.join(', ') : formData.product;

      await updateMarketingAsset(selectedAsset.id, {
        ...formData,
        product: productString,
        file_url: fileUrl,
        size: selectedFile ? selectedFile.size : selectedAsset.size,
      });

      // Save distributor sharing
      await saveContentSharing('marketing_assets', selectedAsset.id, filterDistributorIds(selectedDistributorIds));

      toast.success('Marketing asset updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error('Failed to update marketing asset');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;

    try {
      await deleteMarketingAsset(selectedAsset.id);
      toast.success('Marketing asset deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete marketing asset');
    }
  };

  const openEditDialog = async (asset: MarketingAsset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name,
      type: asset.type,
      product: asset.product,
      language: asset.language,
      format: asset.format,
      status: asset.status,
      description: asset.description || '',
      internal_notes: asset.internal_notes || '',
    });
    setSelectedFile(null);

    // Parse product string back to array (handles comma-separated values)
    if (asset.product) {
      const productList = asset.product.split(',').map(p => p.trim()).filter(p => PRODUCTS.includes(p));
      setSelectedProducts(productList);
    } else {
      setSelectedProducts([]);
    }

    // Load existing sharing
    const distributorIds = await getContentDistributors('marketing_assets', asset.id);
    setSelectedDistributorIds(distributorIds);

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (asset: MarketingAsset) => {
    setSelectedAsset(asset);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      product: '',
      language: '',
      format: '',
      status: 'draft',
      description: '',
      internal_notes: '',
    });
    setSelectedFile(null);
    setPendingFiles([]);
    setSelectedProducts([]);
    setSelectedAsset(null);
    setSelectedDistributorIds([]);
    setUploadProgress({ current: 0, total: 0 });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect format from file extension
      const ext = file.name.split('.').pop()?.toUpperCase();
      if (ext) {
        setFormData(prev => ({ ...prev, format: ext }));
      }
    }
  };

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPendingFiles: PendingFile[] = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      const title = extractTitleFromFilename(file.name);

      // Generate preview for images
      let preview: string | undefined;
      if (['JPG', 'JPEG', 'PNG', 'SVG', 'WEBP', 'GIF'].includes(ext)) {
        preview = URL.createObjectURL(file);
      }

      newPendingFiles.push({
        file,
        name: title,
        format: ext,
        preview,
      });
    });

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      // Revoke object URL to prevent memory leaks
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const updatePendingFileName = (index: number, newName: string) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: newName };
      return updated;
    });
  };

  const toggleProduct = (product: string) => {
    setSelectedProducts(prev =>
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(asset.type);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(asset.status);
    const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(asset.language);
    
    return matchesSearch && matchesType && matchesStatus && matchesLanguage;
  });

  const getTypeCount = (type: string) => {
    return assets.filter(a => a.type === type).length;
  };

  const getStatusCount = (status: string) => {
    return assets.filter(a => a.status === status).length;
  };

  const getLanguageCount = (language: string) => {
    return assets.filter(a => a.language === language).length;
  };

  // Get asset style based on type
  const getAssetStyle = (asset: MarketingAsset) => {
    const isImage = ['JPG', 'PNG', 'SVG'].includes(asset.format.toUpperCase());
    
    if (asset.type === 'Logo' || asset.type === 'Banner' || asset.type === 'Social Media' || isImage) {
      return { bg: 'bg-purple-50', icon: 'text-purple-500', color: 'purple' };
    } else if (asset.format === 'PDF') {
      return { bg: 'bg-red-50', icon: 'text-red-500', color: 'red' };
    } else if (['PPT', 'PPTX'].includes(asset.format.toUpperCase())) {
      return { bg: 'bg-orange-50', icon: 'text-orange-500', color: 'orange' };
    } else if (['DOC', 'DOCX'].includes(asset.format.toUpperCase())) {
      return { bg: 'bg-blue-50', icon: 'text-blue-500', color: 'blue' };
    } else {
      return { bg: 'bg-slate-50', icon: 'text-slate-500', color: 'slate' };
    }
  };

  const handleDownload = (asset: MarketingAsset) => {
    if (asset.file_url) {
      window.open(asset.file_url, '_blank');
    }
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
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Marketing Assets</h1>
        <p className="text-[16px] text-[#6b7280]">Manage promotional materials and brand assets</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search assets..."
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
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <Label htmlFor={`type-${type}`} className="text-[13px] font-normal cursor-pointer">
                      {type} ({getTypeCount(type)})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Status</h3>
              <div className="space-y-2">
                {['draft', 'published', 'archived'].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="text-[13px] font-normal cursor-pointer capitalize">
                      {status} ({getStatusCount(status)})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Language</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {LANGUAGES.map((language) => (
                  <div key={language} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${language}`}
                      checked={selectedLanguages.includes(language)}
                      onCheckedChange={() => toggleLanguage(language)}
                    />
                    <Label htmlFor={`lang-${language}`} className="text-[13px] font-normal cursor-pointer">
                      {language} ({getLanguageCount(language)})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const style = getAssetStyle(asset);
            const isImage = ['JPG', 'PNG', 'SVG'].includes(asset.format.toUpperCase());
            const Icon = isImage ? Image : FileText;
            
            return (
              <Card key={asset.id} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {/* Thumbnail */}
                  <div className="aspect-video rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {asset.file_url && isImage ? (
                      <img 
                        src={asset.file_url} 
                        alt={asset.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className={`absolute inset-0 ${style.bg} flex flex-col items-center justify-center`}>
                        <Icon className={`h-16 w-16 ${style.icon} mb-2`} />
                        <span className={`text-xs font-semibold ${style.icon} uppercase tracking-wider`}>
                          {asset.format}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <Badge className="text-[11px] bg-slate-900">{asset.type}</Badge>
                    <Badge variant="outline" className="text-[11px]">{asset.language}</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-900 mb-1 text-[14px] line-clamp-2">{asset.name}</h3>

                  {/* Meta Info */}
                  <p className="text-[12px] text-[#6b7280] mb-2">{asset.product}</p>
                  <p className="text-[12px] text-[#9ca3af] mb-3">
                    Downloads: {asset.downloads}
                  </p>

                  {/* Status Badge */}
                  <Badge 
                    className={`text-[11px] mb-3 ${
                      asset.status === 'published' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                        : asset.status === 'draft'
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {asset.status}
                  </Badge>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-[12px]"
                      onClick={() => openEditDialog(asset)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <TranslateButton
                      contentType="marketing_asset"
                      contentId={asset.id}
                      sourceData={{
                        name: asset.name,
                        description: asset.description || undefined
                      }}
                      onTranslationComplete={loadAssets}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(asset)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => openDeleteDialog(asset)}
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

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No marketing assets found</p>
        </div>
      )}

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Marketing Assets</DialogTitle>
            <DialogDescription>
              Upload one or multiple files at once. Titles are auto-generated from filenames.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleAddAsset(); }}>
            <div className="grid gap-4 py-4">
              {/* Batch File Upload Zone */}
              <div className="space-y-3">
                <Label>Files *</Label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#00a8b5] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('batch-file-input')?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select multiple files at once. Supports JPG, PNG, SVG, PDF, PPT, DOC, MP4, ZIP
                  </p>
                  <Input
                    id="batch-file-input"
                    type="file"
                    multiple
                    onChange={handleBatchFileChange}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.svg,.webp,.gif,.pdf,.ppt,.pptx,.doc,.docx,.mp4,.zip"
                  />
                </div>

                {/* Pending Files List */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} selected
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingFiles([])}
                        className="text-xs text-slate-500 hover:text-red-500"
                      >
                        Clear all
                      </Button>
                    </div>
                    {pendingFiles.map((pf, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white rounded-md p-2 border">
                        {pf.preview ? (
                          <img
                            src={pf.preview}
                            alt={pf.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center">
                            <FileText className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Input
                            value={pf.name}
                            onChange={(e) => updatePendingFileName(index, e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Asset name"
                          />
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {pf.file.name} ({pf.format})
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePendingFile(index)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Multi-Product Selection */}
              <div className="space-y-3">
                <Label>Products (Optional - select multiple)</Label>
                <p className="text-xs text-slate-500">
                  Select one or more products. Useful for shared accessories.
                </p>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-slate-50">
                  {PRODUCTS.map((product) => (
                    <div key={product} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product}`}
                        checked={selectedProducts.includes(product)}
                        onCheckedChange={() => toggleProduct(product)}
                      />
                      <Label
                        htmlFor={`product-${product}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {product}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedProducts.length > 0 && (
                  <p className="text-xs text-[#00a8b5]">
                    Selected: {selectedProducts.join(', ')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') => setFormData({ ...formData, status: value })}
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
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the asset..."
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
                  description="Select which distributors can access this marketing asset"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center">
              {uploading && uploadProgress.total > 0 && (
                <div className="flex-1 mr-4">
                  <div className="text-sm text-slate-600 mb-1">
                    Uploading {uploadProgress.current} of {uploadProgress.total}...
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-[#00a8b5] h-2 rounded-full transition-all"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || (pendingFiles.length === 0 && !selectedFile)}
                className="bg-[#00a8b5] hover:bg-[#008a95]"
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {pendingFiles.length > 1
                  ? `Upload ${pendingFiles.length} Assets`
                  : pendingFiles.length === 1
                  ? 'Upload Asset'
                  : 'Add Asset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Marketing Asset</DialogTitle>
            <DialogDescription>
              Update asset information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleEditAsset(); }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Asset Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="edit-language">Language *</Label>
                  <Select
                    key={`language-${formData.language}`}
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger id="edit-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Multi-Product Selection */}
              <div className="space-y-3">
                <Label>Products (Optional - select multiple)</Label>
                <p className="text-xs text-slate-500">
                  Select one or more products. Useful for shared accessories.
                </p>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-slate-50">
                  {PRODUCTS.map((product) => (
                    <div key={product} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-product-${product}`}
                        checked={selectedProducts.includes(product)}
                        onCheckedChange={() => toggleProduct(product)}
                      />
                      <Label
                        htmlFor={`edit-product-${product}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {product}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedProducts.length > 0 && (
                  <p className="text-xs text-[#00a8b5]">
                    Selected: {selectedProducts.join(', ')}
                  </p>
                )}
              </div>

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

              {/* File Upload Zone */}
              <div className="space-y-3">
                <Label>Replace File</Label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#00a8b5] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('edit-asset-input')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      setSelectedFile(file);
                      // Auto-detect format from file extension
                      const ext = file.name.split('.').pop()?.toUpperCase();
                      if (ext) {
                        setFormData(prev => ({ ...prev, format: ext }));
                      }
                    }
                  }}
                >
                  <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to select file or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedFile
                      ? `Selected: ${selectedFile.name}`
                      : 'Upload a new file to replace the existing one (optional)'}
                  </p>
                  <Input
                    id="edit-asset-input"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.svg,.webp,.gif,.pdf,.ppt,.pptx,.doc,.docx,.mp4,.zip"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-md p-2 border">
                    {selectedFile.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">Will replace existing file</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Distributor Sharing */}
              <div className="border-t pt-4">
                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                  label="Share with"
                  description="Select which distributors can access this marketing asset"
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
                Update Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Marketing Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAsset?.name}"? This action cannot be undone.
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
    </div>
  );
}
