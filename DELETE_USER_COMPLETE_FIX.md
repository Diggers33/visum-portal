# Delete User - Complete Fix Summary

**Date:** 2025-11-22
**Status:** ✅ FULLY WORKING

---

## The Journey: 5 Issues Fixed

### Issue 1: No Confirmation Dialog ❌
**Problem:** Clicking "Delete User" did nothing.

**Root Cause:** Missing confirmation dialog state and AlertDialog component.

**Fix:**
- Added `deleteUserId` and `deletingUser` state variables
- Changed button to open confirmation dialog: `onClick={() => setDeleteUserId(user.id)}`
- Added AlertDialog component at end of component
- Updated `handleDeleteUser` to use state instead of parameter

**Files:** `DistributorsManagement.tsx`

---

### Issue 2: Stale Data After Deletion ❌
**Problem:** Deleted users reappeared when reopening modal.

**Root Cause:** Optimistic update didn't refetch from database.

**Fix:**
```typescript
// BEFORE: Optimistic update only
setDistributors(prev => prev.map(d =>
  d.id === id ? { ...d, users: d.users.filter(u => u.id !== userId) } : d
));

// AFTER: Refetch fresh data from database
const { data: freshUsers } = await getDistributorUsers(selectedDistributorId);
setDistributors(prev => prev.map(d =>
  d.id === id ? { ...d, users: freshUsers || [] } : d
));
```

**Files:** `DistributorsManagement.tsx`, `ManageUsersModal.tsx`

---

### Issue 3: RLS Blocking Deletes ❌
**Problem:** Delete appeared to work but user still existed in database.

**Console Logs Showed:**
```
🔍 Delete response - data: [] count: null error: null  ← 0 rows deleted!
🔍 User after delete (should be null): {id: '70b87777...'}  ← Still exists!
```

**Root Cause:** Row Level Security (RLS) policies blocked frontend Supabase client from deleting users.

**Fix:** Use Edge Function with service role instead of direct Supabase client.

**Created:** `delete-distributor-user` Edge Function

---

### Issue 4: Wrong URL (405 Error) ❌
**Problem:**
```
DELETE https://visum-portal-five.vercel.app/functions/v1/delete-distributor-user 405
```

**Root Cause:** Using relative URL `/functions/v1/...` which went to Vercel instead of Supabase.

**Fix:**
```typescript
// BEFORE: Relative URL (goes to Vercel)
fetch('/functions/v1/delete-distributor-user')

// AFTER: Full Supabase URL
fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-distributor-user`)
```

**Files:**
- `DistributorsManagement.tsx` (5 Edge Function calls fixed)
- `ManageUsersModal.tsx` (1 Edge Function call fixed)

---

### Issue 5: CORS Error ❌
**Problem:**
```
Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response
```

**Root Cause:** Edge Function missing CORS header for DELETE method.

**Fix:**
```typescript
// BEFORE
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AFTER
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',  // ✅ Added
};
```

**File:** `delete-distributor-user` Edge Function

---

### Issue 6: Authentication Error (401) ❌
**Problem:**
```
DELETE https://fssjmqgolghfwmikydhy.supabase.co/functions/v1/delete-distributor-user 401 (Unauthorized)
```

**Root Cause:** Edge Function requires authentication headers but none were sent.

**Fix:**
```typescript
// Get user session
const { data: { session } } = await supabase.auth.getSession();

// Add auth headers to fetch
const response = await fetch(edgeFunctionUrl, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,  // ✅ Auth token
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,  // ✅ API key
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId: deleteUserId }),
});
```

**Files:** `DistributorsManagement.tsx`, `ManageUsersModal.tsx`

---

## Final Working Implementation

### Frontend Components

**src/components/admin/DistributorsManagement.tsx:**
```typescript
import { supabase } from '@/lib/supabase';

