require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');
const { authenticateToken } = require('./middleware/auth');
const cloudinary = require('./config/cloudinary');
const { JWT_SECRET } = require('./config/jwt');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Authentication middleware (extracted to middleware/auth.js)

// Middleware
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // If no ALLOWED_ORIGINS is specified in env
    if (allowedOrigins.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          'CORS BLOCKED: ALLOWED_ORIGINS not set in production.\n' +
          '  Set ALLOWED_ORIGINS to your frontend URL(s) in environment variables.'
        );
        return callback(new Error('Not allowed by CORS'));
      }
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

// File upload routes
app.use('/api/rooms', fileRoutes);

// Dev-only: serve local uploaded files and cloudinary debug endpoint
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.get('/api/debug/cloudinary-test', (req, res) => {
    res.json({
      success: true,
      cloudinary_configured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '(not set)',
      has_api_key: !!process.env.CLOUDINARY_API_KEY,
      has_api_secret: !!process.env.CLOUDINARY_API_SECRET
    });
  });
}

app.get('/', (req, res) => {
  res.json({ success: true, message: "Multiplayer Cursor Room Backend is running!", status: "healthy" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions
});

// Make io accessible to route handlers via req.app.get('io')
app.set('io', io);

// Socket.IO auth middleware: verify JWT on every connection/reconnection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Allow connection without token — user must provide token via join_room
    // This preserves backward compatibility with existing clients
    socket.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      socket.user = null;
      return next();
    }
    socket.user = {
      userId: decoded.userId,
      username: decoded.username || decoded.name || decoded.displayName || '',
      email: decoded.email || ''
    };
    next();
  });
});

// In-memory active users tracker (scoped by roomId)
// Structure: { [roomId]: { [socketId]: { id, name, color, x, y } } }
const activeUsers = {};

// Global socket-to-user mapping (not room-scoped) for sending events to users
// who may not be in a room (e.g. kicked user on dashboard receiving approval)
// Structure: { [socketId]: { userId, username } | null }
const socketUserMap = {};

