import React, { useEffect, useState, useRef } from 'react';
import { Book, Loan, Reservation } from '../types';
import {
  borrowerGetBooks, borrowerBorrow, borrowerReturnRequest,
  borrowerHistory, logoutApi,
  borrowerReserve, borrowerMyReservations, borrowerCancelReservation
} from '../api';
import libraryIcon from '../assets/library-icon.png';
import loanIcon    from '../assets/loan-icon.png';
import bookIcon    from '../assets/book-icon.png';
import { useNavigate } from 'react-router-dom';

interface Props {
  username: string;
  memberId: number;
  onLogout: () => void;
}

const FEE_PER_DAY = 20; // ₱20 per overdue day

// ─────────────────────────────────────────────
// Book Card
// ─────────────────────────────────────────────
const BookCard: React.FC<{
  book: Book;
  borrowing: number | null;
  reserving: number | null;
  myReservations: Reservation[];
  onBorrow: (book: Book) => void;
  onReserve: (book: Book) => void;
  onCancelReservation: (reservationId: number) => void;
}> = ({ book, borrowing, reserving, myReservations, onBorrow, onReserve, onCancelReservation }) => {
  const [showDesc, setShowDesc] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Find if this borrower has an active reservation for this book
  const myReservation = myReservations.find(
    r => r.book === book.id && (r.status === 'waiting' || r.status === 'ready')
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDesc(false);
      }
    };
    if (showDesc) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDesc]);

  return (
    <div
      ref={ref}
      className="flex flex-col bg-white rounded-lg border border-[#cfc4aa] shadow-sm hover:shadow-lg hover:border-yellow-500 transition-all duration-200 overflow-visible group"
      style={{ position: 'relative' }}
    >
      {/* Cover image */}
      <div className="relative w-full aspect-[2/3] bg-[#f0ebe0] overflow-hidden rounded-t-lg">
        {book.cover_image_url ? (
          <img src={book.cover_image_url} alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-[#cfc4aa]">📖</div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
          book.available
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          {book.available ? 'Available' : 'On Loan'}
        </div>

        {/* "Reserved for You!" ribbon when it's their turn */}
        {myReservation?.status === 'ready' && (
          <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 text-white text-xs font-bold text-center py-1">
            🔔 Ready for you!
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3">
        <h3 style={{ fontFamily: 'Playfair Display, serif' }}
          className="text-sm font-semibold text-[#1a1209] leading-tight mb-1 line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-[#7a6a52] italic mb-1 truncate">{book.author_name}</p>
        <p className="text-xs text-[#cfc4aa]">{book.publication_year}</p>

        {/* Queue position badge */}
        {myReservation?.status === 'waiting' && myReservation.queue_position && (
          <p className="text-xs text-amber-600 font-semibold mt-1">
            📋 Queue #{myReservation.queue_position}
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-col gap-2">

          {/* About button */}
          <div className="flex justify-end relative">
            <button
              onClick={() => setShowDesc(prev => !prev)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${
                showDesc
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              About {showDesc ? '▴' : '▾'}
            </button>

            {showDesc && (
              <div style={{
                position: 'absolute',
                bottom: '110%',
                right: 0,
                width: '220px',
                zIndex: 50,
                backgroundColor: '#fff',
                border: '1px solid #e0ddd6',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                padding: '12px',
                animation: 'fadeUp 0.2s ease',
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: '-7px',
                  right: '18px',
                  width: '13px',
                  height: '13px',
                  backgroundColor: '#fff',
                  border: '1px solid #e0ddd6',
                  borderTop: 'none',
                  borderLeft: 'none',
                  transform: 'rotate(45deg)',
                }} />
                <p className="text-xs text-[#7a6a52] font-bold uppercase tracking-wide mb-1">
                  About this book
                </p>
                <p className="text-xs text-[#555] leading-relaxed">
                  {(book as any).description || 'No description available for this book.'}
                </p>
              </div>
            )}
          </div>

          {/* Action button — Borrow / Reserve / Cancel / Borrow Now */}
          {book.available ? (
            // Book is available — show Borrow
            <button
              onClick={() => onBorrow(book)}
              disabled={borrowing === book.id}
              className="w-full py-1.5 text-xs rounded font-semibold transition-colors bg-[#6b1d2a] text-white hover:bg-[#8c2f3f]"
            >
              {borrowing === book.id ? 'Borrowing…' : 'Borrow'}
            </button>
          ) : myReservation?.status === 'ready' ? (
            // It's their turn! Show Borrow Now
            <button
              onClick={() => onBorrow(book)}
              disabled={borrowing === book.id}
              className="w-full py-1.5 text-xs rounded font-semibold transition-colors bg-yellow-500 text-white hover:bg-yellow-600"
            >
              {borrowing === book.id ? 'Borrowing…' : '⭐ Borrow Now'}
            </button>
          ) : myReservation?.status === 'waiting' ? (
            // Already reserved — show Cancel
            <button
              onClick={() => onCancelReservation(myReservation.id)}
              className="w-full py-1.5 text-xs rounded font-semibold transition-colors bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            >
              ✕ Cancel Reservation
            </button>
          ) : (
            // On Loan, not reserved — show Reserve
            <button
              onClick={() => onReserve(book)}
              disabled={reserving === book.id}
              className="w-full py-1.5 text-xs rounded font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600"
            >
              {reserving === book.id ? 'Reserving…' : '🔖 Reserve'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
const BorrowerDashboard: React.FC<Props> = ({ username, memberId, onLogout }) => {
  const [books,        setBooks]        = useState<Book[]>([]);
  const [history,      setHistory]      = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<'browse' | 'history' | 'reservations'>('browse');
  const [search,       setSearch]       = useState('');
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [borrowing,    setBorrowing]    = useState<number | null>(null);
  const [returning,    setReturning]    = useState<number | null>(null);
  const [reserving,    setReserving]    = useState<number | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const [b, h, r] = await Promise.all([
        borrowerGetBooks(),
        borrowerHistory(),
        borrowerMyReservations(),
      ]);
      setBooks(b); setHistory(h); setReservations(r);
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

  const handleReserve = async (book: Book) => {
    try {
      setReserving(book.id); setError(''); setSuccess('');
      await borrowerReserve(book.id);
      setSuccess(`"${book.title}" has been reserved! We'll notify you when it's available.`);
      await load();
    } catch (e: any) {
      try {
        const msg = JSON.parse(e.message);
        setError(msg.error || 'Failed to reserve book.');
      } catch { setError('Failed to reserve book.'); }
    } finally { setReserving(null); }
  };

  const handleCancelReservation = async (reservationId: number) => {
    try {
      setError(''); setSuccess('');
      await borrowerCancelReservation(reservationId);
      setSuccess('Reservation cancelled successfully.');
      await load();
    } catch { setError('Failed to cancel reservation.'); }
  };

  const handleReturn = async (loan: Loan) => {
    try {
      setReturning(loan.id); setError(''); setSuccess('');
      const res = await borrowerReturnRequest(loan.id);
      setSuccess(res.message || `Return request submitted for "${loan.book_title}".`);
      await load();
    } catch (e: unknown) {
      try {
        const msg = JSON.parse((e as Error).message);
        setError(msg.error || 'Failed to submit return request.');
      } catch { setError('Failed to submit return request.'); }
    } finally { setReturning(null); }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    onLogout();
  };

  const isLoanOpen  = (l: Loan) => !(l.return_verified_date || l.return_date);
  const activeLoans = history.filter(isLoanOpen);
  const isOverdue   = (loan: Loan) => isLoanOpen(loan) && (loan.overdue_days ?? 0) > 0;
  const overdueFee  = (loan: Loan) => (loan.overdue_days ?? 0) * FEE_PER_DAY;

  const totalOutstandingFee = history
    .filter(l => isOverdue(l))
    .reduce((sum, l) => sum + overdueFee(l), 0);

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const activeReservations = reservations.filter(r => r.status === 'waiting' || r.status === 'ready');

  return (
    <div className="min-h-screen bg-[#f5f0e8]">

      {/* Top Nav */}
<nav style={{
  background: 'linear-gradient(90deg, #0f0a06, #1a1209, #0f0a06)',
  borderBottom: '1px solid rgba(180,83,9,0.4)',
  padding: '0 32px',
  height: 64,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  position: 'sticky', top: 0, zIndex: 100,
}}>
  {/* Logo */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <img src={libraryIcon} alt="Librium" style={{ width: 36, height: 36, objectFit: 'contain' }} />
    <div>
      <div style={{ fontFamily: 'Georgia, serif', color: '#f59e0b', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
        Librium
      </div>
      <div style={{ color: '#57534e', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' }}>
        Borrower Portal
      </div>
    </div>
  </div>

  {/* Right side */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  
  {/* Plain text — NOT clickable */}
  <span style={{ color: '#78716c', fontSize: 13 }}>
    Welcome, <strong style={{ color: '#d6d3d1' }}>{username}</strong>
  </span>

  {/* Profile icon — clickable */}
  <button
    onClick={() => navigate('/profile')}
    title="View Profile"
    style={{
      width: 36, height: 36,
      borderRadius: '50%',
      background: 'rgba(245,158,11,0.15)',
      border: '1.5px solid rgba(245,158,11,0.35)',
      color: '#f59e0b',
      fontSize: 16,
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s',
      marginLeft: 8,
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.3)';
      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.15)';
      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
    }}
  >
    👤
  </button>

  {/* Sign out */}
  <button
    onClick={handleLogout}
    style={{
      padding: '7px 16px', fontSize: 12,
      color: '#78716c', background: 'transparent',
      border: '1px solid rgba(120,113,108,0.25)',
      borderRadius: 8, cursor: 'pointer',
      letterSpacing: 1, fontFamily: 'Georgia, serif',
      transition: 'all 0.2s', marginLeft: 4,
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.color = '#78716c';
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(120,113,108,0.25)';
    }}
  >
    Sign Out
  </button>
</div>
</nav>

      <div className="max-w-6xl mx-auto p-8">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
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
          <div className="bg-white rounded-lg border border-[#cfc4aa] p-5 text-center shadow-sm">
            <div className={`text-3xl font-bold ${activeReservations.some(r => r.status === 'ready') ? 'text-yellow-500' : 'text-yellow-600'}`}>
              {activeReservations.length}
            </div>
            <div className="text-sm text-[#7a6a52] italic mt-1">My Reservations</div>
          </div>
        </div>

        {/* Overdue Fee Banner */}
        {totalOutstandingFee > 0 && (
          <div className="mb-6 px-5 py-4 bg-red-50 border border-red-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-700 font-semibold text-sm">You have outstanding overdue fees</p>
                <p className="text-red-500 text-xs italic mt-0.5">
                  Please settle your fees when returning books. Rate: ₱{FEE_PER_DAY}/day per book.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-700">₱{totalOutstandingFee.toLocaleString()}</p>
              <p className="text-xs text-red-500 italic">Total outstanding</p>
            </div>
          </div>
        )}

        {/* Ready reservation banner */}
        {activeReservations.some(r => r.status === 'ready') && (
          <div className="mb-6 px-5 py-4 bg-yellow-50 border border-yellow-400 rounded-lg flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-yellow-800 font-semibold text-sm">A reserved book is ready for you!</p>
              <p className="text-yellow-700 text-xs italic mt-0.5">
                Go to <strong>My Reservations</strong> or find the book in Browse to borrow it now.
              </p>
            </div>
          </div>
        )}

        {/* Alerts */}
        {error   && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm flex items-center gap-2"><span>⚠️</span>{error}</div>}
        {success && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm flex items-center gap-2"><span>✅</span>{success}</div>}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-[#e2d9c4]">
          {(['browse', 'history', 'reservations'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-2 text-sm font-semibold transition-colors border-b-2 -mb-[2px] flex items-center gap-2 ${
                tab === t ? 'border-yellow-600 text-[#1a1209]' : 'border-transparent text-[#7a6a52] hover:text-[#1a1209]'
              }`} style={{ fontFamily: 'Playfair Display, serif' }}>
              <img src={t === 'browse' ? bookIcon : loanIcon} alt={t} className="w-5 h-5 object-contain" />
              {t === 'browse' ? 'Browse Books' : t === 'history' ? 'My Borrowing History' : (
                <span className="flex items-center gap-1">
                  My Reservations
                  {activeReservations.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full font-bold">
                      {activeReservations.length}
                    </span>
                  )}
                </span>
              )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6" style={{ overflow: 'visible' }}>
                {filteredBooks.map(book => (
                  <BookCard
                    key={book.id}
                    book={book}
                    borrowing={borrowing}
                    reserving={reserving}
                    myReservations={reservations}
                    onBorrow={handleBorrow}
                    onReserve={handleReserve}
                    onCancelReservation={handleCancelReservation}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── My Reservations Tab ── */}
        {tab === 'reservations' && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-[#7a6a52] italic">Loading reservations…</div>
            ) : activeReservations.length === 0 ? (
              <div className="text-center py-20 text-[#7a6a52]">
                <div className="text-5xl mb-4">🔖</div>
                <div style={{ fontFamily: 'Playfair Display, serif' }} className="text-xl text-[#3d2f1a] mb-1">No active reservations</div>
                <div className="italic text-sm">When a book is On Loan, click Reserve to join the waitlist!</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#ede5d0] text-[#3d2f1a] text-left border-b-2 border-yellow-600">
                      {['Book', 'Reserved On', 'Queue Position', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ fontFamily: 'Playfair Display, serif' }}
                          className="px-5 py-3 font-semibold text-xs tracking-wider uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReservations.map((res, i) => (
                      <tr key={res.id} className={`border-t border-[#ede5d0] transition-colors ${
                        res.status === 'ready' ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white hover:bg-[#faf7f2]' : 'bg-[#fdf9f4] hover:bg-[#faf7f2]'
                      }`}>
                        {/* Book */}
                        <td className="px-5 py-3 font-semibold text-[#1a1209]">{res.book_title}</td>

                        {/* Reserved On */}
                        <td className="px-5 py-3 text-[#7a6a52]">{res.reserved_date}</td>

                        {/* Queue Position */}
                        <td className="px-5 py-3">
                          {res.status === 'ready' ? (
                            <span className="text-yellow-600 font-bold">🎉 Your turn!</span>
                          ) : (
                            <span className="text-amber-700 font-semibold">#{res.queue_position ?? '—'} in queue</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          {res.status === 'ready' ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 font-semibold">
                              🔔 Ready to Borrow
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 font-semibold">
                              ⏳ Waiting
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3">
                          {res.status === 'ready' ? (
                            <button
                              onClick={() => {
                                const book = books.find(b => b.id === res.book);
                                if (book) handleBorrow(book);
                              }}
                              className="px-3 py-1 text-xs bg-yellow-500 text-white rounded font-semibold hover:bg-yellow-600 transition-colors"
                            >
                              ⭐ Borrow Now
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelReservation(res.id)}
                              className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                            >
                              ✕ Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Borrowing History Tab ── */}
        {tab === 'history' && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-[#7a6a52] italic">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-[#7a6a52]">
                <div className="text-5xl mb-4">📭</div>
                <div style={{ fontFamily: 'Playfair Display, serif' }} className="text-xl text-[#3d2f1a] mb-1">No borrowing history yet</div>
                <div className="italic text-sm">Browse books and start borrowing!</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#ede5d0] text-[#3d2f1a] text-left border-b-2 border-yellow-600">
                      {['Book', 'Loan Date', 'Due Date', 'Return Date', 'Status', 'Overdue Fee', 'Action'].map(h => (
                        <th key={h} style={{ fontFamily: 'Playfair Display, serif' }}
                          className="px-5 py-3 font-semibold text-xs tracking-wider uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((loan, i) => {
                      const overdue    = isOverdue(loan);
                      const isRejected = loan.return_status === 'rejected';
                      const fee        = overdueFee(loan);

                      return (
                        <tr key={loan.id} className={`border-t border-[#ede5d0] transition-colors ${
                          overdue ? 'bg-red-50 hover:bg-red-100' : i % 2 === 0 ? 'bg-white hover:bg-[#faf7f2]' : 'bg-[#fdf9f4] hover:bg-[#faf7f2]'
                        }`}>
                          <td className="px-5 py-3 font-semibold text-[#1a1209]">{loan.book_title}</td>
                          <td className="px-5 py-3 text-[#7a6a52]">{loan.loan_date}</td>
                          <td className="px-5 py-3">
                            <span className={overdue ? 'text-red-600 font-semibold' : 'text-[#7a6a52]'}>
                              {loan.due_date ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[#7a6a52]">
                            {loan.return_verified_date ?? loan.return_date ?? (
                              isRejected ? (
                                <em className="text-red-500">Return rejected</em>
                              ) : loan.return_requested_date ? (
                                <em className="text-amber-700">Awaiting staff verification</em>
                              ) : (
                                <em className="text-[#cfc4aa]">Not yet returned</em>
                              )
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {loan.return_verified_date || loan.return_date ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">Returned</span>
                            ) : isRejected ? (
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-semibold w-fit">✕ Return Rejected</span>
                                {loan.notes && (
                                  <p className="text-xs text-red-500 italic max-w-[180px]" title={loan.notes}>"{loan.notes}"</p>
                                )}
                              </div>
                            ) : loan.return_requested_date ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 font-semibold">Pending verification</span>
                            ) : overdue ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-semibold">⚠️ Overdue {loan.overdue_days}d</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold">Active</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {overdue && fee > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-red-600 font-bold text-sm">₱{fee.toLocaleString()}</span>
                                <span className="text-red-400 text-xs italic">{loan.overdue_days}d × ₱{FEE_PER_DAY}</span>
                              </div>
                            ) : loan.return_verified_date || loan.return_date ? (
                              <span className="text-green-600 text-xs font-semibold">Cleared</span>
                            ) : (
                              <span className="text-[#cfc4aa] text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {!loan.return_verified_date && !loan.return_date && (
                              isRejected ? (
                                <button onClick={() => handleReturn(loan)} disabled={returning === loan.id}
                                  className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors disabled:opacity-60">
                                  {returning === loan.id ? 'Submitting…' : '↩ Re-request Return'}
                                </button>
                              ) : !loan.return_requested_date ? (
                                <button onClick={() => handleReturn(loan)} disabled={returning === loan.id}
                                  className="px-3 py-1 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors disabled:opacity-60">
                                  {returning === loan.id ? 'Submitting…' : '↩ Request Return'}
                                </button>
                              ) : (
                                <span className="text-xs text-amber-700 italic">Pending…</span>
                              )
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