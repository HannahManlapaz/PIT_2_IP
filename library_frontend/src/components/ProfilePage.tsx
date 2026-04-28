import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../api';
import { UserProfile } from '../types';

interface Props { onLogout: () => void; }

const ProfilePage: React.FC<Props> = ({ onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'view' | 'edit' | 'password'>('view');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string>('');

  const [editForm, setEditForm] = useState({
    name: '', contact_number: '', address: '', birthday: '',
  });

  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [passForm, setPassForm] = useState({
    old_password: '', new_password: '', confirm_password: '',
  });

  useEffect(() => {
    // Get user role from localStorage
    const userRole = localStorage.getItem('role') || '';
    setRole(userRole);
    
    getProfile()
      .then((data: UserProfile) => {
        setProfile(data);
        setEditForm({
          name: data.name ?? '',
          contact_number: data.contact_number ?? '',
          address: data.address ?? '',
          birthday: data.birthday ?? '',
        });
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProfilePic(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  const handleUpdate = async () => {
    try {
      setSaving(true); setError(''); setSuccess('');

      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('contact_number', editForm.contact_number);
      formData.append('address', editForm.address);
      formData.append('birthday', editForm.birthday);
      if (profilePic) formData.append('profile_picture', profilePic);

      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/borrower/profile/', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const updated = await res.json();
      setProfile(prev => ({ ...prev!, ...updated }));
      setSuccess('Profile updated successfully!');
      setTab('view');
    } catch {
      setError('Failed to update profile.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passForm.old_password || !passForm.new_password || !passForm.confirm_password) {
      setError('Please fill in all password fields.'); return;
    }
    if (passForm.new_password !== passForm.confirm_password) {
      setError('New passwords do not match.'); return;
    }
    if (passForm.new_password.length < 8) {
      setError('New password must be at least 8 characters.'); return;
    }
    try {
      setSaving(true); setError(''); setSuccess('');
      await changePassword({
        old_password: passForm.old_password,
        new_password: passForm.new_password,
      });
      setSuccess('Password changed successfully!');
      setPassForm({ old_password: '', new_password: '', confirm_password: '' });
      setTab('view');
    } catch {
      setError('Failed to change password. Check your current password.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    try {
      await deleteAccount();
      onLogout();
    } catch {
      setError('Failed to delete account.');
    }
  };

  const getDashboardLink = () => {
    if (role === 'staff') return '/';
    if (role === 'superadmin') return '/';
    return '/dashboard';
  };

  const getRoleTitle = () => {
    if (role === 'staff') return 'LIBRARY STAFF';
    if (role === 'superadmin') return 'SYSTEM ADMINISTRATOR';
    return 'LIBRARY MEMBER';
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div style={{
          width: 48, height: 48, border: '3px solid #78350f',
          borderTopColor: '#f59e0b', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: '#a8a29e', fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: 2 }}>
          LOADING PROFILE
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(120,53,15,0.4)',
    borderRadius: 8, color: '#e7e5e4',
    fontFamily: 'Georgia, serif', outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: '#78716c', fontSize: 10, letterSpacing: 1.5,
    display: 'block', marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 40%, #0c0a09 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        position: 'absolute', top: '10%', left: '15%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(180,83,9,0.12) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(120,53,15,0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.15,
        backgroundImage: 'radial-gradient(circle, #92400e 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .detail-row:hover  { background: rgba(245,158,11,0.05); border-radius: 8px; }
          .btn-primary:hover { background: rgba(245,158,11,0.25) !important; transform: translateY(-1px); }
          .btn-danger:hover  { background: rgba(239,68,68,0.2)   !important; transform: translateY(-1px); }
          .btn-delete:hover  { background: rgba(239,68,68,0.1)   !important; }
          .tab-btn:hover     { background: rgba(245,158,11,0.1)  !important; }
          .profile-input:focus { border-color: rgba(245,158,11,0.6) !important; }
        `}</style>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #78350f, #b45309, #78350f)',
          backgroundSize: '200% auto',
          animation: 'shimmer 4s linear infinite',
          borderRadius: '20px 20px 0 0',
          padding: '32px 32px 48px',
          textAlign: 'center', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '20px 20px 0 0',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)',
          }} />

          <button onClick={() => { window.location.href = getDashboardLink(); }} style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, padding: '6px 12px', color: '#fde68a',
            fontSize: 12, cursor: 'pointer', letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}>← Dashboard</button>

          {/* Avatar */}
          <div style={{
            width: 88, height: 88,
            background: 'linear-gradient(135deg, #1c1917, #292524)',
            border: '3px solid rgba(245,158,11,0.5)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 0 6px rgba(245,158,11,0.1), 0 8px 32px rgba(0,0,0,0.4)',
            position: 'relative', zIndex: 1, overflow: 'hidden',
          }}>
            {preview
              ? <img src={preview} alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : profile?.profile_picture
                ? <img src={profile.profile_picture} alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', letterSpacing: -1 }}>
                    {initials}
                  </span>
            }
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: '0 0 4px', letterSpacing: 0.5 }}>
              {profile?.name || 'Library User'}
            </h1>
            <p style={{ color: 'rgba(253,230,138,0.7)', fontSize: 12, letterSpacing: 2, margin: 0 }}>
              {getRoleTitle()}
            </p>
          </div>
        </div>

        {/* Body (same as before - no changes needed) */}
        <div style={{
          background: 'rgba(28,25,23,0.95)',
          border: '1px solid rgba(120,53,15,0.4)', borderTop: 'none',
          borderRadius: '0 0 20px 20px', padding: '24px 28px 28px',
          backdropFilter: 'blur(20px)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['view', 'edit', 'password'] as const).map(t => (
              <button key={t} className="tab-btn"
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 11, letterSpacing: 1,
                  fontFamily: 'Georgia, serif', cursor: 'pointer', borderRadius: 8,
                  textTransform: 'uppercase', transition: 'all 0.2s',
                  background: tab === t ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
                  border: tab === t ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: tab === t ? '#f59e0b' : '#78716c',
                }}>
                {t === 'view' ? 'Profile' : t === 'edit' ? 'Edit' : 'Password'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 8, fontSize: 13,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 8, fontSize: 13,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
            }}>{success}</div>
          )}

          {/* View Tab */}
          {tab === 'view' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
              <p style={{
                color: '#78350f', fontSize: 10, letterSpacing: 3, fontWeight: 700,
                marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(120,53,15,0.25)',
              }}>PERSONAL INFORMATION</p>
              {[
                { label: 'Full Name',      value: profile?.name },
                { label: 'Email Address',  value: profile?.email },
                { label: 'Contact Number', value: profile?.contact_number },
                { label: 'Home Address',   value: profile?.address },
                { label: 'Birthday',       value: profile?.birthday },
                { label: 'Age',            value: profile?.age != null ? `${profile.age} years old` : null },
              ].map(item => (
                <div key={item.label} className="detail-row" style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 8px', transition: 'all 0.2s',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#78716c', fontSize: 10, letterSpacing: 1.5, marginBottom: 2 }}>
                      {item.label.toUpperCase()}
                    </div>
                    <div style={{ color: item.value ? '#e7e5e4' : '#44403c', fontSize: 14 }}>
                      {item.value || 'Not provided'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit Tab */}
          {tab === 'edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <p style={{
                color: '#78350f', fontSize: 10, letterSpacing: 3, fontWeight: 700,
                marginBottom: 4, paddingBottom: 8, borderBottom: '1px solid rgba(120,53,15,0.25)',
              }}>EDIT PROFILE</p>

              <div>
                <label style={labelStyle}>PROFILE PICTURE</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                    border: '2px solid rgba(245,158,11,0.3)',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {preview
                      ? <img src={preview} alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : profile?.profile_picture
                        ? <img src={profile.profile_picture} alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 20, color: '#f59e0b' }}>👤</span>
                    }
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange}
                    style={{
                      flex: 1, fontSize: 12, color: '#a8a29e',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(120,53,15,0.4)',
                      borderRadius: 8, padding: '8px 10px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>FULL NAME</label>
                <input className="profile-input" type="text" style={inputStyle}
                  value={editForm.name} placeholder="Juan dela Cruz"
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>CONTACT NUMBER</label>
                <input className="profile-input" type="tel" style={inputStyle}
                  value={editForm.contact_number} placeholder="09XX XXX XXXX"
                  onChange={e => setEditForm(p => ({ ...p, contact_number: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>HOME ADDRESS</label>
                <input className="profile-input" type="text" style={inputStyle}
                  value={editForm.address} placeholder="City, Province"
                  onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>BIRTHDAY</label>
                <input className="profile-input" type="date" style={inputStyle}
                  value={editForm.birthday}
                  onChange={e => setEditForm(p => ({ ...p, birthday: e.target.value }))} />
              </div>
              <button className="btn-primary" onClick={handleUpdate} disabled={saving}
                style={{
                  width: '100%', padding: '12px 0', marginTop: 4,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 10, color: '#f59e0b', fontSize: 13,
                  fontFamily: 'Georgia, serif', letterSpacing: 1,
                  cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <p style={{
                color: '#78350f', fontSize: 10, letterSpacing: 3, fontWeight: 700,
                marginBottom: 4, paddingBottom: 8, borderBottom: '1px solid rgba(120,53,15,0.25)',
              }}>CHANGE PASSWORD</p>
              <div>
                <label style={labelStyle}>CURRENT PASSWORD</label>
                <input className="profile-input" type="password" style={inputStyle}
                  value={passForm.old_password} placeholder="••••••••"
                  onChange={e => setPassForm(p => ({ ...p, old_password: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>NEW PASSWORD</label>
                <input className="profile-input" type="password" style={inputStyle}
                  value={passForm.new_password} placeholder="Min. 8 characters"
                  onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
                <input className="profile-input" type="password" style={inputStyle}
                  value={passForm.confirm_password} placeholder="Repeat new password"
                  onChange={e => setPassForm(p => ({ ...p, confirm_password: e.target.value }))} />
              </div>
              <button className="btn-primary" onClick={handleChangePassword} disabled={saving}
                style={{
                  width: '100%', padding: '12px 0', marginTop: 4,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 10, color: '#f59e0b', fontSize: 13,
                  fontFamily: 'Georgia, serif', letterSpacing: 1,
                  cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                }}>
                {saving ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-primary" onClick={() => { window.location.href = getDashboardLink(); }}
              style={{
                width: '100%', padding: '12px 0',
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 10, color: '#f59e0b', fontSize: 13,
                fontFamily: 'Georgia, serif', letterSpacing: 1,
                cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600,
              }}>
              Go to Dashboard
            </button>
            <button className="btn-danger" onClick={onLogout}
              style={{
                width: '100%', padding: '12px 0',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, color: '#f87171', fontSize: 13,
                fontFamily: 'Georgia, serif', letterSpacing: 1,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
              Sign Out
            </button>
            <button className="btn-delete" onClick={handleDelete}
              style={{
                width: '100%', padding: '10px 0',
                background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 10, color: '#6b2121', fontSize: 11,
                fontFamily: 'Georgia, serif', letterSpacing: 1,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;