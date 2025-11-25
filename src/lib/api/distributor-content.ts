import { supabase } from '@/lib/supabase';

type ContentType = 'documentation' | 'marketing_assets' | 'training_materials' | 'announcements';

const JUNCTION_TABLES = {
  documentation: 'documentation_distributors',
  marketing_assets: 'marketing_assets_distributors',
  training_materials: 'training_materials_distributors',
  announcements: 'announcements_distributors'
};

/**
 * Get current user's distributor ID
 */
export async function getCurrentDistributorId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('getCurrentDistributorId: No authenticated user');
    return null;
  }

  console.log('getCurrentDistributorId: Fetching for user:', user.id);

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('distributor_id')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('getCurrentDistributorId: Error fetching user profile:', error);
    return null;
  }

  console.log('getCurrentDistributorId: Got distributor_id:', profile?.distributor_id);
  return profile?.distributor_id || null;
}

/**
 * Fetch content accessible to current distributor
 * Filters based on sharing permissions:
 * - Empty junction table = shared with all (included)
 * - Has records = only if distributor_id matches
 */
export async function fetchAccessibleContent<T>(
  contentType: ContentType,
  tableName: string,
  additionalFilters: Record<string, any> = {}
): Promise<T[]> {
  const distributorId = await getCurrentDistributorId();

  if (!distributorId) {
    console.error('User has no distributor_id');
    return [];
  }

  const junctionTable = JUNCTION_TABLES[contentType];

  // Fetch all content with sharing info
  const query = supabase
    .from(tableName)
    .select(`
      *,
      sharing:${junctionTable}(distributor_id)
    `);

  // Apply additional filters (e.g., status = 'published')
  Object.entries(additionalFilters).forEach(([key, value]) => {
    query.eq(key, value);
  });

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${contentType}:`, error);
    return [];
  }

  // Filter by sharing permissions
  const accessible = data?.filter((item: any) => {
    // No sharing records = shared with all
    if (!item.sharing || item.sharing.length === 0) {
      return true;
    }

    // Check if user's distributor has access
    return item.sharing.some((s: any) => s.distributor_id === distributorId);
  }) || [];

  // Remove sharing field from results
  return accessible.map(item => {
    const { sharing, ...rest } = item;
    return rest as T;
  });
}

// Convenience functions
export async function fetchAccessibleDocumentation() {
  return fetchAccessibleContent('documentation', 'documentation', { status: 'published' });
}

export async function fetchAccessibleMarketingAssets() {
  return fetchAccessibleContent('marketing_assets', 'marketing_assets', { status: 'published' });
}

export async function fetchAccessibleTraining() {
  // Note: The table is actually named 'training_resources' in the database
  const statusFilter = { status: 'published' };

  // Try both status values since the component checks for both 'published' and 'Published'
  const data = await fetchAccessibleContent('training_materials', 'training_resources', {});

  // Filter by status (published or Published)
  return data.filter((item: any) =>
    item.status === 'published' || item.status === 'Published'
  );
}

export async function fetchAccessibleAnnouncements() {
  return fetchAccessibleContent('announcements', 'announcements', { status: 'published' });
}
