import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { 
  Search, 
  Download, 
  FileText, 
  Book, 
  Wrench, 
  AlertCircle, 
  RefreshCw,
  FileCheck,
  Printer,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Grid3x3,
  List,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';
import { trackDownload } from '../lib/activityTracker';

// Category definitions with icons and colors
const categoryDefinitions = [
  { name: 'Installation Guide', icon: Book, color: 'text-cyan-900 bg-cyan-50' },
  { name: 'Maintenance Procedure', icon: Wrench, color: 'text-green-900 bg-green-50' },
  { name: 'Troubleshooting', icon: AlertCircle, color: 'text-orange-900 bg-orange-50' },
  { name: 'Software Update', icon: RefreshCw, color: 'text-purple-900 bg-purple-50' },
  { name: 'Compliance Document', icon: FileCheck, color: 'text-slate-900 bg-slate-50' },
];

const statuses = ['Current', 'New', 'Updated', 'published'];
const languages = ['EN', 'DE', 'FR', 'ES'];

type SortField = 'title' | 'product' | 'category' | 'version' | 'size' | 'updated';
type SortDirection = 'asc' | 'desc';

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Helper function to format file size
const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function TechnicalDocs() {
  const { t } = useTranslation('common');
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  
  // Database state
  const [documents, setDocuments] = useState<any[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time download counts from distributor_activity
  const [documentDownloadCounts, setDocumentDownloadCounts] = useState<Record<string, number>>({});

  // Load documents from database
  useEffect(() => {
    loadDocuments();
    loadProducts();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documentation')
        .select('*')
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      console.log('Loaded documents:', data?.length);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .order('name');

      if (error) throw error;

      const productNames = data?.map(p => p.name) || [];
      setProducts(['All Products', ...productNames]);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Fetch download count for a specific document from distributor_activity
  const fetchDocumentDownloadCount = async (docId: string) => {
    try {
      const { count } = await supabase
        .from('distributor_activity')
        .select('*', { count: 'exact', head: true })
        .eq('resource_id', docId)
        .eq('resource_type', 'document')
        .eq('activity_type', 'download');

      if (count !== null) {
        setDocumentDownloadCounts(prev => ({
          ...prev,
          [docId]: count
        }));
      }
    } catch (err) {
      console.error('Error fetching document download count:', err);
    }
  };

  // Set document title
  useEffect(() => {
    document.title = 'Technical Documentation - Visum Portal';
    return () => {
      document.title = 'Visum Portal';
    };
  }, []);

  // Fetch download counts when documents load
  useEffect(() => {
    if (documents && documents.length > 0) {
      documents.forEach(doc => {
        fetchDocumentDownloadCount(doc.id);
      });
    }
  }, [documents]);

  // Count documents per product (dynamic)
  const productCounts = products.map(product => ({
    name: product,
    count: product === 'All Products' 
      ? documents.length 
      : documents.filter(doc => doc.product === product).length,
  }));

  // Count documents per category (dynamic)
  const categoryNames = categoryDefinitions.map(c => c.name);
  const categoryCounts = categoryDefinitions.map(catDef => ({
    ...catDef,
    count: documents.filter(doc => doc.category === catDef.name).length,
  }));

  // Check if any filters are active
  const hasActiveFilters = 
    selectedProducts.length > 0 || 
    selectedCategories.length > 0 || 
    selectedStatuses.length > 0 || 
    selectedLanguages.length > 0;

  const clearAllFilters = () => {
    setSelectedProducts([]);
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedLanguages([]);
  };

  // Filter and sort documents
  const filteredAndSortedDocs = useMemo(() => {
    let filtered = documents.filter(doc => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.product.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProduct = selectedProducts.length === 0 || 
        selectedProducts.includes('All Products') || 
        selectedProducts.includes(doc.product);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(doc.category);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(doc.status);
      const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(doc.language);
      
      return matchesSearch && matchesProduct && matchesCategory && matchesStatus && matchesLanguage;
    });

    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'product':
          comparison = a.product.localeCompare(b.product);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'version':
          comparison = a.version.localeCompare(b.version);
          break;
        case 'size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, selectedProducts, selectedCategories, selectedStatuses, selectedLanguages, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === filteredAndSortedDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredAndSortedDocs.map(doc => doc.id));
    }
  };

  const handleSelectDoc = (docId: number) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleCategoryCardClick = (categoryName: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName) ? prev.filter(c => c !== categoryName) : [categoryName]
    );
  };

  const handleDownload = async (docId: string, docTitle: string, fileUrl: string) => {
    console.log('=== DOWNLOAD CLICKED ===');
    console.log('Doc ID:', docId);
    console.log('Doc Title:', docTitle);
    console.log('File URL:', fileUrl);
    
    // Validate file URL exists
    if (!fileUrl || fileUrl.trim() === '') {
      console.error('❌ File URL is missing or empty');
      toast.error('Download failed', {
        description: 'File URL is missing. Please contact administrator.',
      });
      return;
    }

    // Show downloading state
    setDownloadingIds(prev => new Set(prev).add(docId));
    
    try {
      console.log('📊 Step 1: Fetching current download count...');
      
      // Get current download count
      const { data: currentDoc, error: fetchError } = await supabase
        .from('documentation')
        .select('id, downloads')
        .eq('id', docId)
        .single();

      console.log('Fetch result:', { data: currentDoc, error: fetchError });

      if (fetchError) {
        console.error('❌ Error fetching current downloads:', fetchError);
        throw fetchError;
      }

      if (!currentDoc) {
        console.error('❌ Document not found in database');
        toast.error('Document not found');
        return;
      }

      console.log('✅ Current downloads:', currentDoc.downloads);

      // Increment download count
      const newDownloadCount = (currentDoc.downloads || 0) + 1;
      console.log('📈 New download count will be:', newDownloadCount);
      
      console.log('💾 Step 2: Updating database...');
      const { data: updateResult, error: updateError } = await supabase
        .from('documentation')
        .update({ downloads: newDownloadCount })
        .eq('id', docId)
        .select('id, downloads');

      console.log('Update result:', { data: updateResult, error: updateError });

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('⚠️ Update returned empty result - likely RLS blocking update');
        toast.error('Permission denied', {
          description: 'Row Level Security might be blocking the update.',
        });
        return;
      }

      console.log('✅ Database updated successfully!');
      console.log('New value in database:', updateResult[0].downloads);

      // Track download activity
      await trackDownload('document', docId, docTitle, {
        download_count: updateResult[0].downloads
      });

      // Refetch download count from distributor_activity immediately
      await fetchDocumentDownloadCount(docId);

      // Update local state
      setDocuments(prev => prev.map(doc =>
        doc.id === docId
          ? { ...doc, downloads: updateResult[0].downloads }
          : doc
      ));

      console.log('🌐 Step 3: Opening file in new tab...');
      
      // Open file in new tab
      const newWindow = window.open(fileUrl, '_blank');
      
      if (!newWindow) {
        console.error('❌ Pop-up blocked!');
        toast.error('Pop-up blocked', {
          description: 'Please allow pop-ups for this site.',
        });
      } else {
        console.log('✅ File opened successfully');
      }
      
      toast.success('Download started', {
        description: `${docTitle} - Downloads: ${updateResult[0].downloads}`,
      });
      
    } catch (error: any) {
      console.error('❌ Fatal error in handleDownload:', error);
      toast.error('Download failed', {
        description: error.message || 'Unknown error occurred.',
      });
    } finally {
      // Remove downloading state
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      console.log('=== DOWNLOAD COMPLETE ===\n');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1 text-[#00a8b5]" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-[#00a8b5]" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb navigation */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-slate-600 hover:text-[#00a8b5]">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-slate-900">Documentation</BreadcrumbPage>
            </BreadcrumbItem>
            {selectedProducts.length === 1 && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-slate-900">{selectedProducts[0]}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-6">
        <h1 className="text-slate-900 mb-2">{t('docs.title')}</h1>
        <p className="text-slate-600">{t('docs.subtitle')}</p>
      </div>

      {/* Categories grid - clickable cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {categoryCounts.map(category => (
          <Card 
            key={category.name}
            className={`border-slate-200 cursor-pointer transition-all hover:shadow-md ${
              selectedCategories.includes(category.name) 
                ? 'border-[#00a8b5] shadow-md bg-cyan-50/30' 
                : ''
            }`}
            onClick={() => handleCategoryCardClick(category.name)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${category.color}`}>
                  <category.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary">{category.count}</Badge>
              </div>
              <h3 className="text-sm text-slate-900">{category.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Left sidebar filters */}
        <aside className="w-64 flex-shrink-0">
          <Card className="border-slate-200 sticky top-24">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Product</h4>
                <div className="space-y-2">
                  {productCounts.map(product => (
                    <div key={product.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.name}`}
                        checked={selectedProducts.includes(product.name)}
                        onCheckedChange={() => {
                          setSelectedProducts(prev =>
                            prev.includes(product.name) 
                              ? prev.filter(p => p !== product.name) 
                              : [...prev, product.name]
                          );
                        }}
                      />
                      <Label htmlFor={`product-${product.name}`} className="text-sm text-slate-700 cursor-pointer">
                        {product.name} ({product.count})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Category filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Category</h4>
                <div className="space-y-2">
                  {categoryCounts.map(category => (
                    <div key={category.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.name}`}
                        checked={selectedCategories.includes(category.name)}
                        onCheckedChange={() => {
                          setSelectedCategories(prev =>
                            prev.includes(category.name) 
                              ? prev.filter(c => c !== category.name) 
                              : [...prev, category.name]
                          );
                        }}
                      />
                      <Label htmlFor={`category-${category.name}`} className="text-sm text-slate-700 cursor-pointer">
                        {category.name} ({category.count})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Status</h4>
                <div className="space-y-2">
                  {statuses.map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={() => {
                          setSelectedStatuses(prev =>
                            prev.includes(status) 
                              ? prev.filter(s => s !== status) 
                              : [...prev, status]
                          );
                        }}
                      />
                      <Label htmlFor={`status-${status}`} className="text-sm text-slate-700 cursor-pointer">
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Language filter */}
              <div>
                <h4 className="text-sm text-slate-900 mb-3">Language</h4>
                <div className="space-y-2">
                  {languages.map(lang => (
                    <div key={lang} className="flex items-center space-x-2">
                      <Checkbox
                        id={`lang-${lang}`}
                        checked={selectedLanguages.includes(lang)}
                        onCheckedChange={() => {
                          setSelectedLanguages(prev =>
                            prev.includes(lang) 
                              ? prev.filter(l => l !== lang) 
                              : [...prev, lang]
                          );
                        }}
                      />
                      <Label htmlFor={`lang-${lang}`} className="text-sm text-slate-700 cursor-pointer">
                        {lang}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear all filters link */}
              {hasActiveFilters && (
                <>
                  <Separator />
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-[#00a8b5] hover:text-[#008a95] underline cursor-pointer w-full text-center"
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Library</CardTitle>
                  <CardDescription>
                    All technical documents and resources
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search bar and toolbar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder={t('docs.searchDocs')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 bg-white border-slate-200"
                  />
                </div>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid3x3 className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Results count and bulk actions */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {filteredAndSortedDocs.length} {filteredAndSortedDocs.length === 1 ? 'document' : 'documents'}
                  {documents.length !== filteredAndSortedDocs.length && ` of ${documents.length}`}
                </p>
                {selectedDocs.length > 0 && (
                  <Button className="bg-[#00a8b5] hover:bg-[#008a95]">
                    <Download className="mr-2 h-4 w-4" />
                    Download Selected ({selectedDocs.length})
                  </Button>
                )}
                {hasActiveFilters && selectedDocs.length === 0 && (
                  <Button size="sm" variant="outline" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Loading state */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
                </div>
              ) : (
                <>
                  {/* Documents table */}
                  {viewMode === 'list' && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedDocs.length === filteredAndSortedDocs.length && filteredAndSortedDocs.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort('title')}
                            className="flex items-center hover:text-[#00a8b5] transition-colors"
                          >
                            Document Title
                            <SortIcon field="title" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort('product')}
                            className="flex items-center hover:text-[#00a8b5] transition-colors"
                          >
                            Product
                            <SortIcon field="product" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort('category')}
                            className="flex items-center hover:text-[#00a8b5] transition-colors"
                          >
                            Category
                            <SortIcon field="category" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort('version')}
                            className="flex items-center hover:text-[#00a8b5] transition-colors"
                          >
                            Version
                            <SortIcon field="version" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort('size')}
                            className="flex items-center hover:text-[#00a8b5] transition-colors"
                          >
                            Size
                            <SortIcon field="size" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort('updated')}
                            className="flex items-center hover:text-[#00a8b5] transition-colors"
                          >
                            Last Updated
                            <SortIcon field="updated" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            Downloads
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedDocs.map(doc => (
                        <TableRow key={doc.id} className="hover:bg-slate-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedDocs.includes(doc.id)}
                              onCheckedChange={() => handleSelectDoc(doc.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-cyan-50 rounded-lg">
                                <FileText className="h-4 w-4 text-[#00a8b5]" />
                              </div>
                              <span className="text-sm text-slate-900">{doc.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{doc.product}</TableCell>
                          <TableCell className="text-sm text-slate-600">{doc.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {doc.version}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{formatFileSize(doc.file_size)}</TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDate(doc.updated_at)}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {documentDownloadCounts[doc.id] !== undefined
                                ? documentDownloadCounts[doc.id]
                                : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                doc.status === 'New' ? 'bg-green-100 text-green-800' :
                                doc.status === 'Updated' ? 'bg-cyan-100 text-cyan-800' :
                                'bg-slate-100 text-slate-800'
                              }
                            >
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleDownload(doc.id, doc.title, doc.file_url)}
                                disabled={downloadingIds.has(doc.id) || !doc.file_url}
                                title={!doc.file_url ? 'File URL missing' : 'Download'}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Grid view */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedDocs.map(doc => (
                    <Card key={doc.id} className="border-slate-200 overflow-hidden group hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-4">
                          <Checkbox
                            checked={selectedDocs.includes(doc.id)}
                            onCheckedChange={() => handleSelectDoc(doc.id)}
                          />
                          <div className="p-3 bg-cyan-50 rounded-lg flex-shrink-0">
                            <FileText className="h-6 w-6 text-[#00a8b5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-slate-900 mb-2 line-clamp-2">{doc.title}</h4>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600">{doc.product}</p>
                              <p className="text-xs text-slate-600">{doc.category}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{doc.version}</Badge>
                                <Badge 
                                  className={
                                    doc.status === 'New' ? 'bg-green-100 text-green-800 text-xs' :
                                    doc.status === 'Updated' ? 'bg-cyan-100 text-cyan-800 text-xs' :
                                    'bg-slate-100 text-slate-800 text-xs'
                                  }
                                >
                                  {doc.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {documentDownloadCounts[doc.id] !== undefined
                                ? documentDownloadCounts[doc.id]
                                : '-'}
                            </span>
                            <span>{formatDate(doc.updated_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="mr-2 h-3 w-3" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-[#00a8b5] hover:bg-[#008a95]"
                            onClick={() => handleDownload(doc.id, doc.title, doc.file_url)}
                            disabled={downloadingIds.has(doc.id) || !doc.file_url}
                            title={!doc.file_url ? 'File URL missing' : ''}
                          >
                            <Download className="mr-2 h-3 w-3" />
                            {downloadingIds.has(doc.id) ? 'Downloading...' : !doc.file_url ? 'No File' : 'Download'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && filteredAndSortedDocs.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No documents found matching your search</p>
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}