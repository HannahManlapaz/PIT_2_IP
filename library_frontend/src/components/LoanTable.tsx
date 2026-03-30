import React, { useEffect, useState } from 'react';
import { Loan, Member, Book } from '../types';
import { getLoans, createLoan, updateLoan, deleteLoan, getMembers, getBooks, verifyReturn, rejectReturn } from '../api';
import Modal from './Modal';

const today = () => new Date().toISOString().split('T')[0];
const emptyLoan = (): Omit<Loan, 'id' | 'member_name' | 'book_title' | 'overdue_days'> => ({
  member: 0, book: 0, loan_date: today(), due_date: null, return_date: null,
});

const FEE_PER_DAY = 20; // ₱20 per overdue day

const LoanTable: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'active'|'returned'|'overdue'|'pending'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Loan | null>(null);
  const [verifyModal, setVerifyModal] = useState<Loan | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectModal, setRejectModal] = useState<Loan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState(emptyLoan());
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [collapsedMembers, setCollapsedMembers] = useState<Set<number>>(new Set());

  const load = async () => {
    try {
      setLoading(true);
      const [l, m, b] = await Promise.all([getLoans(), getMembers(), getBooks()]);
      setLoans(l); setMembers(m); setBooks(b);

      // Collapse all members by default on load
      const allMemberIds = Array.from(new Set(l.map((loan: Loan) => loan.member)));
      setCollapsedMembers(new Set(allMemberIds));

    } catch {
      setError('Failed to load loans.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyLoan()); setEditing(null); setError(''); setShowForm(true); };

  // ✅ FIXED: include due_date in form state when editing
  const openEdit = (loan: Loan) => {
    setForm({
      member: loan.member,
      book: loan.book,
      loan_date: loan.loan_date,
      due_date: loan.due_date,       // ← added
      return_date: loan.return_date,
    });
    setEditing(loan); setError(''); setShowForm(true);
  };

  const handleVerify = async () => {
    if (!verifyModal) return;
    setActionLoading(true);
    try {
      await verifyReturn(verifyModal.id, verifyNotes);
      setVerifyModal(null);
      setVerifyNotes('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to verify return.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectReturn(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject return.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.member || !form.book) { setError('Member and book are required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateLoan(editing.id, form); else await createLoan(form);
      setShowForm(false); await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save loan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteLoan(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch {
      setError('Failed to delete loan.');
    }
  };

  const memberName    = (id: number) => members.find(m => m.id === id)?.name ?? '—';
  const bookTitle     = (id: number) => books.find(b => b.id === id)?.title ?? '—';
  const isOverdue     = (loan: Loan) => !loan.return_verified_date && (loan.overdue_days ?? 0) > 0;
  const isPending     = (loan: Loan) => !!loan.return_requested_date && !loan.return_verified_date && loan.return_status === 'pending';
  const overdueFee    = (loan: Loan) => (loan.overdue_days ?? 0) * FEE_PER_DAY;

  const filtered = loans
    .filter(l => {
      if (filter === 'active')   return !l.return_verified_date && !isOverdue(l) && !isPending(l);
      if (filter === 'returned') return !!l.return_verified_date;
      if (filter === 'overdue')  return isOverdue(l);
      if (filter === 'pending')  return isPending(l);
      return true;
    })
    .filter(l =>
      memberName(l.member).toLowerCase().includes(search.toLowerCase()) ||
      bookTitle(l.book).toLowerCase().includes(search.toLowerCase())
    );

  // Group by member
  const grouped = filtered.reduce<{ memberId: number; loans: Loan[] }[]>((acc, loan) => {
    const existing = acc.find(g => g.memberId === loan.member);
    if (existing) existing.loans.push(loan);
    else acc.push({ memberId: loan.member, loans: [loan] });
    return acc;
  }, []);

  const toggleCollapse = (memberId: number) => {
    setCollapsedMembers(prev => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });
  };

  const overdueCount = loans.filter(l => isOverdue(l)).length;
  const pendingCount = loans.filter(l => isPending(l)).length;

  const anyExpanded = grouped.some(({ memberId }) => !collapsedMembers.has(memberId));
  const tableHeaders = anyExpanded
    ? ['Book', 'Loan Date', 'Due Date', 'Return Date', 'Status', 'Actions']
    : ['Members', '', '', '', '', ''];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7a6a52]">
      <div className="w-9 h-9 border-[3px] border-[#e2d9c4] border-t-[#6b1d2a] rounded-full animate-spin" />
      <span className="italic">Loading loans…</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-[#e2d9c4] relative">
        <div className="absolute bottom-[-2px] left-0 w-16 h-[2px] bg-[#6b1d2a]" />
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif' }} className="text-3xl font-bold text-[#1a1209]">Loans</h1>
          <p className="text-sm text-[#7a6a52] italic mt-1">Track book borrowing and returns</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full text-xs font-semibold animate-pulse">
              ⏳ {pendingCount} Pending Return{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-xs font-semibold">
              ⚠️ {overdueCount} Overdue
            </span>
          )}
          <button onClick={openCreate}
            className="px-5 py-2 bg-[#6b1d2a] text-white rounded font-semibold hover:bg-[#8c2f3f] transition-colors shadow-sm">
            ＋ New Loan
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">

        {/* Search + Filters */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#f5f0e8] border-b border-[#e2d9c4] flex-wrap gap-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by member or book…"
            className="px-4 py-2 border border-[#cfc4aa] rounded bg-white text-sm focus:outline-none focus:border-yellow-500 w-64"
          />
          <div className="flex items-center gap-2">
            {(['all','active','pending','overdue','returned'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded font-semibold border transition-colors ${
                  filter === f
                    ? f === 'overdue' ? 'bg-red-700 text-white border-red-700'
                    : f === 'pending' ? 'bg-yellow-600 text-white border-yellow-600'
                    : 'bg-[#6b1d2a] text-white border-[#6b1d2a]'
                    : 'bg-white text-[#3d2f1a] border-[#cfc4aa] hover:bg-[#f5f0e8]'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'overdue' && overdueCount > 0 && (
                  <span className="ml-1 bg-red-200 text-red-800 rounded-full px-1.5 text-xs">{overdueCount}</span>
                )}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-1 bg-yellow-200 text-yellow-800 rounded-full px-1.5 text-xs">{pendingCount}</span>
                )}
              </button>
            ))}
            <span className="text-sm text-[#7a6a52] italic ml-2">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f5f0e8] border-b border-[#cfc4aa]">
              {tableHeaders.map((h, i) => (
                <th key={i}
                  style={{ fontFamily: 'Playfair Display, serif' }}
                  className={`text-left py-3 text-xs font-semibold tracking-wider uppercase text-[#7a6a52] transition-all duration-300 ${
                    i === 0 ? 'pl-16 pr-4' : 'px-4'
                  }`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[#7a6a52]">
                  <div className="text-4xl mb-3">🔖</div>
                  <div style={{ fontFamily: 'Playfair Display, serif' }} className="text-lg text-[#3d2f1a] mb-1">
                    No loan records found
                  </div>
                  <div className="italic text-sm">Create a new loan to get started.</div>
                </td>
              </tr>
            ) : grouped.map(({ memberId, loans: memberLoans }) => {
              const isCollapsed = collapsedMembers.has(memberId);
              const hasOverdue  = memberLoans.some(l => isOverdue(l));
              const hasPending  = memberLoans.some(l => isPending(l));

              const totalFee = memberLoans
                .filter(l => isOverdue(l))
                .reduce((sum, l) => sum + overdueFee(l), 0);

              return (
                <React.Fragment key={memberId}>

                  {/* Member Group Header */}
                  <tr
                    onClick={() => toggleCollapse(memberId)}
                    className={`border-b border-[#e2d9c4] cursor-pointer select-none transition-colors ${
                      hasOverdue ? 'bg-red-100 hover:bg-red-200' :
                      hasPending ? 'bg-yellow-100 hover:bg-yellow-200' :
                      'bg-[#ede5d0] hover:bg-[#e2d9c4]'
                    }`}
                  >
                    <td colSpan={6} className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[#7a6a52] text-xs transition-transform duration-200"
                          style={{ display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                        <div className="w-7 h-7 rounded-full bg-[#6b1d2a] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {memberName(memberId).charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontFamily: 'Playfair Display, serif' }}
                          className="font-semibold text-[#1a1209] text-sm">
                          {memberName(memberId)}
                        </span>
                        <span className="text-xs text-[#7a6a52] italic">
                          {memberLoans.length} loan{memberLoans.length !== 1 ? 's' : ''}
                        </span>
                        {hasOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-300 font-semibold">
                            ⚠️ Overdue
                          </span>
                        )}
                        {hasPending && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 font-semibold">
                            ⏳ Pending Return
                          </span>
                        )}
                        {hasOverdue && totalFee > 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-red-200 text-red-800 border border-red-300 font-bold">
                            Total Fee: ₱{totalFee.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Loan Rows */}
                  {!isCollapsed && memberLoans.map((loan, idx) => {
                    const overdue  = isOverdue(loan);
                    const pending  = isPending(loan);
                    const isLast   = idx === memberLoans.length - 1;

                    return (
                      <tr key={loan.id} className={`transition-colors ${
                        isLast ? 'border-b-2 border-[#cfc4aa]' : 'border-b border-[#f0ebe0]'
                      } ${
                        overdue  ? 'bg-red-50 hover:bg-red-100' :
                        pending  ? 'bg-yellow-50 hover:bg-yellow-100' :
                        'hover:bg-[#fdfaf4]'
                      }`}>

                        {/* Book */}
                        <td className="py-3 pr-4 text-[#3d2f1a]">
                          <div className="flex items-center gap-2 pl-10">
                            <span className="text-[#cfc4aa] text-xs flex-shrink-0">
                              {isLast ? '└─' : '├─'}
                            </span>
                            <span className="font-medium">{bookTitle(loan.book)}</span>
                          </div>
                        </td>

                        {/* Loan Date */}
                        <td className="px-4 py-3 text-[#3d2f1a]">{loan.loan_date}</td>

                        {/* Due Date */}
                        <td className="px-4 py-3">
                          <span className={overdue ? 'text-red-600 font-semibold' : 'text-[#3d2f1a]'}>
                            {loan.due_date ?? '—'}
                          </span>
                        </td>

                        {/* Return Date */}
                        <td className="px-4 py-3 text-[#3d2f1a]">
                          {loan.return_verified_date ? (
                            loan.return_verified_date
                          ) : pending ? (
                            <em className="text-yellow-600">Pending verification</em>
                          ) : (
                            <em className="text-[#7a6a52]">Not yet returned</em>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {loan.return_verified_date ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-300">
                              Returned
                            </span>
                          ) : pending ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-700 border-yellow-300 animate-pulse">
                              Pending Verification
                            </span>
                          ) : overdue ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-300">
                                Overdue {loan.overdue_days}d
                              </span>
                              <span className="text-xs text-red-600 font-semibold pl-1">
                                Fee: ₱{overdueFee(loan).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-300">
                              Active
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {pending && !loan.return_verified_date && (
                              <>
                                <button
                                  onClick={() => { setVerifyModal(loan); setVerifyNotes(''); }}
                                  className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors">
                                  ✓ Verify
                                </button>
                                <button
                                  onClick={() => { setRejectModal(loan); setRejectReason(''); }}
                                  className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            {!loan.return_verified_date && !pending && (
                              <button
                                onClick={() => openEdit(loan)}
                                className="px-3 py-1 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors">
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(loan)}
                              className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New/Edit Loan Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Loan' : 'New Loan'} onClose={() => setShowForm(false)}
          footer={<>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-[#6b1d2a] text-white rounded hover:bg-[#8c2f3f] transition-colors text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Loan'}
            </button>
          </>}>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>
          )}

          {/* Member */}
          <div className="mb-4">
            <label style={{ fontFamily: 'Playfair Display, serif' }}
              className="block text-sm font-semibold text-[#3d2f1a] mb-1">Member *</label>
            <select
              className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.member} onChange={e => setForm({ ...form, member: parseInt(e.target.value) })}>
              <option value={0}>Select a member…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Book */}
          <div className="mb-4">
            <label style={{ fontFamily: 'Playfair Display, serif' }}
              className="block text-sm font-semibold text-[#3d2f1a] mb-1">Book *</label>
            <select
              className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.book} onChange={e => setForm({ ...form, book: parseInt(e.target.value) })}>
              <option value={0}>Select a book…</option>
              {books.map(b => (
                <option key={b.id} value={b.id} disabled={!b.available && b.id !== editing?.book}>
                  {b.title}{!b.available && b.id !== editing?.book ? ' (On Loan — Unavailable)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#7a6a52] italic mt-1">Books marked "On Loan" cannot be borrowed.</p>
          </div>

          {/* Loan Date */}
          <div className="mb-4">
            <label style={{ fontFamily: 'Playfair Display, serif' }}
              className="block text-sm font-semibold text-[#3d2f1a] mb-1">Loan Date</label>
            <input type="date"
              className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
              value={form.loan_date} onChange={e => setForm({ ...form, loan_date: e.target.value })} />
            {!editing && (
              <p className="text-xs text-[#7a6a52] italic mt-1">Due date will be auto-set to 14 days from loan date.</p>
            )}
          </div>

          {/* Due Date — only shown when editing, allows manual override */}
          {editing && (
            <div className="mb-4">
              <label style={{ fontFamily: 'Playfair Display, serif' }}
                className="block text-sm font-semibold text-[#3d2f1a] mb-1">Due Date</label>
              <input type="date"
                className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.due_date ?? ''} onChange={e => setForm({ ...form, due_date: e.target.value || null })} />
              <p className="text-xs text-[#7a6a52] italic mt-1">Override the auto-calculated due date if needed.</p>
            </div>
          )}

          {/* Return Date — only shown when editing */}
          {editing && (
            <div>
              <label style={{ fontFamily: 'Playfair Display, serif' }}
                className="block text-sm font-semibold text-[#3d2f1a] mb-1">Return Date</label>
              <input type="date"
                className="w-full px-3 py-2 border border-[#cfc4aa] rounded bg-white focus:outline-none focus:border-[#6b1d2a] text-sm"
                value={form.return_date ?? ''} onChange={e => setForm({ ...form, return_date: e.target.value || null })} />
            </div>
          )}
        </Modal>
      )}

      {/* Verify Return Modal */}
      {verifyModal && (
        <Modal title="Verify Return" onClose={() => setVerifyModal(null)}
          footer={<>
            <button onClick={() => setVerifyModal(null)} disabled={actionLoading}
              className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">
              Cancel
            </button>
            <button onClick={handleVerify} disabled={actionLoading}
              className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-60">
              {actionLoading ? 'Confirming…' : 'Confirm Verification'}
            </button>
          </>}>
          <div className="py-2">
            <p className="text-[#3d2f1a] mb-3">Confirm that the book has been physically received:</p>
            <div className="bg-[#faf7f2] rounded p-3 border border-[#e2d9c4] mb-3">
              <p className="font-semibold text-[#1a1209]">{bookTitle(verifyModal.book)}</p>
              <p className="text-sm text-[#7a6a52]">by {memberName(verifyModal.member)}</p>
              {isOverdue(verifyModal) && (
                <p className="text-sm text-red-600 font-semibold mt-2">
                  ⚠️ Overdue by {verifyModal.overdue_days} day{verifyModal.overdue_days !== 1 ? 's' : ''} — Fee: ₱{overdueFee(verifyModal).toLocaleString()}
                </p>
              )}
            </div>
            <textarea
              placeholder="Optional notes (condition, remarks…)"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              className="w-full p-2 border border-[#cfc4aa] rounded text-sm focus:outline-none focus:border-yellow-500"
              rows={3}
            />
          </div>
        </Modal>
      )}

      {/* Reject Return Modal */}
      {rejectModal && (
        <Modal title="Reject Return" onClose={() => setRejectModal(null)}
          footer={<>
            <button onClick={() => setRejectModal(null)} disabled={actionLoading}
              className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">
              Cancel
            </button>
            <button onClick={handleReject} disabled={actionLoading || rejectReason.trim() === ''}
              className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-60">
              {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
          </>}>
          <div className="py-2">
            <p className="text-[#3d2f1a] mb-3">
              The borrower will be notified and can re-submit their return request.
            </p>
            <div className="bg-[#faf7f2] rounded p-3 border border-[#e2d9c4] mb-3">
              <p className="font-semibold text-[#1a1209]">{bookTitle(rejectModal.book)}</p>
              <p className="text-sm text-[#7a6a52]">by {memberName(rejectModal.member)}</p>
            </div>
            <label className="text-sm text-[#3d2f1a] font-semibold block mb-1">
              Reason for rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="e.g. Book not physically received, damaged condition, wrong book…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2 border border-[#cfc4aa] rounded text-sm focus:outline-none focus:border-red-400"
              rows={3}
            />
            {rejectReason.trim() === '' && (
              <p className="text-xs text-red-500 mt-1">A reason is required.</p>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <Modal title="Delete Loan Record" onClose={() => setConfirmDelete(null)}
          footer={<>
            <button onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 border border-[#cfc4aa] rounded text-[#3d2f1a] hover:bg-[#e2d9c4] transition-colors text-sm">
              Cancel
            </button>
            <button onClick={handleDelete}
              className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-sm font-semibold">
              Delete
            </button>
          </>}>
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-[#3d2f1a] mb-1">Delete this loan record?</p>
            <p className="text-sm text-[#7a6a52] italic">
              {memberName(confirmDelete.member)} → {bookTitle(confirmDelete.book)}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LoanTable;