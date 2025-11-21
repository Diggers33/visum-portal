import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const type = searchParams.get('type');
        const token_hash = searchParams.get('token_hash');
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');

        // Get the full URL hash (Supabase may use hash fragments)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');

        console.log('Auth callback:', {
          type,
          hasTokenHash: !!token_hash,
          hasAccessToken: !!access_token,
          hasHashTokens: !!(hashAccessToken && hashRefreshToken)
        });

        // Handle invitation acceptance
        if (type === 'invite') {
          setStatus('Validating invitation...');

          // Method 1: Supabase v2 - token_hash in query params
          if (token_hash) {
            console.log('Using token_hash method');
            const { error } = await supabase.auth.verifyOtp({
              token_hash,
              type: 'invite',
            });

            if (error) {
              throw error;
            }
          }
          // Method 2: Access token in URL hash (modern Supabase)
          else if (hashAccessToken && hashRefreshToken) {
            console.log('Using hash token method');
            const { error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });

            if (error) {
              throw error;
            }
          }
          // Method 3: Access token in query params
          else if (access_token && refresh_token) {
            console.log('Using query token method');
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              throw error;
            }
          }
          // Method 4: Let Supabase handle it automatically (PKC flow)
          else {
            console.log('Attempting automatic session detection');
            // Supabase may have already set the session via PKCE
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
              throw new Error('No valid authentication tokens found. The invitation link may have expired or is invalid.');
            }
            
            console.log('Session found automatically');
          }

          setStatus('Invitation accepted! Redirecting...');

          // Verify user is authenticated
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            throw new Error('Failed to authenticate user after token validation');
          }

          console.log('User authenticated:', user.id);

          // Redirect to set password page
          setTimeout(() => {
            navigate('/auth/set-password');
          }, 1000);
        }
        // Handle password reset
        else if (type === 'recovery') {
          setStatus('Password reset link validated...');
          
          if (token_hash) {
            const { error } = await supabase.auth.verifyOtp({
              token_hash,
              type: 'recovery',
            });

            if (error) throw error;
          }

          setTimeout(() => {
            navigate('/auth/reset-password');
          }, 1000);
        }
        // Handle email confirmation
        else if (type === 'signup') {
          setStatus('Confirming email...');
          
          if (token_hash) {
            const { error } = await supabase.auth.verifyOtp({
              token_hash,
              type: 'signup',
            });

            if (error) throw error;
          }

          setTimeout(() => {
            navigate('/login');
          }, 1000);
        }
        // Handle OAuth callback (Google, Microsoft, etc.)
        else if (!type) {
          console.log('🔐 OAuth callback detected - checking session...');
          setStatus('Verifying account access...');

          // Get the current session (OAuth should have already set it)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !session) {
            console.error('❌ OAuth session error:', sessionError);
            throw new Error('Failed to establish authenticated session');
          }

          const user = session.user;
          console.log('👤 OAuth user authenticated:', {
            id: user.id,
            email: user.email,
            provider: user.app_metadata?.provider
          });

          // SECURITY CHECK: Check BOTH admin_users and user_profiles tables
          console.log('🔍 Checking both admin_users and user_profiles tables...');

          // Check admin_users table first
          const { data: adminUser, error: adminError } = await supabase
            .from('admin_users')
            .select('id, role, status')
            .eq('id', user.id)
            .single();

          // Check user_profiles table (distributors)
          const { data: distributorUser, error: distributorError } = await supabase
            .from('user_profiles')
            .select('id, role, status, full_name')
            .eq('id', user.id)
            .single();

          console.log('📋 Table lookup results:', {
            adminUser: adminUser ? `Found (role: ${adminUser.role}, status: ${adminUser.status})` : 'Not found',
            distributorUser: distributorUser ? `Found (role: ${distributorUser.role}, status: ${distributorUser.status})` : 'Not found',
            adminError: adminError?.code,
            distributorError: distributorError?.code
          });

          // CRITICAL: User must be in ONE of the tables
          if (!adminUser && !distributorUser) {
            console.error('🚫 SECURITY BLOCK: User not found in admin_users OR user_profiles', {
              userId: user.id,
              email: user.email,
              provider: user.app_metadata?.provider,
              adminError: adminError?.code,
              distributorError: distributorError?.code
            });

            // Sign out the unauthorized user immediately
            await supabase.auth.signOut();

            toast.error('Access Denied', {
              description: 'Your account is not authorized. Please contact your administrator for access.',
            });

            setError('Access Denied: This account is not authorized to access the platform. Only invited users can sign in.');

            setTimeout(() => {
              navigate('/login');
            }, 4000);
            return;
          }

          // ERROR: User should not be in BOTH tables
          if (adminUser && distributorUser) {
            console.error('⚠️ ERROR: User exists in BOTH admin_users AND user_profiles', {
              userId: user.id,
              email: user.email,
              adminRole: adminUser.role,
              distributorRole: distributorUser.role
            });

            await supabase.auth.signOut();

            toast.error('Configuration Error', {
              description: 'Your account has conflicting configurations. Please contact support.',
            });

            setError('Account configuration error: Please contact your administrator to resolve this issue.');

            setTimeout(() => {
              navigate('/login');
            }, 4000);
            return;
          }

          // ADMIN USER FLOW
          if (adminUser) {
            console.log('👔 Admin user detected:', {
              userId: user.id,
              email: user.email,
              role: adminUser.role,
              status: adminUser.status
            });

            // Check admin status
            if (adminUser.status !== 'active') {
              console.error('🚫 SECURITY BLOCK: Admin user not active', {
                userId: user.id,
                email: user.email,
                status: adminUser.status,
                role: adminUser.role
              });

              await supabase.auth.signOut();

              toast.error('Account Inactive', {
                description: 'Your admin account is not active. Please contact your administrator.',
              });

              setError(`Account ${adminUser.status}: Your admin account is not currently active. Please contact support.`);

              setTimeout(() => {
                navigate('/login');
              }, 4000);
              return;
            }

            // Success - Admin user with active status
            console.log('✅ SECURITY CHECK PASSED: Admin user', {
              userId: user.id,
              email: user.email,
              role: adminUser.role,
              status: adminUser.status
            });

            toast.success(`Welcome back, Admin!`);
            setStatus('Access granted! Redirecting to admin dashboard...');

            setTimeout(() => {
              navigate('/admin/dashboard');
            }, 1000);
            return;
          }

          // DISTRIBUTOR USER FLOW
          if (distributorUser) {
            console.log('🏢 Distributor user detected:', {
              userId: user.id,
              email: user.email,
              role: distributorUser.role,
              status: distributorUser.status,
              name: distributorUser.full_name
            });

            // Check distributor status
            if (distributorUser.status !== 'active') {
              console.error('🚫 SECURITY BLOCK: Distributor user not active', {
                userId: user.id,
                email: user.email,
                status: distributorUser.status,
                role: distributorUser.role
              });

              await supabase.auth.signOut();

              toast.error('Account Inactive', {
                description: 'Your distributor account is not active. Please contact your administrator.',
              });

              setError(`Account ${distributorUser.status}: Your distributor account is not currently active. Please contact support.`);

              setTimeout(() => {
                navigate('/login');
              }, 4000);
              return;
            }

            // Success - Distributor user with active status
            console.log('✅ SECURITY CHECK PASSED: Distributor user', {
              userId: user.id,
              email: user.email,
              role: distributorUser.role,
              status: distributorUser.status,
              name: distributorUser.full_name
            });

            toast.success(`Welcome back, ${distributorUser.full_name || user.email}!`);
            setStatus('Access granted! Redirecting to portal...');

            setTimeout(() => {
              navigate('/portal');
            }, 1000);
            return;
          }
        }
        // Unknown type
        else {
          console.error('Unknown auth callback type:', type);
          throw new Error('Invalid authentication link');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during authentication');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

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
                  Please wait while we set up your account...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
