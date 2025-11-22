import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  ArrowRight, 
  Search,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAccessibleAnnouncements } from '../lib/api/distributor-content';

const categoryColors: Record<string, string> = {
  'New Product': 'bg-[#10b981] text-white',
  'Marketing': 'bg-[#8b5cf6] text-white',
  'Documentation': 'bg-[#3b82f6] text-white',
  'Training': 'bg-[#06b6d4] text-white',
  'Policy': 'bg-[#f59e0b] text-white',
  'General': 'bg-[#6b7280] text-white',
};

interface Announcement {
  id: string;
  category: string;
  title: string;  // Legacy field
  content: string;  // Legacy field
  title_en?: string;
  title_es?: string;
  content_en?: string;
  content_es?: string;
  link_text: string | null;
  link_url: string | null;
  created_at: string;
}

export default function WhatsNew() {
  const { t, i18n } = useTranslation('common');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Get display title based on current language with fallback
  const getDisplayTitle = (announcement: Announcement): string => {
    const currentLang = i18n.language;
    if (currentLang === 'es') {
      return announcement.title_es || announcement.title_en || announcement.title;
    }
    return announcement.title_en || announcement.title_es || announcement.title;
  };

  // Get display content based on current language with fallback
  const getDisplayContent = (announcement: Announcement): string => {
    const currentLang = i18n.language;
    if (currentLang === 'es') {
      return announcement.content_es || announcement.content_en || announcement.content;
    }
    return announcement.content_en || announcement.content_es || announcement.content;
  };

  useEffect(() => {
    document.title = `${t('navigation.whatsNew')} - Visum Portal`;
    loadAnnouncements();
    return () => {
      document.title = 'Visum Portal';
    };
  }, [t]);

  useEffect(() => {
    filterAnnouncements();
  }, [announcements, selectedCategory, searchQuery]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);

      // Fetch only announcements accessible to this distributor
      const data = await fetchAccessibleAnnouncements();

      // Sort by created_at descending
      const sortedData = data.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      setAnnouncements(sortedData);
    } catch (error) {
      console.error('Error in loadAnnouncements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAnnouncements = () => {
    let filtered = announcements;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (ann) => ann.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery) {
      filtered = filtered.filter((ann) => {
        const title = getDisplayTitle(ann);
        const content = getDisplayContent(ann);
        return (
          title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    setFilteredAnnouncements(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">{t('navigation.whatsNew')}</h1>
        <p className="text-[16px] text-[#6b7280]">{t('whatsNew.subtitle')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white border-slate-200">
              <SelectValue placeholder={t('whatsNew.filterByCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('whatsNew.allUpdates')}</SelectItem>
              <SelectItem value="new product">{t('whatsNew.newProducts')}</SelectItem>
              <SelectItem value="marketing">{t('whatsNew.marketing')}</SelectItem>
              <SelectItem value="documentation">{t('navigation.documentation')}</SelectItem>
              <SelectItem value="training">{t('whatsNew.training')}</SelectItem>
              <SelectItem value="policy">{t('whatsNew.policies')}</SelectItem>
              <SelectItem value="general">{t('whatsNew.general')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder={t('whatsNew.searchUpdates')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`${categoryColors[announcement.category] || 'bg-[#6b7280] text-white'} rounded text-[12px] px-3 py-1`}>
                      {announcement.category}
                    </Badge>
                    <span className="text-[13px] text-[#9ca3af]">{formatDate(announcement.created_at)}</span>
                  </div>

                  <h3 className="text-[18px] font-semibold text-slate-900 mb-2">
                    {getDisplayTitle(announcement)}
                  </h3>

                  <p className="text-[15px] text-[#6b7280] leading-relaxed mb-4">
                    {getDisplayContent(announcement)}
                  </p>

                  {announcement.link_url && (
                    <Link to={announcement.link_url}>
                      <Button 
                        variant="ghost" 
                        className="text-[#00a8b5] hover:text-[#008a95] hover:bg-[#00a8b5]/5 p-0 h-auto transition-colors"
                      >
                        {announcement.link_text || t('whatsNew.learnMore')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-slate-200 rounded-lg">
              <CardContent className="p-12 text-center">
                <p className="text-[15px] text-[#6b7280]">
                  {t('whatsNew.noUpdates')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && filteredAnnouncements.length > 0 && filteredAnnouncements.length >= 8 && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            className="text-[#00a8b5] border-[#00a8b5] hover:bg-[#00a8b5]/5"
          >
            {t('whatsNew.loadMore')}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
