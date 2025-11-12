import { supabase } from './supabase';

/**
 * Activity Tracker Utility
 * Tracks distributor engagement and activity within the portal
 */

interface ActivityMetadata {
  [key: string]: any;
}

interface ActivityData {
  user_id: string;
  activity_type: 'login' | 'page_view' | 'download' | 'search' | 'product_view';
  page_url?: string;
  resource_type?: 'product' | 'document' | 'marketing_asset' | 'training';
  resource_id?: string;
  resource_name?: string;
  metadata?: ActivityMetadata;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Base function to track activity
 * @private
 */
async function trackActivity(data: Omit<ActivityData, 'user_id' | 'ip_address' | 'user_agent'>): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot track activity: No authenticated user');
      return;
    }

    // Get user agent
    const userAgent = navigator.userAgent;

    // Prepare activity data
    const activityData: ActivityData = {
      user_id: user.id,
      ...data,
      user_agent: userAgent,
      // Note: IP address would need to be captured server-side for accuracy
      // For now, we'll leave it null and could add via edge function if needed
    };

    // Insert activity record
    const { error } = await supabase
      .from('distributor_activity')
      .insert(activityData);

    if (error) {
      console.error('Error tracking activity:', error);
    } else {
      console.log('✅ Activity tracked:', data.activity_type);
    }
  } catch (error) {
    console.error('Error in trackActivity:', error);
  }
}

/**
 * Track user login
 */
export async function trackLogin(): Promise<void> {
  await trackActivity({
    activity_type: 'login',
    page_url: window.location.pathname,
    metadata: {
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'direct'
    }
  });
}

/**
 * Track page view
 * @param pageUrl - URL of the page being viewed
 * @param pageName - Optional friendly name for the page
 */
export async function trackPageView(pageUrl: string, pageName?: string): Promise<void> {
  await trackActivity({
    activity_type: 'page_view',
    page_url: pageUrl,
    metadata: {
      page_name: pageName,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Track resource download
 * @param resourceType - Type of resource (document, marketing_asset, training)
 * @param resourceId - ID of the resource
 * @param resourceName - Name of the resource
 * @param metadata - Additional metadata about the download
 */
export async function trackDownload(
  resourceType: 'document' | 'marketing_asset' | 'training' | 'product',
  resourceId: string,
  resourceName: string,
  metadata?: ActivityMetadata
): Promise<void> {
  await trackActivity({
    activity_type: 'download',
    page_url: window.location.pathname,
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Track search query
 * @param searchQuery - The search query entered by the user
 * @param searchContext - Context where search was performed (e.g., 'products', 'documents')
 * @param resultsCount - Number of results returned
 */
export async function trackSearch(
  searchQuery: string,
  searchContext?: string,
  resultsCount?: number
): Promise<void> {
  await trackActivity({
    activity_type: 'search',
    page_url: window.location.pathname,
    metadata: {
      search_query: searchQuery,
      search_context: searchContext,
      results_count: resultsCount,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Track product view
 * @param productId - ID of the product being viewed
 * @param productName - Name of the product
 * @param metadata - Additional metadata about the view
 */
export async function trackProductView(
  productId: string,
  productName: string,
  metadata?: ActivityMetadata
): Promise<void> {
  await trackActivity({
    activity_type: 'product_view',
    page_url: window.location.pathname,
    resource_type: 'product',
    resource_id: productId,
    resource_name: productName,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Batch track multiple activities (useful for bulk operations)
 * @param activities - Array of activity data
 */
export async function trackBatchActivities(activities: Omit<ActivityData, 'user_id' | 'ip_address' | 'user_agent'>[]): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot track activities: No authenticated user');
      return;
    }

    const userAgent = navigator.userAgent;

    // Prepare all activity records
    const activityRecords = activities.map(activity => ({
      user_id: user.id,
      ...activity,
      user_agent: userAgent,
    }));

    // Insert all records
    const { error } = await supabase
      .from('distributor_activity')
      .insert(activityRecords);

    if (error) {
      console.error('Error tracking batch activities:', error);
    } else {
      console.log(`✅ Tracked ${activities.length} activities`);
    }
  } catch (error) {
    console.error('Error in trackBatchActivities:', error);
  }
}

/**
 * Get activity statistics for the current user
 * @param days - Number of days to look back (default: 30)
 */
export async function getUserActivityStats(days: number = 30): Promise<{
  total_activities: number;
  logins: number;
  downloads: number;
  product_views: number;
  searches: number;
  page_views: number;
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('distributor_activity')
      .select('activity_type')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Error fetching activity stats:', error);
      return null;
    }

    // Calculate stats
    const stats = {
      total_activities: data?.length || 0,
      logins: data?.filter(a => a.activity_type === 'login').length || 0,
      downloads: data?.filter(a => a.activity_type === 'download').length || 0,
      product_views: data?.filter(a => a.activity_type === 'product_view').length || 0,
      searches: data?.filter(a => a.activity_type === 'search').length || 0,
      page_views: data?.filter(a => a.activity_type === 'page_view').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error in getUserActivityStats:', error);
    return null;
  }
}
