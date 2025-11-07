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
  GraduationCap
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
  'Update': 'bg-[#06b6d4] text-white',
  'default': 'bg-slate-500 text-white',
};

const categoryIcons: Record<string, any> = {
  'Documentation': FileText,
  'Training': GraduationCap,
  'New Product': ArrowRight,
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

  // Get featured announcement (most recent "New Product" or first announcement)
  const featuredAnnouncement = announcements.find(a => a.category === 'New Product') || announcements[0];
  const otherAnnouncements = announcements.filter(a => a.id !== featuredAnnouncement?.id);

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
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-medium text-[#00a8b5]">Visum®</h1>
            <p className="text-sm text-slate-600">By IRIS Technology</p>
          </div>
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400" />
            <div className="relative">
              <Bell className="h-5 w-5 text-slate-400" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-medium">3</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">What's New</h2>
          <p className="text-slate-600">Latest updates and announcements</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Featured Announcement */}
        {featuredAnnouncement && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-white/20 text-white border-0 text-xs px-3 py-1">
                  {featuredAnnouncement.category}
                </Badge>
                <span className="text-white/90 text-sm">{formatDate(featuredAnnouncement.created_at)}</span>
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

        {/* Other Announcements */}
        {otherAnnouncements.filter(update => {
          const matchesSearch = update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               (update.content || '').toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = selectedCategory === 'all' || update.category === selectedCategory;
          return matchesSearch && matchesCategory;
        }).map((update) => {
          const IconComponent = categoryIcons[update.category] || categoryIcons.default;
          
          return (
            <Card key={update.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`p-2 rounded-lg ${categoryColors[update.category] || categoryColors.default}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {update.category}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDate(update.created_at)}</span>
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-2">{update.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {update.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

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
