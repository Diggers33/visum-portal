import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid recovery token
    const checkToken = async () => {
      console.log('🔍 Checking reset token validity...');

      try {
        // Check for token_hash in URL - try BOTH query params AND hash
        // Query params: ?token_hash=xyz&type=recovery (from InvitationRedirect)
        // Hash params: #token_hash=xyz&type=recovery (direct Supabase link)
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const token_hash = queryParams.get('token_hash') || hashParams.get('token_hash');
        const type = queryParams.get('type') || hashParams.get('type');
        const access_token = queryParams.get('access_token') || hashParams.get('access_token');
        const refresh_token = queryParams.get('refresh_token') || hashParams.get('refresh_token');

        console.log('🔗 URL params:', {
          hasTokenHash: !!token_hash,
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          type,
          source: queryParams.has('token_hash') ? 'query' : hashParams.has('token_hash') ? 'hash' : 'none',
          fullSearch: window.location.search,
          fullHash: window.location.hash
        });

        // If we have OAuth tokens (access_token + refresh_token), set the session directly
        if (access_token && refresh_token) {
          console.log('🔑 Setting session with OAuth tokens...');

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (sessionError) {
            console.error('❌ Session setup failed:', sessionError);
            setError('Invalid or expired reset link. Please request a new one.');
            return;
          }

          if (data.session) {
            console.log('✅ Session established successfully:', {
              userId: data.session.user?.id,
              email: data.session.user?.email,
              expiresAt: data.session.expires_at
            });
            setValidToken(true);
            return;
          }
        }

        // If we have a token_hash for recovery, verify it explicitly
        if (token_hash && type === 'recovery') {
          console.log('🔑 Verifying recovery token...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery',
          });

          if (verifyError) {
            console.error('❌ Token verification failed:', verifyError);
            setError('Invalid or expired reset link. Please request a new one.');
            return;
          }

          if (data.session) {
            console.log('✅ Recovery token verified successfully:', {
              userId: data.session.user?.id,
              email: data.session.user?.email,
              expiresAt: data.session.expires_at
            });
            setValidToken(true);
            return;
          }
        }

        // Fallback: Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new one.');
          return;
        }

        if (session) {
          console.log('✅ Valid session found:', {
            userId: session.user?.id,
            email: session.user?.email,
            expiresAt: session.expires_at
          });
          setValidToken(true);
        } else {
          console.warn('⚠️ No session or token found - reset link may be expired');
          setError('Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        console.error('❌ Token check error:', err);
        setError('An error occurred. Please request a new reset link.');
      }
    };

    checkToken();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting to update password...');
      console.log('📋 Current session before update:', await supabase.auth.getSession());

      // Update password - this updates auth.users table
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('❌ Password update failed:', updateError);
        throw updateError;
      }

      if (!data.user) {
        console.error('❌ No user data returned from password update');
        throw new Error('Password update did not return user data');
      }

      console.log('✅ Password updated successfully:', {
        userId: data.user.id,
        email: data.user.email,
        updatedAt: data.user.updated_at,
        timestamp: new Date().toISOString()
      });

      // CRITICAL: Update status to 'active' for pending users
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('status, role')
        .eq('id', data.user.id)
        .single();

      if (profile?.status === 'pending') {
        console.log('✅ Activating pending user account...');
        const { error: activateError } = await supabase
          .from('user_profiles')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);

        if (activateError) {
          console.error('⚠️ Failed to activate account:', activateError);
          // Don't fail the operation - password was set successfully
        } else {
          console.log('✅ Account activated successfully');
        }
      }

      // Wait a moment for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // CRITICAL: Sign out user to clear recovery session
      console.log('🚪 Signing out user to commit password change...');
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('❌ Sign out failed:', signOutError);
        // Still continue - password was updated
      } else {
        console.log('✅ User signed out successfully');
      }

      // Verify we're signed out
      const { data: { session: checkSession } } = await supabase.auth.getSession();
      console.log('🔍 Session after sign out:', checkSession ? 'Still exists (ERROR)' : 'Cleared (GOOD)');

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        console.log('🔄 Redirecting to login page...');
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('❌ Password update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link to="/forgot-password">
              <Button
                className="bg-[#00a8b5] hover:bg-[#008a95] rounded-lg"
                style={{ boxShadow: '0 2px 8px rgba(0,168,181,0.2)' }}
              >
                Request new reset link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Password updated!</h2>
            <p className="text-slate-600 mb-6">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#00a8b5]/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#00a8b5]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Set new password</h2>
          <p className="text-slate-600">
            Please enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="font-medium">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-11 rounded-lg border-slate-300 focus:border-[#00a8b5] focus:ring-2 focus:ring-[#00a8b5]/20 transition-all duration-200 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-medium">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-11 rounded-lg border-slate-300 focus:border-[#00a8b5] focus:ring-2 focus:ring-[#00a8b5]/20 transition-all duration-200 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !validToken}
            className="w-full h-11 bg-[#00a8b5] hover:bg-[#008a95] rounded-lg transition-all duration-200"
            style={{ boxShadow: '0 2px 8px rgba(0,168,181,0.2)' }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
