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
  'default': Bell,
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
      {/* Single Clean Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00a8b5] to-[#008a95] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Visum® By IRIS Technology</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="h-5 w-5 text-slate-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#00a8b5] rounded-full"></span>
            </Button>
          </div>
        </div>
      </div>

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

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-white">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[300px]">
            <SheetHeader>
              <SheetTitle>Filter by Category</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 mt-4">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? 'All Categories' : category}
                </Button>
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
              <Card 
                key={update.id} 
                className="overflow-hidden bg-gradient-to-br from-[#00a8b5] to-[#008a95] border-0 shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20">
                      {update.category}
                    </Badge>
                    <span className="text-white/90 text-sm">{formatDate(update.created_at)}</span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {update.title}
                  </h2>
                  
                  <p className="text-white/90 text-base leading-relaxed mb-6">
                    {update.content}
                  </p>

                  {update.link && (
                    <Link to={update.link}>
                      <Button 
                        className="bg-white text-[#00a8b5] hover:bg-white/90 font-semibold"
                      >
                        {update.link_text || 'Learn More'}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          }

          // All other announcements get regular cards
          return (
            <Card 
              key={update.id} 
              className="overflow-hidden transition-all hover:shadow-md"
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
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {update.category}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDate(update.created_at)}</span>
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-2 text-lg">{update.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {update.content}
                    </p>

                    {update.link && (
                      <Link to={update.link} className="inline-block mt-3">
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
