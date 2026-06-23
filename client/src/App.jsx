import { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { showToast } from './utils/toast';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useRooms } from './hooks/useRooms';
import { useRoomSession } from './hooks/useRoomSession';
import { ToastProvider } from './components/Toast';
import { SERVER_URL } from './config';
import AuthScreen from './components/AuthScreen';
import LobbyScreen from './components/LobbyScreen';
import ProfilePage from './components/ProfilePage';
import Workspace from './components/Workspace';
import Starfield from './components/Starfield';
import LandingPage from './components/LandingPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const auth = useAuth();
  useTheme(auth.cursorColor);
  const navigate = useNavigate();

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

  const handleJoinRoomSuccess = (id, name, roomId, createdBy) => {
    navigate(`/room/${roomId}`);
  };

  const rooms = useRooms({
    currentUser: auth.currentUser,
    currentRoomId: session.currentRoomId,
    onJoinRoom: handleJoinRoomSuccess
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

  const handleLogout = () => {
    auth.handleLogout(() => {
      session.leaveRoom();
      navigate('/', { replace: true });
    });
  };

  const copyToClipboard = useCallback((text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Room ID copied to clipboard', 'success'))
      .catch(() => showToast('Failed to copy Room ID', 'error'));
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      const redirectTo = localStorage.getItem('redirectAfterLogin');
      if (redirectTo) {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectTo, { replace: true });
      }
    }
  }, [auth.currentUser, navigate]);

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
            <p className="lobby-subtitle">Restoring session…</p>
          </div>
        </div>
        <Starfield />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={
          auth.currentUser ? <Navigate to="/dashboard" replace /> : <LandingPage />
        } />
        <Route path="/login" element={
          <GuestRoute auth={auth}>
            <AuthScreen
              authError={auth.authError}
              authBusy={auth.authBusy}
              cursorColor={auth.cursorColor}
              onLogin={auth.handleLogin}
              onSignup={auth.handleSignup}
              onColorChange={auth.handleColorChange}
              initialTab="login"
            />
          </GuestRoute>
        } />
        <Route path="/register" element={
          <GuestRoute auth={auth}>
            <AuthScreen
              authError={auth.authError}
              authBusy={auth.authBusy}
              cursorColor={auth.cursorColor}
              onLogin={auth.handleLogin}
              onSignup={auth.handleSignup}
              onColorChange={auth.handleColorChange}
              initialTab="signup"
            />
          </GuestRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute auth={auth}>
            <LobbyScreen
              currentUser={auth.currentUser}
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
                const { roomId } = rooms.createdRoomDetails;
                rooms.setCreatedRoomDetails(null);
                navigate(`/room/${roomId}`);
              }}
              onCloseCreatedRoom={() => rooms.setCreatedRoomDetails(null)}
              onCopyToClipboard={copyToClipboard}
              onDeleteRoom={rooms.handleDeleteRoom}
            />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute auth={auth}>
            <ProfilePage auth={auth} />
          </ProtectedRoute>
        } />
        <Route path="/room/:roomId" element={
          <ProtectedRoute auth={auth}>
            <RoomRouteWrapper
              auth={auth}
              session={session}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              chatOpen={chatOpen}
              setChatOpen={setChatOpen}
              textInput={textInput}
              setTextInput={setTextInput}
              textInputRef={textInputRef}
              copyToClipboard={copyToClipboard}
              handleCanvasClick={handleCanvasClick}
              handleTextSubmit={handleTextSubmit}
              handleToggleChat={handleToggleChat}
              handleDeleteRoom={rooms.handleDeleteRoom}
            />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

function ProtectedRoute({ children, auth }) {
  const token = localStorage.getItem('cursor_room_token');
  const location = useLocation();

  if (auth.authLoading) {
    return (
      <div className="lobby-container" style={{ justifyContent: 'center' }}>
        <div className="lobby-hero" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
          <div className="lobby-wordmark">
            <div className="lobby-wordmark-dot" />
            <span className="lobby-wordmark-text">Live • Real-time</span>
          </div>
          <h1 className="lobby-title">Multiple Cursor Room</h1>
          <p className="lobby-subtitle">Restoring session…</p>
        </div>
        <Starfield />
      </div>
    );
  }

  if (!token || !auth.currentUser) {
    localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children, auth }) {
  const token = localStorage.getItem('cursor_room_token');

  if (auth.authLoading) {
    return (
      <div className="lobby-container" style={{ justifyContent: 'center' }}>
        <div className="lobby-hero" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
          <div className="lobby-wordmark">
            <div className="lobby-wordmark-dot" />
            <span className="lobby-wordmark-text">Live • Real-time</span>
          </div>
          <h1 className="lobby-title">Multiple Cursor Room</h1>
          <p className="lobby-subtitle">Restoring session…</p>
        </div>
        <Starfield />
      </div>
    );
  }

  if (token && auth.currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RoomRouteWrapper({
  auth,
  session,
  activeTool,
  setActiveTool,
  chatOpen,
  setChatOpen,
  textInput,
  setTextInput,
  textInputRef,
  copyToClipboard,
  handleCanvasClick,
  handleTextSubmit,
  handleToggleChat,
  handleDeleteRoom
}) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const fetchAttemptRef = useRef(null);

  useEffect(() => {
    if (fetchAttemptRef.current === roomId) return;
    fetchAttemptRef.current = roomId;

    const fetchRoom = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('cursor_room_token');
        const response = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          session.joinRoom(data.room.id, data.room.name, data.room.roomId, data.room.createdBy, data.room.boardColor);
          setLoading(false);
        } else {
          showToast(data.error || 'Failed to open room.', 'error');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Error fetching room:', err);
        showToast('Cannot reach server to open room.', 'error');
        navigate('/dashboard', { replace: true });
      }
    };

    if (roomId && auth.currentUser) {
      if (session.currentRoomDisplayId === roomId) {
        setLoading(false);
      } else {
        fetchRoom();
      }
    }
  }, [roomId, auth.currentUser, navigate, session]);

  const handleWorkspaceDeleteRoom = useCallback(async (roomId) => {
    try {
      const deleted = await handleDeleteRoom(roomId);
      if (deleted) {
        session.leaveRoom();
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Workspace delete error:', err);
    }
  }, [handleDeleteRoom, session, navigate]);

  if (loading) {
    return (
      <div className="lobby-container" style={{ justifyContent: 'center' }}>
        <div className="lobby-hero" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
          <h1 className="lobby-title">Multiple Cursor Room</h1>
          <p className="lobby-subtitle">Opening room…</p>
        </div>
        <Starfield />
      </div>
    );
  }

  return (
    <Workspace
      currentRoomName={session.currentRoomName}
      currentRoomDisplayId={session.currentRoomDisplayId}
      currentRoomId={session.currentRoomId}
      userId={auth.userId}
      userEmail={auth.currentUser?.email}
      roomCreatedBy={session.roomCreatedBy}
      roomOwnerId={session.roomOwnerId}
      remoteCursors={session.remoteCursors}
      activeUserCount={session.activeUserCount}
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
      onLeaveRoom={() => {
        session.leaveRoom();
        navigate('/dashboard', { replace: true });
      }}
      onDeleteRoom={handleWorkspaceDeleteRoom}
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
      roomAllowChat={session.roomAllowChat}
      roomAllowFiles={session.roomAllowFiles}
      roomAllowDrawing={session.roomAllowDrawing}
      roomAllowStickyNotes={session.roomAllowStickyNotes}
    />
  );
}
