const { activeUsers } = require('./state');

function registerCursorHandlers(io, socket) {
  socket.on('cursor_move', ({ x, y }) => {
    const cr = socket.currentRoomId;
    if (!cr || !activeUsers[cr] || !activeUsers[cr][socket.id]) return;

    const user = activeUsers[cr][socket.id];
    user.x = x;
    user.y = y;

    socket.to(cr).emit('cursor_moved', {
      id: socket.id,
      userId: user.userId,
      username: user.name,
      color: user.color,
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
