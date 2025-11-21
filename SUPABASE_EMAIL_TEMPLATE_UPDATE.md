# Supabase Email Template Update Guide

## CRITICAL: Update Password Reset Email Template

The distributor invitation system now uses Supabase's password reset flow instead of the invitation flow. You MUST update the email template in Supabase Dashboard.

---

## Steps to Update Email Template

### 1. Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: **visum-portal**
3. Navigate to: **Authentication** → **Email Templates**

### 2. Select "Reset Password" Template

1. Click on "**Reset Password**" template in the list
2. This is the template used when distributors are invited

### 3. Update Email Sender

**Current:** Sender shows as "Colm Digby" or default

**Change to:**
- **Sender name:** IRIS Technology Solutions
- **Sender email:** info@iris-eng.com

**How to configure:**
- In Supabase Dashboard: **Project Settings** → **Auth** → **SMTP Settings**
- Or use Supabase's built-in email with custom reply-to

### 4. Update Email Subject

**Change to:**
```
Welcome to Visum® Distributor Portal
```

### 5. Update Email Body

Replace the existing template with:

```html
<h2>Welcome to Visum® Distributor Portal</h2>

<p>{{ .Data.full_name }},</p>

<p>You've been invited to join the <strong>Visum® – IRIS Technology Solutions Distributor Portal</strong>.</p>

<p>Click the button below to accept your invitation and set up your account:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="background-color: #00a8b5;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            font-weight: 600;">
    Accept Invitation
  </a>
</p>

<p style="color: #666; font-size: 14px;">
  This link will expire in 24 hours.
</p>

<p style="color: #666; font-size: 14px;">
  If you didn't expect this email, you can safely ignore it.
</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

<p style="color: #999; font-size: 12px;">
  IRIS Technology Solutions<br>
  Visum® Distributor Portal
</p>
```

### 6. Available Template Variables

Supabase provides these variables:

- `{{ .Email }}` - Distributor's email address
- `{{ .ConfirmationURL }}` - Password reset link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Data.full_name }}` - Custom: Distributor's full name (passed in user_metadata)
- `{{ .Data.company_name }}` - Custom: Company name
- `{{ .Data.territory }}` - Custom: Territory

### 7. Test the Email

After updating:

1. Create a test distributor in admin panel
2. Check email sent to test address
3. Verify:
   - ✅ Sender shows "info@iris-eng.com"
   - ✅ Subject is correct
   - ✅ Name is personalized
   - ✅ Link works and redirects to /reset-password
   - ✅ Password can be set successfully

---

## Alternative: SMTP Configuration

If you want full control over sender email:

### Option A: Use Gmail SMTP

**Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: info@iris-eng.com
SMTP Password: [App Password]
Sender Email: info@iris-eng.com
Sender Name: IRIS Technology Solutions
```

**Gmail Setup:**
1. Go to Google Account settings
2. Enable 2-factor authentication
3. Generate App Password for "Mail"
4. Use that password in Supabase

### Option B: Use Custom SMTP Server

If you have your own mail server:

```
SMTP Host: mail.iris-eng.com
SMTP Port: 587 (or 465 for SSL)
SMTP User: info@iris-eng.com
SMTP Password: [Your password]
```

---

## Troubleshooting

### Email not received

1. Check **Supabase Dashboard** → **Authentication** → **Logs**
2. Look for email send events
3. Check spam folder
4. Verify SMTP configuration

### Wrong sender email

1. SMTP settings override template settings
2. Check **Project Settings** → **Auth** → **SMTP Settings**
3. If using Supabase's built-in email, sender is noreply@mail.app.supabase.co

### Link doesn't work

1. Verify redirect URL: `${window.location.origin}/reset-password`
2. Check that `/reset-password` route exists in App.tsx
3. Make sure ResetPassword component verifies token correctly

### Name not showing (shows {{ .Data.full_name }} literally)

1. Check that `user_metadata` is being set in createUser call (already fixed in code)
2. Template syntax might be different - try `{{.Data.full_name}}` (no spaces)

---

## Testing Checklist

Before going live:

- [ ] Email sender shows "info@iris-eng.com"
- [ ] Email subject is "Welcome to Visum® Distributor Portal"
- [ ] Distributor's name is personalized
- [ ] "Accept Invitation" button is visible
- [ ] Link redirects to `/reset-password`
- [ ] Password can be set successfully
- [ ] After setting password, login works
- [ ] Distributor sees correct dashboard after login

---

## Current Implementation

The code now:

1. ✅ Creates auth user with `email_confirm: true`
2. ✅ Sets user_metadata with full_name, company_name, territory
3. ✅ Sends password reset email (not invitation)
4. ✅ Has rollback on failure
5. ✅ Enhanced error logging

**Files Modified:**
- `src/lib/api/distributors.ts` (lines 134-182, 313-349)

**Next Steps:**
1. Update email template in Supabase Dashboard (THIS GUIDE)
2. Test complete flow
3. Deploy to production
