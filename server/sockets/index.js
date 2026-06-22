const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('./auth.socket');
const { registerRoomHandlers } = require('./room.socket');
const { registerChatHandlers } = require('./chat.socket');
const { registerCursorHandlers } = require('./cursor.socket');
const { registerCanvasHandlers } = require('./canvas.socket');

function initSockets(server, app, corsOptions) {
  const io = new Server(server, {
    cors: corsOptions
  });

  app.set('io', io);

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    socket.currentRoomId = null;

    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCursorHandlers(io, socket);
    registerCanvasHandlers(io, socket);
  });

  return io;
}

module.exports = { initSockets };
