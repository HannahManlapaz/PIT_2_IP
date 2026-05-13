// src/components/AuthorTable.tsx
import React, { useEffect, useState } from 'react';
import { Author } from '../types';
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from '../api';
import Modal from './Modal';

const emptyAuthor = (): Omit<Author, 'id'> => ({ name: '', biography: '', nationality: '' });

const AuthorTable: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState<Author | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Author | null>(null);
  const [form, setForm] = useState(emptyAuthor());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setLoading(true); setAuthors(await getAuthors()); }
    catch { setError('Failed to load authors.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyAuthor()); setEditing(null); setError(''); setShowForm(true); };
  const openEdit = (a: Author) => {
    setForm({ name: a.name, biography: a.biography, nationality: a.nationality });
    setEditing(a); setError(''); setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.name) { setError('Name is required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateAuthor(editing.id, form); else await createAuthor(form);
      setShowForm(false); await load();
    } catch { setError('Failed to save author.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteAuthor(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete author.'); }
  };

  const filtered = authors.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.nationality.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7a6a52]">
      <div className="w-9 h-9 border-[3px] border-[#e2d9c4] border-t-[#6b1d2a] rounded-full animate-spin" />
      <span className="italic">Loading authors…</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-[#e2d9c4] relative">
        <div className="absolute bottom-[-2px] left-0 w-16 h-[2px] bg-[#6b1d2a]" />
        <div>
          <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-3xl font-bold text-[#1a1209]">Authors</h1>
          <p className="text-sm text-[#7a6a52] italic mt-1">Manage author records & biographies</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2 bg-[#6b1d2a] text-white rounded font-semibold hover:bg-[#8c2f3f] transition-colors shadow-sm">
          ＋ Add Author
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#f5f0e8] border-b border-[#e2d9c4] flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or nationality…"
            className="px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 w-64" />
          <span className="text-sm text-[#7a6a52] italic">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f5f0e8] border-b border-[#cfc4aa]">
              {['Name','Nationality','Biography','Actions'].map(h => (
                <th key={h} style={{fontFamily:'Playfair Display, serif'}}
                  className="text-left px-4 py-3 text-xs font-semibold tracking-wider uppercase text-[#7a6a52]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-16 text-[#7a6a52]">
                <div className="text-4xl mb-3">✒️</div>
                <div style={{fontFamily:'Playfair Display, serif'}} className="text-lg text-[#3d2f1a] mb-1">No authors found</div>
                <div className="italic text-sm">Add your first author to get started.</div>
              </td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="border-b border-[#f0ebe0] hover:bg-[#fdfaf4] transition-colors">
                <td className="px-4 py-3 font-semibold text-[#1a1209]">{a.name}</td>
                <td className="px-4 py-3 text-[#3d2f1a]">{a.nationality || '—'}</td>
                <td className="px-4 py-3 text-[#3d2f1a] max-w-xs truncate" title={a.biography}>
                  {a.biography || <em className="text-[#7a6a52]">No biography</em>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(a)} className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors">Edit</button>
                    <button onClick={() => setConfirmDelete(a)} className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Author' : 'Add New Author'} onClose={() => setShowForm(false)}
          footer={<>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Author'}
            </button>
          </>}>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Name *</label>
            <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Author full name" />
          </div>
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Nationality</label>
            <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} placeholder="e.g. Filipino, American…" />
          </div>
          <div>
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Biography</label>
            <textarea className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm min-h-[90px] resize-y"
              value={form.biography} onChange={e => setForm({...form, biography: e.target.value})} placeholder="Short biography…" />
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Author" onClose={() => setConfirmDelete(null)}
          footer={<>
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleDelete} className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-sm font-semibold">Delete</button>
          </>}>
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-[#3d2f1a] mb-1">Delete <strong>{confirmDelete.name}</strong>?</p>
            <p className="text-sm text-[#7a6a52] italic">This will also affect books linked to this author.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuthorTable;