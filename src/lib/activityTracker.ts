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
  console.log('🔵 trackActivity called with:', {
    activity_type: data.activity_type,
    resource_type: data.resource_type,
    resource_name: data.resource_name,
    resource_id: data.resource_id,
    page_url: data.page_url
  });

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Auth user result:', {
      userId: user?.id,
      email: user?.email,
      userError: userError
    });

    if (userError) {
      console.error('❌ Error getting auth user:', userError);
      return;
    }

    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }

    // Verify user exists in user_profiles (CRITICAL CHECK)
    console.log('🔍 Checking if user exists in user_profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, distributor_id, full_name')
      .eq('id', user.id)
      .single();

    console.log('👤 User profile result:', {
      profile: profile,
      profileError: profileError
    });

    if (profileError) {
      console.error('❌ Error getting user profile:', profileError);
      console.error('❌ This user_id does not exist in user_profiles table!');
      return;
    }

    if (!profile) {
      console.error('❌ No user profile found for user:', user.id);
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

    console.log('📝 Prepared activity data for insert:', activityData);

    // Insert activity record
    console.log('💾 Attempting to insert into distributor_activity table...');
    const { data: insertedData, error } = await supabase
      .from('distributor_activity')
      .insert(activityData)
      .select();

    if (error) {
      console.error('❌ Error inserting activity:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error hint:', error.hint);
    } else {
      console.log('✅ Activity tracked successfully!');
      console.log('✅ Inserted data:', insertedData);
    }
  } catch (error) {
    console.error('❌ Exception in trackActivity:', error);
    console.error('❌ Exception details:', JSON.stringify(error, null, 2));
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
  console.log('🔵 trackBatchActivities called with', activities.length, 'activities');

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('❌ Error getting auth user:', userError);
      return;
    }

    if (!user) {
      console.error('❌ Cannot track activities: No authenticated user');
      return;
    }

    console.log('👤 Auth user:', user.id, user.email);

    // Verify user exists in user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ User profile not found in user_profiles table');
      return;
    }

    const userAgent = navigator.userAgent;

    // Prepare all activity records
    const activityRecords = activities.map(activity => ({
      user_id: user.id,
      ...activity,
      user_agent: userAgent,
    }));

    console.log('📝 Prepared batch records:', activityRecords);

    // Insert all records
    console.log('💾 Attempting batch insert...');
    const { data: insertedData, error } = await supabase
      .from('distributor_activity')
      .insert(activityRecords)
      .select();

    if (error) {
      console.error('❌ Error tracking batch activities:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Tracked ${activities.length} activities successfully`);
      console.log('✅ Inserted data:', insertedData);
    }
  } catch (error) {
    console.error('❌ Exception in trackBatchActivities:', error);
    console.error('❌ Exception details:', JSON.stringify(error, null, 2));
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
