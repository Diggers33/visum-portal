import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useProducts } from '../../hooks/useData';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '../ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export default function MobileProductCatalog() {
  const { products, loading, error } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  // Extract unique categories and industries from products
  const categories = Array.from(new Set(products.map(p => p.category || p.product_line).filter(Boolean)));
  const industries = Array.from(new Set(products.flatMap(p => p.industries || []).filter(Boolean)));

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedIndustries([]);
    setSearchQuery('');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategories.length === 0 || 
      selectedCategories.includes(product.category || product.product_line);
    
    const matchesIndustry = 
      selectedIndustries.length === 0 || 
      (product.industries && product.industries.some((i: string) => selectedIndustries.includes(i)));
    
    return matchesSearch && matchesCategory && matchesIndustry;
  });

  const activeFiltersCount = selectedCategories.length + selectedIndustries.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading products: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
        <h1 className="mb-2">Product Catalog</h1>
        <p className="text-white/90">{filteredProducts.length} products available</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-10 rounded-xl"
          />
        </div>

        <div className="flex gap-2">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start gap-2 h-10 rounded-xl relative">
                <SlidersHorizontal className="h-4 w-4" />
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
                <div className="flex items-center justify-between">
                  <SheetTitle>Filters</SheetTitle>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-[#00a8b5]">
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetHeader>
              
              <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] pb-4">
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-slate-900">Category</h3>
                    <div className="space-y-3">
                      {categories.map((cat) => (
                        <div key={cat} className="flex items-center gap-2">
                          <Checkbox
                            id={`mobile-cat-${cat}`}
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={() => handleCategoryToggle(cat)}
                          />
                          <Label htmlFor={`mobile-cat-${cat}`} className="text-sm">
                            {cat}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Industry Filter */}
                {industries.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-slate-900">Industry</h3>
                    <div className="space-y-3">
                      {industries.map((industry) => (
                        <div key={industry} className="flex items-center gap-2">
                          <Checkbox
                            id={`mobile-industry-${industry}`}
                            checked={selectedIndustries.includes(industry)}
                            onCheckedChange={() => handleIndustryToggle(industry)}
                          />
                          <Label htmlFor={`mobile-industry-${industry}`} className="text-sm">
                            {industry}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
                <SheetClose asChild>
                  <Button className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl">
                    View {filteredProducts.length} products
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4 space-y-4">
        {filteredProducts.map((product) => (
          <Link key={product.id} to={`/mobile/products/${product.id}`}>
            <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4 p-4">
                {/* Product Image */}
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-1.5"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                      No image
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      {(product.category || product.product_line) && (
                        <Badge variant="outline" className="text-[10px] mb-1.5">
                          {product.category || product.product_line}
                        </Badge>
                      )}
                      <h3 className="text-slate-900 leading-tight mb-1">{product.name}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                    {product.description || 'No description available'}
                  </p>

                  <div className="flex items-center justify-between">
                    {product.price && (
                      <div className="text-[#00a8b5] font-medium">{product.price}</div>
                    )}
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">No products found</div>
            <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={clearAllFilters} className="rounded-xl">
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
