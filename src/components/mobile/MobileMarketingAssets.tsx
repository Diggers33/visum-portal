import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Search, 
  Download,
  FileImage,
  FileText,
  Video,
  Presentation,
  Filter,
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
import { useMarketingAssets } from '../../hooks/useData';

const iconMap: Record<string, any> = {
  'PDF': FileText,
  'PPTX': Presentation,
  'ZIP': FileImage,
  'MP4': Video,
  'default': FileText,
};

const colorMap: Record<string, string> = {
  'PDF': 'bg-blue-50 text-blue-600',
  'PPTX': 'bg-orange-50 text-orange-600',
  'ZIP': 'bg-green-50 text-green-600',
  'MP4': 'bg-purple-50 text-purple-600',
  'default': 'bg-slate-50 text-slate-600',
};

export default function MobileMarketingAssets() {
  const { assets, loading, error } = useMarketingAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  const [filterOpen, setFilterOpen] = useState(false);

  const categories = ['All', ...new Set(assets.map(a => a.category).filter(Boolean))];

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

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.includes('All') || selectedCategories.includes(asset.category);
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeFiltersCount = selectedCategories.includes('All') ? 0 : selectedCategories.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2 text-slate-900">Unable to Load Assets</h2>
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
        <h1 className="mb-2">Marketing Assets</h1>
        <p className="text-white/90">{filteredAssets.length} resources available</p>
      </div>

      {/* Search and Filter */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-10 rounded-xl"
          />
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl">
              <Filter className="h-4 w-4" />
              Filter by Type
              {activeFiltersCount > 0 && (
                <Badge className="ml-auto bg-[#00a8b5] text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter by Type</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-3 pb-4">
              {categories.map(cat => (
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

            <div className="pt-4 border-t border-slate-200">
              <SheetClose asChild>
                <Button className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl">
                  View {filteredAssets.length} assets
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Assets List */}
      <div className="p-4 space-y-3">
        {filteredAssets.map((asset) => {
          const Icon = iconMap[asset.asset_type] || iconMap.default;
          const color = colorMap[asset.asset_type] || colorMap.default;
          
          return (
            <Card key={asset.id} className="border-slate-200 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 text-slate-900 leading-tight">{asset.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <span>{asset.asset_type}</span>
                      <span>•</span>
                      <span>{asset.file_size || 'N/A'}</span>
                      <span>•</span>
                      <span>{formatDate(asset.created_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-9 rounded-lg gap-1"
                        onClick={() => window.open(asset.file_url, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                      {asset.file_url && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 px-3 text-[#00a8b5]"
                          onClick={() => window.open(asset.file_url, '_blank')}
                        >
                          Preview
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">No assets found</div>
            <p className="text-sm text-slate-500">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
