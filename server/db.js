const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

let client = null;
let db = null;

const mongoUri = process.env.MONGODB_URI;

// Map MongoDB doc → clean object (remove internal _id), add permission defaults for old rooms
function mapDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    allowChat: rest.allowChat !== undefined ? rest.allowChat : true,
    allowFiles: rest.allowFiles !== undefined ? rest.allowFiles : true,
    allowDrawing: rest.allowDrawing !== undefined ? rest.allowDrawing : true,
    allowStickyNotes: rest.allowStickyNotes !== undefined ? rest.allowStickyNotes : true
  };
}

async function initDb() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }

  client = new MongoClient(mongoUri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000
  });

  await client.connect();
  db = client.db();
  console.log('✅ Connected successfully to MongoDB Atlas!');

  // Indexes for efficient queries (_id is automatically unique)
  await db.collection('rooms').createIndex({ ownerId: 1 });
  await db.collection('rooms').createIndex({ 'participants.userId': 1 });
  await db.collection('rooms').createIndex({ 'kickedUsers.userId': 1 });
  await db.collection('rooms').createIndex({ 'joinRequests.userId': 1 });
  await db.collection('drawings').createIndex({ room_id: 1, created_at: 1 });
  await db.collection('drawings').createIndex({ room_id: 1, stroke_id: 1 });
  await db.collection('sticky_notes').createIndex({ room_id: 1 });
  await db.collection('chat_messages').createIndex({ room_id: 1, created_at: -1 });
  await db.collection('file_messages').createIndex({ room_id: 1 });

  // Backfill any rooms that are missing a roomId before creating unique index
  const roomsMissingId = await db.collection('rooms').find({ roomId: { $exists: false } }).toArray();
  for (const room of roomsMissingId) {
    let newRoomId;
    while (true) {
      newRoomId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await db.collection('rooms').findOne({ roomId: newRoomId });
      if (!existing) break;
    }
    await db.collection('rooms').updateOne({ _id: room._id }, { $set: { roomId: newRoomId } });
    console.log(`✅ Backfilled roomId ${newRoomId} for room: ${room._id}`);
  }

  // Sparse unique index: only enforces uniqueness when roomId field is present
  await db.collection('rooms').createIndex({ roomId: 1 }, { unique: true, sparse: true });

  // Ensure users collection has correct indexes for email auth
  const userIndexes = await db.collection('users').indexes();
  for (const idx of userIndexes) {
    // Drop any legacy unique index on username (old schema used _id as username)
    if (idx.key && idx.key.username === 1 && idx.unique) {
      await db.collection('users').dropIndex(idx.name);
      console.log(`✅ Dropped legacy unique index: ${idx.name}`);
    }
  }
  // Create unique index on email (idempotent — safe to call repeatedly)
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  } catch (idxErr) {
    console.warn('⚠️ Could not create unique email index on users collection.');
    console.warn('   This is expected if existing users lack an email field.');
    console.warn('   To fix, either update old users with email values or clear the collection.');
    console.warn('   Error:', idxErr.message);
  }

  // used_room_ids: permanently tracks every roomId ever assigned (even deleted rooms)
  await db.collection('used_room_ids').createIndex({ roomId: 1 }, { unique: true });

  // Backfill used_room_ids with all existing roomIds so deleted IDs aren't reused
  const allRooms = await db.collection('rooms').find({}, { projection: { roomId: 1 } }).toArray();
  for (const room of allRooms) {
    if (room.roomId) {
      try {
        await db.collection('used_room_ids').insertOne({ roomId: room.roomId, created_at: new Date() });
      } catch (_) { /* duplicate during backfill — ignore */ }
    }
  }

  console.log('✅ Indexes initialized successfully.');
}

// Validation: every collaborative record must belong to a room
function requireRoomId(roomId, label) {
  if (!roomId || (typeof roomId === 'string' && roomId.trim() === '')) {
    throw new Error(`${label || 'Data'} requires a valid room_id`);
  }
}

// ── Room Operations ──────────────────────────────────────────────────────────

async function getRooms(userId, email) {
  if (!userId && !email) {
    return [];
  }
  const docs = await db.collection('rooms').find({
    $or: [
      { ownerId: userId },
      { 'participants.userId': userId }
    ],
    $nor: [
      { 'kickedUsers.userId': userId }
    ]
  }).sort({ createdAt: 1, created_at: 1 }).toArray();

  for (const doc of docs) {
    if (!doc.roomId) {
      doc.roomId = await generateUniqueRoomId();
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { roomId: doc.roomId } });
    }
    if (!doc.id) {
      doc.id = doc._id;
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { id: doc._id } });
    }
  }

  return docs.map(doc => ({ ...mapDoc(doc), ownerId: doc.ownerId, participants: doc.participants }));
}

