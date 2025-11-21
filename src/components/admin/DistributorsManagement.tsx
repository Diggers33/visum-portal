'use client';

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { resendInvitation } from '@/lib/api/distributors';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Mail,
  X,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw
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
} from '../ui/dialog';
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
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '@/hooks/use-toast';

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

interface Distributor {
  id: string;
  company_name: string;
  full_name: string;
  email: string;
  territory?: string;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  last_login?: string;
  account_type?: string;
}

// Error types matching backend
enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  USER_EXISTS = 'USER_ALREADY_EXISTS',
  AUTH_FAILED = 'AUTH_CREATION_FAILED',
  DATABASE_FAILED = 'DATABASE_INSERT_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  UNKNOWN = 'UNKNOWN_ERROR'
}

interface ApiError {
  success: false;
  errorType: ErrorType;
  error: string;
  details?: string;
}

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co');

export default function DistributorsManagement() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [isTerritoryPopoverOpen, setIsTerritoryPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'pending', 'inactive']);
  const [accountTypeFilter, setAccountTypeFilter] = useState<string[]>(['exclusive', 'non-exclusive']);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [newDistributor, setNewDistributor] = useState({
    companyName: '',
    fullName: '',
    email: '',
    accountType: 'exclusive',
    sendWelcome: false,
  });

  const [editDistributor, setEditDistributor] = useState<Distributor | null>(null);
  const [editTerritories, setEditTerritories] = useState<string[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);

  useEffect(() => {
    fetchDistributors();
  }, []);

  // Open add dialog if navigated from quick action
  useEffect(() => {
    const state = location.state as { openAddDialog?: boolean };
    if (state?.openAddDialog) {
      setIsAddDialogOpen(true);
      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchDistributors = async () => {
    setIsLoading(true);
    setOperationError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'distributor')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDistributors(data || []);
    } catch (error: any) {
      console.error('Error fetching distributors:', error);
      setOperationError('Failed to load distributors. Please refresh the page.');
      toast({
        title: 'Error',
        description: 'Failed to load distributors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDistributor = async () => {
    // Reset errors
    setOperationError(null);

    // Validation
    if (!newDistributor.companyName || !newDistributor.fullName || !newDistributor.email || selectedTerritories.length === 0) {
      setOperationError('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newDistributor.email)) {
      setOperationError('Please enter a valid email address');
      return;
    }

    setIsCreating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/create-distributor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          companyName: newDistributor.companyName.trim(),
          fullName: newDistributor.fullName.trim(),
          email: newDistributor.email.trim(),
          territory: selectedTerritories.join(', '),
          accountType: newDistributor.accountType,
          sendWelcome: newDistributor.sendWelcome,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        const apiError = result as ApiError;
        
        // Handle specific error types
        switch (apiError.errorType) {
          case ErrorType.USER_EXISTS:
            setOperationError(`A distributor with email ${newDistributor.email} already exists`);
            break;
          case ErrorType.VALIDATION:
            setOperationError(apiError.details || apiError.error);
            break;
          case ErrorType.CONSTRAINT_VIOLATION:
            setOperationError('Invalid data provided. Please check all required fields.');
            break;
          case ErrorType.AUTH_FAILED:
            setOperationError('Failed to create user account. Please try again.');
            break;
          default:
            setOperationError(apiError.error);
        }
        
        throw new Error(apiError.error);
      }

      // Success! Refresh list from server
      await fetchDistributors();

      // Close dialog and reset form
      setIsAddDialogOpen(false);
      setNewDistributor({
        companyName: '',
        fullName: '',
        email: '',
        accountType: 'exclusive',
        sendWelcome: false,
      });
      setSelectedTerritories([]);
      setOperationError(null);

      toast({
        title: 'Success',
        description: result.message,
      });
    } catch (error: any) {
      console.error('Error adding distributor:', error);
      // Error message already set above
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (distributor: Distributor) => {
    setEditDistributor(distributor);
    setEditTerritories(distributor.territory ? distributor.territory.split(', ') : []);
    setOperationError(null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateDistributor = async () => {
    if (!editDistributor) return;

    setOperationError(null);

    if (!editDistributor.company_name || !editDistributor.full_name || !editDistributor.email || editTerritories.length === 0) {
      setOperationError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(`${EDGE_FUNCTIONS_URL}/update-distributor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          id: editDistributor.id,
          companyName: editDistributor.company_name.trim(),
          fullName: editDistributor.full_name.trim(),
          email: editDistributor.email.trim(),
          territory: editTerritories.join(', '),
          accountType: editDistributor.account_type,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setOperationError(result.error);
        throw new Error(result.error);
      }

      // Refresh from server
      await fetchDistributors();

      setIsEditDialogOpen(false);
      setOperationError(null);

      toast({
        title: 'Success',
        description: result.message,
      });
    } catch (error: any) {
      console.error('Error updating distributor:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (distributorId: string) => {
    const distributor = distributors.find((d) => d.id === distributorId);
    if (!distributor) return;

    const newStatus: 'active' | 'inactive' = distributor.status === 'active' ? 'inactive' : 'active';

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/update-distributor-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          id: distributorId,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh from server
      await fetchDistributors();

      toast({
        title: 'Success',
        description: `${distributor.company_name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (distributorId: string) => {
    const distributor = distributors.find((d) => d.id === distributorId);
    if (!distributor) return;

    try {
      console.log('🔄 Resending invitation to:', distributor.email);

      // Use local API instead of edge function
      const { success, error } = await resendInvitation(distributorId);

      if (!success) {
        throw new Error(error?.message || 'Failed to resend invitation');
      }

      toast({
        title: 'Success',
        description: `Invitation resent to ${distributor.email}`,
      });
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (distributorId: string) => {
    const distributor = distributors.find((d) => d.id === distributorId);
    if (!distributor) return;

    if (!confirm(`Are you sure you want to delete ${distributor.company_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/delete-distributor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          id: distributorId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh from server
      await fetchDistributors();

      toast({
        title: 'Success',
        description: `${distributor.company_name} deleted successfully`,
      });
    } catch (error: any) {
      console.error('Error deleting distributor:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete distributor',
        variant: 'destructive',
      });
    }
  };

  const toggleTerritory = (territory: string) => {
    setSelectedTerritories((prev) =>
      prev.includes(territory) ? prev.filter((t) => t !== territory) : [...prev, territory]
    );
  };

  const toggleEditTerritory = (territory: string) => {
    setEditTerritories((prev) =>
      prev.includes(territory) ? prev.filter((t) => t !== territory) : [...prev, territory]
    );
  };

  const removeTerritory = (territory: string) => {
    setSelectedTerritories((prev) => prev.filter((t) => t !== territory));
  };

  const removeEditTerritory = (territory: string) => {
    setEditTerritories((prev) => prev.filter((t) => t !== territory));
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleAccountTypeFilter = (type: string) => {
    setAccountTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const filteredDistributors = distributors.filter((dist) => {
    const matchesSearch = searchQuery === '' || 
      (dist.company_name && dist.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (dist.territory && dist.territory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (dist.email && dist.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter.includes(dist.status);
    const matchesAccountType = !dist.account_type || accountTypeFilter.includes(dist.account_type);

    return matchesSearch && matchesStatus && matchesAccountType;
  });

  const stats = {
    all: distributors.length,
    active: distributors.filter((d) => d.status === 'active').length,
    inactive: distributors.filter((d) => d.status === 'inactive').length,
    pending: distributors.filter((d) => d.status === 'pending').length,
    exclusive: distributors.filter((d) => d.account_type === 'exclusive').length,
    nonExclusive: distributors.filter((d) => d.account_type === 'non-exclusive').length,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Distributors</h1>
        <p className="text-[16px] text-[#6b7280]">Manage distributor accounts and access</p>
      </div>

      {/* Global Error Display */}
      {operationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{operationError}</AlertDescription>
        </Alert>
      )}

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          {/* Add New Distributor Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) setOperationError(null);
          }}>
            <Button 
              className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Distributor
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Distributor</DialogTitle>
                <DialogDescription>
                  Create a new distributor account. All fields marked with * are required.
                </DialogDescription>
              </DialogHeader>

              {operationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{operationError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
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
                  <Label htmlFor="fullName">
                    Contact Person Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={newDistributor.fullName}
                    onChange={(e) =>
                      setNewDistributor({ ...newDistributor, fullName: e.target.value })
                    }
                    placeholder="e.g., John Smith"
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
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
                  <Label htmlFor="territory">
                    Country/Territory <span className="text-red-500">*</span>
                  </Label>
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
                  <Label>
                    Account Type <span className="text-red-500">*</span>
                  </Label>
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

          {/* Search */}
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

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            onClick={fetchDistributors}
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
      </div>

      {/* Filters + Table */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <Card className="w-64 h-fit border-slate-200 hidden lg:block">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Status</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-active"
                    checked={statusFilter.includes('active')}
                    onCheckedChange={() => toggleStatusFilter('active')}
                  />
                  <Label htmlFor="status-active" className="text-[13px] font-normal cursor-pointer">
                    Active ({stats.active})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-inactive"
                    checked={statusFilter.includes('inactive')}
                    onCheckedChange={() => toggleStatusFilter('inactive')}
                  />
                  <Label
                    htmlFor="status-inactive"
                    className="text-[13px] font-normal cursor-pointer"
                  >
                    Inactive ({stats.inactive})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-pending"
                    checked={statusFilter.includes('pending')}
                    onCheckedChange={() => toggleStatusFilter('pending')}
                  />
                  <Label
                    htmlFor="status-pending"
                    className="text-[13px] font-normal cursor-pointer"
                  >
                    Pending ({stats.pending})
                  </Label>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Account Type</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclusive-filter"
                    checked={accountTypeFilter.includes('exclusive')}
                    onCheckedChange={() => toggleAccountTypeFilter('exclusive')}
                  />
                  <Label
                    htmlFor="exclusive-filter"
                    className="text-[13px] font-normal cursor-pointer"
                  >
                    Exclusive ({stats.exclusive})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="non-exclusive-filter"
                    checked={accountTypeFilter.includes('non-exclusive')}
                    onCheckedChange={() => toggleAccountTypeFilter('non-exclusive')}
                  />
                  <Label
                    htmlFor="non-exclusive-filter"
                    className="text-[13px] font-normal cursor-pointer"
                  >
                    Non-exclusive ({stats.nonExclusive})
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
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        No distributors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDistributors.map((distributor) => (
                      <TableRow key={distributor.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">
                              {distributor.company_name}
                            </p>
                            <p className="text-[12px] text-[#9ca3af]">
                              {distributor.account_type
                                ? distributor.account_type.charAt(0).toUpperCase() +
                                  distributor.account_type.slice(1)
                                : 'Not specified'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px]">
                          {distributor.territory || 'Not specified'}
                        </TableCell>
                        <TableCell className="text-[13px]">{distributor.email}</TableCell>
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
                          {formatDate(distributor.last_login)}
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
                              <DropdownMenuItem onClick={() => handleEditClick(distributor)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Distributor
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(distributor.id)}
                              >
                                {distributor.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResendInvitation(distributor.id)}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Resend Welcome Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(distributor.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setOperationError(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Distributor</DialogTitle>
            <DialogDescription>
              Update distributor account details. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          {operationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{operationError}</AlertDescription>
            </Alert>
          )}

          {editDistributor && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-companyName">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-companyName"
                  value={editDistributor.company_name}
                  onChange={(e) =>
                    setEditDistributor({ ...editDistributor, company_name: e.target.value })
                  }
                  placeholder="e.g., TechDist Global"
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-fullName">
                  Contact Person Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-fullName"
                  value={editDistributor.full_name}
                  onChange={(e) =>
                    setEditDistributor({ ...editDistributor, full_name: e.target.value })
                  }
                  placeholder="e.g., John Smith"
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editDistributor.email}
                  onChange={(e) =>
                    setEditDistributor({ ...editDistributor, email: e.target.value })
                  }
                  placeholder="contact@company.com"
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-territory">
                  Country/Territory <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                      disabled={isCreating}
                    >
                      {editTerritories.length === 0
                        ? 'Select territories...'
                        : `${editTerritories.length} ${
                            editTerritories.length === 1 ? 'country' : 'countries'
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
                          onClick={() => toggleEditTerritory(territory)}
                        >
                          <Checkbox
                            checked={editTerritories.includes(territory)}
                            onCheckedChange={() => toggleEditTerritory(territory)}
                          />
                          <label className="text-[14px] cursor-pointer flex-1">
                            {territory}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {editTerritories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTerritories.map((territory) => (
                      <Badge
                        key={territory}
                        variant="secondary"
                        className="bg-[#00a8b5]/10 text-[#00a8b5] hover:bg-[#00a8b5]/20"
                      >
                        {territory}
                        <button
                          type="button"
                          onClick={() => removeEditTerritory(territory)}
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
                <Label>
                  Account Type <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="edit-exclusive"
                      name="editAccountType"
                      value="exclusive"
                      checked={editDistributor.account_type === 'exclusive'}
                      onChange={(e) =>
                        setEditDistributor({ ...editDistributor, account_type: e.target.value })
                      }
                      className="w-4 h-4 text-[#00a8b5]"
                      disabled={isCreating}
                    />
                    <Label htmlFor="edit-exclusive" className="font-normal cursor-pointer">
                      Exclusive
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="edit-non-exclusive"
                      name="editAccountType"
                      value="non-exclusive"
                      checked={editDistributor.account_type === 'non-exclusive'}
                      onChange={(e) =>
                        setEditDistributor({ ...editDistributor, account_type: e.target.value })
                      }
                      className="w-4 h-4 text-[#00a8b5]"
                      disabled={isCreating}
                    />
                    <Label htmlFor="edit-non-exclusive" className="font-normal cursor-pointer">
                      Non-exclusive
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDistributor}
              className="bg-[#00a8b5] hover:bg-[#008a95]"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
