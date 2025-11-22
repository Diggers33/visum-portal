# Email Notification for Announcements

## Overview
Admins can now send email notifications to all distributors when publishing announcements. The feature includes a checkbox in the announcement form that triggers automated emails via Edge Function.

---

## Implementation Summary

### Database Schema
**Table:** `announcements`

```sql
send_notification BOOLEAN DEFAULT FALSE
```

This column tracks whether a notification should be sent (checkbox state).

---

### Backend (Edge Function)
**Edge Function:** `send-announcement-notification`

**Endpoint:** `POST /functions/v1/send-announcement-notification`

**Request Body:**
```json
{
  "announcement_id": "uuid-here"
}
```

**Function Behavior:**
1. Fetches announcement details from database
2. Queries all distributor users from `user_profiles` table
3. Sends personalized emails using Resend API
4. Email includes announcement title, content, and category
5. Returns success/error status

---

## Frontend Implementation

### 1. API Function (`src/lib/api/announcements.ts`)

Added interface support and notification function:

```typescript
export interface CreateAnnouncementInput {
  // ... existing fields
  send_notification?: boolean;
}

export async function sendAnnouncementNotification(announcementId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  const notificationUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-announcement-notification`;

  const response = await fetch(notificationUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ announcement_id: announcementId }),
  });

  if (!response.ok) {
    throw new Error('Failed to send notification');
  }
}
```

---

### 2. Admin Form (`src/components/admin/AnnouncementsManagement.tsx`)

#### Features Added:

**a) Checkbox UI with Conditional Enabling**

```tsx
<div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <Checkbox
    id="send-notification"
    checked={formData.send_notification || false}
    onCheckedChange={(checked) =>
      setFormData({...formData, send_notification: checked as boolean})
    }
    disabled={formData.status !== 'published'}
  />
  <div className="flex-1">
    <Label htmlFor="send-notification">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-blue-600" />
        <span>Send email notification to all distributors</span>
      </div>
    </Label>
    <p className="text-xs text-slate-500 mt-1">
      {formData.status !== 'published'
        ? 'Only available when status is "Published"'
        : 'Distributors will receive an email about this announcement'}
    </p>
  </div>
</div>
```

**b) Notification Trigger Logic**

After successful save (create or update):

```typescript
// Send email notification if checkbox is checked and status is published
if (formData.send_notification && formData.status === 'published') {
  try {
    await sendAnnouncementNotification(newAnnouncement.id);
    toast.success('Announcement created and notifications sent!');
  } catch (notificationError) {
    console.error('Error sending notification:', notificationError);
    toast.warning('Announcement created but failed to send email notifications');
  }
} else {
  toast.success('Announcement created successfully');
}
```

**c) Form State Management**

```typescript
const [formData, setFormData] = useState<CreateAnnouncementInput>({
  // ... other fields
  send_notification: false,
});
```

---

## User Experience

### Admin Flow

1. **Create/Edit Announcement**
   - Fill in announcement details (title, content, category, etc.)
   - Select Status dropdown

2. **Conditional Checkbox Enabling**
   - If Status = "Draft" → Checkbox is **disabled** (grayed out)
   - If Status = "Archived" → Checkbox is **disabled**
   - If Status = "Published" → Checkbox is **enabled** ✅

3. **Send Notification**
   - Check the "Send email notification" checkbox
   - Click "Create Announcement" or "Update Announcement"

4. **Success Messages**
   - ✅ **With notifications:** "Announcement created and notifications sent!"
   - ✅ **Without notifications:** "Announcement created successfully"
   - ⚠️ **Partial failure:** "Announcement created but failed to send email notifications"

---

## Email Template

Distributors receive emails with:

- **Subject:** New Announcement: {announcement.title}
- **Content:**
  - Announcement category badge
  - Full announcement content
  - Call-to-action link (if provided)
  - "View in Portal" button

Example:

```
Subject: New Announcement: New Product Launch - Visum Pro Series

Hi [Distributor Name],

A new announcement has been published:

[New Product]
New Product Launch: Visum Pro Series

We are excited to announce the launch of our new Visum Pro Series...

[Learn More Button] (if link_url provided)

[View in Portal]

