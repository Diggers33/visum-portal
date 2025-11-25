import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateDevice, Device, UpdateDeviceInput } from '../lib/api/devices';

interface EditDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onSuccess: () => void;
}

export default function EditDeviceModal({
  open,
  onOpenChange,
  device,
  onSuccess
}: EditDeviceModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serial_number: '',
    device_name: '',
    device_model: '',
    product_name: '',
    installation_date: '',
    warranty_expiry: '',
    location_description: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance' | 'decommissioned',
    internal_notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (device) {
      setFormData({
        serial_number: device.serial_number || '',
        device_name: device.device_name || '',
        device_model: device.device_model || '',
        product_name: device.product_name || '',
        installation_date: device.installation_date ? device.installation_date.split('T')[0] : '',
        warranty_expiry: device.warranty_expiry ? device.warranty_expiry.split('T')[0] : '',
        location_description: device.location_description || '',
        status: device.status,
        internal_notes: device.internal_notes || ''
      });
    }
  }, [device]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.serial_number.trim()) {
      newErrors.serial_number = 'Serial number is required';
    }

    if (!formData.device_name.trim()) {
      newErrors.device_name = 'Device name is required';
    }

    if (formData.installation_date && formData.warranty_expiry) {
      const installDate = new Date(formData.installation_date);
      const warrantyDate = new Date(formData.warranty_expiry);
      if (warrantyDate < installDate) {
        newErrors.warranty_expiry = 'Warranty expiry cannot be before installation date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !device) return;

    setLoading(true);
    try {
      const input: UpdateDeviceInput = {
        serial_number: formData.serial_number.trim(),
        device_name: formData.device_name.trim(),
        device_model: formData.device_model.trim() || undefined,
        product_name: formData.product_name.trim() || undefined,
        installation_date: formData.installation_date || undefined,
        warranty_expiry: formData.warranty_expiry || undefined,
        location_description: formData.location_description.trim() || undefined,
        status: formData.status,
        internal_notes: formData.internal_notes.trim() || undefined
      };

      const { error } = await updateDevice(device.id, input);

      if (error) throw error;

      toast.success('Device updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update device', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Device</DialogTitle>
          <DialogDescription>
            Update device information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-6" style={{ minHeight: 0 }}>
            {/* Device Identification */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Device Identification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serial_number">
                    Serial Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g., SN-2024-001234"
                    className={errors.serial_number ? 'border-red-500' : ''}
                  />
                  {errors.serial_number && (
                    <p className="text-sm text-red-500 mt-1">{errors.serial_number}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="device_name">
                    Device Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="device_name"
                    value={formData.device_name}
                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    placeholder="e.g., Main Office Scanner"
                    className={errors.device_name ? 'border-red-500' : ''}
                  />
                  {errors.device_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.device_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="device_model">Device Model</Label>
                  <Input
                    id="device_model"
                    value={formData.device_model}
                    onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                    placeholder="e.g., VISUM Pro 3000"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Product & Warranty */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Product & Warranty
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="product_name">VISUM Product</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="e.g., VISUM Enterprise Suite"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the VISUM product this device is registered for
                  </p>
                </div>

                <div>
                  <Label htmlFor="installation_date">Installation Date</Label>
                  <Input
                    id="installation_date"
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                  <Input
                    id="warranty_expiry"
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                    className={errors.warranty_expiry ? 'border-red-500' : ''}
                  />
                  {errors.warranty_expiry && (
                    <p className="text-sm text-red-500 mt-1">{errors.warranty_expiry}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Location
              </h3>

              <div>
                <Label htmlFor="location_description">Location Description</Label>
                <Textarea
                  id="location_description"
                  value={formData.location_description}
                  onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                  placeholder="e.g., Building A, Floor 2, Room 201"
                  rows={2}
                />
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Internal Notes
              </h3>

              <div>
                <Label htmlFor="internal_notes">Notes (not visible to customer)</Label>
                <Textarea
                  id="internal_notes"
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  placeholder="Add any internal notes about this device..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#00a8b5] hover:bg-[#008a95]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