async function getRoomById(id) {
  const doc = await db.collection('rooms').findOne({
    $or: [
      { _id: id },
      { id: id }
    ]
  });
  if (doc) {
    if (!doc.roomId) {
      doc.roomId = await generateUniqueRoomId();
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { roomId: doc.roomId } });
    }
    if (!doc.id) {
      doc.id = doc._id;
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { id: doc._id } });
    }
  }
  return mapDoc(doc);
}

async function getRoomByName(name) {
  if (!name) return null;
  const id = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  const doc = await db.collection('rooms').findOne({
    $or: [
      { _id: id },
      { roomName: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }
    ]
  });
  if (doc && !doc.roomId) {
    doc.roomId = await generateUniqueRoomId();
    await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { roomId: doc.roomId } });
  }
  return mapDoc(doc);
}

async function generateUniqueRoomId() {
  while (true) {
    const roomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const existing = await db.collection('rooms').findOne({ roomId });
    const used = await db.collection('used_room_ids').findOne({ roomId });
    if (!existing && !used) {
      return roomId;
    }
  }
}

async function getRoomByRoomId(roomId) {
  if (!roomId) return null;
  const cleanId = String(roomId).trim();
  const doc = await db.collection('rooms').findOne({
    $or: [
      { roomId: cleanId },
      { roomId: Number(cleanId) },
      { publicRoomId: cleanId },
      { publicRoomId: Number(cleanId) },
      { _id: cleanId },
      { id: cleanId }
    ]
  });
  if (doc) {
    if (!doc.roomId) {
      doc.roomId = await generateUniqueRoomId();
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { roomId: doc.roomId } });
    }
    if (!doc.id) {
      doc.id = doc._id;
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { id: doc._id } });
    }
  }
  return mapDoc(doc);
}

async function createRoom(id, roomName, passwordHash, ownerId, ownerEmail, ownerName) {
  const now = new Date();
  const roomId = await generateUniqueRoomId();
  await db.collection('used_room_ids').insertOne({ roomId, created_at: now });
  const roomDoc = {
    _id: id,
    id,
    roomId,
    name: roomName,
    roomName,
    passwordHash,
    ownerId,
    ownerEmail,
    ownerName,
    boardColor: '#000000',
    allowChat: true,
    allowFiles: true,
    allowDrawing: true,
    allowStickyNotes: true,
    createdAt: now,
    created_at: now,
    participants: [
      { userId: ownerId, email: ownerEmail, username: ownerName, joinedAt: now }
    ]
  };
  await db.collection('rooms').insertOne(roomDoc);
  return { ...mapDoc(roomDoc), ownerId, participants: roomDoc.participants };
}

async function setBoardColor(roomId, color) {
  await db.collection('rooms').updateOne(
    { $or: [{ _id: roomId }, { id: roomId }] },
    { $set: { boardColor: color } }
  );
}

// Helper: resolve a display-safe username from various possible field names
function getSafeUsername(user) {
  return (
    user?.username ||
    user?.name ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'User'
  );
}

async function deleteRoom(id) {
  if (!id) return false;
  const cleanId = String(id).trim();
  // Find room by _id, id, roomId, or publicRoomId
  const room = await db.collection('rooms').findOne({
    $or: [
      { _id: cleanId },
      { id: cleanId },
      { roomId: cleanId },
      { roomId: Number(cleanId) },
      { publicRoomId: cleanId },
      { publicRoomId: Number(cleanId) }
    ]
  });
  if (!room) return false;
  const roomSlug = room.id || room._id || id;
  await db.collection('rooms').deleteOne({ _id: room._id });
  await db.collection('drawings').deleteMany({ room_id: roomSlug });
  await db.collection('sticky_notes').deleteMany({ room_id: roomSlug });
  await db.collection('chat_messages').deleteMany({ room_id: roomSlug });
  await db.collection('file_messages').deleteMany({ room_id: roomSlug });
  return true;
}

async function addRoomMember(roomId, userId, email, username) {
  const existing = await db.collection('rooms').findOne({
    _id: roomId,
    'participants.userId': userId
  });
  if (existing) return;

  // Resolve authoritative username from users collection if not provided
  let finalUsername = username;
  if (!finalUsername) {
    try {
      const userDoc = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { username: 1, name: 1, displayName: 1, email: 1 } }
      );
      finalUsername = getSafeUsername(userDoc);
    } catch (_) {
      finalUsername = email ? email.split('@')[0] : 'User';
    }
  }

  await db.collection('rooms').updateOne(
    { _id: roomId },
    { $push: { participants: { userId, email, username: finalUsername, joinedAt: new Date() } } }
  );
}

