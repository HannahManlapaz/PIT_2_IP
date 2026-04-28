import React, { useState } from 'react';
import libraryIcon from '../assets/library-icon.png';

interface Props {
  onLogin: (data: any) => void;
}

const RegisterPage: React.FC<Props> = () => {
  const [form, setForm] = useState({
    username: '', password: '', re_password: '',
    name: '', email: '', contact_number: '', address: '',
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);  
  const [preview,    setPreview]    = useState<string | null>(null); 
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [loading,    setLoading]    = useState(false);

  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProfilePic(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  
  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.re_password || !form.name || !form.email || !form.contact_number || !form.address) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password !== form.re_password) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('username',       form.username);
      formData.append('email',          form.email);
      formData.append('password',       form.password);
      formData.append('re_password',    form.re_password);
      formData.append('name',           form.name);
      formData.append('contact_number', form.contact_number);
      formData.append('address',        form.address);
      if (profilePic) formData.append('profile_picture', profilePic);

      const res = await fetch('http://127.0.0.1:8000/api/users/register/', {
        method: 'POST',
        body: formData,
      });

      const reg = await res.json();

      if (res.ok) {
        setSuccess('Account created! Please check your email to activate your account.');
      } else {
        const errs = Object.values(reg).flat().join(' ');
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
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #c9a84c 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-stone-950/30" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Side */}
      <div className="hidden lg:flex lg:w-2/5 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-400/90 text-xs uppercase tracking-wider font-medium">Join Our Library Community</span>
            </div>
          </div>
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500/10 to-stone-700/50 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-amber-500/20">
              <img src={libraryIcon} alt="Library" className="w-16 h-16 object-contain opacity-90" />
            </div>
          </div>
          <h1 className="text-4xl font-light text-white mb-4 tracking-tight">Become a Member</h1>
          <p className="text-amber-200/70 text-lg mb-8">Join our library community and unlock a world of knowledge</p>
          <div className="space-y-6 mb-8">
            {[
              { title: 'Access Thousands of Books', desc: 'Borrow physical and digital collections' },
              { title: '24/7 Digital Library Access', desc: 'Read ebooks and audiobooks anytime' },
              { title: 'Join Reading Events', desc: 'Participate in book clubs and workshops' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-amber-400 rounded-full" />
                </div>
                <div>
                  <h3 className="font-medium text-white/90 mb-1">{item.title}</h3>
                  <p className="text-sm text-white/50">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <blockquote className="text-white/40 text-sm italic border-l-2 border-amber-500/30 pl-4">
            "The only thing that you absolutely have to know is the location of the library."
            <footer className="text-amber-500/40 text-xs mt-1 not-italic">— Albert Einstein</footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-3/5 relative flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl relative z-10">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
              <img src={libraryIcon} alt="Library" className="w-16 h-16 object-contain opacity-90" />
            </div>
            <h1 className="text-2xl font-light text-white">Become a Member</h1>
            <p className="text-amber-400/70 text-sm mt-1">Join our library community</p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="px-8 pt-8 pb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-stone-800 mb-2">Create your account</h2>
                <p className="text-stone-500 text-sm">Fill in your details to get started</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-600 text-sm text-center">{success}</p>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* -- ADD: Profile Picture Upload -- */}
                  <div className="md:col-span-2 flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full border-2 border-stone-200 overflow-hidden bg-stone-100 flex items-center justify-center flex-shrink-0">
                      {preview
                        ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        : <span className="text-stone-400 text-3xl">👤</span>
                      }
                    </div>
                    <div className="flex-1">
                      <label className="block text-stone-700 text-sm font-medium mb-2">Profile Picture (optional)</label>
                      <input type="file" accept="image/*" onChange={handleFileChange}
                        className="w-full px-4 py-2 border border-stone-200 rounded-lg bg-white/80 text-stone-800 text-sm
                          file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0
                          file:bg-amber-50 file:text-amber-700 file:font-medium
                          hover:file:bg-amber-100 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">Full Name *</label>
                    <input type="text" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      placeholder="Juan dela Cruz" />
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">Username *</label>
                    <input type="text" value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      placeholder="juandelacruz" />
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">Password *</label>
                    <input type="password" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      placeholder="Create a strong password" />
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">Confirm Password *</label>
                    <input type="password" value={form.re_password}
                      onChange={(e) => setForm({ ...form, re_password: e.target.value })}
                      placeholder="Re-enter your password"
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:ring-2 transition-all
                        ${form.re_password === ''
                          ? 'border-stone-200 focus:border-amber-400 focus:ring-amber-400/20'
                          : form.password === form.re_password
                            ? 'border-green-400 focus:border-green-400 focus:ring-green-400/20'
                            : 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        }`}
                    />
                    {form.re_password !== '' && (
                      <p className={`text-xs mt-1 ${form.password === form.re_password ? 'text-green-600' : 'text-red-500'}`}>
                        {form.password === form.re_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">Email Address *</label>
                    <input type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      placeholder="juan@email.com" />
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm font-medium mb-2">Contact Number *</label>
                    <input type="tel" value={form.contact_number}
                      onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      placeholder="09XX XXX XXXX" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-stone-700 text-sm font-medium mb-2">Address *</label>
                    <input type="text" value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-white/80 text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      placeholder="City, Province" />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20">
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
                    <a href="/" className="text-amber-600 font-medium hover:text-amber-700 transition-colors">Sign in here</a>
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