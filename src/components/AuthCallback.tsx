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
        }

        // Fallback: Try to get existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          console.error('❌ No session found:', sessionError);
          throw new Error('No valid session found. Please log in again.');
        }

        console.log('ℹ️ Using existing session');
        const user = sessionData.session.user;

        // SECURITY CHECK: Check BOTH tables for existing sessions too
        console.log('🔍 Checking both tables for existing session...');

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role, status')
          .eq('id', user.id)
          .single();

        const { data: distributorUser } = await supabase
          .from('user_profiles')
          .select('id, role, status, full_name')
          .eq('id', user.id)
          .single();

        // Must be in one of the tables
        if (!adminUser && !distributorUser) {
          console.error('🚫 SECURITY BLOCK: User not in either table (existing session)', {
            userId: user.id,
            email: user.email
          });

          await supabase.auth.signOut();
          toast.error('Access Denied');
          setError('Your account is not authorized to access this platform.');

          setTimeout(() => navigate('/login'), 4000);
          return;
        }

        // Admin user flow
        if (adminUser) {
          if (adminUser.status !== 'active') {
            console.error('🚫 SECURITY BLOCK: Inactive admin (existing session)');
            await supabase.auth.signOut();
            toast.error('Account Inactive');
            setError('Your admin account is not currently active.');
            setTimeout(() => navigate('/login'), 4000);
            return;
          }

          console.log('✅ Admin user session valid');
          navigate('/admin/dashboard');
          return;
        }

        // Distributor user flow
        if (distributorUser) {
          if (distributorUser.status !== 'active') {
            console.error('🚫 SECURITY BLOCK: Inactive distributor (existing session)');
            await supabase.auth.signOut();
            toast.error('Account Inactive');
            setError('Your distributor account is not currently active.');
            setTimeout(() => navigate('/login'), 4000);
            return;
          }

          console.log('✅ Distributor user session valid');
          navigate('/portal');
          return;
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
