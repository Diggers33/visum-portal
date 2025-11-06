import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  ArrowRight, 
  Search,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { useAnnouncements } from '../../hooks/useData';

const categoryColors: Record<string, string> = {
  'New Product': 'bg-[#10b981] text-white',
  'Marketing': 'bg-[#8b5cf6] text-white',
  'Documentation': 'bg-[#3b82f6] text-white',
  'Training': 'bg-[#06b6d4] text-white',
  'Policy': 'bg-[#f59e0b] text-white',
  'default': 'bg-slate-500 text-white',
};

export default function MobileWhatsNew() {
  const { announcements, loading, error } = useAnnouncements();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...new Set(announcements.map(u => u.category).filter(Boolean))];

  const filteredUpdates = announcements.filter(update => {
    const matchesSearch = update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (update.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || update.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading updates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2 text-slate-900">Unable to Load Updates</h2>
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
        <h1 className="mb-2">What's New</h1>
        <p className="text-white/90">Latest updates and announcements</p>
      </div>

      {/* Search and Filter */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-10 rounded-xl"
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl">
              <Filter className="h-4 w-4" />
              Filter: {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Filter by Category</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`w-full justify-start ${selectedCategory === cat ? 'bg-[#00a8b5] hover:bg-[#008a95]' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Updates List */}
      <div className="p-4 space-y-4">
        {filteredUpdates.map((update) => (
          <Card key={update.id} className="overflow-hidden border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <Badge className={`${categoryColors[update.category] || categoryColors.default} text-xs px-2 py-0.5`}>
                  {update.category}
                </Badge>
                <span className="text-xs text-slate-500">{formatDate(update.created_at)}</span>
              </div>
              
              <h3 className="mb-2 text-slate-900">{update.title}</h3>
              <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                {update.content}
              </p>

              {update.link && (
                <Link to={update.link}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-[#00a8b5] hover:text-[#008a95] hover:bg-[#00a8b5]/5 -ml-2 gap-1 h-9"
                  >
                    {update.link_text || 'Learn More'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredUpdates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">No updates found</div>
            <p className="text-sm text-slate-500">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
