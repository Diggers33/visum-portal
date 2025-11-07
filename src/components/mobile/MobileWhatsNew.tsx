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
        {/* Simple: Show ALL announcements as identical cards */}
        {announcements.map((announcement, index) => (
          <Card key={announcement.id} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                  {announcement.category}
                </Badge>
                <span className="text-xs text-slate-500">
                  {formatDate(announcement.created_at)}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
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
                    className="text-blue-500 hover:text-blue-600 p-0"
                  >
                    {announcement.link_text || 'Learn More'} →
                  </Button>
                </Link>
              )}
              
              {/* Debug info */}
              <div className="mt-2 text-xs text-gray-400">
                Debug: Position {index + 1}, ID: {announcement.id}
              </div>
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No announcements found</p>
          </div>
        )}
      </div>
    </div>
  );
}