// ── Drawing Operations ───────────────────────────────────────────────────────

async function getDrawings(roomId) {
  const docs = await db.collection('drawings')
    .find({ room_id: roomId })
    .sort({ created_at: 1 })
    .toArray();
  return docs.map(doc => ({ ...mapDoc(doc), id: doc._id.toString() }));
}

async function addDrawing(roomId, fields) {
  requireRoomId(roomId, 'Drawing');
  const doc = {
    room_id: roomId,
    type: fields.type || 'pen',
    points: fields.points || [],
    x: fields.x, y: fields.y, w: fields.w, h: fields.h,
    text: fields.text,
    color: fields.color,
    size: fields.size,
    eraser: fields.eraser || false,
    stroke_id: fields.stroke_id || null,
    created_at: new Date()
  };
  const result = await db.collection('drawings').insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

async function deleteDrawingByStrokeId(roomId, strokeId) {
  await db.collection('drawings').deleteOne({ room_id: roomId, stroke_id: strokeId });
}

async function clearDrawings(roomId) {
  await db.collection('drawings').deleteMany({ room_id: roomId });
  return true;
}

async function replaceAllDrawings(roomId, drawings) {
  await db.collection('drawings').deleteMany({ room_id: roomId });
  if (drawings && drawings.length > 0) {
    const docs = drawings.map(d => ({
      ...d,
      room_id: roomId,
      stroke_id: d.id || d.stroke_id,
      created_at: d.created_at || new Date().toISOString()
    }));
    await db.collection('drawings').insertMany(docs);
  }
  return true;
}

async function clearStickyNotes(roomId) {
  await db.collection('sticky_notes').deleteMany({ room_id: roomId });
  return true;
}

// ── Sticky Note Operations ───────────────────────────────────────────────────

async function getStickyNotes(roomId) {
  const docs = await db.collection('sticky_notes')
    .find({ room_id: roomId })
    .sort({ created_at: 1 })
    .toArray();
  return docs.map(doc => ({ ...mapDoc(doc), id: doc._id.toString() }));
}

async function saveStickyNote(id, roomId, x, y, text, color, creatorName) {
  requireRoomId(roomId, 'StickyNote');
  const now = new Date();
  await db.collection('sticky_notes').updateOne(
    { _id: id },
    { $set: { room_id: roomId, x, y, text: text || '', color, creator_name: creatorName }, $setOnInsert: { created_at: now } },
    { upsert: true }
  );
  return { id, room_id: roomId, x, y, text: text || '', color, creator_name: creatorName, created_at: now };
}

async function updateStickyNotePosition(id, x, y) {
  const result = await db.collection('sticky_notes').findOneAndUpdate(
    { _id: id },
    { $set: { x, y } },
    { returnDocument: 'after' }
  );
  const doc = result?.value || result;
  return mapDoc(doc);
}

async function updateStickyNoteText(id, text, color) {
  const result = await db.collection('sticky_notes').findOneAndUpdate(
    { _id: id },
    { $set: { text, color } },
    { returnDocument: 'after' }
  );
  const doc = result?.value || result;
  return mapDoc(doc);
}

async function deleteStickyNote(id) {
  await db.collection('sticky_notes').deleteOne({ _id: id });
  return true;
}

// ── Chat Operations ──────────────────────────────────────────────────────────

async function getChatMessages(roomId, limit = 50) {
  const docs = await db.collection('chat_messages')
    .find({ room_id: roomId })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return docs.reverse().map(doc => ({ ...mapDoc(doc), id: doc._id.toString() }));
}

async function saveChatMessage(roomId, senderName, senderColor, message, senderId, replyTo) {
  requireRoomId(roomId, 'ChatMessage');
  const doc = { room_id: roomId, sender_name: senderName, sender_color: senderColor, message, created_at: new Date() };
  if (senderId) doc.sender_id = senderId;
  if (replyTo) doc.reply_to = replyTo;
  const result = await db.collection('chat_messages').insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

// ── File Message Operations ────────────────────────────────────────────────

async function getFileMessages(roomId) {
  const docs = await db.collection('file_messages')
    .find({ room_id: roomId })
    .sort({ created_at: 1 })
    .toArray();
  return docs.map(doc => ({ ...doc, id: doc._id.toString() }));
}

async function saveFileMessage(roomId, senderName, fileName, originalName, mimeType, size, url, cloudinaryPublicId, senderId) {
  requireRoomId(roomId, 'FileMessage');
  const doc = {
    room_id: roomId, sender_name: senderName, type: 'file',
    file_name: fileName, original_name: originalName,
    mime_type: mimeType, size, url,
    fileUrl: url, fileName: originalName, fileType: mimeType, fileSize: size,
    cloudinary_public_id: cloudinaryPublicId,
    created_at: new Date()
  };
  if (senderId) doc.sender_id = senderId;
  const result = await db.collection('file_messages').insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

async function deleteFileMessagesByRoom(roomId) {
  const docs = await db.collection('file_messages').find({ room_id: roomId }).toArray();
  await db.collection('file_messages').deleteMany({ room_id: roomId });
  return docs;
}

// ── User Operations ──────────────────────────────────────────────────────────

async function getUserByEmail(email) {
  const normalized = email.toLowerCase().trim();
  const doc = await db.collection('users').findOne({ email: normalized });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

async function getUserByUsername(username) {
  const normalized = username.toLowerCase();
  const doc = await db.collection('users').findOne({
    $or: [
      { _id: normalized },
      { username: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    ]
  });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

async function createUser(username, email, passwordHash, color) {
  const now = new Date();
  const user = {
    username,
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    color,
    created_at: now,
    updated_at: now
  };
  const result = await db.collection('users').insertOne(user);
  return { ...mapDoc(user), id: result.insertedId.toString() };
}

async function updateUserColorByEmail(email, color) {
  const normalized = email.toLowerCase().trim();
  const result = await db.collection('users').findOneAndUpdate(
    { email: normalized },
    { $set: { color, updated_at: new Date() } },
    { returnDocument: 'after' }
  );
  const doc = result?.value || result;
  if (!doc) return null;
  return { ...mapDoc(doc), id: doc._id.toString() };
}

async function updateUserPassword(userId, newPasswordHash) {
  const result = await db.collection('users').findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { password_hash: newPasswordHash, updated_at: new Date() } },
    { returnDocument: 'after' }
  );
  const doc = result?.value || result;
  if (!doc) return null;
  return { ...mapDoc(doc), id: doc._id.toString() };
}

async function updateUserProfile(userId, updates) {
  const allowed = {};
  if (updates.username) allowed.username = updates.username;
  if (updates.color) allowed.color = updates.color;
  if (Object.keys(allowed).length === 0) return null;
  allowed.updated_at = new Date();
  const result = await db.collection('users').findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: allowed },
    { returnDocument: 'after' }
  );
  const doc = result?.value || result;
  if (!doc) return null;
  return { ...mapDoc(doc), id: doc._id.toString() };
}

// ── Kick / Blocked / Join Request Operations ──────────────────────────────────

async function kickUserFromRoom(roomId, targetUserId) {
  await db.collection('rooms').updateOne(
    { _id: roomId },
    { $pull: { participants: { userId: targetUserId } } }
  );
  const now = new Date();
  await db.collection('rooms').updateOne(
    { _id: roomId },
    {
      $push: {
        kickedUsers: {
          userId: targetUserId,
          kickedAt: now
        }
      }
    }
  );
}

async function isUserKicked(roomId, userId) {
  const room = await db.collection('rooms').findOne(
    { _id: roomId, 'kickedUsers.userId': userId },
    { projection: { 'kickedUsers.$': 1 } }
  );
  return !!room;
}

async function addJoinRequest(roomId, userId, email, username) {
  const existing = await db.collection('rooms').findOne(
    { _id: roomId, 'joinRequests.userId': userId }
  );
  if (existing) return false;

  let finalUsername = username;
  if (!finalUsername) {
    try {
      const userDoc = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { username: 1, name: 1, displayName: 1, email: 1 } }
      );
      finalUsername = getSafeUsername(userDoc);
    } catch (_) {
      finalUsername = email ? email.split('@')[0] : 'User';
    }
  }

  await db.collection('rooms').updateOne(
    { _id: roomId },
    {
      $push: {
        joinRequests: {
          userId,
          email,
          username: finalUsername,
          requestedAt: new Date(),
          status: 'pending'
        }
      }
    }
  );
  return true;
}

