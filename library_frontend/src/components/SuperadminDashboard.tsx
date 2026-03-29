import React, { useEffect, useState } from 'react';
import {
  superadminGetStats, superadminGetStaff,
  superadminCreateStaff, superadminToggleStaff,
  superadminDeleteStaff, 
} from '../api';
import libraryIcon from '../assets/library-icon.png';
import { StaffUser, SuperadminStats } from '../types';

interface Props {
  username: string;
  onLogout: () => void;
}

const SuperadminDashboard: React.FC<Props> = ({ username, onLogout }) => {
  const [stats,   setStats]   = useState<SuperadminStats | null>(null);
  const [staff,   setStaff]   = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: '', password: '', email: '', first_name: '', last_name: ''
  });

  const load = async () => {
    try {
      setLoading(true);
      const [s, st] = await Promise.all([superadminGetStats(), superadminGetStaff()]);
      setStats(s); setStaff(st);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.username || !form.password) { setError('Username and password are required.'); return; }
    try {
      setSaving(true); setError(''); setSuccess('');
      await superadminCreateStaff(form);
      setSuccess(`Staff account "${form.username}" created successfully!`);
      setForm({ username: '', password: '', email: '', first_name: '', last_name: '' });
      setShowForm(false);
      await load();
    } catch (e: any) {
      try { const msg = JSON.parse(e.message); setError(Object.values(msg).flat().join(' ')); }
      catch { setError('Failed to create staff.'); }
    } finally { setSaving(false); }
  };

  const handleToggle = async (s: StaffUser) => {
    try {
      setError(''); setSuccess('');
      await superadminToggleStaff(s.id);
      setSuccess(`${s.username} has been ${s.is_active ? 'deactivated' : 'activated'}.`);
      await load();
    } catch { setError('Failed to update staff status.'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setError(''); setSuccess('');
      await superadminDeleteStaff(confirmDelete.id);
      setSuccess(`${confirmDelete.username} has been deleted.`);
      setConfirmDelete(null);
      await load();
    } catch { setError('Failed to delete staff.'); }
  };

  const handleLogout = async () => {
    try { await import('../api').then(api => api.logoutApi()); } catch {}
    onLogout();
  };

  const statCards = [
    { label: 'Total Books',   value: stats?.total_books,   color: 'text-yellow-600' },
    { label: 'Total Authors', value: stats?.total_authors, color: 'text-yellow-600' },
    { label: 'Total Members', value: stats?.total_members, color: 'text-yellow-600' },
    { label: 'Active Loans',  value: stats?.active_loans,  color: 'text-red-500'    },
    { label: 'Total Loans',   value: stats?.total_loans,   color: 'text-yellow-600' },
    { label: 'Total Staff',   value: stats?.total_staff,   color: 'text-yellow-600' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* ── Top Nav ── */}
      <nav className="bg-[#1a1209] border-b-2 border-yellow-600 px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <img src={libraryIcon} alt="Librium" className="w-10 h-10 object-contain" />
          <div>
            <div style={{fontFamily:'Playfair Display, serif'}} className="text-yellow-500 text-lg font-bold">Librium</div>
            <div className="text-[#7a6a52] text-xs tracking-widest uppercase">Super Admin Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-yellow-900/40 border border-yellow-700 rounded-full text-yellow-400 text-xs font-semibold">
            👑 Superadmin
          </span>
          <span className="text-[#c8bfad] text-sm">Welcome, <strong className="text-yellow-400">{username}</strong></span>
          <button onClick={handleLogout}
            className="px-4 py-2 text-sm text-[#c8bfad] hover:text-red-400 border border-transparent hover:border-red-900/40 hover:bg-red-900/20 rounded transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8 space-y-8">

        {/* ── Alerts ── */}
        {error   && <div className="px-4 py-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm flex items-center gap-2"><span>⚠️</span>{error}</div>}
        {success && <div className="px-4 py-3 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm flex items-center gap-2"><span>✅</span>{success}</div>}

        {/* ── Stats ── */}
        <div>
          <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-xl font-semibold text-[#1a1209] mb-3">System Overview</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {statCards.map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg border border-[#cfc4aa] p-4 text-center shadow-sm">
                {loading ? <div className="w-8 h-7 bg-[#ede5d0] rounded animate-pulse mx-auto mb-1" /> : <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>}
                <div className="text-xs text-[#7a6a52] italic mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Staff Management ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-xl font-semibold text-[#1a1209]">
              Staff Accounts
            </h2>
            <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
              className="px-5 py-2 bg-[#6b1d2a] text-white rounded font-semibold hover:bg-[#8c2f3f] transition-colors shadow-sm text-sm">
              ＋ Create Staff Account
            </button>
          </div>

          {/* Create Staff Form */}
          {showForm && (
            <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm p-6 mb-4">
              <h3 style={{fontFamily:'Playfair Display, serif'}} className="text-lg font-semibold text-[#1a1209] mb-4">New Staff Account</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Username *</label>
                  <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                    value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="librarian01" />
                </div>
                <div>
                  <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Password *</label>
                  <input type="password" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
                </div>
                <div>
                  <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">First Name</label>
                  <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                    value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="Juan" />
                </div>
                <div>
                  <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Last Name</label>
                  <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                    value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="dela Cruz" />
                </div>
                <div className="col-span-2">
                  <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Email</label>
                  <input type="email" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="juan@library.com" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          {/* Staff Table */}
          <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-[#7a6a52] italic">Loading staff...</div>
            ) : staff.length === 0 ? (
              <div className="p-8 text-center text-[#7a6a52] italic">
                <div className="text-4xl mb-3">👥</div>
                <div style={{fontFamily:'Playfair Display, serif'}} className="text-lg text-[#3d2f1a] mb-1">No staff accounts yet</div>
                <div className="text-sm">Create a staff account to get started.</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#ede5d0] text-[#3d2f1a] text-left border-b-2 border-yellow-600">
                    {['Username', 'Name', 'Email', 'Date Joined', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{fontFamily:'Playfair Display, serif'}}
                        className="px-5 py-3 font-semibold text-xs tracking-wider uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s, i) => (
                    <tr key={s.id} className={`border-t border-[#ede5d0] hover:bg-[#faf7f2] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fdf9f4]'}`}>
                      <td className="px-5 py-3 font-semibold text-[#1a1209]">{s.username}</td>
                      <td className="px-5 py-3 text-[#3d2f1a]">{[s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td className="px-5 py-3 text-[#7a6a52]">{s.email || '—'}</td>
                      <td className="px-5 py-3 text-[#7a6a52]">{new Date(s.date_joined).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                          s.is_active ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleToggle(s)}
                            className={`px-3 py-1 text-xs border rounded transition-colors ${
                              s.is_active
                                ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50'
                            }`}>
                            {s.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => setConfirmDelete(s)}
                            className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-[#3d2f1a] font-semibold mb-1">Delete staff account?</p>
            <p className="text-sm text-[#7a6a52] italic mb-6">"{confirmDelete.username}" will be permanently deleted.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDashboard;