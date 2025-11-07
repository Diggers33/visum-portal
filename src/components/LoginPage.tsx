import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  const handleGoogleLogin = () => {
    toast.success('Google login initiated');
    setTimeout(() => {
      onLogin();
    }, 1000);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #00a8b5 0%, #00c4aa 100%)' }}>
      {/* Teal Background Section with Visum Branding */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 pb-12">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-light text-white mb-4 tracking-wide">
            Visum®
          </h1>
          <p className="text-white/90 text-xl mb-2">
            Product Distribution Portal
          </p>
          <p className="text-white/80 text-base">
            By IRIS Technology
          </p>
        </div>
      </div>

      {/* White Bottom Card */}
      <div className="bg-white rounded-t-[2rem] px-6 pt-8 pb-8 min-h-[400px]">
        <div className="max-w-sm mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to access your distributor portal
            </p>
          </div>

          {/* Email Field */}
          <div className="mb-6">
            <Label htmlFor="email" className="text-gray-700 text-base mb-2 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl border-2 border-gray-200 focus:border-[#00a8b5] focus:ring-0 text-base"
              required
            />
          </div>

          {/* Password Field */}
          <div className="mb-8">
            <Label htmlFor="password" className="text-gray-700 text-base mb-2 block">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-4 pr-12 rounded-2xl border-2 border-gray-200 focus:border-[#00a8b5] focus:ring-0 text-base"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <Button
            onClick={handleSubmit}
            className="w-full h-14 mb-6 text-white font-medium text-base rounded-2xl"
            style={{ 
              backgroundColor: '#00a8b5',
              border: 'none'
            }}
          >
            Sign In
          </Button>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-2xl border-2 border-gray-200 text-gray-700 font-medium text-base hover:bg-gray-50"
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
  );
}
