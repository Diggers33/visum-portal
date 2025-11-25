import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  HardDrive,
  FileText,
  Loader2,
  RefreshCw,
  ExternalLink,
  Calendar,
  TrendingUp,
  Eye,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { formatFileSize } from '../../lib/api/device-documents';

interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  status: 'active' | 'inactive' | 'prospect';
  city: string | null;
  country: string | null;
  created_at: string;
  distributor_id: string;
  distributor?: {
    id: string;
    company_name: string;
    territory: string;
  };
  devices?: Device[];
  device_count?: number;
}

interface Device {
  id: string;
  device_name: string;
  serial_number: string;
  device_model: string | null;
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  warranty_expiry: string | null;
  document_count?: number;
}

interface DeviceDocument {
  id: string;
  title: string;
  file_name: string;
  file_size: number | null;
  document_type: string;
  version: string;
  created_at: string;
  file_url: string;
}

interface Distributor {
  id: string;
  company_name: string;
  territory: string;
}

interface Stats {
  totalCustomers: number;
  totalDevices: number;
  documentsThisMonth: number;
  topDistributors: { name: string; count: number }[];
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  prospect: { label: 'Prospect', color: 'bg-blue-100 text-blue-800' },
};

const deviceStatusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
  decommissioned: { label: 'Decommissioned', color: 'bg-red-100 text-red-800' },
};

