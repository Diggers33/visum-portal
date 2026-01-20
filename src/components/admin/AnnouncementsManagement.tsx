import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RichTextEditor } from '../ui/rich-text-editor';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Search, Plus, Megaphone, Edit2, Trash2, MoreVertical, Loader2, Eye, MousePointer, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  sendAnnouncementNotification,
  type Announcement,
  type CreateAnnouncementInput,
} from '../../lib/api/announcements';
import { DistributorSelector, filterDistributorIds } from './DistributorSelector';
import { saveContentSharing, getContentDistributors } from '../../lib/api/sharing';

const CATEGORIES = [
  { value: 'communication', label: 'Communication' },
  { value: 'events', label: 'Events' },
  { value: 'sales', label: 'Sales' },
  { value: 'others', label: 'Others' },
];

export default function AnnouncementsManagement() {
  const location = useLocation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [activeLanguageTab, setActiveLanguageTab] = useState<'en' | 'es'>('en');

  const [formData, setFormData] = useState<CreateAnnouncementInput>({
    category: '',
    title_en: '',
    title_es: '',
    content_en: '',
    content_es: '',
    status: 'draft',
    link_text: '',
    link_url: '',
    internal_notes: '',
    send_notification: false,
  });
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Open dialog if navigated from quick action
  useEffect(() => {
    const state = location.state as { openCreateDialog?: boolean };
    if (state?.openCreateDialog) {
      setIsAddDialogOpen(true);
      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    let filtered = announcements;
    if (searchQuery) {
      filtered = filtered.filter((a) =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title_es?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content_es?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    setFilteredAnnouncements(filtered);
  }, [announcements, searchQuery, statusFilter]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await fetchAnnouncements();
      setAnnouncements(data);
      setFilteredAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate category
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    // Validate that at least one language has both title and content
    const hasEnglish = formData.title_en && formData.content_en;
    const hasSpanish = formData.title_es && formData.content_es;

    if (!hasEnglish && !hasSpanish) {
      toast.error('Please fill in title and content for at least one language');
      return;
    }

    setSubmitting(true);
    try {
      const newAnnouncement = await createAnnouncement(formData);

      // Save distributor sharing
      if (newAnnouncement) {
        await saveContentSharing('announcements', newAnnouncement.id, filterDistributorIds(selectedDistributorIds));

        // Send email notification if checkbox is checked and status is published
        if (formData.send_notification && formData.status === 'published') {
          try {
            await sendAnnouncementNotification(newAnnouncement.id);
            toast.success('Announcement created and notifications sent!');
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            toast.warning('Announcement created but failed to send email notifications');
          }
        } else {
          toast.success('Announcement created successfully');
        }
      }

      setIsAddDialogOpen(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;

    // Validate category
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    // Validate that at least one language has both title and content
    const hasEnglish = formData.title_en && formData.content_en;
    const hasSpanish = formData.title_es && formData.content_es;

    if (!hasEnglish && !hasSpanish) {
      toast.error('Please fill in title and content for at least one language');
      return;
    }

    setSubmitting(true);
    try {
      await updateAnnouncement(selectedAnnouncement.id, formData);

      // Save distributor sharing
      await saveContentSharing('announcements', selectedAnnouncement.id, filterDistributorIds(selectedDistributorIds));

      // Send email notification if checkbox is checked and status is published
      if (formData.send_notification && formData.status === 'published') {
        try {
          await sendAnnouncementNotification(selectedAnnouncement.id);
          toast.success('Announcement updated and notifications sent!');
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          toast.warning('Announcement updated but failed to send email notifications');
        }
      } else {
        toast.success('Announcement updated successfully');
      }

      setIsEditDialogOpen(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    try {
      await deleteAnnouncement(selectedAnnouncement.id);
      toast.success('Announcement deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const openEditDialog = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      category: announcement.category,
      title_en: announcement.title_en || '',
      title_es: announcement.title_es || '',
      content_en: announcement.content_en || '',
      content_es: announcement.content_es || '',
      status: announcement.status,
      link_text: announcement.link_text || '',
      link_url: announcement.link_url || '',
      internal_notes: announcement.internal_notes || '',
      send_notification: false, // Reset to unchecked for editing
    });

    // Load existing sharing
    const distributorIds = await getContentDistributors('announcements', announcement.id);
    setSelectedDistributorIds(distributorIds);

    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      title_en: '',
      title_es: '',
      content_en: '',
      content_es: '',
      status: 'draft',
      link_text: '',
      link_url: '',
      internal_notes: '',
      send_notification: false,
    });
    setSelectedAnnouncement(null);
    setSelectedDistributorIds([]);
    setActiveLanguageTab('en');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-orange-100 text-orange-700';
      case 'archived': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'communication': return 'bg-blue-500 text-white';
      case 'events': return 'bg-purple-500 text-white';
      case 'sales': return 'bg-green-500 text-white';
      case 'others': return 'bg-slate-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Announcements</h1>
        <p className="text-[16px] text-[#6b7280]">Communicate updates to distributors</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Announcement
        </Button>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === 'all'
              ? 'border-[#00a8b5] text-[#00a8b5]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === 'draft'
              ? 'border-[#00a8b5] text-[#00a8b5]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => setStatusFilter('archived')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === 'archived'
              ? 'border-[#00a8b5] text-[#00a8b5]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(announcement.category)}`}>
                      {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(announcement.status)}`}>
                      {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatDate(announcement.created_at)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {announcement.title_en || announcement.title_es || announcement.title}
                    {announcement.title_en && announcement.title_es && (
                      <span className="ml-2 text-xs text-slate-500">(EN + ES)</span>
                    )}
                    {announcement.title_en && !announcement.title_es && (
                      <span className="ml-2 text-xs text-slate-500">(EN only)</span>
                    )}
                    {!announcement.title_en && announcement.title_es && (
                      <span className="ml-2 text-xs text-slate-500">(ES only)</span>
                    )}
                  </h3>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {announcement.content_en || announcement.content_es || announcement.content}
                  </p>
                  
                  {/* CTA Button */}
                  {announcement.link_text && announcement.link_url && (
                    <div className="mb-4">
                      <a
                        href={ensureHttps(announcement.link_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#00a8b5] text-white text-sm font-medium rounded-md hover:bg-[#008a95] transition-colors"
                      >
                        {announcement.link_text}
                        <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>Views: {announcement.views}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      <span>Click-through: {announcement.clicks}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(announcement)}
                    className="text-sm"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No announcements found</p>
          </CardContent>
        </Card>
      )}

      {/* Add Announcement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
          {/* Fixed header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Create a new announcement for distributors</DialogDescription>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4" style={{minHeight: 0}}>
            <form className="space-y-6">
              {/* Category and Status in one row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language tabs */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Title & Content <span className="text-red-500">*</span> (at least one language required)
                </Label>

                <Tabs value={activeLanguageTab} onValueChange={(value) => setActiveLanguageTab(value as 'en' | 'es')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="es">Español</TabsTrigger>
                  </TabsList>

                  <TabsContent value="en" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title (English)</Label>
                      <Input
                        placeholder="e.g., New Product Launch: Visum Pro Series"
                        value={formData.title_en || ''}
                        onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Content (English)</Label>
                      <RichTextEditor
                        content={formData.content_en || ''}
                        onChange={(content) => setFormData({ ...formData, content_en: content })}
                        placeholder="Write your announcement content in English..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="es" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Título (Español)</Label>
                      <Input
                        placeholder="ej., Nuevo Lanzamiento de Producto: Serie Visum Pro"
                        value={formData.title_es || ''}
                        onChange={(e) => setFormData({ ...formData, title_es: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Contenido (Español)</Label>
                      <RichTextEditor
                        content={formData.content_es || ''}
                        onChange={(content) => setFormData({ ...formData, content_es: content })}
                        placeholder="Escribe el contenido del anuncio en español..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Link fields in one row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link Text (optional)</Label>
                  <Input
                    placeholder="e.g., Learn More"
                    value={formData.link_text || ''}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    placeholder="https://example.com or example.com"
                    value={formData.link_url || ''}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter full URL (https:// will be added automatically if missing)
                  </p>
                </div>
              </div>

              {/* Internal notes */}
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add any internal notes..."
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Email notification */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="send-notification"
                  checked={formData.send_notification || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_notification: !!checked })
                  }
                  disabled={formData.status !== 'published'}
                />
                <div className="flex-1">
                  <Label htmlFor="send-notification" className="cursor-pointer font-medium text-blue-900">
                    Send email notification to all distributors
                  </Label>
                  <p className="text-xs text-blue-700 mt-1">
                    {formData.status !== 'published'
                      ? 'Only available when status is "Published"'
                      : 'Distributors will receive an email about this announcement'}
                  </p>
                </div>
              </div>

              {/* Share with - more compact */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Share with</Label>
                <p className="text-sm text-muted-foreground">
                  Select which distributors can see this announcement
                </p>

                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                />
              </div>
            </form>
          </div>

          {/* Fixed footer */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/50 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#00a8b5] hover:bg-[#008a95]"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
          {/* Fixed header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update announcement information</DialogDescription>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4" style={{minHeight: 0}}>
            <form className="space-y-6">
              {/* Category and Status in one row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    key={`category-${formData.category}`}
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    key={`status-${formData.status}`}
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language tabs */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Title & Content <span className="text-red-500">*</span> (at least one language required)
                </Label>

                <Tabs value={activeLanguageTab} onValueChange={(value) => setActiveLanguageTab(value as 'en' | 'es')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="es">Español</TabsTrigger>
                  </TabsList>

                  <TabsContent value="en" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title (English)</Label>
                      <Input
                        placeholder="e.g., New Product Launch: Visum Pro Series"
                        value={formData.title_en || ''}
                        onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Content (English)</Label>
                      <RichTextEditor
                        content={formData.content_en || ''}
                        onChange={(content) => setFormData({ ...formData, content_en: content })}
                        placeholder="Write your announcement content in English..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="es" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Título (Español)</Label>
                      <Input
                        placeholder="ej., Nuevo Lanzamiento de Producto: Serie Visum Pro"
                        value={formData.title_es || ''}
                        onChange={(e) => setFormData({ ...formData, title_es: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Contenido (Español)</Label>
                      <RichTextEditor
                        content={formData.content_es || ''}
                        onChange={(content) => setFormData({ ...formData, content_es: content })}
                        placeholder="Escribe el contenido del anuncio en español..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Link fields in one row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link Text (optional)</Label>
                  <Input
                    placeholder="e.g., Learn More"
                    value={formData.link_text || ''}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    placeholder="https://example.com or example.com"
                    value={formData.link_url || ''}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter full URL (https:// will be added automatically if missing)
                  </p>
                </div>
              </div>

              {/* Internal notes */}
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add any internal notes..."
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Email notification */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="send-notification-edit"
                  checked={formData.send_notification || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_notification: !!checked })
                  }
                  disabled={formData.status !== 'published'}
                />
                <div className="flex-1">
                  <Label htmlFor="send-notification-edit" className="cursor-pointer font-medium text-blue-900">
                    Send email notification to all distributors
                  </Label>
                  <p className="text-xs text-blue-700 mt-1">
                    {formData.status !== 'published'
                      ? 'Only available when status is "Published"'
                      : 'Distributors will receive an email about this announcement'}
                  </p>
                </div>
              </div>

              {/* Share with - more compact */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Share with</Label>
                <p className="text-sm text-muted-foreground">
                  Select which distributors can see this announcement
                </p>

                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                />
              </div>
            </form>
          </div>

          {/* Fixed footer */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/50 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={submitting}
              className="bg-[#00a8b5] hover:bg-[#008a95]"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAnnouncement?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
