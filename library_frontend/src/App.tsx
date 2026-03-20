import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BookTable from './components/BookTable';
import AuthorTable from './components/AuthorTable';
import MemberTable from './components/MemberTable';
import LoanTable from './components/LoanTable';
import LoginPage from './components/Loginpage';
import AdminLoginPage from './components/AdminLoginPage';
import RegisterPage from './components/RegisterPage';
import BorrowerDashboard from './components/BorrowerDashboard';
import SuperadminDashboard from './components/SuperadminDashboard';

import libraryIcon from './assets/library-icon.png';
import bookIcon    from './assets/book-icon.png';
import authorIcon  from './assets/author-icon.png';
import memberIcon  from './assets/member-icon.png';
import loanIcon    from './assets/loan-icon.png';

import { getBooks, getAuthors, getMembers, getLoans } from './api';
import { Book, Author, Member, Loan, AuthUser } from './types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [books,   setBooks]   = React.useState<Book[]>([]);
  const [authors, setAuthors] = React.useState<Author[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loans,   setLoans]   = React.useState<Loan[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([getBooks(), getAuthors(), getMembers(), getLoans()])
      .then(([b, a, m, l]) => { setBooks(b); setAuthors(a); setMembers(m); setLoans(l); })
      .finally(() => setLoading(false));
  }, []);

  const activeLoans  = loans.filter(l => !l.return_date);
  const overdueLoans = loans.filter(l => !l.return_date && (l.overdue_days ?? 0) > 0);
  const recentLoans  = [...loans]
    .sort((a, b) => new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime())
    .slice(0, 5);
  const isOverdue = (loan: Loan) => !loan.return_date && (loan.overdue_days ?? 0) > 0;

  const stats = [
    { icon: bookIcon,   label: 'Total Books',  value: books.length,       color: 'text-yellow-600', to: '/books'   },
    { icon: authorIcon, label: 'Total Authors', value: authors.length,     color: 'text-yellow-600', to: '/authors' },
    { icon: memberIcon, label: 'Total Members', value: members.length,     color: 'text-yellow-600', to: '/members' },
    { icon: loanIcon,   label: 'Active Loans',  value: activeLoans.length, color: 'text-red-500',    to: '/loans'   },
  ];

  const quickActions = [
    { icon: bookIcon,   label: 'Add Book',   to: '/books'   },
    { icon: authorIcon, label: 'Add Author', to: '/authors' },
    { icon: memberIcon, label: 'Add Member', to: '/members' },
    { icon: loanIcon,   label: 'New Loan',   to: '/loans'   },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <div className="relative overflow-hidden rounded-lg border border-yellow-600 bg-[#1a1209] p-12 text-center shadow-lg">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #c9a84c 0, #c9a84c 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <img src={libraryIcon} alt="Library" className="w-24 h-24 object-contain mx-auto mb-3" />
        <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-3xl font-bold text-yellow-500 mb-2">Library Management System</h1>
        <p className="text-[#a89880] italic text-lg">Welcome, Librarian. Select a section from the sidebar to begin.</p>
      </div>

      {!loading && overdueLoans.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-300 rounded-lg shadow-sm">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-700 font-semibold text-sm">{overdueLoans.length} loan{overdueLoans.length > 1 ? 's are' : ' is'} overdue!</p>
            <p className="text-red-500 text-xs italic">Please follow up with the borrowers immediately.</p>
          </div>
          <button onClick={() => navigate('/loans')} className="px-3 py-1.5 bg-red-700 text-white text-xs font-semibold rounded hover:bg-red-800 transition-colors">View Loans</button>
        </div>
      )}

      <div>
        <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-xl font-semibold text-[#1a1209] mb-3">Overview</h2>
        <div className="grid grid-cols-4 gap-4">
          {stats.map(({ icon, label, value, color, to }) => (
            <div key={label} onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 p-6 bg-white rounded-lg border border-[#cfc4aa] shadow-sm text-center hover:shadow-md hover:border-yellow-500 transition-all duration-200 cursor-pointer">
              <img src={icon} alt={label} className="w-14 h-14 object-contain" />
              {loading ? <div className="w-8 h-7 bg-[#ede5d0] rounded animate-pulse mt-1" /> : <span className={`text-3xl font-bold ${color}`}>{value}</span>}
              <span className="text-sm text-[#7a6a52] italic">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-xl font-semibold text-[#1a1209] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map(({ icon, label, to }) => (
            <button key={label} onClick={() => navigate(to)}
              className="flex items-center justify-center gap-3 px-4 py-3 bg-white text-[#3d2f1a] rounded-lg border border-[#cfc4aa] hover:border-yellow-500 hover:bg-[#fdf6e3] hover:shadow-md transition-all duration-200 font-semibold text-sm shadow-sm">
              <img src={icon} alt={label} className="w-7 h-7 object-contain" />
              <span style={{fontFamily:'Playfair Display, serif'}}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-xl font-semibold text-[#1a1209]">Recent Loans</h2>
          <button onClick={() => navigate('/loans')} className="text-xs text-[#6b1d2a] hover:underline italic">View all →</button>
        </div>
        <div className="bg-white rounded-lg border border-[#cfc4aa] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#7a6a52] italic">Loading...</div>
          ) : recentLoans.length === 0 ? (
            <div className="p-8 text-center text-[#7a6a52] italic">No loans recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#ede5d0] text-[#3d2f1a] text-left border-b-2 border-yellow-600">
                  <th className="px-5 py-3 font-semibold">Book</th>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Loan Date</th>
                  <th className="px-5 py-3 font-semibold">Due Date</th>
                  <th className="px-5 py-3 font-semibold">Return Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((loan, i) => {
                  const overdue = isOverdue(loan);
                  return (
                    <tr key={loan.id} className={`border-t border-[#ede5d0] transition-colors ${overdue ? 'bg-red-50 hover:bg-red-100' : i % 2 === 0 ? 'bg-white hover:bg-[#faf7f2]' : 'bg-[#fdf9f4] hover:bg-[#faf7f2]'}`}>
                      <td className="px-5 py-3 text-[#1a1209] font-medium">{loan.book_title}</td>
                      <td className="px-5 py-3 text-[#3d2f1a]">{loan.member_name}</td>
                      <td className="px-5 py-3 text-[#7a6a52]">{loan.loan_date}</td>
                      <td className="px-5 py-3"><span className={overdue ? 'text-red-600 font-semibold' : 'text-[#7a6a52]'}>{loan.due_date ?? '—'}</span></td>
                      <td className="px-5 py-3 text-[#7a6a52]">{loan.return_date ?? '—'}</td>
                      <td className="px-5 py-3">
                        {loan.return_date ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">Returned</span>
                        ) : overdue ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-semibold">⚠️ Overdue {loan.overdue_days}d</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold">Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [token,    setToken]    = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [role,     setRole]     = useState(localStorage.getItem('role') || '');
  const [memberId, setMemberId] = useState<number | null>(
    localStorage.getItem('member_id') ? Number(localStorage.getItem('member_id')) : null
  );

  const handleLogin = (data: AuthUser) => {
    localStorage.setItem('token',    data.token    ?? '');
    localStorage.setItem('username', data.username ?? '');
    localStorage.setItem('role',     data.role     ?? '');
    if (data.member_id) localStorage.setItem('member_id', String(data.member_id));
    setToken(data.token    ?? '');
    setUsername(data.username ?? '');
    setRole(data.role     ?? '');
    setMemberId(data.member_id ?? null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('member_id');
    setToken(''); setUsername(''); setRole(''); setMemberId(null);
  };

  // Not logged in
  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/admin"    element={<AdminLoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterPage   onLogin={handleLogin} />} />
          <Route path="*"         element={<LoginPage      onLogin={handleLogin} />} />
        </Routes>
      </Router>
    );
  }

  // Superadmin side
  if (role === 'superadmin') {
    return (
      <Router>
        <Routes>
          <Route path="/*" element={<SuperadminDashboard username={username} onLogout={handleLogout} />} />
        </Routes>
      </Router>
    );
  }

  // Borrower side
  if (role === 'borrower') {
    return (
      <Router>
        <Routes>
          <Route path="/*" element={<BorrowerDashboard username={username} memberId={memberId!} onLogout={handleLogout} />} />
        </Routes>
      </Router>
    );
  }

  // Admin/Librarian side
  return (
    <Router>
      <div className="flex min-h-screen bg-[#f5f0e8]">
        <Sidebar username={username} onLogout={handleLogout} />
        <main className="flex-1 ml-64 p-10 min-h-screen">
          <Routes>
            <Route path="/"        element={<Dashboard />} />
            <Route path="/books"   element={<BookTable />} />
            <Route path="/authors" element={<AuthorTable />} />
            <Route path="/members" element={<MemberTable />} />
            <Route path="/loans"   element={<LoanTable />} />
            <Route path="*"        element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;