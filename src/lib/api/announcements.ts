// Frontend API: Announcements Management
// Provides clean interface for React components to interact with announcements Edge Function

import { supabase } from '../supabase';

export interface Announcement {
  id: string;
  category: string;
  title: string;  // Kept for backward compatibility
  content: string;  // Kept for backward compatibility
  title_en?: string;
  title_es?: string;
  content_en?: string;
  content_es?: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  clicks: number;
  link_text?: string;
  link_url?: string;
  internal_notes?: string;
  send_notification?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementInput {
  category: string;
  title?: string;  // Legacy field, optional now
  content?: string;  // Legacy field, optional now
  title_en?: string;
  title_es?: string;
  content_en?: string;
  content_es?: string;
  status: 'draft' | 'published' | 'archived';
  link_text?: string;
  link_url?: string;
  internal_notes?: string;
  send_notification?: boolean;
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/announcements-management`;

/**
 * Fetch all announcements
 */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch announcements');
  }

  return response.json();
}

/**
 * Fetch single announcement by ID
 */
export async function fetchAnnouncementById(id: string): Promise<Announcement> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch announcement');
  }

  return response.json();
}

/**
 * Create new announcement
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create announcement');
  }

  return response.json();
}

/**
 * Update existing announcement
 */
export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<Announcement> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update announcement');
  }

  return response.json();
}

/**
 * Delete announcement
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete announcement');
  }
}

/**
 * Increment view count for an announcement
 */
export async function incrementAnnouncementViews(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?action=increment_views&id=${id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to increment views');
  }
}

/**
 * Increment click count for an announcement
 */
export async function incrementAnnouncementClicks(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}?action=increment_clicks&id=${id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to increment clicks');
  }
}

/**
 * Send email notification to all distributors about an announcement
 */
export async function sendAnnouncementNotification(announcementId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const notificationUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-announcement-notification`;

  const response = await fetch(notificationUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ announcement_id: announcementId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send notification');
  }

  const result = await response.json();
  return result;
}
