import { useState, useCallback, useEffect } from 'react';
import { showToast } from './utils/toast';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useRooms } from './hooks/useRooms';
import { useRoomSession } from './hooks/useRoomSession';
import { ToastProvider } from './components/Toast';
import AuthScreen from './components/AuthScreen';
import LobbyScreen from './components/LobbyScreen';
import Workspace from './components/Workspace';

export default function App() {
  const auth = useAuth();
  useTheme(auth.cursorColor);

  const [activeTool, setActiveTool] = useState('cursor');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const session = useRoomSession({
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        session.undoLastStroke();
        return;
      }
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': e.preventDefault(); setActiveTool('cursor'); break;
          case 'p': e.preventDefault(); setActiveTool('draw'); break;
          case 'e': e.preventDefault(); setActiveTool('eraser'); break;
          case 's': e.preventDefault(); setActiveTool('sticky'); break;
          case 'escape': setActiveTool('cursor'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.undoLastStroke]); // eslint-disable-line react-hooks/exhaustive-deps

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
        roomCreatedBy={session.roomCreatedBy}
        remoteCursors={session.remoteCursors}
        stickyNotes={session.stickyNotes}
        chatHistory={session.chatHistory}
        reactions={session.reactions}
        unreadCount={session.unreadCount}
        myPos={session.myPos}
        activeTool={activeTool}
        brushColor={auth.brushColor}
        brushWidth={auth.brushWidth}
        paletteOpen={paletteOpen}
        chatOpen={chatOpen}
        chatInput={session.chatInput}
        username={auth.username}
        cursorColor={auth.cursorColor}
        canvasRef={session.canvasRef}
        onLeaveRoom={session.leaveRoom}
        onDeleteRoom={session.handleDeleteRoom}
        onSetActiveTool={setActiveTool}
        onSetBrushColor={auth.setBrushColor}
        onSetBrushWidth={auth.setBrushWidth}
        onTogglePalette={() => setPaletteOpen(v => !v)}
        onClosePalette={() => setPaletteOpen(false)}
        onToggleChat={handleToggleChat}
        onCloseChat={() => setChatOpen(false)}
        onSetChatInput={session.setChatInput}
        onSendChat={session.handleSendChat}
        onSendReaction={session.sendReaction}
        onCanvasMouseDown={session.handleCanvasMouseDown}
        onCanvasMouseMove={session.handleCanvasMouseMove}
        onCanvasMouseUp={session.handleCanvasMouseUp}
        onClearCanvas={session.clearCanvas}
        onBoardClick={session.handleBoardClick}
        onBoardDoubleClick={session.handleBoardDoubleClick}
        onNoteMouseDown={session.handleNoteMouseDown}
        onNoteUpdate={session.updateStickyText}
        onNoteDelete={session.deleteSticky}
        onCopy={copyToClipboard}
      />
    </ToastProvider>
  );
}
