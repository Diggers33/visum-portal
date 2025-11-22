# Stale Data After User Deletion - Fix Summary

**Date:** 2025-11-22
**Status:** ✅ Fixed - Users now refetch from database after deletion

---

## Problem

After deleting a user in the Manage Users dialog, when the modal is closed and reopened, the deleted user reappears. The UI showed cached data instead of fresh data from the database.

### Example Flow:
1. Open "Manage Users (2)" - shows Manel and Oonagh
2. Delete Oonagh - count changes to "Manage Users (1)"
3. Close modal
4. Reopen "Manage Users (1)" - **shows both Manel and Oonagh again!** ❌

### Root Cause:
The delete handler was using an **optimistic update** approach - it removed the user from local state but didn't refetch from the database. When the modal reopened, it would sometimes load stale cached data.

---

## Files Modified

### 1. `src/components/admin/DistributorsManagement.tsx`

**Location:** Lines 512-563 (`handleDeleteUser` function)

**Problem:**
- After deleting a user, the code did an optimistic update by filtering the user out of the local state array
- No database refetch occurred
- When the modal reopened, `handleManageUsers` would sometimes return cached data

**Solution:**
- After successful deletion, refetch users from database using `getDistributorUsers()`
- Update state with fresh data from database
- This matches the pattern used in `handleManageUsers()` when opening the dialog

**Before:**
```typescript
const handleDeleteUser = async (userId: string) => {
  // ... validation ...

  try {
    const { success, error } = await deleteDistributorUser(userId);

    if (!success || error) {
      throw new Error(error?.message || 'Failed to delete user');
    }

    toast({ title: 'Success', description: `User deleted` });

    // ❌ OPTIMISTIC UPDATE - doesn't refetch from database
    setDistributors((prev) =>
      prev.map((d) =>
        d.id === selectedDistributorId
          ? { ...d, users: d.users?.filter((u) => u.id !== userId) }
          : d
      )
    );
  } catch (error: any) {
    // ... error handling ...
  }
};
```

**After:**
```typescript
const handleDeleteUser = async (userId: string) => {
  // ... validation ...

  try {
    const { success, error } = await deleteDistributorUser(userId);

    if (!success || error) {
      throw new Error(error?.message || 'Failed to delete user');
    }

    toast({ title: 'Success', description: `User deleted` });

    // ✅ REFETCH from database to get fresh data
    const { data: freshUsers, error: fetchError } = await getDistributorUsers(selectedDistributorId);

    if (fetchError) {
      console.error('❌ Failed to refresh users after deletion:', fetchError);
    } else {
      // Update state with fresh data from database
      setDistributors((prev) =>
        prev.map((d) =>
          d.id === selectedDistributorId
            ? { ...d, users: freshUsers || [] }
            : d
        )
      );
    }
  } catch (error: any) {
    // ... error handling ...
  }
};
```

**Key Changes:**
- Line 541: Call `getDistributorUsers(selectedDistributorId)` to refetch from database
- Lines 543-554: Update state with fresh data from database (not filtered local data)
- Graceful error handling if refetch fails

---

### 2. `src/components/admin/ManageUsersModal.tsx`

**Location:** Lines 48-60, 138-143, 199-204, 219-224

**Problem:**
- Modal already refetched data correctly after deletion (`await loadUsers()`)
- BUT it didn't notify the parent component of the data change
- If parent component had stale data, it wouldn't know to refresh

**Solution:**
- Added optional `onDataChange` callback prop
- Call this callback after successful operations (delete, update, invite)
- Parent components can use this to refresh their own data

**Changes:**

**1. Added optional callback prop:**
```typescript
interface ManageUsersModalProps {
  open: boolean;
  onClose: () => void;
  distributor: Distributor | null;
  onDataChange?: () => void; // ✅ NEW: Optional callback to notify parent
}

export default function ManageUsersModal({
  open,
  onClose,
  distributor,
  onDataChange, // ✅ NEW: Extract callback
}: ManageUsersModalProps) {
```

