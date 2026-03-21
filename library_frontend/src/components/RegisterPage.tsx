import React, { useState } from 'react';
import { registerApi } from '../api';
import { AuthUser } from '../types';
import libraryIcon from '../assets/library-icon.png';

interface Props {
  onLogin: (data: AuthUser) => void;
}

const RegisterPage: React.FC<Props> = ({ onLogin }) => {
  const [form, setForm] = useState({
    username: '', password: '', name: '',
    email: '', contact_number: '', address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.name || !form.email || !form.contact_number || !form.address) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await registerApi(form);
      if (data.token) {
        onLogin(data);
      } else {
        const errs = Object.values(data).flat().join(' ');
        setError(errs || 'Registration failed.');
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #c9a84c 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>
      
      {/* Dots Variation for Depth */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #c9a84c 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />
      </div>
      
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-stone-950/30" />
      
      {/* Soft Radial Glow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Decorative Sparkle Effect */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L55 40 L50 45 L45 40 Z M50 100 L55 60 L50 55 L45 60 Z M0 50 L40 55 L45 50 L40 45 Z M100 50 L60 55 L55 50 L60 45 Z' fill='%23c9a84c' fill-opacity='0.1'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px'
      }} />

      {/* Left Side - Registration Info */}
      <div className="hidden lg:flex lg:w-2/5 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          {/* Welcome Badge */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-400/90 text-xs uppercase tracking-wider font-medium">Join Our Library Community</span>
            </div>
          </div>

          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500/10 to-stone-700/50 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-amber-500/20">
              <img src={libraryIcon} alt="Library" className="w-16 h-16 object-contain opacity-90" />
            </div>
          </div>
          
          <h1 className="text-4xl font-light text-white mb-4 tracking-tight">
            Become a Member
          </h1>
          <p className="text-amber-200/70 text-lg mb-8 font-crimson">
            Join our library community and unlock a world of knowledge
          </p>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white/90 mb-1">Access Thousands of Books</h3>
                <p className="text-sm text-white/50">Borrow physical and digital collections</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white/90 mb-1">24/7 Digital Library Access</h3>
                <p className="text-sm text-white/50">Read ebooks and audiobooks anytime</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white/90 mb-1">Join Reading Events</h3>
                <p className="text-sm text-white/50">Participate in book clubs and workshops</p>
              </div>
            </div>
          </div>
          
          <blockquote className="text-white/40 text-sm italic font-crimson border-l-2 border-amber-500/30 pl-4">
            "The only thing that you absolutely have to know is the location of the library."
            <footer className="text-amber-500/40 text-xs mt-1 not-italic">
              — Albert Einstein
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-3/5 relative flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl relative z-10">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
              <img src={libraryIcon} alt="Library" className="w-16 h-16 object-contain opacity-90" />
            </div>
            <h1 className="text-2xl font-light text-white">
              Become a Member
            </h1>
            <p className="text-amber-400/70 text-sm mt-1">
              Join our library community
            </p>
          </div>

          {/* Registration Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="px-8 pt-8 pb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-stone-800 mb-2">
                  Create your account
                </h2>
                <p className="text-stone-500 text-sm">
                  Fill in your details to get started
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
                {/* Two-column layout for larger screens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="Juan dela Cruz"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="juandelacruz"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="Create a strong password"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="juan@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      value={form.contact_number}
                      onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="09XX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                      placeholder="City, Province"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : 'Create Account'}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-stone-500 text-sm">
                    Already have an account?{' '}
                    <a href="/" className="text-amber-600 font-medium hover:text-amber-700 transition-colors">
                      Sign in here
                    </a>
                  </p>
                  <p className="text-stone-400 text-xs mt-3">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;