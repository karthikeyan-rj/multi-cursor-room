import { useState, useCallback, useEffect, useRef } from 'react';
import { showToast } from './utils/toast';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useRooms } from './hooks/useRooms';
import { useRoomSession } from './hooks/useRoomSession';
import { ToastProvider } from './components/Toast';
import AuthScreen from './components/AuthScreen';
import LobbyScreen from './components/LobbyScreen';
import Workspace from './components/Workspace';
import Starfield from './components/Starfield';

export default function App() {
  const auth = useAuth();
  useTheme(auth.cursorColor);

  const [activeTool, setActiveTool] = useState('cursor');
  const [chatOpen, setChatOpen] = useState(false);
  const [textInput, setTextInput] = useState(null);
  const textInputRef = useRef(null);

  const session = useRoomSession({
    userId: auth.userId,
    username: auth.username,
    cursorColor: auth.cursorColor,
    activeTool,
    brushColor: auth.brushColor,
    brushWidth: auth.brushWidth,
    chatOpen,
    setActiveTool
  });

  const rooms = useRooms({
    currentUser: auth.currentUser,
    currentRoomId: session.currentRoomId,
    onJoinRoom: session.joinRoom
  });

  function isTypingInEditableElement() {
    const active = document.activeElement;
    if (!active) return false;
    return (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.isContentEditable ||
      active.closest('.sticky-note-element') ||
      active.closest('.sticky-note-textarea') ||
      active.closest('.chat-input') ||
      active.closest('.auth-form')
    );
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isTypingInEditableElement()) return;
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        session.undoLastStroke();
        return;
      }
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': e.preventDefault(); setActiveTool('cursor'); break;
          case 'p': e.preventDefault(); setActiveTool('draw'); break;
          case 'l': e.preventDefault(); setActiveTool('line'); break;
          case 'r': e.preventDefault(); setActiveTool('rect'); break;
          case 'c': e.preventDefault(); setActiveTool('circle'); break;
          case 't': e.preventDefault(); setActiveTool('text'); break;
          case 'e': e.preventDefault(); setActiveTool('eraser'); break;
          case 'h': e.preventDefault(); setActiveTool('hand'); break;
          case 's': e.preventDefault(); setActiveTool('sticky'); break;
          case 'escape': setActiveTool('cursor'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.undoLastStroke]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCanvasClick = useCallback((e) => {
    if (activeTool === 'text' && e.target.tagName === 'CANVAS') {
      setTextInput({ x: e.clientX, y: e.clientY });
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [activeTool]);

  const handleTextSubmit = useCallback((text) => {
    if (textInput && text.trim()) {
      session.handlePlaceText(textInput.x, textInput.y, text);
    }
    setTextInput(null);
  }, [textInput, session]);

  const handleToggleChat = (_, forceClose) => {
    if (forceClose === false) {
      setChatOpen(false);
    } else {
      setChatOpen(prev => {
        const next = !prev;
        if (next) session.setUnreadCount(0);
        return next;
      });
    }
  };

  const handleLogout = () => auth.handleLogout(session.leaveRoom);

  const copyToClipboard = useCallback((text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Room ID copied to clipboard', 'success'))
      .catch(() => showToast('Failed to copy Room ID', 'error'));
  }, []);

  if (auth.authLoading) {
    return (
      <ToastProvider>
        <div className="lobby-container" style={{ justifyContent: 'center' }}>
          <div className="lobby-hero" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
            <div className="lobby-wordmark">
              <div className="lobby-wordmark-dot" />
              <span className="lobby-wordmark-text">Live • Real-time</span>
            </div>
            <h1 className="lobby-title">Multiple Cursor Room</h1>
            <p className="lobby-subtitle">Loading your workspace…</p>
          </div>
        </div>
        <Starfield />
      </ToastProvider>
    );
  }

  if (!auth.currentUser) {
    return (
      <ToastProvider>
        <AuthScreen
          authError={auth.authError}
          authBusy={auth.authBusy}
          cursorColor={auth.cursorColor}
          onLogin={auth.handleLogin}
          onSignup={auth.handleSignup}
          onColorChange={auth.handleColorChange}
        />
      </ToastProvider>
    );
  }

  if (!session.currentRoomId) {
    return (
      <ToastProvider>
        <LobbyScreen
          userId={auth.userId}
          username={auth.username}
          cursorColor={auth.cursorColor}
          rooms={rooms.rooms}
          createdRoomDetails={rooms.createdRoomDetails}
          promptRoom={rooms.promptRoom}
          promptError={rooms.promptError}
          joinError={rooms.joinError}
          onLogout={handleLogout}
          onColorChange={auth.handleColorChange}
          onJoinRoom={rooms.handleJoinRoom}
          onCreateRoom={rooms.handleCreateRoom}
          onEnterRoom={rooms.handleEnterRoom}
          onCancelPrompt={rooms.handleCancelPrompt}
          onPromptSubmit={rooms.handlePromptSubmit}
          onEnterCreatedRoom={() => {
            if (!rooms.createdRoomDetails) return;
            const { id, name, roomId } = rooms.createdRoomDetails;
            rooms.setCreatedRoomDetails(null);
            session.joinRoom(id, name, roomId, auth.username);
          }}
          onCopyToClipboard={copyToClipboard}
          onDeleteRoom={rooms.handleDeleteRoom}
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Workspace
        currentRoomName={session.currentRoomName}
        currentRoomDisplayId={session.currentRoomDisplayId}
        currentRoomId={session.currentRoomId}
        userId={auth.userId}
        roomCreatedBy={session.roomCreatedBy}
        roomOwnerId={session.roomOwnerId}
        remoteCursors={session.remoteCursors}
        stickyNotes={session.stickyNotes}
        chatHistory={session.chatHistory}
        reactions={session.reactions}
        unreadCount={session.unreadCount}
        myPos={session.myPos}
        activeTool={activeTool}
        brushColor={auth.brushColor}
        brushWidth={auth.brushWidth}
        chatOpen={chatOpen}
        chatInput={session.chatInput}
        username={auth.username}
        cursorColor={auth.cursorColor}
        canvasRef={session.canvasRef}
        textInput={textInput}
        textInputRef={textInputRef}
        onLeaveRoom={session.leaveRoom}
        onDeleteRoom={session.handleDeleteRoom}
        onSetActiveTool={setActiveTool}
        onSetBrushColor={auth.setBrushColor}
        onSetBrushWidth={auth.setBrushWidth}
        onToggleChat={handleToggleChat}
        onCloseChat={() => setChatOpen(false)}
        onSetChatInput={session.setChatInput}
        onSendChat={session.handleSendChat}
        onSendReaction={session.sendReaction}
        onCanvasMouseDown={session.handleCanvasMouseDown}
        onCanvasMouseMove={session.handleCanvasMouseMove}
        onCanvasMouseUp={session.handleCanvasMouseUp}
        onClearCanvas={session.clearCanvas}
        onClearBoard={session.clearBoard}
        onUndo={session.undoLastStroke}
        onBoardClick={session.handleBoardClick}
        onCanvasClick={handleCanvasClick}
        onTextSubmit={handleTextSubmit}
        onNoteMouseDown={session.handleNoteMouseDown}
        onNoteUpdate={session.updateStickyText}
        onNoteDelete={session.deleteSticky}
        onCopy={copyToClipboard}
        viewport={session.viewport}
        isPanning={session.isPanning}
        onZoomIn={session.handleZoomIn}
        onZoomOut={session.handleZoomOut}
        onZoomReset={session.handleZoomReset}
        boardColor={session.boardColor}
        onSetBoardColor={session.handleSetBoardColor}
        replyingTo={session.replyingTo}
        onSetReplyTarget={session.setReplyingTo}
        onCancelReply={session.handleCancelReply}
      />
    </ToastProvider>
  );
}
