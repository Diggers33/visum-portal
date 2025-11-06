import { useState, useMemo } from 'react';
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
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
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
import { useProducts } from '../../hooks/useData';

export default function MobileProductCatalog() {
  const { products: backendProducts, loading, error } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  // Extract unique values from backend data
  const technologies = useMemo(() => 
    Array.from(new Set(backendProducts.map(p => p.category).filter(Boolean))),
    [backendProducts]
  );

  const industries = useMemo(() => 
    Array.from(new Set(backendProducts.flatMap(p => 
      typeof p.industries === 'string' ? JSON.parse(p.industries) : (p.industries || [])
    ))),
    [backendProducts]
  );

  const series = useMemo(() => 
    Array.from(new Set(backendProducts.map(p => p.series).filter(Boolean))),
    [backendProducts]
  );

  const handleTechnologyToggle = (tech: string) => {
    setSelectedTechnologies(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  const handleSeriesToggle = (s: string) => {
    setSelectedSeries(prev =>
      prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
    );
  };

  const clearAllFilters = () => {
    setSelectedTechnologies([]);
    setSelectedIndustries([]);
    setSelectedSeries([]);
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    return backendProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTech = selectedTechnologies.length === 0 || selectedTechnologies.includes(product.category);
      
      const productIndustries = typeof product.industries === 'string' 
        ? JSON.parse(product.industries) 
        : (product.industries || []);
      const matchesIndustry = selectedIndustries.length === 0 || 
        productIndustries.some((i: string) => selectedIndustries.includes(i));
      
      const matchesSeries = selectedSeries.length === 0 || selectedSeries.includes(product.series);
      
      return matchesSearch && matchesTech && matchesIndustry && matchesSeries;
    });
  }, [backendProducts, searchQuery, selectedTechnologies, selectedIndustries, selectedSeries]);

  const activeFiltersCount = selectedTechnologies.length + selectedIndustries.length + selectedSeries.length;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2 text-slate-900">Unable to Load Products</h2>
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
                {/* Technology Filter */}
                <div>
                  <h3 className="mb-3 text-slate-900">Technology</h3>
                  <div className="space-y-3">
                    {technologies.map((tech) => (
                      <div key={tech} className="flex items-center gap-2">
                        <Checkbox
                          id={`mobile-tech-${tech}`}
                          checked={selectedTechnologies.includes(tech)}
                          onCheckedChange={() => handleTechnologyToggle(tech)}
                        />
                        <Label htmlFor={`mobile-tech-${tech}`} className="text-sm">
                          {tech}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Industry Filter */}
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

                {/* Series Filter */}
                <div>
                  <h3 className="mb-3 text-slate-900">Product Series</h3>
                  <div className="space-y-3">
                    {series.map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <Checkbox
                          id={`mobile-series-${s}`}
                          checked={selectedSeries.includes(s)}
                          onCheckedChange={() => handleSeriesToggle(s)}
                        />
                        <Label htmlFor={`mobile-series-${s}`} className="text-sm">
                          {s}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
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
              <SelectItem value="price-low">Price: Low</SelectItem>
              <SelectItem value="price-high">Price: High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4 space-y-4">
        {filteredProducts.map((product) => {
          const specs = typeof product.specifications === 'string' 
            ? JSON.parse(product.specifications) 
            : (product.specifications || {});
          const specsArray = Object.entries(specs).slice(0, 3).map(([key, value]) => `${value}`);
          
          return (
            <Link key={product.id} to={`/mobile/products/${product.id}`}>
              <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-4 p-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-24 h-24 bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <ImageWithFallback
                      src={product.image_url || ''}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1.5">
                          {product.category}
                        </Badge>
                        <h3 className="text-slate-900 leading-tight mb-1">{product.name}</h3>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-[#00a8b5]">{product.price || 'Contact for pricing'}</div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Specs */}
                {specsArray.length > 0 && (
                  <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
                    {specsArray.map((spec, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] whitespace-nowrap bg-slate-100 text-slate-600">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}

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
