// ================================================
// Notification Service
// Utilities for sending email notifications from admin portal
// ================================================

import { supabase } from './supabase';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface NotificationResult {
  success: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  error?: string;
}

// ================================================
// Product Notification
// ================================================
export const sendProductNotification = async (product: {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url?: string;
}): Promise<NotificationResult> => {
  try {
    console.log('📧 Sending product notification:', product.name);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-product-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          productDescription: product.description,
          imageUrl: product.image_url
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      toast.success('Product notification sent!', {
        description: `Notified ${result.sent} distributor${result.sent !== 1 ? 's' : ''}`,
      });
    } else {
      throw new Error(result.error || 'Failed to send notification');
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error sending product notification:', error);
    toast.error('Failed to send notification', {
      description: error.message || 'Please try again',
    });
    return {
      success: false,
      error: error.message
    };
  }
};

// ================================================
// Announcement Notification
// ================================================
export const sendAnnouncementNotification = async (announcement: {
  id: string;
  title: string;
  content: string;
  category: string;
  cta_label?: string;
  cta_url?: string;
}): Promise<NotificationResult> => {
  try {
    console.log('📧 Sending announcement notification:', announcement.title);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-announcement-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          announcementId: announcement.id,
          title: announcement.title,
          content: announcement.content,
          category: announcement.category,
          ctaLabel: announcement.cta_label,
          ctaUrl: announcement.cta_url
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      toast.success('Announcement notification sent!', {
        description: `Notified ${result.sent} distributor${result.sent !== 1 ? 's' : ''}`,
      });
    } else {
      throw new Error(result.error || 'Failed to send notification');
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error sending announcement notification:', error);
    toast.error('Failed to send notification', {
      description: error.message || 'Please try again',
    });
    return {
      success: false,
      error: error.message
    };
  }
};

// ================================================
// Training Notification
// ================================================
export const sendTrainingNotification = async (training: {
  id: string;
  title: string;
  description: string;
  type: string; // 'video' | 'document' | 'webinar'
  thumbnail_url?: string;
}): Promise<NotificationResult> => {
  try {
    console.log('📧 Sending training notification:', training.title);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-training-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainingId: training.id,
          title: training.title,
          description: training.description,
          type: training.type,
          thumbnailUrl: training.thumbnail_url
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      toast.success('Training notification sent!', {
        description: `Notified ${result.sent} distributor${result.sent !== 1 ? 's' : ''}`,
      });
    } else {
      throw new Error(result.error || 'Failed to send notification');
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error sending training notification:', error);
    toast.error('Failed to send notification', {
      description: error.message || 'Please try again',
    });
    return {
      success: false,
      error: error.message
    };
  }
};

// ================================================
// Marketing Asset Notification
// ================================================
export const sendMarketingNotification = async (asset: {
  id: string;
  title: string;
  description: string;
  asset_type: string; // 'brochure' | 'presentation' | 'case_study' | 'social_media'
  thumbnail_url?: string;
}): Promise<NotificationResult> => {
  try {
    console.log('📧 Sending marketing notification:', asset.title);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-marketing-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: asset.id,
          title: asset.title,
          description: asset.description,
          assetType: asset.asset_type,
          thumbnailUrl: asset.thumbnail_url
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      toast.success('Marketing notification sent!', {
        description: `Notified ${result.sent} distributor${result.sent !== 1 ? 's' : ''}`,
      });
    } else {
      throw new Error(result.error || 'Failed to send notification');
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error sending marketing notification:', error);
    toast.error('Failed to send notification', {
      description: error.message || 'Please try again',
    });
    return {
      success: false,
      error: error.message
    };
  }
};

// ================================================
// Batch Notification (for multiple items)
// ================================================
export const sendBatchNotifications = async (
  items: any[],
  type: 'product' | 'announcement' | 'training' | 'marketing'
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  const notificationFunctions = {
    product: sendProductNotification,
    announcement: sendAnnouncementNotification,
    training: sendTrainingNotification,
    marketing: sendMarketingNotification,
  };

  const fn = notificationFunctions[type];

  for (const item of items) {
    const result = await fn(item);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  toast.success('Batch notifications complete', {
    description: `Sent ${sent}, Failed ${failed}`,
  });

  return { sent, failed };
};
