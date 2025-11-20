import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { trackLogin } from '../lib/activityTracker';

interface LoginPageProps {
  onLogin?: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Track successful login
      await trackLogin();

      toast.success('Welcome back!');
      if (onLogin) onLogin();
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectUrl = Capacitor.isNativePlatform()
        ? 'com.iristechnology.visumportal://auth/callback'
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectUrl = Capacitor.isNativePlatform()
        ? 'com.iristechnology.visumportal://auth/callback'
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold text-slate-900 mb-3">Welcome back</h2>
            <p className="text-slate-600">Sign in to access your distributor account</p>
          </div>

          {/* Authorized Access Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Authorized Access Only</h4>
                <p className="text-sm text-blue-800">
                  Google sign-in is available only for admin-invited users. If you don't have access, please contact your administrator.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
              {error}
            </div>
          )}

          {/* SSO Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-lg border-slate-300 hover:bg-slate-50 transition-all duration-200"
              onClick={handleMicrosoftLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#00a4ef"/>
                <rect x="1" y="11" width="9" height="9" fill="#7fba00"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Continue with Microsoft
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-lg border-slate-300 hover:bg-slate-50 transition-all duration-200"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="distributor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg border-slate-300 focus:border-[#00a8b5] focus:ring-2 focus:ring-[#00a8b5]/20 transition-all duration-200"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-medium">Password</Label>
                <a href="#" className="text-sm text-[#00a8b5] hover:text-[#008a95] transition-colors duration-200">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-lg border-slate-300 focus:border-[#00a8b5] focus:ring-2 focus:ring-[#00a8b5]/20 transition-all duration-200 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-[#00a8b5] hover:bg-[#008a95] rounded-lg transition-all duration-200"
              style={{ boxShadow: '0 2px 8px rgba(0,168,181,0.2)' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-center text-sm text-slate-600 mb-3">
              Don't have access?
            </p>
            <Button
              variant="outline"
              className="w-full h-11 border-[#00a8b5] text-[#00a8b5] hover:bg-[#00a8b5]/5 rounded-lg transition-all duration-200"
              disabled={loading}
            >
              Request distributor access
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#6b7280]">
              Need help? Contact{' '}
              <a href="#" className="text-[#00a8b5] hover:text-[#008c99]">
                support@iris-eng.com
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/admin/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-[#00a8b5] hover:bg-[#00a8b5]/5"
              >
                Admin Portal
                <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Background image with overlay */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12"
        style={{
          backgroundImage: 'url(/assets/NIR-Intro.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px]"></div>
        
        {/* Content on top of overlay */}
        <div className="relative z-10 max-w-lg text-center">
          {/* Logo and Brand */}
          <div className="mb-8">
            <div className="mb-4">
              <h1 className="text-3xl font-light text-white tracking-tight mb-2">
                Visum®
              </h1>
              <p className="text-lg text-white/90 mb-1">
                Product Distribution Portal
              </p>
              <p className="text-sm text-white/80">
                By IRIS Technology
              </p>
            </div>
          </div>
          
          <h2 className="text-xl text-white mb-6">
            Advanced Photonics Solutions for Industrial Quality Control
          </h2>
          <p className="text-white/90 mb-8">
            Access comprehensive product documentation, marketing materials, and training resources for IRIS Technology's portfolio of NIR analyzers, Raman spectroscopy devices, and hyperspectral imaging systems.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-sm rounded border border-white/20 p-4 hover:bg-white/10 transition-all duration-200">
              <div className="text-2xl text-white mb-1">200+</div>
              <div className="text-sm text-white/80">Products</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded border border-white/20 p-4 hover:bg-white/10 transition-all duration-200">
              <div className="text-2xl text-white mb-1">50+</div>
              <div className="text-sm text-white/80">Countries</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded border border-white/20 p-4 hover:bg-white/10 transition-all duration-200">
              <div className="text-2xl text-white mb-1">24/7</div>
              <div className="text-sm text-white/80">Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
