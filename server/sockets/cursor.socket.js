const { activeUsers } = require('./state');

function registerCursorHandlers(io, socket) {
  socket.on('cursor_move', ({ x, y }) => {
    const cr = socket.currentRoomId;
    if (!cr || !activeUsers[cr] || !activeUsers[cr][socket.id]) return;

    activeUsers[cr][socket.id].x = x;
    activeUsers[cr][socket.id].y = y;

    socket.to(cr).emit('cursor_moved', {
      id: socket.id,
      x,
      y
    });
  });

  socket.on('reaction', ({ emoji, x, y }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    io.to(cr).emit('reaction_received', {
      id: socket.id,
      emoji,
      x,
      y
    });
  });
}

module.exports = { registerCursorHandlers };
