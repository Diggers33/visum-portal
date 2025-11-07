import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function MobileWhatsNew() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error:', error);
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Title */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">What's New</h1>
        <p className="text-slate-600">Latest updates and announcements</p>
      </div>

      <div className="p-4 space-y-4">
        {announcements.map((announcement, index) => {
          // First announcement gets featured teal styling
          if (index === 0) {
            return (
              <Card key={announcement.id} className="overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-white/20 text-white border-0 text-xs px-3 py-1">
                      {announcement.category}
                    </Badge>
                    <span className="text-white/90 text-sm">
                      {formatDate(announcement.created_at)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {announcement.title}
                  </h3>
                  
                  <p className="text-white/90 mb-6 leading-relaxed">
                    {announcement.content}
                  </p>

                  {announcement.link_url && (
                    <Link to={announcement.link_url}>
                      <Button className="bg-white text-[#00a8b5] hover:bg-white/90 font-medium">
                        {announcement.link_text || 'Learn More'}
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          }

          // All other announcements get regular styling
          return (
            <Card key={announcement.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {announcement.category[0]}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                        {announcement.category}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {announcement.title}
                    </h3>
                    
                    <p className="text-slate-600 text-sm mb-4">
                      {announcement.content}
                    </p>

                    {announcement.link_url && (
                      <Link to={announcement.link_url}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-[#00a8b5] hover:text-[#008a95] p-0"
                        >
                          {announcement.link_text || 'Learn More'} →
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {announcements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No announcements found</p>
          </div>
        )}
      </div>
    </div>
  );
}
