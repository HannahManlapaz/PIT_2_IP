import React, { useState } from 'react';
import { loginApi } from '../api';
import { AuthUser } from '../types';
import libraryIcon from '../assets/library-icon.png';

interface Props {
  onLogin: (data: AuthUser) => void;
}

const AdminLoginPage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await loginApi(username, password);
      if (data.token) {
        if (data.role === 'borrower') {
          setError('This is the admin portal. Please use the borrower login page.');
          return;
        }
        onLogin(data);
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-burgundy-950">
      {/* Premium Background Patterns */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='0.15'%3E%3Cpath d='M40 0 L80 20 L80 60 L40 80 L0 60 L0 20 Z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Diagonal Lines Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `repeating-linear-gradient(45deg, #c9a84c20 0px, #c9a84c20 2px, transparent 2px, transparent 8px)`,
      }} />
      
      {/* Glow Effect */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-burgundy-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      {/* Left Side - Admin Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          {/* Premium Badge */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-amber-500/30">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-500 text-xs uppercase tracking-wider font-semibold">Administrator Access</span>
            </div>
          </div>

          {/* Large Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500/10 to-burgundy-500/10 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-amber-500/30">
              <img src={libraryIcon} alt="Library" className="w-20 h-20 object-contain opacity-90" />
            </div>
          </div>
          
          <h1 className="text-5xl font-light text-white mb-4 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-amber-400/80 text-lg mb-6 font-crimson">
            Library Management System
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span>Manage library collections</span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span>Oversee user accounts</span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span>Generate reports & analytics</span>
            </div>
          </div>
          
          <blockquote className="text-white/40 text-sm italic font-crimson border-l-2 border-amber-500/30 pl-4">
            "Libraries store the energy that fuels the imagination."
            <footer className="text-amber-500/40 text-xs mt-1 not-italic">
              — Sidney Sheldon
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-6 lg:p-12">
        {/* Glassmorphism Card */}
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-amber-500/10 to-burgundy-500/10 rounded-2xl backdrop-blur-sm border border-amber-500/30">
              <img src={libraryIcon} alt="Library" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-light text-white">
              Admin Portal
            </h1>
            <p className="text-amber-400/70 text-sm mt-1">
              Library Management System
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-8 pt-8 pb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">
                  Welcome back
                </h2>
                <p className="text-white/50 text-sm">
                  Sign in to access the admin dashboard
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">👤</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                      placeholder="Admin username"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔒</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                    <span className="text-white/50 text-sm">Remember me</span>
                  </label>
                  <a href="#" className="text-amber-400/70 hover:text-amber-400 text-sm transition-colors">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-amber-500/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : 'Sign In to Admin Dashboard'}
                </button>

                <div className="text-center pt-4">
                  <p className="text-white/40 text-xs">
                    This area is restricted to authorized personnel only
                  </p>
                  <a href="/borrower-login" className="inline-block mt-3 text-amber-400/60 hover:text-amber-400 text-sm transition-colors">
                    ← Back to Borrower Portal
                  </a>
                </div>
              </form>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full backdrop-blur-sm border border-white/10">
              <svg className="w-3 h-3 text-black-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-black text-xs">Secure admin access • Encrypted connection</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;