export default function AdminCustomerOverview() {
  const navigate = useNavigate();

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalDevices: 0,
    documentsThisMonth: 0,
    topDistributors: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [distributorFilter, setDistributorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Expanded rows
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [loadingDevices, setLoadingDevices] = useState<Set<string>>(new Set());

  // Documents modal
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceDocuments, setDeviceDocuments] = useState<DeviceDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCustomers(),
        loadDistributors(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        distributor:distributors(
          id,
          company_name,
          territory
        )
      `)
      .order('company_name');

    if (error) {
      console.error('Error loading customers:', error);
      throw error;
    }

    // Get device counts for each customer
    const customerIds = data?.map(c => c.id) || [];
    if (customerIds.length > 0) {
      const { data: deviceCounts } = await supabase
        .from('devices')
        .select('customer_id')
        .in('customer_id', customerIds);

      const countMap = deviceCounts?.reduce((acc, d) => {
        acc[d.customer_id] = (acc[d.customer_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      data?.forEach(customer => {
        customer.device_count = countMap[customer.id] || 0;
      });
    }

    setCustomers(data || []);
  };

  const loadDistributors = async () => {
    const { data, error } = await supabase
      .from('distributors')
      .select('id, company_name, territory')
      .order('company_name');

    if (error) {
      console.error('Error loading distributors:', error);
      throw error;
    }

    setDistributors(data || []);
  };

  const loadStats = async () => {
    // Total customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Total devices
    const { count: deviceCount } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true });

    // Documents uploaded this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: docCount } = await supabase
      .from('device_documents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // Top distributors by customer count
    const { data: distributorStats } = await supabase
      .from('customers')
      .select('distributor_id, distributor:distributors(company_name)');

    const distributorCounts = distributorStats?.reduce((acc, c) => {
      const name = (c.distributor as any)?.company_name || 'Unknown';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const topDistributors = Object.entries(distributorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalCustomers: customerCount || 0,
      totalDevices: deviceCount || 0,
      documentsThisMonth: docCount || 0,
      topDistributors,
    });
  };

  const loadDevicesForCustomer = async (customerId: string) => {
    setLoadingDevices(prev => new Set(prev).add(customerId));

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('customer_id', customerId)
      .order('device_name');

    if (error) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
    } else {
      // Get document counts
      const deviceIds = data?.map(d => d.id) || [];
      if (deviceIds.length > 0) {
        const { data: docCounts } = await supabase
          .from('device_documents')
          .select('device_id')
          .in('device_id', deviceIds);

        const countMap = docCounts?.reduce((acc, d) => {
          acc[d.device_id] = (acc[d.device_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        data?.forEach(device => {
          device.document_count = countMap[device.id] || 0;
        });
      }

      setCustomers(prev =>
        prev.map(c =>
          c.id === customerId ? { ...c, devices: data || [] } : c
        )
      );
    }

    setLoadingDevices(prev => {
      const next = new Set(prev);
      next.delete(customerId);
      return next;
    });
  };

  const loadDocumentsForDevice = async (device: Device) => {
    setSelectedDevice(device);
    setDocumentsModalOpen(true);
    setLoadingDocuments(true);

    const { data, error } = await supabase
      .from('device_documents')
      .select('*')
      .eq('device_id', device.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } else {
      setDeviceDocuments(data || []);
    }

    setLoadingDocuments(false);
  };

  const toggleCustomerExpand = async (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      // Load devices if not already loaded
      const customer = customers.find(c => c.id === customerId);
      if (customer && !customer.devices) {
        await loadDevicesForCustomer(customerId);
      }
    }
    setExpandedCustomers(newExpanded);
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          customer.company_name.toLowerCase().includes(query) ||
          customer.contact_name?.toLowerCase().includes(query) ||
          customer.contact_email?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Distributor filter
      if (distributorFilter !== 'all' && customer.distributor_id !== distributorFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && customer.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [customers, searchQuery, distributorFilter, statusFilter]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Company Name',
      'Contact Name',
      'Contact Email',
      'Status',
      'City',
      'Country',
      'Distributor',
      'Territory',
      'Device Count',
      'Created At',
    ];

    const rows = filteredCustomers.map(c => [
      c.company_name,
      c.contact_name || '',
      c.contact_email || '',
      c.status,
      c.city || '',
      c.country || '',
      c.distributor?.company_name || '',
      c.distributor?.territory || '',
      c.device_count || 0,
      new Date(c.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredCustomers.length} customers to CSV`);
  };

  // Export to Excel (CSV with Excel-friendly format)
  const exportToExcel = () => {
    const headers = [
      'Company Name',
      'Contact Name',
      'Contact Email',
      'Status',
      'City',
      'Country',
      'Distributor',
      'Territory',
      'Device Count',
      'Created At',
    ];

    const rows = filteredCustomers.map(c => [
      c.company_name,
      c.contact_name || '',
      c.contact_email || '',
      c.status,
      c.city || '',
      c.country || '',
      c.distributor?.company_name || '',
      c.distributor?.territory || '',
      c.device_count || 0,
      new Date(c.created_at).toLocaleDateString(),
    ]);

    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join('\t'),
      ...rows.map(row =>
        row.map(cell => String(cell).replace(/\t/g, ' ')).join('\t')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-export-${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredCustomers.length} customers to Excel`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ef4444]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Overview</h1>
          <p className="text-slate-500 mt-1">
            Monitor all customers across all distributors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Customers
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalCustomers}</div>
            <p className="text-xs text-slate-500 mt-1">
              Across {distributors.length} distributors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Devices
            </CardTitle>
            <HardDrive className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalDevices}</div>
            <p className="text-xs text-slate-500 mt-1">
              Registered devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Documents This Month
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.documentsThisMonth}</div>
            <p className="text-xs text-slate-500 mt-1">
              Uploaded in {new Date().toLocaleString('default', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Top Distributors
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.topDistributors.slice(0, 3).map((dist, idx) => (
                <div key={dist.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate">
                    {idx + 1}. {dist.name}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {dist.count}
                  </Badge>
                </div>
              ))}
              {stats.topDistributors.length === 0 && (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by company name, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Distributor Filter */}
            <div className="w-full md:w-64">
              <Select value={distributorFilter} onValueChange={setDistributorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by distributor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Distributors</SelectItem>
                  {distributors.map((dist) => (
                    <SelectItem key={dist.id} value={dist.id}>
                      {dist.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters summary */}
          <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
            <span>Showing {filteredCustomers.length} of {customers.length} customers</span>
            {(searchQuery || distributorFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDistributorFilter('all');
                  setStatusFilter('all');
                }}
                className="text-[#ef4444] hover:text-[#dc2626]"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Distributor</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead className="text-center">Devices</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <>
                    {/* Customer Row */}
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleCustomerExpand(customer.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {loadingDevices.has(customer.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : expandedCustomers.has(customer.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{customer.company_name}</div>
                        {customer.city && customer.country && (
                          <div className="text-sm text-slate-500">
                            {customer.city}, {customer.country}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-900">{customer.contact_name || '-'}</div>
                        {customer.contact_email && (
                          <div className="text-sm text-slate-500">{customer.contact_email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[customer.status].color}>
                          {statusConfig[customer.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-900">
                          {customer.distributor?.company_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-600">
                          {customer.distributor?.territory || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {customer.device_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Devices */}
                    {expandedCustomers.has(customer.id) && customer.devices && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-slate-50 p-0">
                          <div className="p-4 pl-12">
                            <h4 className="text-sm font-medium text-slate-700 mb-3">
                              Devices ({customer.devices.length})
                            </h4>
                            {customer.devices.length === 0 ? (
                              <p className="text-sm text-slate-500">No devices registered</p>
                            ) : (
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-100">
                                      <TableHead>Device Name</TableHead>
                                      <TableHead>Serial Number</TableHead>
                                      <TableHead>Model</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Warranty</TableHead>
                                      <TableHead className="text-center">Documents</TableHead>
                                      <TableHead className="w-20">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customer.devices.map((device) => {
                                      const warrantyExpired = device.warranty_expiry
                                        ? new Date(device.warranty_expiry) < new Date()
                                        : false;

                                      return (
                                        <TableRow key={device.id}>
                                          <TableCell className="font-medium">
                                            {device.device_name}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">
                                            {device.serial_number}
                                          </TableCell>
                                          <TableCell>{device.device_model || '-'}</TableCell>
                                          <TableCell>
                                            <Badge className={deviceStatusConfig[device.status].color}>
                                              {deviceStatusConfig[device.status].label}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {device.warranty_expiry ? (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger>
                                                    <span className={warrantyExpired ? 'text-red-600' : 'text-green-600'}>
                                                      {warrantyExpired ? 'Expired' : 'Valid'}
                                                    </span>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    {new Date(device.warranty_expiry).toLocaleDateString()}
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            ) : (
                                              <span className="text-slate-400">N/A</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge variant="outline">
                                              {device.document_count || 0}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/admin/customers/${customer.id}/devices/${device.id}`);
                                              }}
                                            >
                                              <Eye className="h-4 w-4 mr-1" />
                                              View
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Documents Modal */}
      <Dialog open={documentsModalOpen} onOpenChange={setDocumentsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Device Documents
            </DialogTitle>
            <DialogDescription>
              {selectedDevice && (
                <>
                  Documents for <span className="font-medium">{selectedDevice.device_name}</span>
                  {' '}(SN: {selectedDevice.serial_number})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#ef4444]" />
              </div>
            ) : deviceDocuments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p>No documents found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deviceDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">
                          {doc.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          v{doc.version}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span>{doc.file_name}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
