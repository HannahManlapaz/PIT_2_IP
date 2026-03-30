import React, { useEffect, useState } from 'react';
import { Book, Author } from '../types';
import { getBooks, createBook, updateBook, deleteBook, getAuthors } from '../api';
import Modal from './Modal';

const emptyBook = (): Omit<Book, 'id' | 'author_name' | 'cover_image_url'> => ({
  title: '', isbn: '', publication_year: new Date().getFullYear(),
  author: 0, available: true, cover_image: null,
  description: '',  // description field default
});

const BookTable: React.FC = () => {
  const [books,   setBooks]   = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<Book | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null);
  const [form,    setForm]    = useState(emptyBook());
  const [saving,  setSaving]  = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile,    setImageFile]    = useState<File | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [b, a] = await Promise.all([getBooks(), getAuthors()]);
      setBooks(b); setAuthors(a);
    } catch { setError('Failed to load books.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyBook()); setEditing(null);
    setImagePreview(null); setImageFile(null);
    setError(''); setShowForm(true);
  };

  const openEdit = (book: Book) => {
    setForm({
      title: book.title, isbn: book.isbn, publication_year: book.publication_year,
      author: book.author, available: book.available, cover_image: book.cover_image ?? null,
      description: (book as any).description ?? '',  // load existing description
    });
    setImagePreview(book.cover_image_url ?? null);
    setImageFile(null);
    setEditing(book); setError(''); setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm(f => ({ ...f, cover_image: file }));
  };

  const handleSave = async () => {
    if (!form.title || !form.isbn || !form.author) {
        setError('Please fill in all required fields.');
        return;
    }
    try {
        setSaving(true); setError('');
        
        const payload = { ...form, cover_image: imageFile ?? form.cover_image };
        if (editing) await updateBook(editing.id, payload);
        else await createBook(payload);
        setShowForm(false);
        await load();
    } catch {
        setError('Failed to save book.');
    } finally {
        setSaving(false);
    }
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
      {/* ── Header ── */}
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

      {/* ── Search bar ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or ISBN…"
          className="px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 w-72 shadow-sm" />
        <span className="text-sm text-[#7a6a52] italic">{filtered.length} book{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Book Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#7a6a52]">
          <div className="text-5xl mb-4">📭</div>
          <div style={{fontFamily:'Playfair Display, serif'}} className="text-xl text-[#3d2f1a] mb-1">No books found</div>
          <div className="italic text-sm">Try a different search or add a new book.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filtered.map(book => (
            <div key={book.id}
              className="group flex flex-col bg-white rounded-lg border border-[#cfc4aa] shadow-sm hover:shadow-lg hover:border-yellow-500 transition-all duration-200 overflow-hidden">

              {/* Cover Image */}
              <div className="relative w-full aspect-[2/3] bg-[#f0ebe0] overflow-hidden">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl text-[#cfc4aa]">📖</span>
                    <span className="text-xs text-[#cfc4aa] italic px-2 text-center">No cover</span>
                  </div>
                )}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  book.available
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {book.available ? 'Available' : 'On Loan'}
                </div>
              </div>

              {/* Book Info */}
              <div className="flex flex-col flex-1 p-3">
                <h3 style={{fontFamily:'Playfair Display, serif'}}
                  className="text-sm font-semibold text-[#1a1209] leading-tight mb-1 line-clamp-2">
                  {book.title}
                </h3>
                <p className="text-xs text-[#7a6a52] italic mb-1 truncate">{authorName(book.author)}</p>
                <p className="text-xs text-[#cfc4aa] mb-3">{book.publication_year}</p>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openEdit(book)}
                    className="flex-1 py-1.5 text-xs border border-yellow-600 text-yellow-700 rounded hover:bg-yellow-50 transition-colors font-semibold">
                    Edit
                  </button>
                  <button onClick={() => setConfirmDelete(book)}
                    className="flex-1 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors font-semibold">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <Modal title={editing ? 'Edit Book' : 'Add New Book'} onClose={() => setShowForm(false)}
          footer={<>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Book'}
            </button>
          </>}>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}

          {/* Cover Image Upload */}
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-2">
              Cover Image
            </label>
            <div className="flex items-start gap-4">
              <div className="w-20 h-28 bg-[#f0ebe0] rounded border border-[#e2d9c4] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                {imagePreview ? (
                  <img src={imagePreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-[#cfc4aa]">📖</span>
                )}
              </div>
              <div className="flex-1">
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-[#cfc4aa] rounded cursor-pointer hover:border-yellow-500 hover:bg-[#fdf6e3] transition-all">
                  <span className="text-xs text-[#7a6a52]">Click to upload</span>
                  <span className="text-xs text-[#cfc4aa] mt-1">PNG, JPG up to 5MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {imageFile && (
                  <p className="text-xs text-[#7a6a52] mt-1 truncate">{imageFile.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Title *</label>
            <input className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Book title" />
          </div>

          {/* ISBN + Year */}
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

          {/* Author */}
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Author *</label>
            <select className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.author} onChange={e => setForm({...form, author: parseInt(e.target.value)})}>
              <option value={0}>Select an author…</option>
              {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* ✅ Description field — staff can add/edit book description here */}
          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm resize-none"
              rows={4}
              placeholder="Write a short description about this book…"
              value={(form as any).description ?? ''}
              onChange={e => setForm({...form, description: e.target.value} as any)}
            />
            <p className="text-xs text-[#cfc4aa] mt-1 italic">
              This will show when borrowers click the About button.
            </p>
          </div>

          {/* Available checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#3d2f1a]">
            <input type="checkbox" checked={form.available} onChange={e => setForm({...form, available: e.target.checked})} className="accent-[#6b1d2a] w-4 h-4" />
            Available for borrowing
          </label>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
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