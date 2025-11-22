import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Mail, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteUserFormProps {
  distributorId: string;
  distributorName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface InviteUserData {
  email: string;
  full_name: string;
  company_role: 'admin' | 'manager' | 'user';
  send_invitation: boolean;
}

export default function InviteUserForm({
  distributorId,
  distributorName,
  onSuccess,
  onCancel,
}: InviteUserFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<InviteUserData>({
    email: '',
    full_name: '',
    company_role: 'user',
    send_invitation: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      if (!formData.email || !formData.email.includes('@')) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('👤 Inviting user to company...', {
        distributorId,
        ...formData,
      });

      // Call Edge Function to create user
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-distributor-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          distributor_id: distributorId,
          email: formData.email,
          full_name: formData.full_name || null,
          company_role: formData.company_role,
          send_invitation: formData.send_invitation,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add user');
      }

      console.log('✅ User added successfully:', result.data);

      toast({
        title: 'Success',
        description: formData.send_invitation
          ? `User added and invitation sent to ${formData.email}`
          : `User added successfully`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('❌ Add user error:', error);

      toast({
        title: 'Error',
        description: error.message || 'Failed to add user to company',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#00a8b5]" />
          <h3 className="text-lg font-semibold">Add User to {distributorName}</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="user_email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="user_email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@company.com"
            required
            disabled={loading}
          />
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="user_full_name">Full Name</Label>
          <Input
            id="user_full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Smith"
            disabled={loading}
          />
        </div>

        {/* Send Invitation Checkbox */}
        <div className="space-y-2 flex items-end col-span-1 md:col-span-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="send_invitation"
              checked={formData.send_invitation}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, send_invitation: checked as boolean })
              }
              disabled={loading}
            />
            <Label htmlFor="send_invitation" className="cursor-pointer">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Send invitation email</span>
              </div>
            </Label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
              Adding User...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
