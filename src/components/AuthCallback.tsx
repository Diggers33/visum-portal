import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const type = searchParams.get('type');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = hashParams.get('code') || searchParams.get('code');

        console.log('🔐 Auth callback started:', { type, hasCode: !!code });

        // Handle invitation callbacks
        if (type === 'invite') {
          setStatus('Processing invitation...');
          console.log('📧 Invitation callback detected');

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;

            if (data.session) {
              console.log('✅ Invitation session established');
              navigate('/set-password');
              return;
            }
          }

          navigate('/set-password');
          return;
        }

        // Handle OAuth callbacks (Google, Microsoft, etc.)
        if (code) {
          setStatus('Verifying account access...');
          console.log('🔑 OAuth callback - exchanging code for session');

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('❌ Code exchange failed:', error);
            throw new Error('Failed to authenticate. Please try again.');
          }

          if (data.session) {
            const user = data.session.user;
            console.log('👤 OAuth user authenticated:', {
              id: user.id,
              email: user.email,
              provider: user.app_metadata?.provider
            });

            // SECURITY CHECK: Verify user has a profile in user_profiles
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, role, status, full_name')
              .eq('id', user.id)
              .single();

            if (profileError || !profile) {
              console.error('🚫 SECURITY BLOCK: User has no profile', {
                userId: user.id,
                email: user.email,
                provider: user.app_metadata?.provider,
                error: profileError
              });

              // Sign out the unauthorized user immediately
              await supabase.auth.signOut();

              toast.error('Access Denied', {
                description: 'Your account is not authorized. Please contact your administrator for access.',
              });

              setError('Access Denied: This account is not authorized to access the platform. Only admin-invited users can sign in.');

              setTimeout(() => {
                navigate('/login');
              }, 4000);
              return;
            }

            // Check if profile status is active
            if (profile.status !== 'active') {
              console.error('🚫 SECURITY BLOCK: User profile not active', {
                userId: user.id,
                email: user.email,
                status: profile.status,
                role: profile.role
              });

              // Sign out the user with inactive status
              await supabase.auth.signOut();

              toast.error('Account Inactive', {
                description: 'Your account is not active. Please contact your administrator.',
              });

              setError(`Account ${profile.status}: Your account is not currently active. Please contact your administrator for assistance.`);

              setTimeout(() => {
                navigate('/login');
              }, 4000);
              return;
            }

            // Success! User has active profile
            console.log('✅ SECURITY CHECK PASSED:', {
              userId: user.id,
              email: user.email,
              role: profile.role,
              status: profile.status,
              name: profile.full_name
            });

            toast.success(`Welcome back, ${profile.full_name || user.email}!`);
            setStatus('Access granted! Redirecting...');

            // Redirect based on role
            setTimeout(() => {
              if (profile.role === 'admin') {
                navigate('/admin/dashboard');
              } else {
                navigate('/portal');
              }
            }, 1000);
            return;
          }
        }

        // Fallback: Try to get existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          console.error('❌ No session found:', sessionError);
          throw new Error('No valid session found. Please log in again.');
        }

        console.log('ℹ️ Using existing session');
        const user = sessionData.session.user;

        // SECURITY CHECK for existing sessions too
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, role, status, full_name')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('🚫 SECURITY BLOCK: No profile for existing session', {
            userId: user.id,
            email: user.email
          });

          await supabase.auth.signOut();
          toast.error('Access Denied');
          setError('Your account is not authorized to access this platform.');

          setTimeout(() => navigate('/login'), 4000);
          return;
        }

        if (profile.status !== 'active') {
          console.error('🚫 SECURITY BLOCK: Inactive profile for existing session');
          await supabase.auth.signOut();
          toast.error('Account Inactive');
          setError('Your account is not currently active.');

          setTimeout(() => navigate('/login'), 4000);
          return;
        }

        // Redirect based on role
        if (profile.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/portal');
        }

      } catch (error: any) {
        console.error('❌ Auth callback error:', error);
        setError(error.message || 'An error occurred during authentication');

        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {error ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Access Denied
                </h2>
                <p className="text-slate-600 mb-4">{error}</p>
                <p className="text-sm text-slate-500">
                  Redirecting to login page...
                </p>
              </>
            ) : (
              <>
                <Loader2 className="w-16 h-16 text-[#00a8b5] animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {status}
                </h2>
                <p className="text-slate-600">
                  Please wait while we verify your access...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
