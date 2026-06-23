import { useState, useRef, useCallback, useEffect } from 'react';
import { SERVER_URL } from '../config';
import { showToast } from '../utils/toast';

let AgoraRTC = null;

async function ensureAgora() {
  if (!AgoraRTC) {
    try {
      AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    } catch {
      throw new Error('Voice call library is not available. Please install agora-rtc-sdk-ng.');
    }
  }
  return AgoraRTC;
}

export default function useVoiceCall() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);
  const micTrackRef = useRef(null);
  const joinedRef = useRef(false);
  const remoteUsersRef = useRef([]);
  const roomIdRef = useRef(null);

  const updateRemoteUsers = useCallback(() => {
    setRemoteUsers([...remoteUsersRef.current]);
  }, []);

  const leaveVoiceCall = useCallback(async () => {
    if (micTrackRef.current) {
      try {
        micTrackRef.current.stop();
        micTrackRef.current.close();
      } catch {}
      micTrackRef.current = null;
    }

    if (clientRef.current && joinedRef.current) {
      try {
        await clientRef.current.leave();
      } catch {}
    }

    clientRef.current = null;
    joinedRef.current = false;
    remoteUsersRef.current = [];
    roomIdRef.current = null;
    setIsConnected(false);
    setIsMuted(false);
    setRemoteUsers([]);
    setIsJoining(false);
  }, []);

  const joinVoiceCall = useCallback(async (roomId) => {
    if (joinedRef.current) {
      showToast('Already connected to voice call.', 'error');
      return;
    }

    setError(null);
    setIsJoining(true);

    try {
      await ensureAgora();

      const authToken = localStorage.getItem('cursor_room_token');
      const tokenRes = await fetch(`${SERVER_URL}/api/rooms/${roomId}/voice-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to join voice call.');
      }

      const { appId, channelName, token: agoraToken, uid } = tokenData;

      if (!appId || !channelName || !agoraToken || uid === undefined || uid === null) {
        throw new Error('Invalid voice call token response');
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('AGORA_JOIN_DEBUG', {
          appId: appId?.slice(0, 8) + '...',
          channelName,
          tokenType: typeof agoraToken,
          tokenLength: agoraToken?.length,
          uid
        });
      }

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack.play();
          if (!remoteUsersRef.current.find(u => u.uid === user.uid)) {
            remoteUsersRef.current = [...remoteUsersRef.current, { uid: user.uid, user }];
            updateRemoteUsers();
          }
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          remoteUsersRef.current = remoteUsersRef.current.filter(u => u.uid !== user.uid);
          updateRemoteUsers();
        }
      });

      client.on('user-left', (user) => {
        remoteUsersRef.current = remoteUsersRef.current.filter(u => u.uid !== user.uid);
        updateRemoteUsers();
      });

      client.on('connection-state-change', (curState, prevState) => {
        if (curState === 'DISCONNECTED' && joinedRef.current) {
          leaveVoiceCall();
        }
      });

      await client.join(appId, channelName, agoraToken, uid);

      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      micTrackRef.current = micTrack;

      await client.publish([micTrack]);

      roomIdRef.current = roomId;
      joinedRef.current = true;
      setIsConnected(true);
      setIsMuted(false);

      const joinedMsg = `Joined voice call. ${
        remoteUsersRef.current.length > 0
          ? `${remoteUsersRef.current.length} participant(s) connected.`
          : 'Waiting for others...'
      }`;
      showToast(joinedMsg, 'success');
    } catch (err) {
      const message = err.message || 'Failed to join voice call.';
      setError(message);
      showToast(message, 'error');
      leaveVoiceCall();
    } finally {
      setIsJoining(false);
    }
  }, [leaveVoiceCall, updateRemoteUsers]);

  const toggleMute = useCallback(async () => {
    if (!micTrackRef.current) return;
    try {
      await micTrackRef.current.setEnabled(isMuted);
      setIsMuted(!isMuted);
    } catch {
      showToast('Failed to toggle microphone.', 'error');
    }
  }, [isMuted]);

  return {
    isConnected,
    isMuted,
    remoteUsers,
    isJoining,
    error,
    joinVoiceCall,
    leaveVoiceCall,
    toggleMute
  };
}
