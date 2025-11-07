import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface MobileLoginPageProps {
  onLogin: () => void;
}

export default function MobileLoginPage({ onLogin }: MobileLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with actual Supabase authentication
    onLogin();
  };

  const handleGoogleLogin = () => {
    // TODO: Replace with actual Google OAuth
    toast.success('Google login initiated');
    setTimeout(() => {
      onLogin();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00a8b5] to-[#00d4aa] flex flex-col">
      {/* Header - Centered Logo */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl font-light text-white mb-2">Visum®</h1>
          <p className="text-white/90 text-lg mb-1">Product Distribution Portal</p>
          <p className="text-white/70 text-sm">By IRIS Technology</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-8 shadow-2xl">
        <div className="max-w-sm mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-600">Sign in to access your distributor portal</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border-slate-200 focus:border-[#00a8b5] focus:ring-[#00a8b5]/20 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-2xl border-slate-200 focus:border-[#00a8b5] focus:ring-[#00a8b5]/20 text-base pr-14"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#00a8b5] hover:bg-[#00969d] rounded-2xl text-white font-medium text-base"
              style={{ boxShadow: '0 6px 20px rgba(0,168,181,0.3)' }}
            >
              Sign In
            </Button>
          </form>

          {/* Google Login */}
          <div className="mt-8">
            <Button
              type="button"
              variant="outline"
              className="w-full h-14 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              onClick={handleGoogleLogin}
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
        </div>
      </div>
    </div>
  );
}