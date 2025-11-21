import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Distributor, updateDistributor } from '@/lib/api/distributors';

const availableTerritories = [
  // Europe
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus',
  'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
  'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
  'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania',
  'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'United Kingdom',
  // Americas
  'Argentina', 'Brazil', 'Canada', 'Chile', 'Colombia',
  'Mexico', 'Peru', 'United States', 'Venezuela',
  // Asia Pacific
  'Australia', 'China', 'Hong Kong', 'India', 'Indonesia',
  'Japan', 'Malaysia', 'New Zealand', 'Philippines', 'Singapore',
  'South Korea', 'Taiwan', 'Thailand', 'Vietnam',
  // Middle East & Africa
  'Egypt', 'Israel', 'Saudi Arabia', 'South Africa',
  'Turkey', 'United Arab Emirates',
];

interface EditDistributorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  distributor: Distributor | null;
}

interface EditDistributorForm {
  company_name: string;
  territory: string;
  account_type: 'exclusive' | 'non-exclusive';
  contact_email: string;
  phone: string;
  address: string;
  status: 'active' | 'pending' | 'inactive';
}

export default function EditDistributorModal({
  open,
  onClose,
  onSuccess,
  distributor,
}: EditDistributorModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditDistributorForm>({
    company_name: '',
    territory: '',
    account_type: 'non-exclusive',
    contact_email: '',
    phone: '',
    address: '',
    status: 'active',
  });

  // Initialize form data when distributor changes
  useEffect(() => {
    if (distributor) {
      setFormData({
        company_name: distributor.company_name || '',
        territory: distributor.territory || '',
        account_type: (distributor.account_type as 'exclusive' | 'non-exclusive') || 'non-exclusive',
        contact_email: distributor.contact_email || '',
        phone: distributor.phone || '',
        address: distributor.address || '',
        status: distributor.status || 'active',
      });
    }
  }, [distributor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!distributor) return;

    setLoading(true);

    try {
      // Validate required fields
      if (!formData.company_name || !formData.territory) {
        toast({
          title: 'Validation Error',
          description: 'Company name and territory are required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('🔧 Updating distributor company...', formData);

      const { data, error } = await updateDistributor(distributor.id, {
        company_name: formData.company_name,
        territory: formData.territory,
        account_type: formData.account_type,
        contact_email: formData.contact_email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        status: formData.status === 'inactive' ? 'inactive' : 'active',
      });

      if (error) {
        throw new Error(error.message || 'Failed to update distributor');
      }

      console.log('✅ Distributor updated successfully:', data);

      toast({
        title: 'Success',
        description: 'Company information updated successfully',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Update distributor error:', error);

      toast({
        title: 'Error',
        description: error.message || 'Failed to update distributor company',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Distributor Company</DialogTitle>
          <DialogDescription>
            Update company information for {distributor?.company_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#00a8b5]" />
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company_name">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    placeholder="e.g., Acme Corporation"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Territory */}
                <div className="space-y-2">
                  <Label htmlFor="territory">
                    Territory <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.territory}
                    onValueChange={(value) =>
                      setFormData({ ...formData, territory: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select territory" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerritories.map((territory) => (
                        <SelectItem key={territory} value={territory}>
                          {territory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value: 'exclusive' | 'non-exclusive') =>
                      setFormData({ ...formData, account_type: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Exclusive</SelectItem>
                      <SelectItem value="non-exclusive">Non-Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'pending' | 'inactive') =>
                      setFormData({ ...formData, status: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Company Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    placeholder="info@company.com"
                    disabled={loading}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1-555-0100"
                    disabled={loading}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="123 Main St, City, Country"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> To manage users within this company, use the "Manage Users" button from the main table.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#00a8b5] hover:bg-[#008a95]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