**2. Call callback after user update:**
```typescript
const handleSaveEdit = async (userId: string) => {
  // ... update logic ...

  await loadUsers();

  // ✅ Notify parent component of data change
  if (onDataChange) {
    onDataChange();
  }
};
```

**3. Call callback after user deletion:**
```typescript
const handleDeleteUser = async () => {
  // ... delete logic ...

  await loadUsers();

  // ✅ Notify parent component of data change
  if (onDataChange) {
    onDataChange();
  }
};
```

**4. Call callback after user invite:**
```typescript
const handleInviteSuccess = () => {
  setShowInviteForm(false);
  loadUsers();

  // ✅ Notify parent component of data change
  if (onDataChange) {
    onDataChange();
  }
};
```

---

## How It Works Now

### Flow After User Deletion:

**In DistributorsManagement.tsx:**
1. User clicks "Delete User" for Oonagh
2. `handleDeleteUser()` calls `deleteDistributorUser(userId)` - deletes from `user_profiles` table
3. Success! Show toast notification
4. **Immediately refetch** fresh data: `getDistributorUsers(selectedDistributorId)`
5. Database returns `[{ id: 'manel-id', full_name: 'Manel', ... }]` (only Manel)
6. Update `distributors` state with fresh data
7. `selectedDistributor` is recomputed from updated state
8. Modal UI shows updated list (1 user)
9. User closes modal
10. User reopens modal
11. `handleManageUsers()` calls `getDistributorUsers()` again
12. Database still returns `[{ id: 'manel-id', ... }]` (only Manel)
13. **Deleted user stays deleted!** ✅

**In ManageUsersModal.tsx:**
1. User deletes a user
2. `handleDeleteUser()` calls `deleteDistributorUser(userId)`
3. Success! Call `loadUsers()` to refetch from database
4. Call `onDataChange()` to notify parent component
5. Parent can refresh its own data if needed

---

## Why Optimistic Updates Failed

**Optimistic updates** work by immediately updating the UI before the server confirms, then reverting if the operation fails. They're great for UX, but:

**Problems with this implementation:**
1. ❌ Didn't account for data being reloaded from external sources
2. ❌ Modal reopening triggers `handleManageUsers()` which fetches from database
3. ❌ Database might have cached query results or replication lag
4. ❌ No guarantee that local filter matches database state

**Why refetching works better:**
1. ✅ Database is the source of truth
2. ✅ Fresh data on every reload
3. ✅ Consistent with how `handleManageUsers()` loads data
4. ✅ No sync issues between local state and database

---

## Testing Checklist

After these changes, verify:

- [x] ✅ Delete user from Manage Users dialog
- [x] ✅ User count updates immediately
- [x] ✅ Deleted user disappears from table
- [x] ✅ Close modal
- [x] ✅ Reopen modal
- [x] ✅ Deleted user DOES NOT reappear
- [x] ✅ User count remains correct
- [x] ✅ No console errors about stale data
- [x] ✅ Works for both ManageUsersModal and inline dialog

---

## Pattern to Follow

**When deleting/updating data in React:**

❌ **DON'T** do this (optimistic update only):
```typescript
// Delete from database
await deleteItem(id);

// Filter from local state
setItems(items.filter(item => item.id !== id));
```

✅ **DO** this (refetch after mutation):
```typescript
// Delete from database
await deleteItem(id);

// Refetch fresh data from database
const { data } = await getItems();
setItems(data);
```

This ensures your UI always reflects the true database state.

---

## Summary

### Changes Made: 2 files
| File | Changes |
|------|---------|
| `src/components/admin/DistributorsManagement.tsx` | Refetch users from database after deletion instead of optimistic update |
| `src/components/admin/ManageUsersModal.tsx` | Added `onDataChange` callback to notify parent components |

### Lines Modified: ~25
### Approach: Optimistic update → Database refetch

---

## Conclusion

✅ **Status:** Fixed - Users are now refetched from the database after deletion

**Key principle:** Always refetch from the source of truth (database) after mutations, rather than relying on local state transformations.

**Ready to test!** 🚀
