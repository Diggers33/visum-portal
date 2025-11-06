import React, { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { FileText, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Document {
  id: number;
  title: string;
  product: string;
  category: string;
  version: string;
  uploaded: string;
  status: string;
  downloads: number;
  fileSize: string;
  format: string;
  language?: string;
  internalNotes?: string;
  lastDownloaded?: string;
  lastDownloadedBy?: string;
  created?: string;
}

interface EditDocumentModalProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedDoc: Document) => void;
}

const products = [
  'Visum Palm',
  'Raman RXN5',
  'HyperSpec HS-2000',
  'Visum Pro',
  'Vision Series',
  'General/All Products',
];

const categories = [
  'User Manual',
  'Installation Guide',
  'Technical Datasheet',
  'Quick Start Guide',
  'Specification Sheet',
  'Troubleshooting Guide',
  'Calibration Procedure',
];

const languages = [
  'English',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Dutch',
  'Polish',
  'Chinese',
  'Japanese',
];

export default function EditDocumentModal({ document, open, onOpenChange, onSave }: EditDocumentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Partial<Document>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isReplacingFile, setIsReplacingFile] = useState(false);

  // Initialize form data when document changes
  useEffect(() => {
    if (document) {
      setFormData({
        ...document,
        language: document.language || 'English',
      });
      setHasChanges(false);
      setErrors({});
    }
  }, [document]);

  if (!document) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Document title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!formData.product) {
      newErrors.product = 'Product is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (formData.internalNotes && formData.internalNotes.length > 500) {
      newErrors.internalNotes = 'Internal notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Use startTransition for optimistic update
    startTransition(() => {
      // Simulate API call
      setTimeout(() => {
        onSave(formData as Document);
        toast.success('Document updated successfully');
        onOpenChange(false);
        setHasChanges(false);
      }, 800);
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowDiscardDialog(false);
    onOpenChange(false);
    setHasChanges(false);
    setFormData(document);
  };

  const handleReplaceFile = () => {
    setIsReplacingFile(true);
    // Simulate file picker
    setTimeout(() => {
      setIsReplacingFile(false);
      toast.success('File replaced successfully. Don\'t forget to update version number!');
      setHasChanges(true);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const isFormValid = formData.title?.trim() && formData.product && formData.category && formData.status;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-[600px] max-h-[80vh] overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Document File Section */}
            <div className="space-y-3">
              <Label className="text-[14px] font-semibold">Current Document</Label>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-start gap-3">
                  <FileText className="h-10 w-10 text-slate-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{document.title}.{document.format.toLowerCase()}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-[13px] text-[#6b7280]">
                      <span>{document.fileSize}</span>
                      <span>•</span>
                      <span>Uploaded {document.uploaded}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-slate-300"
                  onClick={handleReplaceFile}
                  disabled={isReplacingFile}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isReplacingFile ? 'Replacing...' : 'Replace File'}
                </Button>
              </div>
            </div>

            {/* Document Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[14px]">
                Document Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g., Visum Palm User Manual"
                maxLength={100}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-[13px] text-red-500">{errors.title}</p>
              )}
              <p className="text-[12px] text-[#9ca3af]">
                {formData.title?.length || 0}/100 characters
              </p>
            </div>

            {/* Product and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product" className="text-[14px]">
                  Product <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.product}
                  onValueChange={(value) => handleFieldChange('product', value)}
                >
                  <SelectTrigger className={errors.product ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.product && (
                  <p className="text-[13px] text-red-500">{errors.product}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-[14px]">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleFieldChange('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-[13px] text-red-500">{errors.category}</p>
                )}
              </div>
            </div>

            {/* Version and Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version" className="text-[14px]">Version Number</Label>
                <Input
                  id="version"
                  value={formData.version || ''}
                  onChange={(e) => handleFieldChange('version', e.target.value)}
                  placeholder="e.g., v2.3 or 2.3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="text-[14px]">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleFieldChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-[14px]">
                Status <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-published"
                    name="status"
                    value="published"
                    checked={formData.status === 'published'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                  />
                  <Label htmlFor="status-published" className="font-normal cursor-pointer text-[14px]">
                    Published <span className="text-[#6b7280]">(visible to all distributors)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="status-draft"
                    name="status"
                    value="draft"
                    checked={formData.status === 'draft'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                  />
                  <Label htmlFor="status-draft" className="font-normal cursor-pointer text-[14px]">
                    Draft <span className="text-[#6b7280]">(only visible to admins)</span>
                  </Label>
                </div>
              </div>
              {errors.status && (
                <p className="text-[13px] text-red-500">{errors.status}</p>
              )}
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label htmlFor="internalNotes" className="text-[14px]">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes || ''}
                onChange={(e) => handleFieldChange('internalNotes', e.target.value)}
                placeholder="Add any internal notes about this document..."
                maxLength={500}
                className={`min-h-[100px] ${errors.internalNotes ? 'border-red-500' : ''}`}
              />
              {errors.internalNotes && (
                <p className="text-[13px] text-red-500">{errors.internalNotes}</p>
              )}
              <p className="text-[12px] text-[#9ca3af]">
                {formData.internalNotes?.length || 0}/500 characters • Only visible to IRIS staff
              </p>
            </div>

            {/* Analytics Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-[13px] font-semibold text-slate-900 mb-3">Document Analytics</h4>
              <div className="space-y-2 text-[13px] text-[#6b7280]">
                <div className="flex justify-between">
                  <span>Total Downloads:</span>
                  <span className="font-medium text-slate-900">{document.downloads}</span>
                </div>
                {document.lastDownloaded && (
                  <div className="flex justify-between">
                    <span>Last Downloaded:</span>
                    <span className="font-medium text-slate-900">
                      {document.lastDownloaded}
                      {document.lastDownloadedBy && ` by ${document.lastDownloadedBy}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-slate-900">
                    {document.created || 'Jan 15, 2020'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-[#00a8b5] hover:bg-[#008a95]"
              onClick={handleSave}
              disabled={!isFormValid || isPending}
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardDialog(false)}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
