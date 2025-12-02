import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  Trash2,
  MoreVertical,
  Mail,
  X,
  ChevronDown,
  Users,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
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
import { useToast } from '@/hooks/use-toast';
import {
  Distributor,
  DistributorUser,
  fetchDistributors,
  updateDistributor,
  getDistributorUsers,
  deleteDistributorUser,
  resendInvitation,
} from '@/lib/api/distributors';
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

export default function DistributorsManagement() {
  const location = useLocation();
  const { toast } = useToast();

  // State
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [isTerritoryPopoverOpen, setIsTerritoryPopoverOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Expanded rows state for tree view
  const [expandedDistributors, setExpandedDistributors] = useState<Set<string>>(new Set());

  // Manage Users Dialog
  const [isManageUsersDialogOpen, setIsManageUsersDialogOpen] = useState(false);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null);
  const [manageUsersLoading, setManageUsersLoading] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
  });

  // Delete User Confirmation Dialog
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Edit User Inline
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deleteDistributorId, setDeleteDistributorId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newDistributor, setNewDistributor] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    accountType: 'exclusive',
    partnerSince: '',
    notes: '',
    sendWelcome: false,
  });

  const selectedDistributor = distributors.find((d) => d.id === selectedDistributorId);

  // Load distributors on mount
  useEffect(() => {
    loadDistributors();
  }, []);

  // Open add dialog if navigated from quick action
  useEffect(() => {
    const state = location.state as { openAddDialog?: boolean };
    if (state?.openAddDialog) {
      setIsAddDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadDistributors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await fetchDistributors();

      if (error) {
        throw new Error(error.message || 'Failed to load distributors');
      }

      setDistributors(data || []);
    } catch (error: any) {
      console.error('❌ Error loading distributors:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load distributors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDistributorExpand = (distributorId: string) => {
    setExpandedDistributors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(distributorId)) {
        newSet.delete(distributorId);
      } else {
        newSet.add(distributorId);
      }
      return newSet;
    });
  };

  const handleAddDistributor = async () => {
    if (!newDistributor.companyName || !newDistributor.email || selectedTerritories.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
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
          email: newDistributor.email,
          fullName: newDistributor.contactName || null,
          companyName: newDistributor.companyName,
          territory: selectedTerritories.join(', '),
          accountType: newDistributor.accountType,
          sendWelcome: newDistributor.sendWelcome,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create distributor');
      }

      toast({
        title: 'Success',
        description: `${newDistributor.companyName} added successfully`,
      });

      // Reload distributors
      await loadDistributors();

      // Close dialog and reset form
      setIsAddDialogOpen(false);
      setNewDistributor({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        accountType: 'exclusive',
        partnerSince: '',
        notes: '',
        sendWelcome: false,
      });
      setSelectedTerritories([]);
    } catch (error: any) {
      console.error('❌ Add distributor error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add distributor',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (distributorId: string) => {
    const distributor = distributors.find((d) => d.id === distributorId);
    if (!distributor) return;

    const newStatus = distributor.status === 'active' ? 'inactive' : 'active';

    // Optimistic update
    setDistributors((prev) =>
      prev.map((d) => (d.id === distributorId ? { ...d, status: newStatus as any } : d))
    );

    try {
      const { error } = await updateDistributor(distributorId, {
        status: newStatus,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update status');
      }

      toast({
        title: 'Success',
        description: `${distributor.company_name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('❌ Toggle status error:', error);
      // Revert optimistic update
      setDistributors((prev) =>
        prev.map((d) => (d.id === distributorId ? { ...d, status: distributor.status } : d))
      );
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (distributorId: string) => {
    setDeleteDistributorId(distributorId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDistributorId) return;

    const distributor = distributors.find((d) => d.id === deleteDistributorId);
    if (!distributor) return;

    setIsDeleting(true);

    try {
      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session - please log in again');
      }

      // Use the distributor.id directly from the found distributor object
      const distributorIdToDelete = distributor.id;
      console.log('🗑️ Deleting distributor:', { id: distributorIdToDelete, name: distributor.company_name });

      // Call Edge Function to delete distributor
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-distributor`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ distributorId: distributorIdToDelete }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete distributor');
      }

      toast({
        title: 'Success',
        description: `${distributor.company_name} deleted successfully`,
      });

      setDeleteDistributorId(null);
      await loadDistributors();
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete distributor',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTerritory = (territory: string) => {
    setSelectedTerritories((prev) =>
      prev.includes(territory) ? prev.filter((t) => t !== territory) : [...prev, territory]
    );
  };

  const removeTerritory = (territory: string) => {
    setSelectedTerritories((prev) => prev.filter((t) => t !== territory));
  };

  const handleManageUsers = async (distributorId: string) => {
    setSelectedDistributorId(distributorId);
    setIsManageUsersDialogOpen(true);
    setManageUsersLoading(true);

    try {
      // Reload distributor users to get fresh data
      const { data, error } = await getDistributorUsers(distributorId);

      if (error) {
        throw new Error(error.message || 'Failed to load users');
      }

      // Update the distributor's users in state
      setDistributors((prev) =>
        prev.map((d) => (d.id === distributorId ? { ...d, users: data || [] } : d))
      );
    } catch (error: any) {
      console.error('❌ Load users error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setManageUsersLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !selectedDistributorId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session - please log in again');
      }

      // Call Edge Function to add user
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-distributor-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          distributor_id: selectedDistributorId,
          email: newUser.email,
          full_name: newUser.name,
          company_role: 'user',
          send_invitation: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add user');
      }

      toast({
        title: 'Success',
        description: `User ${newUser.name} added successfully`,
      });

      // Reload users for this distributor
      const { data } = await getDistributorUsers(selectedDistributorId);
      setDistributors((prev) =>
        prev.map((d) => (d.id === selectedDistributorId ? { ...d, users: data || [] } : d))
      );

      // Close dialog and reset form
      setIsAddUserDialogOpen(false);
      setNewUser({ name: '', email: '', role: 'user' });
    } catch (error: any) {
      console.error('❌ Add user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = (user: DistributorUser) => {
    setEditingUserId(user.id);
    setEditStatus(user.status);
  };

  const handleSaveEdit = async (userId: string) => {
    setSavingEdit(true);
    try {
      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session - please log in again');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-distributor-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId,
          status: editStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update user');
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setEditingUserId(null);

      // Refresh users for this distributor
      await handleManageUsers(selectedDistributorId!);
    } catch (error: any) {
      console.error('❌ Update user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleToggleUserStatus = async (userId: string) => {
    if (!selectedDistributorId) return;

    const user = selectedDistributor?.users?.find((u) => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    // Optimistic update
    setDistributors((prev) =>
      prev.map((d) =>
        d.id === selectedDistributorId
          ? {
              ...d,
              users: d.users?.map((u) => (u.id === userId ? { ...u, status: newStatus as any } : u)),
            }
          : d
      )
    );

    try {
      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session - please log in again');
      }

      // Update user via API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-distributor-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update user status');
      }

      toast({
        title: 'Success',
        description: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('❌ Toggle user status error:', error);
      // Revert optimistic update
      setDistributors((prev) =>
        prev.map((d) =>
          d.id === selectedDistributorId
            ? {
                ...d,
                users: d.users?.map((u) => (u.id === userId ? { ...u, status: user.status } : u)),
              }
            : d
        )
      );
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedDistributorId || !deleteUserId) return;

    const user = selectedDistributor?.users?.find((u) => u.id === deleteUserId);

    setDeletingUser(true);
    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Call Edge Function to delete user (uses service role to bypass RLS)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-distributor-user`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: deleteUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast({
        title: 'Success',
        description: `User ${user?.full_name || user?.email} deleted`,
      });

      // Refetch users from database to get fresh data
      const { data: freshUsers, error: fetchError } = await getDistributorUsers(selectedDistributorId);

      if (fetchError) {
        console.error('❌ Failed to refresh users after deletion:', fetchError);
      } else {
        // Update state with fresh data from database
        setDistributors((prev) =>
          prev.map((d) =>
            d.id === selectedDistributorId
              ? { ...d, users: freshUsers || [] }
              : d
          )
        );
      }

      // Close the confirmation dialog
      setDeleteUserId(null);
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleResendInvitation = async (userId: string, userEmail: string) => {
    try {
      const { success, error } = await resendInvitation(userId);

      if (!success || error) {
        throw new Error(error?.message || 'Failed to resend invitation');
      }

      toast({
        title: 'Success',
        description: `Invitation sent to ${userEmail}`,
      });
    } catch (error: any) {
      console.error('❌ Resend invitation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const filteredDistributors = distributors.filter(
    (dist) =>
      dist.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dist.territory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dist.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Distributors</h1>
        <p className="text-[16px] text-[#6b7280]">Manage distributor accounts and access</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00a8b5] hover:bg-[#008a95] text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add New Distributor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Distributor</DialogTitle>
                <DialogDescription>
                  Create a new distributor account and set up their access
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={newDistributor.companyName}
                    onChange={(e) =>
                      setNewDistributor({ ...newDistributor, companyName: e.target.value })
                    }
                    placeholder="e.g., TechDist Global"
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactName">Contact Person Name *</Label>
                  <Input
                    id="contactName"
                    value={newDistributor.contactName}
                    onChange={(e) =>
                      setNewDistributor({ ...newDistributor, contactName: e.target.value })
                    }
                    placeholder="e.g., John Smith"
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newDistributor.email}
                    onChange={(e) =>
                      setNewDistributor({ ...newDistributor, email: e.target.value })
                    }
                    placeholder="contact@company.com"
                    disabled={isCreating}
                  />
                  <p className="text-[12px] text-[#6b7280]">This will be their login email</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newDistributor.phone}
                    onChange={(e) =>
                      setNewDistributor({ ...newDistributor, phone: e.target.value })
                    }
                    placeholder="+49 89 1234 5678"
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="territory">Country/Territory *</Label>
                  <Popover open={isTerritoryPopoverOpen} onOpenChange={setIsTerritoryPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                        disabled={isCreating}
                      >
                        {selectedTerritories.length === 0
                          ? 'Select territories...'
                          : `${selectedTerritories.length} ${
                              selectedTerritories.length === 1 ? 'country' : 'countries'
                            } selected`}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {availableTerritories.map((territory) => (
                          <div
                            key={territory}
                            className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded cursor-pointer"
                            onClick={() => toggleTerritory(territory)}
                          >
                            <Checkbox
                              checked={selectedTerritories.includes(territory)}
                              onCheckedChange={() => toggleTerritory(territory)}
                            />
                            <label className="text-[14px] cursor-pointer flex-1">
                              {territory}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Selected territories as badges */}
                  {selectedTerritories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTerritories.map((territory) => (
                        <Badge
                          key={territory}
                          variant="secondary"
                          className="bg-[#00a8b5]/10 text-[#00a8b5] hover:bg-[#00a8b5]/20"
                        >
                          {territory}
                          <button
                            type="button"
                            onClick={() => removeTerritory(territory)}
                            className="ml-1 hover:text-[#008a95]"
                            disabled={isCreating}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Account Type *</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="exclusive"
                        name="accountType"
                        value="exclusive"
                        checked={newDistributor.accountType === 'exclusive'}
                        onChange={(e) =>
                          setNewDistributor({ ...newDistributor, accountType: e.target.value })
                        }
                        className="w-4 h-4 text-[#00a8b5]"
                        disabled={isCreating}
                      />
                      <Label htmlFor="exclusive" className="font-normal cursor-pointer">
                        Exclusive
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="non-exclusive"
                        name="accountType"
                        value="non-exclusive"
                        checked={newDistributor.accountType === 'non-exclusive'}
                        onChange={(e) =>
                          setNewDistributor({ ...newDistributor, accountType: e.target.value })
                        }
                        className="w-4 h-4 text-[#00a8b5]"
                        disabled={isCreating}
                      />
                      <Label htmlFor="non-exclusive" className="font-normal cursor-pointer">
                        Non-exclusive
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendWelcome"
                    checked={newDistributor.sendWelcome}
                    onCheckedChange={(checked) =>
                      setNewDistributor({ ...newDistributor, sendWelcome: checked as boolean })
                    }
                    disabled={isCreating}
                  />
                  <Label htmlFor="sendWelcome" className="font-normal cursor-pointer">
                    Send welcome email to distributor
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDistributor}
                  className="bg-[#00a8b5] hover:bg-[#008a95]"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search distributors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>

          <Button
            variant="outline"
            onClick={loadDistributors}
            disabled={isLoading}
            className="border-slate-200"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Button variant="outline" className="border-slate-200">
          <Download className="mr-2 h-4 w-4" />
          Export List
        </Button>
      </div>

      {/* Filters Sidebar + Table */}
      <div className="flex gap-6">
        {/* Filters */}
        <Card className="w-64 h-fit border-slate-200 hidden lg:block">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Status</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="all" defaultChecked />
                  <Label htmlFor="all" className="text-[13px] font-normal cursor-pointer">
                    All ({distributors.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="active" />
                  <Label htmlFor="active" className="text-[13px] font-normal cursor-pointer">
                    Active ({distributors.filter((d) => d.status === 'active').length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="inactive" />
                  <Label htmlFor="inactive" className="text-[13px] font-normal cursor-pointer">
                    Inactive ({distributors.filter((d) => d.status === 'inactive').length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pending" />
                  <Label htmlFor="pending" className="text-[13px] font-normal cursor-pointer">
                    Pending ({distributors.filter((d) => d.status === 'pending').length})
                  </Label>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Account Type</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="exclusive-filter" defaultChecked />
                  <Label
                    htmlFor="exclusive-filter"
                    className="text-[13px] font-normal cursor-pointer"
                  >
                    Exclusive ({distributors.filter((d) => d.account_type === 'exclusive').length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="non-exclusive-filter" />
                  <Label
                    htmlFor="non-exclusive-filter"
                    className="text-[13px] font-normal cursor-pointer"
                  >
                    Non-exclusive (
                    {distributors.filter((d) => d.account_type === 'non-exclusive').length})
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="flex-1 border-slate-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor Name</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        No distributors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDistributors.map((distributor) => (
                      <React.Fragment key={distributor.id}>
                        {/* Distributor Row */}
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {distributor.users && distributor.users.length > 1 && (
                                <button
                                  onClick={() => toggleDistributorExpand(distributor.id)}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                >
                                  {expandedDistributors.has(distributor.id) ? (
                                    <ChevronDown className="h-4 w-4 text-slate-600" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                  )}
                                </button>
                              )}
                              {(!distributor.users || distributor.users.length === 1) && (
                                <div className="w-6" />
                              )}
                              <div>
                                <p className="font-medium text-slate-900">
                                  {distributor.company_name}
                                </p>
                                <p className="text-[12px] text-[#9ca3af]">
                                  {distributor.account_type === 'exclusive'
                                    ? 'Exclusive'
                                    : 'Non-exclusive'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {distributor.territory || 'Not specified'}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {distributor.users && distributor.users.length > 1 ? (
                              <span className="text-[#6b7280]">{distributor.users.length} users</span>
                            ) : distributor.users && distributor.users[0] ? (
                              distributor.users[0].email
                            ) : (
                              distributor.contact_email || 'No users'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                distributor.status === 'active'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                  : distributor.status === 'inactive'
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                              }
                            >
                              {distributor.status.charAt(0).toUpperCase() +
                                distributor.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[13px] text-[#6b7280]">
                            {formatCreatedDate(distributor.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Distributor
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageUsers(distributor.id)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Manage Users ({distributor.users?.length || 0})
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View as Distributor
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(distributor.id)}>
                                  {distributor.status === 'active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    distributor.users &&
                                    distributor.users[0] &&
                                    handleResendInvitation(
                                      distributor.users[0].id,
                                      distributor.users[0].email
                                    )
                                  }
                                  disabled={!distributor.users || distributor.users.length === 0}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Resend Welcome Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteClick(distributor.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* User Rows (only if expanded and has multiple users) */}
                        {expandedDistributors.has(distributor.id) &&
                          distributor.users &&
                          distributor.users.length > 1 &&
                          distributor.users.map((user) => (
                            <TableRow key={`user-${user.id}`} className="bg-slate-50/50">
                              <TableCell>
                                <div className="flex items-center gap-2 pl-10">
                                  <div className="w-px h-6 bg-slate-300 -ml-4 mr-2" />
                                  <div>
                                    <p className="text-[13px] text-slate-700">
                                      {user.full_name || 'No name'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-[12px] text-slate-500">—</TableCell>
                              <TableCell className="text-[13px]">{user.email}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    user.status === 'active'
                                      ? 'text-green-700 border-green-200'
                                      : 'text-slate-600 border-slate-200'
                                  }
                                >
                                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[12px] text-slate-400">—</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[12px] text-slate-500"
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage Users Dialog */}
      <Dialog open={isManageUsersDialogOpen} onOpenChange={setIsManageUsersDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[1400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Users - {selectedDistributor?.company_name}</DialogTitle>
            <DialogDescription>
              Add and manage user accounts for this distributor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {selectedDistributor?.users?.length || 0}{' '}
                {selectedDistributor?.users?.length === 1 ? 'user' : 'users'}
              </p>
              <Button
                size="sm"
                className="bg-[#00a8b5] hover:bg-[#008a95]"
                onClick={() => setIsAddUserDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>

            {/* Users Table */}
            {manageUsersLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDistributor?.users && selectedDistributor.users.length > 0 ? (
                      selectedDistributor.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {user.full_name || 'No name'}
                          </TableCell>
                          <TableCell className="text-[13px]">{user.email}</TableCell>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Select
                                value={editStatus}
                                onValueChange={(value: 'active' | 'pending' | 'inactive') =>
                                  setEditStatus(value)
                                }
                                disabled={savingEdit}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={
                                  user.status === 'active'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                }
                              >
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingUserId === user.id ? (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(user.id)}
                                  disabled={savingEdit}
                                  className="bg-[#00a8b5] hover:bg-[#008a95]"
                                >
                                  {savingEdit ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Save'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={savingEdit}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleUserStatus(user.id)}
                                >
                                  {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(user.id, user.email)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setDeleteUserId(user.id)}
                                  disabled={selectedDistributor?.users?.length === 1}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageUsersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog - Separate dialog to avoid nesting issues */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to {selectedDistributor?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Full Name *</Label>
              <Input
                id="userName"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="userEmail">Email Address *</Label>
              <Input
                id="userEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john.smith@company.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} className="bg-[#00a8b5] hover:bg-[#008a95]">
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDistributorId} onOpenChange={() => setDeleteDistributorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distributor Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this distributor company? This will permanently
              delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The company record</li>
                <li>All associated users</li>
                <li>All user accounts and access</li>
              </ul>
              <p className="mt-2 font-semibold text-red-600">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Company'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from the company? This will delete their account
              and they will no longer have access to the portal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
