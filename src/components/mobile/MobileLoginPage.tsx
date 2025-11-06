import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    onLogin();
  };

  const handleMicrosoftLogin = () => {
    toast.success('Microsoft login initiated');
    setTimeout(() => {
      onLogin();
    }, 1000);
  };

  const handleGoogleLogin = () => {
    toast.success('Google login initiated');
    setTimeout(() => {
      onLogin();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1e3a5f] to-[#335573] flex flex-col">
      {/* Header */}
      <div className="p-6 text-center">
        <div className="mb-4">
          <span className="text-3xl text-[#00a8b5] tracking-tight block">Visum®</span>
          <span className="text-sm text-white/80 block mt-1">Distributor Portal</span>
          <span className="text-xs text-white/60 block">By IRIS Technology</span>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex-1 bg-white rounded-t-[2rem] p-6 shadow-2xl">
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 mb-2">Welcome back</h1>
            <p className="text-slate-600">Sign in to your distributor account</p>
          </div>

          {/* SSO Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-slate-300 hover:bg-slate-50"
              onClick={handleMicrosoftLogin}
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
              className="w-full h-12 rounded-xl border-slate-300 hover:bg-slate-50"
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

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="distributor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-slate-300 focus:border-[#00a8b5]"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm text-[#00a8b5]">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-300 focus:border-[#00a8b5] pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-[#00a8b5] hover:bg-[#008a95] rounded-xl"
              style={{ boxShadow: '0 4px 12px rgba(0,168,181,0.3)' }}
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm text-slate-600 mb-3">
              Don't have access?
            </p>
            <Button
              variant="outline"
              className="w-full h-12 border-[#00a8b5] text-[#00a8b5] hover:bg-[#00a8b5]/5 rounded-xl"
            >
              Request distributor access
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Need help? Contact{' '}
              <a href="#" className="text-[#00a8b5]">
                support@iris-eng.com
              </a>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-center">
            <Link 
              to="/admin/login" 
              className="text-xs text-slate-400"
            >
              IRIS Staff? Access Admin Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
