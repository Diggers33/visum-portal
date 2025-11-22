import { supabase } from '@/lib/supabase';

export type ContentType = 'documentation' | 'marketing_assets' | 'training_materials' | 'announcements';

// Map content types to their junction tables and ID columns
const CONTENT_CONFIG = {
  documentation: {
    table: 'documentation_distributors',
    idColumn: 'documentation_id',
  },
  marketing_assets: {
    table: 'marketing_assets_distributors',
    idColumn: 'asset_id',
  },
  training_materials: {
    table: 'training_materials_distributors',
    idColumn: 'training_id',
  },
  announcements: {
    table: 'announcements_distributors',
    idColumn: 'announcement_id',
  },
};

/**
 * Save sharing relationships for content
 * Empty array = shared with all (deletes all junction records)
 * Non-empty array = shared with specific distributors only
 */
export async function saveContentSharing(
  contentType: ContentType,
  contentId: string,
  distributorIds: string[]
) {
  const config = CONTENT_CONFIG[contentType];

  try {
    // Step 1: Delete existing sharing records
    const { error: deleteError } = await supabase
      .from(config.table)
      .delete()
      .eq(config.idColumn, contentId)
      .select();

    if (deleteError) {
      throw deleteError;
    }

    // Step 2: If specific distributors selected, insert new records
    if (distributorIds.length > 0) {
      const records = distributorIds.map((distributorId) => ({
        [config.idColumn]: contentId,
        distributor_id: distributorId,
      }));

      const { data: insertData, error: insertError } = await supabase
        .from(config.table)
        .insert(records)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Check if insert actually succeeded (RLS can silently fail)
      if (!insertData || insertData.length === 0) {
        const rlsError = new Error('Insert succeeded but returned no data - likely blocked by RLS policy');
        console.error('RLS Policy Issue:', rlsError.message);
        throw rlsError;
      }
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error saving content sharing:', error);
    return { success: false, error };
  }
}

/**
 * Get distributor IDs that have access to content
 * Returns empty array if shared with all
 */
export async function getContentDistributors(
  contentType: ContentType,
  contentId: string
): Promise<string[]> {
  const config = CONTENT_CONFIG[contentType];

  try {
    const { data, error } = await supabase
      .from(config.table)
      .select('distributor_id')
      .eq(config.idColumn, contentId);

    if (error) throw error;

    return data?.map((row) => row.distributor_id) || [];
  } catch (error) {
    console.error('Error fetching content distributors:', error);
    return [];
  }
}

/**
 * Check if content is shared with all distributors
 */
export async function isSharedWithAll(
  contentType: ContentType,
  contentId: string
): Promise<boolean> {
  const distributors = await getContentDistributors(contentType, contentId);
  return distributors.length === 0;
}

/**
 * Get sharing summary for display (e.g., "All" or "3 Distributors")
 */
export async function getContentSharingSummary(
  contentType: ContentType,
  contentId: string
): Promise<{ label: string; count: number; isAll: boolean }> {
  const distributors = await getContentDistributors(contentType, contentId);

  if (distributors.length === 0) {
    return { label: 'All', count: 0, isAll: true };
  }

  return {
    label: `${distributors.length} Distributor${distributors.length !== 1 ? 's' : ''}`,
    count: distributors.length,
    isAll: false,
  };
}
