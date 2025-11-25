import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Loader2, Upload, X, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadDeviceDocument,
  getDocumentTypes,
  formatFileSize,
  CreateDocumentInput,
} from '../lib/api/device-documents';

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'zip'];

export default function UploadDocumentModal({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  onSuccess
}: UploadDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'other' as CreateDocumentInput['document_type'],
    version: '1.0',
    shared_with_customer: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const documentTypes = getDocumentTypes();

  const resetForm = () => {
    setFile(null);
    setFormData({
      title: '',
      description: '',
      document_type: 'other',
      version: '1.0',
      shared_with_customer: false
    });
    setErrors({});
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type .${ext} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setErrors({ file: error });
      return;
    }
    setFile(selectedFile);
    setErrors({});
    // Auto-fill title from filename if empty
    if (!formData.title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setFormData({ ...formData, title: nameWithoutExt });
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [formData.title]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!file) {
      newErrors.file = 'Please select a file to upload';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.version.trim()) {
      newErrors.version = 'Version is required';
    } else if (!/^\d+(\.\d+)*$/.test(formData.version.trim())) {
      newErrors.version = 'Version must be in format like 1.0 or 1.0.1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !file) return;

    setLoading(true);
    try {
      const { error } = await uploadDeviceDocument(deviceId, file, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        document_type: formData.document_type,
        version: formData.version.trim(),
        shared_with_customer: formData.shared_with_customer
      });

      if (error) throw error;

      toast.success('Document uploaded successfully');
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to upload document', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for <span className="font-medium">{deviceName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-6" style={{ minHeight: 0 }}>
            {/* File Upload */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                File Upload
              </h3>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-[#00a8b5] bg-[#00a8b5]/5'
                    : errors.file
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
                  onChange={handleFileInputChange}
                />

                {file ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
                      <FileText className="h-5 w-5 text-slate-600" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 mb-2">
                      Drag and drop your file here, or{' '}
                      <button
                        type="button"
                        className="text-[#00a8b5] hover:underline font-medium"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-sm text-slate-400">
                      Max file size: {formatFileSize(MAX_FILE_SIZE)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Allowed: {ALLOWED_EXTENSIONS.join(', ')}
                    </p>
                  </>
                )}
              </div>

              {errors.file && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errors.file}
                </div>
              )}
            </div>

            {/* Document Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Document Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Document title"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(v) => setFormData({ ...formData, document_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="version">
                    Version <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                    className={errors.version ? 'border-red-500' : ''}
                  />
                  {errors.version && (
                    <p className="text-sm text-red-500 mt-1">{errors.version}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of the document..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Sharing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                Sharing Settings
              </h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shared_with_customer"
                  checked={formData.shared_with_customer}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, shared_with_customer: checked === true })
                  }
                />
                <Label htmlFor="shared_with_customer" className="font-normal cursor-pointer">
                  Share this document with the customer
                </Label>
              </div>
              <p className="text-sm text-slate-500">
                When shared, the customer will be able to view and download this document from their portal.
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file} className="bg-[#00a8b5] hover:bg-[#008a95]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
