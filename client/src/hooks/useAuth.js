import { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { SERVER_URL } from '../config';
import { reconnectSocket } from './useRoomSession';

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;
  const id = rawUser.id || rawUser._id || rawUser.userId || rawUser.uid;
  if (!id) return null;
  return {
    ...rawUser,
    id,
    _id: rawUser._id || id,
    userId: rawUser.userId || id,
    username: rawUser.username || rawUser.name || (rawUser.email ? rawUser.email.split('@')[0] : '') || 'User'
  };
};

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('cursor_room_user');
    if (saved) {
      try { return normalizeUser(JSON.parse(saved)); } catch (_) { /* ignore */ }
    }
    return null;
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('cursor_room_userId') || '';
  });
  const [username, setUsername] = useState('');
  const [cursorColor, setCursorColor] = useState(() => {
    const saved = localStorage.getItem('cursor_room_color');
    return saved || COLORS[Math.floor(Math.random() * COLORS.length)];
  });
  const [brushColor, setBrushColor] = useState(cursorColor);
  const [brushWidth, setBrushWidth] = useState(4);

  const applyUser = (rawUser, token) => {
    const normalized = normalizeUser(rawUser);
    if (!normalized || !normalized.id) return;
    if (token) {
      localStorage.setItem('cursor_room_token', token);
    }
    localStorage.setItem('cursor_room_user', JSON.stringify(normalized));
    localStorage.setItem('cursor_room_userId', normalized.id);
    setCurrentUser(normalized);
    setUserId(normalized.id);
    setUsername(normalized.username);
    if (normalized.color) {
      setCursorColor(normalized.color);
      setBrushColor(normalized.color);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('cursor_room_token');
      if (!token) { setAuthLoading(false); return; }
      const savedUser = localStorage.getItem('cursor_room_user');
      if (savedUser) {
        try {
          const parsed = normalizeUser(JSON.parse(savedUser));
          if (parsed && parsed.id) {
            setCurrentUser(parsed);
            setUserId(parsed.id);
            setUsername(parsed.username);
            if (parsed.color) {
              setCursorColor(parsed.color);
              setBrushColor(parsed.color);
            }
          }
        } catch (_) { /* ignore */ }
      }
      try {
        const response = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          if (data.token) {
            localStorage.setItem('cursor_room_token', data.token);
          }
          applyUser(data.user, null);
        } else {
          localStorage.removeItem('cursor_room_token');
          localStorage.removeItem('cursor_room_user');
          localStorage.removeItem('cursor_room_userId');
          setCurrentUser(null);
          setUserId('');
        }
      } catch {
        console.error('Auth verification failed');
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignup = async (authUsername, authEmail, authPassword) => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, email: authEmail, password: authPassword, color: cursorColor })
      });
      const data = await response.json();
      if (data.success) {
        if (!data.token || !data.user) {
          setAuthError('Signup succeeded but auth data is incomplete');
          return;
        }
        applyUser(data.user, data.token);
        reconnectSocket();
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

  const handleLogin = async (authEmail, authPassword) => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await response.json();
      if (data.success) {
        if (!data.token || !data.user) {
          setAuthError('Login succeeded but auth data is incomplete');
          return;
        }
        applyUser(data.user, data.token);
        reconnectSocket();
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
    localStorage.removeItem('cursor_room_user');
    localStorage.removeItem('cursor_room_userId');
    localStorage.removeItem('redirectAfterLogin');
    setCurrentUser(null);
    setUserId('');
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
    userId, username, cursorColor, brushColor, setBrushColor,
    brushWidth, setBrushWidth, setUsername, setCursorColor, setCurrentUser,
    handleSignup, handleLogin, handleLogout, handleColorChange
  };
}