import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
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
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Download,
  Trash2,
  ExternalLink,
  File,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

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
}

interface MarketingAssetsSectionProps {
  productName: string;
  productId: string;
}

const assetTypes = [
  'Brochure',
  'Product Photos',
  'Video',
  'Logo',
  'Case Study',
  'White Paper',
  'Presentation',
  'Datasheet',
  'Manual',
  'Press Release'
];

const languages = ['English', 'German', 'French', 'Spanish', 'All'];
const formats = ['PDF', 'ZIP', 'MP4', 'PPTX', 'JPG', 'PNG', 'DOCX'];

const getFileIcon = (format: string) => {
  switch (format?.toUpperCase()) {
    case 'PDF':
    case 'DOCX':
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

export default function MarketingAssetsSection({ productName, productId }: MarketingAssetsSectionProps) {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'Brochure',
    language: 'English',
    format: 'PDF',
    file_url: '',
    description: '',
    size: '',
  });

  useEffect(() => {
    loadAssets();
  }, [productName]);

  const loadAssets = async () => {
    if (!productName) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('*')
        .eq('product', productName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error loading marketing assets:', error);
      toast.error('Failed to load marketing assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async () => {
    if (!newAsset.name || !newAsset.file_url) {
      toast.error('Please fill in asset name and file URL');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('marketing_assets')
        .insert([{
          name: newAsset.name,
          type: newAsset.type,
          product: productName,
          language: newAsset.language,
          format: newAsset.format,
          file_url: newAsset.file_url,
          description: newAsset.description || null,
          size: newAsset.size || null,
          status: 'published',
          downloads: 0,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Marketing asset added');
      setAssets([data, ...assets]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding asset:', error);
      toast.error('Failed to add marketing asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!confirm(`Delete "${assetName}"?`)) return;

    try {
      const { error } = await supabase
        .from('marketing_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      setAssets(assets.filter(a => a.id !== assetId));
      toast.success('Asset deleted');
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const handleDownload = async (assetId: string) => {
    try {
      // Get current download count
      const { data: currentAsset, error: fetchError } = await supabase
        .from('marketing_assets')
        .select('downloads')
        .eq('id', assetId)
        .single();

      if (fetchError) throw fetchError;

      // Increment
      const newDownloadCount = (currentAsset?.downloads || 0) + 1;

      const { error } = await supabase
        .from('marketing_assets')
        .update({ downloads: newDownloadCount })
        .eq('id', assetId);

      if (error) throw error;
      
      setAssets(assets.map(a => 
        a.id === assetId ? { ...a, downloads: newDownloadCount } : a
      ));
    } catch (error: any) {
      console.error('Error updating download count:', error);
    }
  };

  const resetForm = () => {
    setNewAsset({
      name: '',
      type: 'Brochure',
      language: 'English',
      format: 'PDF',
      file_url: '',
      description: '',
      size: '',
    });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-900">Marketing Assets</h2>
            <p className="text-[14px] text-slate-600 mt-1">
              Manage marketing materials for this product
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-[#00a8b5] hover:bg-[#008a95]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No marketing assets yet</p>
            <p className="text-sm text-slate-500">Add brochures, videos, case studies, and more</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => {
              const FileIcon = getFileIcon(asset.format);
              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="p-2 bg-cyan-50 rounded">
                    <FileIcon className="h-5 w-5 text-[#00a8b5]" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-slate-900 truncate">
                        {asset.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {asset.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>{asset.format}</span>
                      {asset.size && (
                        <>
                          <span>•</span>
                          <span>{asset.size}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{asset.language}</span>
                      <span>•</span>
                      <span>{asset.downloads} downloads</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(asset.file_url, '_blank');
                        handleDownload(asset.id);
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAsset(asset.id, asset.name)}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Marketing Asset</DialogTitle>
            <DialogDescription>
              Add a new marketing material for {productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Asset Name *</Label>
              <Input
                id="asset-name"
                placeholder="Product Brochure 2025"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset-type">Type</Label>
                <Select
                  value={newAsset.type}
                  onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-format">Format</Label>
                <Select
                  value={newAsset.format}
                  onValueChange={(value) => setNewAsset({ ...newAsset, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map(format => (
                      <SelectItem key={format} value={format}>{format}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset-language">Language</Label>
                <Select
                  value={newAsset.language}
                  onValueChange={(value) => setNewAsset({ ...newAsset, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-size">File Size</Label>
                <Input
                  id="asset-size"
                  placeholder="6.2 MB"
                  value={newAsset.size}
                  onChange={(e) => setNewAsset({ ...newAsset, size: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-url">File URL *</Label>
              <Input
                id="asset-url"
                type="url"
                placeholder="https://example.com/brochure.pdf"
                value={newAsset.file_url}
                onChange={(e) => setNewAsset({ ...newAsset, file_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-description">Description</Label>
              <Input
                id="asset-description"
                placeholder="Product overview brochure..."
                value={newAsset.description}
                onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAsset}
              disabled={saving}
              className="bg-[#00a8b5] hover:bg-[#008a95]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
