import { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { socket, authorizeRoomSession } from './useRoomSession';
import { SERVER_URL } from '../config';

export function useRooms({ currentUser, currentRoomId, onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [joinError, setJoinError] = useState('');
  const [createdRoomDetails, setCreatedRoomDetails] = useState(null);
  const [promptRoom, setPromptRoom] = useState(null);
  const [promptError, setPromptError] = useState('');

  useEffect(() => {
    if (!currentUser || currentRoomId) return;
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem('cursor_room_token');
        if (!token) return;
        const response = await fetch(`${SERVER_URL}/api/rooms`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (active && data.success) setRooms(data.rooms);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [currentRoomId, currentUser]);

  useEffect(() => {
    const handler = ({ roomId }) => {
      if (roomId) setRooms(prev => prev.filter(r => r.id !== roomId && r.roomId !== roomId));
    };
    socket.on('room_removed', handler);

    const kickedHandler = ({ roomId }) => {
      if (roomId) {
        setRooms(prev => prev.filter(r => {
          const publicId = String(r.roomId || r.publicRoomId || '').trim();
          const internalId = String(r.id || r._id || '').trim();
          return publicId !== roomId && internalId !== roomId;
        }));
      }
    };
    socket.on('kicked-from-room', kickedHandler);

    return () => {
      socket.off('room_removed', handler);
      socket.off('kicked-from-room', kickedHandler);
    };
  }, []);

  const normalizeRoom = (rawRoom) => {
    if (!rawRoom) return null;
    const publicRoomId = rawRoom.roomId || rawRoom.publicRoomId;
    const mongoId = rawRoom._id || rawRoom.id;
    return {
      ...rawRoom,
      id: mongoId || publicRoomId,
      _id: rawRoom._id || mongoId,
      roomId: publicRoomId,
      ownerId: rawRoom.ownerId || rawRoom.createdBy,
      participants: rawRoom.participants || rawRoom.members || []
    };
  };

  const handleCreateRoom = async (name, password) => {
    try {
      const token = localStorage.getItem('cursor_room_token');
      const response = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, password })
      });
      const data = await response.json();
      if (data.success) {
        const createdRoom = normalizeRoom(data.room || data.data?.room || data.data || data);
        if (!createdRoom?.roomId) {
          showToast('Room created but missing public room ID.', 'error');
          return;
        }
        if (import.meta.env.DEV) {
          console.log('CREATE_ROOM_DEBUG', {
            roomId: createdRoom.roomId,
            id: createdRoom.id,
            ownerId: createdRoom.ownerId,
            name: createdRoom.name
          });
        }
        authorizeRoomSession(createdRoom.roomId);
        setCreatedRoomDetails({ id: createdRoom.id, name: createdRoom.name, roomId: createdRoom.roomId });
        return { id: createdRoom.id, roomId: createdRoom.roomId };
      } else {
        showToast(data.error || 'Failed to create room.', 'error');
      }
    } catch (err) {
      console.error('Create room fetch error:', err);
      showToast('Failed to create room.', 'error');
    }
  };

  const handleJoinRoom = async (roomId, password) => {
    setJoinError('');
    try {
      const token = localStorage.getItem('cursor_room_token');
      const response = await fetch(`${SERVER_URL}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId, password })
      });
      const data = await response.json();
      if (data.requiresApproval) {
        showToast(data.message || 'Access request sent to room owner.', 'success');
        return true;
      }
      if (data.success) {
        const joinedRoom = normalizeRoom(data.room);
        authorizeRoomSession(joinedRoom.roomId);
        onJoinRoom(joinedRoom.id, joinedRoom.name, joinedRoom.roomId, joinedRoom.createdBy);
        return true;
      } else {
        setJoinError(data.error || 'Failed to join room.');
        return false;
      }
    } catch (err) {
      console.error('Join room fetch error:', err);
      setJoinError(`Cannot reach server at ${SERVER_URL}. Is the backend running? (${err.message})`);
      return false;
    }
  };

  const handlePromptSubmit = async (password) => {
    if (!promptRoom || !password) return;
    setPromptError('');
    try {
      const token = localStorage.getItem('cursor_room_token');
      const response = await fetch(`${SERVER_URL}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: promptRoom.roomId, password })
      });
      const data = await response.json();
      if (data.requiresApproval) {
        setPromptRoom(null);
        showToast(data.message || 'Access request sent to room owner.', 'success');
      } else if (data.success) {
        const joinedRoom = normalizeRoom(data.room);
        authorizeRoomSession(joinedRoom.roomId);
        setPromptRoom(null);
        onJoinRoom(joinedRoom.id, joinedRoom.name, joinedRoom.roomId, joinedRoom.createdBy);
      } else {
        setPromptError(data.error || 'Failed to join room.');
      }
    } catch (err) {
      console.error('Prompt room fetch error:', err);
      setPromptError(`Cannot reach server at ${SERVER_URL}. Is the backend running? (${err.message})`);
    }
  };

  const handleEnterRoom = (room) => {
    setPromptRoom(room);
    setPromptError('');
  };

  const handleCancelPrompt = () => {
    setPromptRoom(null);
    setPromptError('');
  };

  const getPublicRoomId = (roomObj) => {
    return String(roomObj?.roomId || roomObj?.publicRoomId || "").trim();
  };

  const handleDeleteRoom = async (roomIdentifierOrObj) => {
    let roomId = "";
    let fallbackId = "";
    if (typeof roomIdentifierOrObj === 'object' && roomIdentifierOrObj !== null) {
      roomId = getPublicRoomId(roomIdentifierOrObj);
      fallbackId = String(roomIdentifierOrObj?.id || roomIdentifierOrObj?._id || "").trim();
      if (import.meta.env.DEV) {
        console.log("DELETE SOURCE:", "dashboard");
        console.log("FULL ROOM OBJECT:", roomIdentifierOrObj);
        console.log("room.roomId:", roomIdentifierOrObj?.roomId);
        console.log("room.id:", roomIdentifierOrObj?.id);
        console.log("room._id:", roomIdentifierOrObj?._id);
        console.log("room.slug:", roomIdentifierOrObj?.slug);
        console.log("room.name:", roomIdentifierOrObj?.name);
      }
    } else {
      roomId = String(roomIdentifierOrObj || "").trim();
      if (import.meta.env.DEV) {
        console.log("DELETE SOURCE:", "workspace");
        console.log("DELETE IDENTIFIER:", roomId);
      }
    }

    if (!roomId) {
      console.error('Delete room called with empty identifier');
      showToast('Cannot delete: missing room identifier.', 'error');
      return false;
    }

    const doDelete = async (id) => {
      const url = `${SERVER_URL}/api/rooms/${id}`;
      if (import.meta.env.DEV) {
        console.log("DELETE URL:", url);
      }
      const token = localStorage.getItem('cursor_room_token');
      if (!token) {
        showToast('Authentication required.', 'error');
        return false;
      }
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    };

    try {
      let data = await doDelete(roomId);
      if (data.success) {
        showToast('Room deleted.', 'success');
        setRooms(prev => prev.filter(r => String(r.roomId || r.publicRoomId || "").trim() !== roomId && String(r.id || "").trim() !== roomId));
        return true;
      }
      if (data.error && data.error.toLowerCase().includes('not found') && fallbackId && fallbackId !== roomId) {
        console.log("DELETE FALLBACK: trying with id:", fallbackId);
        data = await doDelete(fallbackId);
        if (data.success) {
          showToast('Room deleted.', 'success');
          setRooms(prev => prev.filter(r => String(r.roomId || r.publicRoomId || "").trim() !== roomId && String(r.id || "").trim() !== fallbackId));
          return true;
        }
      }
      showToast(data.error || 'Failed to delete room.', 'error');
      return false;
    } catch (err) {
      console.error('Delete room error:', err);
      showToast('Failed to delete room.', 'error');
      return false;
    }
  };

  return {
    rooms, joinError, createdRoomDetails, setCreatedRoomDetails,
    promptRoom, promptError,
    handleCreateRoom, handleJoinRoom, handleEnterRoom,
    handlePromptSubmit, handleCancelPrompt,
    handleDeleteRoom
  };
}
