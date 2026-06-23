const db = require('../db');
const { activeUsers } = require('./state');

function registerChatHandlers(io, socket) {
  socket.on('send_message', async ({ message, replyTo }) => {
    const cr = socket.currentRoomId;
    if (!cr || !activeUsers[cr] || !activeUsers[cr][socket.id]) return;

    try {
      const room = await db.getRoomById(cr);
      if (!room) return;
      const isOwner = String(room.ownerId) === String(socket.userData?.userId);
      const allowChat = room.allowChat !== undefined ? room.allowChat : true;
      if (!isOwner && !allowChat) {
        socket.emit('permission-denied', { action: 'chat', message: 'Chat is disabled by the room owner.' });
        return;
      }
    } catch (_) {
      return;
    }

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
