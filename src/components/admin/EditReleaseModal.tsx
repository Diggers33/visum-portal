import React, { useState, useEffect } from 'react';
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
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Loader2,
  File,
  Users,
  HardDrive,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  updateRelease,
  fetchReleaseById,
  setReleaseTargetDistributors,
  setReleaseTargetDevices,
  getReleaseTypes,
  getReleaseStatusColor,
  formatFileSize,
  type SoftwareRelease,
  type UpdateReleaseInput,
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

interface EditReleaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: SoftwareRelease;
  products: Product[];
  onSuccess: () => void;
}

export default function EditReleaseModal({
  open,
  onOpenChange,
  release,
  products,
  onSuccess,
}: EditReleaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  // Form data
  const [formData, setFormData] = useState<UpdateReleaseInput>({});

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

  const releaseTypes = getReleaseTypes();
  const isPublished = release.status === 'published';

  // Load release details when opened
  useEffect(() => {
    if (open && release) {
      loadReleaseDetails();
    }
  }, [open, release]);

  const loadReleaseDetails = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await fetchReleaseById(release.id);
      if (error) throw error;

      // Set form data
      setFormData({
        name: data!.name,
        version: data!.version,
        release_type: data!.release_type,
        product_id: data!.product_id || '',
        product_name: data!.product_name || '',
        description: data!.description || '',
        release_notes: data!.release_notes || '',
        changelog: data!.changelog || '',
        min_previous_version: data!.min_previous_version || '',
        is_mandatory: data!.is_mandatory,
        notify_on_publish: data!.notify_on_publish,
        release_date: data!.release_date?.split('T')[0],
      });

      // Set target type and selections
      setTargetType(data!.target_type);

      if (data!.target_type === 'distributors') {
        setSelectedDistributorIds(data!.target_distributors?.map((d) => d.id) || []);
        await loadDistributors();
      } else if (data!.target_type === 'devices') {
        setSelectedDeviceIds(data!.target_devices?.map((d) => d.id) || []);
        await loadDevices();
      }
    } catch (error) {
      console.error('Error loading release details:', error);
      toast.error('Failed to load release details');
    } finally {
      setLoadingData(false);
    }
  };

  const loadDistributors = async () => {
    if (distributors.length > 0) return;
    setLoadingDistributors(true);
    try {
      const { data, error } = await fetchDistributors();
      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
    } finally {
      setLoadingDistributors(false);
    }
  };

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
    } finally {
      setLoadingDevices(false);
    }
  };

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

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.version || !formData.release_type) {
      toast.error('Please fill in all required fields');
      setActiveTab('basic');
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
      // Update release
      const updateData: UpdateReleaseInput = {
        ...formData,
        target_type: targetType,
      };

      const { error: updateError } = await updateRelease(release.id, updateData);
      if (updateError) throw updateError;

      // Update targets
      if (targetType === 'distributors') {
        await setReleaseTargetDistributors(release.id, selectedDistributorIds);
      } else if (targetType === 'devices') {
        await setReleaseTargetDevices(release.id, selectedDeviceIds);
      } else {
        // Clear targets if set to 'all'
        await setReleaseTargetDistributors(release.id, []);
        await setReleaseTargetDevices(release.id, []);
      }

      toast.success('Release updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating release:', error);
      toast.error(error.message || 'Failed to update release');
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
          <div className="flex items-center gap-2">
            <DialogTitle>Edit Release</DialogTitle>
            <Badge className={getReleaseStatusColor(release.status)}>
              {release.status.charAt(0).toUpperCase() + release.status.slice(1)}
            </Badge>
          </div>
          <DialogDescription>
            {release.name} v{release.version}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
          </div>
        ) : (
          <>
            {isPublished && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  This release is published. Some fields cannot be modified.
                </span>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="targeting">Targeting</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4 pr-4" style={{ height: 'calc(90vh - 320px)' }}>
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="name">Release Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Visum Palm Firmware Update"
                      disabled={isPublished}
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
                        disabled={isPublished}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="release_type">Release Type *</Label>
                      <Select
                        value={formData.release_type}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, release_type: value })
                        }
                        disabled={isPublished}
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
                        value={formData.product_id || ''}
                        onValueChange={handleProductChange}
                        disabled={isPublished}
                      >
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

                  {/* File info (read-only) */}
                  <div className="space-y-2">
                    <Label>File</Label>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                      <File className="h-6 w-6 text-[#00a8b5]" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{release.file_name}</p>
                        <p className="text-sm text-slate-500">{formatFileSize(release.file_size)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      To change the file, create a new release with the updated file.
                    </p>
                  </div>
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
                        <RadioGroupItem
                          value="distributors"
                          id="target-distributors"
                          className="mt-1"
                        />
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
                                <Label
                                  htmlFor={`device-${device.id}`}
                                  className="cursor-pointer flex-1"
                                >
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
                        disabled={isPublished}
                      />
                      <Label htmlFor="notify" className="cursor-pointer">
                        <span className="font-medium">Notify on Publish</span>
                        <p className="text-sm text-slate-500">
                          {isPublished
                            ? 'Already published'
                            : 'Send notifications to distributors when published'}
                        </p>
                      </Label>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
