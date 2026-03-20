import React, { useEffect, useState } from 'react';
import { Book, Loan } from '../types';
import { borrowerGetBooks, borrowerBorrow, borrowerReturn, borrowerHistory, logoutApi } from '../api';
import libraryIcon from '../assets/library-icon.png';

interface Props {
  username: string;
  memberId: number;
  onLogout: () => void;
}

const BorrowerDashboard: React.FC<Props> = ({ username, memberId, onLogout }) => {
  const [books,   setBooks]   = useState<Book[]>([]);
  const [history, setHistory] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'browse' | 'history'>('browse');
  const [search,  setSearch]  = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [borrowing, setBorrowing] = useState<number | null>(null);
  const [returning, setReturning] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [b, h] = await Promise.all([borrowerGetBooks(), borrowerHistory()]);
      setBooks(b); setHistory(h);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleBorrow = async (book: Book) => {
    try {
      setBorrowing(book.id); setError(''); setSuccess('');
      await borrowerBorrow(book.id);
      setSuccess(`Successfully borrowed "${book.title}"! Due in 14 days.`);
      await load();
    } catch (e: any) {
      try {
        const msg = JSON.parse(e.message);
        setError(msg.error || 'Failed to borrow book.');
      } catch { setError('Failed to borrow book.'); }
    } finally { setBorrowing(null); }
  };

  const handleReturn = async (loan: Loan) => {
    try {
      setReturning(loan.id); setError(''); setSuccess('');
      await borrowerReturn(loan.id);
      setSuccess(`Successfully returned "${loan.book_title}"!`);
      await load();
    } catch { setError('Failed to return book.'); }
    finally { setReturning(null); }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    onLogout();
  };

  const activeLoans = history.filter(l => !l.return_date);
  const isOverdue   = (loan: Loan) => !loan.return_date && (loan.overdue_days ?? 0) > 0;

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* ── Top Nav ── */}
      <nav className="bg-[#1a1209] border-b-2 border-yellow-600 px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <img src={libraryIcon} alt="Bibliotheca" className="w-10 h-10 object-contain" />
          <div>
            <div style={{fontFamily:'Playfair Display, serif'}} className="text-yellow-500 text-lg font-bold">Bibliotheca</div>
            <div className="text-[#7a6a52] text-xs tracking-widest uppercase">Library Borrower Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#c8bfad] text-sm">Welcome, <strong className="text-yellow-400">{username}</strong></span>
          <button onClick={handleLogout}
            className="px-4 py-2 text-sm text-[#c8bfad] hover:text-red-400 border border-transparent hover:border-red-900/40 hover:bg-red-900/20 rounded transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-[#cfc4aa] p-5 text-center shadow-sm">
            <div className="text-3xl font-bold text-yellow-600">{books.filter(b => b.available).length}</div>
            <div className="text-sm text-[#7a6a52] italic mt-1">Available Books</div>
          </div>
          <div className="bg-white rounded-lg border border-[#cfc4aa] p-5 text-center shadow-sm">
            <div className="text-3xl font-bold text-yellow-600">{activeLoans.length}</div>
            <div className="text-sm text-[#7a6a52] italic mt-1">Currently Borrowed</div>
          </div>
          <div className="bg-white rounded-lg border border-[#cfc4aa] p-5 text-center shadow-sm">
            <div className={`text-3xl font-bold ${history.filter(l => isOverdue(l)).length > 0 ? 'text-red-500' : 'text-yellow-600'}`}>
              {history.filter(l => isOverdue(l)).length}
            </div>
            <div className="text-sm text-[#7a6a52] italic mt-1">Overdue</div>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error   && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm flex items-center gap-2"><span>⚠️</span>{error}</div>}
        {success && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm flex items-center gap-2"><span>✅</span>{success}</div>}

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6 border-b-2 border-[#e2d9c4]">
          {(['browse', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-2 text-sm font-semibold transition-colors border-b-2 -mb-[2px] ${
                tab === t ? 'border-yellow-600 text-[#1a1209]' : 'border-transparent text-[#7a6a52] hover:text-[#1a1209]'
              }`} style={{fontFamily:'Playfair Display, serif'}}>
              {t === 'browse' ? '📚 Browse Books' : '📋 My Borrowing History'}
            </button>
          ))}
        </div>

        {/* ── Browse Books ── */}
        {tab === 'browse' && (
          <div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full max-w-md px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 mb-6 shadow-sm" />

            {loading ? (
              <div className="text-center py-20 text-[#7a6a52] italic">Loading books…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredBooks.map(book => (
                  <div key={book.id} className="flex flex-col bg-white rounded-lg border border-[#cfc4aa] shadow-sm hover:shadow-lg hover:border-yellow-500 transition-all duration-200 overflow-hidden group">
                    <div className="relative w-full aspect-[2/3] bg-[#f0ebe0] overflow-hidden">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-[#cfc4aa]">📖</div>
                      )}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        book.available ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'
                      }`}>
                        {book.available ? 'Available' : 'On Loan'}
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 p-3">
                      <h3 style={{fontFamily:'Playfair Display, serif'}} className="text-sm font-semibold text-[#1a1209] leading-tight mb-1 line-clamp-2">{book.title}</h3>
                      <p className="text-xs text-[#7a6a52] italic mb-1 truncate">{book.author_name}</p>
                      <p className="text-xs text-[#cfc4aa] mb-3">{book.publication_year}</p>
                      <button
                        onClick={() => handleBorrow(book)}
                        disabled={!book.available || borrowing === book.id}
                        className={`mt-auto w-full py-1.5 text-xs rounded font-semibold transition-colors ${
                          book.available
                            ? 'bg-[#6b1d2a] text-white hover:bg-[#8c2f3f]'
                            : 'bg-[#e2d9c4] text-[#cfc4aa] cursor-not-allowed'
                        }`}>
                        {borrowing === book.id ? 'Borrowing…' : book.available ? 'Borrow' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Borrowing History ── */}
        {tab === 'history' && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-[#7a6a52] italic">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-[#7a6a52]">
                <div className="text-5xl mb-4">📭</div>
                <div style={{fontFamily:'Playfair Display, serif'}} className="text-xl text-[#3d2f1a] mb-1">No borrowing history yet</div>
                <div className="italic text-sm">Browse books and start borrowing!</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#ede5d0] text-[#3d2f1a] text-left border-b-2 border-yellow-600">
                      {['Book', 'Loan Date', 'Due Date', 'Return Date', 'Status', 'Action'].map(h => (
                        <th key={h} style={{fontFamily:'Playfair Display, serif'}} className="px-5 py-3 font-semibold text-xs tracking-wider uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((loan, i) => {
                      const overdue = isOverdue(loan);
                      return (
                        <tr key={loan.id} className={`border-t border-[#ede5d0] transition-colors ${
                          overdue ? 'bg-red-50 hover:bg-red-100' : i % 2 === 0 ? 'bg-white hover:bg-[#faf7f2]' : 'bg-[#fdf9f4] hover:bg-[#faf7f2]'
                        }`}>
                          <td className="px-5 py-3 font-semibold text-[#1a1209]">{loan.book_title}</td>
                          <td className="px-5 py-3 text-[#7a6a52]">{loan.loan_date}</td>
                          <td className="px-5 py-3">
                            <span className={overdue ? 'text-red-600 font-semibold' : 'text-[#7a6a52]'}>{loan.due_date ?? '—'}</span>
                          </td>
                          <td className="px-5 py-3 text-[#7a6a52]">{loan.return_date ?? <em className="text-[#cfc4aa]">Not yet returned</em>}</td>
                          <td className="px-5 py-3">
                            {loan.return_date ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">Returned</span>
                            ) : overdue ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-semibold">⚠️ Overdue {loan.overdue_days}d</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold">Active</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {!loan.return_date && (
                              <button onClick={() => handleReturn(loan)} disabled={returning === loan.id}
                                className="px-3 py-1 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors disabled:opacity-60">
                                {returning === loan.id ? 'Returning…' : '↩ Return'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowerDashboard;