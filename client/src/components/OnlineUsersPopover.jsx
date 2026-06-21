import { useRef } from 'react';
import { useClickOutside } from '../utils/useClickOutside';
import { isCurrentUser } from '../utils/isCurrentUser';

export default function OnlineUsersPopover({ users, currentUser, onClose }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);

  return (
    <div ref={ref} className="online-users-popover glass">
      <div className="online-users-popover-header">Active Users</div>
      <div className="online-users-popover-list">
        {users.map((user, i) => {
          const isMe = isCurrentUser(user, currentUser);
          return (
            <div key={user.id || i} className={`online-user-item ${isMe ? 'me' : ''}`}>
              <div className="online-user-avatar" style={{ backgroundColor: user.color || '#888' }}>
                <span className="online-user-dot" />
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="online-user-name">
                {user.name}
                {isMe && <span className="online-user-you"> (You)</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
