import React, { useState } from 'react';
import { loginApi } from '../api';

interface Props {
  onLogin: (token: string, username: string) => void;
}

const Loginpage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter username and password.'); return; }
    try {
      setLoading(true); setError('');
      const data = await loginApi(username, password);
      if (data.token) {
        onLogin(data.token, data.username);
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
    <div className="min-h-screen bg-[#0f0a04] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Diagonal grid background */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #c9a84c08 0, #c9a84c08 1px, transparent 0, transparent 50%)',
          backgroundSize: '28px 28px'
        }} />

      {/* Radial glow center */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, #6b1d2a22 0%, transparent 70%)' }} />

      {/* Top gold line accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-600 to-transparent" />

      <div className="relative w-full max-w-md z-10">

        {/* Monogram + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-yellow-600 bg-[#1a1209] mb-4 shadow-lg"
            style={{ boxShadow: '0 0 24px #c9a84c33' }}>
            <span style={{fontFamily:'Playfair Display, serif'}}
              className="text-yellow-500 text-2xl font-bold">B</span>
          </div>
          <h1 style={{fontFamily:'Playfair Display, serif'}}
            className="text-4xl font-bold text-yellow-500 mb-1 tracking-wide">
            Bibliotheca
          </h1>
          <p className="text-[#7a6a52] text-xs tracking-[0.25em] uppercase">
            Library Management System
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 0 0 1px #c9a84c44, 0 25px 50px #00000088' }}>

          {/* Card header */}
          <div className="bg-gradient-to-r from-[#6b1d2a] to-[#4a1320] px-7 py-5 border-b border-yellow-900/30">
            <h2 style={{fontFamily:'Playfair Display, serif'}}
              className="text-white text-xl font-semibold tracking-wide">
              Staff Login
            </h2>
            <p className="text-red-300/70 text-xs italic mt-0.5">
              Authorized personnel only
            </p>
          </div>

          {/* Card body */}
          <div className="bg-[#f5f0e8] px-7 py-7">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="mb-5">
              <label style={{fontFamily:'Playfair Display, serif'}}
                className="block text-sm font-semibold text-[#3d2f1a] mb-1.5 tracking-wide">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6a52] text-sm">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#cfc4aa] rounded-lg bg-white text-[#1a1209] focus:outline-none focus:border-[#6b1d2a] focus:ring-2 focus:ring-[#6b1d2a]/20 transition-all text-sm"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-7">
              <label style={{fontFamily:'Playfair Display, serif'}}
                className="block text-sm font-semibold text-[#3d2f1a] mb-1.5 tracking-wide">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6a52] text-sm">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#cfc4aa] rounded-lg bg-white text-[#1a1209] focus:outline-none focus:border-[#6b1d2a] focus:ring-2 focus:ring-[#6b1d2a]/20 transition-all text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-base tracking-wide transition-all disabled:opacity-60 relative overflow-hidden group"
              style={{
                fontFamily:'Playfair Display, serif',
                background: 'linear-gradient(135deg, #6b1d2a 0%, #8c2f3f 100%)',
                color: 'white',
                boxShadow: '0 4px 15px #6b1d2a55'
              }}
            >
              <span className="relative z-10">
                {loading ? 'Signing in…' : 'Sign In'}
              </span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Bottom quote */}
        <p className="text-center text-[#3d2f1a]/40 text-xs italic mt-6 px-4">
          "A library is not a luxury but one of the necessities of life."
        </p>
      </div>
    </div>
  );
};

export default Loginpage;