import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
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
  Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
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
import { toast } from 'sonner';
import { fetchCustomerById, deleteCustomer, Customer } from '../lib/api/customers';
import { fetchDevices, Device } from '../lib/api/devices';
import EditCustomerModal from './EditCustomerModal';
import AddDeviceModal from './AddDeviceModal';

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  prospect: { label: 'Prospect', color: 'bg-blue-100 text-blue-800' }
};

const deviceStatusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
  decommissioned: { label: 'Decommissioned', color: 'bg-red-100 text-red-800' }
};

export default function CustomerDetail() {
  const { customerId: id } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadDevices();
    }
  }, [id]);

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchCustomerById(id!);
      if (error) throw error;
      setCustomer(data);
    } catch (error: any) {
      toast.error('Failed to load customer', { description: error.message });
      navigate('/portal/customers');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const { data, error } = await fetchDevices(id);
      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      console.error('Failed to load devices:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { success, error } = await deleteCustomer(id!);
      if (!success) throw error;

      toast.success('Customer deleted successfully');
      navigate('/portal/customers');
    } catch (error: any) {
      toast.error('Failed to delete customer', { description: error.message });
    } finally {
      setDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCustomerUpdated = () => {
    loadCustomer();
    setIsEditModalOpen(false);
    toast.success('Customer updated successfully');
  };

  const handleDeviceAdded = () => {
    loadDevices();
    loadCustomer(); // Refresh device count
    setIsAddDeviceModalOpen(false);
    toast.success('Device added successfully');
  };

  const handleDeviceClick = (deviceId: string) => {
    navigate(`/portal/customers/${id}/devices/${deviceId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
        <Button onClick={() => navigate('/portal/customers')} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => navigate('/portal/customers')}
          className="hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </button>
        <span>/</span>
        <span className="text-slate-900">{customer.company_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-[#00a8b5]/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-[#00a8b5]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {customer.company_name}
              </h1>
              <Badge className={statusConfig[customer.status].color}>
                {statusConfig[customer.status].label}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              {customer.contact_name || 'No contact assigned'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-1 space-y-6">
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
                    className="text-sm text-[#00a8b5] hover:underline"
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
              {!customer.contact_email && !customer.contact_phone && !customer.address && (
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Devices ({devices.length})</CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddDeviceModalOpen(true)}
                className="bg-[#00a8b5] hover:bg-[#008a95]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Device
              </Button>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-8">
                  <Cpu className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-3">No devices registered yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddDeviceModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Device
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      onClick={() => handleDeviceClick(device.id)}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Cpu className="h-5 w-5 text-slate-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900 truncate">
                            {device.device_name}
                          </h4>
                          <Badge
                            className={`text-xs ${
                              deviceStatusConfig[device.status]?.color || 'bg-gray-100'
                            }`}
                          >
                            {deviceStatusConfig[device.status]?.label || device.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                          <span className="font-mono">{device.serial_number}</span>
                          {device.device_model && (
                            <>
                              <span>|</span>
                              <span>{device.device_model}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Warranty Status */}
                        {device.warranty_expiry && (
                          <>
                            {isWarrantyExpired(device.warranty_expiry) ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">Warranty Expired</span>
                              </div>
                            ) : isWarrantyExpiringSoon(device.warranty_expiry) ? (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <Clock className="h-4 w-4" />
                                <span className="text-xs">Expiring Soon</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-600">
                                <Shield className="h-4 w-4" />
                                <span className="text-xs">Under Warranty</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Document Count */}
                        {device.document_count !== undefined && device.document_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {device.document_count}
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeviceClick(device.id);
                          }}
                          className="text-[#00a8b5] hover:text-[#008a95] hover:bg-[#00a8b5]/10"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        customer={customer}
        onSuccess={handleCustomerUpdated}
      />

      {/* Add Device Modal */}
      <AddDeviceModal
        open={isAddDeviceModalOpen}
        onOpenChange={setIsAddDeviceModalOpen}
        customerId={id!}
        onSuccess={handleDeviceAdded}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customer.company_name}</strong>?
              {devices.length > 0 && (
                <span className="block mt-2 text-red-600">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  This will also delete {devices.length} device{devices.length !== 1 ? 's' : ''} and
                  all associated documents.
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
