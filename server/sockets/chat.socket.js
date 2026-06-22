const db = require('../db');
const { activeUsers } = require('./state');

function registerChatHandlers(io, socket) {
  socket.on('send_message', async ({ message, replyTo }) => {
    const cr = socket.currentRoomId;
    if (!cr || !activeUsers[cr] || !activeUsers[cr][socket.id]) return;

    const user = activeUsers[cr][socket.id];
    try {
      const savedMsg = await db.saveChatMessage(cr, user.name, user.color, message, user.userId, replyTo);
      io.to(cr).emit('message_received', savedMsg);
    } catch (err) {
      console.error('Failed to save message:', err.message);
    }
  });
}

module.exports = { registerChatHandlers };
