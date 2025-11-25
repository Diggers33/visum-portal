import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import {
  Package,
  MoreVertical,
  Search,
  Download,
  Edit,
  Trash2,
  Loader2,
  Eye,
  Plus,
  RefreshCw,
  Send,
  Archive,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Users,
  FileDown,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAllReleases,
  deleteRelease,
  publishRelease,
  deprecateRelease,
  getReleaseTypeLabel,
  getReleaseTypes,
  getReleaseStatusColor,
  getReleaseStatusLabel,
  formatFileSize,
  type SoftwareRelease,
  type ReleaseFilters,
} from '../../lib/api/software-releases';
import { supabase } from '../../lib/supabase';
import CreateReleaseModal from './CreateReleaseModal';
import EditReleaseModal from './EditReleaseModal';
import ReleaseComplianceModal from './ReleaseComplianceModal';

interface Product {
  id: string;
  name: string;
}

interface Stats {
  totalReleases: number;
  publishedThisMonth: number;
  totalDownloads: number;
  devicesPending: number;
}

export default function SoftwareReleasesManagement() {
  const [releases, setReleases] = useState<SoftwareRelease[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalReleases: 0,
    publishedThisMonth: 0,
    totalDownloads: 0,
    devicesPending: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isDeprecateDialogOpen, setIsDeprecateDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadReleases(), loadProducts(), loadStats()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadReleases = async () => {
    const filters: ReleaseFilters = {};
    if (statusFilter !== 'all') filters.status = statusFilter as any;
    if (typeFilter !== 'all') filters.release_type = typeFilter as any;
    if (productFilter !== 'all') filters.product_id = productFilter;
    if (searchQuery) filters.search = searchQuery;

    const { data, error } = await fetchAllReleases(filters);
    if (error) {
      console.error('Error loading releases:', error);
      throw error;
    }
    setReleases(data || []);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
    }
  };

  const loadStats = async () => {
    try {
      // Total releases
      const { count: totalReleases } = await supabase
        .from('software_releases')
        .select('id', { count: 'exact', head: true });

      // Published this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: publishedThisMonth } = await supabase
        .from('software_releases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', startOfMonth.toISOString());

      // Total downloads
      const { count: totalDownloads } = await supabase
        .from('software_release_downloads')
        .select('id', { count: 'exact', head: true });

      // Devices pending update (simple count of active devices)
      // In a real implementation, this would compare versions
      const { count: devicesPending } = await supabase
        .from('devices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalReleases: totalReleases || 0,
        publishedThisMonth: publishedThisMonth || 0,
        totalDownloads: totalDownloads || 0,
        devicesPending: devicesPending || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Filter releases based on search
  const filteredReleases = useMemo(() => {
    if (!searchQuery) return releases;
    const query = searchQuery.toLowerCase();
    return releases.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.version.toLowerCase().includes(query) ||
        r.product_name?.toLowerCase().includes(query)
    );
  }, [releases, searchQuery]);

  const handleRefresh = async () => {
    await loadData();
    toast.success('Data refreshed');
  };

  const handlePublish = async () => {
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      const { error } = await publishRelease(selectedRelease.id);
      if (error) throw error;
      toast.success(`"${selectedRelease.name}" has been published`);
      setIsPublishDialogOpen(false);
      setSelectedRelease(null);
      await loadReleases();
      await loadStats();
    } catch (error: any) {
      console.error('Error publishing release:', error);
      toast.error(error.message || 'Failed to publish release');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeprecate = async () => {
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      const { error } = await deprecateRelease(selectedRelease.id);
      if (error) throw error;
      toast.success(`"${selectedRelease.name}" has been deprecated`);
      setIsDeprecateDialogOpen(false);
      setSelectedRelease(null);
      await loadReleases();
    } catch (error: any) {
      console.error('Error deprecating release:', error);
      toast.error(error.message || 'Failed to deprecate release');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      const { error } = await deleteRelease(selectedRelease.id);
      if (error) throw error;
      toast.success(`"${selectedRelease.name}" has been deleted`);
      setIsDeleteDialogOpen(false);
      setSelectedRelease(null);
      await loadReleases();
      await loadStats();
    } catch (error: any) {
      console.error('Error deleting release:', error);
      toast.error(error.message || 'Failed to delete release');
    } finally {
      setActionLoading(false);
    }
  };

  const openPublishDialog = (release: SoftwareRelease) => {
    setSelectedRelease(release);
    setIsPublishDialogOpen(true);
  };

  const openDeprecateDialog = (release: SoftwareRelease) => {
    setSelectedRelease(release);
    setIsDeprecateDialogOpen(true);
  };

  const openDeleteDialog = (release: SoftwareRelease) => {
    setSelectedRelease(release);
    setIsDeleteDialogOpen(true);
  };

  const openEditModal = (release: SoftwareRelease) => {
    setSelectedRelease(release);
    setIsEditModalOpen(true);
  };

  const openComplianceModal = (release: SoftwareRelease) => {
    setSelectedRelease(release);
    setIsComplianceModalOpen(true);
  };

  const getTargetLabel = (release: SoftwareRelease) => {
    if (release.target_type === 'all') return 'All';
    if (release.target_type === 'distributors') {
      return `${release.target_count || 0} Distributors`;
    }
    return `${release.target_count || 0} Devices`;
  };

  const releaseTypes = getReleaseTypes();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Software Releases</h1>
          <p className="text-[16px] text-slate-600">
            Manage firmware, software, and driver releases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Release
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Releases</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalReleases}</div>
            <p className="text-xs text-slate-500 mt-1">
              {releases.filter((r) => r.status === 'published').length} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Published This Month</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.publishedThisMonth}</div>
            <p className="text-xs text-slate-500 mt-1">
              In {new Date().toLocaleString('default', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Downloads</CardTitle>
            <FileDown className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalDownloads}</div>
            <p className="text-xs text-slate-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Devices Pending</CardTitle>
            <HardDrive className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.devicesPending}</div>
            <p className="text-xs text-slate-500 mt-1">Need updates</p>
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
                  placeholder="Search by name or version..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="recalled">Recalled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-40">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {releaseTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Filter */}
            <div className="w-full md:w-48">
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters summary */}
          <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
            <span>
              Showing {filteredReleases.length} of {releases.length} releases
            </span>
            {(statusFilter !== 'all' || typeFilter !== 'all' || productFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setProductFilter('all');
                  setSearchQuery('');
                }}
                className="text-[#00a8b5] hover:text-[#008a95]"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Releases Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-center">Downloads</TableHead>
                <TableHead className="text-center">Installs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReleases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    No releases found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReleases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{release.name}</p>
                        <p className="text-[12px] text-slate-500">
                          {formatFileSize(release.file_size)}
                          {release.is_mandatory && (
                            <Badge className="ml-2 bg-red-100 text-red-700 text-[10px]">
                              Mandatory
                            </Badge>
                          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{release.version}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getReleaseTypeLabel(release.release_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{release.product_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        {release.target_type === 'all' ? (
                          <Users className="h-3 w-3 text-slate-400" />
                        ) : release.target_type === 'distributors' ? (
                          <Users className="h-3 w-3 text-blue-500" />
                        ) : (
                          <HardDrive className="h-3 w-3 text-green-500" />
                        )}
                        {getTargetLabel(release)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{release.download_count || 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{release.install_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getReleaseStatusColor(release.status)}>
                        {getReleaseStatusLabel(release.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(release)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {release.file_url && (
                            <DropdownMenuItem onClick={() => window.open(release.file_url, '_blank')}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openComplianceModal(release)}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            View Compliance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {release.status === 'draft' && (
                            <DropdownMenuItem onClick={() => openPublishDialog(release)}>
                              <Send className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {release.status === 'published' && (
                            <DropdownMenuItem onClick={() => openDeprecateDialog(release)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Deprecate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => openDeleteDialog(release)}
                            disabled={release.status === 'published'}
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
        </CardContent>
      </Card>

      {/* Create Release Modal */}
      <CreateReleaseModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        products={products}
        onSuccess={() => {
          loadReleases();
          loadStats();
        }}
      />

      {/* Edit Release Modal */}
      {selectedRelease && (
        <EditReleaseModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          release={selectedRelease}
          products={products}
          onSuccess={() => {
            loadReleases();
            setSelectedRelease(null);
          }}
        />
      )}

      {/* Compliance Modal */}
      {selectedRelease && (
        <ReleaseComplianceModal
          open={isComplianceModalOpen}
          onOpenChange={setIsComplianceModalOpen}
          release={selectedRelease}
        />
      )}

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Publish Release
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish "{selectedRelease?.name}" v{selectedRelease?.version}?
              <br />
              <br />
              Once published, distributors will be able to download and install this release.
              {selectedRelease?.notify_on_publish && (
                <span className="block mt-2 text-blue-600">
                  Notifications will be sent to targeted distributors.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deprecate Confirmation Dialog */}
      <AlertDialog open={isDeprecateDialogOpen} onOpenChange={setIsDeprecateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-yellow-600" />
              Deprecate Release
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deprecate "{selectedRelease?.name}" v{selectedRelease?.version}?
              <br />
              <br />
              Deprecated releases will still be visible but marked as outdated. Distributors will be
              encouraged to update to newer versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeprecate}
              disabled={actionLoading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deprecate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Release
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRelease?.name}" v{selectedRelease?.version}?
              <br />
              <br />
              This action cannot be undone. The release file will also be deleted from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
