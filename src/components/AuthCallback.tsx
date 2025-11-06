import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is an OAuth callback with code
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Try to get code from either hash or search params
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
            await handleUserProfile(data.session.user);
            
            // Check user role and redirect accordingly
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('id', data.session.user.id)
              .single();

            if (profile?.role === 'admin') {
              navigate('/admin/dashboard');
            } else {
              navigate('/');
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
            .select('role')
            .eq('id', sessionData.session.user.id)
            .single();

          if (profile?.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/');
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
          console.log('User profile found:', profile.role);
        }
      } catch (error) {
        console.error('Error handling user profile:', error);
      }
    };

    handleCallback();
  }, [navigate]);

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
