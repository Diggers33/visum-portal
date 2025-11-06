import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import adminBgImage from 'figma:asset/0b02a937a9098c1ca039716988bd7fcb3be6951d.png';

interface AdminLoginPageProps {
  onLogin: () => void;
}

export default function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check if user has admin role
      if (data.user) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role, status')
          .eq('id', data.user.id)
          .single();
        
        if (!adminUser) {
          await supabase.auth.signOut();
          throw new Error('Access denied. Admin privileges required.');
        }
        
        if (adminUser.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error('Account is not active. Contact IT support.');
        }
        
        onLogin();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('🔵 Google login button clicked');
    setLoading(true);
    setError(null);
    
    try {
      // FIXED: Match the Supabase redirect URL exactly
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('🔵 Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      console.log('🔵 OAuth response:', { data, error });
      
      if (error) {
        console.error('❌ OAuth error:', error);
        throw error;
      }
      
      console.log('✅ OAuth initiated successfully');
      // Don't set loading to false here - page will redirect
    } catch (error: any) {
      console.error('❌ Error in handleGoogleLogin:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-[32px] font-semibold text-slate-900">
                Visum<sup className="text-[18px]">®</sup>
              </h1>
              <Badge className="bg-slate-700 text-white hover:bg-slate-700 text-[11px] px-2 py-0.5">
                ADMIN
              </Badge>
            </div>
            <p className="text-[18px] text-[#00a8b5]">Admin Portal</p>
            <p className="text-[13px] text-[#9ca3af]">IRIS Technology Internal System</p>
          </div>

          {/* Login Form */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@iris-eng.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-slate-200 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-[14px] text-[#00a8b5] hover:text-[#008a95]">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#00a8b5] hover:bg-[#008a95] text-white"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 hover:bg-slate-50"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          {/* Footer */}
          <div className="text-center">
            <a href="#" className="text-[13px] text-[#6b7280] hover:text-[#00a8b5]">
              Contact IT support
            </a>
          </div>

          {/* Distributor Portal Link */}
          <div className="text-center pt-4 border-t border-slate-200">
            <Link 
              to="/login" 
              className="text-[12px] text-slate-400 hover:text-slate-600"
            >
              ← Back to Distributor Login
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Branding with Background */}
      <div 
        className="hidden lg:flex lg:flex-1 relative overflow-hidden items-center justify-center p-12"
        style={{
          backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.85), rgba(51, 65, 85, 0.85)), url('${adminBgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-md space-y-4 text-white relative z-10">
          <h2 className="text-[36px] leading-tight">
            Distributor Portal Administration
          </h2>
          <p className="text-[16px] text-slate-200 leading-relaxed">
            Internal system for managing distributor access, content library, and partner communications.
          </p>
        </div>
      </div>
    </div>
  );
}
