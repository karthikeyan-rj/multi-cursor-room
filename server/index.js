const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET || 'cursor_room_super_secret_key_123';

// Password hashing helper using PBKDF2
function hashPassword(password) {
  const salt = 'cursor_room_secret_salt_987';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Forbidden: Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // If no ALLOWED_ORIGINS is specified in env, allow all origins
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Also allow localhost for development convenience
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true
};
app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.json({ success: true, message: "Multiplayer Cursor Room Backend is running!", status: "healthy" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions
});

// In-memory active users tracker (scoped by roomId)
// Structure: { [roomId]: { [socketId]: { id, name, color, x, y } } }
const activeUsers = {};

// HTTP REST API - Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, color } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
    }

    const existingUser = await db.getUser(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already taken' });
    }

    const passwordHash = hashPassword(password);
    const userColor = color || '#FF6B6B';
    const user = await db.createUser(cleanUsername, passwordHash, userColor);

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      token,
      user: { username: user.username, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = await db.getUser(username.trim());
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid username or password' });
    }

    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return res.status(400).json({ success: false, error: 'Invalid username or password' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { username: user.username, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUser(req.user.username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user: { username: user.username, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/color', authenticateToken, async (req, res) => {
  try {
    const { color } = req.body;
    if (!color) {
      return res.status(400).json({ success: false, error: 'Color is required' });
    }
    const user = await db.updateUserColor(req.user.username, color);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user: { username: user.username, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await db.getRooms(req.user.username);

    // Annotate with active player counts and strip passwordHash
    const roomsWithCounts = rooms.map(room => {
      const roomSockets = io.sockets.adapter.rooms.get(room.id);
      const activeCount = roomSockets ? roomSockets.size : 0;
      return {
        id: room.id,
        roomId: room.roomId,
        name: room.name,
        roomName: room.roomName || room.name,
        createdBy: room.createdBy,
        createdAt: room.createdAt || room.created_at,
        members: room.members,
        activeCount
      };
    });

    res.json({
      success: true,
      rooms: roomsWithCounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Room name is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    // Create URL-friendly slug as internal room ID (slug)
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!baseSlug) {
      return res.status(400).json({ success: false, error: 'Invalid room name' });
    }

    // Room names are NOT unique — only roomId (8-digit) is unique.
    // Make the internal slug unique by appending a short random suffix if needed.
    let id = baseSlug;
    let attempt = await db.getRoomById(id);
    while (attempt) {
      id = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      attempt = await db.getRoomById(id);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const room = await db.createRoom(id, name.trim(), passwordHash, req.user.username);

    // Do not return passwordHash
    if (room) {
      delete room.passwordHash;
    }

    res.status(201).json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/rooms/join', authenticateToken, async (req, res) => {
  try {
    const { roomId, password } = req.body;
    if (!roomId) {
      return res.status(400).json({ success: false, error: 'Room ID is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Room password is required' });
    }

    // Search room by roomId
    const room = await db.getRoomByRoomId(roomId.trim());
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    // Verify password if protected
    if (room.passwordHash) {
      const match = await bcrypt.compare(password, room.passwordHash);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Incorrect room password.' });
      }
    }

    // Add user to room members
    await db.addRoomMember(room.id, req.user.username);

    // Fetch updated room
    const updatedRoom = await db.getRoomById(room.id);
    if (updatedRoom) {
      delete updatedRoom.passwordHash;
    }

    res.json({ success: true, room: updatedRoom });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete room (owner only, from lobby)
app.delete('/api/rooms/:slug', authenticateToken, async (req, res) => {
  try {
    const room = await db.getRoomById(req.params.slug);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }
    if (room.createdBy !== req.user.username) {
      return res.status(403).json({ success: false, error: 'Only the room owner can delete this room.' });
    }
    await db.deleteRoom(req.params.slug);
    // Notify any active sockets in this room
    const roomSockets = io.sockets.adapter.rooms.get(req.params.slug);
    if (roomSockets) {
      io.to(req.params.slug).emit('room_deleted');
    }
    res.json({ success: true, message: 'Room deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Socket.io Real-time Operations
io.on('connection', (socket) => {
  let currentRoomId = null;

  console.log(`🔌 User connected: ${socket.id}`);

  // User Joins a specific room
  socket.on('join_room', async ({ roomId, name, color, token }) => {
    try {
      if (!token) {
        socket.emit('error_message', 'Access denied: Authentication token missing.');
        return;
      }

      let decodedUser;
      try {
        decodedUser = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        socket.emit('error_message', 'Access denied: Invalid or expired token.');
        return;
      }

      const decodedUsername = decodedUser.username;

      // Verify membership
      const room = await db.getRoomById(roomId);
      if (!room) {
        socket.emit('error_message', 'Room not found.');
        return;
      }

      // Check membership if room has password hash
      if (room.passwordHash) {
        const isMember =
          room.createdBy === decodedUsername ||
          (room.members && room.members.includes(decodedUsername.toLowerCase()));

        if (!isMember) {
          socket.emit('error_message', 'Access denied: You are not authorized to join this room.');
          return;
        }
      }

      currentRoomId = roomId;
      socket.userData = { username: decodedUsername };
      socket.join(roomId);

      // Add to active users
      if (!activeUsers[roomId]) {
        activeUsers[roomId] = {};
      }

      activeUsers[roomId][socket.id] = {
        id: socket.id,
        name: name || `Guest-${socket.id.substring(0, 4)}`,
        color: color || '#aa3bff',
        x: -100,
        y: -100
      };

      console.log(`👤 User "${name}" joined room "${roomId}" (Socket ID: ${socket.id})`);

      // Load persistent historical room data from DB
      const drawings = await db.getDrawings(roomId);
      const stickyNotes = await db.getStickyNotes(roomId);
      const chatHistory = await db.getChatMessages(roomId, 50);

      // Send initial data state back to the user
      socket.emit('room_data', {
        drawings,
        stickyNotes,
        chatHistory,
        roomCreatedBy: room.createdBy,
        activeUsers: Object.values(activeUsers[roomId])
      });

      // Broadcast new user connection to others in the room
      socket.to(roomId).emit('user_joined', activeUsers[roomId][socket.id]);
    } catch (err) {
      console.error('Error on join_room:', err);
      socket.emit('error_message', 'Failed to join room properly.');
    }
  });

  // Cursor movements
  socket.on('cursor_move', ({ x, y }) => {
    if (!currentRoomId || !activeUsers[currentRoomId] || !activeUsers[currentRoomId][socket.id]) return;

    activeUsers[currentRoomId][socket.id].x = x;
    activeUsers[currentRoomId][socket.id].y = y;

    socket.to(currentRoomId).emit('cursor_moved', {
      id: socket.id,
      x,
      y
    });
  });

  // Floating Emoji reaction
  socket.on('reaction', ({ emoji, x, y }) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('reaction_received', {
      id: socket.id,
      emoji,
      x,
      y
    });
  });

  // Drawing: drawing path segments
  socket.on('draw_stroke', async ({ id, points, color, width, eraser }) => {
    if (!currentRoomId) return;

    // Broadcast stroke to other participants with the client-generated id
    socket.to(currentRoomId).emit('stroke_drawn', {
      id, points, color, width, eraser: eraser || false
    });

    // Save to database asynchronously in the background
    try {
      await db.addDrawing(currentRoomId, points, color, width, eraser, id);
    } catch (err) {
      console.error('Failed to save drawing:', err.message);
    }
  });

  // Undo: remove stroke by client-generated stroke id
  socket.on('undo_last_stroke', async ({ strokeId }) => {
    if (!currentRoomId) return;
    try {
      await db.deleteDrawingByStrokeId(currentRoomId, strokeId);
      io.to(currentRoomId).emit('stroke_undone', { strokeId });
    } catch (err) {
      console.error('Failed to undo stroke:', err.message);
    }
  });

  // Canvas clear
  socket.on('clear_canvas', async () => {
    if (!currentRoomId) return;

    try {
      await db.clearDrawings(currentRoomId);
      io.to(currentRoomId).emit('canvas_cleared');
    } catch (err) {
      console.error('Failed to clear canvas:', err.message);
    }
  });

  // Sticky Notes: Add Note
  socket.on('add_sticky', async ({ id, x, y, text, color }) => {
    if (!currentRoomId || !activeUsers[currentRoomId] || !activeUsers[currentRoomId][socket.id]) return;

    const user = activeUsers[currentRoomId][socket.id];
    try {
      const note = await db.saveStickyNote(id, currentRoomId, x, y, text || '', color, user.name);
      io.to(currentRoomId).emit('sticky_added', note);
    } catch (err) {
      console.error('Failed to create sticky note:', err.message);
    }
  });

  // Sticky Notes: Move Note
  socket.on('move_sticky', async ({ id, x, y }) => {
    if (!currentRoomId) return;

    // Broadcast position update to other room users in real-time
    socket.to(currentRoomId).emit('sticky_moved', { id, x, y });

    try {
      await db.updateStickyNotePosition(id, x, y);
    } catch (err) {
      console.error('Failed to update sticky note position:', err.message);
    }
  });

  // Sticky Notes: Update Text/Color
  socket.on('update_sticky', async ({ id, text, color }) => {
    if (!currentRoomId) return;

    socket.to(currentRoomId).emit('sticky_updated', { id, text, color });

    try {
      await db.updateStickyNoteText(id, text, color);
    } catch (err) {
      console.error('Failed to update sticky note content:', err.message);
    }
  });

  // Sticky Notes: Delete Note
  socket.on('delete_sticky', async (id) => {
    if (!currentRoomId) return;

    io.to(currentRoomId).emit('sticky_deleted', id);

    try {
      await db.deleteStickyNote(id);
    } catch (err) {
      console.error('Failed to delete sticky note:', err.message);
    }
  });

  // Chat Messenger
  socket.on('send_message', async ({ message }) => {
    if (!currentRoomId || !activeUsers[currentRoomId] || !activeUsers[currentRoomId][socket.id]) return;

    const user = activeUsers[currentRoomId][socket.id];
    try {
      const savedMsg = await db.saveChatMessage(currentRoomId, user.name, user.color, message);
      io.to(currentRoomId).emit('message_received', savedMsg);
    } catch (err) {
      console.error('Failed to save message:', err.message);
    }
  });

  // Delete room (creator only)
  socket.on('delete_room', async () => {
    if (!currentRoomId) return;
    try {
      const room = await db.getRoomById(currentRoomId);
      if (!room) {
        socket.emit('error_message', 'Room not found.');
        return;
      }
      const username = socket.userData?.username;
      if (!username) {
        socket.emit('error_message', 'Authentication required.');
        return;
      }
      if (room.createdBy !== username) {
        socket.emit('error_message', 'Only the room creator can delete the room.');
        return;
      }
      io.to(currentRoomId).emit('room_deleted');
      await db.deleteRoom(currentRoomId);
      console.log(`🗑️ Room "${currentRoomId}" deleted by creator "${username}"`);
    } catch (err) {
      console.error('Error on delete_room:', err);
      socket.emit('error_message', 'Failed to delete room.');
    }
  });

  // Leave room manually
  socket.on('leave_room', () => {
    if (currentRoomId && activeUsers[currentRoomId] && activeUsers[currentRoomId][socket.id]) {
      const user = activeUsers[currentRoomId][socket.id];
      socket.to(currentRoomId).emit('user_left', socket.id);
      delete activeUsers[currentRoomId][socket.id];
      socket.leave(currentRoomId);
      console.log(`👤 User "${user.name}" left room "${currentRoomId}" manually`);
      if (Object.keys(activeUsers[currentRoomId]).length === 0) {
        delete activeUsers[currentRoomId];
      }
      currentRoomId = null;
    }
  });

  // Disconnection handler
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);

    if (currentRoomId && activeUsers[currentRoomId] && activeUsers[currentRoomId][socket.id]) {
      const user = activeUsers[currentRoomId][socket.id];
      socket.to(currentRoomId).emit('user_left', socket.id);

      delete activeUsers[currentRoomId][socket.id];
      console.log(`👤 User "${user.name}" left room "${currentRoomId}"`);

      // Clean up empty room listings
      if (Object.keys(activeUsers[currentRoomId]).length === 0) {
        delete activeUsers[currentRoomId];
      }
    }
  });
});

// Connect to MongoDB then start server
db.initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB. Server will not start.');
    console.error('   Error:', err.message);
    process.exit(1);
  });