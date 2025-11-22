# Apply RLS Policy Fix for Junction Tables

## Problem
Junction table inserts appear successful but records don't persist because RLS policies are blocking them.

## Solution
Apply the SQL migration to fix RLS policies on all junction tables.

## Steps to Apply

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Navigate to: https://app.supabase.com/

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy the migration SQL**
   - Open: `supabase/migrations/20250122_fix_junction_table_rls.sql`
   - Copy the entire contents

4. **Run the migration**
   - Paste the SQL into the SQL Editor
   - Click "Run" or press Ctrl+Enter

5. **Verify success**
   - You should see "Success. No rows returned" (policies don't return rows)
   - Check for any error messages

### Option 2: Supabase CLI (If you have it set up)

```bash
# Link your project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push
```

## Test After Applying

1. **Clear existing test data** (in browser console as admin):
```javascript
// Delete all junction table records to start fresh
await supabase.from('documentation_distributors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
```

2. **Create a new test document**:
   - Go to Admin > Documentation Management
   - Create a new document titled "RLS Test - IRIS Only"
   - In the Distributor Selector, select ONLY "IRIS"
   - Save

3. **Run debug test** (in browser console):
```javascript
window.debugSharing()
```

4. **Expected output**:
```
📋 Test 2: All records in documentation_distributors
Total records in junction table: 1  ← Should be 1 now!
All records: [{ documentation_id: "...", distributor_id: "..." }]

📋 Test 3: Documentation with join to sharing
Sharing array: [{ distributor_id: "..." }]  ← Should have data!
✅ Join is working! Found sharing records via join
```

5. **Test filtering**:
   - Log out
   - Log in as Workdeck user
   - Go to Technical Documentation
   - You should NOT see "RLS Test - IRIS Only" document

## What This Migration Does

For each junction table (`documentation_distributors`, `marketing_assets_distributors`, `training_materials_distributors`, `announcements_distributors`):

1. **Allows admins to manage sharing**:
   - INSERT new sharing records
   - UPDATE existing sharing records
   - DELETE sharing records

2. **Allows all users to view sharing**:
   - SELECT queries work (needed for filtering)
   - Users can see which content they have access to

## Troubleshooting

### If you still see 0 records after migration:

1. Check if migration applied successfully (no errors in SQL Editor)
2. Verify you're logged in as admin when testing
3. Clear browser cache and reload
4. Try creating a brand new document with sharing

### If you get errors when running migration:

- Error about policies already existing: This is OK, the migration drops them first
- Error about tables not existing: Check table names in Supabase dashboard
- Permission errors: Make sure you're running this as a database admin
