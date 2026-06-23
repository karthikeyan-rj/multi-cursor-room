import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS } from '../constants';
import Starfield from './Starfield';

export default function AuthScreen({ authError, authBusy, cursorColor, onLogin, onSignup, onColorChange, initialTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  const authTab =
    initialTab ||
    (location.pathname === '/register' ? 'signup' : 'login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const displayError = localError || authError;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (authTab === 'login') {
      if (!authEmail.trim() || !authPassword.trim()) return;
      onLogin(authEmail.trim(), authPassword.trim());
    } else {
      if (!authUsername.trim() || !authEmail.trim() || !authPassword.trim()) return;
      if (!authEmail.includes('@')) {
        setLocalError('Please enter a valid email address');
        return;
      }
      onSignup(authUsername.trim(), authEmail.trim(), authPassword.trim());
    }
  };

  return (
    <>
      <div className="lobby-container">
        <div className="lobby-hero">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' }}>
            <rect x="2" y="2" width="36" height="36" rx="10" stroke="url(#ag)" strokeWidth="2.5" fill="rgba(59,130,246,0.06)" />
            <path d="M14 20c0-4.4 2.7-8 6-8s6 3.6 6 8-2.7 8-6 8-6-3.6-6-8z" stroke="url(#ag)" strokeWidth="1.5" fill="none" />
            <path d="M10 28c1.5-3.5 4.5-5.5 8-5.5s6.5 2 8 5.5" stroke="url(#ag)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="18" r="3" fill="url(#ag)" />
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="lobby-title">Multiple Cursor Room</h1>
          <p className="lobby-subtitle">Collaborate in real-time — draw, chat, and drop sticky notes with your team.</p>
        </div>

        <div className="panel-card glass card-glow" style={{
          width: '100%', maxWidth: '400px', animation: 'fadeInUp 0.6s ease-out',
          position: 'relative', zIndex: 1, '--user-color': cursorColor, '--shine-delay': '-0.8s'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)'
          }} />
          <div className="auth-tabs" style={{ display: 'flex', marginBottom: '28px', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px' }}>
          <button
            onClick={() => { setLocalError(''); navigate('/login', { replace: false }); }}
            style={{
              flex: 1, padding: '10px', background: authTab === 'login' ? 'rgba(59,130,246,0.12)' : 'transparent',
              border: authTab === 'login' ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
              color: authTab === 'login' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: '600',
              fontSize: '14px', transition: 'all 0.2s', borderRadius: '8px'
            }}
          >
            Login
          </button>
          <button
            onClick={() => { setLocalError(''); navigate('/register', { replace: false }); }}
            style={{
              flex: 1, padding: '10px', background: authTab === 'signup' ? 'rgba(59,130,246,0.12)' : 'transparent',
              border: authTab === 'signup' ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
              color: authTab === 'signup' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: '600',
              fontSize: '14px', transition: 'all 0.2s', borderRadius: '8px'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {displayError && (
            <div style={{
              color: '#f87171', background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px', marginBottom: '20px', textAlign: 'left'
            }}>
              {displayError}
            </div>
          )}

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">{authTab === 'login' ? 'Email' : 'Username'}</label>
            {authTab === 'login' ? (
              <input
                type="email" className="text-input" value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Enter your email" required
              />
            ) : (
              <input
                type="text" className="text-input" value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Enter your username" maxLength={20} required
              />
            )}
          </div>

          {authTab === 'signup' && (
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Email</label>
              <input
                type="email" className="text-input" value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Enter your email" required
              />
            </div>
          )}

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"} className="text-input" value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter your password" required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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

          {authTab === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '-4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => { setLocalError(''); navigate('/register', { replace: false }); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0, textDecoration: 'underline' }}>
                  Sign up
                </button>
              </span>
            </div>
          )}
          {authTab === 'signup' && (
            <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '-4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => { setLocalError(''); navigate('/login', { replace: false }); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0, textDecoration: 'underline' }}>
                  Log in
                </button>
              </span>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={authBusy}>
            {authBusy ? 'Please wait\u2026' : (authTab === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
      <Starfield />
    </>
  );
}
