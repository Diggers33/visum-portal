import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  ArrowLeft,
  Download,
  Eye,
  History,
  FileText,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Loader2,
  Archive,
  RefreshCw,
  Building2,
  Users,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  getDocumentTypeLabel,
  formatFileSize,
} from '../../lib/api/device-documents';
import {
  getReleaseTypeLabel,
  formatFileSize as formatReleaseFileSize,
} from '../../lib/api/software-releases';

interface Device {
  id: string;
  device_name: string;
  serial_number: string;
  device_model: string | null;
  product_id: string | null;
  product_name: string | null;
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  customer_id: string;
  customer_name?: string;
  distributor_id?: string;
  distributor_name?: string;
  installation_date: string | null;
  warranty_expiry: string | null;
  location_description: string | null;
  current_firmware_version: string | null;
  current_software_version: string | null;
  last_update_date: string | null;
  internal_notes: string | null;
  created_at: string;
}

interface DeviceDocument {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number;
  document_type: string;
  version: string;
  shared_with_customer: boolean;
  created_at: string;
}

interface UpdateHistory {
  id: string;
  version_installed: string;
  release_name: string | null;
  installed_at: string;
  status: 'success' | 'failed' | 'rolled_back';
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800', icon: Clock },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  decommissioned: { label: 'Decommissioned', color: 'bg-red-100 text-red-800', icon: Archive },
};

const documentTypeColors: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-800',
  datasheet: 'bg-purple-100 text-purple-800',
  certificate: 'bg-green-100 text-green-800',
  calibration: 'bg-orange-100 text-orange-800',
  maintenance_report: 'bg-yellow-100 text-yellow-800',
  installation_guide: 'bg-cyan-100 text-cyan-800',
  custom: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function AdminDeviceDetail() {
  const { customerId, deviceId } = useParams<{ customerId: string; deviceId: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [documents, setDocuments] = useState<DeviceDocument[]>([]);
  const [updateHistory, setUpdateHistory] = useState<UpdateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (deviceId) {
      loadDevice();
      loadDocuments();
      loadUpdateHistory();
    }
  }, [deviceId]);

  const loadDevice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          customer:customers(id, company_name, distributor_id),
          product:products(name)
        `)
        .eq('id', deviceId)
        .single();

      if (error) throw error;

      // Get distributor name
      let distributorName = null;
      if (data?.customer?.distributor_id) {
        const { data: distData } = await supabase
          .from('distributors')
          .select('company_name')
          .eq('id', data.customer.distributor_id)
          .single();
        distributorName = distData?.company_name;
      }

      setDevice({
        ...data,
        customer_name: data?.customer?.company_name,
        distributor_id: data?.customer?.distributor_id,
        distributor_name: distributorName,
        product_name: data?.product?.name,
      });
    } catch (error: any) {
      console.error('Error loading device:', error);
      toast.error('Failed to load device');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('device_documents')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadUpdateHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('device_update_history')
        .select(`
          id,
          version_installed,
          installed_at,
          status,
          release:software_releases(name)
        `)
        .eq('device_id', deviceId)
        .order('installed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUpdateHistory(
        (data || []).map((h: any) => ({
          ...h,
          release_name: h.release?.name,
        }))
      );
    } catch (error) {
      console.error('Error loading update history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getWarrantyStatus = () => {
    if (!device?.warranty_expiry) return null;
    const expiry = new Date(device.warranty_expiry);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Warranty Expired', color: 'text-red-600', days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'text-yellow-600', days: daysUntilExpiry };
    }
    return { status: 'valid', label: 'Under Warranty', color: 'text-green-600', days: daysUntilExpiry };
  };

  const warrantyStatus = getWarrantyStatus();
  const StatusIcon = device ? statusConfig[device.status]?.icon || CheckCircle : CheckCircle;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ef4444]" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Device not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{device.device_name}</h1>
              <Badge className={statusConfig[device.status]?.color || 'bg-gray-100'}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[device.status]?.label || device.status}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              Serial: {device.serial_number}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-slate-500">
          Read-only View
        </Badge>
      </div>

      {/* Ownership Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to={`/admin/customers/${device.customer_id}`}
              className="text-lg font-semibold text-[#ef4444] hover:underline"
            >
              {device.customer_name || 'Unknown Customer'}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Distributor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {device.distributor_id ? (
              <Link
                to={`/admin/distributors`}
                className="text-lg font-semibold text-[#ef4444] hover:underline"
              >
                {device.distributor_name || 'Unknown Distributor'}
              </Link>
            ) : (
              <p className="text-slate-500">No distributor assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Product</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900">
              {device.product_name || 'Not specified'}
            </p>
            {device.device_model && (
              <p className="text-sm text-slate-500">Model: {device.device_model}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Warranty Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warrantyStatus ? (
              <>
                <p className={`text-lg font-semibold ${warrantyStatus.color}`}>
                  {warrantyStatus.label}
                </p>
                <p className="text-sm text-slate-500">
                  {warrantyStatus.status === 'expired'
                    ? `Expired ${warrantyStatus.days} days ago`
                    : `${warrantyStatus.days} days remaining`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Expires: {new Date(device.warranty_expiry!).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="text-slate-500">No warranty info</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              {device.location_description || 'Not specified'}
            </p>
            {device.installation_date && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Installed: {new Date(device.installation_date).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Software Version Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Software Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Current Firmware</p>
              <p className="text-lg font-semibold text-slate-900">
                {device.current_firmware_version || 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Current Software</p>
              <p className="text-lg font-semibold text-slate-900">
                {device.current_software_version || 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Last Updated</p>
              <p className="text-lg font-semibold text-slate-900">
                {device.last_update_date
                  ? new Date(device.last_update_date).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      {device.internal_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{device.internal_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
            <Badge variant="secondary">{documents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#ef4444]" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No documents uploaded</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Shared</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        <p className="text-sm text-slate-500">{doc.file_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={documentTypeColors[doc.document_type] || 'bg-gray-100 text-gray-800'}>
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>v{doc.version}</TableCell>
                    <TableCell className="text-slate-600">{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      <Badge variant={doc.shared_with_customer ? 'default' : 'secondary'}>
                        {doc.shared_with_customer ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Update History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#ef4444]" />
            </div>
          ) : updateHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No update history</p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {updateHistory.map((update) => (
                <div key={update.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        update.status === 'success'
                          ? 'bg-green-500'
                          : update.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {update.release_name || 'Unknown Release'} v{update.version_installed}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(update.installed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      update.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : update.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