async function approveJoinRequest(roomId, userId, requesterUserId) {
  const room = await db.collection('rooms').findOne(
    { _id: roomId, 'joinRequests.userId': requesterUserId },
    { projection: { 'joinRequests.$': 1 } }
  );
  const reqData = room?.joinRequests?.[0] || {};
  const requesterEmail = reqData.email || '';
  let requesterUsername = reqData.username;

  // Always fetch authoritative username from users collection
  if (!requesterUsername) {
    try {
      const userDoc = await db.collection('users').findOne(
        { _id: new ObjectId(requesterUserId) },
        { projection: { username: 1, name: 1, displayName: 1, email: 1 } }
      );
      requesterUsername = getSafeUsername(userDoc);
    } catch (_) {
      requesterUsername = getSafeUsername(reqData);
    }
  }

  const result = await db.collection('rooms').updateOne(
    { _id: roomId },
    {
      $pull: { kickedUsers: { userId: requesterUserId }, joinRequests: { userId: requesterUserId } },
      $push: { participants: { userId: requesterUserId, email: requesterEmail, username: requesterUsername, joinedAt: new Date() } }
    }
  );
  return result.modifiedCount > 0;
}

async function rejectJoinRequest(roomId, userId, requesterUserId) {
  const result = await db.collection('rooms').updateOne(
    { _id: roomId, 'joinRequests.userId': requesterUserId },
    { $set: { 'joinRequests.$.status': 'rejected' } }
  );
  return result.modifiedCount > 0;
}

