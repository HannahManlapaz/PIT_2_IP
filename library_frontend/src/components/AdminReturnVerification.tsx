// AdminReturnVerification.tsx
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
  const [selectedLoan, setSelectedLoan] = useState<PendingReturn | null>(null);
  const [notes, setNotes] = useState('');

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

  useEffect(() => {
    loadPendingReturns();
  }, []);

  const handleVerify = async (loanId: number) => {
    try {
      await verifyReturn(loanId, notes);
      alert('Return verified successfully!');
      loadPendingReturns();
      setSelectedLoan(null);
      setNotes('');
    } catch (error) {
      alert('Failed to verify return.');
    }
  };

  const handleReject = async (loanId: number) => {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      try {
        await rejectReturn(loanId, reason);
        alert('Return request rejected.');
        loadPendingReturns();
      } catch (error) {
        alert('Failed to reject return.');
      }
    }
  };

  if (loading) return <div>Loading pending returns...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-light mb-6">Pending Return Verifications</h2>
      
      {pendingReturns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-ink-muted">No pending return requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingReturns.map((loan) => (
            <div key={loan.id} className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{loan.book_title}</h3>
                  <p className="text-sm text-gray-600">Borrower: {loan.member_name}</p>
                  <p className="text-sm text-gray-500">
                    Requested: {loan.return_requested_date}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setSelectedLoan(loan);
                      setNotes('');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Verify Return
                  </button>
                  <button
                    onClick={() => handleReject(loan.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Verify Return</h3>
            <p>Book: <strong>{selectedLoan.book_title}</strong></p>
            <p>Borrower: <strong>{selectedLoan.member_name}</strong></p>
            <textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-4 p-2 border rounded"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify(selectedLoan.id)}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Confirm Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReturnVerification;