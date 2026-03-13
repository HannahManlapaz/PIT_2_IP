import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BookTable from './components/BookTable';
import AuthorTable from './components/AuthorTable';
import MemberTable from './components/MemberTable';
import LoanTable from './components/LoanTable';
import LoginPage from './components/Loginpage';

const Dashboard: React.FC = () => (
  <div className="max-w-4xl">
    <div className="relative overflow-hidden rounded-lg border border-yellow-600 bg-[#1a1209] p-12 text-center mb-8 shadow-lg">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #c9a84c 0, #c9a84c 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
      <div className="text-5xl mb-3">📚</div>
      <h1 style={{fontFamily:'Playfair Display, serif'}} className="text-3xl font-bold text-yellow-500 mb-2">
        Library Management System
      </h1>
      <p className="text-[#a89880] italic text-lg">
        Welcome, Librarian. Select a section from the sidebar to begin.
      </p>
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[
        { icon: '📖', label: 'Books',   desc: 'Manage your collection' },
        { icon: '✒️', label: 'Authors', desc: 'Track authors & biographies' },
        { icon: '🎓', label: 'Members', desc: 'Manage member records' },
        { icon: '🔖', label: 'Loans',   desc: 'Track borrowing & returns' },
      ].map(({ icon, label, desc }) => (
        <div key={label}
          className="flex flex-col items-center gap-2 p-6 bg-white rounded-lg border border-[#cfc4aa] shadow-sm text-center hover:shadow-md hover:border-yellow-500 transition-all duration-200 cursor-default">
          <span className="text-3xl">{icon}</span>
          <span style={{fontFamily:'Playfair Display, serif'}} className="text-lg font-semibold text-[#1a1209]">{label}</span>
          <span className="text-sm text-[#7a6a52] italic">{desc}</span>
        </div>
      ))}
    </div>
  </div>
);

const App: React.FC = () => {
  const [token, setToken]       = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  const handleLogin = (newToken: string, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

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