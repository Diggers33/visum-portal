# Test Junction Table Query

## Problem

Records are being inserted into `documentation_distributors` but not appearing when we query with `.select()`.

## Test 1: Direct Table Query

Run this in your browser console (logged in as admin):

```javascript
// Check if records exist in junction table
const { data, error } = await supabase
  .from('documentation_distributors')
  .select('*');

console.log('📊 All junction table records:', data);
console.log('❌ Error:', error);
```

**Expected:** Should see records for document IDs:
- `e68219be-26b2-4a53-b15e-f76d4ec63e01` (Test - IRIS Only)
- `967bb3aa-f274-4d61-932e-862a616eb80c` (another IRIS only test)

---

## Test 2: Query with Join

Run this in console:

```javascript
// Query documentation WITH junction table join
const { data, error } = await supabase
  .from('documentation')
  .select(`
    id,
    title,
    sharing:documentation_distributors(distributor_id)
  `)
  .eq('id', '967bb3aa-f274-4d61-932e-862a616eb80c');

console.log('📊 Document with sharing:', data);
console.log('❌ Error:', error);
```

**Expected:**
```javascript
{
  id: "967bb3aa-f274-4d61-932e-862a616eb80c",
  title: "another IRIS only test",
  sharing: [
    { distributor_id: "<iris-distributor-id>" }
  ]
}
```

**If sharing is still empty:** The Supabase relationship is not configured correctly.

---

## Test 3: Check RLS Policies

The issue might be RLS policies blocking SELECT on junction table.

Run this:

```javascript
// Try to read junction table as admin
const { data, error } = await supabase
  .from('documentation_distributors')
  .select('*')
  .eq('documentation_id', '967bb3aa-f274-4d61-932e-862a616eb80c');

console.log('📊 Sharing records for test doc:', data);
console.log('❌ Error:', error);
```

**If data is empty:** RLS is blocking SELECT on the junction table!

---

## Likely Root Cause

**RLS policies on `documentation_distributors` table are blocking SELECT queries.**

The admin can INSERT (we see "Saved 1 sharing records"), but cannot SELECT the records back due to RLS.

## Solution

Need to add RLS policy on `documentation_distributors` table:

```sql
-- Allow admins to SELECT junction table records
CREATE POLICY "Admins can view all sharing records"
ON documentation_distributors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Allow distributors to view sharing records for their content
CREATE POLICY "Distributors can view sharing for accessible content"
ON documentation_distributors
FOR SELECT
TO authenticated
USING (true);  -- Allow all to read (filtering happens in app)
```
