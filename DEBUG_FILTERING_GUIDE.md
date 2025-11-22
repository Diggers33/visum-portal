# Content Filtering Debug Guide

## Debug Logging Added

Comprehensive console logging has been added to diagnose why filtering isn't working correctly.

## What to Look For in Console

When you load the Technical Documentation page as a Workdeck user, you should see:

### 1. **Authentication Debug**
```
🔍 [Auth Debug] Current user: <user-id> <email>
🔍 [Auth Debug] User profile: { distributor_id: "..." }
🔍 [Auth Debug] Distributor ID: <distributor-id>
```

**✅ EXPECTED:** Workdeck's distributor ID should appear
**❌ PROBLEM:** If `null` or wrong ID, user profile is incorrect

---

### 2. **Filtering Setup**
```
🔍 [Filtering Debug] Content Type: documentation
🔍 [Filtering Debug] User Distributor ID: <workdeck-distributor-id>
🔍 [Filtering Debug] Junction Table: documentation_distributors
🔍 [Filtering Debug] Junction Field: documentation_id
```

**✅ EXPECTED:** Junction table should be `documentation_distributors`
**❌ PROBLEM:** If table name wrong, query will fail

---

### 3. **Raw Data from Database**
```
🔍 [Filtering Debug] Raw data count: 5
🔍 [Filtering Debug] Raw data: [
  {
    id: "doc1",
    title: "Document 1",
    status: "published",
    sharing: []  // ← CRITICAL: Empty = shared with all
  },
  {
    id: "doc2",
    title: "Document 2",
    status: "published",
    sharing: [
      { distributor_id: "iris-id" }  // ← Shared with IRIS only
    ]
  },
  {
    id: "doc3",
    title: "Document 3",
    status: "published",
    sharing: [
      { distributor_id: "workdeck-id" }  // ← Shared with Workdeck
    ]
  }
]
```

**KEY INSIGHT:** Check the `sharing` array for each document!

**✅ EXPECTED SCENARIOS:**
- `sharing: []` = Document shared with ALL (should be visible to everyone)
- `sharing: [{ distributor_id: "workdeck-id" }]` = Shared with Workdeck (visible to Workdeck)
- `sharing: [{ distributor_id: "iris-id" }]` = Shared with IRIS (NOT visible to Workdeck)

**❌ POSSIBLE PROBLEMS:**
- `sharing: null` = Query didn't fetch junction table data (SQL query issue)
- `sharing: undefined` = Junction table relationship broken
- All `sharing` arrays are empty = No sharing records saved (admin UI bug)

---

### 4. **Per-Item Filtering Decision**
```
🔍 [Filtering Debug] Item 0: {
  id: "doc1",
  title: "Document 1",
  sharing: [],
  sharingLength: 0
}
  ✅ Item 0: Shared with ALL (no sharing records)

🔍 [Filtering Debug] Item 1: {
  id: "doc2",
  title: "Document 2",
  sharing: [{ distributor_id: "iris-id" }],
  sharingLength: 1
}
  ❌ Item 1: Shared with specific distributors, has access: false

🔍 [Filtering Debug] Item 2: {
  id: "doc3",
  title: "Document 3",
  sharing: [{ distributor_id: "workdeck-id" }],
  sharingLength: 1
}
  ✅ Item 2: Shared with specific distributors, has access: true
```

**✅ EXPECTED:** Checkmark (✅) means visible, X (❌) means filtered out
**❌ PROBLEM:** If all items show ✅, the filter logic is broken

---

### 5. **Final Filtered Results**
```
🔍 [Filtering Debug] Accessible count: 2
🔍 [Filtering Debug] Accessible items: ["Document 1", "Document 3"]
```

**✅ EXPECTED:** Workdeck should see:
- Documents with `sharing: []` (public)
- Documents with `sharing: [{ distributor_id: "workdeck-id" }]`

**❌ PROBLEM:** If count equals raw data count (5), nothing was filtered

---

## Common Issues and Solutions

### Issue 1: All items have `sharing: []`
**Symptom:** Every document shows "Shared with ALL"
**Cause:** Admin didn't save sharing selections, or DistributorSelector bug
**Fix:** Check if `saveContentSharing()` is being called in admin components

### Issue 2: All items have `sharing: null`
**Symptom:** `sharing` field is null for all items
**Cause:** SQL query not fetching junction table
**Fix:** Check Supabase query syntax - should be:
```typescript
.select(`
  *,
  sharing:documentation_distributors(distributor_id)
`)
```

### Issue 3: Wrong distributor ID
**Symptom:** User Distributor ID doesn't match expected
**Cause:** User profile has wrong `distributor_id`
**Fix:** Check `user_profiles` table in Supabase

### Issue 4: Filter always returns true
**Symptom:** All items pass filter even with sharing records
**Cause:** Logic error in filter function
**Fix:** Verify `item.sharing.some()` is comparing correct IDs

---

## Testing Steps

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Login as Workdeck user**
4. **Navigate to Technical Documentation**
5. **Copy ALL console output** starting with "🔍 [Auth Debug]"
6. **Share the output** to diagnose the issue

---

## Expected Console Output for Workdeck User

```
🔍 [Auth Debug] Current user: abc-123 workdeck@example.com
🔍 [Auth Debug] User profile: { distributor_id: "workdeck-dist-id" }
🔍 [Auth Debug] Distributor ID: workdeck-dist-id

🔍 [Filtering Debug] Content Type: documentation
🔍 [Filtering Debug] User Distributor ID: workdeck-dist-id
🔍 [Filtering Debug] Junction Table: documentation_distributors
🔍 [Filtering Debug] Junction Field: documentation_id
🔍 [Filtering Debug] Raw data count: 5

🔍 [Filtering Debug] Item 0: { id: "1", title: "Public Doc", sharing: [], sharingLength: 0 }
  ✅ Item 0: Shared with ALL (no sharing records)

🔍 [Filtering Debug] Item 1: { id: "2", title: "IRIS Only", sharing: [{ distributor_id: "iris-dist-id" }], sharingLength: 1 }
  ❌ Item 1: Shared with specific distributors, has access: false

🔍 [Filtering Debug] Item 2: { id: "3", title: "Workdeck Only", sharing: [{ distributor_id: "workdeck-dist-id" }], sharingLength: 1 }
  ✅ Item 2: Shared with specific distributors, has access: true

🔍 [Filtering Debug] Accessible count: 2
🔍 [Filtering Debug] Accessible items: ["Public Doc", "Workdeck Only"]

Loaded accessible documents: 2
```

This shows proper filtering working correctly!
