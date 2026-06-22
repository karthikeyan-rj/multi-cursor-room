import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { socket } from '../hooks/useRoomSession';
import TopNav from './TopNav';
import FloatingToolbar from './FloatingToolbar';
import ChatDrawer from './ChatDrawer';
import RoomMembersPanel from './RoomMembersPanel';
import ActivityPanel from './ActivityPanel';
import RoomSettingsPanel from './RoomSettingsPanel';
import StickyNote from './StickyNote';
import RemoteCursorOverlay from './RemoteCursorOverlay';
import CursorTrail from './CursorTrail';
import BoardColorPicker from './BoardColorPicker';
import ConfirmationModal from './ConfirmationModal';
import { getLuminance } from '../utils/color';
import { SERVER_URL } from '../config';

function isNativeCursorElement(target) {
  if (!target || !target.tagName) return false;
  const tag = target.tagName.toLowerCase();
  if (['button', 'a', 'input', 'textarea', 'select', 'option'].includes(tag)) return true;
  if (target.closest?.('button, a, input, textarea, select, option, [role="button"], [contenteditable="true"]')) return true;
  try {
    const cursor = window.getComputedStyle(target).cursor;
    if (!cursor || cursor === 'auto' || cursor === 'default' || cursor === 'none') return false;
    if (cursor.startsWith('url(')) return false;
    return true;
  } catch {
    return false;
  }
}

