// src/components/MemberTable.tsx
import React, { useEffect, useState } from 'react';
import { Member } from '../types';
import { getMembers, createMember, updateMember, deleteMember } from '../api';
import Modal from './Modal';

const emptyMember = (): Omit<Member, 'id'> => ({
  name: '', email: '', contact_number: '', join_date: new Date().toISOString().split('T')[0], address: '',
});

const MemberTable: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState<Member | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyMember());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setLoading(true); setMembers(await getMembers()); }
    catch { setError('Failed to load members.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyMember()); setEditing(null); setError(''); setShowForm(true); };
  const openEdit = (m: Member) => {
    setForm({ name: m.name, email: m.email, contact_number: m.contact_number, join_date: m.join_date, address: m.address });
    setEditing(m); setError(''); setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateMember(editing.id, form); else await createMember(form);
      setShowForm(false); await load();
    } catch { setError('Failed to save member.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteMember(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete member.'); }
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7a6a52]">
      <div className="w-9 h-9 border-[3px] border-[#e2d9c4] border-t-[#6b1d2a] rounded-full animate-spin" />
      <span className="italic">Loading members…</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-[#e2d9c4] relative">
        <div className="absolute bottom-[-2px] left-0 w-16 h-[2px] bg-[#6b1d2a]" />
        <div>
          <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-3xl font-bold text-[#1a1209]">Members</h1>
          <p className="text-sm text-[#7a6a52] italic mt-1">Manage library membership records</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2 bg-[#6b1d2a] text-white rounded font-semibold hover:bg-[#8c2f3f] transition-colors shadow-sm">
          ＋ Add Member
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#f5f0e8] border-b border-[#e2d9c4] flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 w-64" />
          <span className="text-sm text-[#7a6a52] italic">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f5f0e8] border-b border-[#cfc4aa]">
              {['', 'Name', 'Email', 'Contact', 'Joined', 'Address', 'Actions'].map(h => (
                <th key={h} style={{fontFamily:'Playfair Display, serif'}}
                  className="text-left px-4 py-3 text-xs font-semibold tracking-wider uppercase text-[#7a6a52]">{h === '' ? 'Photo' : h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-[#7a6a52]">
                <div className="text-4xl mb-3">🎓</div>
                <div style={{fontFamily:'Playfair Display, serif'}} className="text-lg text-[#3d2f1a] mb-1">No members found</div>
                <div className="italic text-sm">Add your first library member.</div>
              </td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} className="border-b border-[#f0ebe0] hover:bg-[#fdfaf4] transition-colors">
                <td className="px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6b1d2a] to-[#8c2f3f] flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {getInitials(m.name)}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-[#1a1209]">{m.name}</td>
                <td className="px-4 py-3 text-xs text-[#3d2f1a]">{m.email}</td>
                <td className="px-4 py-3 text-[#3d2f1a]">{m.contact_number || '—'}</td>
                <td className="px-4 py-3 text-[#3d2f1a]">{m.join_date}</td>
                <td className="px-4 py-3 text-[#3d2f1a] max-w-[180px] truncate" title={m.address}>{m.address || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)} className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors">Edit</button>
                    <button onClick={() => setConfirmDelete(m)} className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Member' : 'Add New Member'} onClose={() => setShowForm(false)}
          footer={<>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'}
            </button>
          </>}>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Full Name *</label>
              <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" />
            </div>
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Email *</label>
              <input type="email" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Contact Number</label>
              <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} placeholder="+63 9XX XXX XXXX" />
            </div>
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Join Date</label>
              <input type="date" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Address</label>
            <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Home address" />
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Member" onClose={() => setConfirmDelete(null)}
          footer={<>
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleDelete} className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-sm font-semibold">Delete</button>
          </>}>
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-[#3d2f1a] mb-1">Delete member <strong>{confirmDelete.name}</strong>?</p>
            <p className="text-sm text-[#7a6a52] italic">Their loan history will also be removed.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MemberTable;