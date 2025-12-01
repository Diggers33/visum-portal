import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
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
import { Loader2, Building2, User, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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

interface CreateDistributorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateDistributorForm {
  // Company Info
  company_name: string;
  territory: string;
  account_type: 'exclusive' | 'non-exclusive';
  contact_email: string;
  phone: string;
  address: string;

  // Optional First User
  create_first_user: boolean;
  user_email: string;
  user_full_name: string;
  user_company_role: 'admin' | 'manager' | 'user';
  send_invitation: boolean;
}

export default function CreateDistributorModal({
  open,
  onClose,
  onSuccess,
}: CreateDistributorModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreateDistributorForm>({
    company_name: '',
    territory: '',
    account_type: 'non-exclusive',
    contact_email: '',
    phone: '',
    address: '',
    create_first_user: true,
    user_email: '',
    user_full_name: '',
    user_company_role: 'admin',
    send_invitation: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (formData.create_first_user && !formData.user_email) {
        toast({
          title: 'Validation Error',
          description: 'User email is required when creating first user',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('🏢 Creating distributor company...', formData);

      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session - please log in again');
      }

      // Call Edge Function to create distributor
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-distributor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          // Field names must match Edge Function expectations
          email: formData.create_first_user ? formData.user_email : formData.contact_email,
          fullName: formData.create_first_user ? formData.user_full_name : null,
          companyName: formData.company_name,
          territory: formData.territory,
          accountType: formData.account_type,
          sendWelcome: formData.create_first_user ? formData.send_invitation : false,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create distributor');
      }

      console.log('✅ Distributor created successfully:', result.data);

      toast({
        title: 'Success',
        description: formData.create_first_user && formData.send_invitation
          ? `Company created and invitation sent to ${formData.user_email}`
          : 'Company created successfully',
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('❌ Create distributor error:', error);

      toast({
        title: 'Error',
        description: error.message || 'Failed to create distributor company',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      territory: '',
      account_type: 'non-exclusive',
      contact_email: '',
      phone: '',
      address: '',
      create_first_user: true,
      user_email: '',
      user_full_name: '',
      user_company_role: 'admin',
      send_invitation: true,
    });
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Distributor Company</DialogTitle>
          <DialogDescription>
            Add a new distributor company to the portal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Company Information Section */}
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

            {/* First User Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create_first_user"
                  checked={formData.create_first_user}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, create_first_user: checked as boolean })
                  }
                  disabled={loading}
                />
                <Label htmlFor="create_first_user" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#00a8b5]" />
                    <span className="font-semibold">Create First User</span>
                  </div>
                </Label>
              </div>

              {formData.create_first_user && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  {/* User Email */}
                  <div className="space-y-2">
                    <Label htmlFor="user_email">
                      User Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={formData.user_email}
                      onChange={(e) =>
                        setFormData({ ...formData, user_email: e.target.value })
                      }
                      placeholder="john@company.com"
                      required={formData.create_first_user}
                      disabled={loading}
                    />
                  </div>

                  {/* User Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="user_full_name">Full Name</Label>
                    <Input
                      id="user_full_name"
                      value={formData.user_full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, user_full_name: e.target.value })
                      }
                      placeholder="John Smith"
                      disabled={loading}
                    />
                  </div>

                  {/* User Company Role */}
                  <div className="space-y-2">
                    <Label htmlFor="user_company_role">Role</Label>
                    <Select
                      value={formData.user_company_role}
                      onValueChange={(value: 'admin' | 'manager' | 'user') =>
                        setFormData({ ...formData, user_company_role: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Send Invitation */}
                  <div className="space-y-2 flex items-center">
                    <Checkbox
                      id="send_invitation"
                      checked={formData.send_invitation}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, send_invitation: checked as boolean })
                      }
                      disabled={loading}
                    />
                    <Label htmlFor="send_invitation" className="cursor-pointer ml-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Send invitation email</span>
                      </div>
                    </Label>
                  </div>
                </div>
              )}
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
                  Creating...
                </>
              ) : (
                'Create Company'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
