import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { showToast } from '../utils/toast';
import { redraw } from '../utils/canvas';

function generateStrokeId() {
  return 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
export const socket = io(SERVER_URL);

export function useRoomSession({ username, cursorColor, activeTool, brushColor, brushWidth, chatOpen, setActiveTool }) {
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState('');
  const [currentRoomDisplayId, setCurrentRoomDisplayId] = useState('');
  const [roomCreatedBy, setRoomCreatedBy] = useState('');
  const [remoteCursors, setRemoteCursors] = useState({});
  const [drawings, setDrawings] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [myPos, setMyPos] = useState({ x: -100, y: -100 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [draggedNote, setDraggedNote] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInput, setChatInput] = useState('');

  const canvasRef = useRef(null);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);

  const joinRoom = (roomId, roomName, displayRoomId, createdBy) => {
    setCurrentRoomId(roomId);
    setCurrentRoomName(roomName || roomId);
    setCurrentRoomDisplayId(displayRoomId || '');
    setRoomCreatedBy(createdBy || '');
    setDrawings([]);
    setStickyNotes([]);
    setChatHistory([]);
    setActiveTool?.('cursor');
    socket.emit('join_room', {
      roomId, name: username, color: cursorColor, token: localStorage.getItem('cursor_room_token')
    });
  };

  const leaveRoom = () => {
    socket.emit('leave_room');
    setCurrentRoomId(null);
    setCurrentRoomName('');
    setCurrentRoomDisplayId('');
    setRemoteCursors({});
    setDrawings([]);
    setStickyNotes([]);
    setChatHistory([]);
  };

  useEffect(() => {
    if (!currentRoomId) return;

    socket.on('room_data', ({ drawings, stickyNotes, chatHistory, roomCreatedBy, activeUsers }) => {
      setDrawings(drawings.map(d => ({ ...d, id: d.stroke_id || d.id })));
      setStickyNotes(stickyNotes);
      setChatHistory(chatHistory);
      if (roomCreatedBy) setRoomCreatedBy(roomCreatedBy);
      const userMap = {};
      activeUsers.forEach(u => { if (u.id !== socket.id) userMap[u.id] = u; });
      setRemoteCursors(userMap);
    });

    socket.on('user_joined', (user) => {
      if (user.id === socket.id) return;
      setRemoteCursors(prev => ({ ...prev, [user.id]: user }));
    });

    socket.on('user_left', (id) => {
      setRemoteCursors(prev => { const u = { ...prev }; delete u[id]; return u; });
    });

    socket.on('cursor_moved', ({ id, x, y }) => {
      setRemoteCursors(prev => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], x, y } };
      });
    });

    socket.on('stroke_drawn', (stroke) => {
      setDrawings(prev => { const next = [...prev, stroke]; redraw(canvasRef.current, next); return next; });
    });

    socket.on('stroke_undone', ({ strokeId }) => {
      setDrawings(prev => {
        const next = prev.filter(s => s.id !== strokeId);
        redraw(canvasRef.current, next);
        return next;
      });
    });

    socket.on('canvas_cleared', () => {
      setDrawings([]);
      redraw(canvasRef.current, []);
    });

    socket.on('sticky_added', (note) => {
      setStickyNotes(prev => prev.some(n => n.id === note.id) ? prev : [...prev, note]);
    });

    socket.on('sticky_moved', ({ id, x, y }) => {
      setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
    });

    socket.on('sticky_updated', ({ id, text, color }) => {
      setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text, color } : n));
    });

    socket.on('sticky_deleted', (id) => {
      setStickyNotes(prev => prev.filter(n => n.id !== id));
    });

    socket.on('message_received', (msg) => {
      setChatHistory(prev => [...prev, msg]);
      if (!chatOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on('reaction_received', ({ emoji, x, y }) => {
      const rxId = Date.now() + Math.random();
      setReactions(prev => [...prev, { id: rxId, emoji, x, y }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== rxId)), 1500);
    });

    socket.on('error_message', (msg) => {
      showToast(msg, 'error');
      leaveRoom();
    });

    socket.on('room_deleted', () => {
      showToast('Room has been deleted by the creator.', 'error');
      leaveRoom();
    });

    return () => {
      socket.off('room_data');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('cursor_moved');
      socket.off('stroke_drawn');
      socket.off('stroke_undone');
      socket.off('canvas_cleared');
      socket.off('sticky_added');
      socket.off('sticky_moved');
      socket.off('sticky_updated');
      socket.off('sticky_deleted');
      socket.off('message_received');
      socket.off('reaction_received');
      socket.off('error_message');
      socket.off('room_deleted');
    };
  }, [currentRoomId]);

  useEffect(() => {
    if (!currentRoomId) return;
    const handleMouseMove = (e) => {
      const x = e.clientX, y = e.clientY;
      setMyPos({ x, y });
      socket.emit('cursor_move', { x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentRoomId]);

  useEffect(() => {
    if (!currentRoomId || !canvasRef.current) return;
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; redraw(canvas, drawings); }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [currentRoomId, drawings]);

  useEffect(() => {
    if (canvasRef.current) redraw(canvasRef.current, drawings);
  }, [drawings]);

  const handleCanvasMouseDown = (e) => {
    if (activeTool !== 'draw' && activeTool !== 'eraser') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setIsDrawing(true);
    setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || (activeTool !== 'draw' && activeTool !== 'eraser')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const updatedStroke = [...currentStroke, { x, y }];
    setCurrentStroke(updatedStroke);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redraw(canvas, drawings);
    ctx.beginPath();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(updatedStroke[0].x, updatedStroke[0].y);
    for (let i = 1; i < updatedStroke.length; i++) ctx.lineTo(updatedStroke[i].x, updatedStroke[i].y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const isEraser = activeTool === 'eraser';
      const strokeId = generateStrokeId();
      const stroke = { id: strokeId, points: currentStroke, color: brushColor, width: brushWidth, eraser: isEraser };
      setDrawings(prev => [...prev, stroke]);
      socket.emit('draw_stroke', { id: strokeId, points: currentStroke, color: brushColor, width: brushWidth, eraser: isEraser });
    }
    setCurrentStroke([]);
  };

  const undoLastStroke = useCallback(() => {
    const current = drawingsRef.current;
    if (current.length === 0) return;
    const last = current[current.length - 1];
    if (last?.id) socket.emit('undo_last_stroke', { strokeId: last.id });
    setDrawings(prev => {
      const next = prev.slice(0, -1);
      redraw(canvasRef.current, next);
      return next;
    });
  }, []);

  const clearCanvas = () => { socket.emit('clear_canvas'); };
  const handleDeleteRoom = () => { socket.emit('delete_room'); };

  const handleBoardClick = (e) => {
    if (activeTool === 'sticky' && e.target.tagName === 'CANVAS') {
      const id = 'sticky-' + Math.random().toString(36).substring(2, 11);
      socket.emit('add_sticky', { id, x: e.clientX - 100, y: e.clientY - 80, text: '', color: '#FFEAA7' });
      setActiveTool?.('cursor');
    }
  };

  const handleBoardDoubleClick = (e) => {
    if (e.target.tagName === 'CANVAS') {
      const id = 'sticky-' + Math.random().toString(36).substring(2, 11);
      socket.emit('add_sticky', { id, x: e.clientX - 100, y: e.clientY - 80, text: '', color: '#FFEAA7' });
    }
  };

  const handleNoteMouseDown = (id, e) => {
    if (e.target.closest('.sticky-note-header')) {
      e.preventDefault();
      const note = stickyNotes.find(n => n.id === id);
      if (!note) return;
      setDraggedNote({ id, startX: e.clientX, startY: e.clientY, noteX: note.x, noteY: note.y });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggedNote) {
        const dx = e.clientX - draggedNote.startX;
        const dy = e.clientY - draggedNote.startY;
        const newX = draggedNote.noteX + dx;
        const newY = draggedNote.noteY + dy;
        setStickyNotes(prev => prev.map(n => n.id === draggedNote.id ? { ...n, x: newX, y: newY } : n));
        socket.emit('move_sticky', { id: draggedNote.id, x: newX, y: newY });
      }
    };
    const handleMouseUp = () => { if (draggedNote) setDraggedNote(null); };
    if (draggedNote) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedNote]);

  const updateStickyText = (id, text, color) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text, color } : n));
    socket.emit('update_sticky', { id, text, color });
  };

  const deleteSticky = (id) => { socket.emit('delete_sticky', id); };

  const sendReaction = (emoji) => {
    if (!currentRoomId) return;
    socket.emit('reaction', { emoji, x: myPos.x, y: myPos.y });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send_message', { message: chatInput.trim() });
    setChatInput('');
  };

  return {
    socket, currentRoomId, currentRoomName, currentRoomDisplayId, roomCreatedBy,
    remoteCursors, drawings, stickyNotes, chatHistory, reactions,
    unreadCount, setUnreadCount, myPos, isDrawing, currentStroke, draggedNote,
    canvasRef, chatOpenRef, chatInput, setChatInput,
    joinRoom, leaveRoom,
    handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
    undoLastStroke, clearCanvas, handleDeleteRoom,
    handleBoardClick, handleBoardDoubleClick,
    handleNoteMouseDown, updateStickyText, deleteSticky,
    sendReaction, handleSendChat
  };
}
