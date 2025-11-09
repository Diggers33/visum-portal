import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is an invitation callback
        const type = searchParams.get('type');
        
        // Check if this is an OAuth callback with code
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = hashParams.get('code') || searchParams.get('code');
        
        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            navigate('/login');
            return;
          }

          if (data.session) {
            // Check if this is an invitation (user hasn't set password yet)
            if (type === 'invite') {
              console.log('Invitation detected, redirecting to set password');
              navigate('/set-password');
              return;
            }

            await handleUserProfile(data.session.user);
            
            // Check user role and redirect accordingly
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('role, status')
              .eq('id', data.session.user.id)
              .single();

            // If user is pending and just invited, send to password setup
            if (profile?.status === 'pending') {
              navigate('/set-password');
              return;
            }

            if (profile?.role === 'admin') {
              navigate('/admin/dashboard');
            } else {
              navigate('/portal');
            }
            return;
          }
        }

        // Fallback: Try to get existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          navigate('/login');
          return;
        }

        if (sessionData.session) {
          await handleUserProfile(sessionData.session.user);
          
          // Check user role and redirect accordingly
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, status')
            .eq('id', sessionData.session.user.id)
            .single();

          // If user is pending, send to password setup
          if (profile?.status === 'pending') {
            navigate('/set-password');
            return;
          }

          if (profile?.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/portal');
          }
        } else {
          console.error('No session found');
          navigate('/login');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        navigate('/login');
      }
    };

    const handleUserProfile = async (user: any) => {
      try {
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          console.log('Creating new user profile...');
          
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert([
              {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split('@')[0] || 
                          'User',
                company_name: user.user_metadata?.company_name || '',
                role: 'distributor', // Default role
                territory: '',
                status: 'active'
              }
            ]);

          if (insertError) {
            console.error('Error creating profile:', insertError);
          } else {
            console.log('Profile created successfully');
          }
        } else if (profile) {
          console.log('User profile found:', profile.role, profile.status);
        }
      } catch (error) {
        console.error('Error handling user profile:', error);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5] mx-auto mb-4"></div>
        <p className="text-slate-600 text-lg">Completing sign in...</p>
        <p className="text-slate-400 text-sm mt-2">Please wait</p>
      </div>
    </div>
  );
}
