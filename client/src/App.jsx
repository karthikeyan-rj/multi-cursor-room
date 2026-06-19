import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);

const COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Cyan
  '#96CEB4', // Mint
  '#FFEAA7', // Yellow
  '#DDA0DD', // Lavender
  '#A8E6CF', // Light Green
  '#FF8C94', // Pastel Rose
  '#818CF8', // Indigo
  '#F472B6', // Pink
  '#FB923C', // Orange
  '#34D399'  // Emerald
];

const NAMES = ['Alex', 'Jordan', 'Riley', 'Morgan', 'Casey', 'Drew', 'Skyler', 'Quinn', 'Taylor', 'Avery'];
const EMOJIS = ['👋', '🔥', '✨', '💀', '👀', '💯', '🚀', '😭', '❤️', '👍'];

const STICKY_COLORS = [
  '#FFEAA7', // Pastel Yellow
  '#FFB7B2', // Pastel Pink
  '#C7F9CC', // Pastel Green
  '#B3E5FC', // Pastel Blue
  '#E1BEE7'  // Pastel Purple
];

// --- HTML5 Canvas Drawing Helpers ---
const redraw = (canvas, drawingsList) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawingsList.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  });
};

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState(null);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // --- Profile / Lobby State ---
  const [username, setUsername] = useState('');
  const [cursorColor, setCursorColor] = useState(() => {
    const saved = localStorage.getItem('cursor_room_color');
    return saved || COLORS[Math.floor(Math.random() * COLORS.length)];
  });
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState('');

  // --- Workspace State ---
  const [remoteCursors, setRemoteCursors] = useState({});
  const [drawings, setDrawings] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [myPos, setMyPos] = useState({ x: -100, y: -100 });
  const [trails, setTrails] = useState([]);
  
  // Workspace UI settings
  const [activeTool, setActiveTool] = useState('cursor'); // 'cursor' | 'draw' | 'sticky'
  const [brushColor, setBrushColor] = useState(cursorColor);
  const [brushWidth, setBrushWidth] = useState(4);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // --- Drawing logic references ---
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);

  // --- Draggable sticky notes helper ---
  const [draggedNote, setDraggedNote] = useState(null);

  // Check auth session on startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('cursor_room_token');
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setCurrentUser(data.user);
          setUsername(data.user.username);
          setCursorColor(data.user.color);
          setBrushColor(data.user.color);
        } else {
          localStorage.removeItem('cursor_room_token');
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('All fields are required');
      return;
    }
    setAuthError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim(),
          color: cursorColor
        })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('cursor_room_token', data.token);
        setCurrentUser(data.user);
        setUsername(data.user.username);
        setCursorColor(data.user.color);
        setBrushColor(data.user.color);
        setAuthUsername('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Signup failed');
      }
    } catch (err) {
      setAuthError('Connection error during signup');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('All fields are required');
      return;
    }
    setAuthError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim()
        })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('cursor_room_token', data.token);
        setCurrentUser(data.user);
        setUsername(data.user.username);
        setCursorColor(data.user.color);
        setBrushColor(data.user.color);
        setAuthUsername('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Connection error during login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cursor_room_token');
    setCurrentUser(null);
    setUsername('');
    leaveRoom();
  };

  // Fetch rooms list periodically while in lobby
  useEffect(() => {
    if (currentRoomId) return;

    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/rooms`);
        const data = await response.json();
        if (active && data.success) {
          setRooms(data.rooms);
        }
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentRoomId]);

  // Handle room joining
  const joinRoom = (roomId, roomName) => {
    setCurrentRoomId(roomId);
    setCurrentRoomName(roomName || roomId);
    setDrawings([]);
    setStickyNotes([]);
    setChatHistory([]);
    setActiveTool('cursor');
    socket.emit('join_room', { roomId, name: username, color: cursorColor });
  };

  // Handle room leaving
  const leaveRoom = () => {
    socket.emit('leave_room');
    setCurrentRoomId(null);
    setCurrentRoomName('');
    setRemoteCursors({});
    setDrawings([]);
    setStickyNotes([]);
    setChatHistory([]);
    setTrails([]);
  };

  // Handle creation of custom room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const response = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newRoomName })
      });
      const data = await response.json();
      if (data.success) {
        setNewRoomName('');
        joinRoom(data.room.id, data.room.name);
      } else {
        alert(data.error || 'Failed to create room.');
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  // Save profile color modification
  const handleColorChange = async (val) => {
    setCursorColor(val);
    setBrushColor(val);
    localStorage.setItem('cursor_room_color', val);

    const token = localStorage.getItem('cursor_room_token');
    if (token) {
      try {
        await fetch(`${SERVER_URL}/api/auth/color`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ color: val })
        });
        setCurrentUser(prev => prev ? { ...prev, color: val } : null);
      } catch (err) {
        console.error('Failed to update color on server:', err);
      }
    }
  };

  // --- Real-time Socket Event Handlers ---
  useEffect(() => {
    if (!currentRoomId) return;

    socket.on('room_data', ({ drawings, stickyNotes, chatHistory, activeUsers }) => {
      setDrawings(drawings);
      setStickyNotes(stickyNotes);
      setChatHistory(chatHistory);
      
      const userMap = {};
      activeUsers.forEach(u => {
        if (u.id !== socket.id) {
          userMap[u.id] = u;
        }
      });
      setRemoteCursors(userMap);
    });

    socket.on('user_joined', (user) => {
      if (user.id === socket.id) return;
      setRemoteCursors(prev => ({ ...prev, [user.id]: user }));
    });

    socket.on('user_left', (id) => {
      setRemoteCursors(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });

    socket.on('cursor_moved', ({ id, x, y }) => {
      setRemoteCursors(prev => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: { ...prev[id], x, y }
        };
      });
    });

    socket.on('stroke_drawn', (stroke) => {
      setDrawings(prev => {
        const next = [...prev, stroke];
        redraw(canvasRef.current, next);
        return next;
      });
    });

    socket.on('canvas_cleared', () => {
      setDrawings([]);
      redraw(canvasRef.current, []);
    });

    socket.on('sticky_added', (note) => {
      setStickyNotes(prev => {
        if (prev.some(n => n.id === note.id)) return prev;
        return [...prev, note];
      });
    });

    socket.on('sticky_moved', ({ id, x, y }) => {
      setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
    });

    socket.on('sticky_updated', ({ id, text, color }) => {
      setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text, color } : n));
    });

    socket.on('sticky_deleted', (id) => {
      setStickyNotes(prev => prev.filter(n => n.id !== id));
    });

    socket.on('message_received', (msg) => {
      setChatHistory(prev => [...prev, msg]);
    });

    socket.on('reaction_received', ({ emoji, x, y }) => {
      const rxId = Date.now() + Math.random();
      setReactions(prev => [...prev, { id: rxId, emoji, x, y }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== rxId));
      }, 1500);
    });

    return () => {
      socket.off('room_data');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('cursor_moved');
      socket.off('stroke_drawn');
      socket.off('canvas_cleared');
      socket.off('sticky_added');
      socket.off('sticky_moved');
      socket.off('sticky_updated');
      socket.off('sticky_deleted');
      socket.off('message_received');
      socket.off('reaction_received');
    };
  }, [currentRoomId]);

  // --- Local User Mouse Tracking ---
  useEffect(() => {
    if (!currentRoomId) return;

    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      setMyPos({ x, y });
      socket.emit('cursor_move', { x, y });

      const dot = { id: Date.now() + Math.random(), x, y };
      setTrails(prev => [...prev.slice(-8), dot]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentRoomId]);

  // (redraw helper function is defined outside of App component)

  // Handle Canvas Resizing
  useEffect(() => {
    if (!currentRoomId || !canvasRef.current) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redraw(canvas, drawings);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [currentRoomId, drawings]);

  // Trigger canvas redraw on initial drawing list load
  useEffect(() => {
    if (canvasRef.current) {
      redraw(canvasRef.current, drawings);
    }
  }, [drawings]);

  // Drawing event handlers
  const handleCanvasMouseDown = (e) => {
    if (activeTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || activeTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const updatedStroke = [...currentStroke, { x, y }];
    setCurrentStroke(updatedStroke);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redraw(canvas, drawings);

    // Draw current line
    ctx.beginPath();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(updatedStroke[0].x, updatedStroke[0].y);
    for (let i = 1; i < updatedStroke.length; i++) {
      ctx.lineTo(updatedStroke[i].x, updatedStroke[i].y);
    }
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length > 1) {
      const stroke = { points: currentStroke, color: brushColor, width: brushWidth };
      setDrawings(prev => [...prev, stroke]);
      socket.emit('draw_stroke', { points: currentStroke, color: brushColor, width: brushWidth });
    }
    setCurrentStroke([]);
  };

  const clearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the collaborative canvas?')) {
      socket.emit('clear_canvas');
    }
  };

  // --- Sticky Note Click-to-add / Drag Handlers ---
  const handleBoardClick = (e) => {
    if (activeTool === 'sticky' && e.target.tagName === 'CANVAS') {
      const x = e.clientX;
      const y = e.clientY;
      const id = 'sticky-' + Math.random().toString(36).substring(2, 11);
      socket.emit('add_sticky', { id, x: x - 100, y: y - 80, text: '', color: '#FFEAA7' });
      setActiveTool('cursor');
    }
  };

  const handleBoardDoubleClick = (e) => {
    if (e.target.tagName === 'CANVAS') {
      const x = e.clientX;
      const y = e.clientY;
      const id = 'sticky-' + Math.random().toString(36).substring(2, 11);
      socket.emit('add_sticky', { id, x: x - 100, y: y - 80, text: '', color: '#FFEAA7' });
    }
  };

  const handleNoteMouseDown = (id, e) => {
    if (e.target.closest('.sticky-note-header')) {
      e.preventDefault();
      const note = stickyNotes.find(n => n.id === id);
      if (!note) return;
      setDraggedNote({
        id,
        startX: e.clientX,
        startY: e.clientY,
        noteX: note.x,
        noteY: note.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggedNote) {
        const dx = e.clientX - draggedNote.startX;
        const dy = e.clientY - draggedNote.startY;
        const newX = draggedNote.noteX + dx;
        const newY = draggedNote.noteY + dy;

        setStickyNotes(prev => prev.map(n => n.id === draggedNote.id ? { ...n, x: newX, y: newY } : n));
        socket.emit('move_sticky', { id: draggedNote.id, x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      if (draggedNote) {
        setDraggedNote(null);
      }
    };

    if (draggedNote) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedNote]);

  const updateStickyText = (id, text, color) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text, color } : n));
    socket.emit('update_sticky', { id, text, color });
  };

  const deleteSticky = (id) => {
    socket.emit('delete_sticky', id);
  };

  // --- Reaction Emitter ---
  const sendReaction = (emoji) => {
    if (!currentRoomId) return;
    socket.emit('reaction', { emoji, x: myPos.x, y: myPos.y });
  };

  // --- Chat Submitter ---
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send_message', { message: chatInput.trim() });
    setChatInput('');
  };

  // --- Rendering UI Panels ---

  // Render Loading Screen
  if (authLoading) {
    return (
      <div className="lobby-container" style={{ justifyContent: 'center' }}>
        <div className="lobby-header" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
          <h1 className="lobby-title">you're not alone</h1>
          <p className="lobby-subtitle" style={{ letterSpacing: '4px' }}>Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  // Render Auth screen (Login / Sign Up gateway)
  if (!currentUser) {
    return (
      <div className="lobby-container">
        <div className="lobby-header">
          <h1 className="lobby-title">you're not alone</h1>
          <p className="lobby-subtitle">real-time multiplayer collaborative room</p>
        </div>

        <div className="panel-card glass" style={{ width: '100%', maxWidth: '400px', animation: 'fadeInUp 0.6s ease-out' }}>
          <div className="auth-tabs" style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
            <button 
              className="auth-tab-btn"
              onClick={() => { setAuthTab('login'); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                color: authTab === 'login' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: authTab === 'login' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontWeight: '600',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            >
              Login
            </button>
            <button 
              className="auth-tab-btn"
              onClick={() => { setAuthTab('signup'); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                color: authTab === 'signup' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: authTab === 'signup' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontWeight: '600',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={authTab === 'login' ? handleLogin : handleSignup}>
            {authError && (
              <div style={{
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {authError}
              </div>
            )}

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Username</label>
              <input
                type="text"
                className="text-input"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Enter username"
                maxLength={20}
                required
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="text-input"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {authTab === 'signup' && (
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Cursor Color</label>
                <div className="color-grid">
                  {COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-swatch ${cursorColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c, '--swatch-color': c }}
                      onClick={() => handleColorChange(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {authTab === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Lobby screen
  if (!currentRoomId) {
    return (
      <div className="lobby-container">
        <div className="lobby-header">
          <h1 className="lobby-title">you're not alone</h1>
          <p className="lobby-subtitle">real-time multiplayer collaborative room</p>
        </div>

        <div className="lobby-setup-panel">
          {/* User Profile Customization */}
          <div className="panel-card glass">
            <h2 className="card-title" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile Settings
              </span>
              <button 
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Logout
              </button>
            </h2>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Username</label>
              <div style={{ fontSize: '20px', fontWeight: '800', color: cursorColor, marginTop: '8px', fontFamily: 'var(--font-heading)' }}>
                {username}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Cursor Color</label>
              <div className="color-grid">
                {COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-swatch ${cursorColor === c ? 'active' : ''}`}
                    style={{ backgroundColor: c, '--swatch-color': c }}
                    onClick={() => handleColorChange(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rooms Selection & Creation */}
          <div className="panel-card glass" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="M15 3v18" />
                <path d="M3 9h18" />
                <path d="M3 15h18" />
              </svg>
              Rooms list
            </h2>

            <div className="room-grid">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="room-card glass glass-interactive"
                  onClick={() => joinRoom(room.id, room.name)}
                >
                  <h3 className="room-card-title">{room.name}</h3>
                  <div className="room-card-footer">
                    <span className="player-count-badge">
                      <span className="dot" />
                      {room.activeCount || 0} active
                    </span>
                    <span className="room-join-arrow">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form className="create-room-form" onSubmit={handleCreateRoom}>
              <input
                type="text"
                className="text-input"
                placeholder="Create new room..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <button type="submit" className="btn-primary">Create & Join</button>
            </form>
          </div>
        </div>

        {/* Database Status */}
        <div style={{
          fontSize: '12px',
          color: '#a855f7',
          padding: '8px 16px',
          borderRadius: '20px',
          background: 'rgba(168, 85, 247, 0.08)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
            display: 'inline-block'
          }} />
          MongoDB Atlas connected
        </div>
      </div>
    );
  }

  // Render Room Board workspace
  return (
    <div 
      className="workspace-container"
      onClick={handleBoardClick}
      onDoubleClick={handleBoardDoubleClick}
    >
      {/* Background Dots Grid */}
      <div className="grid-background" />

      {/* Top Navbar */}
      <nav className="top-nav glass">
        <div className="nav-left">
          <button className="btn-back" onClick={leaveRoom}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Lobby
          </button>
          <div className="room-title-section">
            <h1 className="room-name-display">{currentRoomName}</h1>
            <span className="room-status-sub">Room ID: {currentRoomId}</span>
          </div>
        </div>

        <div className="nav-right">
          <div className="active-users-list">
            {/* Local User Circle */}
            <div 
              className="user-avatar-circle"
              style={{ backgroundColor: cursorColor, color: '#000', cursor: 'default' }}
              title={`${username} (You)`}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            {/* Remote Users Circles */}
            {Object.values(remoteCursors).map(u => (
              <div
                key={u.id}
                className="user-avatar-circle"
                style={{ backgroundColor: u.color }}
                title={u.name}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          <button 
            className={`toolbar-btn ${chatOpen ? 'active' : ''}`}
            onClick={() => setChatOpen(!chatOpen)}
            title="Toggle Room Chat"
            style={{ position: 'relative' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Collaborative Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="canvas-element"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      />

      {/* Sticky Notes Layer */}
      {stickyNotes.map(note => (
        <div
          key={note.id}
          className="sticky-note-element"
          style={{
            left: note.x,
            top: note.y,
            backgroundColor: note.color || '#FFEAA7',
            color: '#11131c'
          }}
          onMouseDown={(e) => handleNoteMouseDown(note.id, e)}
        >
          <div className="sticky-note-header">
            <span>By {note.creator_name}</span>
            <button 
              className="sticky-note-delete-btn"
              onClick={() => deleteSticky(note.id)}
              title="Delete Note"
            >
              ✕
            </button>
          </div>
          <textarea
            className="sticky-note-textarea"
            value={note.text || ''}
            onChange={(e) => updateStickyText(note.id, e.target.value, note.color)}
            placeholder="Type note..."
          />
          <div className="sticky-note-footer">
            {STICKY_COLORS.map(col => (
              <div
                key={col}
                className="sticky-color-dot"
                style={{ backgroundColor: col }}
                onClick={() => updateStickyText(note.id, note.text, col)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Drawing Toolbar Overlay */}
      <div className="floating-toolbar glass">
        {/* Cursor Select Tool */}
        <button
          className={`toolbar-btn ${activeTool === 'cursor' ? 'active' : ''}`}
          onClick={() => setActiveTool('cursor')}
          title="Pointer Mode"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="m13 13 6 6" />
          </svg>
        </button>

        {/* Sticky Note Tool */}
        <button
          className={`toolbar-btn ${activeTool === 'sticky' ? 'active' : ''}`}
          onClick={() => setActiveTool('sticky')}
          title="Add Sticky Note (or double-click canvas)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M16 8h-8v8" />
            <path d="M8 8h8v8" />
            <path d="M15 3v4a1 1 0 0 0 1 1h4" />
            <path d="m14.3 14.3 5.7 5.7" />
          </svg>
        </button>

        <div className="toolbar-divider" />

        {/* Drawing Brush Tool */}
        <button
          className={`toolbar-btn ${activeTool === 'draw' ? 'active' : ''}`}
          onClick={() => setActiveTool('draw')}
          title="Pen Tool"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>

        {/* Brush Color Swatch & Palette */}
        <div className="color-picker-wrapper">
          <div
            className="brush-color-indicator"
            style={{ backgroundColor: brushColor }}
            onClick={() => setPaletteOpen(!paletteOpen)}
            title="Choose brush color"
          />
          {paletteOpen && (
            <div className="brush-palette-dropdown glass">
              {COLORS.map(c => (
                <div
                  key={c}
                  className="palette-dot"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setBrushColor(c);
                    setPaletteOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Brush Size Selector */}
        <input
          type="range"
          min="2"
          max="20"
          value={brushWidth}
          onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
          style={{ width: '80px', accentColor: brushColor }}
          title={`Brush Size: ${brushWidth}px`}
        />

        <div className="toolbar-divider" />

        {/* Clear Canvas */}
        <button
          className="toolbar-btn"
          onClick={clearCanvas}
          title="Clear Collaborative Canvas"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Slide-out Chat Sidebar Drawer */}
      <div className={`chat-drawer glass ${chatOpen ? '' : 'closed'}`}>
        <div className="chat-header">
          <h3 className="chat-title">Chat & Online List</h3>
          <button 
            className="toolbar-btn"
            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
            onClick={() => setChatOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Active Online Users count panel */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-light)',
          background: 'rgba(255, 255, 255, 0.01)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            display: 'inline-block',
            boxShadow: '0 0 8px #22c55e'
          }} />
          {Object.keys(remoteCursors).length + 1} active in room
        </div>

        {/* Chat message history list */}
        <div className="chat-message-list">
          {chatHistory.map((msg, index) => {
            const isMe = msg.sender_name === username;
            return (
              <div 
                key={msg.id || index}
                className={`chat-message-item ${isMe ? 'me' : ''}`}
              >
                <span className="message-sender" style={{ color: msg.sender_color }}>
                  {msg.sender_name} {isMe && '(You)'}
                </span>
                <div className="message-bubble">
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input submit bar */}
        <form className="chat-input-wrapper" onSubmit={handleSendChat}>
          <input
            type="text"
            className="text-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type message..."
            maxLength={140}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>
      </div>

      {/* Floating Reactions Toolbar (bottom right) */}
      <div className="reactions-float-panel glass">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            className="reaction-btn"
            onClick={() => sendReaction(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Dynamic Local Cursor Trail Elements */}
      {trails.map((dot, i) => (
        <div key={dot.id} style={{
          position: 'fixed',
          left: dot.x, top: dot.y,
          width: 4 + i * 0.4, height: 4 + i * 0.4,
          borderRadius: '50%',
          background: cursorColor,
          opacity: (i / trails.length) * 0.5,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 60
        }} />
      ))}

      {/* Local User Custom Cursor Representation */}
      <div style={{
        position: 'fixed',
        left: myPos.x, top: myPos.y,
        pointerEvents: 'none',
        transform: 'translate(-2px, -2px)',
        zIndex: 100
      }}>
        <svg width="22" height="22" viewBox="0 0 20 20">
          <path 
            d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L11 9 Z"
            fill={cursorColor} 
            stroke="#000" 
            strokeWidth="1.5" 
          />
        </svg>
      </div>

      {/* Active Remote Users Custom Cursors */}
      {Object.values(remoteCursors).map(user => (
        user.x !== undefined && (
          <div key={user.id} style={{
            position: 'fixed',
            left: user.x, top: user.y,
            pointerEvents: 'none',
            transform: 'translate(-2px, -2px)',
            transition: 'left 0.08s cubic-bezier(0.1, 0.8, 0.25, 1), top 0.08s cubic-bezier(0.1, 0.8, 0.25, 1)',
            zIndex: 90
          }}>
            <svg width="22" height="22" viewBox="0 0 20 20">
              <path 
                d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L11 9 Z"
                fill={user.color} 
                stroke="#000" 
                strokeWidth="1.5" 
              />
            </svg>
            <div style={{
              position: 'absolute', top: 20, left: 10,
              background: user.color, color: '#000',
              padding: '3px 8px', borderRadius: '6px',
              fontSize: '11px', fontWeight: 'bold',
              whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${user.color}44`
            }}>
              {user.name}
            </div>
          </div>
        )
      ))}

      {/* Floating Erupting Reactions Layer */}
      {reactions.map(r => (
        <div key={r.id} style={{
          position: 'fixed', left: r.x, top: r.y,
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