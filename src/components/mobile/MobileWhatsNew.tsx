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
  'New Product': 'bg-[#10b981]',
  'Marketing': 'bg-[#8b5cf6]',
  'Documentation': 'bg-[#3b82f6]',
  'Training': 'bg-[#9333ea]',
  'Policy': 'bg-[#f59e0b]',
  'default': 'bg-slate-500',
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

  // Debug: Log announcements to see what we're working with
  console.log('Announcements:', announcements);

  const categories = ['all', ...new Set(announcements.map(u => u.category).filter(Boolean))];

  // Better featured announcement logic with fallbacks
  let featuredAnnouncement = null;
  if (announcements.length > 0) {
    // First try to find "New Product"
    featuredAnnouncement = announcements.find(a => a.category === 'New Product');
    
    // If no "New Product", try other priority categories
    if (!featuredAnnouncement) {
      featuredAnnouncement = announcements.find(a => ['Marketing', 'Training', 'Documentation'].includes(a.category));
    }
    
    // If still nothing, just use the first announcement
    if (!featuredAnnouncement) {
      featuredAnnouncement = announcements[0];
    }
  }

  // Other announcements (exclude featured one)
  const otherAnnouncements = featuredAnnouncement ? 
    announcements.filter(a => a.id !== featuredAnnouncement.id) : 
    announcements;

  const filteredUpdates = otherAnnouncements.filter(update => {
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
          <h2 className="text-xl font-semibold mb-2 text-slate-900">Unable to Load Updates</h2>
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
      {/* Page Title Only */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">What's New</h1>
          <p className="text-slate-600">Latest updates and announcements</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Featured Announcement - Always Show If We Have Announcements */}
        {featuredAnnouncement && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-white/20 text-white border-0 text-xs px-3 py-1">
                  {featuredAnnouncement.category || 'Announcement'}
                </Badge>
                <span className="text-white/90 text-sm">
                  {formatDate(featuredAnnouncement.created_at)}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white">
                {featuredAnnouncement.title}
              </h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                {featuredAnnouncement.content}
              </p>

              {featuredAnnouncement.link && (
                <Link to={featuredAnnouncement.link}>
                  <Button 
                    className="bg-white text-[#00a8b5] hover:bg-white/90 font-medium"
                  >
                    {featuredAnnouncement.link_text || 'Learn More'}
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Search and Filter - Only show if we have other announcements */}
        {otherAnnouncements.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
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
        )}

        {/* Other Announcements */}
        {filteredUpdates.map((update) => {
          const IconComponent = categoryIcons[update.category] || categoryIcons.default;
          const colorClass = categoryColors[update.category] || categoryColors.default;
          
          return (
            <Card key={update.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`p-2.5 rounded-lg ${colorClass} text-white`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {update.category}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(update.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-2">{update.title}</h3>
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

        {/* No announcements state */}
        {announcements.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <div className="text-slate-400 mb-2">No updates available</div>
            <p className="text-sm text-slate-500">Check back later for new announcements</p>
          </div>
        )}

        {/* Debug info (remove this in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
            <strong>Debug:</strong> Found {announcements.length} announcements. 
            Featured: {featuredAnnouncement ? featuredAnnouncement.title : 'None'}
          </div>
        )}
      </div>
    </div>
  );
}
