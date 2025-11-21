# Invitation Redirect Setup Guide

## Overview
The invitation redirect tracking endpoint has been successfully implemented and deployed. This feature allows tracking email invitation clicks while preserving Supabase authentication tokens that SendGrid's click tracking would otherwise strip.

## What's Been Completed ✅

### Frontend Changes (Already Deployed)
1. **InvitationRedirect.tsx** - New page component at `/invitation-redirect`
   - Extracts parameters: `target`, `distributor_id`, `token_hash`, `type`
   - Logs invitation clicks with timestamp and user agent
   - Redirects to password setup page with tokens intact

2. **App.tsx** - Route added
   - Route: `/invitation-redirect`
   - Publicly accessible (no authentication required)

3. **Git commits pushed:**
   - `db52269` - Add invitation redirect tracking endpoint
   - `df4ec89` - Update InvitationRedirect to handle token in query params

## What Needs to Be Done Manually 🔧

### Update Supabase Edge Functions

You need to update TWO edge functions in your Supabase Dashboard to use the redirect URL pattern:

1. **create-distributor**
2. **resend-invitation**

---

## Edge Function Updates

### 1. Update: `create-distributor`

**Location in Supabase Dashboard:**
Supabase Dashboard → Edge Functions → `create-distributor` → `index.ts`

**Find this section** (around line 150-160):
```typescript
// Send password reset email (welcome email)
const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
  normalizedEmail,
  {
    redirectTo: 'YOUR_CURRENT_URL_HERE'
  }
);
```

**Replace with:**
```typescript
// Build redirect URL that tracks clicks while preserving token
const origin = req.headers.get('origin') || 'https://visum-portal.vercel.app';
const redirectUrl = `${origin}/invitation-redirect?target=/reset-password&distributor_id=${userId}`;

console.log('📧 Sending welcome email with redirect URL:', redirectUrl);

// Send password reset email (welcome email)
const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
  normalizedEmail,
  {
    redirectTo: redirectUrl
  }
);
```

---

### 2. Update: `resend-invitation`

**Location in Supabase Dashboard:**
Supabase Dashboard → Edge Functions → `resend-invitation` → `index.ts`

**Find this section** (around line 100-110):
```typescript
// Send the email with proper redirect
const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(
  distributor.email,
  {
    redirectTo: 'YOUR_CURRENT_URL_HERE'
  }
);
```

**Replace with:**
```typescript
// Build redirect URL that tracks clicks while preserving token
const origin = req.headers.get('origin') || 'https://visum-portal.vercel.app';
const redirectUrl = `${origin}/invitation-redirect?target=/reset-password&distributor_id=${id}`;

console.log('📧 Resending invitation email with redirect URL:', redirectUrl);

// Send the email with proper redirect
const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(
  distributor.email,
  {
    redirectTo: redirectUrl
  }
);
```

---

## How It Works 🔄

### URL Flow:

1. **Admin creates/resends invitation** → Edge function generates URL:
   ```
   https://visum-portal.vercel.app/invitation-redirect?target=/reset-password&distributor_id=abc-123
   ```

2. **Supabase adds auth tokens** to the URL (when user clicks):
   ```
   https://visum-portal.vercel.app/invitation-redirect?target=/reset-password&distributor_id=abc-123&token_hash=xyz&type=recovery
   ```

3. **SendGrid tracks the click** (because URL goes through SendGrid's tracking domain)

4. **InvitationRedirect page:**
   - Logs the click with distributor_id, timestamp, user agent
   - Rebuilds final URL: `/reset-password?token_hash=xyz&type=recovery`
   - Redirects user to password setup page

5. **User sets password** → Account activated → Success!

---

## Testing the Complete Flow ✅

After updating both edge functions:

1. **Create a new distributor**
   - Go to Admin Dashboard → Distributors → Create New
   - Fill in details and check "Send welcome email"
   - Click "Create Distributor"

2. **Check the email link format**
   - Open the email received
   - Right-click the "Set Your Password" button → Copy link
   - Verify it contains `/invitation-redirect?target=/reset-password&distributor_id=`

3. **Click the link**
   - Open the link in browser
   - Should briefly show "Processing your invitation..."
   - Should redirect to password setup page
   - URL should contain `token_hash` and `type` parameters

4. **Set password**
   - Enter new password meeting requirements
   - Click "Update password"
   - Should see success message
   - Should redirect to login page

5. **Login**
   - Use the email and new password
   - Should successfully log in and see distributor portal

---

## Analytics (Optional Future Enhancement) 📊

The frontend logs invitation clicks to console. To persist this data:

### Create Analytics Endpoint

Add this to your Supabase Edge Functions as `track-invitation-click/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { distributorId, timestamp, userAgent, target } = await req.json();

    // Insert click tracking data
    const { error } = await supabaseAdmin
      .from('invitation_clicks')
      .insert({
        distributor_id: distributorId,
        clicked_at: timestamp,
        user_agent: userAgent,
        target_page: target
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
```

### Create Database Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create invitation clicks tracking table
CREATE TABLE IF NOT EXISTS invitation_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  target_page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_invitation_clicks_distributor ON invitation_clicks(distributor_id);
CREATE INDEX idx_invitation_clicks_date ON invitation_clicks(clicked_at DESC);

-- Enable RLS
ALTER TABLE invitation_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all clicks
CREATE POLICY "Admins can view invitation clicks"
  ON invitation_clicks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.status = 'active'
    )
  );
```

### Update Frontend (Optional)

Uncomment lines 40-55 in `InvitationRedirect.tsx` to enable backend logging:

```typescript
try {
  await fetch('/api/track-invitation-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      distributorId,
      timestamp: new Date().toISOString(),
      target
    })
  });
} catch (err) {
  console.warn('⚠️ Failed to log click to backend:', err);
  // Don't block the redirect if logging fails
}
```

---

## Troubleshooting 🔧

### Issue: "Invalid invitation link"
**Cause:** Edge functions not updated to use redirect URL
**Fix:** Verify both `create-distributor` and `resend-invitation` use the redirect URL pattern

### Issue: User still signed out after clicking link
**Cause:** Global auth listeners blocking pending users
**Fix:** Already fixed in `App.tsx` (commit `c1ae35d`)

### Issue: SendGrid not tracking clicks
**Cause:** SendGrid click tracking disabled
**Fix:** Enable click tracking in SendGrid Dashboard → Settings → Tracking

### Issue: Token not preserved in URL
**Cause:** InvitationRedirect not extracting token correctly
**Fix:** Already fixed in commit `df4ec89` - verify deployed version

---

## Summary

**Frontend:** ✅ Complete and deployed
**Edge Functions:** ⏳ Needs manual update in Supabase Dashboard
**Analytics:** 📊 Optional (instructions provided above)

Once you update the two edge functions in Supabase Dashboard, the complete invitation flow with click tracking will be operational.
