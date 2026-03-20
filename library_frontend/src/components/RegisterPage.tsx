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
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.name || !form.email || !form.contact_number || !form.address) {
      setError('Please fill in all fields.'); return;
    }
    try {
      setLoading(true); setError('');
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
    <div className="min-h-screen bg-[#0f0a04] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #c9a84c08 0, #c9a84c08 1px, transparent 0, transparent 50%)', backgroundSize: '28px 28px' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #6b1d2a22 0%, transparent 70%)' }} />
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-600 to-transparent" />

      <div className="relative w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-yellow-600 bg-[#1a1209] mb-4 shadow-lg" style={{ boxShadow: '0 0 24px #c9a84c33' }}>
            <img src={libraryIcon} alt="Bibliotheca" className="w-14 h-14 object-contain" />
          </div>
          <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-4xl font-bold text-yellow-500 mb-1 tracking-wide">Bibliotheca</h1>
          <p className="text-[#7a6a52] text-xs tracking-[0.25em] uppercase">Create a Borrower Account</p>
        </div>

        <div className="rounded-xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 0 1px #c9a84c44, 0 25px 50px #00000088' }}>
          <div className="bg-gradient-to-r from-[#6b1d2a] to-[#4a1320] px-7 py-5 border-b border-yellow-900/30">
            <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-white text-xl font-semibold tracking-wide">Register</h2>
            <p className="text-red-300/70 text-xs italic mt-0.5">Fill in your details to create an account</p>
          </div>

          <div className="bg-[#f5f0e8] px-7 py-7 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            {[
              { label: 'Full Name',       key: 'name',           type: 'text',     placeholder: 'Juan dela Cruz'      },
              { label: 'Username',        key: 'username',       type: 'text',     placeholder: 'juandelacruz'        },
              { label: 'Password',        key: 'password',       type: 'password', placeholder: '••••••••'            },
              { label: 'Email',           key: 'email',          type: 'email',    placeholder: 'juan@email.com'      },
              { label: 'Contact Number',  key: 'contact_number', type: 'text',     placeholder: '09XX XXX XXXX'       },
              { label: 'Address',         key: 'address',        type: 'text',     placeholder: 'City, Province'      },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">{label}</label>
                <input type={type} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#cfc4aa] rounded-lg bg-white text-[#1a1209] focus:outline-none focus:border-[#6b1d2a] focus:ring-2 focus:ring-[#6b1d2a]/20 transition-all text-sm" />
              </div>
            ))}

            <button type="button" onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-base tracking-wide transition-all disabled:opacity-60 relative overflow-hidden group"
              style={{ fontFamily:'Playfair Display, serif', background: 'linear-gradient(135deg, #6b1d2a 0%, #8c2f3f 100%)', color: 'white', boxShadow: '0 4px 15px #6b1d2a55' }}>
              <span className="relative z-10">{loading ? 'Creating account…' : 'Create Account'}</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>

            <p className="text-center text-sm text-[#7a6a52]">
              Already have an account?{' '}
              <a href="/" className="text-[#6b1d2a] font-semibold hover:underline">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;