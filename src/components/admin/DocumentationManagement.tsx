import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import { Upload, MoreVertical, Search, Download, Edit, Trash2, Loader2, Eye, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchDocumentation,
  createDocumentation,
  updateDocumentation,
  deleteDocumentation,
  uploadDocumentationFile,
  type Documentation,
  type CreateDocumentationInput,
} from '../../lib/api/documentation';
import { supabase } from '../../lib/supabase';
import { DistributorSelector, filterDistributorIds } from './DistributorSelector';
import { saveContentSharing, getContentDistributors } from '../../lib/api/sharing';
import '../../lib/debug-sharing'; // Load debug helper

interface Product {
  id: string;
  name: string;
}

interface PendingFile {
  file: File;
  title: string;
  format: string;
}

/**
 * Extract a clean title from a filename
 * e.g., "visum_palm_user_manual_v2.pdf" -> "Visum Palm User Manual V2"
 */
function extractTitleFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const withSpaces = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const titleCase = withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
  return titleCase || filename;
}

const CATEGORIES = [
  'User Manual',
  'Installation Guide',
  'Quick Start Guide',
  'API Documentation',
  'Troubleshooting Guide',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese',
  'Japanese',
];

export default function DocumentationManagement() {
  const [documents, setDocuments] = useState<Documentation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Documentation | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateDocumentationInput>({
    title: '',
    product: '',
    category: '',
    version: '',
    status: 'draft',
    language: 'English',
    internal_notes: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([]);

  // Sidebar filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    loadDocuments();
    loadProducts();
  }, []);

  // Debug: Monitor products state
  useEffect(() => {
    console.log('Products state updated:', products.length, 'products');
  }, [products]);

  const loadProducts = async () => {
    try {
      console.log('Loading products...');
      
      // Load ALL products - no status filter
      const { data, error, count } = await supabase
        .from('products')
        .select('id, name', { count: 'exact' })
        .order('name');

      console.log('Query result:', { data, error, count });

      if (error) {
        console.error('Error loading products:', error);
        throw error;
      }
      
      console.log('Products loaded:', data);
      console.log('Total products:', count);
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await fetchDocumentation();
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    // Batch mode: upload multiple files
    if (pendingFiles.length > 0) {
      if (!formData.product || !formData.category || !formData.version) {
        toast.error('Please fill in product, category, and version');
        return;
      }

      try {
        setUploading(true);
        setUploadProgress({ current: 0, total: pendingFiles.length });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < pendingFiles.length; i++) {
          const pendingFile = pendingFiles[i];
          setUploadProgress({ current: i + 1, total: pendingFiles.length });

          try {
            const tempId = `temp-${Date.now()}-${i}`;
            const fileUrl = await uploadDocumentationFile(pendingFile.file, tempId);

            const documentData: CreateDocumentationInput = {
              title: pendingFile.title,
              product: formData.product,
              category: formData.category,
              version: formData.version,
              status: formData.status,
              language: formData.language,
              internal_notes: formData.internal_notes,
              file_url: fileUrl,
              file_size: pendingFile.file.size,
              format: pendingFile.format,
            };

            const newDocument = await createDocumentation(documentData);

            if (newDocument) {
              await saveContentSharing('documentation', newDocument.id, filterDistributorIds(selectedDistributorIds));
            }

            successCount++;
          } catch (fileError) {
            console.error(`Error uploading ${pendingFile.file.name}:`, fileError);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
          toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
        }

        setIsAddDialogOpen(false);
        resetForm();
        loadDocuments();
      } catch (error) {
        console.error('Error adding documents:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to upload documents');
      } finally {
        setUploading(false);
        setUploadProgress({ current: 0, total: 0 });
      }
      return;
    }

    // Single file mode
    if (!formData.title || !formData.product || !formData.category || !formData.version) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      // Create document first to get ID
      const tempId = `temp-${Date.now()}`;
      const fileUrl = await uploadDocumentationFile(selectedFile, tempId);

      const documentData: CreateDocumentationInput = {
        ...formData,
        file_url: fileUrl,
        file_size: selectedFile.size,
        format: selectedFile.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      };

      const newDocument = await createDocumentation(documentData);

      // Save distributor sharing
      if (newDocument) {
        await saveContentSharing('documentation', newDocument.id, filterDistributorIds(selectedDistributorIds));
      }

      toast.success('Document uploaded successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleEditDocument = async () => {
    if (!selectedDocument) return;

    if (!formData.title || !formData.product || !formData.category || !formData.version) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      
      let fileUrl = selectedDocument.file_url;
      let fileSize = selectedDocument.file_size;
      let format = selectedDocument.format;
      
      // If new file selected, upload it
      if (selectedFile) {
        fileUrl = await uploadDocumentationFile(selectedFile, selectedDocument.id);
        fileSize = selectedFile.size;
        format = selectedFile.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      }

      await updateDocumentation(selectedDocument.id, {
        ...formData,
        file_url: fileUrl,
        file_size: fileSize,
        format: format,
      });

      // Save distributor sharing
      await saveContentSharing('documentation', selectedDocument.id, filterDistributorIds(selectedDistributorIds));

      toast.success('Document updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      await deleteDocumentation(selectedDocument.id);
      toast.success('Document deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const openEditDialog = async (doc: Documentation) => {
    setSelectedDocument(doc);
    setFormData({
      title: doc.title,
      product: doc.product,
      category: doc.category,
      version: doc.version,
      status: doc.status,
      language: doc.language,
      internal_notes: doc.internal_notes || '',
    });
    setSelectedFile(null);

    // Load existing sharing
    const distributorIds = await getContentDistributors('documentation', doc.id);
    setSelectedDistributorIds(distributorIds);

    // Ensure products are loaded before opening dialog
    if (products.length === 0) {
      loadProducts();
    }

    setIsEditDialogOpen(true);
  };

  // Debug: Log products and current product selection
  useEffect(() => {
    if (isEditDialogOpen && selectedDocument) {
      console.log('Edit Dialog Opened');
      console.log('Current product:', formData.product);
      console.log('Available products:', products);
      console.log('Product exists in list:', products.some(p => p.name === formData.product));
    }
  }, [isEditDialogOpen, selectedDocument, formData.product, products]);

  const openDeleteDialog = (doc: Documentation) => {
    setSelectedDocument(doc);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      product: '',
      category: '',
      version: '',
      status: 'draft',
      language: 'English',
      internal_notes: '',
    });
    setSelectedFile(null);
    setPendingFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setSelectedDocument(null);
    setSelectedDistributorIds([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPendingFiles: PendingFile[] = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      const title = extractTitleFromFilename(file.name);

      newPendingFiles.push({
        file,
        title,
        format: ext,
      });
    });

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const updatePendingFileTitle = (index: number, newTitle: string) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(doc.category);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(doc.status);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryCount = (category: string) => {
    return documents.filter(doc => doc.category === category).length;
  };

  const getStatusCount = (status: string) => {
    return documents.filter(doc => doc.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Documentation</h1>
        <p className="text-[16px] text-[#6b7280]">Manage technical documents and manuals</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
          
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
        </div>

        <Button variant="outline" className="border-slate-200">
          <Download className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </div>

      {/* Filters Sidebar + Table */}
      <div className="flex gap-6">
        {/* Filters */}
        <Card className="w-64 h-fit border-slate-200 hidden lg:block">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Category</h3>
              <div className="space-y-2">
                {CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <Label
                      htmlFor={`category-${category}`}
                      className="text-[13px] font-normal cursor-pointer flex-1"
                    >
                      {category} ({getCategoryCount(category)})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Status</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-published"
                    checked={selectedStatuses.includes('published')}
                    onCheckedChange={() => toggleStatus('published')}
                  />
                  <Label htmlFor="status-published" className="text-[13px] font-normal cursor-pointer">
                    Published ({getStatusCount('published')})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-draft"
                    checked={selectedStatuses.includes('draft')}
                    onCheckedChange={() => toggleStatus('draft')}
                  />
                  <Label htmlFor="status-draft" className="text-[13px] font-normal cursor-pointer">
                    Draft ({getStatusCount('draft')})
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="flex-1 border-slate-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Title</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        <p className="text-[12px] text-[#9ca3af]">
                          {doc.format} • {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px]">{doc.product}</TableCell>
                    <TableCell className="text-[13px]">{doc.category}</TableCell>
                    <TableCell className="text-[13px]">{doc.version}</TableCell>
                    <TableCell className="text-[13px] text-[#6b7280]">
                      {new Date(doc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          doc.status === 'published'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : doc.status === 'draft'
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        }
                      >
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6b7280]">{doc.downloads}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Document
                          </DropdownMenuItem>
                          {doc.file_url && (
                            <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Document
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => openDeleteDialog(doc)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No documents found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload one or multiple documents at once. Titles are auto-generated from filenames.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleAddDocument(); }}>
            <div className="grid gap-4 py-4">
              {/* Batch File Upload Zone */}
              <div className="space-y-3">
                <Label>Document Files *</Label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#00a8b5] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('batch-doc-input')?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select multiple files at once. Supports PDF, DOC, DOCX, TXT
                  </p>
                  <Input
                    id="batch-doc-input"
                    type="file"
                    multiple
                    onChange={handleBatchFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </div>

                {/* Pending Files List */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} selected
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingFiles([])}
                        className="text-xs text-slate-500 hover:text-red-500"
                      >
                        Clear all
                      </Button>
                    </div>
                    {pendingFiles.map((pf, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white rounded-md p-2 border">
                        <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={pf.title}
                            onChange={(e) => updatePendingFileTitle(index, e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Document title"
                          />
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {pf.file.name} ({pf.format})
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePendingFile(index)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product}
                    onValueChange={(value) => setFormData({ ...formData, product: value })}
                  >
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g., 2.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={3}
                  placeholder="Add any internal notes about this document..."
                />
              </div>

              {/* Distributor Sharing */}
              <div className="border-t pt-4">
                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                  label="Share with"
                  description="Select which distributors can access this document"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center">
              {uploading && uploadProgress.total > 0 && (
                <div className="flex-1 mr-4">
                  <div className="text-sm text-slate-600 mb-1">
                    Uploading {uploadProgress.current} of {uploadProgress.total}...
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-[#00a8b5] h-2 rounded-full transition-all"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || pendingFiles.length === 0}
                className="bg-[#00a8b5] hover:bg-[#008a95]"
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {pendingFiles.length > 1
                  ? `Upload ${pendingFiles.length} Documents`
                  : 'Upload Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information and optionally replace the file
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleEditDocument(); }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Visum Palm User Manual"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-product">Product *</Label>
                  <Select
                    key={`product-${formData.product}`}
                    value={formData.product}
                    onValueChange={(value) => setFormData({ ...formData, product: value })}
                  >
                    <SelectTrigger id="edit-product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-slate-500">Loading products...</div>
                      ) : (
                        products.map((product) => (
                          <SelectItem key={product.id} value={product.name}>
                            {product.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select
                    key={`category-${formData.category}`}
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-version">Version *</Label>
                  <Input
                    id="edit-version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="e.g., 2.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-language">Language *</Label>
                  <Select
                    key={`language-${formData.language}`}
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger id="edit-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  key={`status-${formData.status}`}
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload Zone */}
              <div className="space-y-3">
                <Label>Replace Document File</Label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#00a8b5] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('edit-doc-input')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      setSelectedFile(file);
                    }
                  }}
                >
                  <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to select file or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedFile
                      ? `Selected: ${selectedFile.name}`
                      : 'Upload a new file to replace the existing one (optional)'}
                  </p>
                  <Input
                    id="edit-doc-input"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-md p-2 border">
                    <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">Will replace existing file</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Internal Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.internal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={3}
                  placeholder="Add any internal notes about this document..."
                />
              </div>

              {/* Distributor Sharing */}
              <div className="border-t pt-4">
                <DistributorSelector
                  selectedDistributorIds={selectedDistributorIds}
                  onChange={setSelectedDistributorIds}
                  label="Share with"
                  description="Select which distributors can access this document"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading} className="bg-[#00a8b5] hover:bg-[#008a95]">
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be undone.
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
