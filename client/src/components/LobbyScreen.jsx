import { useState } from 'react';
import { COLORS } from '../constants';
import { showToast } from '../utils/toast';
import Starfield from './Starfield';

export default function LobbyScreen({
  userId, username, cursorColor, rooms,
  createdRoomDetails, promptRoom, promptError, joinError,
  onLogout, onColorChange,
  onJoinRoom, onCreateRoom, onPromptSubmit,
  onEnterRoom, onCancelPrompt, onEnterCreatedRoom,
  onCopyToClipboard, onDeleteRoom
}) {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [promptPassword, setPromptPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    if (!newRoomPassword || newRoomPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setCreating(true);
    await onCreateRoom(newRoomName.trim(), newRoomPassword);
    setCreating(false);
    setNewRoomName('');
    setNewRoomPassword('');
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinRoomId.trim() || !joinRoomPassword) return;
    setJoining(true);
    await onJoinRoom(joinRoomId.trim(), joinRoomPassword);
    setJoining(false);
    setJoinRoomId('');
    setJoinRoomPassword('');
  };

  const handlePrompt = async (e) => {
    e.preventDefault();
    if (!promptPassword) return;
    await onPromptSubmit(promptPassword);
    setPromptPassword('');
  };

  return (
    <>
      <div className="lobby-container">
        <div className="lobby-hero">
          <div className="lobby-wordmark">
            <div className="lobby-wordmark-dot" />
            <span className="lobby-wordmark-text">Live • Real-time</span>
          </div>
          <h1 className="lobby-title">Multiple Cursor Room</h1>
          <p className="lobby-subtitle">A shared canvas where your team draws, chats, and thinks together — live.</p>
        </div>

      <div className="lobby-setup-panel">
        <div className="panel-card glass card-glow" style={{ '--user-color': cursorColor, '--shine-delay': '0s' }}>
          <h2 className="card-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile Settings
            </span>
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171', padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                cursor: 'pointer', fontWeight: '600', fontFamily: 'var(--font-body)'
              }}
            >
              Logout
            </button>
          </h2>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Username</label>
            <div style={{ fontSize: '20px', fontWeight: '800', color: cursorColor, marginTop: '8px', fontFamily: 'var(--font-heading)' }}>
              {username}
            </div>
          </div>
          <div className="form-group">
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
        </div>

        <div className="panel-card glass card-glow" style={{ display: 'flex', flexDirection: 'column', '--user-color': cursorColor, '--shine-delay': '-1.8s' }}>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
            Rooms list
          </h2>

          <div className="room-grid">
            {rooms.length === 0 && (
              <div style={{
                gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)',
                fontSize: '13px', padding: '40px 20px', lineHeight: '1.6'
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px', opacity: 0.4 }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <div>No rooms available yet.</div>
                <div style={{ marginTop: '4px' }}>Create one to get started!</div>
              </div>
            )}
            {rooms.map(room => (
              <div key={room.id} className="room-card glass">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 className="room-card-title">{room.name || room.roomName}</h3>
                    {room.ownerId === userId && (
                      <span className="room-card-badge">Your Room</span>
                    )}
                  </div>
                  <div className="room-id-chip">
                    <span className="room-id-chip-label">ID</span>
                    {room.roomId || '—'}
                  </div>
                </div>
                <div>
                  <div className="room-card-actions">
                    <button className="btn-copy-id" onClick={() => onCopyToClipboard(room.roomId || '')}>
                      Copy ID
                    </button>
                    <button className="btn-enter-room" onClick={() => { setPromptPassword(''); onEnterRoom(room); }}>
                      Enter →
                    </button>
                    {room.ownerId === userId && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete room "${room.name || room.roomName}" permanently?`)) {
                            onDeleteRoom(room.id);
                          }
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171', padding: '6px 12px', borderRadius: '6px',
                          fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', transition: 'all 0.2s'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="room-card-footer">
                    <span className="player-count-badge">
                      <span className="dot" />
                      {room.activeCount || 0} active
                    </span>
                    {room.ownerId !== userId && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        by {room.createdBy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Join Private Room
            </h3>
            {joinError && (
              <div style={{
                color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px',
                borderRadius: '6px', fontSize: '12px', marginBottom: '12px', textAlign: 'left'
              }}>
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text" className="text-input" placeholder="8-Digit Room ID..."
                value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }} required
              />
              <input
                type="password" className="text-input" placeholder="Password..."
                value={joinRoomPassword} onChange={(e) => setJoinRoomPassword(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }} required
              />
              <button type="submit" className="btn-primary" disabled={joining}>
                {joining ? 'Joining…' : 'Join Room'}
              </button>
            </form>
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Create Protected Room
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text" className="text-input" placeholder="Room Name..."
                value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }} required
              />
              <input
                type="password" className="text-input" placeholder="Password (min 6 chars)..."
                value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }} required
              />
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create & Join'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {createdRoomDetails && (
        <div className="modal-overlay">
          <div className="panel-card glass modal-content" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', background: 'rgba(10, 10, 18, 0.94)', borderColor: 'rgba(125, 211, 252, 0.35)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '16px' }}>
              <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="rgba(34,197,94,0.15)" />
              <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="card-title" style={{ justifyContent: 'center', marginBottom: '12px', color: '#f8fafc' }}>Room Created Successfully</h3>
            <div style={{ margin: '20px 0', textAlign: 'left', background: 'rgba(255, 255, 255, 0.05)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(226, 232, 240, 0.85)' }}>Room Name</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', marginTop: '4px', color: '#f8fafc' }}>{createdRoomDetails.name}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(226, 232, 240, 0.85)' }}>Room ID</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace', color: '#7dd3fc', letterSpacing: '2px' }}>{createdRoomDetails.roomId}</span>
                <button
                  onClick={() => onCopyToClipboard(createdRoomDetails.roomId || '')}
                  style={{
                    background: 'rgba(125, 211, 252, 0.12)', border: '1px solid rgba(125, 211, 252, 0.35)',
                    color: '#7dd3fc', padding: '6px 14px', borderRadius: '6px',
                    fontSize: '12px', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={onEnterCreatedRoom}>
              Enter Room
            </button>
          </div>
        </div>
      )}

      {promptRoom && (
        <div className="modal-overlay">
          <div className="panel-card glass modal-content" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 className="card-title" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Enter Room Password
              </span>
              <button
                onClick={onCancelPrompt}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Please enter the password for room <strong>{promptRoom.name}</strong> (ID: {promptRoom.roomId})
            </p>
            {promptError && (
              <div style={{
                color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px',
                borderRadius: '6px', fontSize: '12px', marginBottom: '16px', textAlign: 'left'
              }}>
                {promptError}
              </div>
            )}
            <form onSubmit={handlePrompt}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Password</label>
                <input
                  type="password" className="text-input" placeholder="Enter password..."
                  value={promptPassword} onChange={(e) => setPromptPassword(e.target.value)}
                  required autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn-back" style={{ padding: '10px 20px', borderRadius: '8px' }} onClick={onCancelPrompt}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Join Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      <Starfield />
    </>
  );
}
