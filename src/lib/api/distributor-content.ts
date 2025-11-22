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

  console.log('🔍 [Auth Debug] Current user:', user?.id, user?.email);

  if (!user) {
    console.log('❌ [Auth Debug] No user logged in');
    return null;
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('distributor_id')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('❌ [Auth Debug] Error fetching user profile:', error);
    return null;
  }

  console.log('🔍 [Auth Debug] User profile:', profile);
  console.log('🔍 [Auth Debug] Distributor ID:', profile?.distributor_id);

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

  console.log('🔍 [Filtering Debug] Content Type:', contentType);
  console.log('🔍 [Filtering Debug] User Distributor ID:', distributorId);

  if (!distributorId) {
    console.error('❌ User has no distributor_id');
    return [];
  }

  const junctionTable = JUNCTION_TABLES[contentType];
  const junctionField = contentType === 'marketing_assets' ? 'asset_id' :
                       contentType === 'training_materials' ? 'training_id' :
                       contentType === 'announcements' ? 'announcement_id' : 'documentation_id';

  console.log('🔍 [Filtering Debug] Junction Table:', junctionTable);
  console.log('🔍 [Filtering Debug] Junction Field:', junctionField);

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
    console.error(`❌ Error fetching ${contentType}:`, error);
    return [];
  }

  console.log('🔍 [Filtering Debug] Raw data count:', data?.length);
  console.log('🔍 [Filtering Debug] Raw data:', data);

  // Filter by sharing permissions
  const accessible = data?.filter((item: any, index: number) => {
    console.log(`🔍 [Filtering Debug] Item ${index}:`, {
      id: item.id,
      title: item.title || item.name,
      sharing: item.sharing,
      sharingLength: item.sharing?.length
    });

    // No sharing records = shared with all
    if (!item.sharing || item.sharing.length === 0) {
      console.log(`  ✅ Item ${index}: Shared with ALL (no sharing records)`);
      return true;
    }

    // Check if user's distributor has access
    const hasAccess = item.sharing.some((s: any) => s.distributor_id === distributorId);
    console.log(`  ${hasAccess ? '✅' : '❌'} Item ${index}: Shared with specific distributors, has access: ${hasAccess}`);

    return hasAccess;
  }) || [];

  console.log('🔍 [Filtering Debug] Accessible count:', accessible.length);
  console.log('🔍 [Filtering Debug] Accessible items:', accessible.map(i => i.title || i.name));

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
