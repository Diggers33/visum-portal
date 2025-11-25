import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Download,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Calendar,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  FileDown,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAvailableReleases,
  logReleaseDownload,
  getPendingUpdatesCount,
  getReleaseTypeLabel,
  getReleaseTypes,
  formatFileSize,
  type SoftwareRelease,
} from '../lib/api/software-releases';
import { getCurrentDistributorId } from '../lib/api/distributor-content';

export default function SoftwareUpdates() {
  const [releases, setReleases] = useState<SoftwareRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pendingCount, setPendingCount] = useState(0);

  const releaseTypes = getReleaseTypes();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get current distributor ID
      const distributorId = await getCurrentDistributorId();
      if (!distributorId) {
        console.error('No distributor ID found for current user');
        toast.error('Unable to identify your distributor account');
        setLoading(false);
        return;
      }

      // Load available releases for this distributor
      const { data, error } = await fetchAvailableReleases(distributorId);
      if (error) {
        console.error('Error loading releases:', error);
        toast.error('Failed to load software releases');
      } else {
        setReleases(data || []);
      }

      // Load pending updates count
      const { count } = await getPendingUpdatesCount(distributorId);
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (release: SoftwareRelease) => {
    try {
      // 1. Log the download FIRST
      console.log('[RELEASES] Logging download for release:', release.id);
      const { success, error } = await logReleaseDownload(release.id);

      if (error) {
        console.error('[RELEASES] Failed to log download:', error);
      } else {
        console.log('[RELEASES] Download logged successfully');
      }

      // 2. Then trigger the actual download
      window.open(release.file_url, '_blank');
      toast.success(`Downloading ${release.name} v${release.version}`);
    } catch (error) {
      console.error('[RELEASES] Download error:', error);
      // Still allow download even if logging fails
      window.open(release.file_url, '_blank');
      toast.success(`Downloading ${release.name} v${release.version}`);
    }
  };

  // Filter releases
  const filteredReleases = releases.filter((release) => {
    const matchesSearch =
      !searchQuery ||
      release.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || release.release_type === typeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Software Updates</h1>
          <p className="text-[16px] text-slate-600">
            Download firmware, software, and driver updates for your devices
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Available Releases</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{releases.length}</div>
            <p className="text-xs text-slate-500 mt-1">Ready to download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Updates</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-xs text-slate-500 mt-1">Devices need updating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Latest Release</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900">
              {releases[0]?.name || 'None'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {releases[0]?.release_date
                ? new Date(releases[0].release_date).toLocaleDateString()
                : 'No releases yet'}
            </p>
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
                  placeholder="Search by name, version, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-48">
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
          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
            <span>
              Showing {filteredReleases.length} of {releases.length} releases
            </span>
            {(typeFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
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
          {filteredReleases.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No releases found</p>
              <p className="text-sm">Check back later for new software updates</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Release</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReleases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{release.name}</p>
                        {release.description && (
                          <p className="text-sm text-slate-500 truncate max-w-xs">
                            {release.description}
                          </p>
                        )}
                        {release.is_mandatory && (
                          <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                            Mandatory Update
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{release.version}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getReleaseTypeLabel(release.release_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{release.product_name || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatFileSize(release.file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {release.release_date
                        ? new Date(release.release_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(release)}
                        className="bg-[#00a8b5] hover:bg-[#008a95]"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">How to install updates</p>
              <p className="text-sm text-blue-700 mt-1">
                Download the release file and follow the installation instructions in the release
                notes. After installation, mark the device as updated in the device details page to
                track compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
