export default function RemoteCursorOverlay({ remoteCursors, viewport }) {
  return Object.values(remoteCursors).map(user => (
    user.x !== undefined && (
      <div key={user.id} style={{
        position: 'fixed',
        left: user.x * viewport.scale + viewport.x,
        top: user.y * viewport.scale + viewport.y,
        pointerEvents: 'none',
        transform: 'translate(-2px, -2px)',
        transition: 'left 0.08s cubic-bezier(0.1, 0.8, 0.25, 1), top 0.08s cubic-bezier(0.1, 0.8, 0.25, 1)',
        zIndex: 90
      }}>
        <svg width="22" height="22" viewBox="0 0 20 20">
          <path d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L11 9 Z" fill={user.color} stroke="#000" strokeWidth="1.5" />
        </svg>
        <div style={{
          position: 'absolute', top: 20, left: 10, background: user.color, color: '#000',
          padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
          whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${user.color}44`
        }}>
          {user.name}
        </div>
      </div>
    )
  ));
}
