-- ============================================
-- ACTIVITY TRACKING DEBUG QUERIES
-- Run these in Supabase SQL Editor to debug the tracking issue
-- ============================================

-- 1. CHECK CURRENT USER
-- This shows who you are authenticated as
SELECT
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- 2. VERIFY USER EXISTS IN USER_PROFILES
-- Critical: user_id in distributor_activity must reference user_profiles.id
SELECT
  id,
  email,
  full_name,
  distributor_id,
  created_at
FROM user_profiles
WHERE id = auth.uid();

-- If this returns no rows, that's the problem!
-- The user_id from auth.users doesn't exist in user_profiles

-- 3. CHECK TABLE STRUCTURE
-- Verify the distributor_activity table has the correct columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'distributor_activity'
ORDER BY ordinal_position;

-- 4. CHECK CONSTRAINTS
-- Look for NOT NULL or UNIQUE constraints that might fail
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'distributor_activity'::regclass;

-- 5. CHECK FOREIGN KEY CONSTRAINTS
-- Verify the user_id foreign key points to user_profiles
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'distributor_activity';

-- 6. CHECK RLS POLICIES
-- Verify RLS is enabled and policies exist
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'distributor_activity';

-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'distributor_activity';

-- 7. TEST IF CURRENT USER CAN SELECT
-- This tests if you can read from the table
SELECT COUNT(*) as total_records
FROM distributor_activity;

-- 8. TEST MANUAL INSERT
-- Try to manually insert a test record
-- If this fails, note the error message!
INSERT INTO distributor_activity (
  user_id,
  activity_type,
  resource_type,
  resource_name,
  page_url
) VALUES (
  auth.uid(),
  'download',
  'document',
  'Test Document',
  '/test'
)
RETURNING *;

-- 9. CHECK IF INSERT SUCCEEDED
-- Look for the test record
SELECT *
FROM distributor_activity
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 10. CHECK DISTRIBUTOR ASSIGNMENT
-- Verify the user has a valid distributor_id
SELECT
  up.id as user_id,
  up.email,
  up.distributor_id,
  d.company_name,
  d.status as distributor_status
FROM user_profiles up
LEFT JOIN distributors d ON d.id = up.distributor_id
WHERE up.id = auth.uid();

-- 11. CHECK FOR ORPHANED AUTH USERS
-- Find users in auth.users that don't exist in user_profiles
-- (Note: This query might not work if you don't have access to auth schema)
-- If it fails, that's okay - just skip it
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE
    WHEN up.id IS NULL THEN 'MISSING FROM user_profiles'
    ELSE 'OK'
  END as profile_status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.id = auth.uid();

-- 12. TEST WITH EXPLICIT VALUES
-- Try inserting with all required fields explicitly set
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  RAISE NOTICE 'Current user ID: %', v_user_id;

  -- Try insert
  INSERT INTO distributor_activity (
    user_id,
    activity_type,
    resource_type,
    resource_id,
    resource_name,
    page_url,
    metadata,
    user_agent
  ) VALUES (
    v_user_id,
    'download',
    'document',
    gen_random_uuid(),
    'Debug Test Document',
    '/debug',
    '{"test": true}'::jsonb,
    'Debug Test Agent'
  );

  RAISE NOTICE 'Insert succeeded!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Insert failed: %', SQLERRM;
END $$;

-- 13. CLEANUP TEST RECORDS
-- Run this after testing to remove test data
DELETE FROM distributor_activity
WHERE resource_name IN ('Test Document', 'Debug Test Document')
  AND user_id = auth.uid();

-- ============================================
-- INTERPRETATION GUIDE
-- ============================================

-- If query #1 returns NULL user_id:
--   → You are not authenticated. Log in first.

-- If query #2 returns no rows:
--   → CRITICAL ISSUE: Your auth user doesn't exist in user_profiles!
--   → This is likely the root cause of the problem
--   → The foreign key constraint will reject the insert

-- If query #8 fails with "violates foreign key constraint":
--   → Confirms user_profiles record is missing
--   → Need to create user_profile record for this user

-- If query #8 fails with "new row violates row-level security":
--   → RLS policy is blocking the insert
--   → Check the WITH CHECK clause in policies

-- If query #8 fails with "null value in column violates not-null constraint":
--   → One of the required fields is missing
--   → Check which column from the error message

-- If query #8 succeeds:
--   → Database is working fine
--   → Problem is in the JavaScript code or data being sent
