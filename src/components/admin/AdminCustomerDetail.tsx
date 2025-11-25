import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Cpu,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
  AlertTriangle,
  Shield,
  Clock,
  Users,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
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
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { AdminCustomer, fetchCustomerByIdAdmin } from '../../lib/api/customers';
import { fetchDevices, Device } from '../../lib/api/devices';
import { supabase } from '../../lib/supabase';
import { formatFileSize } from '../../lib/api/device-documents';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  prospect: { label: 'Prospect', color: 'bg-blue-100 text-blue-800' },
};

const deviceStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
  decommissioned: { label: 'Decommissioned', color: 'bg-red-100 text-red-800' },
};

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

export default function AdminCustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);

  // Document modal state
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceDocuments, setDeviceDocuments] = useState<DeviceDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
      loadDevices();
    }
  }, [customerId]);

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchCustomerByIdAdmin(customerId!);
      if (error) throw error;
      setCustomer(data);
    } catch (error: any) {
      toast.error('Failed to load customer', { description: error.message });
      navigate('/admin/customers');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const { data, error } = await fetchDevices(customerId);
      if (error) throw error;

      // Load document counts for each device
      if (data && data.length > 0) {
        const deviceIds = data.map((d) => d.id);
        const { data: docCounts } = await supabase
          .from('device_documents')
          .select('device_id')
          .in('device_id', deviceIds);

        const countMap =
          docCounts?.reduce((acc, d) => {
            acc[d.device_id] = (acc[d.device_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

        data.forEach((device) => {
          device.document_count = countMap[device.id] || 0;
        });
      }

      setDevices(data || []);
    } catch (error: any) {
      console.error('Failed to load devices:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  const loadDocumentsForDevice = async (device: Device) => {
    setSelectedDevice(device);
    setDocumentsModalOpen(true);
    setLoadingDocuments(true);

    try {
      const { data, error } = await supabase
        .from('device_documents')
        .select('*')
        .eq('device_id', device.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeviceDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isWarrantyExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return expiry.getTime() - now.getTime() < ninetyDays && expiry > now;
  };

  const isWarrantyExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Customer not found</h3>
        <Button onClick={() => navigate('/admin/customers')} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          to="/admin/customers"
          className="hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
        <span>/</span>
        <span className="text-slate-900">{customer.company_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-[#ef4444]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {customer.company_name}
              </h1>
              <Badge className={statusConfig[customer.status]?.color || ''}>
                {statusConfig[customer.status]?.label || customer.status}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              {customer.contact_name || 'No contact assigned'}
            </p>
          </div>
        </div>

        {/* Admin Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ef4444]/10 rounded-full">
          <div className="w-2 h-2 bg-[#ef4444] rounded-full" />
          <span className="text-[12px] font-medium text-[#ef4444]">READ-ONLY VIEW</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Distributor Info */}
          <Card className="border-l-4 border-l-[#ef4444]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-[#ef4444]" />
                Distributor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.distributor ? (
                <div>
                  <div className="font-medium text-slate-900">
                    {customer.distributor.company_name}
                  </div>
                  {customer.distributor.territory && (
                    <div className="text-sm text-slate-500 mt-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {customer.distributor.territory}
                    </div>
                  )}
                  <Link
                    to={`/admin/distributors`}
                    className="inline-flex items-center gap-1 text-sm text-[#ef4444] hover:underline mt-2"
                  >
                    View Distributor
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No distributor assigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a
                    href={`mailto:${customer.contact_email}`}
                    className="text-sm text-[#ef4444] hover:underline"
                  >
                    {customer.contact_email}
                  </a>
                </div>
              )}
              {customer.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a
                    href={`tel:${customer.contact_phone}`}
                    className="text-sm text-slate-600"
                  >
                    {customer.contact_phone}
                  </a>
                </div>
              )}
              {(customer.address || customer.city || customer.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="text-sm text-slate-600">
                    {customer.address && <div>{customer.address}</div>}
                    <div>
                      {[customer.city, customer.postal_code, customer.country]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                </div>
              )}
              {!customer.contact_email &&
                !customer.contact_phone &&
                !customer.address && (
                  <p className="text-sm text-slate-400 italic">No contact information</p>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Cpu className="h-4 w-4" />
                  <span className="text-sm">Devices</span>
                </div>
                <span className="text-lg font-semibold">{customer.device_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Documents</span>
                </div>
                <span className="text-lg font-semibold">{customer.document_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Customer Since</span>
                </div>
                <span className="text-sm text-slate-600">
                  {formatDate(customer.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {customer.internal_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {customer.internal_notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Devices Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Devices ({devices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#ef4444]" />
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-8">
                  <Cpu className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No devices registered</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Warranty</TableHead>
                      <TableHead className="text-center">Docs</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                              <Cpu className="h-4 w-4 text-slate-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {device.device_name}
                              </div>
                              {device.device_model && (
                                <div className="text-xs text-slate-500">
                                  {device.device_model}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{device.serial_number}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={deviceStatusConfig[device.status]?.color || ''}
                          >
                            {deviceStatusConfig[device.status]?.label || device.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {device.warranty_expiry ? (
                            <>
                              {isWarrantyExpired(device.warranty_expiry) ? (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="text-xs">Expired</span>
                                </div>
                              ) : isWarrantyExpiringSoon(device.warranty_expiry) ? (
                                <div className="flex items-center gap-1 text-yellow-600">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-xs">Expiring Soon</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Shield className="h-4 w-4" />
                                  <span className="text-xs">Valid</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{device.document_count || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadDocumentsForDevice(device)}
                            disabled={!device.document_count}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Docs
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
                  Documents for{' '}
                  <span className="font-medium">{selectedDevice.device_name}</span> (SN:{' '}
                  {selectedDevice.serial_number})
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
                    <Button variant="ghost" size="sm" asChild>
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
