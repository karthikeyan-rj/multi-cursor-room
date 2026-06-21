import { useState, useEffect, useCallback, useMemo } from 'react';
import { showToast } from '../utils/toast';
import { socket } from '../hooks/useRoomSession';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function getUserId(user) {
  return user?.userId || user?._id || user?.id;
}

function getUserEmail(user) {
  return user?.email || user?.userEmail;
}

function isSameUser(a, b) {
  const aId = getUserId(a);
  const bId = getUserId(b);
  if (aId && bId) return String(aId) === String(bId);
  const aEmail = getUserEmail(a);
  const bEmail = getUserEmail(b);
  if (aEmail && bEmail) return aEmail.toLowerCase() === bEmail.toLowerCase();
  return false;
}

export default function RoomMembersPanel({ roomDisplayId, userId, userEmail, username, cursorColor, remoteCursors, onClose }) {
  const [members, setMembers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOwnerId(data.ownerId);
        setOwnerName(data.ownerName || 'Owner');
        setMembers(data.participants || []);
        setJoinRequests(data.joinRequests || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [roomDisplayId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const handler = () => fetchMembers();
    socket.on('room-members-updated', handler);
    return () => { socket.off('room-members-updated', handler); };
  }, [fetchMembers]);

  const isOwner = isSameUser({ userId }, { userId: ownerId });

  const handleKick = async (targetUserId) => {
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('User removed from room.', 'success');
        fetchMembers();
      } else {
        showToast(data.error || 'Failed to kick user.', 'error');
      }
    } catch (err) {
      showToast('Failed to kick user.', 'error');
    }
  };

  const handleApprove = async (requesterUserId) => {
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/requests/${requesterUserId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('User approved.', 'success');
        fetchMembers();
      } else {
        showToast(data.error || 'Failed to approve.', 'error');
      }
    } catch (err) {
      showToast('Failed to approve request.', 'error');
    }
  };

  const handleReject = async (requesterUserId) => {
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/requests/${requesterUserId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Request rejected.', 'success');
        fetchMembers();
      } else {
        showToast(data.error || 'Failed to reject.', 'error');
      }
    } catch (err) {
      showToast('Failed to reject request.', 'error');
    }
  };

  const onlineUserIds = useMemo(() => {
    return new Set(Object.values(remoteCursors).map(u => String(u.userId)));
  }, [remoteCursors]);

  const isUserOnline = (memberUserId) => onlineUserIds.has(String(memberUserId));

  const otherParticipants = members.filter(m => !isSameUser({ userId: m.userId }, { userId: ownerId }));

  const currentUserObj = { userId, email: userEmail };

  return (
    <div className="members-panel glass" onClick={e => e.stopPropagation()}>
      <div className="members-panel-header">
        <h3 className="members-panel-title">Room Members</h3>
        <button className="members-panel-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="members-panel-body">
        {loading ? (
          <div className="members-panel-loading">Loading...</div>
        ) : (
          <>
            <div className="members-panel-section-label">Owner</div>
            <div className="members-panel-item owner-item">
              <div className="members-panel-avatar" style={{ backgroundColor: isOwner ? cursorColor : '#888' }}>
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <div className="members-panel-info">
                <span className="members-panel-name">
                  {ownerName}
                  {isOwner && <span className="members-panel-you"> (You)</span>}
                </span>
                <span className="members-panel-badge owner-badge">Owner</span>
              </div>
              {isUserOnline(ownerId) && <span className="members-panel-online-dot" />}
            </div>

            <div className="members-panel-section-label">Participants</div>
            {otherParticipants.length === 0 ? (
              <div className="members-panel-empty">No other participants</div>
            ) : (
              otherParticipants.map((member, i) => {
                const isYou = isSameUser(member, currentUserObj);
                return (
                  <div key={member.userId || i} className="members-panel-item">
                    <div className="members-panel-avatar" style={{ backgroundColor: isYou ? cursorColor : '#555' }}>
                      {(member.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="members-panel-info">
                      <span className="members-panel-name">
                        {member.username || member.email || 'Unknown'}
                        {isYou && <span className="members-panel-you"> (You)</span>}
                      </span>
                    </div>
                    {isUserOnline(member.userId) && <span className="members-panel-online-dot" />}
                    {isOwner && !isYou && (
                      <button
                        className="members-panel-kick-btn"
                        onClick={() => handleKick(member.userId)}
                        title="Kick this user"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {isOwner && joinRequests.length > 0 && (
              <>
                <div className="members-panel-section-label">Pending Requests</div>
                {joinRequests.filter(r => r.status === 'pending').map((req, i) => (
                  <div key={req.userId || i} className="members-panel-item request-item">
                    <div className="members-panel-avatar" style={{ backgroundColor: '#555' }}>
                      {(req.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="members-panel-info">
                      <span className="members-panel-name">{req.username || req.email || 'Unknown'}</span>
                      <span className="members-panel-status">pending</span>
                    </div>
                    <div className="members-panel-actions">
                      <button
                        className="members-panel-approve-btn"
                        onClick={() => handleApprove(req.userId)}
                        title="Approve"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button
                        className="members-panel-reject-btn"
                        onClick={() => handleReject(req.userId)}
                        title="Reject"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}