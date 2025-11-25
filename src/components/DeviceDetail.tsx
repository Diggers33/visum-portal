import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MoreVertical,
  Upload,
  Download,
  Share2,
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
  ExternalLink,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchDeviceById, deleteDevice, Device } from '../lib/api/devices';
import {
  fetchDeviceDocuments,
  deleteDocument,
  shareWithCustomer,
  getDocumentTypeLabel,
  formatFileSize,
  DeviceDocument,
} from '../lib/api/device-documents';
import EditDeviceModal from './EditDeviceModal';
import UploadDocumentModal from './UploadDocumentModal';
import DocumentHistoryModal from './DocumentHistoryModal';

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

export default function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [documents, setDocuments] = useState<DeviceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DeviceDocument | null>(null);
  const [deleteDeviceDialogOpen, setDeleteDeviceDialogOpen] = useState(false);
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DeviceDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Selected documents for bulk actions
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const loadDevice = async () => {
    if (!deviceId) return;
    setLoading(true);
    const { data, error } = await fetchDeviceById(deviceId);
    if (error) {
      toast.error('Failed to load device');
      navigate(-1);
    } else {
      setDevice(data);
    }
    setLoading(false);
  };

  const loadDocuments = async () => {
    if (!deviceId) return;
    setDocumentsLoading(true);
    const { data, error } = await fetchDeviceDocuments(deviceId);
    if (error) {
      toast.error('Failed to load documents');
    } else {
      setDocuments(data || []);
    }
    setDocumentsLoading(false);
  };

  useEffect(() => {
    loadDevice();
    loadDocuments();
  }, [deviceId]);

  const handleDeleteDevice = async () => {
    if (!device) return;
    setDeleting(true);
    const { error } = await deleteDevice(device.id);
    if (error) {
      toast.error('Failed to delete device', { description: error.message });
    } else {
      toast.success('Device deleted successfully');
      navigate(-1);
    }
    setDeleting(false);
    setDeleteDeviceDialogOpen(false);
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    const { error } = await deleteDocument(docToDelete.id);
    if (error) {
      toast.error('Failed to delete document', { description: error.message });
    } else {
      toast.success('Document deleted successfully');
      loadDocuments();
    }
    setDeleting(false);
    setDeleteDocDialogOpen(false);
    setDocToDelete(null);
  };

  const handleToggleShare = async (doc: DeviceDocument) => {
    const { error } = await shareWithCustomer(doc.id, !doc.shared_with_customer);
    if (error) {
      toast.error('Failed to update sharing', { description: error.message });
    } else {
      toast.success(doc.shared_with_customer ? 'Document unshared' : 'Document shared with customer');
      loadDocuments();
    }
  };

  const handleBulkShare = async (share: boolean) => {
    const promises = Array.from(selectedDocs).map(id => shareWithCustomer(id, share));
    await Promise.all(promises);
    toast.success(`${selectedDocs.size} documents ${share ? 'shared' : 'unshared'}`);
    setSelectedDocs(new Set());
    loadDocuments();
  };

  const toggleDocSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const selectAllDocs = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
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
  const StatusIcon = device ? statusConfig[device.status].icon : CheckCircle;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
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
              <Badge className={statusConfig[device.status].color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[device.status].label}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              Serial: {device.serial_number}
              {device.customer_name && (
                <>
                  {' '}&bull;{' '}
                  <Link
                    to={`/portal/customers/${device.customer_id}`}
                    className="text-[#00a8b5] hover:underline"
                  >
                    {device.customer_name}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDeviceDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
              <Badge variant="secondary">{documents.length}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              {selectedDocs.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkShare(true)}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share Selected ({selectedDocs.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkShare(false)}
                  >
                    Unshare Selected
                  </Button>
                </>
              )}
              <Button onClick={() => setUploadModalOpen(true)} className="bg-[#00a8b5] hover:bg-[#008a95]">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No documents uploaded yet</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setUploadModalOpen(true)}
              >
                Upload First Document
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-600">
                <Checkbox
                  checked={selectedDocs.size === documents.length}
                  onCheckedChange={selectAllDocs}
                />
                <div className="flex-1">Document</div>
                <div className="w-32">Type</div>
                <div className="w-20">Version</div>
                <div className="w-24">Size</div>
                <div className="w-24">Shared</div>
                <div className="w-20">Actions</div>
              </div>

              {/* Document rows */}
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg border hover:bg-slate-50 transition-colors ${
                    doc.status === 'superseded' ? 'opacity-60' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedDocs.has(doc.id)}
                    onCheckedChange={() => toggleDocSelection(doc.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{doc.title}</span>
                      {doc.is_latest && (
                        <Badge variant="outline" className="text-xs">Latest</Badge>
                      )}
                      {doc.status === 'superseded' && (
                        <Badge variant="secondary" className="text-xs">Superseded</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{doc.file_name}</p>
                  </div>
                  <div className="w-32">
                    <Badge className={documentTypeColors[doc.document_type] || 'bg-gray-100 text-gray-800'}>
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                  </div>
                  <div className="w-20 text-sm text-slate-600">v{doc.version}</div>
                  <div className="w-24 text-sm text-slate-600">{formatFileSize(doc.file_size)}</div>
                  <div className="w-24">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleShare(doc)}
                      className={doc.shared_with_customer ? 'text-green-600' : 'text-slate-400'}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      {doc.shared_with_customer ? 'Yes' : 'No'}
                    </Button>
                  </div>
                  <div className="w-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={doc.file_url} download={doc.file_name}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedDocument(doc);
                            setHistoryModalOpen(true);
                          }}
                        >
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            setDocToDelete(doc);
                            setDeleteDocDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Device Modal */}
      <EditDeviceModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        device={device}
        onSuccess={() => {
          setEditModalOpen(false);
          loadDevice();
          toast.success('Device updated successfully');
        }}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        deviceId={device.id}
        deviceName={device.device_name}
        onSuccess={() => {
          setUploadModalOpen(false);
          loadDocuments();
        }}
      />

      {/* Document History Modal */}
      <DocumentHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        document={selectedDocument}
      />

      {/* Delete Device Confirmation */}
      <AlertDialog open={deleteDeviceDialogOpen} onOpenChange={setDeleteDeviceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{device.device_name}"?
              {documents.length > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  This will also delete {documents.length} associated document(s).
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={deleteDocDialogOpen} onOpenChange={setDeleteDocDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{docToDelete?.title}"?
              This will also remove the file from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
