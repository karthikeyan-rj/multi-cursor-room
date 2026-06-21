import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { showToast } from '../utils/toast';
import { redraw, drawShapePreview } from '../utils/canvas';
import { playMessageSound, unlockMessageSound } from '../utils/sound';

function generateStrokeId() {
  return 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
export const socket = io(SERVER_URL);

export function useRoomSession({ userId, username, cursorColor, activeTool, brushColor, brushWidth, chatOpen, setActiveTool }) {
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState('');
  const [currentRoomDisplayId, setCurrentRoomDisplayId] = useState('');
  const [roomCreatedBy, setRoomCreatedBy] = useState('');
  const [roomOwnerId, setRoomOwnerId] = useState('');
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [boardColor, setBoardColor] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const canvasRef = useRef(null);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  function screenToBoard(screenX, screenY) {
    const vp = viewportRef.current;
    return {
      x: (screenX - vp.x) / vp.scale,
      y: (screenY - vp.y) / vp.scale
    };
  }

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
    setBoardColor(null);
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  useEffect(() => {
    if (!currentRoomId) return;

    socket.on('room_data', ({ drawings, stickyNotes, chatHistory, fileMessages, roomCreatedBy, roomOwnerId, boardColor, activeUsers }) => {
      setDrawings(drawings.map(d => ({ ...d, id: d.stroke_id || d.id })));
      setStickyNotes(stickyNotes);
      const merged = [...(chatHistory || []), ...(fileMessages || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setChatHistory(merged);
      if (roomCreatedBy) setRoomCreatedBy(roomCreatedBy);
      if (roomOwnerId) setRoomOwnerId(roomOwnerId);
      if (boardColor) setBoardColor(boardColor);
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

    socket.on('board_color_changed', ({ color }) => {
      setBoardColor(color);
      const canvas = canvasRef.current;
      if (canvas) redraw(canvas, drawingsRef.current, viewportRef.current);
    });

    socket.on('cursor_moved', ({ id, x, y }) => {
      setRemoteCursors(prev => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], x, y } };
      });
    });

    socket.on('stroke_drawn', (stroke) => {
      setDrawings(prev => { const next = [...prev, stroke]; redraw(canvasRef.current, next, viewportRef.current); return next; });
    });

    socket.on('stroke_undone', ({ strokeId }) => {
      setDrawings(prev => {
        const next = prev.filter(s => s.id !== strokeId);
        redraw(canvasRef.current, next, viewportRef.current);
        return next;
      });
    });

    socket.on('canvas:shape', (shape) => {
      setDrawings(prev => { const next = [...prev, shape]; redraw(canvasRef.current, next, viewportRef.current); return next; });
    });

    socket.on('canvas:text', (textData) => {
      setDrawings(prev => { const next = [...prev, textData]; redraw(canvasRef.current, next, viewportRef.current); return next; });
    });

    socket.on('canvas:undo', ({ strokeId }) => {
      setDrawings(prev => {
        const next = prev.filter(s => s.id !== strokeId);
        redraw(canvasRef.current, next, viewportRef.current);
        return next;
      });
    });

    socket.on('canvas_cleared', () => {
      setDrawings([]);
      redraw(canvasRef.current, [], viewportRef.current);
    });

    socket.on('board:all-cleared', () => {
      setDrawings([]);
      setStickyNotes([]);
      redraw(canvasRef.current, [], viewportRef.current);
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
      if (msg.sender_id !== userId && localStorage.getItem('chat_muted') !== 'true') {
        playMessageSound();
      }
    });

    socket.on('room:file-message', (fileMsg) => {
      setChatHistory(prev => [...prev, fileMsg]);
      if (!chatOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }
      if (fileMsg.sender_id !== userId && localStorage.getItem('chat_muted') !== 'true') {
        playMessageSound();
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
      socket.off('board_color_changed');
      socket.off('cursor_moved');
      socket.off('stroke_drawn');
      socket.off('stroke_undone');
      socket.off('canvas_cleared');
      socket.off('board:all-cleared');
      socket.off('canvas:shape');
      socket.off('canvas:text');
      socket.off('canvas:undo');
      socket.off('sticky_added');
      socket.off('sticky_moved');
      socket.off('sticky_updated');
      socket.off('sticky_deleted');
      socket.off('message_received');
      socket.off('room:file-message');
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
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; redraw(canvas, drawings, viewportRef.current); }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [currentRoomId, drawings]);

  useEffect(() => {
    if (canvasRef.current) redraw(canvasRef.current, drawings, viewportRef.current);
  }, [drawings, viewport]);

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.button === 1 || activeTool === 'hand') {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }

    const { x, y } = screenToBoard(e.clientX - rect.left, e.clientY - rect.top);

    if (activeTool === 'draw' || activeTool === 'eraser') {
      setIsDrawing(true);
      setCurrentStroke([{ x, y }]);
    } else if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle') {
      setIsDrawing(true);
      setCurrentShape({ type: activeTool, x, y, w: 0, h: 0 });
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isPanning && panStart) {
      const dx = e.clientX - rect.left - panStart.x;
      const dy = e.clientY - rect.top - panStart.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }

    const { x, y } = screenToBoard(e.clientX - rect.left, e.clientY - rect.top);

    if (isDrawing && (activeTool === 'draw' || activeTool === 'eraser')) {
      const updatedStroke = [...currentStroke, { x, y }];
      setCurrentStroke(updatedStroke);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      redraw(canvas, drawings, viewportRef.current);
      ctx.beginPath();
      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      } else {
        ctx.strokeStyle = brushColor;
      }
      ctx.lineWidth = brushWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(updatedStroke[0].x, updatedStroke[0].y);
      for (let i = 1; i < updatedStroke.length; i++) ctx.lineTo(updatedStroke[i].x, updatedStroke[i].y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (isDrawing && currentShape && (activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle')) {
      setCurrentShape(prev => ({ ...prev, w: x - prev.x, h: y - prev.y }));
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      redraw(canvas, drawings, viewportRef.current);
      drawShapePreview(ctx, activeTool, currentShape.x, currentShape.y, x, y, brushColor, brushWidth, viewportRef.current);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) { setIsPanning(false); setPanStart(null); return; }
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'draw' || activeTool === 'eraser') {
      if (currentStroke.length > 1) {
        const isEraser = activeTool === 'eraser';
        const strokeId = generateStrokeId();
        const stroke = { id: strokeId, points: currentStroke, color: brushColor, width: brushWidth, eraser: isEraser };
        setDrawings(prev => [...prev, stroke]);
        socket.emit('draw_stroke', { id: strokeId, points: currentStroke, color: brushColor, width: brushWidth, eraser: isEraser });
      }
      setCurrentStroke([]);
    } else if (currentShape && (activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle')) {
      const shapeId = generateStrokeId();
      const shape = {
        id: shapeId,
        type: activeTool,
        points: activeTool === 'line' ? [{ x: currentShape.x, y: currentShape.y }, { x: currentShape.x + currentShape.w, y: currentShape.y + currentShape.h }] : [],
        x: currentShape.w >= 0 ? currentShape.x : currentShape.x + currentShape.w,
        y: currentShape.h >= 0 ? currentShape.y : currentShape.y + currentShape.h,
        w: Math.abs(currentShape.w),
        h: Math.abs(currentShape.h),
        color: brushColor,
        size: brushWidth,
        created_at: new Date().toISOString()
      };
      setDrawings(prev => [...prev, shape]);
      socket.emit('canvas:shape', shape);
      setCurrentShape(null);
    }
  };

  const undoLastStroke = useCallback(() => {
    const current = drawingsRef.current;
    if (current.length === 0) return;
    const last = current[current.length - 1];
    if (last?.id) socket.emit('canvas:undo', { strokeId: last.id });
    setDrawings(prev => {
      const next = prev.slice(0, -1);
      redraw(canvasRef.current, next, viewportRef.current);
      return next;
    });
  }, []);

  const clearCanvas = () => { socket.emit('clear_canvas'); };
  const clearBoard = () => { socket.emit('board:clear-all'); };
  const handleDeleteRoom = () => { socket.emit('delete_room'); };

  const handleBoardClick = (e) => {
    if (activeTool === 'sticky' && e.target.tagName === 'CANVAS') {
      const id = 'sticky-' + Math.random().toString(36).substring(2, 11);
      const vp = viewportRef.current;
      const x = (e.clientX - 100 - vp.x) / vp.scale;
      const y = (e.clientY - 80 - vp.y) / vp.scale;
      socket.emit('add_sticky', { id, x, y, text: '', color: '#FFEAA7' });
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
        const s = viewportRef.current.scale;
        const dx = (e.clientX - draggedNote.startX) / s;
        const dy = (e.clientY - draggedNote.startY) / s;
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
    const payload = { message: chatInput.trim() };
    if (replyingTo) {
      payload.replyTo = {
        id: replyingTo.id,
        senderId: replyingTo.senderId,
        senderName: replyingTo.senderName,
        text: replyingTo.text || '[File]'
      };
      setReplyingTo(null);
    }
    socket.emit('send_message', payload);
    setChatInput('');
  };

  const handleCancelReply = useCallback(() => setReplyingTo(null), []);

  const handlePlaceText = useCallback((screenX, screenY, text) => {
    if (!text.trim()) return;
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const { x, y } = screenToBoard(screenX - rect.left, screenY - rect.top);
    const id = generateStrokeId();
    const textData = { id, type: 'text', x, y, text, color: brushColor, size: Math.max(brushWidth * 3, 14), created_at: new Date().toISOString() };
    setDrawings(prev => [...prev, textData]);
    socket.emit('canvas:text', textData);
  }, [brushColor, brushWidth]);

  const handleSetBoardColor = useCallback((color) => {
    socket.emit('board_color_change', { color });
    setBoardColor(color);
  }, []);

  const handleZoomIn = useCallback(() => {
    setViewport(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.1) }));
  }, []);

  const handleZoomReset = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 });
  }, []);

  useEffect(() => {
    if (!currentRoomId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setViewport(prev => {
        const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        const newScale = Math.min(Math.max(prev.scale * delta, 0.1), 5);
        const scaleRatio = newScale / prev.scale;
        return {
          scale: newScale,
          x: mx - (mx - prev.x) * scaleRatio,
          y: my - (my - prev.y) * scaleRatio
        };
      });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [currentRoomId]);

  return {
    socket, currentRoomId, currentRoomName, currentRoomDisplayId, roomCreatedBy, roomOwnerId,
    remoteCursors, drawings, stickyNotes, chatHistory, reactions,
    unreadCount, setUnreadCount, myPos, isDrawing, currentStroke, draggedNote,
    canvasRef, chatOpenRef, chatInput, setChatInput, currentShape,
    viewport, setViewport, isPanning, boardColor,
    handleZoomIn, handleZoomOut, handleZoomReset,
    handleSetBoardColor,
    joinRoom, leaveRoom,
    handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
    undoLastStroke, clearCanvas, clearBoard, handleDeleteRoom,
    handleBoardClick,
    handleNoteMouseDown, updateStickyText, deleteSticky,
    sendReaction, handleSendChat, handlePlaceText,
    replyingTo, setReplyingTo, handleCancelReply
  };
}
