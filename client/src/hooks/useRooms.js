import { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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
        setCreatedRoomDetails({ id: data.room.id, name: data.room.name, roomId: data.room.roomId });
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
      if (data.success) {
        onJoinRoom(data.room.id, data.room.name, data.room.roomId, data.room.createdBy);
      } else {
        setJoinError(data.error || 'Failed to join room.');
      }
    } catch (err) {
      console.error('Join room fetch error:', err);
      setJoinError(`Cannot reach server at ${SERVER_URL}. Is the backend running? (${err.message})`);
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
      if (data.success) {
        setPromptRoom(null);
        onJoinRoom(data.room.id, data.room.name, data.room.roomId, data.room.createdBy);
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

  const handleDeleteRoom = async (slug) => {
    try {
      const token = localStorage.getItem('cursor_room_token');
      const response = await fetch(`${SERVER_URL}/api/rooms/${slug}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Room deleted.', 'success');
        setRooms(prev => prev.filter(r => r.id !== slug));
      } else {
        showToast(data.error || 'Failed to delete room.', 'error');
      }
    } catch (err) {
      console.error('Delete room error:', err);
      showToast('Failed to delete room.', 'error');
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
