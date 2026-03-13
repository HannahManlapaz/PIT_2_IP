import React, { useEffect, useState } from 'react';
import { Book, Author } from '../types';
import { getBooks, createBook, updateBook, deleteBook, getAuthors } from '../api';
import Modal from './Modal';

const emptyBook = (): Omit<Book, 'id' | 'author_name'> => ({
  title: '', isbn: '', publication_year: new Date().getFullYear(), author: 0, available: true,
});

const BookTable: React.FC = () => {
  const [books, setBooks]     = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState<Book | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyBook());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [b, a] = await Promise.all([getBooks(), getAuthors()]);
      setBooks(b); setAuthors(a);
    } catch { setError('Failed to load books.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyBook()); setEditing(null); setError(''); setShowForm(true); };
  const openEdit = (book: Book) => {
    setForm({ title: book.title, isbn: book.isbn, publication_year: book.publication_year, author: book.author, available: book.available });
    setEditing(book); setError(''); setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.title || !form.isbn || !form.author) { setError('Please fill in all required fields.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateBook(editing.id, form); else await createBook(form);
      setShowForm(false); await load();
    } catch { setError('Failed to save book.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteBook(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete book.'); }
  };

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) || b.isbn.includes(search)
  );
  const authorName = (id: number) => authors.find(a => a.id === id)?.name ?? '—';

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7a6a52]">
      <div className="w-9 h-9 border-[3px] border-[#e2d9c4] border-t-[#6b1d2a] rounded-full animate-spin" />
      <span className="italic">Loading books…</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-[#e2d9c4] relative">
        <div className="absolute bottom-[-2px] left-0 w-16 h-[2px] bg-[#6b1d2a]" />
        <div>
          <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-3xl font-bold text-[#1a1209]">Books</h1>
          <p className="text-sm text-[#7a6a52] italic mt-1">Manage the library collection</p>
        </div>
        <button onClick={openCreate}
          className="px-5 py-2 bg-[#6b1d2a] text-white rounded font-semibold hover:bg-[#8c2f3f] transition-colors shadow-sm">
          ＋ Add Book
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#f5f0e8] border-b border-[#e2d9c4] flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or ISBN…"
            className="px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 w-64" />
          <span className="text-sm text-[#7a6a52] italic">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f5f0e8] border-b border-[#cfc4aa]">
              {['Title','ISBN','Year','Author','Status','Actions'].map(h => (
                <th key={h} style={{fontFamily:'Playfair Display, serif'}}
                  className="text-left px-4 py-3 text-xs font-semibold tracking-wider uppercase text-[#7a6a52]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-[#7a6a52]">
                <div className="text-4xl mb-3">📭</div>
                <div style={{fontFamily:'Playfair Display, serif'}} className="text-lg text-[#3d2f1a] mb-1">No books found</div>
                <div className="italic text-sm">Try a different search or add a new book.</div>
              </td></tr>
            ) : filtered.map(book => (
              <tr key={book.id} className="border-b border-[#f0ebe0] hover:bg-[#fdfaf4] transition-colors">
                <td className="px-4 py-3 font-semibold text-[#1a1209]">{book.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#3d2f1a]">{book.isbn}</td>
                <td className="px-4 py-3 text-[#3d2f1a]">{book.publication_year}</td>
                <td className="px-4 py-3 text-[#3d2f1a]">{authorName(book.author)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                    book.available ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'
                  }`}>{book.available ? 'Available' : 'On Loan'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(book)} className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors">Edit</button>
                    <button onClick={() => setConfirmDelete(book)} className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Book' : 'Add New Book'} onClose={() => setShowForm(false)}
          footer={<>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Book'}
            </button>
          </>}>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Title *</label>
            <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Book title" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">ISBN *</label>
              <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} placeholder="978-..." />
            </div>
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Year</label>
              <input type="number" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.publication_year} onChange={e => setForm({...form, publication_year: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Author *</label>
            <select className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.author} onChange={e => setForm({...form, author: parseInt(e.target.value)})}>
              <option value={0}>Select an author…</option>
              {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#3d2f1a]">
            <input type="checkbox" checked={form.available} onChange={e => setForm({...form, available: e.target.checked})} className="accent-[#6b1d2a] w-4 h-4" />
            Available for borrowing
          </label>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Book" onClose={() => setConfirmDelete(null)}
          footer={<>
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleDelete} className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-sm font-semibold">Delete</button>
          </>}>
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-[#3d2f1a] mb-1">Delete <strong>"{confirmDelete.title}"</strong>?</p>
            <p className="text-sm text-[#7a6a52] italic">This action cannot be undone.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BookTable;