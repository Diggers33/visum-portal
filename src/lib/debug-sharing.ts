import { supabase } from './supabase';

/**
 * Debug helper to test junction table queries and RLS policies
 * Run in console: window.debugSharing()
 *
 * IMPORTANT: Run this AFTER applying the RLS policy migration to verify it worked
 */
export async function debugSharing() {
  console.log('🧪 Starting junction table debug tests...');
  console.log('📖 Purpose: Verify RLS policies allow proper insert/select operations');

  const testDocId = '967bb3aa-f274-4d61-932e-862a616eb80c';

  // Test 0: Check current user
  console.log('\n📋 Test 0: Current user and permissions');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, distributor_id')
    .eq('id', user?.id)
    .single();

  console.log('Current user:', user?.email);
  console.log('User role:', profile?.role);
  console.log('Distributor ID:', profile?.distributor_id);

  const isAdmin = profile?.role === 'admin';
  console.log(isAdmin ? '✅ Logged in as ADMIN' : '⚠️ Not logged in as admin');

  // Test 1: Query all junction table records
  console.log('\n📋 Test 1: All records in documentation_distributors');
  const test1 = await supabase
    .from('documentation_distributors')
    .select('*');

  console.log('Result:', test1);
  if (test1.error) {
    console.error('❌ Error querying junction table:', test1.error);
    console.error('💡 This means SELECT policy is blocking - RLS migration may not have been applied');
  } else {
    console.log('✅ SELECT query succeeded');
    console.log('Total records in junction table:', test1.data?.length || 0);
    if (test1.data && test1.data.length > 0) {
      console.log('Records:', test1.data);
    } else {
      console.warn('⚠️ No records found (this is OK if you haven\'t created any shared content yet)');
    }
  }

  // Test 2: Direct query for specific document
  console.log('\n📋 Test 2: Query sharing for specific document');
  const test2 = await supabase
    .from('documentation_distributors')
    .select('*')
    .eq('documentation_id', testDocId);

  console.log('Result:', test2);
  if (test2.data && test2.data.length > 0) {
    console.log('✅ Found', test2.data.length, 'sharing records for test document');
    console.log('Records:', test2.data);
  } else if (test2.error) {
    console.error('❌ Error:', test2.error);
  } else {
    console.warn('⚠️ No sharing records for this document (might be shared with all)');
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
  if (test3.error) {
    console.error('❌ Join query error:', test3.error);
  } else if (test3.data && test3.data.length > 0) {
    console.log('Document:', test3.data[0]);
    console.log('Sharing array:', test3.data[0].sharing);
    if (test3.data[0].sharing && test3.data[0].sharing.length > 0) {
      console.log('✅ Join is working! Found', test3.data[0].sharing.length, 'sharing records via join');
    } else {
      console.log('⚠️ Join returned empty sharing array (document may be shared with all)');
    }
  }

  // Test 4: Test INSERT (admin only)
  if (isAdmin) {
    console.log('\n📋 Test 4: Test INSERT permission (admin only)');
    console.log('⚠️ This will temporarily add a test record and then delete it');

    // Use a test document ID (won't actually affect real data if it doesn't exist)
    const testRecord = {
      documentation_id: '00000000-0000-0000-0000-000000000001',
      distributor_id: '00000000-0000-0000-0000-000000000002',
    };

    const insertTest = await supabase
      .from('documentation_distributors')
      .insert(testRecord)
      .select();

    if (insertTest.error) {
      console.error('❌ INSERT failed:', insertTest.error);
      console.error('💡 RLS policy may not be allowing admin inserts - check migration');
    } else if (!insertTest.data || insertTest.data.length === 0) {
      console.error('❌ INSERT returned success but no data - RLS is blocking silently!');
      console.error('💡 This is the original problem - RLS migration needs to be applied');
    } else {
      console.log('✅ INSERT succeeded!', insertTest.data);

      // Clean up test record
      const deleteTest = await supabase
        .from('documentation_distributors')
        .delete()
        .eq('documentation_id', testRecord.documentation_id)
        .eq('distributor_id', testRecord.distributor_id);

      if (deleteTest.error) {
        console.warn('⚠️ Cleanup failed (test record may remain):', deleteTest.error);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }
  } else {
    console.log('\n📋 Test 4: Skipped (not admin)');
  }

  // Summary
  console.log('\n✅ Debug tests complete!');
  console.log('\n📊 Summary:');
  console.log('  - Total junction records:', test1.data?.length || 0);
  console.log('  - Records for test doc:', test2.data?.length || 0);
  console.log('  - Join query result:', test3.data?.[0]?.sharing?.length || 0, 'sharing entries');

  if (isAdmin && test1.data?.length === 0) {
    console.log('\n💡 NEXT STEPS:');
    console.log('  1. Apply RLS migration: See APPLY_RLS_FIX.md');
    console.log('  2. Create a test document with specific distributor sharing');
    console.log('  3. Run this test again to verify');
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).debugSharing = debugSharing;
}
