const { MongoClient } = require('mongodb');
require('dotenv').config();

let client = null;
let db = null;

const mongoUri = process.env.MONGODB_URI;

// Map MongoDB doc → clean object (remove internal _id)
function mapDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
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
  await db.collection('drawings').createIndex({ room_id: 1, created_at: 1 });
  await db.collection('sticky_notes').createIndex({ room_id: 1 });
  await db.collection('chat_messages').createIndex({ room_id: 1, created_at: -1 });

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

async function getRooms(username) {
  if (!username) {
    return [];
  }
  const docs = await db.collection('rooms').find({
    $or: [
      { createdBy: username },
      { members: username.toLowerCase() }
    ]
  }).sort({ createdAt: 1, created_at: 1 }).toArray();

  for (const doc of docs) {
    if (!doc.roomId) {
      doc.roomId = await generateUniqueRoomId();
      await db.collection('rooms').updateOne({ _id: doc._id }, { $set: { roomId: doc.roomId } });
    }
  }

  return docs.map(mapDoc);
}

async function getRoomById(id) {
  const doc = await db.collection('rooms').findOne({ _id: id });
  if (doc && !doc.roomId) {
    doc.roomId = await generateUniqueRoomId();
    await db.collection('rooms').updateOne({ _id: id }, { $set: { roomId: doc.roomId } });
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
  const doc = await db.collection('rooms').findOne({ roomId });
  return mapDoc(doc);
}

async function createRoom(id, roomName, passwordHash, createdBy) {
  const now = new Date();
  const roomId = await generateUniqueRoomId();
  // Permanently record this roomId so it is never reused
  await db.collection('used_room_ids').insertOne({ roomId, created_at: now });
  const roomDoc = {
    _id: id,
    id,
    roomId,
    name: roomName,
    roomName,
    passwordHash,
    createdBy,
    createdAt: now,
    created_at: now,
    members: [createdBy.toLowerCase()]
  };
  await db.collection('rooms').insertOne(roomDoc);
  return mapDoc(roomDoc);
}

async function deleteRoom(id) {
  await db.collection('rooms').deleteOne({ _id: id });
  await db.collection('drawings').deleteMany({ room_id: id });
  await db.collection('sticky_notes').deleteMany({ room_id: id });
  await db.collection('chat_messages').deleteMany({ room_id: id });
  return true;
}

async function addRoomMember(roomId, username) {
  await db.collection('rooms').updateOne(
    { _id: roomId },
    { $addToSet: { members: username.toLowerCase() } }
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

async function addDrawing(roomId, points, color, width, eraser, strokeId) {
  requireRoomId(roomId, 'Drawing');
  const doc = { room_id: roomId, points, color, width, eraser: eraser || false, stroke_id: strokeId || null, created_at: new Date() };
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

// ── Sticky Note Operations ───────────────────────────────────────────────────

async function getStickyNotes(roomId) {
  const docs = await db.collection('sticky_notes')
    .find({ room_id: roomId })
    .sort({ created_at: 1 })
    .toArray();
  return docs.map(mapDoc);
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
  const doc = await db.collection('sticky_notes').findOneAndUpdate(
    { _id: id },
    { $set: { x, y } },
    { returnDocument: 'after' }
  );
  return mapDoc(doc);
}

async function updateStickyNoteText(id, text, color) {
  const doc = await db.collection('sticky_notes').findOneAndUpdate(
    { _id: id },
    { $set: { text, color } },
    { returnDocument: 'after' }
  );
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

async function saveChatMessage(roomId, senderName, senderColor, message) {
  requireRoomId(roomId, 'ChatMessage');
  const doc = { room_id: roomId, sender_name: senderName, sender_color: senderColor, message, created_at: new Date() };
  const result = await db.collection('chat_messages').insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

// ── User Operations ──────────────────────────────────────────────────────────

async function getUser(username) {
  const doc = await db.collection('users').findOne({ _id: username.toLowerCase() });
  return mapDoc(doc);
}

async function createUser(username, passwordHash, color) {
  const user = {
    _id: username.toLowerCase(),
    username,
    password_hash: passwordHash,
    color,
    created_at: new Date()
  };
  await db.collection('users').insertOne(user);
  return mapDoc(user);
}

async function updateUserColor(username, color) {
  const doc = await db.collection('users').findOneAndUpdate(
    { _id: username.toLowerCase() },
    { $set: { color } },
    { returnDocument: 'after' }
  );
  return mapDoc(doc);
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
  getStickyNotes,
  saveStickyNote,
  updateStickyNotePosition,
  updateStickyNoteText,
  deleteStickyNote,
  getChatMessages,
  saveChatMessage,
  getUser,
  createUser,
  updateUserColor
};
