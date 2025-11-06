import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔍 AdminAuthCallback: Starting...');
        
        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error during auth callback:', error);
          navigate('/admin/login');
          return;
        }

        if (data.session) {
          console.log('✅ Session exists, user:', data.session.user.email);
          
          // Check if user has a profile and verify admin role
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            console.log('🆕 Creating new admin profile...');
            
            // Profile doesn't exist, create one with admin role
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert([
                {
                  id: data.session.user.id,
                  email: data.session.user.email,
                  full_name: data.session.user.user_metadata.full_name || data.session.user.email?.split('@')[0],
                  company_name: 'IRIS Technology Solutions',
                  role: 'admin',
                  territory: ''
                }
              ]);

            if (insertError) {
              console.error('❌ Failed to create admin profile:', insertError);
              await supabase.auth.signOut();
              navigate('/admin/login');
              return;
            }
            
            console.log('✅ Admin profile created successfully');
            navigate('/admin/dashboard', { replace: true });
          } else if (profile?.role === 'admin') {
            console.log('✅ User has admin role, redirecting...');
            navigate('/admin/dashboard', { replace: true });
          } else {
            console.log('❌ User is not an admin, denying access');
            await supabase.auth.signOut();
            navigate('/admin/login');
          }
        } else {
          console.log('❌ No session found');
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('💥 Unexpected error:', error);
        await supabase.auth.signOut();
        navigate('/admin/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5] mx-auto mb-4"></div>
        <p className="text-slate-600">Verifying admin access...</p>
      </div>
    </div>
  );
}
