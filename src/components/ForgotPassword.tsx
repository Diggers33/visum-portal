import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <Link to="/login">
              <Button 
                variant="outline"
                className="inline-flex items-center justify-center gap-2 border-[#00a8b5] text-[#00a8b5] hover:bg-[#00a8b5]/5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#00a8b5]/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-[#00a8b5]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot your password?</h2>
          <p className="text-slate-600">
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="distributor@example.com"
              className="h-11 rounded-lg border-slate-300 focus:border-[#00a8b5] focus:ring-2 focus:ring-[#00a8b5]/20 transition-all duration-200"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#00a8b5] hover:bg-[#008a95] rounded-lg transition-all duration-200"
            style={{ boxShadow: '0 2px 8px rgba(0,168,181,0.2)' }}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>

          <div className="text-center">
            <Link to="/login">
              <Button 
                variant="ghost"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
