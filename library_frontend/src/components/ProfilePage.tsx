import React, { useEffect, useState } from 'react';
import { getProfile } from '../api';
import { UserProfile } from '../types';

interface Props { onLogout: () => void; }

const ProfilePage: React.FC<Props> = ({ onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(data => setProfile(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-white">Loading...</div>;

  const details = [
    { label: 'Full Name', value: profile?.name },
    { label: 'Email Address', value: profile?.email },
    { label: 'Home Address', value: profile?.address || 'N/A' },
    { label: 'Birthday', value: profile?.birthday || 'N/A' },
    { label: 'Age', value: profile?.age || 'N/A' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 to-stone-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <span className="text-3xl text-amber-500">{profile?.name?.charAt(0)}</span>
          </div>
          <h2 className="text-2xl text-white font-light">User Profile</h2>
        </div>
        <div className="space-y-4">
          {details.map((item) => (
            <div key={item.label} className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-white/50 text-sm">{item.label}</span>
              <span className="text-white text-sm">{item.value}</span>
            </div>
          ))}
        </div>
        <button onClick={onLogout} className="w-full mt-8 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all">
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;