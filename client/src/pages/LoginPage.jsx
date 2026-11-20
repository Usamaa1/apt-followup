import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('authError');

  useEffect(() => {
    if (!loading && user) {
      navigate('/followup', { replace: true });
      return;
    }

    // Attempt automatic silent Google login once if user is already signed into Gmail
    const triedSilent = sessionStorage.getItem('triedSilentGoogleLogin');
    if (!loading && !user && !authError && !triedSilent) {
      sessionStorage.setItem('triedSilentGoogleLogin', 'true');
      loginWithGoogle(true);
    }
  }, [user, loading, authError, navigate, loginWithGoogle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Checking Google session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="mb-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
            Faculty & Admin Portal
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 mt-3">
            Student Follow-Up Sheet
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in with your Gmail account to open your batches, send WhatsApp notices, and sync your Google Sheet.
          </p>
        </div>

        {authError && authError !== 'interaction_required' && authError !== 'login_required' && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            Sign-in could not be completed ({authError}). Please click below to sign in manually.
          </div>
        )}

        <button
          onClick={() => loginWithGoogle(false)}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm border border-slate-300 rounded-lg py-3 px-4 transition cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}