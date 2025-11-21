import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

export default function InvitationRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleRedirect();
  }, []);

  const handleRedirect = async () => {
    try {
      // Get the encoded Supabase invitation URL from query params
      const params = new URLSearchParams(window.location.search);
      const encodedUrl = params.get('url');
      const distributorId = params.get('distributor_id');

      if (!encodedUrl) {
        console.error('❌ Missing invitation URL parameter');
        setError('Invalid invitation link. Please contact your administrator.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Decode the real Supabase URL
      const invitationUrl = decodeURIComponent(encodedUrl);

      console.log('📧 Invitation click tracked:', {
        distributorId: distributorId || 'unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        targetUrl: invitationUrl
      });

      // Optional: Log to backend for analytics
      // You can add this later if you want to track clicks in your database
      /*
      try {
        await fetch('/api/track-invitation-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distributorId,
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn('⚠️ Failed to log click to backend:', err);
        // Don't block the redirect if logging fails
      }
      */

      // Small delay to ensure logging completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to real Supabase invitation URL (preserves hash token)
      console.log('🔄 Redirecting to Supabase URL...');
      window.location.href = invitationUrl;

    } catch (error) {
      console.error('❌ Redirect error:', error);
      setError('Failed to process invitation link. Please try again or contact support.');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Invalid Link
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-slate-600">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Processing your invitation...
          </h2>
          <p className="text-slate-600">
            Please wait while we set up your account.
          </p>
        </div>
      </div>
    </div>
  );
}
