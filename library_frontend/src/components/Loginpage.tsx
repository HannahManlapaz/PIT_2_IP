import React, { useState } from 'react';
import { loginApi } from '../api';
import { AuthUser } from '../types';
import libraryIcon from '../assets/library-icon.png';

interface Props {
  onLogin: (data: AuthUser) => void;
}

const Loginpage: React.FC<Props> = ({ onLogin }) => {
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
        if (data.role === 'admin') {
          setError('This is the borrower portal. Please use the admin login page.');
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
    <div className="min-h-screen flex">
      {/* Left Side - Branding with Texture */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-stone-900 to-stone-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>
        
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/20 via-transparent to-stone-900/40" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="max-w-md">
            {/* Large Logo */}
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-white/10 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-white/20">
                <img src={libraryIcon} alt="Library" className="w-24 h-24 object-contain" />
              </div>
            </div>
            
            <h1 className="text-5xl font-light text-white mb-4 tracking-wide">
             Librium Library Portal
            </h1>
            <p className="text-amber-200/80 text-lg mb-6 font-crimson italic">
              Knowledge awaits
            </p>
            <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-8" />
            
            <blockquote className="text-white/70 text-sm italic font-crimson leading-relaxed">
              "A library is not a luxury but one of the necessities of life."
              <footer className="text-amber-300/60 text-xs mt-2 not-italic">
                — Henry Ward Beecher
              </footer>
            </blockquote>
          </div>
        </div>
        
        {/* Decorative Corner Element */}
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-amber-500/20" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-amber-500/20" />
      </div>

      {/* Right Side - Login Form with Texture */}
      <div className="w-full lg:w-1/2 relative overflow-y-auto bg-gradient-to-br from-stone-50 to-amber-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5L18.5 18L20 15.5L21.5 18L20 20.5zM20 40L0 20L20 0L40 20L20 40z' fill='%23c9a84c' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Subtle Paper Texture Overlay */}
        <div className="absolute inset-0 bg-noise opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }} />
        
        {/* Form Container */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo (visible only on small screens) */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-white rounded-2xl shadow-sm">
                <img src={libraryIcon} alt="Library" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-2xl font-light text-stone-800">
                Library Portal
              </h1>
              <p className="text-stone-500 text-sm mt-1">
                Borrower Access
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-stone-200/50 overflow-hidden">
              <div className="px-8 pt-8 pb-6">
                <h2 className="text-2xl font-light text-stone-800 mb-2">
                  Welcome back
                </h2>
                <p className="text-stone-500 text-sm mb-6">
                  Sign in to access your borrowing account
                </p>

                {error && (
                  <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm text-center">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="Enter your username"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="Enter your password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  <div className="text-center pt-2">
                    <a href="/register" className="text-stone-500 hover:text-stone-700 text-sm transition-colors duration-200">
                      Don't have an account? Register
                    </a>
                  </div>
                </form>
              </div>
            </div>

            {/* Mobile Quote (visible only on small screens) */}
            <p className="lg:hidden text-center text-stone-400 text-xs italic mt-8">
              "A library is not a luxury but one of the necessities of life."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loginpage;