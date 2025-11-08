import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  ArrowRight, 
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Bell,
  FileText,
  GraduationCap,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from '../ui/sheet';
import { useAnnouncements } from '../../hooks/useData';

const categoryColors: Record<string, string> = {
  'New Product': 'bg-[#10b981] text-white',
  'Marketing': 'bg-[#8b5cf6] text-white',
  'Documentation': 'bg-[#3b82f6] text-white',
  'Training': 'bg-[#9333ea] text-white',
  'Policy': 'bg-[#f59e0b] text-white',
  'default': 'bg-slate-500 text-white',
};

const categoryIcons: Record<string, any> = {
  'Documentation': FileText,
  'Training': GraduationCap,
  'New Product': Package,
  'Marketing': Bell,
  'default': Bell,
};

export default function MobileWhatsNew() {
  const { announcements, loading, error } = useAnnouncements();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  // Sort announcements by date (most recent first)
  const sortedAnnouncements = [...announcements]
    .filter(a => a.title && a.title.trim() !== '')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const categories = ['all', ...new Set(sortedAnnouncements.map(u => u.category).filter(Boolean))];

  const filteredUpdates = sortedAnnouncements.filter(update => {
    const matchesSearch = update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (update.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || update.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <div className="text-red-600 font-medium mb-2">Failed to load announcements</div>
        <p className="text-sm text-slate-600 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Page Title */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">What's New</h1>
        <p className="text-slate-600 text-sm">Latest updates and announcements</p>
      </div>

      {/* Search and Filter */}
      <div className="px-4 pb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-white">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter by Category</SheetTitle>
              <SheetDescription>
                Select a category to filter announcements
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 mt-6 pb-6 overflow-y-auto max-h-[60vh]">
              {categories.map((category) => (
                <SheetClose asChild key={category}>
                  <Button
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="justify-start h-12 text-base"
                    onClick={() => {
                      setSelectedCategory(category);
                      setFilterOpen(false);
                    }}
                  >
                    {category === 'all' ? 'All Categories' : category}
                  </Button>
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Announcements List */}
      <div className="px-4 space-y-4">
        {filteredUpdates.map((update, index) => {
          const IconComponent = categoryIcons[update.category] || categoryIcons.default;
          
          // First announcement gets featured hero card
          if (index === 0) {
            return (
              <div 
                key={update.id} 
                className="rounded-xl overflow-hidden shadow-lg p-6"
                style={{ background: 'linear-gradient(135deg, #00a8b5 0%, #008a95 100%)' }}
              >
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                    {update.category || 'Announcement'}
                  </span>
                  <span className="text-white/90 text-sm">{formatDate(update.created_at)}</span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3">
                  {update.title}
                </h2>
                
                {update.content && (
                  <p className="text-white/90 text-base leading-relaxed mb-4">
                    {truncateText(update.content, 250)}
                  </p>
                )}

                {update.link && (
                  <div className="mt-4 pt-2">
                    <Link to={update.link}>
                      <button 
                        className="px-6 py-3 bg-white text-[#00a8b5] rounded-lg font-semibold hover:bg-white/95 transition-colors shadow-md"
                        style={{ display: 'inline-block' }}
                      >
                        {update.link_text || 'Learn More'}
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          // All other announcements get regular cards
          return (
            <Card 
              key={update.id} 
              className="overflow-hidden transition-all hover:shadow-md bg-white"
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      categoryColors[update.category]?.replace('text-white', '') || 'bg-slate-100'
                    }`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {update.category || 'General'}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDate(update.created_at)}</span>
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-2 text-lg">
                      {update.title}
                    </h3>
                    {update.content && (
                      <p className="text-slate-600 text-sm leading-relaxed mb-3">
                        {truncateText(update.content, 150)}
                      </p>
                    )}

                    {update.link && (
                      <Link to={update.link} className="inline-block">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-[#00a8b5] hover:text-[#008a95] hover:bg-[#00a8b5]/5 -ml-2 gap-1 h-8"
                        >
                          {update.link_text || 'Learn More'}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredUpdates.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <div className="text-slate-400 mb-2">No updates found</div>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
