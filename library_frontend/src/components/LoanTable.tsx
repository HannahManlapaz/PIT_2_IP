import React, { useEffect, useState } from 'react';
import { Loan, Member, Book } from '../types';
import { getLoans, createLoan, updateLoan, deleteLoan, getMembers, getBooks } from '../api';
import Modal from './Modal';

const today = () => new Date().toISOString().split('T')[0];
const emptyLoan = (): Omit<Loan, 'id' | 'member_name' | 'book_title' | 'due_date' | 'overdue_days'> => ({
  member: 0, book: 0, loan_date: today(), return_date: null,
});

const LoanTable: React.FC = () => {
  const [loans,   setLoans]   = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [books,   setBooks]   = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<'all'|'active'|'returned'|'overdue'>('all');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<Loan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Loan | null>(null);
  const [form,    setForm]    = useState(emptyLoan());
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [l, m, b] = await Promise.all([getLoans(), getMembers(), getBooks()]);
      setLoans(l); setMembers(m); setBooks(b);
    } catch { setError('Failed to load loans.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyLoan()); setEditing(null); setError(''); setShowForm(true); };
  const openEdit = (loan: Loan) => {
    setForm({ member: loan.member, book: loan.book, loan_date: loan.loan_date, return_date: loan.return_date });
    setEditing(loan); setError(''); setShowForm(true);
  };
  const markReturned = async (loan: Loan) => {
    try { await updateLoan(loan.id, { ...loan, return_date: today() }); await load(); }
    catch { setError('Failed to mark as returned.'); }
  };
  const handleSave = async () => {
    if (!form.member || !form.book) { setError('Member and book are required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateLoan(editing.id, form); else await createLoan(form);
      setShowForm(false); await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save loan.');
    }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteLoan(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete loan.'); }
  };

  const memberName = (id: number) => members.find(m => m.id === id)?.name ?? '—';
  const bookTitle  = (id: number) => books.find(b => b.id === id)?.title ?? '—';
  const isOverdue  = (loan: Loan) => !loan.return_date && (loan.overdue_days ?? 0) > 0;

  const filtered = loans
    .filter(l => {
      if (filter === 'active')   return !l.return_date && !isOverdue(l);
      if (filter === 'returned') return !!l.return_date;
      if (filter === 'overdue')  return isOverdue(l);
      return true;
    })
    .filter(l =>
      memberName(l.member).toLowerCase().includes(search.toLowerCase()) ||
      bookTitle(l.book).toLowerCase().includes(search.toLowerCase())
    );

  const overdueCount = loans.filter(l => isOverdue(l)).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7a6a52]">
      <div className="w-9 h-9 border-[3px] border-[#e2d9c4] border-t-[#6b1d2a] rounded-full animate-spin" />
      <span className="italic">Loading loans…</span>
    </div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-[#e2d9c4] relative">
        <div className="absolute bottom-[-2px] left-0 w-16 h-[2px] bg-[#6b1d2a]" />
        <div>
          <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-3xl font-bold text-[#1a1209]">Loans</h1>
          <p className="text-sm text-[#7a6a52] italic mt-1">Track book borrowing and returns</p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-xs font-semibold">
              ⚠️ {overdueCount} Overdue
            </span>
          )}
          <button onClick={openCreate} className="px-5 py-2 bg-[#6b1d2a] text-white rounded font-semibold hover:bg-[#8c2f3f] transition-colors shadow-sm">
            ＋ New Loan
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      {/* ── Table ── */}
      <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#f5f0e8] border-b border-[#e2d9c4] flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by member or book…"
            className="px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 w-64" />
          <div className="flex items-center gap-2">
            {(['all','active','overdue','returned'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded font-semibold border transition-colors ${
                  filter === f
                    ? f === 'overdue' ? 'bg-red-700 text-white border-red-700' : 'bg-[#6b1d2a] text-white border-[#6b1d2a]'
                    : 'bg-white text-[#3d2f1a] border-[#cfc4aa] hover:bg-[#f5f0e8]'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'overdue' && overdueCount > 0 && (
                  <span className="ml-1 bg-red-200 text-red-800 rounded-full px-1.5 text-xs">{overdueCount}</span>
                )}
              </button>
            ))}
            <span className="text-sm text-[#7a6a52] italic ml-2">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f5f0e8] border-b border-[#cfc4aa]">
              {['Member','Book','Loan Date','Due Date','Return Date','Status','Actions'].map(h => (
                <th key={h} style={{fontFamily:'Playfair Display, serif'}}
                  className="text-left px-4 py-3 text-xs font-semibold tracking-wider uppercase text-[#7a6a52]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-[#7a6a52]">
                <div className="text-4xl mb-3">🔖</div>
                <div style={{fontFamily:'Playfair Display, serif'}} className="text-lg text-[#3d2f1a] mb-1">No loan records found</div>
                <div className="italic text-sm">Create a new loan to get started.</div>
              </td></tr>
            ) : filtered.map(loan => {
              const overdue = isOverdue(loan);
              return (
                <tr key={loan.id} className={`border-b border-[#f0ebe0] transition-colors ${
                  overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-[#fdfaf4]'
                }`}>
                  <td className="px-4 py-3 font-semibold text-[#1a1209]">{memberName(loan.member)}</td>
                  <td className="px-4 py-3 text-[#3d2f1a]">{bookTitle(loan.book)}</td>
                  <td className="px-4 py-3 text-[#3d2f1a]">{loan.loan_date}</td>
                  <td className="px-4 py-3">
                    <span className={overdue ? 'text-red-600 font-semibold' : 'text-[#3d2f1a]'}>
                      {loan.due_date ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#3d2f1a]">
                    {loan.return_date ?? <em className="text-[#7a6a52]">Not yet returned</em>}
                  </td>
                  <td className="px-4 py-3">
                    {loan.return_date ? (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-300">
                        Returned
                      </span>
                    ) : overdue ? (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-300">
                        ⚠️ Overdue {loan.overdue_days}d
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-yellow-50 text-yellow-700 border-yellow-300">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {!loan.return_date && (
                        <button onClick={() => markReturned(loan)}
                          className="px-3 py-1 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors">
                          ↩ Return
                        </button>
                      )}
                      <button onClick={() => openEdit(loan)}
                        className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete(loan)}
                        className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── New/Edit Loan Modal ── */}
      {showForm && (
        <Modal title={editing ? 'Edit Loan' : 'New Loan'} onClose={() => setShowForm(false)}
          footer={<>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Loan'}
            </button>
          </>}>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}

          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Member *</label>
            <select className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.member} onChange={e => setForm({...form, member: parseInt(e.target.value)})}>
              <option value={0}>Select a member…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Book *</label>
            <select className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.book} onChange={e => setForm({...form, book: parseInt(e.target.value)})}>
              <option value={0}>Select a book…</option>
              {books.map(b => (
                <option key={b.id} value={b.id} disabled={!b.available && b.id !== editing?.book}>
                  {b.title}{!b.available && b.id !== editing?.book ? ' (On Loan — Unavailable)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#7a6a52] italic mt-1">Books marked "On Loan" cannot be borrowed.</p>
          </div>

          <div className="mb-4">
            <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Loan Date</label>
            <input type="date" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.loan_date} onChange={e => setForm({...form, loan_date: e.target.value})} />
            <p className="text-xs text-[#7a6a52] italic mt-1">Due date will be auto-set to 14 days from loan date.</p>
          </div>

          {editing && (
            <div>
              <label style={{fontFamily:'Playfair Display, serif'}} className="block text-sm font-semibold text-[#3d2f1a] mb-1">Return Date</label>
              <input type="date" className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.return_date ?? ''} onChange={e => setForm({...form, return_date: e.target.value || null})} />
            </div>
          )}
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <Modal title="Delete Loan Record" onClose={() => setConfirmDelete(null)}
          footer={<>
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">Cancel</button>
            <button onClick={handleDelete} className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-sm font-semibold">Delete</button>
          </>}>
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-[#3d2f1a] mb-1">Delete this loan record?</p>
            <p className="text-sm text-[#7a6a52] italic">{memberName(confirmDelete.member)} → {bookTitle(confirmDelete.book)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LoanTable;