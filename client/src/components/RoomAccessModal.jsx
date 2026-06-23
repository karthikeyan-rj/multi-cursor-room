import { useState, useEffect, useRef } from 'react';

export default function RoomAccessModal({
  roomId,
  onConfirm,
  onCancel,
  error,
  busy
}) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef(null);
  const hasError = !!error;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim() || busy) return;
    onConfirm(password.trim());
  };

  return (
    <div className="navigation-guard-backdrop" onClick={onCancel}>
      <div
        className="navigation-guard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-access-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="room-access-title">Room Access Required</h3>
        <p>To re-enter this room, please enter the room password again.</p>

        <div className="room-access-room-id">
          Room ID: <strong>{roomId}</strong>
        </div>

        <form onSubmit={handleSubmit} className="room-access-form">
          <div className="room-access-pw-wrap">
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              placeholder="Enter room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="button"
              className="room-access-pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          {hasError && <p className="room-access-error">{error}</p>}

          <div className="navigation-guard-actions">
            <button
              type="button"
              className="navigation-guard-secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="navigation-guard-primary"
              disabled={busy || !password.trim()}
            >
              {busy ? 'Checking...' : 'Enter Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
