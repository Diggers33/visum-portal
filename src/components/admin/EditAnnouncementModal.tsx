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
import { Checkbox } from '../ui/checkbox';
import { Eye, BarChart, Clock, Users, Archive } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Announcement {
  id: number;
  category: string;
  categoryColor: string;
  title: string;
  content: string;
  date: string;
  status: string;
  views: number;
  clicks: number;
  linkText?: string;
  linkUrl?: string;
  targetAudience?: string;
  publishDate?: string;
  analytics?: {
    clickThroughRate: number;
    firstViewed?: string;
    lastViewed?: string;
    topViewer?: {
      name: string;
      count: number;
    };
  };
}

interface EditAnnouncementModalProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedAnnouncement: Announcement) => void;
  onArchive: (id: number) => void;
}

const categories = [
  { value: 'new-product', label: 'New Product', color: 'bg-[#10b981] text-white' },
  { value: 'marketing', label: 'Marketing', color: 'bg-[#8b5cf6] text-white' },
  { value: 'documentation', label: 'Documentation', color: 'bg-[#3b82f6] text-white' },
  { value: 'training', label: 'Training', color: 'bg-[#00a8b5] text-white' },
  { value: 'policy', label: 'Policy', color: 'bg-[#f59e0b] text-white' },
  { value: 'general', label: 'General', color: 'bg-[#6b7280] text-white' },
];

