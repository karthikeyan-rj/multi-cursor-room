const db = require('../db');

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

function getAgoraToken() {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) return null;
  try {
    const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
    return { RtcTokenBuilder, RtcRole };
  } catch {
    return null;
  }
}

function numericUid(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

async function getVoiceToken(req, res) {
  const agora = getAgoraToken();
  if (!agora) {
    return res.status(500).json({ success: false, error: 'Voice call is not configured on the server.' });
  }

  const { roomId } = req.params;
  const userId = req.user.userId;
  const username = req.user.username;

  const room = await db.getRoomByRoomId(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found.' });
  }

  const isMember = room.ownerId === userId ||
    (room.participants && room.participants.some(p => p.userId === userId));
  if (!isMember) {
    return res.status(403).json({ success: false, error: 'You are not a member of this room.' });
  }

  const isKicked = await db.isUserKicked(room.id || room._id, userId);
  if (isKicked) {
    return res.status(403).json({ success: false, error: 'You have been removed from this room.' });
  }

  const internalId = room.id || room._id;
  const channelName = `voice-${internalId}`;
  const uid = numericUid(userId);

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + 3600;

  const token = agora.RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    agora.RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log('AGORA_TOKEN_DEBUG', {
      appIdExists: !!AGORA_APP_ID,
      certificateExists: !!AGORA_APP_CERTIFICATE,
      tokenType: typeof token,
      tokenLength: token?.length,
      channelName,
      uid
    });
  }

  res.json({
    success: true,
    appId: AGORA_APP_ID,
    token,
    channelName,
    uid,
    username
  });
}

module.exports = { getVoiceToken };
