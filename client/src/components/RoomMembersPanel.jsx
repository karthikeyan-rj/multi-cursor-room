import { useState, useEffect, useCallback, useMemo } from 'react';
import { showToast } from '../utils/toast';
import { socket } from '../hooks/useRoomSession';
import { SERVER_URL } from '../config';

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

export default function RoomMembersPanel({ roomDisplayId, userId, userEmail, username, cursorColor, onClose, activeUserCount }) {
  const [members, setMembers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineMembers, setOnlineMembers] = useState([]);

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
    const handler = (payload) => {
      if (payload && payload.members) {
        setOnlineMembers(payload.members);
      }
      fetchMembers();
    };
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
    const ids = new Set(onlineMembers.map(m => String(m.userId)));
    if (userId) ids.add(String(userId));
    return ids;
  }, [onlineMembers, userId]);

  const isUserOnline = (memberUserId) => onlineUserIds.has(String(memberUserId));

  const onlineCount = typeof activeUserCount === 'number' ? activeUserCount : onlineUserIds.size;

  const otherParticipants = members.filter(m => !isSameUser({ userId: m.userId }, { userId: ownerId }));

  const currentUserObj = { userId, email: userEmail };

  return (
    <div className="members-panel room-glass-panel room-side-drawer" onClick={e => e.stopPropagation()}>
      <div className="members-panel-header">
        <h3 className="members-panel-title">Members <span className="members-online-count">{onlineCount} online</span></h3>
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
            {/* Owner */}
            <div className="member-row owner-row">
              <div className="member-avatar" style={{ backgroundColor: cursorColor }}>
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <div className="member-info">
                <div className="member-name">
                  {ownerName}
                  {isSameUser({ userId: ownerId }, currentUserObj) && <span className="member-you"> (You)</span>}
                </div>
                <div className="member-meta">
                  <span className="member-badge owner-badge">Owner</span>
                  <span className={`member-badge ${isUserOnline(ownerId) ? 'online-badge' : 'offline-badge'}`}>
                    {isUserOnline(ownerId) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Participants */}
            {otherParticipants.length > 0 && (
              <div className="members-panel-section-label">Participants</div>
            )}
            {otherParticipants.map((member, i) => {
              const isYou = isSameUser(member, currentUserObj);
              return (
                <div key={member.userId || i} className="member-row">
                  <div className="member-avatar" style={{ backgroundColor: isYou ? cursorColor : '#475569' }}>
                    {(member.username || member.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {member.username || member.email || 'Unknown'}
                      {isYou && <span className="member-you"> (You)</span>}
                    </div>
                    <div className="member-meta">
                      <span className={`member-badge ${isUserOnline(member.userId) ? 'online-badge' : 'offline-badge'}`}>
                        {isUserOnline(member.userId) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {isOwner && !isYou && (
                    <button className="member-kick-btn" onClick={() => handleKick(member.userId)} title="Remove this user">
                      Kick
                    </button>
                  )}
                </div>
              );
            })}

            {/* Pending join requests */}
            {isOwner && joinRequests.filter(r => r.status === 'pending').length > 0 && (
              <>
                <div className="members-panel-section-label">Pending Requests</div>
                {joinRequests.filter(r => r.status === 'pending').map((req, i) => (
                  <div key={req.userId || i} className="member-row request-row">
                    <div className="member-avatar" style={{ backgroundColor: '#64748b' }}>
                      {(req.username || req.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{req.username || req.email || 'Unknown'}</div>
                      <div className="member-meta">
                        <span className="member-badge pending-badge">Pending</span>
                      </div>
                    </div>
                    <div className="member-request-actions">
                      <button className="member-approve-btn" onClick={() => handleApprove(req.userId)} title="Approve">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button className="member-reject-btn" onClick={() => handleReject(req.userId)} title="Reject">
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
