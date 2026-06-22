const db = require('../db');

function emitActivity(io, roomId, type, username, message) {
  io.to(roomId).emit('room:activity-event', { type, username, message, createdAt: new Date() });
  db.addActivity(roomId, type, username, message).catch(err => console.error('emitActivity error:', err));
}

module.exports = { emitActivity };