// HTTP REST API - Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, color } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || cleanEmail.startsWith('@') || cleanEmail.endsWith('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    const existingEmail = await db.getUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ success: false, error: 'This email is already registered. Try logging in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userColor = color || '#FF6B6B';
    const user = await db.createUser(cleanUsername, cleanEmail, passwordHash, userColor);

    const token = jwt.sign({ userId: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      token,
      user: { userId: user.id, username: user.username, email: user.email, color: user.color }
    });
  } catch (err) {
    // Catch MongoDB duplicate key errors and show a friendly message
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'This email is already registered. Try logging in instead.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { userId: user.id, username: user.username, email: user.email, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user: { userId: user.id, username: user.username, email: user.email, color: user.color }
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
    const user = await db.updateUserColorByEmail(req.user.email, color);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user: { userId: user.id, username: user.username, email: user.email, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }
    const user = await db.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.updateUserPassword(user.id, newPasswordHash);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username, color } = req.body;
    if (!username && !color) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    if (username && (username.trim().length < 3 || username.trim().length > 20)) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
    }
    const updates = {};
    if (username) updates.username = username.trim();
    if (color) updates.color = color;
    const user = await db.updateUserProfile(req.user.userId, updates);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user: { userId: user.id, username: user.username, email: user.email, color: user.color }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await db.getRooms(req.user.userId, req.user.email);

    const roomsWithCounts = rooms.map(room => {
      const roomSockets = io.sockets.adapter.rooms.get(room.id);
      const activeCount = roomSockets ? roomSockets.size : 0;
      return {
        id: room.id,
        roomId: room.roomId,
        name: room.name,
        roomName: room.roomName || room.name,
        createdBy: room.ownerName,
        ownerId: room.ownerId,
        createdAt: room.createdAt || room.created_at,
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

app.get('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ success: false, error: 'Room ID is required.' });
    }
    const room = await db.getRoomByRoomId(roomId.trim());
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const isMember = room.ownerId === req.user.userId ||
      (room.participants && room.participants.some(p => p.userId === req.user.userId));

    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied. You do not have access to this room.' });
    }

    const kicked = await db.isUserKicked(room.id, req.user.userId);
    if (kicked) {
      return res.status(403).json({ success: false, error: 'Access denied. You were removed from this room by the owner.' });
    }

    const safeRoom = {
      id: room.id,
      roomId: room.roomId,
      name: room.name,
      roomName: room.roomName || room.name,
      createdBy: room.ownerName,
      ownerId: room.ownerId,
      createdAt: room.createdAt || room.created_at,
      boardColor: room.boardColor || null
    };

    res.json({
      success: true,
      room: safeRoom
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
    const room = await db.createRoom(id, name.trim(), passwordHash, req.user.userId, req.user.email, req.user.username);

    if (room) {
      delete room.passwordHash;
      room.createdBy = room.ownerName;
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
        return res.status(401).json({ success: false, error: 'Incorrect room password.' });
      }
    }

    // Check if user is kicked
    const isKicked = await db.isUserKicked(room.id, req.user.userId);
    if (isKicked) {
      await db.addJoinRequest(room.id, req.user.userId, req.user.email, req.user.username);
      return res.status(202).json({
        success: true,
        requiresApproval: true,
        message: 'Access request sent to room owner.'
      });
    }

    await db.addRoomMember(room.id, req.user.userId, req.user.email, req.user.username);

    const updatedRoom = await db.getRoomById(room.id);
    if (updatedRoom) {
      delete updatedRoom.passwordHash;
      updatedRoom.createdBy = updatedRoom.ownerName;
    }

    res.json({ success: true, room: updatedRoom });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kick a user from the room (owner only)
app.post('/api/rooms/:roomId/kick', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId: targetUserId } = req.body;
    if (!roomId || !targetUserId) {
      return res.status(400).json({ success: false, error: 'Room ID and target userId are required.' });
    }
    const room = await db.getRoomByRoomId(roomId.trim());
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }
    if (room.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only the room owner can kick users.' });
    }
    if (targetUserId === req.user.userId) {
      return res.status(400).json({ success: false, error: 'You cannot kick yourself.' });
    }
    await db.kickUserFromRoom(room.id, targetUserId);

    const io = req.app.get('io');

    // Emit to the kicked user's sockets directly
    const roomSockets = activeUsers[room.id];
    if (roomSockets) {
      for (const [sid, user] of Object.entries(roomSockets)) {
        if (user.userId === targetUserId) {
          io.to(sid).emit('kicked-from-room', {
            roomId: room.roomId,
            reason: 'You were removed from this room by the owner.'
          });
          const kickedSocket = io.sockets.sockets.get(sid);
          if (kickedSocket) {
            kickedSocket.leave(room.id);
          }
          delete roomSockets[sid];
        }
      }
      if (Object.keys(roomSockets).length === 0) {
        delete activeUsers[room.id];
      }
    }

    // Notify remaining members
    io.to(room.id).emit('room-members-updated', { action: 'kicked', targetUserId });
    // Remove kicked user's cursor from all remaining clients
    io.to(room.id).emit('cursor-removed', { userId: targetUserId });

    res.json({ success: true, message: 'User removed from room.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve join request for a kicked user (owner only)
app.post('/api/rooms/:roomId/requests/:userId/approve', authenticateToken, async (req, res) => {
  try {
    const { roomId, userId: requesterUserId } = req.params;
    const room = await db.getRoomByRoomId(roomId.trim());
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }
    if (room.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only the room owner can approve requests.' });
    }
    await db.approveJoinRequest(room.id, req.user.userId, requesterUserId);

    const io = req.app.get('io');
    // Notify the requester via global socket map (they may not be in the room)
    for (const [sid, userData] of Object.entries(socketUserMap)) {
      if (userData && userData.userId === requesterUserId) {
        io.to(sid).emit('join-request-approved', {
          roomId: room.roomId,
          roomInternalId: room.id,
          message: 'Owner accepted your request. Joining room...'
        });
      }
    }

    // Refresh members panel in the room
    io.to(room.id).emit('room-members-updated', { ownerId: room.ownerId });

    res.json({ success: true, message: 'User approved and can now join the room.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject join request for a kicked user (owner only)
app.post('/api/rooms/:roomId/requests/:userId/reject', authenticateToken, async (req, res) => {
  try {
    const { roomId, userId: requesterUserId } = req.params;
    const room = await db.getRoomByRoomId(roomId.trim());
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }
    if (room.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only the room owner can reject requests.' });
    }
    await db.rejectJoinRequest(room.id, req.user.userId, requesterUserId);

    const io = req.app.get('io');
    // Notify the requester via global socket map (they may not be in the room)
    for (const [sid, userData] of Object.entries(socketUserMap)) {
      if (userData && userData.userId === requesterUserId) {
        io.to(sid).emit('join-request-rejected', {
          roomId: room.roomId,
          message: 'Owner rejected your request.'
        });
      }
    }

    // Refresh members panel (removes the request from pending list)
    io.to(room.id).emit('room-members-updated', { ownerId: room.ownerId });

    res.json({ success: true, message: 'Request rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get room members and join requests (for the members panel)
app.get('/api/rooms/:roomId/members', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await db.getRoomByRoomId(roomId.trim());
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }
    const isMember = room.ownerId === req.user.userId ||
      (room.participants && room.participants.some(p => p.userId === req.user.userId));
    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }
    const members = await db.getRoomMembers(room.id);
    const joinRequests = await db.getJoinRequests(room.id);
    res.json({
      success: true,
      ownerId: members.ownerId,
      ownerName: members.ownerName,
      participants: members.participants || [],
      joinRequests: req.user.userId === room.ownerId ? joinRequests : []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete room (owner only, from lobby or inside room)
app.delete('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const roomId = String(req.params.roomId).trim();
    console.log("DELETE ROUTE HIT");
    console.log("req.params:", req.params);
    console.log("DELETE PARAM:", req.params.roomId);
    console.log("DELETE USER:", req.user?.userId, req.user?.email);
    console.log("Trying delete lookup by public roomId:", roomId);

    const room = await db.getRoomByRoomId(roomId);
    
    console.log("DELETE ROOM FOUND:", !!room);
    console.log("DELETE ROOM OWNER:", room?.ownerId, room?.ownerEmail);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    if (room.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only the room owner can delete this room.' });
    }
    
    await db.deleteRoom(room.id);
    io.to(room.id).emit('room_deleted');
    io.emit('room_removed', { roomId: room.roomId });
    res.json({ success: true, message: 'Room deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Socket.io Real-time Operations
io.on('connection', (socket) => {
  let currentRoomId = null;

  console.log(`🔌 User connected: ${socket.id}`);
  socketUserMap[socket.id] = null;

  // User Joins a specific room
  socket.on('join_room', async ({ roomId, name, color, token }) => {
    try {
      // Use socket.user from auth middleware or decode token from event payload
      let socketUser = socket.user;
      if (!socketUser || !socketUser.userId) {
        if (!token) {
          socket.emit('error_message', 'Access denied: Authentication token missing.');
          return;
        }
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          socketUser = {
            userId: decoded.userId,
            username: decoded.username || '',
            email: decoded.email || ''
          };
        } catch (err) {
          socket.emit('error_message', 'Access denied: Invalid or expired token.');
          return;
        }
      }

      const userId = socketUser.userId;
      const username = socketUser.username;

      // Verify membership
      const room = await db.getRoomById(roomId);
      if (!room) {
        socket.emit('error_message', 'Room not found.');
        return;
      }

      // Check membership if room has password hash
      if (room.passwordHash) {
        const isMember =
          room.ownerId === userId ||
          (room.participants && room.participants.some(p => p.userId === userId));

        if (!isMember) {
          socket.emit('error_message', 'Access denied: You are not authorized to join this room.');
          return;
        }
      }

      // Check if user is kicked
      const kicked = await db.isUserKicked(roomId, userId);
      if (kicked) {
        socket.emit('error_message', 'Access denied: You were removed from this room by the owner.');
        return;
      }

      currentRoomId = roomId;
      socket.userData = { userId, username };
      socket.join(roomId);

      // Add to global socket-user map
      socketUserMap[socket.id] = { userId, username };

      // Add to active users
      if (!activeUsers[roomId]) {
        activeUsers[roomId] = {};
      }

      const displayName = username || name || `Guest-${socket.id.substring(0, 4)}`;
      activeUsers[roomId][socket.id] = {
        id: socket.id,
        userId,
        name: displayName,
        color: color || '#aa3bff',
        x: -100,
        y: -100
      };

      console.log(`👤 User "${displayName}" joined room "${roomId}" (Socket ID: ${socket.id})`);

      // Load persistent historical room data from DB
      const drawings = await db.getDrawings(roomId);
      const stickyNotes = await db.getStickyNotes(roomId);
      const chatHistory = await db.getChatMessages(roomId, 50);
      const fileMessages = await db.getFileMessages(roomId);

      // Send initial data state back to the user
      socket.emit('room_data', {
        drawings,
        stickyNotes,
        chatHistory,
        fileMessages,
        roomCreatedBy: room.ownerName,
        roomOwnerId: room.ownerId,
        boardColor: room.boardColor || null,
        activeUsers: Object.values(activeUsers[roomId])
      });

      // Broadcast new user connection to others in the room
      socket.to(roomId).emit('user_joined', activeUsers[roomId][socket.id]);
      // Broadcast updated members list to all (including the new user)
      io.to(roomId).emit('room-members-updated', { ownerId: room.ownerId });
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

  // Drawing: drawing path segments (pen / eraser)
  socket.on('draw_stroke', async ({ id, points, color, width, eraser }) => {
    if (!currentRoomId) return;

    socket.to(currentRoomId).emit('stroke_drawn', {
      id, points, color, width, eraser: eraser || false
    });

    try {
      await db.addDrawing(currentRoomId, { type: 'pen', points, color, size: width, eraser, stroke_id: id });
    } catch (err) {
      console.error('Failed to save drawing:', err.message);
    }
  });

  // Canvas: shape (line / rect / circle)
  socket.on('canvas:shape', async (shape) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('canvas:shape', shape);
    try {
      await db.addDrawing(currentRoomId, { ...shape, stroke_id: shape.id });
    } catch (err) {
      console.error('Failed to save shape:', err.message);
    }
  });

  // Canvas: text placement
  socket.on('canvas:text', async (textData) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('canvas:text', textData);
    try {
      await db.addDrawing(currentRoomId, { ...textData, stroke_id: textData.id });
    } catch (err) {
      console.error('Failed to save text:', err.message);
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

  // Canvas: undo (remove any drawing element by id)
  socket.on('canvas:undo', async ({ strokeId }) => {
    if (!currentRoomId) return;
    try {
      await db.deleteDrawingByStrokeId(currentRoomId, strokeId);
      io.to(currentRoomId).emit('canvas:undo', { strokeId });
    } catch (err) {
      console.error('Failed to undo canvas action:', err.message);
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

  // Board: clear all (drawings + sticky notes)
  socket.on('board:clear-all', async () => {
    if (!currentRoomId) return;

    try {
      await db.clearDrawings(currentRoomId);
      await db.clearStickyNotes(currentRoomId);
      io.to(currentRoomId).emit('board:all-cleared');
    } catch (err) {
      console.error('Failed to clear board:', err.message);
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

  // Board Color
  socket.on('board_color_change', async ({ color }) => {
    if (!currentRoomId) return;
    if (color !== null && !/^#[0-9A-Fa-f]{6}$/.test(color)) return;
    io.to(currentRoomId).emit('board_color_changed', { color });
    try {
      await db.setBoardColor(currentRoomId, color);
    } catch (err) {
      console.error('Failed to save board color:', err.message);
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
  socket.on('send_message', async ({ message, replyTo }) => {
    if (!currentRoomId || !activeUsers[currentRoomId] || !activeUsers[currentRoomId][socket.id]) return;

    const user = activeUsers[currentRoomId][socket.id];
    try {
      const savedMsg = await db.saveChatMessage(currentRoomId, user.name, user.color, message, user.userId, replyTo);
      io.to(currentRoomId).emit('message_received', savedMsg);
    } catch (err) {
      console.error('Failed to save message:', err.message);
    }
  });

  // Delete room (owner only)
  socket.on('delete_room', async () => {
    if (!currentRoomId) return;
    try {
      const room = await db.getRoomById(currentRoomId);
      if (!room) {
        socket.emit('error_message', 'Room not found.');
        return;
      }
      const userId = socket.userData?.userId;
      if (!userId) {
        socket.emit('error_message', 'Authentication required.');
        return;
      }
      if (room.ownerId !== userId) {
        socket.emit('error_message', 'Only the room owner can delete the room.');
        return;
      }
      if (cloudinary.isConfigured) {
        const fileMessages = await db.getFileMessages(currentRoomId);
        for (const msg of fileMessages) {
          if (msg.cloudinary_public_id) {
            try {
              await cloudinary.uploader.destroy(msg.cloudinary_public_id);
            } catch (e) {
              console.error('Cloudinary delete error:', e.message);
            }
          }
        }
      }

      io.to(currentRoomId).emit('room_deleted');
      io.emit('room_removed', { roomId: room.roomId || currentRoomId, id: currentRoomId });
      await db.deleteRoom(currentRoomId);
      console.log(`🗑️ Room "${currentRoomId}" deleted by owner ${socket.userData?.username}`);
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
      io.to(currentRoomId).emit('room-members-updated', {});
      delete activeUsers[currentRoomId][socket.id];
      socket.leave(currentRoomId);
      console.log(`👤 User "${user.name}" left room "${currentRoomId}" manually`);
      if (Object.keys(activeUsers[currentRoomId]).length === 0) {
        delete activeUsers[currentRoomId];
      }
      currentRoomId = null;
    }
  });

  // Kick user from room (owner only, via socket)
  socket.on('kick-user', async ({ roomId, targetUserId }) => {
    try {
      const room = await db.getRoomById(roomId);
      if (!room) {
        socket.emit('error_message', 'Room not found.');
        return;
      }
      if (room.ownerId !== socket.userData?.userId) {
        socket.emit('error_message', 'Only the room owner can kick users.');
        return;
      }
      if (targetUserId === socket.userData?.userId) {
        socket.emit('error_message', 'You cannot kick yourself.');
        return;
      }
      await db.kickUserFromRoom(roomId, targetUserId);

      // Kick from active users and emit to target sockets
      const roomSockets = activeUsers[roomId];
      if (roomSockets) {
        for (const [sid, userData] of Object.entries(roomSockets)) {
          if (userData.userId === targetUserId) {
            io.to(sid).emit('kicked-from-room', {
              roomId: room.roomId,
              reason: 'You were removed from this room by the owner.'
            });
            const kickedSocket = io.sockets.sockets.get(sid);
            if (kickedSocket) {
              kickedSocket.leave(roomId);
            }
            delete roomSockets[sid];
          }
        }
        if (Object.keys(roomSockets).length === 0) {
          delete activeUsers[roomId];
        }
      }

      // Notify remaining members
      io.to(roomId).emit('room-members-updated', { action: 'kicked', targetUserId });
      // Remove kicked user's cursor from all remaining clients
      io.to(roomId).emit('cursor-removed', { userId: targetUserId });
    } catch (err) {
      console.error('Error on kick-user:', err);
    }
  });

  // Disconnection handler
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    delete socketUserMap[socket.id];

    if (currentRoomId && activeUsers[currentRoomId] && activeUsers[currentRoomId][socket.id]) {
      const user = activeUsers[currentRoomId][socket.id];
      socket.to(currentRoomId).emit('user_left', socket.id);

      delete activeUsers[currentRoomId][socket.id];
      console.log(`👤 User "${user.name}" left room "${currentRoomId}"`);

      // Broadcast updated members list
      io.to(currentRoomId).emit('room-members-updated', {});

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
    console.log(
      'NOTE: Password hashing changed from PBKDF2 to bcrypt.\n' +
      '  If existing users cannot log in, ask them to sign up again.\n' +
      '  Old password hashes are incompatible with the new bcrypt-based authentication.'
    );
    server.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB. Server will not start.');
    console.error('   Error:', err.message);
    process.exit(1);
  });