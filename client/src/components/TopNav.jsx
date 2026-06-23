export default function TopNav({ roomName, roomDisplayId, roomInternalId, userId, userEmail, roomOwnerId, username, roomCreatedBy, cursorColor, activeUserCount, activeRoomPanel, onToggleChat, onCopy, unreadCount, isLightBoard, onLeaveRoomRequest, onToggleMembers, pendingRequestsCount, onToggleSettings, onToggleVoice, isVoiceActive }) {
  const isCurrentUserOwner =
    String(roomOwnerId) === String(userId) ||
    userEmail === roomCreatedBy;

  const ownerLabel = roomCreatedBy
    ? `${roomCreatedBy}'s Room`
    : roomName;

  const onlineCount = typeof activeUserCount === 'number' ? activeUserCount : 1;

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
              <span className="room-online-count" title="Online members">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ marginRight: 3, verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {onlineCount} online
              </span>
            </div>
          </div>
        </div>
      <div className="room-header-actions">
        <button
          className={`toolbar-btn room-action-btn ${activeRoomPanel === 'chat' ? 'active' : ''}`}
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
        <button
          className={`toolbar-btn room-action-btn ${activeRoomPanel === 'members' ? 'active' : ''}`}
          onClick={onToggleMembers}
          title="Room Members"
          style={{ position: 'relative' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {pendingRequestsCount > 0 && (
            <span className="members-notification-dot" />
          )}
        </button>
        <button
          className={`toolbar-btn room-action-btn ${isVoiceActive ? 'active' : ''}`}
          onClick={onToggleVoice}
          title="Voice Call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
        <button
          className={`toolbar-btn room-action-btn ${activeRoomPanel === 'settings' ? 'active' : ''}`}
          onClick={onToggleSettings}
          title={isCurrentUserOwner ? "Room Settings" : "Room Info"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
      </nav>
    </>
  );
}