export default function Workspace({
  currentRoomName, currentRoomDisplayId, currentRoomId, userId, userEmail, roomCreatedBy, roomOwnerId, remoteCursors, stickyNotes, chatHistory,
  reactions, unreadCount, myPos, activeTool, brushColor, brushWidth, chatOpen, chatInput,
  username, cursorColor, canvasRef, textInput, textInputRef,
  onLeaveRoom, onDeleteRoom, onSetActiveTool, onSetBrushColor, onSetBrushWidth,
  onToggleChat, onSetChatInput, onSendChat, onSendReaction,
  onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp,
  onClearCanvas, onClearBoard, onBoardClick, onCanvasClick, onTextSubmit,
  onUndo,
  onNoteMouseDown, onNoteUpdate, onNoteDelete, onCopy,
  viewport, isPanning, onZoomIn, onZoomOut, onZoomReset,
  boardColor, onSetBoardColor,
  replyingTo, onSetReplyTarget, onCancelReply,
  roomAllowChat, roomAllowFiles, roomAllowDrawing, roomAllowStickyNotes
}) {
  const [tempText, setTempText] = useState('');
  const [hideLocalCursor, setHideLocalCursor] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [activityToasts, setActivityToasts] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [roomName, setRoomName] = useState(currentRoomName);
  const toastTimeoutsRef = useRef([]);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(null);
  lastActivityRef.current = Date.now();
  const isLightBoard = useMemo(() => boardColor ? getLuminance(boardColor) > 0.55 : false, [boardColor]);
  const isOwner = String(roomOwnerId) === String(userId);

  const fetchPendingRequestsCount = useCallback(async () => {
    if (!currentRoomDisplayId) return;
    try {
      const token = localStorage.getItem('cursor_room_token');
      const membersRes = await fetch(`${SERVER_URL}/api/rooms/${currentRoomDisplayId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!membersRes.ok) return;
      const membersData = await membersRes.json();
      if (membersData.success) {
        if (String(membersData.ownerId) !== String(userId)) {
          setPendingRequestsCount(0);
          return;
        }
        const pending = (membersData.joinRequests || []).filter(r => r.status === 'pending').length;
        setPendingRequestsCount(pending);
      }
    } catch (_) {
      // Silently fail
    }
  }, [currentRoomDisplayId, userId, SERVER_URL]);

  useEffect(() => {
    fetchPendingRequestsCount();
  }, [fetchPendingRequestsCount]);

  useEffect(() => {
    const handler = () => fetchPendingRequestsCount();
    socket.on('room-members-updated', handler);
    return () => { socket.off('room-members-updated', handler); };
  }, [fetchPendingRequestsCount]);

  useEffect(() => {
    const handler = (activity) => {
      const id = `${activity.type}-${activity.userId}-${Date.now()}`;
      setActivityToasts((prev) => [...prev, { id, message: activity.message, type: activity.type }]);
      const timeoutId = setTimeout(() => {
        setActivityToasts((prev) => prev.filter((t) => t.id !== id));
        toastTimeoutsRef.current = toastTimeoutsRef.current.filter((t) => t !== timeoutId);
      }, 3500);
      toastTimeoutsRef.current.push(timeoutId);
    };
    socket.on('room-activity', handler);
    return () => {
      socket.off('room-activity', handler);
      toastTimeoutsRef.current.forEach(clearTimeout);
      toastTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setHideLocalCursor(isNativeCursorElement(e.target));
    };
    document.addEventListener('mousemove', handler, { passive: true });
    return () => document.removeEventListener('mousemove', handler);
  }, []);

  // Idle detection for presence status
  useEffect(() => {
    const resetIdle = () => {
      lastActivityRef.current = Date.now();
      clearTimeout(idleTimerRef.current);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => document.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach(e => document.removeEventListener(e, resetIdle));
      clearTimeout(idleTimerRef.current);
    };
  }, []);

  const handleLeaveRoom = () => {
    setShowLeaveConfirm(false);
    onLeaveRoom();
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onTextSubmit(tempText);
      setTempText('');
    }
  };

  const canvasClick = (e) => {
    if (activeTool === 'hand') return;
    if (activeTool === 'text') {
      onCanvasClick?.(e);
    }
    onBoardClick(e);
  };

  const handleTextBlur = () => {
    if (tempText.trim()) {
      onTextSubmit(tempText);
    } else {
      onTextSubmit('');
    }
    setTempText('');
  };

  // Export functions
  const handleExportChat = () => {
    if (!chatHistory || chatHistory.length === 0) return;
    const lines = [
      `Room: ${roomName || currentRoomName}`,
      `Room ID: ${currentRoomDisplayId}`,
      `Exported: ${new Date().toLocaleString()}`,
      '',
      ...chatHistory.map(msg => {
        const time = new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sender = msg.sender_name || msg.senderName || 'Unknown';
        const text = msg.message || msg.text || '';
        return `[${time}] ${sender}: ${text}`;
      })
    ].join('\n');
    downloadFile(lines, `${(roomName || currentRoomName || 'room').replace(/\s+/g, '-')}-chat-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    setShowExportMenu(false);
  };

  const handleExportStickyNotes = () => {
    if (!stickyNotes || stickyNotes.length === 0) return;
    const data = stickyNotes.map(n => ({
      text: n.text,
      createdBy: n.creator_name || n.creatorName || 'Unknown',
      createdAt: n.created_at || n.createdAt
    }));
    downloadFile(JSON.stringify(data, null, 2), `${(roomName || currentRoomName || 'room').replace(/\s+/g, '-')}-notes-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    setShowExportMenu(false);
  };

  const handleExportSummary = async () => {
    const token = localStorage.getItem('cursor_room_token');
    let members = [];
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${currentRoomDisplayId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) members = data.participants || [];
    } catch (_) { /* ignore */ }
    const summary = {
      roomName: roomName || currentRoomName,
      roomId: currentRoomDisplayId,
      exportedAt: new Date().toISOString(),
      owner: roomCreatedBy,
      participants: members.map(m => ({ username: m.username || m.email, joinedAt: m.joinedAt })),
      chatCount: chatHistory?.length || 0,
      stickyNoteCount: stickyNotes?.length || 0
    };
    downloadFile(JSON.stringify(summary, null, 2), `${(roomName || currentRoomName || 'room').replace(/\s+/g, '-')}-summary-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    setShowExportMenu(false);
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRoomNameChange = (newName) => {
    setRoomName(newName);
  };

  return (
    <div className={`workspace-container ${isLightBoard ? 'light-board' : 'dark-board'}`} onClick={canvasClick}>
      <div className="grid-background" style={boardColor ? { backgroundColor: boardColor } : undefined} />

      <TopNav
        roomName={roomName || currentRoomName}
        roomDisplayId={currentRoomDisplayId}
        roomInternalId={currentRoomId}
        userId={userId}
        userEmail={userEmail}
        roomOwnerId={roomOwnerId}
        username={username}
        roomCreatedBy={roomCreatedBy}
        cursorColor={cursorColor}
        remoteCursors={remoteCursors}
        chatOpen={chatOpen}
        unreadCount={unreadCount}
        onToggleChat={onToggleChat}
        onLeaveRoom={onLeaveRoom}
        onLeaveRoomRequest={() => setShowLeaveConfirm(true)}
        onDeleteRoom={onDeleteRoom}
        onCopy={onCopy}
        isLightBoard={isLightBoard}
        onToggleMembers={() => setMembersOpen(v => !v)}
        membersOpen={membersOpen}
        pendingRequestsCount={pendingRequestsCount}
        onToggleActivity={() => setActivityOpen(v => !v)}
        activityOpen={activityOpen}
        onToggleSettings={() => setSettingsOpen(v => !v)}
        settingsOpen={settingsOpen}
      />

      <div className="workspace-export-btn" title="Export Room Data">
        <button className="toolbar-btn export-trigger" onClick={() => setShowExportMenu(v => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        {showExportMenu && (
          <div className="export-dropdown">
            <button onClick={handleExportChat} disabled={!chatHistory || chatHistory.length === 0}>
              Export Chat (.txt)
            </button>
            <button onClick={handleExportStickyNotes} disabled={!stickyNotes || stickyNotes.length === 0}>
              Export Sticky Notes (.json)
            </button>
            <button onClick={handleExportSummary}>
              Export Room Summary (.json)
            </button>
          </div>
        )}
      </div>

      {activityToasts.length > 0 && (
        <div className="room-activity-toast-stack">
          {activityToasts.map((toast) => (
            <div key={toast.id} className={`room-activity-toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="canvas-element"
        style={{
          cursor: isPanning ? 'grabbing'
            : activeTool === 'hand' ? 'grab'
            : activeTool === 'draw' || activeTool === 'eraser'
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${brushWidth + 12}' height='${brushWidth + 12}'%3E%3Ccircle cx='${(brushWidth + 12) / 2}' cy='${(brushWidth + 12) / 2}' r='${brushWidth / 2 + 2}' fill='none' stroke='white' stroke-width='1.5' opacity='0.7'/%3E%3C/svg%3E") ${(brushWidth + 12) / 2} ${(brushWidth + 12) / 2}, crosshair`
            : activeTool === 'text' ? 'text'
            : activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle' ? 'crosshair'
            : activeTool === 'cursor' || activeTool === 'sticky' ? 'default'
            : 'crosshair'
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />

      {textInput && (
        <div
          style={{
            position: 'fixed', left: textInput.x, top: textInput.y, zIndex: 50,
            background: 'transparent',
          }}
        >
          <input
            ref={textInputRef}
            type="text"
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextBlur}
            placeholder="Type here..."
            style={{
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid ' + brushColor,
              borderRadius: '4px',
              color: brushColor,
              fontSize: Math.max(brushWidth * 3, 14) + 'px',
              padding: '4px 8px',
              outline: 'none',
              fontFamily: 'sans-serif',
              minWidth: '120px',
            }}
            autoFocus
          />
        </div>
      )}

      <div style={{
        position: 'relative',
        zIndex: 20,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        transformOrigin: '0 0',
      }}>
        {stickyNotes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            onNoteMouseDown={onNoteMouseDown}
            onNoteUpdate={onNoteUpdate}
            onNoteDelete={onNoteDelete}
          />
        ))}
      </div>

      <div className="board-color-fixed">
        <BoardColorPicker boardColor={boardColor} onColorChange={onSetBoardColor} />
      </div>
      <div className="zoom-controls">
        <button onClick={onZoomIn} title="Zoom In">+</button>
        <button onClick={onZoomOut} title="Zoom Out">−</button>
        <button onClick={onZoomReset} title="Reset Zoom">{Math.round(viewport.scale * 100)}%</button>
      </div>

      <FloatingToolbar
        activeTool={activeTool}
        brushColor={brushColor}
        brushWidth={brushWidth}
        canvasRef={canvasRef}
        onSetTool={onSetActiveTool}
        onSetBrushColor={onSetBrushColor}
        onSetBrushWidth={onSetBrushWidth}
        onClearCanvas={onClearCanvas}
        onClearBoard={onClearBoard}
        onSendReaction={onSendReaction}
        onUndo={onUndo}
        allowDrawing={roomAllowDrawing}
        allowStickyNotes={roomAllowStickyNotes}
      />

      <ChatDrawer
        open={chatOpen}
        remoteCursors={remoteCursors}
        username={username}
        userId={userId}
        chatHistory={chatHistory}
        chatInput={chatInput}
        onChatInput={onSetChatInput}
        onSendChat={onSendChat}
        onClose={() => onToggleChat(null, false)}
        roomId={currentRoomId}
        isLightBoard={isLightBoard}
        replyingTo={replyingTo}
        onSetReplyTarget={onSetReplyTarget}
        onCancelReply={onCancelReply}
        allowChat={roomAllowChat}
        allowFiles={roomAllowFiles}
      />

      {membersOpen && (
        <RoomMembersPanel
          roomDisplayId={currentRoomDisplayId}
          userId={userId}
          userEmail={userEmail}
          username={username}
          cursorColor={cursorColor}
          remoteCursors={remoteCursors}
          onClose={() => setMembersOpen(false)}
        />
      )}

      {activityOpen && (
        <ActivityPanel
          roomDisplayId={currentRoomDisplayId}
          onClose={() => setActivityOpen(false)}
        />
      )}

      {settingsOpen && isOwner && (
        <RoomSettingsPanel
          roomDisplayId={currentRoomDisplayId}
          roomInternalId={currentRoomId}
          roomName={roomName || currentRoomName}
          userId={userId}
          isOwner={isOwner}
          isLightBoard={isLightBoard}
          onClose={() => setSettingsOpen(false)}
          onDeleteRoom={onDeleteRoom}
          onCopy={onCopy}
          onRoomNameChange={handleRoomNameChange}
        />
      )}

      <div style={{ display: hideLocalCursor ? 'none' : undefined }}>
        <CursorTrail color={cursorColor} />
      </div>

      <div style={{
        display: hideLocalCursor ? 'none' : undefined,
        position: 'fixed', left: myPos.x, top: myPos.y, pointerEvents: 'none',
        transform: 'translate(-2px, -2px)', zIndex: 100
      }}>
        <svg width="22" height="22" viewBox="0 0 20 20">
          <path d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L11 9 Z" fill={cursorColor} stroke="#000" strokeWidth="1.5" />
        </svg>
      </div>

      <RemoteCursorOverlay remoteCursors={remoteCursors} viewport={viewport} />

      {showLeaveConfirm && (
        <ConfirmationModal
          message="Leave this room and go back to Dashboard?"
          confirmLabel="Leave Room"
          onConfirm={handleLeaveRoom}
          onCancel={() => setShowLeaveConfirm(false)}
          isLightBoard={isLightBoard}
        />
      )}

      {reactions.map(r => (
        <div key={r.id} style={{
          position: 'fixed',
          left: r.x * viewport.scale + viewport.x,
          top: r.y * viewport.scale + viewport.y,
          fontSize: '36px', pointerEvents: 'none',
          animation: 'floatUp 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
          zIndex: 200, transform: 'translate(-50%, -50%)'
        }}>
          {r.emoji}
        </div>
      ))}
    </div>
  );
}