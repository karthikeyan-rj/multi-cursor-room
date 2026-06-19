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

  console.log('✅ Indexes initialized successfully.');
}

// ── Room Operations ──────────────────────────────────────────────────────────

async function getRooms() {
  const docs = await db.collection('rooms').find().sort({ created_at: 1 }).toArray();
  return docs.map(mapDoc);
}

async function createRoom(id, name) {
  const now = new Date();
  await db.collection('rooms').updateOne(
    { _id: id },
    { $setOnInsert: { _id: id, id, name, created_at: now } },
    { upsert: true }
  );
  return { id, name, created_at: now };
}

// ── Drawing Operations ───────────────────────────────────────────────────────

async function getDrawings(roomId) {
  const docs = await db.collection('drawings')
    .find({ room_id: roomId })
    .sort({ created_at: 1 })
    .toArray();
  return docs.map(doc => ({ ...mapDoc(doc), id: doc._id.toString() }));
}

async function addDrawing(roomId, points, color, width) {
  const doc = { room_id: roomId, points, color, width, created_at: new Date() };
  const result = await db.collection('drawings').insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
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
  createRoom,
  getDrawings,
  addDrawing,
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
