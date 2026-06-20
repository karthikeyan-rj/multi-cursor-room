export default function TopNav({ roomName, roomDisplayId, username, roomCreatedBy, cursorColor, remoteCursors, chatOpen, onToggleChat, onLeaveRoom, onDeleteRoom, onCopy, unreadCount }) {
  return (
    <nav className="top-nav glass">
      <div className="nav-left">
        <button className="btn-back" onClick={onLeaveRoom}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
          </svg>
          Lobby
        </button>
        <div className="room-title-section">
          <h1 className="room-name-display" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {roomName}
            {username === roomCreatedBy && (
              <button onClick={() => { if (window.confirm('Delete this room?')) onDeleteRoom(); }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171', padding: '3px 10px', borderRadius: '6px',
                  fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s'
                }}
                title="Delete room permanently"
              >
                Delete Room
              </button>
            )}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span className="room-status-sub" style={{ userSelect: 'all' }}>Room ID: {roomDisplayId}</span>
            <button
              onClick={() => onCopy(roomDisplayId || '')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px',
                fontSize: '10px', cursor: 'pointer', transition: 'all 0.2s'
              }}
              title="Copy Room ID"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
      <div className="nav-right">
        <div className="active-users-list">
          <div className="user-avatar-circle" style={{ backgroundColor: cursorColor, color: '#000', cursor: 'default' }} title={`${username} (You)`}>
            {username.charAt(0).toUpperCase()}
          </div>
          {Object.values(remoteCursors).map(u => (
            <div key={u.id} className="user-avatar-circle" style={{ backgroundColor: u.color }} title={u.name}>
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <button
          className={`toolbar-btn ${chatOpen ? 'active' : ''}`}
          onClick={onToggleChat} title="Toggle Room Chat" style={{ position: 'relative' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: '#fff', fontSize: '10px',
              fontWeight: '700', minWidth: '16px', height: '16px',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '0 3px',
              boxShadow: '0 0 6px rgba(239,68,68,0.6)'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
