import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Upload,
  Loader2,
  File,
  X,
  Users,
  HardDrive,
  Globe,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import * as tus from 'tus-js-client';
import {
  createRelease,
  setReleaseTargetDistributors,
  setReleaseTargetDevices,
  publishRelease,
  getReleaseTypes,
  formatFileSize,
  type CreateReleaseInput,
} from '../../lib/api/software-releases';
import { fetchDistributors, Distributor } from '../../lib/api/distributors';
import { supabase } from '../../lib/supabase';

// Size threshold for using TUS resumable upload (50MB)
const TUS_THRESHOLD = 50 * 1024 * 1024;

interface Product {
  id: string;
  name: string;
}

interface Device {
  id: string;
  device_name: string;
  serial_number: string;
  customer_name?: string;
}

interface CreateReleaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSuccess: () => void;
}

export default function CreateReleaseModal({
  open,
  onOpenChange,
  products,
  onSuccess,
}: CreateReleaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<CreateReleaseInput>>({
    name: '',
    version: '',
    release_type: 'firmware',
    product_id: '',
    product_name: '',
    description: '',
    release_notes: '',
    changelog: '',
    min_previous_version: '',
    is_mandatory: false,
    notify_on_publish: true,
    release_date: new Date().toISOString().split('T')[0],
  });

  // Targeting
  const [targetType, setTargetType] = useState<'all' | 'distributors' | 'devices'>('all');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [distributorSearch, setDistributorSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Publish immediately
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);

  const releaseTypes = getReleaseTypes();

  // Format time estimate
  const formatTimeEstimate = (bytes: number, bytesPerSecond: number = 2000000) => {
    const seconds = bytes / bytesPerSecond;
    if (seconds < 60) return `~${Math.ceil(seconds)} seconds`;
    if (seconds < 3600) return `~${Math.ceil(seconds / 60)} minutes`;
    return `~${(seconds / 3600).toFixed(1)} hours`;
  };

  // Calculate remaining time based on actual upload speed
  const calculateRemainingTime = () => {
    if (!uploadStartTime || uploadedBytes === 0 || !selectedFile) return null;

    const elapsedMs = Date.now() - uploadStartTime;
    const bytesPerMs = uploadedBytes / elapsedMs;
    const remainingBytes = selectedFile.size - uploadedBytes;
    const remainingMs = remainingBytes / bytesPerMs;

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    if (remainingSeconds < 60) return `${remainingSeconds}s remaining`;
    if (remainingSeconds < 3600) return `${Math.ceil(remainingSeconds / 60)}m remaining`;
    return `${(remainingSeconds / 3600).toFixed(1)}h remaining`;
  };

  // Track if upload was cancelled
  const uploadCancelledRef = useRef(false);

  // Upload file with TUS resumable upload protocol (handles large files)
  const uploadWithProgress = async (
    file: File,
    onProgress: (loaded: number, total: number) => void
  ): Promise<{ url: string; fileName: string }> => {
    // Reset cancelled flag
    uploadCancelledRef.current = false;

    // Generate unique filename (sanitize original name)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `releases/${Date.now()}-${sanitizedName}`;

    console.log('[Upload] Starting TUS upload for:', fileName, 'Size:', file.size);

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'software-releases',
          objectName: fileName,
          contentType: file.type || 'application/octet-stream',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onProgress: (bytesUploaded, bytesTotal) => {
          // Check if cancelled
          if (uploadCancelledRef.current) {
            return;
          }
          console.log('[Upload] Progress:', bytesUploaded, '/', bytesTotal);
          onProgress(bytesUploaded, bytesTotal);
        },
        onSuccess: () => {
          if (uploadCancelledRef.current) {
            reject(new Error('Upload cancelled'));
            return;
          }
          console.log('[Upload] Complete!');
          const { data } = supabase.storage
            .from('software-releases')
            .getPublicUrl(fileName);
          resolve({ url: data.publicUrl, fileName: file.name });
        },
        onError: (error) => {
          console.error('[Upload] Error:', error);
          reject(error);
        },
      });

      // Store reference for cancel functionality
      tusUploadRef.current = upload;

      console.log('[Upload] Starting TUS upload...');
      upload.start();
    });
  };

  // Cancel upload
  const cancelUpload = () => {
    console.log('[Upload] Cancelling upload...');
    uploadCancelledRef.current = true;

    if (tusUploadRef.current) {
      try {
        tusUploadRef.current.abort();
      } catch (e) {
        console.log('[Upload] Abort error (expected):', e);
      }
      tusUploadRef.current = null;
    }

    setIsUploading(false);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadStartTime(null);
    setLoading(false);
    toast.info('Upload cancelled');
  };

  // Load distributors when targeting changes
  const loadDistributors = async () => {
    if (distributors.length > 0) return;
    setLoadingDistributors(true);
    try {
      const { data, error } = await fetchDistributors();
      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
      toast.error('Failed to load distributors');
    } finally {
      setLoadingDistributors(false);
    }
  };

  // Load devices when targeting changes
  const loadDevices = async () => {
    if (devices.length > 0) return;
    setLoadingDevices(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id,
          device_name,
          serial_number,
          customer:customers(company_name)
        `)
        .eq('status', 'active')
        .order('device_name')
        .limit(100);

      if (error) throw error;
      setDevices(
        data?.map((d) => ({
          id: d.id,
          device_name: d.device_name,
          serial_number: d.serial_number,
          customer_name: (d.customer as any)?.company_name,
        })) || []
      );
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoadingDevices(false);
    }
  };

  // File dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/octet-stream': ['.bin', '.hex', '.fw', '.img'],
      'application/zip': ['.zip'],
      'application/x-tar': ['.tar', '.tar.gz', '.tgz'],
      'application/x-executable': ['.exe'],
      'application/x-msi': ['.msi'],
    },
  });

  const handleTargetTypeChange = (value: 'all' | 'distributors' | 'devices') => {
    setTargetType(value);
    if (value === 'distributors') {
      loadDistributors();
    } else if (value === 'devices') {
      loadDevices();
    }
  };

  const toggleDistributor = (id: string) => {
    setSelectedDistributorIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setFormData({
      ...formData,
      product_id: productId,
      product_name: product?.name || '',
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      version: '',
      release_type: 'firmware',
      product_id: '',
      product_name: '',
      description: '',
      release_notes: '',
      changelog: '',
      min_previous_version: '',
      is_mandatory: false,
      notify_on_publish: true,
      release_date: new Date().toISOString().split('T')[0],
    });
    setSelectedFile(null);
    setTargetType('all');
    setSelectedDistributorIds([]);
    setSelectedDeviceIds([]);
    setPublishImmediately(false);
    setActiveTab('basic');
    // Reset upload progress state
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadStartTime(null);
    tusUploadRef.current = null;
    uploadCancelledRef.current = false;
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.version || !formData.release_type) {
      toast.error('Please fill in all required fields');
      setActiveTab('basic');
      return;
    }

    if (!selectedFile) {
      toast.error('Please upload a release file');
      setActiveTab('file');
      return;
    }

    if (targetType === 'distributors' && selectedDistributorIds.length === 0) {
      toast.error('Please select at least one distributor');
      setActiveTab('targeting');
      return;
    }

    if (targetType === 'devices' && selectedDeviceIds.length === 0) {
      toast.error('Please select at least one device');
      setActiveTab('targeting');
      return;
    }

    // Check for duplicate version BEFORE uploading (per product)
    setLoading(true);
    try {
      let query = supabase
        .from('software_releases')
        .select('id, name')
        .eq('version', formData.version!.trim())
        .eq('release_type', formData.release_type!);

      // If product is selected, check within that product only
      if (formData.product_id) {
        query = query.eq('product_id', formData.product_id);
      } else {
        // If no product, check for releases without a product
        query = query.is('product_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const productName = formData.product_name ? `for ${formData.product_name}` : '';
        const releaseType = formData.release_type!.charAt(0).toUpperCase() + formData.release_type!.slice(1);
        toast.error(`${releaseType} v${formData.version} already exists ${productName}`.trim(), {
          description: `Release "${existing.name}" already uses this version.`,
        });
        setLoading(false);
        setActiveTab('basic');
        return;
      }
    } catch (error) {
      console.error('Error checking duplicate version:', error);
      // Continue anyway - the backend will catch duplicates
    }

    console.log('[Submit] Starting submission, setting isUploading to true');
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadStartTime(Date.now());

    try {
      // 1. Upload file with TUS resumable upload (progress tracking)
      console.log('[Submit] Starting file upload...');
      const uploadData = await uploadWithProgress(selectedFile, (loaded, total) => {
        const percent = Math.round((loaded / total) * 100);
        console.log('[Submit] Progress update:', percent, '%', loaded, '/', total);
        setUploadProgress(percent);
        setUploadedBytes(loaded);
      });

      console.log('[Submit] Upload complete, URL:', uploadData.url);
      setIsUploading(false);

      // 2. Create release record
      const releaseData: CreateReleaseInput = {
        name: formData.name!,
        version: formData.version!,
        release_type: formData.release_type!,
        product_id: formData.product_id || undefined,
        product_name: formData.product_name || undefined,
        file_url: uploadData.url,
        file_name: uploadData.fileName,
        file_size: selectedFile.size,
        description: formData.description,
        release_notes: formData.release_notes,
        changelog: formData.changelog,
        min_previous_version: formData.min_previous_version,
        target_type: targetType,
        is_mandatory: formData.is_mandatory,
        notify_on_publish: formData.notify_on_publish,
        release_date: formData.release_date,
      };

      const { data: release, error: createError } = await createRelease(releaseData);
      if (createError) throw createError;

      // 3. Set targets
      if (targetType === 'distributors') {
        await setReleaseTargetDistributors(release!.id, selectedDistributorIds);
      } else if (targetType === 'devices') {
        await setReleaseTargetDevices(release!.id, selectedDeviceIds);
      }

      // 4. Publish immediately if requested
      if (publishImmediately) {
        const { error: publishError } = await publishRelease(release!.id);
        if (publishError) {
          toast.warning('Release created but failed to publish', {
            description: publishError.message,
          });
        } else {
          toast.success('Release created and published successfully');
        }
      } else {
        toast.success('Release created as draft');
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating release:', error);
      toast.error(error.message || 'Failed to create release');
    } finally {
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      setUploadStartTime(null);
    }
  };

  const filteredDistributors = distributors.filter((d) =>
    d.company_name.toLowerCase().includes(distributorSearch.toLowerCase())
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.device_name.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.serial_number.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.customer_name?.toLowerCase().includes(deviceSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Release</DialogTitle>
          <DialogDescription>
            Upload a new firmware, software, or driver release
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
          </TabsList>

          <ScrollArea className="mt-4 pr-4 h-[400px]">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-0 min-h-[380px]">
              <div className="space-y-2">
                <Label htmlFor="name">Release Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Visum Palm Firmware Update"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g., 2.1.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_type">Release Type *</Label>
                  <Select
                    value={formData.release_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, release_type: value })
                    }
                  >
                    <SelectTrigger id="release_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {releaseTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select
                    value={formData.product_id || '__none__'}
                    onValueChange={(value) => handleProductChange(value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select product (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No specific product</SelectItem>
                      {products.filter(p => p.id).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_date">Release Date</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* File Tab */}
            <TabsContent value="file" className="space-y-4 mt-0 min-h-[380px]">
              {/* Show dropzone only when not uploading */}
              {!isUploading && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-[#00a8b5] bg-[#00a8b5]/5'
                      : 'border-slate-300 hover:border-slate-400'
                  } ${selectedFile ? 'opacity-50' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto text-slate-400 mb-4" />
                  {isDragActive ? (
                    <p className="text-[#00a8b5]">Drop the file here...</p>
                  ) : (
                    <>
                      <p className="text-slate-600 mb-2">
                        Drag & drop a release file here, or click to select
                      </p>
                      <p className="text-sm text-slate-500">
                        Supported formats: .bin, .hex, .fw, .img, .zip, .tar.gz, .exe, .msi
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* File info display (before upload starts) */}
              {selectedFile && !isUploading && (
                <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <File className="h-8 w-8 text-[#00a8b5]" />
                      <div>
                        <p className="font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Estimated upload time for large files (> 10MB) */}
                  {selectedFile.size > 10 * 1024 * 1024 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 pt-2 border-t">
                      <Clock className="h-4 w-4" />
                      <span>Estimated upload time: {formatTimeEstimate(selectedFile.size)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Upload in progress indicator (simple - detailed progress shown at bottom) */}
              {isUploading && selectedFile && (
                <div className="p-4 bg-[#00a8b5]/5 rounded-lg border border-[#00a8b5]/20">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <File className="h-8 w-8 text-[#00a8b5]" />
                      <Loader2 className="h-4 w-4 animate-spin text-[#00a8b5] absolute -bottom-1 -right-1" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="text-sm text-[#00a8b5]">
                        Upload in progress ({uploadProgress}%) - see progress below
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Large file warning */}
              {selectedFile && selectedFile.size > 100 * 1024 * 1024 && !isUploading && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Large file detected</p>
                    <p className="text-amber-700">
                      This file is {formatFileSize(selectedFile.size)}. Upload may take several minutes.
                      Please do not close this window during upload.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-0 min-h-[380px]">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this release..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_notes">Release Notes</Label>
                <Textarea
                  id="release_notes"
                  value={formData.release_notes}
                  onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                  placeholder="What's new in this release..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="changelog">Changelog</Label>
                <Textarea
                  id="changelog"
                  value={formData.changelog}
                  onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
                  placeholder="Detailed list of changes..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_version">Minimum Previous Version</Label>
                <Input
                  id="min_version"
                  value={formData.min_previous_version}
                  onChange={(e) =>
                    setFormData({ ...formData, min_previous_version: e.target.value })
                  }
                  placeholder="e.g., 1.5.0 (leave empty if no requirement)"
                />
                <p className="text-xs text-slate-500">
                  If specified, devices must have at least this version to install
                </p>
              </div>
            </TabsContent>

            {/* Targeting Tab */}
            <TabsContent value="targeting" className="space-y-4 mt-0 min-h-[380px]">
              <div className="space-y-4">
                <Label>Target Audience</Label>
                <RadioGroup
                  value={targetType}
                  onValueChange={(value) =>
                    handleTargetTypeChange(value as 'all' | 'distributors' | 'devices')
                  }
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="all" id="target-all" className="mt-1" />
                    <Label htmlFor="target-all" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-600" />
                        <span className="font-medium">All Distributors</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Release available to all distributors
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="distributors" id="target-distributors" className="mt-1" />
                    <Label htmlFor="target-distributors" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Specific Distributors</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Select which distributors can access this release
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="devices" id="target-devices" className="mt-1" />
                    <Label htmlFor="target-devices" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Specific Devices</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Target specific devices for this release
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Distributor Selection */}
              {targetType === 'distributors' && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Select Distributors</Label>
                    <span className="text-sm text-slate-500">
                      {selectedDistributorIds.length} selected
                    </span>
                  </div>
                  <Input
                    placeholder="Search distributors..."
                    value={distributorSearch}
                    onChange={(e) => setDistributorSearch(e.target.value)}
                  />
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {loadingDistributors ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                      </div>
                    ) : filteredDistributors.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No distributors found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredDistributors.map((dist) => (
                          <div
                            key={dist.id}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50"
                          >
                            <Checkbox
                              id={`dist-${dist.id}`}
                              checked={selectedDistributorIds.includes(dist.id)}
                              onCheckedChange={() => toggleDistributor(dist.id)}
                            />
                            <Label htmlFor={`dist-${dist.id}`} className="cursor-pointer flex-1">
                              <div className="font-medium">{dist.company_name}</div>
                              <div className="text-sm text-slate-500">{dist.territory}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Device Selection */}
              {targetType === 'devices' && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Select Devices</Label>
                    <span className="text-sm text-slate-500">
                      {selectedDeviceIds.length} selected
                    </span>
                  </div>
                  <Input
                    placeholder="Search by name, serial, or customer..."
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                  />
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {loadingDevices ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                      </div>
                    ) : filteredDevices.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No devices found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredDevices.map((device) => (
                          <div
                            key={device.id}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50"
                          >
                            <Checkbox
                              id={`device-${device.id}`}
                              checked={selectedDeviceIds.includes(device.id)}
                              onCheckedChange={() => toggleDevice(device.id)}
                            />
                            <Label htmlFor={`device-${device.id}`} className="cursor-pointer flex-1">
                              <div className="font-medium">{device.device_name}</div>
                              <div className="text-sm text-slate-500">
                                SN: {device.serial_number}
                                {device.customer_name && ` • ${device.customer_name}`}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Options */}
              <div className="space-y-4 border-t pt-4">
                <Label>Options</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_mandatory: checked as boolean })
                    }
                  />
                  <Label htmlFor="is_mandatory" className="cursor-pointer">
                    <span className="font-medium">Mandatory Update</span>
                    <p className="text-sm text-slate-500">
                      Distributors will be strongly encouraged to install this update
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify"
                    checked={formData.notify_on_publish}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notify_on_publish: checked as boolean })
                    }
                  />
                  <Label htmlFor="notify" className="cursor-pointer">
                    <span className="font-medium">Notify on Publish</span>
                    <p className="text-sm text-slate-500">
                      Send notifications to distributors when published
                    </p>
                  </Label>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Upload progress - visible on ALL tabs when uploading */}
        {isUploading && selectedFile && (
          <div className="border-t pt-4 mt-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <File className="h-6 w-6 text-[#00a8b5]" />
                <Loader2 className="h-3 w-3 animate-spin text-[#00a8b5] absolute -bottom-1 -right-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">Uploading...</p>
              </div>
              <span className="font-medium text-[#00a8b5] text-sm">{uploadProgress}%</span>
            </div>

            <Progress value={uploadProgress} className="h-2" />

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{formatFileSize(uploadedBytes)} of {formatFileSize(selectedFile.size)}</span>
              <div className="flex items-center gap-3">
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {calculateRemainingTime() || 'Calculating...'}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelUpload}
                  className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="publish_immediately"
              checked={publishImmediately}
              onCheckedChange={(checked) => setPublishImmediately(checked as boolean)}
            />
            <Label htmlFor="publish_immediately" className="cursor-pointer text-sm">
              Publish immediately
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#00a8b5] hover:bg-[#008a95]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {publishImmediately ? 'Create & Publish' : 'Save as Draft'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
