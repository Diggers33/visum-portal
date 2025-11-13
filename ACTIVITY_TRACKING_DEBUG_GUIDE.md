# Activity Tracking Debug Guide

## Problem: No activity records being saved despite no console errors

This guide will help you systematically diagnose and fix the issue.

---

## Step 1: Check Browser Console Logs

After the enhanced logging, when you download a file or perform any tracked action, you should see:

### ✅ SUCCESSFUL TRACKING LOGS:
```
🔵 trackActivity called with: { activity_type: "download", resource_type: "document", ... }
👤 Auth user result: { userId: "abc-123-...", email: "user@example.com", userError: null }
🔍 Checking if user exists in user_profiles table...
👤 User profile result: { profile: { id: "abc-123-...", email: "...", distributor_id: "xyz-..." }, profileError: null }
📝 Prepared activity data for insert: { user_id: "abc-123-...", activity_type: "download", ... }
💾 Attempting to insert into distributor_activity table...
✅ Activity tracked successfully!
✅ Inserted data: [{ id: "...", user_id: "...", activity_type: "download", ... }]
```

### ❌ COMMON ERROR PATTERNS:

#### Error Pattern 1: User Not Found in user_profiles
```
👤 Auth user result: { userId: "abc-123-...", email: "user@example.com" }
🔍 Checking if user exists in user_profiles table...
❌ Error getting user profile: { code: "PGRST116", message: "..." }
❌ This user_id does not exist in user_profiles table!
```

**CAUSE**: The authenticated user's ID doesn't exist in the `user_profiles` table.

**FIX**: Run this SQL to check and create the profile:
```sql
-- Check if missing
SELECT * FROM user_profiles WHERE id = auth.uid();

-- If missing, create it (adjust values as needed)
INSERT INTO user_profiles (id, email, full_name, role, distributor_id)
VALUES (
  auth.uid(),
  auth.email(),
  'Your Name',
  'distributor',  -- or 'admin'
  'your-distributor-id-uuid'  -- must be valid distributor ID
);
```

#### Error Pattern 2: Foreign Key Violation
```
💾 Attempting to insert into distributor_activity table...
❌ Error inserting activity: { code: "23503", message: "insert or update on table ... violates foreign key constraint" }
```

**CAUSE**: The `user_id` being inserted doesn't exist in `user_profiles`.

**FIX**: Same as Error Pattern 1 - create the user_profile record.

#### Error Pattern 3: RLS Policy Blocking Insert
```
💾 Attempting to insert into distributor_activity table...
❌ Error inserting activity: { code: "42501", message: "new row violates row-level security policy" }
```

**CAUSE**: The RLS policy's WITH CHECK clause is rejecting the insert.

**FIX**: Check the RLS policy:
```sql
-- View the policy
SELECT * FROM pg_policies WHERE tablename = 'distributor_activity';

-- The WITH CHECK should be:
CREATE POLICY "Users can insert their own activity"
  ON distributor_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

Make sure `user_id` in your insert matches `auth.uid()`.

#### Error Pattern 4: Not NULL Constraint Violation
```
❌ Error inserting activity: { code: "23502", message: "null value in column \"activity_type\" violates not-null constraint" }
```

**CAUSE**: A required field is NULL.

**FIX**: Check the prepared activity data in the logs to see which field is NULL. Ensure all required fields are provided:
- `user_id` (string)
- `activity_type` (string)

---

## Step 2: Run SQL Debugging Queries

Open the `database/debug_activity_tracking.sql` file and run the queries in Supabase SQL Editor.

### Critical Queries to Run First:

#### Query #1: Check Current User
```sql
SELECT auth.uid() as current_user_id, auth.email() as current_user_email;
```

**Expected**: Your user ID and email
**If NULL**: You're not authenticated - log in first

#### Query #2: Verify User in user_profiles
```sql
SELECT id, email, full_name, distributor_id FROM user_profiles WHERE id = auth.uid();
```

**Expected**: One row with your user data
**If no rows**: 🚨 **THIS IS THE PROBLEM!** Your auth user doesn't have a user_profiles record.

#### Query #8: Test Manual Insert
```sql
INSERT INTO distributor_activity (user_id, activity_type, resource_type, resource_name, page_url)
VALUES (auth.uid(), 'download', 'document', 'Test Document', '/test')
RETURNING *;
```

**Expected**: Returns the inserted row
**If fails**: Note the exact error message

---

## Step 3: Common Fixes

### Fix 1: Create Missing user_profile Record

If the user doesn't exist in `user_profiles`:

```sql
-- First, get your distributor ID
SELECT id, company_name FROM distributors WHERE status = 'active' LIMIT 5;

