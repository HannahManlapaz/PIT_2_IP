import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BookTable from './components/BookTable';
import AuthorTable from './components/AuthorTable';
import MemberTable from './components/MemberTable';
import LoanTable from './components/LoanTable';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import BorrowerDashboard from './components/BorrowerDashboard';
import SuperadminDashboard from './components/SuperadminDashboard';
import ProfilePage from './components/ProfilePage';
import StaffDashboard from './components/StaffDashboard';
import ActivatePage from './components/ActivatePage';
import { AuthUser } from './types';

const App: React.FC = () => {
  const [token,    setToken]    = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [role,     setRole]     = useState(localStorage.getItem('role') || '');
  const [memberId, setMemberId] = useState<number | null>(
    localStorage.getItem('member_id') ? Number(localStorage.getItem('member_id')) : null
  );

  const handleLogin = (data: AuthUser) => {
    const tokenValue = data.access ?? data.token ?? '';
    if (!tokenValue) return;
    localStorage.setItem('token',    tokenValue);
    localStorage.setItem('username', data.username ?? '');
    localStorage.setItem('role',     data.role ?? '');
    if (data.member_id) localStorage.setItem('member_id', String(data.member_id));
    setToken(tokenValue);
    setUsername(data.username ?? '');
    setRole(data.role ?? '');
    setMemberId(data.member_id ?? null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('member_id');
    setToken(''); setUsername(''); setRole(''); setMemberId(null);
  };

  // Always allow activate route regardless of login state
  if (window.location.pathname.startsWith('/activate/')) {
    return (
      <Router>
        <Routes>
          <Route path="/activate/:uid/:token" element={<ActivatePage />} />
        </Routes>
      </Router>
    );
  }

  // Not logged in
  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
          <Route path="*"         element={<LoginPage onLogin={handleLogin} />} />
        </Routes>
      </Router>
    );
  }

  // Superadmin
  if (role === 'superadmin') {
    return (
      <Router>
        <Routes>
          <Route path="/*" element={<SuperadminDashboard username={username} onLogout={handleLogout} />} />
        </Routes>
      </Router>
    );
  }

  // Borrower
  if (role === 'borrower') {
    return (
      <Router>
        <Routes>
          <Route path="/profile"   element={<ProfilePage onLogout={handleLogout} />} />
          <Route path="/dashboard" element={<BorrowerDashboard username={username} memberId={memberId!} onLogout={handleLogout} />} />
          <Route path="*"          element={<Navigate to="/profile" replace />} />
        </Routes>
      </Router>
    );
  }

  // Staff / Admin role (librarian)
  return (
    <Router>
      <div className="flex min-h-screen bg-[#f5f0e8]">
        <Sidebar username={username} onLogout={handleLogout} />
        <main className="flex-1 ml-64 p-10 min-h-screen">
          <Routes>
            <Route path="/"        element={<StaffDashboard />} />
            <Route path="/books"   element={<BookTable />} />
            <Route path="/authors" element={<AuthorTable />} />
            <Route path="/members" element={<MemberTable />} />
            <Route path="/loans"   element={<LoanTable />} />
            <Route path="/profile" element={<ProfilePage onLogout={handleLogout} />} />
            <Route path="*"        element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;