import { useState, useEffect } from 'react';
import { COLORS } from '../constants';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [cursorColor, setCursorColor] = useState(() => {
    const saved = localStorage.getItem('cursor_room_color');
    return saved || COLORS[Math.floor(Math.random() * COLORS.length)];
  });
  const [brushColor, setBrushColor] = useState(cursorColor);
  const [brushWidth, setBrushWidth] = useState(4);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('cursor_room_token');
      if (!token) { setAuthLoading(false); return; }
      try {
        const response = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setCurrentUser(data.user);
          setUsername(data.user.username);
          setCursorColor(data.user.color);
          setBrushColor(data.user.color);
        } else {
          localStorage.removeItem('cursor_room_token');
        }
      } catch {
        console.error('Auth verification failed');
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignup = async (authUsername, authPassword) => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword, color: cursorColor })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('cursor_room_token', data.token);
        setCurrentUser(data.user);
        setUsername(data.user.username);
        setCursorColor(data.user.color);
        setBrushColor(data.user.color);
      } else {
        setAuthError(data.error || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup fetch error:', err);
      setAuthError(`Cannot reach server at ${SERVER_URL}. Is the backend running? (${err.message})`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (authUsername, authPassword) => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('cursor_room_token', data.token);
        setCurrentUser(data.user);
        setUsername(data.user.username);
        setCursorColor(data.user.color);
        setBrushColor(data.user.color);
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      setAuthError(`Cannot reach server at ${SERVER_URL}. Is the backend running? (${err.message})`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = (onLeaveRoom) => {
    localStorage.removeItem('cursor_room_token');
    setCurrentUser(null);
    setUsername('');
    onLeaveRoom?.();
  };

  const handleColorChange = async (val) => {
    setCursorColor(val);
    setBrushColor(val);
    localStorage.setItem('cursor_room_color', val);
    const token = localStorage.getItem('cursor_room_token');
    if (token) {
      try {
        await fetch(`${SERVER_URL}/api/auth/color`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ color: val })
        });
        setCurrentUser(prev => prev ? { ...prev, color: val } : null);
      } catch (err) {
        console.error('Failed to update color on server:', err);
      }
    }
  };

  return {
    currentUser, authError, authLoading, authBusy,
    username, cursorColor, brushColor, setBrushColor,
    brushWidth, setBrushWidth,
    handleSignup, handleLogin, handleLogout, handleColorChange
  };
}
