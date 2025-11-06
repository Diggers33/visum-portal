import { useState } from 'react';
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
  AlertCircle as AlertCircleIcon,
  Filter,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '../ui/sheet';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { useDocumentation } from '../../hooks/useData';

const iconMap: Record<string, any> = {
  'User Manual': BookOpen,
  'Installation': Wrench,
  'Calibration': FileText,
  'Troubleshooting': AlertCircleIcon,
  'API': FileText,
  'Maintenance': Wrench,
  'default': FileText,
};

const colorMap: Record<string, string> = {
  'User Manual': 'bg-blue-50 text-blue-600',
  'Installation': 'bg-orange-50 text-orange-600',
  'Calibration': 'bg-green-50 text-green-600',
  'Troubleshooting': 'bg-red-50 text-red-600',
  'API': 'bg-purple-50 text-purple-600',
  'Maintenance': 'bg-orange-50 text-orange-600',
  'default': 'bg-slate-50 text-slate-600',
};

const faqs = [
  {
    question: 'How often should I calibrate my NIR analyzer?',
    answer: 'We recommend calibrating your NIR analyzer every 6 months or after 1000 measurements, whichever comes first. If you notice drift in measurements, calibrate immediately.',
  },
  {
    question: 'What are the storage requirements?',
    answer: 'Store instruments in a clean, dry environment at 15-30°C. Avoid direct sunlight and keep away from corrosive materials.',
  },
  {
    question: 'How do I update firmware?',
    answer: 'Connect your device via USB, download the latest firmware from the portal, and follow the step-by-step instructions in the firmware update guide.',
  },
  {
    question: 'What warranty coverage is included?',
    answer: 'All IRIS products include a 2-year warranty covering manufacturing defects. Extended warranty options are available for purchase.',
  },
];

export default function MobileTechnicalDocs() {
  const { documents, loading, error } = useDocumentation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['All Products']);
  const [filterOpen, setFilterOpen] = useState(false);

  const categories = ['All', ...new Set(documents.map(d => d.category).filter(Boolean))];
  const products = ['All Products', ...new Set(documents.map(d => d.product_name).filter(Boolean))];

  const handleCategoryToggle = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
    } else {
      const newCategories = selectedCategories.filter(c => c !== 'All');
      if (selectedCategories.includes(category)) {
        const filtered = newCategories.filter(c => c !== category);
        setSelectedCategories(filtered.length === 0 ? ['All'] : filtered);
      } else {
        setSelectedCategories([...newCategories, category]);
      }
    }
  };

  const handleProductToggle = (product: string) => {
    if (product === 'All Products') {
      setSelectedProducts(['All Products']);
    } else {
      const newProducts = selectedProducts.filter(p => p !== 'All Products');
      if (selectedProducts.includes(product)) {
        const filtered = newProducts.filter(p => p !== product);
        setSelectedProducts(filtered.length === 0 ? ['All Products'] : filtered);
      } else {
        setSelectedProducts([...newProducts, product]);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.includes('All') || selectedCategories.includes(doc.category);
    const matchesProduct = selectedProducts.includes('All Products') || selectedProducts.includes(doc.product_name);
    return matchesSearch && matchesCategory && matchesProduct;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeFiltersCount = 
    (selectedCategories.includes('All') ? 0 : selectedCategories.length) +
    (selectedProducts.includes('All Products') ? 0 : selectedProducts.length);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
        <h1 className="mb-2">Documentation</h1>
        <p className="text-white/90">Technical guides and resources</p>
      </div>

      {/* Search and Filter */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-10 rounded-xl"
          />
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-auto bg-[#00a8b5] text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter Documents</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] pb-4">
              {/* Category Filter */}
              <div>
                <h3 className="mb-3 text-slate-900">Category</h3>
                <div className="space-y-3">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center gap-2">
                      <Checkbox
                        id={`mobile-doc-cat-${cat}`}
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => handleCategoryToggle(cat)}
                      />
                      <Label htmlFor={`mobile-doc-cat-${cat}`} className="text-sm">
                        {cat}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Filter */}
              <div>
                <h3 className="mb-3 text-slate-900">Product</h3>
                <div className="space-y-3">
                  {products.map(prod => (
                    <div key={prod} className="flex items-center gap-2">
                      <Checkbox
                        id={`mobile-doc-prod-${prod}`}
                        checked={selectedProducts.includes(prod)}
                        onCheckedChange={() => handleProductToggle(prod)}
                      />
                      <Label htmlFor={`mobile-doc-prod-${prod}`} className="text-sm">
                        {prod}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
              <SheetClose asChild>
                <Button className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl">
                  View {filteredDocs.length} documents
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Documents List */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const Icon = iconMap[doc.category] || iconMap.default;
            const color = colorMap[doc.category] || colorMap.default;
            
            return (
              <Card key={doc.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 text-slate-900 leading-tight">{doc.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {doc.product_name}
                        </Badge>
                        {doc.version && <span>{doc.version}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <span>{doc.file_type || 'PDF'}</span>
                        <span>•</span>
                        <span>{doc.file_size || 'N/A'}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full h-9 rounded-lg gap-1"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-8">
          <h2 className="mb-4 px-1 text-slate-900">Frequently Asked Questions</h2>
          <Card className="border-slate-200">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-slate-200">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="text-sm text-left">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-slate-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">No documents found</div>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
