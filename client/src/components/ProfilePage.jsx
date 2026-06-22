import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toast';
import Starfield from './Starfield';
import { SERVER_URL } from '../config';

export default function ProfilePage({ auth }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [color, setColor] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('cursor_room_token');
        const res = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUserData(data.user);
          setUsername(data.user.username);
          setColor(data.user.color);
        } else {
          showToast('Failed to load profile', 'error');
          navigate('/dashboard');
        }
      } catch {
        showToast('Cannot reach server', 'error');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      showToast('Username cannot be empty', 'error');
      return;
    }
    if (username.trim().length < 3 || username.trim().length > 20) {
      showToast('Username must be between 3 and 20 characters', 'error');
      return;
    }
    setSaveBusy(true);
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: username.trim(), color })
      });
      const data = await res.json();
      if (data.success) {
        setUserData(data.user);
        auth.setUsername(data.user.username);
        auth.setCursorColor(data.user.color);
        auth.setCurrentUser(data.user);
        localStorage.setItem('cursor_room_color', data.user.color);
        showToast('Profile updated', 'success');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!currentPassword) { setPwError('Current password is required'); return; }
    if (!newPassword) { setPwError('New password is required'); return; }
    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    setPwBusy(true);
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Password changed successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwError(data.error || 'Failed to change password');
      }
    } catch {
      setPwError('Failed to change password');
    } finally {
      setPwBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="lobby-container" style={{ justifyContent: 'center' }}>
        <div className="lobby-hero" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
          <h1 className="lobby-title">Multiple Cursor Room</h1>
          <p className="lobby-subtitle">Loading profile…</p>
        </div>
        <Starfield />
      </div>
    );
  }

  const initials = (userData?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="profile-page">
        <div className="profile-page-inner">
          {/* Navigation */}
          <div className="profile-nav">
            <button className="profile-back-btn" onClick={() => navigate('/dashboard')} aria-label="Back to Dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          {/* Header */}
          <div className="profile-header glass">
            <div className="profile-avatar-lg" style={{ backgroundColor: color }}>
              {initials}
            </div>
            <div className="profile-header-info">
              <h1 className="profile-header-name">{userData?.username}</h1>
              <p className="profile-header-email">{userData?.email}</p>
              <p className="profile-header-meta">
                User ID: <span className="profile-id">{userData?.userId}</span>
              </p>
            </div>
          </div>

          <div className="profile-body">
            {/* Profile Details */}
            <div className="profile-card glass">
              <h2 className="profile-card-title">Profile Details</h2>
              <div className="profile-form">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text" className="text-input"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="text" className="text-input"
                    value={userData?.email || ''} readOnly
                    style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Avatar Color</label>
                  <div className="profile-color-rows">
                    <input
                      type="color" className="profile-color-input"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                    />
                    <span className="profile-color-hex">{color}</span>
                  </div>
                </div>
                <button
                  type="button" className="btn-primary profile-save-btn"
                  onClick={handleSaveProfile}
                  disabled={saveBusy}
                >
                  {saveBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="profile-card glass">
              <h2 className="profile-card-title">Change Password</h2>
              <form className="profile-form" onSubmit={handleChangePassword}>
                {pwError && (
                  <div className="profile-error">{pwError}</div>
                )}
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="password-field">
                    <input
                      type={showCurrent ? 'text' : 'password'} className="text-input"
                      placeholder="Enter current password"
                      value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle"
                      onClick={() => setShowCurrent(!showCurrent)}
                      aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showCurrent
                          ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                          : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="password-field">
                    <input
                      type={showNew ? 'text' : 'password'} className="text-input"
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle"
                      onClick={() => setShowNew(!showNew)}
                      aria-label={showNew ? 'Hide password' : 'Show password'}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showNew
                          ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                          : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="password-field">
                    <input
                      type={showConfirm ? 'text' : 'password'} className="text-input"
                      placeholder="Re-enter new password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showConfirm
                          ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                          : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  type="submit" className="btn-primary profile-save-btn"
                  disabled={pwBusy}
                >
                  {pwBusy ? 'Changing…' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Starfield />
    </>
  );
}