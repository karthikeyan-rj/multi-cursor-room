import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../hooks/useRoomSession';
import { SERVER_URL } from '../config';

export default function ActivityPanel({ roomDisplayId, onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  const fetchActivities = useCallback(async () => {
    if (!roomDisplayId) return;
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [roomDisplayId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    const handler = (activity) => {
      setActivities(prev => {
        const next = [...prev, activity];
        return next.length > 50 ? next.slice(-50) : next;
      });
    };
    socket.on('room:activity-event', handler);
    return () => { socket.off('room:activity-event', handler); };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [activities]);

  const typeIcons = {
    join: '→',
    leave: '←',
    kick: '⊘',
    file: '📄',
    sticky: '📌',
    board: '🎨',
    canvas: '🗑',
    join_request: '✉',
    settings: '⚙'
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="activity-panel room-glass-panel room-side-drawer" onClick={e => e.stopPropagation()}>
      <div className="activity-panel-header">
        <h3 className="activity-panel-title">Activity</h3>
        <span className="activity-panel-subtitle">Recent room events</span>
        <button className="activity-panel-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="activity-panel-body" ref={listRef}>
        {loading ? (
          <div className="activity-panel-loading">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="activity-panel-empty">
            <div className="activity-empty-icon">•</div>
            <div>No activity yet</div>
          </div>
        ) : (
          activities.map((a, i) => (
            <div key={i} className={`activity-item ${a.type}`}>
              <div className="activity-item-icon">{typeIcons[a.type] || '•'}</div>
              <div className="activity-item-content">
                <div className="activity-item-message">{a.message}</div>
                <div className="activity-item-time">{formatTime(a.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