Best regards,
Visum Team
```

---

## Validation & Edge Cases

### 1. Checkbox is Disabled for Drafts
**Why:** Prevents sending notifications for unpublished content
**UX:** Checkbox shows disabled state with helper text

### 2. Notification Fails, Announcement Succeeds
**Why:** Network issues or email service downtime
**Handling:**
- Announcement is still saved ✅
- Warning toast shown to admin ⚠️
- Error logged to console for debugging

### 3. Updating Existing Announcement
**Behavior:**
- Checkbox resets to unchecked when editing
- Admin must explicitly check to resend notifications
- Prevents accidental spam to distributors

### 4. Publishing Draft with Checkbox
**Scenario:** Admin creates draft, later publishes with checkbox checked
**Result:** Notifications sent when changing status to "Published" AND checkbox is checked

---

## Testing Guide

### Test 1: Create Published Announcement with Notification

1. Login as admin
2. Go to Announcements Management
3. Click "Create Announcement"
4. Fill in:
   - Category: "New Product"
   - Status: **"Published"**
   - Title (EN): "System Update Notification Test"
   - Content (EN): "This is a test notification"
5. Check the "Send email notification" checkbox
6. Click "Create Announcement"

**Expected:**
- ✅ Announcement saves
- ✅ Toast: "Announcement created and notifications sent!"
- ✅ All distributors receive email

---

### Test 2: Create Draft (Checkbox Disabled)

1. Create announcement with Status: **"Draft"**
2. Observe checkbox

**Expected:**
- ❌ Checkbox is disabled (grayed out)
- ℹ️ Helper text: "Only available when status is Published"
- ✅ Cannot check the box

---

### Test 3: Change Draft to Published

1. Create draft announcement (checkbox disabled)
2. Edit the announcement
3. Change Status to **"Published"**
4. Check notification checkbox
5. Save

**Expected:**
- ✅ Checkbox becomes enabled when status changes
- ✅ Notifications sent on save

---

### Test 4: Edit Existing Published Announcement

1. Edit a published announcement
2. Check notification checkbox
3. Save

**Expected:**
- ✅ Notifications resent to all distributors
- ✅ Toast: "Announcement updated and notifications sent!"

---

### Test 5: Notification Failure Handling

**Simulate by:**
- Temporarily disabling Edge Function
- Or using invalid Resend API key

**Expected:**
- ✅ Announcement still saves
- ⚠️ Toast: "Announcement created but failed to send email notifications"
- ❌ No emails sent

---

## Debugging

### Check if Notifications Were Sent

**Console Logs:**
```javascript
// Success
console.log('Notifications sent successfully')

// Failure
console.error('Error sending notification:', notificationError)
```

**Edge Function Logs:**
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select `send-announcement-notification`
4. View logs for execution details

### Common Issues

#### Issue 1: Checkbox Always Disabled
**Cause:** Status not set to "Published"
**Fix:** Select "Published" from Status dropdown

#### Issue 2: Notifications Not Received
**Possible Causes:**
- Edge Function not deployed
- Resend API key missing/invalid
- Distributor email not in `user_profiles`
- Email caught in spam filter

**Debug:**
- Check Edge Function logs in Supabase
- Verify distributor emails exist: `SELECT email FROM user_profiles WHERE role = 'distributor'`
- Check Resend dashboard for delivery status

#### Issue 3: Toast Shows Warning
**Cause:** Announcement saved but notification failed
**Check:**
- Browser console for error details
- Edge Function logs
- Resend API status

---

## Configuration

### Environment Variables Required

**Frontend (.env):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Edge Function (Supabase Secrets):**
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

## Future Enhancements

### Possible Improvements:

1. **Email Preview**
   - Show admin what email will look like before sending

2. **Scheduled Notifications**
   - Send at specific date/time instead of immediately

3. **Targeted Notifications**
   - Send only to selected distributors (integrate with DistributorSelector)

4. **Notification History**
   - Track who received emails and when
   - Resend to specific users who didn't receive

5. **Email Templates**
   - Multiple email template options
   - Customizable branding

6. **Read Receipts**
   - Track which distributors opened the email
   - Track link clicks

---

## Summary

Email notifications are now fully integrated:

✅ Checkbox in create/edit forms
✅ Conditional enabling (only for "Published" status)
✅ Edge Function integration
✅ Error handling with graceful degradation
✅ User-friendly toast messages
✅ Build passes with no errors

**Ready for production deployment!**
