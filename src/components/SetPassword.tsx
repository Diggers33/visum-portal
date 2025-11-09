import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Verify the invitation is valid
    const verifyInvitation = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setError('Invalid or expired invitation link');
          setVerifying(false);
          return;
        }

        setVerifying(false);
      } catch (err) {
        console.error('Error verifying invitation:', err);
        setError('Failed to verify invitation');
        setVerifying(false);
      }
    };

    verifyInvitation();
  }, []);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a number';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Get user profile and update status to active
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: statusError } = await supabase
          .from('user_profiles')
          .update({ status: 'active' })
          .eq('id', user.id);

        if (statusError) {
          console.error('Error updating status:', statusError);
        }
      }

      // Success - redirect to portal
      navigate('/portal');
    } catch (err: any) {
      console.error('Error setting password:', err);
      setError(err.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && verifying === false && !password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Invalid Invitation</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-[#00a8b5] hover:bg-[#008a95]"
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const passwordStrength = password.length > 0 ? (
    <div className="space-y-1 text-xs mt-2">
      <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`}>
        {password.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        At least 8 characters
      </div>
      <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
        {/[A-Z]/.test(password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        One uppercase letter
      </div>
      <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
        {/[a-z]/.test(password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        One lowercase letter
      </div>
      <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
        {/[0-9]/.test(password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        One number
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00a8b5]/10 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-[#00a8b5]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Set Your Password</h1>
            <p className="text-slate-600">Create a secure password for your distributor account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordStrength}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-11 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting password...
                </>
              ) : (
                'Set Password & Continue'
              )}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-600">
            Need help?{' '}
            <a href="mailto:support@iris-eng.com" className="text-[#00a8b5] hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
