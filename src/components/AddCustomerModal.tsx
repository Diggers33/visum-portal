import { useState } from 'react';
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
import { createCustomer, CreateCustomerInput } from '../lib/api/customers';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributorId: string;
  onSuccess: () => void;
}

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Spain',
  'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden',
  'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Portugal',
  'Ireland', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'China',
  'India', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia',
  'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru',
  'South Africa', 'United Arab Emirates', 'Saudi Arabia', 'Israel'
].sort();

export default function AddCustomerModal({
  open,
  onOpenChange,
  distributorId,
  onSuccess
}: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
    status: 'prospect' as const,
    internal_notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      country: '',
      postal_code: '',
      status: 'prospect',
      internal_notes: ''
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const input: CreateCustomerInput = {
        distributor_id: distributorId,
        company_name: formData.company_name.trim(),
        contact_name: formData.contact_name.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        status: formData.status,
        internal_notes: formData.internal_notes.trim() || undefined
      };

      const { data, error } = await createCustomer(input);

      if (error) throw error;

      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to create customer', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer account. You can add devices after creating the customer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-6" style={{ minHeight: 0 }}>
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Company Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="company_name">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Enter company name"
                    className={errors.company_name ? 'border-red-500' : ''}
                  />
                  {errors.company_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.company_name}</p>
                  )}
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
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="email@company.com"
                    className={errors.contact_email ? 'border-red-500' : ''}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-500 mt-1">{errors.contact_email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Address
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(v) => setFormData({ ...formData, country: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  placeholder="Add any internal notes about this customer..."
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
              Create Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
