import React, { useEffect, useState } from 'react';
import { getPendingReturns, verifyReturn, rejectReturn } from '../api';

interface PendingReturn {
  id: number;
  book_title: string;
  member_name: string;
  return_requested_date: string;
  notes?: string;
}

const AdminReturnVerification: React.FC = () => {
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Verify modal
  const [verifyingLoan, setVerifyingLoan] = useState<PendingReturn | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');

  // Reject modal
  const [rejectingLoan, setRejectingLoan] = useState<PendingReturn | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadPendingReturns = async () => {
    try {
      const data = await getPendingReturns();
      setPendingReturns(data);
    } catch (error) {
      console.error('Failed to load pending returns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPendingReturns(); }, []);

  const handleVerify = async () => {
    if (!verifyingLoan) return;
    setActionLoading(true);
    try {
      await verifyReturn(verifyingLoan.id, verifyNotes);
      setVerifyingLoan(null);
      setVerifyNotes('');
      await loadPendingReturns();
    } catch {
      alert('Failed to verify return.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingLoan || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectReturn(rejectingLoan.id, rejectReason);
      setRejectingLoan(null);
      setRejectReason('');
      await loadPendingReturns();
    } catch {
      alert('Failed to reject return.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="p-6 text-[#7a6a52] italic">Loading pending returns...</div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-light mb-6">Pending Return Verifications</h2>

      {pendingReturns.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-[#7a6a52] italic">No pending return requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingReturns.map((loan) => (
            <div key={loan.id} className="bg-white rounded-lg border border-[#cfc4aa] p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-[#1a1209]">{loan.book_title}</h3>
                  <p className="text-sm text-[#7a6a52]">Borrower: {loan.member_name}</p>
                  <p className="text-sm text-[#cfc4aa]">
                    Requested: {loan.return_requested_date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setVerifyingLoan(loan); setVerifyNotes(''); }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold transition-colors"
                  >
                    ✓ Verify
                  </button>
                  <button
                    onClick={() => { setRejectingLoan(loan); setRejectReason(''); }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Verify Modal ── */}
      {verifyingLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-1">Confirm Return</h3>
            <p className="text-sm text-[#7a6a52] mb-4">
              Confirm that the physical book has been received.
            </p>
            <div className="bg-[#faf7f2] rounded p-3 mb-4 border border-[#e2d9c4]">
              <p className="text-sm">
                <span className="text-[#7a6a52]">Book: </span>
                <strong>{verifyingLoan.book_title}</strong>
              </p>
              <p className="text-sm">
                <span className="text-[#7a6a52]">Borrower: </span>
                <strong>{verifyingLoan.member_name}</strong>
              </p>
            </div>
            <textarea
              placeholder="Optional notes (condition, remarks…)"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              className="w-full p-2 border border-[#cfc4aa] rounded text-sm focus:outline-none focus:border-yellow-500"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setVerifyingLoan(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-[#cfc4aa] rounded text-sm hover:bg-[#faf7f2] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Confirming…' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectingLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-1 text-red-700">Reject Return</h3>
            <p className="text-sm text-[#7a6a52] mb-4">
              The borrower will be notified and can re-submit their return request.
            </p>
            <div className="bg-[#faf7f2] rounded p-3 mb-4 border border-[#e2d9c4]">
              <p className="text-sm">
                <span className="text-[#7a6a52]">Book: </span>
                <strong>{rejectingLoan.book_title}</strong>
              </p>
              <p className="text-sm">
                <span className="text-[#7a6a52]">Borrower: </span>
                <strong>{rejectingLoan.member_name}</strong>
              </p>
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
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectingLoan(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-[#cfc4aa] rounded text-sm hover:bg-[#faf7f2] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || rejectReason.trim() === ''}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReturnVerification;