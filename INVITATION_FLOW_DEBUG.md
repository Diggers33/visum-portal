# Invitation Flow Debugging Guide

## Recent Fixes Applied ✅

### 1. InvitationRedirect Token Preservation (Commit: 72cc39f)
- **Issue**: Hash tokens were being lost during redirect
- **Fix**: Extract tokens from hash fragments and convert to query parameters
- **Result**: Tokens now preserved through redirect

### 2. ResetPassword Token Handling (Commit: 1d40ef4)
- **Issue**: Component required BOTH access_token AND refresh_token
- **Fix**: Only require access_token, make refresh_token optional
- **Result**: Session can now be established with tokens from query params

## Complete Invitation Flow 🔄

### Step-by-Step Process:

```
1. Admin creates distributor
   ↓
2. Edge function calls resetPasswordForEmail()
   → Generates: /invitation-redirect?target=/reset-password&distributor_id=123
   ↓
3. Supabase appends hash tokens
   → Result: /invitation-redirect?...#access_token=xyz&refresh_token=abc&type=recovery
   ↓
4. User clicks email link
   ↓
5. InvitationRedirect page loads
   → Extracts tokens from hash: #access_token=xyz
   → Converts to query: ?access_token=xyz&refresh_token=abc&type=recovery
   → Logs click tracking data
   → Redirects: /reset-password?access_token=xyz&refresh_token=abc&type=recovery
   ↓
6. ResetPassword page loads
   → Shows "Verifying Link..." spinner
   → Extracts tokens from query params
   → Calls: supabase.auth.setSession({ access_token, refresh_token })
   → Validates session exists
   → Sets validToken = true
   → Shows password form
   ↓
7. User enters new password
   → Calls: supabase.auth.updateUser({ password })
   → Updates status: 'pending' → 'active'
   → Signs out user
   → Redirects to login
   ↓
8. User logs in with new password
   → Success!
```

## Browser Console Debugging 🔍

### Expected Console Output:

**On InvitationRedirect page:**
```
🔍 URL Analysis: {
  queryParams: "?target=/reset-password&distributor_id=abc-123",
  hashParams: "#access_token=xyz&refresh_token=abc&type=recovery",
  target: "/reset-password",
  distributorId: "abc-123",
  hasAccessToken: true,
  hasRefreshToken: true,
  hasTokenHash: false,
  type: "recovery"
}

📧 Invitation click tracked: {
  distributorId: "abc-123",
  timestamp: "2025-11-21T10:30:00.000Z",
  userAgent: "Mozilla/5.0...",
  target: "/reset-password",
  hasToken: true
}

✅ Added access_token to final URL
✅ Added refresh_token to final URL
✅ Added type to final URL

🔄 Redirecting to: /reset-password?access_token=xyz&refresh_token=abc&type=recovery
```

**On ResetPassword page:**
```
🔍 Checking reset token validity...

🔗 URL params: {
  hasTokenHash: false,
  hasAccessToken: true,
  hasRefreshToken: true,
  type: "recovery",
  source: "query",
  fullSearch: "?access_token=xyz&refresh_token=abc&type=recovery",
  fullHash: ""
}

🔑 Found access_token - attempting to set session...

🔑 Setting session with OAuth tokens... {
  hasAccessToken: true,
  hasRefreshToken: true,
  type: "recovery"
}

✅ Session established successfully: {
  userId: "abc-123-def-456",
  email: "user@example.com",
  expiresAt: 1700000000
}
```

## Troubleshooting Common Issues 🔧

### Issue 1: "Invalid Link" Error

**Symptoms:**
- Console shows: `❌ Session setup failed`
- User sees "Invalid Link" page

**Debug Steps:**
1. Check console for URL params log
2. Verify `hasAccessToken: true`
3. Check if `type: "recovery"` is present
4. Look for error message from `setSession()`

**Common Causes:**
- Tokens expired (links expire after 1 hour)
- Wrong type parameter (must be "recovery")
- Supabase URL/keys misconfigured

**Fix:**
- Request new invitation link
- Check Supabase environment variables
- Verify edge functions are using correct redirect URL

---

### Issue 2: Tokens Not in URL

**Symptoms:**
- Console shows: `hasAccessToken: false`
- No tokens in URL at all

**Debug Steps:**
1. Check if InvitationRedirect received tokens in hash
2. Verify Supabase edge functions are updated
3. Check if SendGrid is stripping parameters

**Common Causes:**
- Edge functions not updated with redirect URL pattern
- Supabase not appending tokens (configuration issue)

**Fix:**
1. Update edge functions in Supabase Dashboard (see INVITATION_REDIRECT_SETUP.md)
2. Verify `resetPasswordForEmail()` is being called
3. Test with direct Supabase link (bypass SendGrid)

---

### Issue 3: Session Established But Still Shows "Invalid Link"

**Symptoms:**
- Console shows: `✅ Session established successfully`
- But user still sees "Invalid Link" page

