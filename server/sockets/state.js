const activeUsers = {};
const socketUserMap = {};
const presentationState = {}; // roomId -> { active, presenterSocketId, presenterUserId, presenterName, startedAt, viewport: { scale, x, y, centerBoardX, centerBoardY, containerWidth, containerHeight } }

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

module.exports = { activeUsers, socketUserMap, presentationState, getRoomMembers, getOnlineCount, emitRoomMembers };