async function getJoinRequests(roomId) {
  const room = await db.collection('rooms').findOne(
    { _id: roomId },
    { projection: { joinRequests: 1 } }
  );
  return room?.joinRequests || [];
}

async function getRoomMembers(roomId) {
  const room = await db.collection('rooms').findOne(
    { _id: roomId },
    { projection: { participants: 1, ownerId: 1, ownerName: 1, ownerEmail: 1 } }
  );
  return room || { participants: [], ownerId: null, ownerName: null };
}

async function addActivity(roomId, type, username, message) {
  if (!roomId || !type || !username) return;
  const activity = {
    type,
    username,
    message: message || `${username} ${type}`,
    createdAt: new Date()
  };
  try {
    await db.collection('rooms').updateOne(
      { _id: roomId },
      {
        $push: {
          activities: {
            $each: [activity],
            $sort: { createdAt: -1 },
            $slice: 50
          }
        }
      }
    );
  } catch (err) {
    console.error('Failed to add activity:', err.message);
  }
}

async function getActivities(roomId, limit = 50) {
  try {
    const room = await db.collection('rooms').findOne(
      { _id: roomId },
      { projection: { activities: { $slice: limit } } }
    );
    return (room?.activities || []).reverse();
  } catch (err) {
    console.error('Failed to get activities:', err.message);
    return [];
  }
}

async function updateRoomSettings(roomId, updateFields) {
  await db.collection('rooms').updateOne(
    { _id: roomId },
    { $set: updateFields }
  );
  return true;
}

async function getRoomSettings(roomId) {
  const room = await db.collection('rooms').findOne(
    { _id: roomId },
    { projection: { name: 1, roomName: 1, roomId: 1, ownerId: 1, allowChat: 1, allowFiles: 1, allowDrawing: 1, allowStickyNotes: 1 } }
  );
  if (!room) return null;
  return {
    name: room.name || room.roomName,
    roomId: room.roomId,
    ownerId: room.ownerId,
    allowChat: room.allowChat !== undefined ? room.allowChat : true,
    allowFiles: room.allowFiles !== undefined ? room.allowFiles : true,
    allowDrawing: room.allowDrawing !== undefined ? room.allowDrawing : true,
    allowStickyNotes: room.allowStickyNotes !== undefined ? room.allowStickyNotes : true
  };
}

module.exports = {
  initDb,
  getRooms,
  getRoomById,
  getRoomByName,
  getRoomByRoomId,
  createRoom,
  deleteRoom,
  addRoomMember,
  getDrawings,
  addDrawing,
  deleteDrawingByStrokeId,
  clearDrawings,
  replaceAllDrawings,
  clearStickyNotes,
  getStickyNotes,
  saveStickyNote,
  updateStickyNotePosition,
  updateStickyNoteText,
  deleteStickyNote,
  getChatMessages,
  saveChatMessage,
  getFileMessages,
  saveFileMessage,
  deleteFileMessagesByRoom,
  setBoardColor,
  getUserByEmail,
  getUserByUsername,
  createUser,
  updateUserColorByEmail,
  kickUserFromRoom,
  isUserKicked,
  addJoinRequest,
  approveJoinRequest,
  rejectJoinRequest,
  getJoinRequests,
  getRoomMembers,
  updateUserPassword,
  updateUserProfile,
  addActivity,
  getActivities,
  updateRoomSettings,
  getRoomSettings
};