**Debug Steps:**
1. Check if `setValidToken(true)` was called
2. Verify no error was set after successful session
3. Check component render conditions

**Common Causes:**
- Component state not updating
- Error set after successful token validation

**Fix:**
- Check for any code after `setValidToken(true)` that might set error
- Verify `return` statement after successful validation

---

### Issue 4: Tokens Lost During Redirect

**Symptoms:**
- InvitationRedirect logs show tokens
- ResetPassword shows no tokens

**Debug Steps:**
1. Copy final redirect URL from InvitationRedirect console
2. Check if tokens are in the copied URL
3. Compare to URL shown in ResetPassword console

**Common Causes:**
- Browser security policy stripping query params
- Navigation using wrong method

**Fix:**
- Verify using `window.location.href = finalUrl.toString()`
- Not using React Router navigate() for external redirect

---

## Manual Testing Checklist ✅

### Test 1: New Distributor Invitation
- [ ] Admin creates distributor with "Send welcome email" checked
- [ ] Email arrives with correct sender and subject
- [ ] Click "Set Your Password" button
- [ ] InvitationRedirect page shows briefly
- [ ] ResetPassword page shows "Verifying Link..." spinner
- [ ] Password form appears (not "Invalid Link" error)
- [ ] Password requirements visible
- [ ] Can enter and confirm password
- [ ] Success message appears
- [ ] Redirects to login after 2 seconds
- [ ] Can log in with new credentials
- [ ] Distributor portal loads successfully
- [ ] User status in database is 'active'

### Test 2: Resend Invitation
- [ ] Admin finds pending distributor
- [ ] Clicks "Resend Invitation" action
- [ ] New email arrives
- [ ] Click link in new email
- [ ] Same flow as Test 1 succeeds

### Test 3: Direct Reset Password (Not Invitation)
- [ ] Go to /forgot-password page
- [ ] Enter email and submit
- [ ] Email arrives
- [ ] Click reset link
- [ ] Password form appears
- [ ] Can reset password successfully
- [ ] Can log in with new password

### Test 4: Expired Link
- [ ] Wait 1+ hour after receiving invitation
- [ ] Click invitation link
- [ ] Should show "Invalid or expired reset link" error
- [ ] "Request new reset link" button works

### Test 5: Console Logging
- [ ] Open browser console (F12)
- [ ] Click invitation link
- [ ] Verify all expected console logs appear
- [ ] No error messages in console
- [ ] Token values are present (but don't log full tokens in production!)

---

## Production Readiness Checklist 🚀

Before deploying to production, ensure:

- [ ] All 5 manual tests pass
- [ ] Edge functions updated in Supabase Dashboard
- [ ] Environment variables set correctly in Vercel
- [ ] Supabase URL and keys configured
- [ ] SendGrid click tracking enabled (optional)
- [ ] Email templates look professional
- [ ] Test with multiple email providers (Gmail, Outlook, etc.)
- [ ] Test on mobile devices
- [ ] Console logging is not exposing sensitive data
- [ ] Error messages are user-friendly
- [ ] Success messages are clear
- [ ] Redirect timing is appropriate (2 seconds)

---

## Quick Debug Commands

### Check Current Deployment
```bash
git log --oneline -5
```

### View Environment Variables (Vercel)
```bash
vercel env pull
```

### Test Supabase Connection (Browser Console)
```javascript
// On any page of the app
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### Manually Test Token Extraction (Browser Console)
```javascript
// On InvitationRedirect page
const hashParams = new URLSearchParams(window.location.hash.substring(1));
console.log({
  access_token: hashParams.get('access_token'),
  refresh_token: hashParams.get('refresh_token'),
  type: hashParams.get('type')
});
```

### Check Supabase Session (Browser Console)
```javascript
// On any authenticated page
const { supabase } = await import('./lib/supabase');
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('User:', data.session?.user);
```

---

## Next Steps After Successful Testing

1. **Update Edge Functions** (if not done already)
   - Follow instructions in `INVITATION_REDIRECT_SETUP.md`
   - Update both `create-distributor` and `resend-invitation`

2. **Remove Debug Logging** (optional for production)
   - Comment out verbose console.log statements
   - Keep error logging for monitoring

3. **Add Analytics** (optional)
   - Implement backend click tracking
   - Create database table for invitation_clicks
   - Uncomment analytics code in InvitationRedirect.tsx

4. **Monitor Initial Production Use**
   - Watch for any user-reported issues
   - Check Vercel logs for errors
   - Monitor Supabase logs
   - Test with real user accounts

5. **Documentation**
   - Share invitation flow with team
   - Document known issues and workarounds
   - Create user guide for admins

---

## Support

If issues persist after following this guide:
1. Check all console logs and include in bug report
2. Verify environment variables are set correctly
3. Test with a fresh incognito browser window
4. Check Supabase and Vercel logs for server errors
5. Verify edge functions are deployed and using correct code
