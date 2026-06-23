const activeUsers = {};
const socketUserMap = {};

function getRoomMembers(roomId) {
  return Object.values(activeUsers[roomId] || {});
}

function getOnlineCount(roomId) {
  const members = getRoomMembers(roomId);
  return new Set(members.map(m => String(m.userId)).filter(Boolean)).size;
}

function emitRoomMembers(io, roomId) {
  const members = getRoomMembers(roomId);
  const onlineCount = getOnlineCount(roomId);
  io.to(roomId).emit('room-members-updated', { members, onlineCount });
}

module.exports = { activeUsers, socketUserMap, getRoomMembers, getOnlineCount, emitRoomMembers };
