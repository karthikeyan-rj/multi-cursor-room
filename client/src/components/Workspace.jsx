import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { socket } from '../hooks/useRoomSession';
import TopNav from './TopNav';
import FloatingToolbar from './FloatingToolbar';
import ChatDrawer from './ChatDrawer';
import RoomMembersPanel from './RoomMembersPanel';

import RoomSettingsPanel from './RoomSettingsPanel';
import StickyNote from './StickyNote';
import RemoteCursorOverlay from './RemoteCursorOverlay';
import CursorTrail from './CursorTrail';

import BoardColorPicker from './BoardColorPicker';
import ConfirmationModal from './ConfirmationModal';
import NavigationGuardModal from './NavigationGuardModal';
import VoiceCallPanel from './VoiceCallPanel';
import useVoiceCall from '../hooks/useVoiceCall';
import { getLuminance } from '../utils/color';
import { SERVER_URL } from '../config';

export default function Workspace({
  currentRoomName, currentRoomDisplayId, currentRoomId, userId, userEmail, roomCreatedBy, roomOwnerId, remoteCursors, activeUserCount, stickyNotes, chatHistory,
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
  roomAllowChat, roomAllowFiles, roomAllowDrawing, roomAllowStickyNotes,
  roomAllowPresentation, isPresenting, isFollowingPresentation, presenterUserId, presenterName,
  startPresenting, stopPresenting, presentationLockedToast
}) {
  const [tempText, setTempText] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowExportMenu(false);
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showExportMenu]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showNavGuard, setShowNavGuard] = useState(false);
  const [activeRoomPanel, setActiveRoomPanel] = useState(null);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const voiceCall = useVoiceCall();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [activityToasts, setActivityToasts] = useState([]);
  const [roomActivities, setRoomActivities] = useState([]);
  const [roomName, setRoomName] = useState(currentRoomName);
  const toastTimeoutsRef = useRef([]);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(null);
  lastActivityRef.current = Date.now();
  const isLightBoard = useMemo(() => boardColor ? getLuminance(boardColor) > 0.55 : false, [boardColor]);
  const isOwner = String(roomOwnerId) === String(userId);
  const canUseBoardTools = isOwner || !isFollowingPresentation;
  const effectiveAllowChat = isOwner || roomAllowChat;
  const effectiveAllowFiles = isOwner || roomAllowFiles;
  const effectiveAllowDrawing = isOwner || (roomAllowDrawing && canUseBoardTools);
  const effectiveAllowStickyNotes = isOwner || (roomAllowStickyNotes && canUseBoardTools);
  const canChangeBoardColor = isOwner || (roomAllowDrawing !== false && !isFollowingPresentation);

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
    voiceCall.leaveVoiceCall();
    onLeaveRoom();
  };

  const handleNavGuardLeave = () => {
    setShowNavGuard(false);
    popstateGuardRef.current = false;
    onLeaveRoom();
  };

  const handleNavGuardCancel = () => {
    setShowNavGuard(false);
    popstateGuardRef.current = true;
  };

  // Intercept browser Back button via popstate + history.pushState
  const popstateGuardRef = useRef(true);
  const popstateHandlingRef = useRef(false);

  useEffect(() => {
    if (!currentRoomDisplayId) return;

    popstateGuardRef.current = true;
    popstateHandlingRef.current = false;
    window.history.pushState({ guard: true }, '');

    const handlePopState = () => {
      if (!popstateGuardRef.current) return;
      if (popstateHandlingRef.current) return;
      popstateHandlingRef.current = true;

      window.history.pushState({ guard: true }, '');
      setShowNavGuard(true);

      setTimeout(() => { popstateHandlingRef.current = false; }, 300);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentRoomDisplayId]);

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
  };

  const handleExportStickyNotes = () => {
    if (!stickyNotes || stickyNotes.length === 0) return;
    const data = stickyNotes.map(n => ({
      text: n.text,
      createdBy: n.creator_name || n.creatorName || 'Unknown',
      createdAt: n.created_at || n.createdAt
    }));
    downloadFile(JSON.stringify(data, null, 2), `${(roomName || currentRoomName || 'room').replace(/\s+/g, '-')}-notes-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
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

  const handleToggleChat = useCallback((e, forceClose) => {
    setShowExportMenu(false);
    if (forceClose === false) {
      setActiveRoomPanel(null);
      onToggleChat(e, false);
    } else if (chatOpen) {
      setActiveRoomPanel(null);
      onToggleChat(e);
    } else {
      setActiveRoomPanel('chat');
      onToggleChat(e);
    }
  }, [chatOpen, onToggleChat]);

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
          activeUserCount={activeUserCount}
          activeRoomPanel={activeRoomPanel}
          unreadCount={unreadCount}
          onToggleChat={handleToggleChat}
          onLeaveRoom={onLeaveRoom}
          onLeaveRoomRequest={() => setShowLeaveConfirm(true)}
          onDeleteRoom={onDeleteRoom}
          onCopy={onCopy}
          isLightBoard={isLightBoard}
          onToggleMembers={() => { setShowExportMenu(false); if (chatOpen) onToggleChat(null, false); setActiveRoomPanel(prev => prev === 'members' ? null : 'members'); }}
          pendingRequestsCount={pendingRequestsCount}
          onToggleSettings={() => { setShowExportMenu(false); if (chatOpen) onToggleChat(null, false); setActiveRoomPanel(prev => prev === 'settings' ? null : 'settings'); }}
          onToggleVoice={() => {
            setShowExportMenu(false);
            setShowVoiceCall(prev => !prev);
          }}
          isVoiceActive={showVoiceCall}
          isVoiceCallConnected={voiceCall.isConnected}
          voiceCallMuted={voiceCall.isMuted}
          onLeaveVoiceCall={voiceCall.leaveVoiceCall}
          isPresenting={isPresenting}
          isFollowingPresentation={isFollowingPresentation}
          presenterName={presenterName}
          onStartPresent={startPresenting}
          onStopPresent={stopPresenting}
          roomAllowPresentation={roomAllowPresentation}
          isOwner={isOwner}
        />

      {isFollowingPresentation && !isPresenting && (
        <div className="presentation-follower-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Viewing {presenterName || 'presenter'}'s screen &middot; drawing &amp; editing disabled
        </div>
      )}

      {presentationLockedToast && (
        <div className="presentation-locked-toast">
          {presentationLockedToast} is presenting
        </div>
      )}

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
            : activeTool === 'sticky' ? 'crosshair'
            : 'default'
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          onCanvasMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0, preventDefault: () => {} });
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          onCanvasMouseMove({ clientX: touch.clientX, clientY: touch.clientY, button: 0, preventDefault: () => {} });
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          onCanvasMouseUp();
        }}
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
        <BoardColorPicker boardColor={boardColor} onColorChange={onSetBoardColor} disabled={!canChangeBoardColor} />
      </div>
      <div className="room-bottom-right-controls">
        <div className="zoom-controls">
          <button onClick={onZoomIn} title="Zoom In">+</button>
          <button onClick={onZoomOut} title="Zoom Out">−</button>
          <button onClick={onZoomReset} title="Reset Zoom">{Math.round(viewport.scale * 100)}%</button>
        </div>
        <div className="bottom-export-wrapper" ref={exportMenuRef}>
          <button
            type="button"
            className="bottom-export-btn"
            onClick={() => setShowExportMenu(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showExportMenu}
          >
            Download ▾
          </button>
          {showExportMenu && (
            <div className="bottom-export-menu">
              <button type="button" onClick={() => { handleExportSummary(); setShowExportMenu(false); }}>
                Download Room Summary
              </button>
              <button type="button" onClick={() => { handleExportStickyNotes(); setShowExportMenu(false); }}>
                Download Sticky Notes Summary
              </button>
              <button type="button" onClick={() => { handleExportChat(); setShowExportMenu(false); }}>
                Download Chat Summary
              </button>
            </div>
          )}
        </div>
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
          allowDrawing={effectiveAllowDrawing}
          allowStickyNotes={effectiveAllowStickyNotes}
        />

      <ChatDrawer
        open={chatOpen}
        remoteCursors={remoteCursors}
        activeUserCount={activeUserCount}
        username={username}
        userId={userId}
        chatHistory={chatHistory}
        chatInput={chatInput}
        onChatInput={onSetChatInput}
        onSendChat={onSendChat}
        onClose={() => handleToggleChat(null, false)}
        roomId={currentRoomId}
        isLightBoard={isLightBoard}
        replyingTo={replyingTo}
        onSetReplyTarget={onSetReplyTarget}
        onCancelReply={onCancelReply}
        allowChat={effectiveAllowChat}
        allowFiles={effectiveAllowFiles}
      />

      {activeRoomPanel === 'members' && (
        <RoomMembersPanel
          roomDisplayId={currentRoomDisplayId}
          userId={userId}
          userEmail={userEmail}
          username={username}
          cursorColor={cursorColor}
          onClose={() => setActiveRoomPanel(null)}
          activeUserCount={activeUserCount}
          isLightBoard={isLightBoard}
        />
      )}

      {activeRoomPanel === 'settings' && (
        <div className="settings-modal-backdrop" onClick={() => setActiveRoomPanel(null)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <RoomSettingsPanel
              roomDisplayId={currentRoomDisplayId}
              roomInternalId={currentRoomId}
              roomName={roomName || currentRoomName}
              userId={userId}
              isOwner={isOwner}
              isLightBoard={isLightBoard}
              onClose={() => setActiveRoomPanel(null)}
              onDeleteRoom={onDeleteRoom}
              onCopy={onCopy}
              onRoomNameChange={handleRoomNameChange}
            />
          </div>
        </div>
      )}

      {showVoiceCall && (
        <VoiceCallPanel roomId={currentRoomId} onClose={() => setShowVoiceCall(false)} voiceCall={voiceCall} isLightBoard={isLightBoard} />
      )}

      <CursorTrail color={cursorColor} />
      <RemoteCursorOverlay remoteCursors={remoteCursors} viewport={viewport} userId={userId} />

      {showLeaveConfirm && (
        <ConfirmationModal
          message="Leave this room and go back to Dashboard?"
          confirmLabel="Leave Room"
          onConfirm={handleLeaveRoom}
          onCancel={() => setShowLeaveConfirm(false)}
          isLightBoard={isLightBoard}
        />
      )}

      {showNavGuard && (
        <NavigationGuardModal
          title="Leave Room?"
          message="You are currently inside this room. Going back will leave the room and disconnect you from the live session."
          cancelText="Stay Here"
          confirmText="Leave Room"
          confirmDanger
          onCancel={handleNavGuardCancel}
          onConfirm={handleNavGuardLeave}
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