import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import {
  createRelease,
  uploadReleaseFile,
  setReleaseTargetDistributors,
  setReleaseTargetDevices,
  publishRelease,
  getReleaseTypes,
  formatFileSize,
  type CreateReleaseInput,
} from '../../lib/api/software-releases';
import { fetchDistributors, Distributor } from '../../lib/api/distributors';
import { supabase } from '../../lib/supabase';

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

  const releaseTypes = getReleaseTypes();

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

    setLoading(true);
    try {
      // 1. Upload file
      const { data: uploadData, error: uploadError } = await uploadReleaseFile(selectedFile);
      if (uploadError) throw uploadError;

      // 2. Create release record
      const releaseData: CreateReleaseInput = {
        name: formData.name!,
        version: formData.version!,
        release_type: formData.release_type!,
        product_id: formData.product_id || undefined,
        product_name: formData.product_name || undefined,
        file_url: uploadData!.url,
        file_name: selectedFile.name,
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

          <ScrollArea className="flex-1 mt-4 pr-4" style={{ height: 'calc(90vh - 280px)' }}>
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-0">
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
                  <Select value={formData.product_id} onValueChange={handleProductChange}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select product (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific product</SelectItem>
                      {products.map((product) => (
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
            <TabsContent value="file" className="space-y-4 mt-0">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-[#00a8b5] bg-[#00a8b5]/5'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
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

              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
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
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-0">
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
            <TabsContent value="targeting" className="space-y-4 mt-0">
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
