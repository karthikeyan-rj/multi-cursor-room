import { useState, useEffect, useCallback } from 'react';
import { showToast } from '../utils/toast';
import ConfirmationModal from './ConfirmationModal';
import { SERVER_URL } from '../config';

export default function RoomSettingsPanel({ roomDisplayId, roomName: initialName, isOwner, isLightBoard, onClose, onDeleteRoom, onCopy, onRoomNameChange }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState(initialName || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDeleteRoom = () => {
    setShowDeleteConfirm(false);
    onDeleteRoom?.();
  };

  if (loading) {
    return (
      <div className="settings-panel glass" onClick={e => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h3 className="settings-panel-title">Room Settings</h3>
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
        <h3 className="settings-panel-title">Room Settings</h3>
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
                <div className="settings-permissions">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settings.allowChat}
                      onChange={() => handleToggle('allowChat')}
                    />
                    <span>Allow Chat</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settings.allowFiles}
                      onChange={() => handleToggle('allowFiles')}
                    />
                    <span>Allow File Uploads</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settings.allowDrawing}
                      onChange={() => handleToggle('allowDrawing')}
                    />
                    <span>Allow Drawing</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settings.allowStickyNotes}
                      onChange={() => handleToggle('allowStickyNotes')}
                    />
                    <span>Allow Sticky Notes</span>
                  </label>
                </div>
              )}
            </div>

            <div className="settings-section">
              <label className="settings-label">Danger Zone</label>
              <button
                className="settings-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Room
              </button>
            </div>

            <button
              className="settings-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmationModal
          message="Are you sure you want to permanently delete this room? This action cannot be undone."
          confirmLabel="Delete Room"
          onConfirm={handleDeleteRoom}
          onCancel={() => setShowDeleteConfirm(false)}
          isLightBoard={isLightBoard}
        />
      )}
    </div>
  );
}