-- Then create your user profile
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  distributor_id,
  language_preference
) VALUES (
  auth.uid(),
  auth.email(),
  'Your Full Name',  -- Replace with actual name
  'distributor',      -- or 'admin' if you're an admin
  'distributor-uuid-here',  -- Replace with actual distributor ID from above query
  'en'
);
```

### Fix 2: Fix RLS Policies

If RLS is blocking inserts, recreate the policies:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own activity" ON distributor_activity;
DROP POLICY IF EXISTS "Admins can view all activity" ON distributor_activity;

-- Recreate with correct rules
CREATE POLICY "Users can insert their own activity"
  ON distributor_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all activity"
  ON distributor_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own activity"
  ON distributor_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### Fix 3: Verify Table Structure

If there are column mismatches:

```sql
-- Check current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'distributor_activity'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, not null)
-- user_id (uuid, not null)
-- activity_type (text, not null)
-- page_url (text, nullable)
-- resource_type (text, nullable)
-- resource_id (uuid, nullable)
-- resource_name (text, nullable)
-- metadata (jsonb, nullable)
-- ip_address (text, nullable)
-- user_agent (text, nullable)
-- created_at (timestamp with time zone, not null, default: now())
```

### Fix 4: Check Foreign Key Constraint

```sql
-- Verify the FK points to user_profiles
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'distributor_activity'
  AND kcu.column_name = 'user_id';

-- Should show: user_id → user_profiles.id
```

---

## Step 4: Test After Fix

1. **Clear browser console**
2. **Perform a tracked action** (download a file, view a product, etc.)
3. **Check console logs** - should see all ✅ success messages
4. **Query the table**:
   ```sql
   SELECT * FROM distributor_activity WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 10;
   ```
5. **Should see your activity records!**

---

## Preventive Measures

### Ensure All New Users Get Profiles

Make sure whenever a new user signs up or is created, they get a `user_profiles` record.

Check your signup code or create a database trigger:

```sql
-- Trigger to auto-create user_profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'distributor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Still Not Working?

If you've tried everything above and it's still not working:

1. **Share the exact console logs** from the browser
2. **Share the error from Query #8** (manual insert test)
3. **Share results from Query #2** (user profile check)
4. **Check if there are any browser extensions** blocking requests
5. **Check Supabase dashboard logs** under "Logs" → "Database" for any errors

---

## Expected Working State

When everything is working, here's what you should see:

### Browser Console:
```
🔵 trackActivity called with: { activity_type: "download", ... }
👤 Auth user result: { userId: "123-456-...", email: "user@company.com" }
🔍 Checking if user exists in user_profiles table...
👤 User profile result: { profile: {...}, profileError: null }
📝 Prepared activity data for insert: {...}
💾 Attempting to insert into distributor_activity table...
✅ Activity tracked successfully!
✅ Inserted data: [{ id: "...", created_at: "...", ... }]
```

### Database Query:
```sql
SELECT COUNT(*) FROM distributor_activity WHERE user_id = auth.uid();
-- Should return: > 0
```

### Admin Portal:
The Activity Reports page should show your activities in the table and charts.
