# Distributor API Migration Guide

**Date:** 2025-11-21
**Status:** ✅ API Updated, Frontend Components Need Updates

---

## Overview

The distributor API has been updated to use the new `distributors` table with proper joins to `user_profiles`. This changes the data structure from **individual users** to **companies with multiple users**.

---

## Database Structure (Verified Ready)

### distributors Table
```sql
- id (UUID, primary key)
- company_name (text)
- territory (text)
- account_type ('exclusive' | 'non-exclusive')
- status ('active' | 'pending' | 'inactive')
- contact_email (text, optional)
- phone (text, optional)
- address (text, optional)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### user_profiles Table (Updated)
```sql
- id (UUID, primary key)
- distributor_id (UUID, foreign key → distributors.id) ← NEW COLUMN
- email (text)
- full_name (text)
- company_role ('admin' | 'manager' | 'user') ← NEW COLUMN
- status ('active' | 'pending' | 'inactive')
- invited_at (timestamptz)
- last_login (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Current Database:**
- ✅ 5 companies in distributors table
- ✅ 5 users in user_profiles, all linked via distributor_id
- ✅ Foreign keys working correctly

---

## API Changes Summary

### Before (OLD - User-Centric)
```typescript
// Returned individual users
const { data: distributors } = await fetchDistributors();
// Result: [
//   { id: 'user1', email: 'john@acme.com', company_name: 'Acme Corp', ... },
//   { id: 'user2', email: 'jane@acme.com', company_name: 'Acme Corp', ... },
//   { id: 'user3', email: 'bob@widgets.com', company_name: 'Widgets Inc', ... }
// ]
```

### After (NEW - Company-Centric)
```typescript
// Returns companies with users array
const { data: distributors } = await fetchDistributors();
// Result: [
//   {
//     id: 'company1',
//     company_name: 'Acme Corp',
//     territory: 'United States',
//     account_type: 'exclusive',
//     status: 'active',
//     users: [
//       { id: 'user1', email: 'john@acme.com', company_role: 'admin', ... },
//       { id: 'user2', email: 'jane@acme.com', company_role: 'user', ... }
//     ]
//   },
//   {
//     id: 'company2',
//     company_name: 'Widgets Inc',
//     territory: 'United Kingdom',
//     account_type: 'non-exclusive',
//     status: 'active',
//     users: [
//       { id: 'user3', email: 'bob@widgets.com', company_role: 'admin', ... }
//     ]
//   }
// ]
```

---

## Updated Functions

### 1. fetchDistributors()
**Status:** ✅ Updated to use distributors table

**Old Behavior:**
- Queried `user_profiles` table
- Returned individual users
- Filter by user status

**New Behavior:**
- Queries `distributors` table
- Joins `user_profiles` using `distributor_id`
- Returns companies with `users` array
- Filters by company status and territory

**Example:**
```typescript
const { data: companies, error } = await fetchDistributors({
  status: ['active'],
  territory: ['United States'],
  search: 'Acme'
});

// companies[0].company_name = 'Acme Corp'
// companies[0].users = [{ email: 'john@acme.com', ... }, ...]
```

---

### 2. fetchDistributorById()
**Status:** ✅ Updated to use distributors table

**Old Behavior:**
- Returned single user record

**New Behavior:**
- Returns single company with all users

**Example:**
```typescript
const { data: company, error } = await fetchDistributorById('company-uuid');

// company.company_name = 'Acme Corp'
// company.users = [{ email: 'john@acme.com', ... }]
```

---

### 3. updateDistributor()
**Status:** ✅ Updated to use distributors table

**Old Behavior:**
- Updated `user_profiles` table
- Updated user-specific fields (full_name, etc.)

**New Behavior:**
- Updates `distributors` table
- Updates company-specific fields (company_name, territory, account_type, contact_email, phone, address)

**Example:**
```typescript
const { data, error } = await updateDistributor('company-uuid', {
  company_name: 'Acme Corporation',
  territory: 'Canada',
  account_type: 'exclusive',
  status: 'active',
  contact_email: 'info@acme.com',
  phone: '+1-555-0100',
  address: '123 Main St, Toronto'
});
```

---

### 4. getDistributorUsers() - NEW
**Status:** ✅ New function added

**Purpose:** Get all users for a specific company

**Example:**
```typescript
const { data: users, error } = await getDistributorUsers('company-uuid');

// users = [
//   { id: 'user1', email: 'john@acme.com', company_role: 'admin', status: 'active' },
//   { id: 'user2', email: 'jane@acme.com', company_role: 'user', status: 'active' }
// ]
```

---

### 5. updateDistributorUser() - NEW
**Status:** ✅ New function added

**Purpose:** Update individual user within a company

**Example:**
```typescript
const { data, error } = await updateDistributorUser('user-uuid', {
  full_name: 'John Smith',
  company_role: 'manager',
  status: 'active'
});
```

---

### 6. getDistributorStats()
**Status:** ✅ Updated for companies

**Old Behavior:**
- Counted individual users

**New Behavior:**
- Counts companies
- Adds territory and account_type breakdowns

**Example:**
```typescript
const { data: stats, error } = await getDistributorStats();

// stats = {
//   total: 5,
//   active: 4,
//   pending: 1,
//   inactive: 0,
//   by_territory: { 'United States': 2, 'United Kingdom': 1, 'Canada': 2 },
//   by_account_type: { 'exclusive': 3, 'non-exclusive': 2 }
// }
```

---

### 7. getDistributorUserStats() - NEW
**Status:** ✅ New function added

**Purpose:** Get user-level statistics across all companies

**Example:**
```typescript
const { data: stats, error } = await getDistributorUserStats();

// stats = {
//   total_users: 12,
//   active_users: 10,
//   pending_users: 2,
//   inactive_users: 0,
//   by_company_role: { 'admin': 5, 'manager': 3, 'user': 4 }
// }
```

---

### 8. fetchDistributorsLegacy() - TEMPORARY
**Status:** ✅ Added for backward compatibility

**Purpose:** Flattens company data back to old user-centric format

**Use Case:** For components not yet updated to handle new structure

**Example:**
```typescript
// Use this temporarily if you can't update component immediately
const { data: flatUsers, error } = await fetchDistributorsLegacy();

// flatUsers = [
//   { id: 'user1', email: 'john@acme.com', company_name: 'Acme Corp', distributor_id: 'company1', ... },
//   { id: 'user2', email: 'jane@acme.com', company_name: 'Acme Corp', distributor_id: 'company1', ... }
// ]
```

**⚠️ IMPORTANT:** This is a temporary compatibility function. Update components to use the new structure.

---

## Frontend Components That Need Updates

### 1. DistributorsManagement.tsx
**Location:** `src/components/admin/DistributorsManagement.tsx`

**Required Changes:**
- Update table to show companies (not individual users)
- Add expandable rows to show users per company
- Update filters to use company status
- Update edit dialog to edit company info
- Add "Manage Users" button for each company

**Current Display:**
```
Email             | Full Name    | Company       | Territory | Status
john@acme.com     | John Smith   | Acme Corp     | US        | Active
jane@acme.com     | Jane Doe     | Acme Corp     | US        | Active
bob@widgets.com   | Bob Jones    | Widgets Inc   | UK        | Active
```

**New Display:**
```
Company Name      | Territory | Account Type | Status | Users | Actions
Acme Corp         | US        | Exclusive    | Active | 2     | [Edit] [Manage Users] [Deactivate]
  ↳ john@acme.com (Admin)
  ↳ jane@acme.com (User)
Widgets Inc       | UK        | Non-Excl.    | Active | 1     | [Edit] [Manage Users] [Deactivate]
  ↳ bob@widgets.com (Admin)
```

---

### 2. Create/Edit Distributor Dialog
**Changes Needed:**

**Old Fields:**
- Email (user email)
- Full Name (user name)
- Company Name
- Territory
- Account Type

**New Fields:**
- Company Name ← Primary
- Territory
- Account Type
- Contact Email ← Company email
- Phone ← Company phone
- Address ← Company address
- **First User Section:**
  - User Email
  - User Full Name
  - User Company Role (admin/manager/user)

---

### 3. AdminDashboard Statistics
**Location:** `src/components/admin/AdminDashboard.tsx`

**Update Stats Display:**
```typescript
// OLD
const { data: stats } = await getDistributorStats();
// Displayed: Total Users, Active Users

// NEW
const { data: companyStats } = await getDistributorStats();
const { data: userStats } = await getDistributorUserStats();
// Display:
// - Companies: 5 total, 4 active
// - Users: 12 total, 10 active
// - By Territory: US (2), UK (1), CA (2)
// - By Account Type: Exclusive (3), Non-Exclusive (2)
```

---

### 4. Resend Invitation
**Status:** ⚠️ Needs Component Update

**Current:** Passes distributor ID (was user ID)
**New:** Must pass user ID

**Update:**
```typescript
// OLD
<Button onClick={() => resendInvitation(distributor.id)}>
  Resend Invitation
</Button>

// NEW
<Button onClick={() => resendInvitation(user.id)}>
  Resend Invitation
</Button>
```

---

## Migration Strategy

### Phase 1: Use Legacy Function (Quick Fix)
**Timeline:** Immediate
**Effort:** 5 minutes

Update DistributorsManagement.tsx to use legacy function:
```typescript
// Change this line:
const { data: distributors } = await fetchDistributors();

// To this:
const { data: distributors } = await fetchDistributorsLegacy();
```

This restores functionality while you plan proper migration.

---

### Phase 2: Update UI Components (Proper Fix)
**Timeline:** 1-2 days
**Effort:** Medium

1. **Update DistributorsManagement.tsx:**
   - Change table structure to show companies
   - Add expandable rows for users
   - Update create/edit dialogs
   - Add "Manage Users" modal

2. **Update AdminDashboard.tsx:**
   - Display company stats AND user stats
   - Add territory/account type breakdowns

3. **Remove fetchDistributorsLegacy():**
   - Once all components updated, remove the legacy function

---

## Testing Checklist

After updating components, test:

- [ ] List all distributors (companies)
- [ ] Expand company to see users
- [ ] Create new distributor company with first user
- [ ] Edit distributor company details
- [ ] Add additional user to existing company
- [ ] Edit user details (name, role, status)
- [ ] Resend invitation to user
- [ ] Activate/deactivate company
- [ ] Filter by company status
- [ ] Filter by territory
- [ ] Search by company name
- [ ] View statistics dashboard
- [ ] Verify territory breakdown
- [ ] Verify account type breakdown
- [ ] Verify user statistics

---

## Example Component Code

### Distributor List with Expandable Users

```typescript
import { Distributor } from '@/lib/api/distributors';

function DistributorsList() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadDistributors();
  }, []);

  const loadDistributors = async () => {
    const { data, error } = await fetchDistributors();
    if (data) setDistributors(data);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company Name</TableHead>
          <TableHead>Territory</TableHead>
          <TableHead>Account Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Users</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {distributors.map((distributor) => (
          <>
            <TableRow key={distributor.id}>
              <TableCell>
                <Button
                  variant="ghost"
                  onClick={() => setExpandedId(
                    expandedId === distributor.id ? null : distributor.id
                  )}
                >
                  {expandedId === distributor.id ? '▼' : '▶'}
                  {distributor.company_name}
                </Button>
              </TableCell>
              <TableCell>{distributor.territory}</TableCell>
              <TableCell>{distributor.account_type}</TableCell>
              <TableCell>
                <Badge variant={distributor.status === 'active' ? 'success' : 'secondary'}>
                  {distributor.status}
                </Badge>
              </TableCell>
              <TableCell>{distributor.users?.length || 0}</TableCell>
              <TableCell>
                <Button onClick={() => handleEdit(distributor)}>Edit</Button>
                <Button onClick={() => handleManageUsers(distributor)}>
                  Manage Users
                </Button>
              </TableCell>
            </TableRow>

            {/* Expanded User Rows */}
            {expandedId === distributor.id && distributor.users?.map((user) => (
              <TableRow key={user.id} className="bg-gray-50">
                <TableCell colSpan={2} className="pl-8">
                  ↳ {user.email}
                </TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.company_role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => resendInvitation(user.id)}>
                    Resend Invite
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Edge Function Updates Needed

The following Edge Functions also need updates:

### 1. create-distributor
**Location:** Supabase Edge Functions

**Needs:**
- Create record in `distributors` table first
- Then create first user in `user_profiles` with `distributor_id`

### 2. delete-distributor
**Location:** Supabase Edge Functions

**Needs:**
- Delete from `distributors` table
- CASCADE will automatically delete linked users

### 3. create-distributor-user (NEW)
**Needs:** New Edge Function to add additional users to existing company

### 4. delete-distributor-user (NEW)
**Needs:** New Edge Function to remove users from company

---

## Rollback Plan

If issues arise, you can temporarily revert:

1. **Keep API Changes:** The new API is backward compatible via `fetchDistributorsLegacy()`
2. **Use Legacy Function:** Update frontend to use `fetchDistributorsLegacy()`
3. **Fix Issues:** Address any bugs
4. **Re-migrate:** Once fixed, update to use proper new functions

---

## Questions?

If you encounter issues:
1. Check browser console for API errors
2. Verify data structure matches expected format
3. Ensure all foreign keys are set correctly
4. Check that Edge Functions are updated

---

**Status:** API is ready. Frontend components need updates to display company-centric data.
