import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  LayoutGrid,
  List,
  Filter,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Cpu,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { fetchCustomers, Customer, getCustomerStats, CustomerStats } from '../lib/api/customers';
import { supabase } from '../lib/supabase';
import AddCustomerModal from './AddCustomerModal';

type ViewMode = 'grid' | 'list';
type SortOption = 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc' | 'devices-desc';

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  prospect: { label: 'Prospect', color: 'bg-blue-100 text-blue-800' }
};

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [distributorId, setDistributorId] = useState<string | null>(null);

  // Get current user's distributor ID
  useEffect(() => {
    const getDistributorId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('distributor_id')
          .eq('id', user.id)
          .single();

        if (profile?.distributor_id) {
          setDistributorId(profile.distributor_id);
        }
      }
    };
    getDistributorId();
  }, []);

  // Fetch customers when distributor ID is available
  useEffect(() => {
    if (distributorId) {
      loadCustomers();
      loadStats();
    }
  }, [distributorId]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...customers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.company_name.toLowerCase().includes(query) ||
          c.contact_name?.toLowerCase().includes(query) ||
          c.contact_email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.company_name.localeCompare(b.company_name);
        case 'name-desc':
          return b.company_name.localeCompare(a.company_name);
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'devices-desc':
          return (b.device_count || 0) - (a.device_count || 0);
        default:
          return 0;
      }
    });

    setFilteredCustomers(result);
  }, [customers, searchQuery, statusFilter, sortOption]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchCustomers(distributorId || undefined);
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error('Failed to load customers', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const { data } = await getCustomerStats(distributorId || undefined);
    if (data) setStats(data);
  };

  const handleCustomerClick = (customerId: string) => {
    navigate(`/portal/customers/${customerId}`);
  };

  const handleCustomerCreated = () => {
    loadCustomers();
    loadStats();
    setIsAddModalOpen(false);
    toast.success('Customer created successfully');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortOption('name-asc');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">
            Manage your customer accounts and their devices
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#00a8b5] hover:bg-[#008a95]">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-sm text-slate-500">Total Customers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-slate-500">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.prospect}</div>
              <div className="text-sm text-slate-500">Prospects</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-600">{stats.total_devices}</div>
              <div className="text-sm text-slate-500">Total Devices</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="created-desc">Newest First</SelectItem>
            <SelectItem value="created-asc">Oldest First</SelectItem>
            <SelectItem value="devices-desc">Most Devices</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-[#00a8b5]' : ''}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-[#00a8b5]' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-slate-500">
        Showing {filteredCustomers.length} of {customers.length} customers
      </div>

      {/* Loading State */}
      {loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {customers.length === 0 ? 'No customers yet' : 'No customers found'}
          </h3>
          <p className="text-slate-500 mb-4">
            {customers.length === 0
              ? 'Get started by adding your first customer'
              : 'Try adjusting your search or filters'}
          </p>
          {customers.length === 0 && (
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#00a8b5] hover:bg-[#008a95]">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      )}

      {/* Grid View */}
      {!loading && filteredCustomers.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCustomerClick(customer.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#00a8b5]/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-[#00a8b5]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 line-clamp-1">
                        {customer.company_name}
                      </h3>
                      <Badge className={`text-xs ${statusConfig[customer.status].color}`}>
                        {statusConfig[customer.status].label}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>

                {customer.contact_name && (
                  <p className="text-sm text-slate-600 mb-2">{customer.contact_name}</p>
                )}

                <div className="space-y-1.5 text-sm text-slate-500">
                  {customer.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{customer.contact_email}</span>
                    </div>
                  )}
                  {customer.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{customer.contact_phone}</span>
                    </div>
                  )}
                  {(customer.city || customer.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {[customer.city, customer.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {customer.device_count || 0} device{(customer.device_count || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Added {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && filteredCustomers.length > 0 && viewMode === 'list' && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Company</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden lg:table-cell">Location</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Devices</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleCustomerClick(customer.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#00a8b5]/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-[#00a8b5]" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{customer.company_name}</div>
                        <div className="text-sm text-slate-500 md:hidden">
                          {customer.contact_name || customer.contact_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-sm">
                      {customer.contact_name && <div className="text-slate-900">{customer.contact_name}</div>}
                      {customer.contact_email && <div className="text-slate-500">{customer.contact_email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-500">
                    {[customer.city, customer.country].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="font-mono">
                      {customer.device_count || 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={statusConfig[customer.status].color}>
                      {statusConfig[customer.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        distributorId={distributorId || ''}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
}
