const db = require('../db');
const { emitActivity } = require('./activity');
const { activeUsers, presentationState } = require('./state');

function registerCanvasHandlers(io, socket) {
  async function checkDrawingPermission(cr, socket) {
    const room = await db.getRoomById(cr);
    if (!room) return false;
    const isOwner = room && String(room.ownerId) === String(socket.userData?.userId);
    const allowDrawing = room ? (room.allowDrawing !== undefined ? room.allowDrawing : true) : true;
    if (!isOwner && !allowDrawing) return false;
    return true;
  }

  socket.on('draw_stroke', async ({ id, points, color, width, eraser }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    const permitted = await checkDrawingPermission(cr, socket);
    if (!permitted) {
      socket.emit('permission-denied', { action: 'draw', message: 'Drawing is disabled by the room owner.' });
      return;
    }

    socket.to(cr).emit('stroke_drawn', {
      id, points, color, width, eraser: eraser || false
    });

    try {
      await db.addDrawing(cr, { type: 'pen', points, color, size: width, eraser, stroke_id: id });
    } catch (err) {
      console.error('Failed to save drawing:', err.message);
    }
  });

  socket.on('canvas:shape', async (shape) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    const permitted = await checkDrawingPermission(cr, socket);
    if (!permitted) {
      socket.emit('permission-denied', { action: 'draw', message: 'Drawing is disabled by the room owner.' });
      return;
    }
    socket.to(cr).emit('canvas:shape', shape);
    try {
      await db.addDrawing(cr, { ...shape, stroke_id: shape.id });
    } catch (err) {
      console.error('Failed to save shape:', err.message);
    }
  });

  socket.on('canvas:text', async (textData) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    const permitted = await checkDrawingPermission(cr, socket);
    if (!permitted) {
      socket.emit('permission-denied', { action: 'draw', message: 'Drawing is disabled by the room owner.' });
      return;
    }
    socket.to(cr).emit('canvas:text', textData);
    try {
      await db.addDrawing(cr, { ...textData, stroke_id: textData.id });
    } catch (err) {
      console.error('Failed to save text:', err.message);
    }
  });

  socket.on('undo_last_stroke', async ({ strokeId }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    const permitted = await checkDrawingPermission(cr, socket);
    if (!permitted) {
      socket.emit('permission-denied', { action: 'undo', message: 'Drawing is disabled by the room owner.' });
      return;
    }
    try {
      await db.deleteDrawingByStrokeId(cr, strokeId);
      io.to(cr).emit('stroke_undone', { strokeId });
    } catch (err) {
      console.error('Failed to undo stroke:', err.message);
    }
  });

  socket.on('canvas:undo', async ({ strokeId }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    try {
      const room = await db.getRoomById(cr);
      const isOwner = room && String(room.ownerId) === String(socket.userData?.userId);
      const allowDrawing = room ? (room.allowDrawing !== undefined ? room.allowDrawing : true) : true;
      if (!isOwner && !allowDrawing) {
        socket.emit('permission-denied', { action: 'undo', message: 'Drawing is disabled by the room owner.' });
        return;
      }
      await db.deleteDrawingByStrokeId(cr, strokeId);
      io.to(cr).emit('canvas:undo', { strokeId });
    } catch (err) {
      console.error('Failed to undo canvas action:', err.message);
    }
  });

  socket.on('canvas:undo-full', async ({ roomId, drawings }) => {
    const cr = socket.currentRoomId;
    if (!cr || cr !== roomId) return;
    try {
      const room = await db.getRoomById(cr);
      const isOwner = room && String(room.ownerId) === String(socket.userData?.userId);
      const allowDrawing = room ? (room.allowDrawing !== undefined ? room.allowDrawing : true) : true;
      if (!isOwner && !allowDrawing) {
        socket.emit('permission-denied', { action: 'undo', message: 'Drawing is disabled by the room owner.' });
        return;
      }
      await db.replaceAllDrawings(cr, drawings);
      io.to(cr).emit('canvas:restored', { drawings });
    } catch (err) {
      console.error('Failed to undo full canvas:', err.message);
    }
  });

  socket.on('clear_canvas', async () => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    const permitted = await checkDrawingPermission(cr, socket);
    if (!permitted) {
      socket.emit('permission-denied', { action: 'clear', message: 'Drawing is disabled by the room owner.' });
      return;
    }
    const user = activeUsers[cr]?.[socket.id];

    try {
      await db.clearDrawings(cr);
      io.to(cr).emit('canvas_cleared');
      if (user) emitActivity(io, cr, 'canvas', user.name, `${user.name} cleared the canvas`);
    } catch (err) {
      console.error('Failed to clear canvas:', err.message);
    }
  });

  socket.on('board:clear-all', async () => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    const permitted = await checkDrawingPermission(cr, socket);
    if (!permitted) {
      socket.emit('permission-denied', { action: 'clear', message: 'Drawing is disabled by the room owner.' });
      return;
    }
    const user = activeUsers[cr]?.[socket.id];

    try {
      await db.clearDrawings(cr);
      await db.clearStickyNotes(cr);
      io.to(cr).emit('board:all-cleared');
      if (user) emitActivity(io, cr, 'canvas', user.name, `${user.name} cleared the board`);
    } catch (err) {
      console.error('Failed to clear board:', err.message);
    }
  });

  socket.on('add_sticky', async ({ id, x, y, text, color }) => {
    const cr = socket.currentRoomId;
    if (!cr || !activeUsers[cr] || !activeUsers[cr][socket.id]) return;

    const user = activeUsers[cr][socket.id];
    try {
      const room = await db.getRoomById(cr);
      if (!room) return;
      const isOwner = String(room.ownerId) === String(socket.userData?.userId);
      const allowSticky = room.allowStickyNotes !== undefined ? room.allowStickyNotes : true;
      if (!isOwner && !allowSticky) {
        socket.emit('permission-denied', { action: 'sticky', message: 'Sticky notes are disabled by the room owner.' });
        return;
      }
      const note = await db.saveStickyNote(id, cr, x, y, text || '', color, user.name);
      io.to(cr).emit('sticky_added', note);
      emitActivity(io, cr, 'sticky', user.name, `${user.name} added a sticky note`);
    } catch (err) {
      console.error('Failed to create sticky note:', err.message);
    }
  });

  socket.on('move_sticky', async ({ id, x, y }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;

    socket.to(cr).emit('sticky_moved', { id, x, y });

    try {
      await db.updateStickyNotePosition(id, x, y);
    } catch (err) {
      console.error('Failed to update sticky note position:', err.message);
    }
  });

  socket.on('update_sticky', async ({ id, text, color }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;

    socket.to(cr).emit('sticky_updated', { id, text, color });

    try {
      await db.updateStickyNoteText(id, text, color);
    } catch (err) {
      console.error('Failed to update sticky note content:', err.message);
    }
  });

  socket.on('board_color_change', async ({ color }) => {
    const cr = socket.currentRoomId;
    if (!cr) return;
    if (color !== null && !/^#[0-9A-Fa-f]{6}$/.test(color)) return;

    const room = await db.getRoomById(cr);
    if (!room) return;
    const isOwner = String(room.ownerId) === String(socket.userData?.userId);
    const drawingAllowed = room.allowDrawing !== undefined ? room.allowDrawing : true;

    if (!isOwner && !drawingAllowed) return;

    const ps = presentationState[cr];
    const isPresenter = ps?.active && String(ps.presenterUserId) === String(socket.userData?.userId);
    if (!isOwner && ps?.active && !isPresenter) return;

    const user = activeUsers[cr]?.[socket.id];
    io.to(cr).emit('board_color_changed', { color });
    try {
      await db.setBoardColor(cr, color);
      if (user) emitActivity(io, cr, 'board', user.name, `${user.name} changed board color`);
    } catch (err) {
      console.error('Failed to save board color:', err.message);
    }
  });

  socket.on('delete_sticky', async (id) => {
    const cr = socket.currentRoomId;
    if (!cr) return;

    io.to(cr).emit('sticky_deleted', id);

    try {
      await db.deleteStickyNote(id);
    } catch (err) {
      console.error('Failed to delete sticky note:', err.message);
    }
  });
}

module.exports = { registerCanvasHandlers };
