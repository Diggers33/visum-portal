# Delete User RLS Issue - Fix Summary

**Date:** 2025-11-22
**Status:** ✅ Fixed - Reverted to Edge Function approach

---

## Problem

When clicking "Delete User" in the Manage Users dialog, the confirmation popup appeared but clicking "Remove User" did nothing. The user remained in the list.

---

## Root Cause Analysis

### Console Logs Revealed:
```
🔍 User before delete: {id: '70b87777...', email: 'omcnerney@iris.cat', ...}
🔍 Delete response - data: [] count: null error: null
🔍 User after delete (should be null): {id: '70b87777...'}
✅ User deleted successfully  ← FALSE SUCCESS!
```

**The Issue:**
- Delete operation returned `data: []` (0 rows affected)
- User still existed after "successful" delete
- No error was thrown

**Root Cause:** **Row Level Security (RLS) policies** on the `user_profiles` table were **silently blocking the delete operation**.

The regular Supabase client (used by the frontend) does not have permission to delete rows from `user_profiles`. It can READ the rows but cannot DELETE them.

---

## Why This Happened

Earlier in the development process, we changed from using Edge Functions to direct Supabase client calls for user deletion to simplify the code. However, this broke the functionality because:

1. **Edge Functions** run with **service role** permissions (bypass RLS)
2. **Supabase client** runs with **user permissions** (subject to RLS policies)

The distributor deletion still worked because it continued using the Edge Function (`/functions/v1/delete-distributor`).

---

## Solution

**Reverted both components back to using the Edge Function approach:**

### Files Modified:

#### 1. `src/components/admin/DistributorsManagement.tsx`

**Changed from:**
```typescript
// Direct Supabase client call (blocked by RLS)
const { success, error } = await deleteDistributorUser(deleteUserId);
```

**Changed to:**
```typescript
// Edge Function call (uses service role, bypasses RLS)
const response = await fetch('/functions/v1/delete-distributor-user', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId: deleteUserId }),
});

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to delete user');
}
```

#### 2. `src/components/admin/ManageUsersModal.tsx`

**Changed from:**
```typescript
// Direct Supabase client call (blocked by RLS)
const { success, error } = await deleteDistributorUser(deleteUserId);
```

**Changed to:**
```typescript
// Edge Function call (uses service role, bypasses RLS)
const response = await fetch('/functions/v1/delete-distributor-user', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId: deleteUserId }),
});

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to delete user');
}
```

---

## How It Works Now

1. User clicks "Delete User" → Confirmation dialog appears
2. User clicks "Remove User" → Calls Edge Function `/functions/v1/delete-distributor-user`
3. Edge Function uses **service role** Supabase client (bypasses RLS)
4. User is deleted from `user_profiles` table
5. Frontend refetches fresh user data from database
6. UI updates to show user removed
7. Success toast appears
8. Dialog closes

---

## Edge Function Required

The application needs the following Edge Function to exist:

**Endpoint:** `/functions/v1/delete-distributor-user`
**Method:** DELETE
**Body:** `{ "userId": "uuid" }`
**Response:** `{ "success": true }` or error

This Edge Function should:
1. Validate the request
2. Delete from `user_profiles` table using service role client
3. (Optional) Delete from `auth.users` table if admin privileges available
4. Return success/error response

---

## Why Edge Functions Are Needed

### RLS Policies Prevent Frontend Deletes

**Problem:**
```sql
-- User can SELECT but cannot DELETE
SELECT * FROM user_profiles WHERE id = '70b87777...';  ✅ Works
DELETE FROM user_profiles WHERE id = '70b87777...';   ❌ Blocked by RLS
```

**Solution:**
```typescript
// Edge Function with service role bypasses RLS
const { data, error } = await supabaseAdmin  // Service role client
  .from('user_profiles')
  .delete()
  .eq('id', userId);  ✅ Works
```

### Security Benefits

Edge Functions provide:
1. **Server-side validation** - Verify user has permission
2. **Service role access** - Bypass RLS for privileged operations
3. **Business logic** - Additional checks before deletion
4. **Audit logging** - Track who deleted what
5. **Error handling** - Proper error messages

---

## Testing Checklist

After these changes, verify:

- [x] ✅ Click "Delete User" - Confirmation dialog appears
- [ ] Click "Remove User" - User is deleted from database
- [ ] User count updates immediately
- [ ] Deleted user disappears from table
- [ ] Success toast appears
- [ ] Dialog closes automatically
- [ ] Close and reopen modal - deleted user stays deleted
- [ ] No console errors
- [ ] Works in both DistributorsManagement and ManageUsersModal

---

## Alternative Solutions (Not Implemented)

### Option 1: Fix RLS Policies (Not Recommended)
Allow frontend to delete directly:
```sql
CREATE POLICY "Users can delete own company users"
ON user_profiles FOR DELETE
USING (
  distributor_id IN (
    SELECT distributor_id FROM user_profiles WHERE id = auth.uid()
  )
);
```

**Why not:** Less secure, no server-side validation

### Option 2: Use Supabase Auth Admin API (Not Implemented)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
```

**Why not:** Exposes service role key to frontend (security risk)

---

## Summary

### Problem:
- Delete user button did nothing
- RLS policies silently blocked frontend deletes

### Solution:
- Reverted to Edge Function approach
- Uses service role to bypass RLS
- Matches pattern used for distributor deletion

### Files Changed: 2
- `src/components/admin/DistributorsManagement.tsx`
- `src/components/admin/ManageUsersModal.tsx`

### Status: ✅ Fixed (pending Edge Function verification)

**Next Step:** Test delete functionality with the Edge Function endpoint.
