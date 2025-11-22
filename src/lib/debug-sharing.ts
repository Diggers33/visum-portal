import { supabase } from './supabase';

/**
 * Debug helper to test junction table queries
 * Run in console: window.debugSharing()
 */
export async function debugSharing() {
  console.log('🧪 Starting junction table debug tests...');

  const testDocId = '967bb3aa-f274-4d61-932e-862a616eb80c';

  // Test 1: Direct query of junction table
  console.log('\n📋 Test 1: Direct query of documentation_distributors');
  const test1 = await supabase
    .from('documentation_distributors')
    .select('*')
    .eq('documentation_id', testDocId);

  console.log('Result:', test1);
  if (test1.data && test1.data.length > 0) {
    console.log('✅ Found', test1.data.length, 'sharing records');
    console.log('Records:', test1.data);
  } else if (test1.error) {
    console.error('❌ Error:', test1.error);
  } else {
    console.warn('⚠️ No records found - but no error either');
  }

  // Test 2: Query all junction table records
  console.log('\n📋 Test 2: All records in documentation_distributors');
  const test2 = await supabase
    .from('documentation_distributors')
    .select('*');

  console.log('Result:', test2);
  if (test2.data) {
    console.log('Total records in junction table:', test2.data.length);
    console.log('All records:', test2.data);
  }

  // Test 3: Query with join
  console.log('\n📋 Test 3: Documentation with join to sharing');
  const test3 = await supabase
    .from('documentation')
    .select(`
      id,
      title,
      sharing:documentation_distributors(distributor_id)
    `)
    .eq('id', testDocId);

  console.log('Result:', test3);
  if (test3.data && test3.data.length > 0) {
    console.log('Document:', test3.data[0]);
    console.log('Sharing array:', test3.data[0].sharing);
    if (test3.data[0].sharing && test3.data[0].sharing.length > 0) {
      console.log('✅ Join is working! Found sharing records via join');
    } else {
      console.error('❌ Join returned empty sharing array');
    }
  }

  // Test 4: Check RLS policies
  console.log('\n📋 Test 4: Checking current user and role');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, distributor_id')
    .eq('id', user?.id)
    .single();

  console.log('Current user:', user?.email);
  console.log('User role:', profile?.role);
  console.log('Distributor ID:', profile?.distributor_id);

  console.log('\n✅ Debug tests complete!');
  console.log('📊 Summary:');
  console.log('  - Direct query found:', test1.data?.length || 0, 'records');
  console.log('  - Total junction records:', test2.data?.length || 0);
  console.log('  - Join query sharing array:', test3.data?.[0]?.sharing?.length || 0, 'items');
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).debugSharing = debugSharing;
}
