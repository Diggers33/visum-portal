# Password Reset Debugging Guide

## Current Issue
Password reset claims success but doesn't persist:
- ✅ Password update returns success
- ✅ User is signed out
- ❌ New password doesn't work
- ❌ Old password still works

## Debug Steps

### 1. Check Console Logs During Reset

When you reset the password, watch for these logs:

```javascript
// Step 1: Token verification
🔍 Checking reset token validity...
🔗 URL params: { hasTokenHash: true/false, type: 'recovery', fullHash: '...' }
🔑 Verifying recovery token... (if token_hash present)
✅ Recovery token verified successfully

// Step 2: Password update
🔐 Attempting to update password...
📋 Current session before update: { session: {...} }
✅ Password updated successfully: { userId: '...', email: '...', updatedAt: '...' }

// Step 3: Sign out
🚪 Signing out user to commit password change...
✅ User signed out successfully
🔍 Session after sign out: 'Cleared (GOOD)' or 'Still exists (ERROR)'
```

### 2. Check Supabase Database

**Query to run in Supabase SQL Editor:**

```sql
-- Check user's password metadata
SELECT
    id,
    email,
    encrypted_password,
    updated_at,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'info@workdeck.com';
```

**What to look for:**
- `updated_at` should change after password reset
- `encrypted_password` should be different
- `email_confirmed_at` should NOT be null

### 3. Possible Root Causes

#### A. Email Not Confirmed
If `email_confirmed_at` is NULL, password resets might not work.

**Fix:**
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'info@workdeck.com'
AND email_confirmed_at IS NULL;
```

#### B. RLS Policy Blocking Updates
Check if Row Level Security is preventing password updates.

**Query:**
```sql
-- Check RLS policies on auth.users
SELECT * FROM pg_policies WHERE tablename = 'users' AND schemaname = 'auth';
```

#### C. Database Trigger Preventing Update
Check for triggers that might rollback changes.

**Query:**
```sql
-- Check triggers on auth.users
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;
```

#### D. Supabase Project Settings
Check in Supabase Dashboard:
1. **Authentication → Email Auth**
   - "Enable email confirmations" setting
   - "Secure password change" setting

2. **Authentication → Auth Providers**
   - Email provider should be enabled

### 4. Manual Password Update Test

Try updating password via Supabase Dashboard:

1. Go to Supabase Dashboard
2. Authentication → Users
3. Find user: info@workdeck.com
4. Click "..." menu → "Reset password"
5. OR manually set password via SQL:

```sql
-- This uses Supabase's password hashing
-- Replace 'NewPassword123' with your test password
```

### 5. Alternative: Check Session Scope

The recovery session might not have the right scope.

**Debug query:**
```javascript
// In browser console during password reset page:
const session = await supabase.auth.getSession();
console.log('Session scope:', session.data.session);
```

Look for:
- `session.user.aud` should be 'authenticated'
- `session.user.role` should be 'authenticated'

### 6. Test Sequence

1. **Request reset** for info@workdeck.com
2. **Open browser DevTools** (F12) → Console tab
3. **Click reset link** in email
4. **Copy all console logs**
5. **Enter new password** and submit
6. **Copy all console logs** from password update
7. **Try to login** with new password
8. **Check database** with SQL query above

### 7. Expected vs Actual Behavior

**Expected:**
```
1. Reset link clicked
2. Token verified → ✅
3. Password updated → ✅
4. Database encrypted_password changed → ✅
5. User signed out → ✅
6. Login with new password → ✅
7. Login with old password → ❌
```

**Actual (Broken):**
```
1. Reset link clicked
2. Token verified → ✅
3. Password updated → ✅ (claims success)
4. Database encrypted_password changed → ❌ (NOT CHANGED)
5. User signed out → ✅
6. Login with new password → ❌
7. Login with old password → ✅ (STILL WORKS)
```

## Next Steps

1. Run the SQL query to check if password hash is actually changing
2. Copy all console logs from a full reset attempt
3. Check Supabase project settings for any restrictions
4. Verify email is confirmed in database

## Contact Info

If issue persists, provide:
- Full console logs from reset attempt
- SQL query results from auth.users
- Supabase project settings screenshot (Authentication section)
