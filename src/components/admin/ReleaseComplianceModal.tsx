import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  HardDrive,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getReleaseStats,
  getOutdatedDevices,
  getReleaseStatusColor,
  formatFileSize,
  type SoftwareRelease,
  type ReleaseStats,
} from '../../lib/api/software-releases';
import { supabase } from '../../lib/supabase';

interface ReleaseComplianceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: SoftwareRelease;
}

interface UpdatedDevice {
  id: string;
  device_name: string;
  serial_number: string;
  customer_name: string;
  installed_at: string;
  status: string;
}

interface OutdatedDevice {
  id: string;
  device_name: string;
  serial_number: string;
  device_model: string | null;
  current_firmware_version: string | null;
  current_software_version: string | null;
  customer: {
    company_name: string;
  } | null;
}

export default function ReleaseComplianceModal({
  open,
  onOpenChange,
  release,
}: ReleaseComplianceModalProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<ReleaseStats | null>(null);
  const [updatedDevices, setUpdatedDevices] = useState<UpdatedDevice[]>([]);
  const [outdatedDevices, setOutdatedDevices] = useState<OutdatedDevice[]>([]);
  const [loadingUpdated, setLoadingUpdated] = useState(false);
  const [loadingOutdated, setLoadingOutdated] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, release]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats
      const { data: statsData, error: statsError } = await getReleaseStats(release.id);
      if (statsError) throw statsError;
      setStats(statsData);

      // Load updated devices
      await loadUpdatedDevices();

      // Load outdated devices
      await loadOutdatedDevices();
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const loadUpdatedDevices = async () => {
    setLoadingUpdated(true);
    try {
      const { data, error } = await supabase
        .from('device_update_history')
        .select(`
          device_id,
          installed_at,
          status,
          device:devices(
            id,
            device_name,
            serial_number,
            customer:customers(company_name)
          )
        `)
        .eq('release_id', release.id)
        .order('installed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setUpdatedDevices(
        data?.map((d) => ({
          id: d.device_id,
          device_name: (d.device as any)?.device_name || 'Unknown',
          serial_number: (d.device as any)?.serial_number || '',
          customer_name: (d.device as any)?.customer?.company_name || 'Unknown',
          installed_at: d.installed_at,
          status: d.status,
        })) || []
      );
    } catch (error) {
      console.error('Error loading updated devices:', error);
    } finally {
      setLoadingUpdated(false);
    }
  };

  const loadOutdatedDevices = async () => {
    setLoadingOutdated(true);
    try {
      const { data, error } = await getOutdatedDevices(release.id);
      if (error) throw error;
      setOutdatedDevices(data || []);
    } catch (error) {
      console.error('Error loading outdated devices:', error);
    } finally {
      setLoadingOutdated(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'rolled_back':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'rolled_back':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Release Compliance</DialogTitle>
            <Badge className={getReleaseStatusColor(release.status)}>
              {release.status.charAt(0).toUpperCase() + release.status.slice(1)}
            </Badge>
          </div>
          <DialogDescription>
            {release.name} v{release.version} • {formatFileSize(release.file_size)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-slate-600">Downloads</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{stats?.total_downloads || 0}</span>
                    <span className="text-sm text-slate-500 ml-2">
                      ({stats?.unique_downloads || 0} unique)
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-slate-600">Installed</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-green-600">
                      {stats?.successful_installs || 0}
                    </span>
                    <span className="text-sm text-slate-500 ml-2">devices</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-slate-600">Pending</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-orange-600">
                      {outdatedDevices.length}
                    </span>
                    <span className="text-sm text-slate-500 ml-2">devices</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#00a8b5]" />
                    <span className="text-sm text-slate-600">Adoption</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-[#00a8b5]">
                      {stats?.install_percentage || 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            {(stats?.target_count || 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Installation Progress</span>
                  <span className="font-medium">
                    {stats?.successful_installs || 0} / {stats?.target_count || 0} devices
                  </span>
                </div>
                <Progress value={stats?.install_percentage || 0} className="h-2" />
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="updated" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Updated ({updatedDevices.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Pending ({outdatedDevices.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4" style={{ height: 'calc(90vh - 480px)' }}>
                {/* Updated Devices Tab */}
                <TabsContent value="updated" className="mt-0">
                  {loadingUpdated ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                    </div>
                  ) : updatedDevices.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <CheckCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                      <p>No devices have installed this release yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Installed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {updatedDevices.map((device, index) => (
                          <TableRow key={`${device.id}-${index}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-slate-400" />
                                <div>
                                  <div className="font-medium">{device.device_name}</div>
                                  <div className="text-xs text-slate-500">
                                    SN: {device.serial_number}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{device.customer_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(device.status)}
                                <Badge className={getStatusBadgeColor(device.status)}>
                                  {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {formatDate(device.installed_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Pending Devices Tab */}
                <TabsContent value="pending" className="mt-0">
                  {loadingOutdated ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
                    </div>
                  ) : outdatedDevices.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-4" />
                      <p className="text-green-600 font-medium">All devices are up to date!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Current Version</TableHead>
                          <TableHead>Model</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outdatedDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-orange-500" />
                                <div>
                                  <div className="font-medium">{device.device_name}</div>
                                  <div className="text-xs text-slate-500">
                                    SN: {device.serial_number}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {device.customer?.company_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {release.release_type === 'firmware'
                                  ? device.current_firmware_version || 'N/A'
                                  : device.current_software_version || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {device.device_model || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
