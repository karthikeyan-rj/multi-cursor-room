import { useState } from 'react';
import { COLORS } from '../constants';

export default function AuthScreen({ authError, authBusy, cursorColor, onLogin, onSignup, onColorChange }) {
  const [authTab, setAuthTab] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) return;
    if (authTab === 'login') {
      onLogin(authUsername.trim(), authPassword.trim());
    } else {
      onSignup(authUsername.trim(), authPassword.trim());
    }
  };

  return (
    <div className="lobby-container">
      <div className="lobby-hero">
        <div className="lobby-wordmark">
          <div className="lobby-wordmark-dot" />
          <span className="lobby-wordmark-text">Live • Real-time</span>
        </div>
        <h1 className="lobby-title">Multiple Cursor Room</h1>
        <p className="lobby-subtitle">Collaborate in real-time — draw, chat, and drop sticky notes with your team.</p>
      </div>

      <div className="panel-card glass" style={{ width: '100%', maxWidth: '400px', animation: 'fadeInUp 0.6s ease-out' }}>
        <div className="auth-tabs" style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <button
            className="auth-tab-btn"
            onClick={() => { setAuthTab('login'); }}
            style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              color: authTab === 'login' ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: authTab === 'login' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: '600',
              fontSize: '16px', transition: 'all 0.2s'
            }}
          >
            Login
          </button>
          <button
            className="auth-tab-btn"
            onClick={() => { setAuthTab('signup'); }}
            style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              color: authTab === 'signup' ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: authTab === 'signup' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: '600',
              fontSize: '16px', transition: 'all 0.2s'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {authError && (
            <div style={{
              color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'left'
            }}>
              {authError}
            </div>
          )}

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Username</label>
            <input
              type="text" className="text-input" value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              placeholder="Enter username" maxLength={20} required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Password</label>
            <input
              type="password" className="text-input" value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Enter password" required
            />
          </div>

          {authTab === 'signup' && (
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Cursor Color</label>
              <div className="color-grid">
                {COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-swatch ${cursorColor === c ? 'active' : ''}`}
                    style={{ backgroundColor: c, '--swatch-color': c }}
                    onClick={() => onColorChange(c)}
                  />
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={authBusy}>
            {authBusy ? 'Please wait…' : (authTab === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
