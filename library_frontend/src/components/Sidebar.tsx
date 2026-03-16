import React from 'react';
import { NavLink } from 'react-router-dom';
import { logoutApi } from '../api';

import libraryIcon from '../assets/library-icon.png';
import bookIcon    from '../assets/book-icon.png';
import authorIcon  from '../assets/author-icon.png';
import memberIcon  from '../assets/member-icon.png';
import loanIcon    from '../assets/loan-icon.png';

const navItems = [
  { to: '/',        icon: libraryIcon, label: 'Dashboard' },
  { to: '/books',   icon: bookIcon,    label: 'Books'     },
  { to: '/authors', icon: authorIcon,  label: 'Authors'   },
  { to: '/members', icon: memberIcon,  label: 'Members'   },
  { to: '/loans',   icon: loanIcon,    label: 'Loans'     },
];

interface Props {
  username: string;
  onLogout: () => void;
}

const Sidebar: React.FC<Props> = ({ username, onLogout }) => {

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    onLogout();
  };

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen bg-[#1a1209] border-r-2 border-yellow-600 flex flex-col z-50">
      <div className="px-6 py-7 border-b border-yellow-900/40">
        <div style={{fontFamily:'Playfair Display, serif'}} className="text-yellow-500 text-xl font-bold leading-tight">
          Bibliotheca
        </div>
        <div className="text-[#7a6a52] text-xs tracking-widest uppercase mt-1">
          Library Management System
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-6 py-2 text-[#7a6a52] text-xs tracking-widest uppercase">Navigation</div>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-base transition-all duration-150 border-l-2 ${
                isActive
                  ? 'text-yellow-400 bg-yellow-900/20 border-yellow-500'
                  : 'text-[#c8bfad] border-transparent hover:text-yellow-300 hover:bg-yellow-900/10 hover:border-yellow-700'
              }`
            }
          >
            <img src={icon} alt={label} className="w-10 h-10 object-contain" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-yellow-900/30">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#6b1d2a] flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-[#c8bfad] text-sm font-semibold truncate">{username}</div>
            <div className="text-[#7a6a52] text-xs">Library Staff</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#c8bfad] hover:text-red-400 hover:bg-red-900/20 rounded transition-colors border border-transparent hover:border-red-900/40"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;