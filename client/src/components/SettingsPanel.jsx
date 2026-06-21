import { useState } from 'react';

const COLORS = [
  '#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#38D9A9',
  '#4DABF7', '#748FFC', '#9775FA', '#F783AC', '#20C997'
];

export default function SettingsPanel({ cursorColor, onColorChange, onClose, onSignOut }) {
  const [activeTab, setActiveTab] = useState('preferences');
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('chat_muted') === 'true');

  const handleToggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    localStorage.setItem('chat_muted', next);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel-card glass settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3 className="settings-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Settings
          </h3>
          <button className="db-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-modal-tabs">
          <button
            className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >Preferences</button>
          <button
            className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >Account</button>
        </div>

        <div className="settings-modal-body">
          {activeTab === 'preferences' && (
            <div className="settings-section">
              <div className="settings-group">
                <label className="form-label">Cursor Color</label>
                <div className="color-grid settings-color-grid">
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

              <div className="settings-group">
                <label className="form-label">Chat Sound</label>
                <div className="settings-toggle-row">
                  <span className="settings-toggle-label">
                    {soundMuted ? 'Sound is muted' : 'Sound is on'}
                  </span>
                  <button
                    type="button"
                    className={`settings-toggle ${soundMuted ? 'muted' : 'active'}`}
                    onClick={handleToggleSound}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="settings-section">
              <p className="settings-account-note">
                Account settings (profile details, password) are managed from your Profile page.
              </p>
              <button
                type="button"
                className="db-signout-btn settings-signout-btn"
                onClick={onSignOut}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}