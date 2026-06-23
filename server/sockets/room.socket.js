const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config/jwt');
const cloudinary = require('../config/cloudinary');
const { emitActivity } = require('./activity');
const { activeUsers, socketUserMap, emitRoomMembers } = require('./state');

function registerRoomHandlers(io, socket) {
  socket.currentRoomId = null;

  socket.on('join_room', async ({ roomId, name, color, token }) => {
    try {
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

      const room = await db.getRoomById(roomId);
      if (!room) {
        socket.emit('error_message', 'Room not found.');
        return;
      }

      if (room.passwordHash) {
        const isMember =
          room.ownerId === userId ||
          (room.participants && room.participants.some(p => p.userId === userId));

        if (!isMember) {
          socket.emit('error_message', 'Access denied: You are not authorized to join this room.');
          return;
        }
      }

      const kicked = await db.isUserKicked(roomId, userId);
      if (kicked) {
        socket.emit('error_message', 'Access denied: You were removed from this room by the owner.');
        return;
      }

      socket.currentRoomId = roomId;
      socket.userData = { userId, username };
      socket.join(roomId);

      socketUserMap[socket.id] = { userId, username };

      if (!activeUsers[roomId]) {
        activeUsers[roomId] = {};
      }

      const displayName = username || name || `Guest-${socket.id.substring(0, 4)}`;
      activeUsers[roomId][socket.id] = {
        id: socket.id,
        userId,
        username,
        name: displayName,
        socketId: socket.id,
        color: color || '#aa3bff',
        x: -100,
        y: -100
      };

      const drawings = await db.getDrawings(roomId);
      const stickyNotes = await db.getStickyNotes(roomId);
      const chatHistory = await db.getChatMessages(roomId, 50);
      const fileMessages = await db.getFileMessages(roomId);

      socket.emit('room_data', {
        drawings,
        stickyNotes,
        chatHistory,
        fileMessages,
        roomCreatedBy: room.ownerName,
        roomOwnerId: room.ownerId,
        boardColor: room.boardColor || null,
        roomName: room.name || room.roomName,
        allowChat: room.allowChat !== undefined ? room.allowChat : true,
        allowFiles: room.allowFiles !== undefined ? room.allowFiles : true,
        allowDrawing: room.allowDrawing !== undefined ? room.allowDrawing : true,
        allowStickyNotes: room.allowStickyNotes !== undefined ? room.allowStickyNotes : true,
        activeUsers: Object.values(activeUsers[roomId])
      });

      socket.to(roomId).emit('user_joined', activeUsers[roomId][socket.id]);
      socket.to(roomId).emit('room-activity', {
        type: 'join',
        username: displayName,
        userId,
        message: `${displayName} joined`
      });
      emitActivity(io, roomId, 'join', displayName, `${displayName} joined`);
      emitRoomMembers(io, roomId);
    } catch (err) {
      console.error('Error on join_room:', err);
      socket.emit('error_message', 'Failed to join room properly.');
    }
  });

  socket.on('get-active-members', () => {
    const cr = socket.currentRoomId;
    emitRoomMembers(io, cr);
  });

  socket.on('leave_room', () => {
    const cr = socket.currentRoomId;
    if (cr && activeUsers[cr] && activeUsers[cr][socket.id]) {
      const user = activeUsers[cr][socket.id];
      socket.to(cr).emit('user_left', socket.id);
      socket.to(cr).emit('cursor-removed', { userId: user.userId, socketId: socket.id });
      socket.to(cr).emit('room-activity', {
        type: 'leave',
        username: user.name,
        userId: user.userId,
        message: `${user.name} left`
      });
      emitActivity(io, cr, 'leave', user.name, `${user.name} left`);
      delete activeUsers[cr][socket.id];
      if (Object.keys(activeUsers[cr]).length === 0) {
        delete activeUsers[cr];
      } else {
        emitRoomMembers(io, cr);
      }
      socket.leave(cr);
      socket.currentRoomId = null;
    }
  });

  socket.on('delete_room', async () => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    try {
      const room = await db.getRoomById(cr);
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
        const fileMessages = await db.getFileMessages(cr);
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

      await db.deleteRoom(cr);
      delete activeUsers[cr];
      io.to(cr).emit('room_deleted');
      io.emit('room_removed', { roomId: room.roomId || cr, id: cr });
    } catch (err) {
      console.error('Error on delete_room:', err);
      socket.emit('error_message', 'Failed to delete room.');
    }
  });

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

      const roomSockets = activeUsers[roomId];
      const targetUserData = roomSockets ? Object.values(roomSockets).find(u => u.userId === targetUserId) : null;
      const targetUsername = targetUserData?.name || targetUserId;
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

      io.to(roomId).emit('room-activity', {
        type: 'kick',
        username: targetUsername,
        userId: targetUserId,
        message: `${targetUsername} was kicked`
      });
      emitActivity(io, roomId, 'kick', targetUsername, `${targetUsername} was kicked`);
      emitRoomMembers(io, roomId);
      io.to(roomId).emit('cursor-removed', { userId: targetUserId });
    } catch (err) {
      console.error('Error on kick-user:', err);
    }
  });

  socket.on('disconnect', () => {
    delete socketUserMap[socket.id];

    const cr = socket.currentRoomId;
    if (cr && activeUsers[cr] && activeUsers[cr][socket.id]) {
      const user = activeUsers[cr][socket.id];
      socket.to(cr).emit('user_left', socket.id);
      io.to(cr).emit('cursor-removed', { userId: user.userId, socketId: socket.id });
      io.to(cr).emit('room-activity', {
        type: 'leave',
        username: user.name,
        userId: user.userId,
        message: `${user.name} left`
      });
      emitActivity(io, cr, 'leave', user.name, `${user.name} left`);

      delete activeUsers[cr][socket.id];

      if (Object.keys(activeUsers[cr]).length === 0) {
        delete activeUsers[cr];
      } else {
        emitRoomMembers(io, cr);
      }
    }
  });
}

module.exports = { registerRoomHandlers };
