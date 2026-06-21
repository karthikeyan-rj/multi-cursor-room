import { useState, useCallback } from 'react';
import OnlineUsersPopover from './OnlineUsersPopover';

export default function TopNav({ roomName, roomDisplayId, userId, roomOwnerId, username, roomCreatedBy, cursorColor, remoteCursors, chatOpen, onToggleChat, onLeaveRoom, onDeleteRoom, onCopy, unreadCount, isLightBoard, onLeaveRoomRequest }) {
  const [showUsers, setShowUsers] = useState(false);

  const allUsers = [
    { id: 'self', userId, name: username, color: cursorColor },
    ...Object.values(remoteCursors).map(u => ({ id: u.id, userId: u.userId, name: u.name, color: u.color }))
  ];

  const currentUser = { userId, name: username, color: cursorColor };

  const closeUsers = useCallback(() => setShowUsers(false), []);

  return (
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
            <h1 className="room-name-display">{roomName}</h1>
            {userId === roomOwnerId && (
              <button className="room-delete-btn" onClick={() => { if (window.confirm('Delete this room?')) onDeleteRoom(); }} title="Delete room permanently">
                Delete Room
              </button>
            )}
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
        <div className="active-users-list" onClick={() => setShowUsers(v => !v)}>
          <div className="user-avatar-circle" style={{ backgroundColor: cursorColor, color: '#000', cursor: 'pointer' }} title={`${username} (You)`}>
            {username.charAt(0).toUpperCase()}
          </div>
          {Object.values(remoteCursors).slice(0, 5).map(u => (
            <div key={u.id} className="user-avatar-circle" style={{ backgroundColor: u.color, cursor: 'pointer' }} title={u.name}>
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {Object.keys(remoteCursors).length > 5 && (
            <div className="user-avatar-circle user-avatar-more" style={{ cursor: 'pointer' }}>
              +{Object.keys(remoteCursors).length - 5}
            </div>
          )}
        </div>
        {showUsers && (
          <OnlineUsersPopover users={allUsers} currentUser={currentUser} onClose={closeUsers} />
        )}
        <button
          className={`toolbar-btn ${chatOpen ? 'active' : ''}`}
          onClick={onToggleChat} title="Toggle Room Chat" style={{ position: 'relative' }}
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
  );
}
