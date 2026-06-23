import { socket } from '../hooks/useRoomSession';

export default function RemoteCursorOverlay({ remoteCursors, viewport, userId }) {
  const visibleCursors = Object.values(remoteCursors).filter((cursor) => {
    if (!cursor) return false;
    const sameUser =
      userId &&
      cursor.userId &&
      String(cursor.userId) === String(userId);
    const sameSocket =
      socket?.id &&
      cursor.id &&
      String(cursor.id) === String(socket.id);
    return !sameUser && !sameSocket;
  });

  return visibleCursors.map(user => (
    user.x !== undefined && (
      <div key={user.id} className="remote-cursor" style={{
        left: user.x * viewport.scale + viewport.x,
        top: user.y * viewport.scale + viewport.y
      }}>
        <div className="remote-cursor-pointer-wrap" style={{ color: user.color }}>
          <svg className="remote-cursor-pointer" width="13" height="13" viewBox="0 0 20 20" fill={user.color}>
            <path d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L11 9 Z" />
          </svg>
        </div>
        <div className="remote-cursor-label">
          {user.name}
        </div>
      </div>
    )
  ));
}
