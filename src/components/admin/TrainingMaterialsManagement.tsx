import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, GraduationCap, Edit2, Trash2, MoreVertical, Loader2, Video, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchTrainingMaterials,
  createTrainingMaterial,
  updateTrainingMaterial,
  deleteTrainingMaterial,
  uploadTrainingFile,
  type TrainingMaterial,
  type CreateTrainingMaterialInput,
} from '@/lib/api/training-materials';

export default function TrainingMaterialsManagement() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<TrainingMaterial | null>(null);
  
  const [formData, setFormData] = useState<CreateTrainingMaterialInput>({
    title: '',
    type: '',
    format: '',
    level: '',
    product: '',
    status: 'draft',
    description: '',
    duration: '',
    modules: 0,
    video_url: '',
    internal_notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    let filtered = materials;
    if (searchQuery) {
      filtered = filtered.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.product.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter((m) => m.status === statusFilter);
    if (typeFilter !== 'all') filtered = filtered.filter((m) => m.type === typeFilter);
    if (levelFilter !== 'all') filtered = filtered.filter((m) => m.level === levelFilter);
    setFilteredMaterials(filtered);
  }, [materials, searchQuery, statusFilter, typeFilter, levelFilter]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await fetchTrainingMaterials();
      setMaterials(data);
      setFilteredMaterials(data);
    } catch (error) {
      toast.error('Failed to load training materials');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let fileUrl = formData.file_url;
      
      if (selectedFile) {
        const tempMaterial = await createTrainingMaterial({ ...formData, status: 'draft' });
        fileUrl = await uploadTrainingFile(selectedFile, tempMaterial.id);
        await updateTrainingMaterial(tempMaterial.id, {
          file_url: fileUrl,
          status: formData.status,
        });
      } else {
        await createTrainingMaterial(formData);
      }
      
      toast.success('Training material created successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch (error) {
      toast.error('Failed to create training material');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setUploading(true);
    try {
      let fileUrl = formData.file_url;
      
      if (selectedFile) {
        fileUrl = await uploadTrainingFile(selectedFile, selectedMaterial.id);
      }
      
      await updateTrainingMaterial(selectedMaterial.id, { ...formData, file_url: fileUrl });
      toast.success('Training material updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch (error) {
      toast.error('Failed to update training material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMaterial) return;
    try {
      await deleteTrainingMaterial(selectedMaterial.id);
      toast.success('Training material deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedMaterial(null);
      loadMaterials();
    } catch (error) {
      toast.error('Failed to delete training material');
    }
  };

  const openEditDialog = (material: TrainingMaterial) => {
    setSelectedMaterial(material);
    setFormData({
      title: material.title,
      type: material.type,
      format: material.format,
      level: material.level,
      product: material.product,
      status: material.status,
      description: material.description || '',
      duration: material.duration || '',
      modules: material.modules || 0,
      video_url: material.video_url || '',
      file_url: material.file_url,
      internal_notes: material.internal_notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: '',
      format: '',
      level: '',
      product: '',
      status: 'draft',
      description: '',
      duration: '',
      modules: 0,
      video_url: '',
      internal_notes: '',
    });
    setSelectedFile(null);
    setSelectedMaterial(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Materials</h1>
          <p className="text-gray-600 mt-1">Manage training courses and resources</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Course">Course</SelectItem>
                <SelectItem value="Video Tutorial">Video Tutorial</SelectItem>
                <SelectItem value="Webinar">Webinar</SelectItem>
                <SelectItem value="Guide">Guide</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue placeholder="All Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => (
          <Card key={material.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                {material.type === 'Video Tutorial' || material.type === 'Webinar' ? (
                  <Video className="h-10 w-10 text-cyan-600" />
                ) : (
                  <GraduationCap className="h-10 w-10 text-cyan-600" />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(material)}>
                      <Edit2 className="mr-2 h-4 w-4" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedMaterial(material); setIsDeleteDialogOpen(true); }} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{material.title}</h3>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between"><span>Type:</span><span className="font-medium">{material.type}</span></div>
                <div className="flex justify-between"><span>Level:</span><span className="font-medium">{material.level}</span></div>
                <div className="flex justify-between"><span>Duration:</span><span className="font-medium">{material.duration || 'N/A'}</span></div>
                <div className="flex justify-between"><span>Views:</span><span className="font-medium">{material.views}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(material.status)}`}>
                  {material.status}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {material.modules || 0} modules
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No training materials found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Training Material</DialogTitle>
            <DialogDescription>Create a new training course or resource</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Course">Course</SelectItem>
                      <SelectItem value="Video Tutorial">Video Tutorial</SelectItem>
                      <SelectItem value="Webinar">Webinar</SelectItem>
                      <SelectItem value="Guide">Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Level *</Label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={formData.product} onValueChange={(value) => setFormData({ ...formData, product: value })}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NeoSpectra-Scanner">NeoSpectra Scanner</SelectItem>
                      <SelectItem value="NeoSpectra-Lab">NeoSpectra Lab</SelectItem>
                      <SelectItem value="Raman-1000">Raman 1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format *</Label>
                  <Input value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value })} placeholder="e.g., Video, PDF" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="e.g., 45 minutes" />
                </div>
                <div className="space-y-2">
                  <Label>Modules</Label>
                  <Input type="number" value={formData.modules} onChange={(e) => setFormData({ ...formData, modules: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Video URL (YouTube, Vimeo, etc.)</Label>
                <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>File Upload</Label>
                <Input type="file" onChange={handleFileSelect} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={uploading}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMaterial?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
