const bcrypt = require('bcrypt');
const db = require('../db');
const cloudinary = require('../config/cloudinary');
const { emitActivity } = require('../sockets/activity');
const { activeUsers, socketUserMap, emitRoomMembers } = require('../sockets/state');

async function getRooms(req, res) {
  const rooms = await db.getRooms(req.user.userId, req.user.email);

  const io = req.app.get('io');
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

  res.json({ success: true, rooms: roomsWithCounts });
}

async function getRoom(req, res) {
  const { roomId } = req.params;
  if (!roomId) {
    return res.status(400).json({ success: false, error: 'Room ID is required.' });
  }
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }

  const currentUserId = String(req.user.userId);
  const ownerId = String(room.ownerId);
  const isOwner = ownerId === currentUserId;

  if (isOwner) {
    // Owner always has access
  } else {
    const isParticipant = room.participants && room.participants.some(p => String(p.userId) === currentUserId);
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied. You do not have access to this room.' });
    }

    const kicked = await db.isUserKicked(room.id, req.user.userId);
    if (kicked) {
      return res.status(403).json({ success: false, error: 'Access denied. You were removed from this room by the owner.' });
    }
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

  res.json({ success: true, room: safeRoom });
}

async function createRoom(req, res) {
  const { name, password } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Room name is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }

  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!baseSlug) {
    return res.status(400).json({ success: false, error: 'Invalid room name' });
  }

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
}

async function joinRoom(req, res) {
  const { roomId, password } = req.body;
  if (!roomId) {
    return res.status(400).json({ success: false, error: 'Room ID is required' });
  }
  if (!password) {
    return res.status(400).json({ success: false, error: 'Room password is required' });
  }

  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }

  if (room.passwordHash) {
    const match = await bcrypt.compare(password, room.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Incorrect room password.' });
    }
  }

  const isKicked = await db.isUserKicked(room.id, req.user.userId);
  if (isKicked) {
    await db.addJoinRequest(room.id, req.user.userId, req.user.email, req.user.username);
    const io = req.app.get('io');
    emitActivity(io, room.id, 'join_request', req.user.username, `${req.user.username} requested to join`);
    emitRoomMembers(io, room.id);
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
}

async function kickUser(req, res) {
  const { roomId } = req.params;
  const { userId: targetUserId } = req.body;
  if (!roomId || !targetUserId) {
    return res.status(400).json({ success: false, error: 'Room ID and target userId are required.' });
  }
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }
  if (String(room.ownerId) !== String(req.user.userId)) {
    return res.status(403).json({ success: false, error: 'Only the room owner can kick users.' });
  }
  if (String(targetUserId) === String(req.user.userId)) {
    return res.status(400).json({ success: false, error: 'You cannot kick yourself.' });
  }
  await db.kickUserFromRoom(room.id, targetUserId);

  const io = req.app.get('io');

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

  emitRoomMembers(io, room.id);
  io.to(room.id).emit('cursor-removed', { userId: targetUserId });

  res.json({ success: true, message: 'User removed from room.' });
}

async function approveJoinRequest(req, res) {
  const { roomId, userId: requesterUserId } = req.params;
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }
  if (String(room.ownerId) !== String(req.user.userId)) {
    return res.status(403).json({ success: false, error: 'Only the room owner can approve requests.' });
  }
  await db.approveJoinRequest(room.id, req.user.userId, requesterUserId);

  const io = req.app.get('io');
  for (const [sid, userData] of Object.entries(socketUserMap)) {
    if (userData && userData.userId === requesterUserId) {
      io.to(sid).emit('join-request-approved', {
        roomId: room.roomId,
        roomInternalId: room.id,
        message: 'Owner accepted your request. Joining room...'
      });
    }
  }

  emitRoomMembers(io, room.id);

  res.json({ success: true, message: 'User approved and can now join the room.' });
}

async function rejectJoinRequest(req, res) {
  const { roomId, userId: requesterUserId } = req.params;
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }
  if (String(room.ownerId) !== String(req.user.userId)) {
    return res.status(403).json({ success: false, error: 'Only the room owner can reject requests.' });
  }
  await db.rejectJoinRequest(room.id, req.user.userId, requesterUserId);

  const io = req.app.get('io');
  for (const [sid, userData] of Object.entries(socketUserMap)) {
    if (userData && userData.userId === requesterUserId) {
      io.to(sid).emit('join-request-rejected', {
        roomId: room.roomId,
        message: 'Owner rejected your request.'
      });
    }
  }

  emitRoomMembers(io, room.id);

  res.json({ success: true, message: 'Request rejected.' });
}