const handleDeleteUser = async () => {
  if (!selectedDistributorId || !deleteUserId) return;

  const user = selectedDistributor?.users?.find((u) => u.id === deleteUserId);
  setDeletingUser(true);

  try {
    // Get session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    // Call Edge Function with auth headers
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-distributor-user`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: deleteUserId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete user');
    }

    toast({ title: 'Success', description: `User ${user?.full_name || user?.email} deleted` });

    // Refetch fresh data from database
    const { data: freshUsers, error: fetchError } = await getDistributorUsers(selectedDistributorId);

    if (!fetchError) {
      setDistributors((prev) =>
        prev.map((d) =>
          d.id === selectedDistributorId ? { ...d, users: freshUsers || [] } : d
        )
      );
    }

    setDeleteUserId(null);
  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  } finally {
    setDeletingUser(false);
  }
};
```

**src/components/admin/ManageUsersModal.tsx:**
- Same implementation as above
- Added `onDataChange` callback to notify parent component

### Backend Edge Function

**Edge Function: `delete-distributor-user`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use SERVICE ROLE to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🗑️ Deleting user:', userId);

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId)
      .select();

    if (error) {
      console.error('❌ Delete error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User deleted successfully:', data);

    return new Response(
      JSON.stringify({ success: true, deleted: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Files Modified

### Frontend
1. **src/components/admin/DistributorsManagement.tsx**
   - Added confirmation dialog state
   - Added supabase import
   - Fixed 5 Edge Function URLs to use full Supabase URL
   - Added authentication headers
   - Added database refetch after deletion

2. **src/components/admin/ManageUsersModal.tsx**
   - Added supabase import
   - Fixed Edge Function URL
   - Added authentication headers
   - Added `onDataChange` callback prop

### Backend
3. **Edge Function: delete-distributor-user**
   - Created new Edge Function
   - Uses service role to bypass RLS
   - Includes proper CORS headers
   - Deletes from `user_profiles` table

### Documentation
4. **delete-distributor-user-edge-function.ts** (local reference)
5. **DELETE_USER_RLS_FIX.md**
6. **STALE_DATA_FIX_SUMMARY.md**
7. **DELETE_USER_COMPLETE_FIX.md** (this file)

---

## How It Works Now

1. User clicks "Delete User" → **Confirmation dialog appears**
2. User clicks "Remove User" → **Gets auth session**
3. Frontend calls Edge Function with auth headers
4. Edge Function uses **service role** to bypass RLS
5. User deleted from `user_profiles` table
6. Frontend refetches fresh data from database
7. UI updates with deleted user removed
8. Success toast notification
9. Dialog closes automatically

---

## Key Learnings

### 1. RLS Policies
Frontend Supabase client is subject to RLS policies. For privileged operations (like deleting users), use Edge Functions with service role.

### 2. Edge Function URLs
Always use full Supabase URL for Edge Functions:
```typescript
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/function-name`
```

Not relative URLs:
```typescript
'/functions/v1/function-name'  // ❌ Goes to frontend host
```

### 3. CORS Headers
Edge Functions must include:
```typescript
'Access-Control-Allow-Methods': 'DELETE, OPTIONS'  // Or GET, POST, etc.
```

### 4. Authentication
Edge Functions require auth headers:
```typescript
{
  'Authorization': `Bearer ${session.access_token}`,
  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
}
```

### 5. Refetch After Mutations
Always refetch from database after mutations to ensure UI reflects true state:
```typescript
// ❌ Optimistic update only
setState(filtered)

// ✅ Refetch from database
const { data } = await fetchFromDB()
setState(data)
```

---

## Testing Checklist

- [x] ✅ Click "Delete User" - Confirmation dialog appears
- [x] ✅ Click "Remove User" - User is deleted from database
- [x] ✅ User count updates immediately
- [x] ✅ Deleted user disappears from table
- [x] ✅ Success toast appears
- [x] ✅ Dialog closes automatically
- [x] ✅ Close and reopen modal - deleted user stays deleted
- [x] ✅ No console errors
- [x] ✅ Works in both DistributorsManagement and ManageUsersModal

---

## Summary

**Total Issues Fixed:** 6
**Files Modified:** 2 frontend + 1 Edge Function
**Lines Changed:** ~100
**Time to Debug:** Multiple iterations
**Result:** ✅ FULLY WORKING

The delete user functionality now works correctly with proper confirmation, authentication, RLS bypass via Edge Function, and fresh data refetching.

**Ready for production!** 🚀
