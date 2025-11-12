import { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Search,
  Download,
  FileText,
  BookOpen,
  Wrench,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Shield,
  ArrowLeft,
  Eye,
  Share2,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { useDocumentation } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// Map database categories to UI categories
const categoryMapping: Record<string, string> = {
  'Installation': 'Installation Guide',
  'installation': 'Installation Guide',
  'Setup': 'Installation Guide',
  'Maintenance': 'Maintenance Procedure',
  'maintenance': 'Maintenance Procedure',
  'Calibration': 'Maintenance Procedure',
  'Troubleshooting': 'Troubleshooting',
  'troubleshooting': 'Troubleshooting',
  'Error': 'Troubleshooting',
  'Diagnostics': 'Troubleshooting',
  'Software Update': 'Software Update',
  'Firmware': 'Software Update',
  'Update': 'Software Update',
  'Compliance': 'Compliance Document',
  'Compliance Document': 'Compliance Document',
  'Certification': 'Compliance Document',
  'Safety': 'Compliance Document',
  'Regulatory': 'Compliance Document',
};

// Category configuration
const categoryConfig = {
  'Installation Guide': {
    icon: BookOpen,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    description: 'Setup and installation instructions',
  },
  'Maintenance Procedure': {
    icon: Wrench,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    description: 'Scheduled maintenance and care procedures',
  },
  'Troubleshooting': {
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    description: 'Common issues and solutions',
  },
  'Software Update': {
    icon: RefreshCw,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    description: 'Instructions for updating software and firmware',
  },
  'Compliance Document': {
    icon: Shield,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    description: 'Certifications and compliance documentation',
  },
};

// File type configuration
const getFileTypeConfig = (fileType: string) => {
  const type = fileType?.toUpperCase() || 'PDF';
  const configs: Record<string, { bgColor: string; textColor: string }> = {
    'PDF': { bgColor: 'bg-red-600', textColor: 'text-white' },
    'DOCX': { bgColor: 'bg-blue-600', textColor: 'text-white' },
    'DOC': { bgColor: 'bg-blue-600', textColor: 'text-white' },
    'XLSX': { bgColor: 'bg-green-600', textColor: 'text-white' },
    'XLS': { bgColor: 'bg-green-600', textColor: 'text-white' },
  };
  return configs[type] || { bgColor: 'bg-slate-600', textColor: 'text-white' };
};

// Format file size to MB
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Category List View Component
function CategoryListView({
  categories,
  searchQuery,
  setSearchQuery,
  onSelectCategory
}: {
  categories: Array<{ name: string; count: number }>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectCategory: (category: string) => void;
}) {
  // Filter categories based on search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <h1 className="text-slate-900 mb-1">Technical Documentation</h1>
        <p className="text-sm text-slate-600">Product manuals, datasheets, and technical guides</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="p-4 space-y-3 pb-20">
        {filteredCategories.map((category) => {
          const config = categoryConfig[category.name as keyof typeof categoryConfig];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <Card
              key={category.name}
              className="border-slate-200 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              onClick={() => onSelectCategory(category.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-900 mb-0.5 leading-tight">
                      {category.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {category.count} {category.count === 1 ? 'document' : 'documents'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <div className="rounded-full bg-slate-100 p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 mb-2">No categories found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Category Detail View Component
function CategoryDetailView({
  category,
  documents,
  products,
  onBack
}: {
  category: string;
  documents: any[];
  products: string[];
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const config = categoryConfig[category as keyof typeof categoryConfig];
  const Icon = config?.icon || FileText;

  // Check if any filters are active
  const hasActiveFilters = selectedProducts.length > 0;
  const activeFiltersCount = selectedProducts.length;

  const clearAllFilters = () => {
    setSelectedProducts([]);
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(doc.product || doc.product_name);

    return matchesSearch && matchesProduct;
  });

  // Handle preview
  const handlePreview = (url: string, title: string) => {
    try {
      window.open(url, '_blank');
      toast.success(`${title} opened`);
    } catch (err) {
      console.error('Error opening document:', err);
      toast.error('Failed to open document');
    }
  };

  // Handle download with counter increment
  const handleDownload = async (doc: any) => {
    try {
      // Increment download counter
      const { error } = await supabase
        .from('documentation')
        .update({
          download_count: (doc.download_count || 0) + 1
        })
        .eq('id', doc.id);

      if (error) {
        console.error('Error incrementing download count:', error);
      }

      // Open file
      window.open(doc.file_url, '_blank');
      toast.success(`${doc.title} download started`);
    } catch (err) {
      console.error('Error downloading document:', err);
      toast.error('Failed to download document');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={`h-10 w-10 rounded-xl ${config?.iconBg} ${config?.iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-slate-900 leading-tight truncate">{category}</h1>
            <p className="text-xs text-slate-600">{config?.description}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-11 rounded-xl"
          />
        </div>

        {/* Filter Button */}
        <div className="flex items-center gap-2">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 justify-center gap-2 h-10 rounded-xl">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-auto bg-[#00a8b5] text-white h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <SheetTitle>Filters</SheetTitle>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-[#00a8b5] h-8"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 py-4">
                  {/* Product filter */}
                  <div>
                    <h4 className="text-sm text-slate-900 mb-3">Product</h4>
                    <div className="space-y-3">
                      {products.map(product => (
                        <div key={product} className="flex items-center space-x-2">
                          <Checkbox
                            id={`product-${product}`}
                            checked={selectedProducts.includes(product)}
                            onCheckedChange={() => {
                              setSelectedProducts(prev =>
                                prev.includes(product)
                                  ? prev.filter(p => p !== product)
                                  : [...prev, product]
                              );
                            }}
                          />
                          <Label htmlFor={`product-${product}`} className="text-sm">
                            {product}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extra padding at bottom for scrolling */}
                  <div className="h-20" />
                </div>
              </ScrollArea>

              <div className="p-4 bg-white border-t border-slate-200">
                <Button
                  className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl"
                  onClick={() => setFilterOpen(false)}
                >
                  View {filteredDocuments.length} documents
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAllFilters}
              className="h-10 w-10 rounded-xl shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-600">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      </div>

      {/* Documents List */}
      <div className="p-4 space-y-4 pb-20">
        {filteredDocuments.map(doc => {
          const fileConfig = getFileTypeConfig(doc.format || doc.file_type);

          return (
            <Card key={doc.id} className="overflow-hidden border-slate-200 shadow-sm">
              {/* File Type Header Stripe */}
              <div className={`h-1.5 ${fileConfig.bgColor}`} />

              {/* Thumbnail Section */}
              <div
                className="relative h-40 bg-slate-100"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(51, 65, 85, 0.6))`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                  <Badge className="bg-white/95 text-slate-900 text-[10px] px-2 py-0.5 shrink-0">
                    {doc.product || doc.product_name || 'General'}
                  </Badge>
                  {doc.language && (
                    <Badge className="bg-cyan-500 text-white text-[10px] px-2 py-0.5 shrink-0">
                      {doc.language === 'EN' ? 'English' : doc.language}
                    </Badge>
                  )}
                </div>

                {/* Centered File Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`${fileConfig.bgColor} ${fileConfig.textColor} rounded-2xl p-5 shadow-xl`}>
                    <FileText className="h-14 w-14" strokeWidth={1.5} />
                  </div>
                </div>

                {/* File Type Badge */}
                <div className="absolute bottom-3 left-3">
                  <Badge className={`${fileConfig.bgColor} ${fileConfig.textColor} text-[10px] px-2 py-1 flex items-center gap-1`}>
                    <FileText className="h-3 w-3" />
                    {(doc.format || doc.file_type || 'PDF').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <h3 className="text-slate-900 mb-1.5 line-clamp-2 leading-snug">
                  {doc.title}
                </h3>
                {doc.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {doc.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-3 pb-3 border-b border-slate-200">
                  {doc.version && (
                    <>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {doc.version}
                      </Badge>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                    </>
                  )}
                  <span>{formatFileSize(doc.file_size)}</span>
                  {doc.pages && (
                    <>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{doc.pages} pages</span>
                    </>
                  )}
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{formatDate(doc.updated_at || doc.created_at)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 rounded-xl border-slate-300 gap-2"
                    onClick={() => handlePreview(doc.file_url, doc.title)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    className="flex-1 bg-[#00a8b5] hover:bg-[#008a95] h-10 rounded-xl gap-2"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl border-slate-300"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: doc.title,
                          text: doc.description,
                          url: doc.file_url,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(doc.file_url);
                        toast.success('Link copied to clipboard');
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-16">
            <div className="rounded-full bg-slate-100 p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 mb-2">No documents found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function MobileTechnicalDocs() {
  const { documents, loading, error } = useDocumentation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter for published documents only
  const publishedDocs = useMemo(() => {
    return documents.filter(doc => doc.status === 'published');
  }, [documents]);

  // Map documents to UI categories and calculate counts
  const categoriesWithCounts = useMemo(() => {
    const categoryMap = new Map<string, number>();

    publishedDocs.forEach(doc => {
      // Map database category to UI category
      const uiCategory = categoryMapping[doc.category] || 'Installation Guide';
      categoryMap.set(uiCategory, (categoryMap.get(uiCategory) || 0) + 1);
    });

    // Ensure all 5 categories exist with at least 0 count
    const allCategories = [
      'Installation Guide',
      'Maintenance Procedure',
      'Troubleshooting',
      'Software Update',
      'Compliance Document',
    ];

    return allCategories.map(name => ({
      name,
      count: categoryMap.get(name) || 0,
    }));
  }, [publishedDocs]);

  // Get documents for selected category
  const categoryDocuments = useMemo(() => {
    if (!selectedCategory) return [];

    return publishedDocs.filter(doc => {
      const uiCategory = categoryMapping[doc.category] || 'Installation Guide';
      return uiCategory === selectedCategory;
    });
  }, [publishedDocs, selectedCategory]);

  // Get unique products for filter
  const products = useMemo(() => {
    const productSet = new Set<string>();
    categoryDocuments.forEach(doc => {
      const product = doc.product || doc.product_name;
      if (product) productSet.add(product);
    });
    return Array.from(productSet).sort();
  }, [categoryDocuments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2 text-slate-900">Unable to Load Documentation</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#00a8b5] hover:bg-[#008a95]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show category detail view if category selected
  if (selectedCategory) {
    return (
      <CategoryDetailView
        category={selectedCategory}
        documents={categoryDocuments}
        products={products}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  // Show category list view
  return (
    <CategoryListView
      categories={categoriesWithCounts}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onSelectCategory={setSelectedCategory}
    />
  );
}