async function getMembers(req, res) {
  const { roomId } = req.params;
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }
  const currentUserId = String(req.user.userId);
  const ownerId = String(room.ownerId);
  const isOwner = ownerId === currentUserId;
  const isMember = isOwner ||
    (room.participants && room.participants.some(p => String(p.userId) === currentUserId));
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
    joinRequests: isOwner ? joinRequests : []
  });
}

async function deleteRoom(req, res) {
  const roomId = String(req.params.roomId).trim();

  const room = await db.getRoomByRoomId(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }

  if (String(room.ownerId) !== String(req.user.userId)) {
    return res.status(403).json({ success: false, error: 'Only the room owner can delete this room.' });
  }

  const internalId = room.id;

  if (cloudinary.isConfigured) {
    try {
      const fileMessages = await db.getFileMessages(internalId);
      for (const msg of fileMessages) {
        if (msg.cloudinary_public_id) {
          try {
            await cloudinary.uploader.destroy(msg.cloudinary_public_id);
          } catch (e) {
            console.error('Cloudinary delete error:', e.message);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching file messages for cloudinary cleanup:', e.message);
    }
  }

  await db.deleteRoom(internalId);

  const io = req.app.get('io');
  delete activeUsers[internalId];
  io.to(internalId).emit('room_deleted');
  io.emit('room_removed', { roomId: room.roomId, id: internalId });

  res.json({ success: true, message: 'Room deleted successfully.' });
}

async function getActivities(req, res) {
  const { roomId } = req.params;
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found.' });

  const currentUserId = String(req.user.userId);
  const isMember = String(room.ownerId) === currentUserId ||
    (room.participants && room.participants.some(p => String(p.userId) === currentUserId));
  if (!isMember) return res.status(403).json({ success: false, error: 'Access denied.' });

  const activities = await db.getActivities(room.id);
  res.json({ success: true, activities });
}

async function updateSettings(req, res) {
  const { roomId } = req.params;
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found.' });

  if (String(room.ownerId) !== String(req.user.userId)) {
    return res.status(403).json({ success: false, error: 'Only the room owner can change settings.' });
  }

  const updates = {};
  const { name, password, allowChat, allowFiles, allowDrawing, allowStickyNotes } = req.body;

  if (name && name.trim()) {
    updates.name = name.trim();
    updates.roomName = name.trim();
  }

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  if (allowChat !== undefined) updates.allowChat = Boolean(allowChat);
  if (allowFiles !== undefined) updates.allowFiles = Boolean(allowFiles);
  if (allowDrawing !== undefined) updates.allowDrawing = Boolean(allowDrawing);
  if (allowStickyNotes !== undefined) updates.allowStickyNotes = Boolean(allowStickyNotes);

  await db.updateRoomSettings(room.id, updates);

  const io = req.app.get('io');
  emitActivity(io, room.id, 'settings', req.user.username, `${req.user.username} updated room settings`);

  emitRoomMembers(io, room.id);

  res.json({ success: true, message: 'Room settings updated.' });
}

async function getSettings(req, res) {
  const { roomId } = req.params;
  const room = await db.getRoomByRoomId(roomId.trim());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found.' });

  const currentUserId = String(req.user.userId);
  const ownerId = String(room.ownerId);
  const isOwner = ownerId === currentUserId;
  const isMember = isOwner ||
    (room.participants && room.participants.some(p => String(p.userId) === currentUserId));
  if (!isMember) return res.status(403).json({ success: false, error: 'Access denied.' });

  const settings = await db.getRoomSettings(room.id);
  if (!settings) return res.status(404).json({ success: false, error: 'Settings not found.' });

  res.json({ success: true, settings: { ...settings, isOwner } });
}

module.exports = {
  getRooms, getRoom, createRoom, joinRoom, kickUser,
  approveJoinRequest, rejectJoinRequest, getMembers,
  deleteRoom, getActivities, updateSettings, getSettings
};
