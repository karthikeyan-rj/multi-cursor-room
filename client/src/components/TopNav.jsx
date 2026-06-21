export default function TopNav({ roomName, roomDisplayId, roomInternalId, userId, userEmail, roomOwnerId, username, roomCreatedBy, cursorColor, remoteCursors, chatOpen, onToggleChat, onCopy, unreadCount, isLightBoard, onLeaveRoomRequest, onToggleMembers, membersOpen }) {
  const isCurrentUserOwner =
    String(roomOwnerId) === String(userId) ||
    userEmail === roomCreatedBy;

  const ownerLabel = roomCreatedBy
    ? `${roomCreatedBy}'s Room`
    : roomName;

  return (
    <>
      <nav className={`top-nav glass${isLightBoard ? ' light-board-nav' : ''}`}>
        <div className="nav-left">
          <button className="btn-back" onClick={onLeaveRoomRequest}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Leave Room
          </button>
          <div className="room-title-section">
            <div className="room-name-row">
              <h1 className="room-name-display">
                {ownerLabel}
                {isCurrentUserOwner && (
                  <span className="room-owner-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Owner
                  </span>
                )}
              </h1>
            </div>
            <div className="room-id-row">
              <span className="room-status-sub" style={{ userSelect: 'all' }}>Room ID: {roomDisplayId}</span>
              <button className="room-copy-btn" onClick={() => onCopy(roomDisplayId || '')} title="Copy Room ID">
                Copy
              </button>
            </div>
          </div>
        </div>
      <div className="nav-right">
        <button
          className={`toolbar-btn ${membersOpen ? 'active' : ''}`}
          onClick={onToggleMembers}
          title="Room Members"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
        <button
          className={`toolbar-btn ${chatOpen ? 'active' : ''}`}
          onClick={onToggleChat} title="Room Chat" style={{ position: 'relative' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
      </nav>
    </>
  );
}
