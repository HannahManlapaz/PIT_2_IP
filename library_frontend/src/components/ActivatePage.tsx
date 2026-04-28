import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import libraryIcon from '../assets/library-icon.png';

const ActivatePage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const activate = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/auth/users/activation/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, token }),
        });

        if (res.status === 204 || res.ok) {
          setStatus('success');
          return;
        }

        // Only parse JSON if there's actual content
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        console.log('Status:', res.status);
        console.log('Response:', data);
        setStatus('error');

      } catch (err) {
        console.log('Error:', err);
        setStatus('error');
      }
    };
    activate();
  }, [uid, token]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
      {/* Background dots */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #c9a84c 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-10 max-w-md w-full mx-4 text-center">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/10 to-stone-700/50 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <img src={libraryIcon} alt="Library" className="w-12 h-12 object-contain opacity-90" />
          </div>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-xl font-light text-stone-700">Activating your account...</h2>
            <p className="text-stone-400 text-sm mt-2">Please wait a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-semibold text-stone-800 mb-2">Account Activated!</h2>
            <p className="text-stone-500 mb-6">Your account is now active. You can log in.</p>
            <a href="/"
              className="inline-block w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20">
              Go to Login
            </a>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-semibold text-red-700 mb-2">Activation Failed</h2>
            <p className="text-stone-500 mb-6">The link may have expired or is invalid. Please register again.</p>
            <a href="/register"
              className="inline-block w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20">
              Back to Register
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivatePage;