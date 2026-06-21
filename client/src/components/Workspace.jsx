import { useState, useEffect, useMemo, useCallback } from 'react';
import { socket } from '../hooks/useRoomSession';
import TopNav from './TopNav';
import FloatingToolbar from './FloatingToolbar';
import ChatDrawer from './ChatDrawer';
import RoomMembersPanel from './RoomMembersPanel';
import StickyNote from './StickyNote';
import RemoteCursorOverlay from './RemoteCursorOverlay';
import CursorTrail from './CursorTrail';
import BoardColorPicker from './BoardColorPicker';
import ConfirmationModal from './ConfirmationModal';
import { getLuminance } from '../utils/color';

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
  replyingTo, onSetReplyTarget, onCancelReply
}) {
  const [tempText, setTempText] = useState('');
  const [hideLocalCursor, setHideLocalCursor] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const isLightBoard = useMemo(() => boardColor ? getLuminance(boardColor) > 0.55 : false, [boardColor]);

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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
        // Only owner cares about pending requests
        if (String(membersData.ownerId) !== String(userId)) {
          setPendingRequestsCount(0);
          return;
        }
        const pending = (membersData.joinRequests || []).filter(r => r.status === 'pending').length;
        setPendingRequestsCount(pending);
      }
    } catch (err) {
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

  const handleLeaveRoom = () => {
    setShowLeaveConfirm(false);
    onLeaveRoom();
  };

  useEffect(() => {
    const handler = (e) => {
      setHideLocalCursor(isNativeCursorElement(e.target));
    };
    document.addEventListener('mousemove', handler, { passive: true });
    return () => document.removeEventListener('mousemove', handler);
  }, []);

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

  return (
    <div className={`workspace-container ${isLightBoard ? 'light-board' : 'dark-board'}`} onClick={canvasClick}>
      <div className="grid-background" style={boardColor ? { backgroundColor: boardColor } : undefined} />

      <TopNav
        roomName={currentRoomName}
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
      />

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

      <RemoteCursorOverlay remoteCursors={remoteCursors} />

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
          position: 'fixed', left: r.x, top: r.y, fontSize: '36px', pointerEvents: 'none',
          animation: 'floatUp 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
          zIndex: 200, transform: 'translate(-50%, -50%)'
        }}>
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