export default function EditAnnouncementModal({
  announcement,
  open,
  onOpenChange,
  onSave,
  onArchive,
}: EditAnnouncementModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Partial<Announcement>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [targetAllDistributors, setTargetAllDistributors] = useState(true);

  // Initialize form data when announcement changes
  useEffect(() => {
    if (announcement) {
      setFormData(announcement);
      setHasChanges(false);
      setErrors({});
      setPublishImmediately(true);
      setTargetAllDistributors(announcement.targetAudience !== 'specific');
    }
  }, [announcement]);

  if (!announcement) return null;

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    if (!formData.content?.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length > 2000) {
      newErrors.content = 'Content must be 2000 characters or less';
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
        const selectedCategory = categories.find((c) => c.value === formData.category);
        const updatedAnnouncement = {
          ...formData,
          categoryColor: selectedCategory?.color || announcement.categoryColor,
          targetAudience: targetAllDistributors ? 'all' : 'specific',
        } as Announcement;

        onSave(updatedAnnouncement);
        toast.success('Announcement updated successfully');
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
    setFormData(announcement);
  };

  const handleArchiveClick = () => {
    setShowArchiveDialog(true);
  };

  const handleConfirmArchive = () => {
    setShowArchiveDialog(false);
    onArchive(announcement.id);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const isPublished = announcement.status === 'published';
  const analytics = announcement.analytics || {
    clickThroughRate: announcement.clicks > 0 ? Math.round((announcement.clicks / announcement.views) * 100) : 0,
    firstViewed: '1 hour after publishing',
    lastViewed: '2 hours ago',
    topViewer: {
      name: 'TechDist Global',
      count: 3,
    },
  };

  const isFormValid = formData.category && formData.title?.trim() && formData.content?.trim();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[800px] max-h-[90vh] overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update announcement details and view engagement analytics</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Analytics Section - Only for Published Announcements */}
            {isPublished && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart className="h-5 w-5 text-[#00a8b5]" />
                  <h3 className="text-[15px] font-semibold text-slate-900">Analytics</h3>
                  <span className="text-[12px] text-[#6b7280]">(Read-only)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Views */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Eye className="h-4 w-4 text-[#00a8b5]" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#6b7280]">Views</p>
                      <p className="text-[18px] font-semibold text-slate-900">
                        {announcement.views} <span className="text-[13px] font-normal text-[#6b7280]">distributors</span>
                      </p>
                    </div>
                  </div>

                  {/* Click-through */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <BarChart className="h-4 w-4 text-[#00a8b5]" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#6b7280]">Click-through</p>
                      <p className="text-[18px] font-semibold text-slate-900">
                        {announcement.clicks} <span className="text-[13px] font-normal text-[#6b7280]">clicks</span>
                        <span className="ml-2 text-[13px] font-normal text-[#6b7280]">
                          ({analytics.clickThroughRate}% rate)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* First Viewed */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Clock className="h-4 w-4 text-[#00a8b5]" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#6b7280]">First viewed</p>
                      <p className="text-[14px] font-medium text-slate-900">{analytics.firstViewed}</p>
                    </div>
                  </div>

                  {/* Last Viewed */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Clock className="h-4 w-4 text-[#00a8b5]" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#6b7280]">Last viewed</p>
                      <p className="text-[14px] font-medium text-slate-900">{analytics.lastViewed}</p>
                    </div>
                  </div>
                </div>

                {/* Top Viewer */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Users className="h-4 w-4 text-[#00a8b5]" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#6b7280]">Top viewer</p>
                      <p className="text-[14px] font-medium text-slate-900">
                        {analytics.topViewer.name}{' '}
                        <span className="text-[#6b7280]">(viewed {analytics.topViewer.count} times)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category */}
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
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-[13px] text-red-500">{errors.category}</p>}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[14px]">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g., New Product Launch: Visum Pro Series"
                maxLength={200}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-[13px] text-red-500">{errors.title}</p>}
              <p className="text-[12px] text-[#9ca3af]">{formData.title?.length || 0}/200 characters</p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-[14px]">
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                placeholder="Full announcement content..."
                maxLength={2000}
                className={`min-h-[150px] ${errors.content ? 'border-red-500' : ''}`}
              />
              {errors.content && <p className="text-[13px] text-red-500">{errors.content}</p>}
              <p className="text-[12px] text-[#9ca3af]">{formData.content?.length || 0}/2000 characters</p>
            </div>

            {/* Link Text and URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkText" className="text-[14px]">
                  Link Text <span className="text-[#6b7280]">(optional)</span>
                </Label>
                <Input
                  id="linkText"
                  value={formData.linkText || ''}
                  onChange={(e) => handleFieldChange('linkText', e.target.value)}
                  placeholder="e.g., View Product Details"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkUrl" className="text-[14px]">
                  Link URL <span className="text-[#6b7280]">(optional)</span>
                </Label>
                <Input
                  id="linkUrl"
                  value={formData.linkUrl || ''}
                  onChange={(e) => handleFieldChange('linkUrl', e.target.value)}
                  placeholder="/products"
                />
              </div>
            </div>

            {/* Publish Date */}
            <div className="space-y-2">
              <Label className="text-[14px]">Publish Date</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="immediately"
                    name="publishDate"
                    checked={publishImmediately}
                    onChange={() => {
                      setPublishImmediately(true);
                      setHasChanges(true);
                    }}
                    className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                  />
                  <Label htmlFor="immediately" className="font-normal cursor-pointer text-[14px]">
                    Immediately
                  </Label>
                </div>
                <div className="flex items-center space-x-2 gap-2">
                  <input
                    type="radio"
                    id="schedule"
                    name="publishDate"
                    checked={!publishImmediately}
                    onChange={() => {
                      setPublishImmediately(false);
                      setHasChanges(true);
                    }}
                    className="w-4 h-4 text-[#00a8b5] border-slate-300 focus:ring-[#00a8b5]"
                  />
                  <Label htmlFor="schedule" className="font-normal cursor-pointer text-[14px]">
                    Schedule for
                  </Label>
                  <Input
                    type="date"
                    className="w-40"
                    disabled={publishImmediately}
                    value={formData.publishDate || ''}
                    onChange={(e) => handleFieldChange('publishDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label className="text-[14px]">
                Target Audience <span className="text-[#6b7280]">(optional)</span>
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-dist"
                    checked={targetAllDistributors}
                    onCheckedChange={(checked) => {
                      setTargetAllDistributors(checked as boolean);
                      setHasChanges(true);
                    }}
                  />
                  <Label htmlFor="all-dist" className="font-normal cursor-pointer text-[14px]">
                    All Distributors
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="specific-terr"
                    checked={!targetAllDistributors}
                    onCheckedChange={(checked) => {
                      setTargetAllDistributors(!(checked as boolean));
                      setHasChanges(true);
                    }}
                  />
                  <Label htmlFor="specific-terr" className="font-normal cursor-pointer text-[14px]">
                    Specific territories
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleArchiveClick}
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
                onClick={handleSave}
                disabled={isPending || !isFormValid}
              >
                {isPending ? 'Updating...' : 'Update Announcement'}
              </Button>
            </div>
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
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-red-500 hover:bg-red-600">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This announcement will be moved to the archived section. Distributors will no longer be able to
              see it. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive} className="bg-[#00a8b5] hover:bg-[#008a95]">
              Archive Announcement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
