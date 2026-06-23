import { useState, useEffect, useCallback } from 'react';
import { showToast } from '../utils/toast';
import ConfirmationModal from './ConfirmationModal';
import { socket } from '../hooks/useRoomSession';
import { SERVER_URL } from '../config';

export default function RoomSettingsPanel({ roomDisplayId, roomName: initialName, isOwner, isLightBoard, onClose, onDeleteRoom, onCopy, onRoomNameChange }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState(initialName || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!roomDisplayId) return;
    try {
      const token = localStorage.getItem('cursor_room_token');
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setRoomName(data.settings.name || initialName || '');
      }
    } catch (_) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [roomDisplayId, initialName]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
      setActivitiesLoading(false);
    }
  }, [roomDisplayId]);

  useEffect(() => {
    if (isOwner) fetchActivities();
  }, [isOwner, fetchActivities]);

  useEffect(() => {
    if (!isOwner) return;
    const handler = (activity) => {
      setActivities(prev => {
        const next = [...prev, activity];
        return next.length > 50 ? next.slice(-50) : next;
      });
    };
    socket.on('room:activity-event', handler);
    return () => { socket.off('room:activity-event', handler); };
  }, [isOwner]);

  const handleSave = async () => {
    if (!isOwner) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('cursor_room_token');
      const body = {};
      if (roomName.trim() && roomName.trim() !== initialName) {
        body.name = roomName.trim();
      }
      if (newPassword) {
        body.password = newPassword;
      }
      if (settings) {
        body.allowChat = settings.allowChat;
        body.allowFiles = settings.allowFiles;
        body.allowDrawing = settings.allowDrawing;
        body.allowStickyNotes = settings.allowStickyNotes;
        body.allowPresentation = settings.allowPresentation;
      }
      if (Object.keys(body).length === 0) {
        showToast('No changes to save.', 'info');
        setSaving(false);
        return;
      }
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomDisplayId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Settings saved.', 'success');
        setNewPassword('');
        if (body.name) onRoomNameChange?.(body.name);
      } else {
        showToast(data.error || 'Failed to save settings.', 'error');
      }
    } catch (_) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field) => {
    if (!isOwner) return;
    setSettings(prev => prev ? { ...prev, [field]: !prev[field] } : prev);
  };

  const handleDeleteRoom = async () => {
    if (isDeletingRoom || !onDeleteRoom) return;
    const roomIdentifier = roomDisplayId;
    if (!roomIdentifier) {
      setDeleteError("Missing room identifier. Please refresh and try again.");
      return;
    }
    try {
      setIsDeletingRoom(true);
      setDeleteError("");
      await onDeleteRoom(roomIdentifier);
      setShowDeleteConfirm(false);
    } catch (err) {
      setDeleteError(err?.message || "Failed to delete room. Please try again.");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const typeIcons = {
    join: '→', leave: '←', kick: '⊘', file: '📄', sticky: '📌',
    board: '🎨', canvas: '🗑', join_request: '✉', settings: '⚙'
  };

  const formatActivityTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="settings-panel glass" onClick={e => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h3 className="settings-panel-title">{isOwner ? 'Room Settings' : 'Room Info'}</h3>
          <button className="settings-panel-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="settings-panel-body">
          <div className="settings-panel-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel glass" onClick={e => e.stopPropagation()}>
      <div className="settings-panel-header">
        <h3 className="settings-panel-title">{isOwner ? 'Room Settings' : 'Room Info'}</h3>
        <button className="settings-panel-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="settings-panel-body">
        <div className="settings-section">
          <label className="settings-label">Room Name</label>
          <input
            className="settings-input"
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            disabled={!isOwner}
            placeholder="Enter room name"
          />
        </div>

        <div className="settings-section">
          <label className="settings-label">Room ID</label>
          <div className="settings-room-id-row">
            <span className="settings-room-id">{roomDisplayId}</span>
            <button className="settings-copy-btn" onClick={() => onCopy(roomDisplayId || '')}>
              Copy
            </button>
          </div>
        </div>

        {isOwner && (
          <>
            <div className="settings-section">
              <label className="settings-label">Change Password</label>
              <input
                className="settings-input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
              />
            </div>

            <div className="settings-section">
              <label className="settings-label">Room Permissions</label>
              {settings && (
                <div>
                  <label className="permission-row">
                    <input
                      type="checkbox"
                      checked={settings.allowChat}
                      onChange={() => handleToggle('allowChat')}
                    />
                    <span className="permission-copy">
                      <strong>Allow Chat</strong>
                      <small>Members can send messages in this room</small>
                    </span>
                  </label>
                  <label className="permission-row">
                    <input
                      type="checkbox"
                      checked={settings.allowFiles}
                      onChange={() => handleToggle('allowFiles')}
                    />
                    <span className="permission-copy">
                      <strong>Allow File Uploads</strong>
                      <small>Members can upload and share files</small>
                    </span>
                  </label>
                  <label className="permission-row">
                    <input
                      type="checkbox"
                      checked={settings.allowDrawing}
                      onChange={() => handleToggle('allowDrawing')}
                    />
                    <span className="permission-copy">
                      <strong>Allow Drawing</strong>
                      <small>Members can draw on the board</small>
                    </span>
                  </label>
                  <label className="permission-row">
                    <input
                      type="checkbox"
                      checked={settings.allowStickyNotes}
                      onChange={() => handleToggle('allowStickyNotes')}
                    />
                    <span className="permission-copy">
                      <strong>Allow Sticky Notes</strong>
                      <small>Members can create sticky notes</small>
                    </span>
                  </label>
                  <label className="permission-row">
                    <input
                      type="checkbox"
                      checked={settings.allowPresentation}
                      onChange={() => handleToggle('allowPresentation')}
                    />
                    <span className="permission-copy">
                      <strong>Allow Presentation</strong>
                      <small>Members can present their screen to others</small>
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="settings-actions">
              <button
                className="save-settings-btn settings-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="settings-section settings-activity-section">
              <label className="settings-label">Activity Log</label>
              <div className="settings-activity-list">
                {activitiesLoading ? (
                  <div className="settings-activity-loading">Loading...</div>
                ) : activities.length === 0 ? (
                  <div className="settings-activity-empty">No activity yet</div>
                ) : (
                  activities.map((a, i) => (
                    <div key={i} className={`activity-item ${a.type}`}>
                      <div className="activity-item-icon">{typeIcons[a.type] || '•'}</div>
                      <div className="activity-item-content">
                        <div className="activity-item-message">{a.message}</div>
                        <div className="activity-item-time">{formatActivityTime(a.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="danger-zone">
              <div className="settings-section">
                <label className="settings-label">Danger Zone</label>
                <p className="danger-zone-description">
                  Once you delete a room, all data including chat, drawings, sticky notes, and files are permanently removed.
                </p>
                <button
                  className="delete-room-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Room
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmationModal
          title="Delete Room?"
          message="This action will permanently delete this room and all its data including chat, drawings, sticky notes, and file uploads. This cannot be undone."
          confirmLabel={isDeletingRoom ? "Deleting..." : "Delete Room"}
          onConfirm={handleDeleteRoom}
          onCancel={() => { if (!isDeletingRoom) setShowDeleteConfirm(false); }}
          isLightBoard={isLightBoard}
          isDanger={true}
        />
      )}
      {deleteError && (
        <div className="settings-delete-error">{deleteError}</div>
      )}
    </div>
  );
}