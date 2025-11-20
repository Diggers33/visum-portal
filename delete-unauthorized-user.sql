-- =============================================================================
-- EMERGENCY SECURITY FIX: Delete Unauthorized OAuth User
-- =============================================================================
--
-- This script removes the user info@iris-eng.com who bypassed security
-- by logging in via Google OAuth without having an authorized user_profiles record.
--
-- CRITICAL: This user gained unauthorized access due to a security vulnerability
-- that has now been fixed.
--
-- =============================================================================

-- Step 1: Check if user exists in auth.users (should exist)
SELECT
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_app_meta_data->>'provider' as auth_provider
FROM auth.users
WHERE email = 'info@iris-eng.com';

-- Step 2: Check if user has a profile in user_profiles (should NOT exist)
SELECT
    id,
    email,
    full_name,
    role,
    status
FROM user_profiles
WHERE email = 'info@iris-eng.com';

-- Step 3: Delete from user_profiles first (if exists - cleanup from auto-creation bug)
DELETE FROM user_profiles
WHERE email = 'info@iris-eng.com';

-- Step 4: Delete from auth.users (main cleanup)
DELETE FROM auth.users
WHERE email = 'info@iris-eng.com';

-- Step 5: Verify deletion
SELECT
    'auth.users' as table_name,
    COUNT(*) as remaining_records
FROM auth.users
WHERE email = 'info@iris-eng.com'
UNION ALL
SELECT
    'user_profiles' as table_name,
    COUNT(*) as remaining_records
FROM user_profiles
WHERE email = 'info@iris-eng.com';

-- Expected result: 0 records in both tables

-- =============================================================================
-- SECURITY AUDIT LOG
-- =============================================================================
--
-- User: info@iris-eng.com
-- Incident: Unauthorized OAuth access
-- Date: 2025-11-20
-- Method: Google OAuth sign-in
-- Issue: User authenticated via OAuth without user_profiles record
-- Root Cause: AuthCallback.tsx was auto-creating profiles with 'active' status
-- Fix Applied: Security checks added to AuthCallback.tsx and App.tsx
--
-- Security measures now in place:
-- 1. OAuth users MUST have existing user_profiles record
-- 2. Profile status MUST be 'active'
-- 3. Unauthorized users are immediately signed out
-- 4. All auth state changes validate profile existence
-- 5. App.tsx no longer falls back to default 'distributor' role
--
-- =============================================================================
