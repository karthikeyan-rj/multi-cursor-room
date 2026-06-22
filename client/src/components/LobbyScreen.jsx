import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants';
import { showToast } from '../utils/toast';
import Starfield from './Starfield';
import ConfirmationModal from './ConfirmationModal';
import SettingsPanel from './SettingsPanel';

// SVG Eye Icons
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#eab308" : "none"} stroke={filled ? "#eab308" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function LobbyScreen({
  currentUser, userId, username, cursorColor, rooms,
  createdRoomDetails, promptRoom, promptError, joinError,
  onLogout, onColorChange,
  onJoinRoom, onCreateRoom, onPromptSubmit,
  onEnterRoom, onCancelPrompt, onEnterCreatedRoom,
  onCopyToClipboard, onDeleteRoom, onCloseCreatedRoom
}) {
  // Form state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [promptPassword, setPromptPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Password visibility
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showPromptPassword, setShowPromptPassword] = useState(false);

  // Dashboard UI state
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 640);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  // Starred rooms — persisted per user in localStorage
  const [starredRoomIds, setStarredRoomIds] = useState(() => {
    try {
      const key = `starredRooms:${userId || ''}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (_) { return []; }
  });

  useEffect(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`starredRooms:${userId}`);
        setStarredRoomIds(saved ? JSON.parse(saved) : []);
      } catch (_) { setStarredRoomIds([]); }
    }
  }, [userId]);

  const toggleStar = (roomId) => {
    setStarredRoomIds(prev => {
      const next = prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId];
      try { localStorage.setItem(`starredRooms:${userId}`, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  // Prompt handler
  const handlePrompt = async (e) => {
    e.preventDefault();
    if (!promptPassword) return;
    await onPromptSubmit(promptPassword);
    setPromptPassword('');
  };

  // Filtered rooms based on search + sidebar filter
  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      const q = trimmedQuery.toLowerCase();
      result = result.filter(r =>
        (r.name || r.roomName || '').toLowerCase().includes(q) ||
        (r.roomId || '').toLowerCase().includes(q) ||
        (r.ownerName || r.createdBy || r.ownerUsername || '').toLowerCase().includes(q)
      );
    }
    if (sidebarFilter === 'recent') result = result.slice(0, 10);
    else if (sidebarFilter === 'owned') result = result.filter(r => r.ownerId === userId);
    else if (sidebarFilter === 'joined') result = result.filter(r => r.ownerId !== userId);
    else if (sidebarFilter === 'starred') result = result.filter(r => starredRoomIds.includes(r.roomId));
    return result;
  }, [rooms, searchQuery, sidebarFilter, starredRoomIds, userId]);

  const starredRoomsList = useMemo(() => rooms.filter(r => starredRoomIds.includes(r.roomId)), [rooms, starredRoomIds]);

  // Render a single room card (used in all room sections)
  const renderRoomCard = (room) => {
    const isOwner = room.ownerId === userId;
    const isStarred = starredRoomIds.includes(room.roomId);
    const isActive = room.activeCount > 0;
    return (
      <div
        key={room.id || room.roomId}
        className={`db-room-card glass glass-interactive ${isOwner ? 'db-room-card--owner' : ''}`}
        onClick={() => onEnterRoom(room)}
      >
        <div className="db-room-card-top">
          <div className="db-room-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </div>
          <div className="db-room-card-badges">
            <button
              type="button"
              className="db-star-btn"
              title={isStarred ? 'Remove from Starred' : 'Star this room'}
              onClick={e => { e.stopPropagation(); toggleStar(room.roomId); }}
            >
              <StarIcon filled={isStarred} />
            </button>
            <span className={`db-room-card-status ${isActive ? 'active' : ''}`}>
              <span className="db-status-dot" style={{ marginRight: 4 }} />
              {isActive ? 'Active' : 'Idle'}
            </span>
            {isOwner
              ? <span className="room-card-badge" style={{ fontSize: 9 }}>Owner</span>
              : <span className="db-member-badge" style={{ fontSize: 9 }}>Member</span>
            }
          </div>
        </div>
        <div className="db-room-card-body">
          <h3 className="db-room-card-name" title={room.name || room.roomName}>
            {room.name || room.roomName}
          </h3>
          <div className="db-room-card-id">
            <span className="room-id-chip" style={{ margin: 0, fontSize: 11 }}>
              <span className="room-id-chip-label">ID</span>{room.roomId}
            </span>
          </div>
          {isActive && (
            <div className="db-room-card-meta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {room.activeCount} active user{room.activeCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="db-room-card-actions">
          <button
            className="db-action-btn"
            title="Copy Room ID"
            onClick={e => { e.stopPropagation(); onCopyToClipboard(room.roomId || ''); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            Copy ID
          </button>
          <button className="db-action-btn primary" title="Enter Room">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Open
          </button>
          {isOwner && (
            <button
              className="db-action-btn db-action-danger"
              title="Delete Room"
              onClick={e => { e.stopPropagation(); setDeleteTarget(room); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  // Workspace display name
  const workspaceLabel = (username || currentUser?.username || currentUser?.name)
    ? `${username || currentUser?.username || currentUser?.name}'s Workspace`
    : 'My Workspace';

  // User initials for avatar
  const initials = (username || 'U').slice(0, 2).toUpperCase();
  const navigate = useNavigate();

  return (
    <>
      <div className="db-page">
        {/* ── TOP BAR ── */}
        <header className="db-topbar glass">
          <div className="db-topbar-left">
            <button
              className="db-sidebar-toggle"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="db-topbar-logo" title={workspaceLabel}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <rect x="2" y="2" width="36" height="36" rx="10" stroke="url(#lgr)" strokeWidth="2.5" fill="rgba(59,130,246,0.06)" />
                <path d="M14 20c0-4.4 2.7-8 6-8s6 3.6 6 8-2.7 8-6 8-6-3.6-6-8z" stroke="url(#lgr)" strokeWidth="1.5" fill="none" />
                <path d="M10 28c1.5-3.5 4.5-5.5 8-5.5s6.5 2 8 5.5" stroke="url(#lgr)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <circle cx="20" cy="18" r="3" fill="url(#lgr)" />
                <defs>
                  <linearGradient id="lgr" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="db-topbar-label">{workspaceLabel}</span>
          </div>

          <div className="db-topbar-right">
              {/* Notifications */}
              <div className="db-topbar-icon-wrap">
                <button className="db-topbar-icon" onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); setSettingsOpen(false); }} aria-label="Notifications">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </button>
                {notifOpen && (
                  <div className="db-dropdown glass">
                    <div className="db-dropdown-header">Notifications</div>
                    <div className="db-dropdown-empty">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      No notifications yet
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="db-topbar-icon-wrap">
                <button className="db-topbar-icon" onClick={() => { setSettingsOpen(true); setProfileOpen(false); setNotifOpen(false); }} aria-label="Settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                  </svg>
                </button>
              </div>

              {/* Profile */}
              <div className="db-topbar-icon-wrap">
                <button className="db-avatar-btn" onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setSettingsOpen(false); }} aria-label="Profile">
                  {initials}
                </button>
                {profileOpen && (
                  <div className="db-dropdown glass">
                    <div className="db-dropdown-profile-header">
                      <div className="db-dropdown-profile-name">{username}</div>
                      <div className="db-dropdown-profile-email">{currentUser?.email}</div>
                    </div>
                    <button className="db-dropdown-item" onClick={() => { setProfileOpen(false); navigate('/profile'); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profile
                    </button>
                    <button className="db-dropdown-item db-dropdown-danger" onClick={() => { setProfileOpen(false); setSignOutConfirm(true); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className={`db-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
           {/* ── Sidebar overlay (mobile only) ── */}
           {!sidebarCollapsed && (
             <div className="db-sidebar-overlay" onClick={() => setSidebarCollapsed(true)} />
           )}

           {/* ── SIDEBAR ── */}
           <aside className={`db-sidebar glass${!sidebarCollapsed ? ' open' : ''}`}>
              <button className="db-create-btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
               </svg>
               Create New Room
             </button>
              <button className="db-create-btn btn-back" onClick={() => setIsJoinModalOpen(true)}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                 <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
               </svg>
               Join Room
             </button>

              <nav className="db-sidebar-nav">
                <p className="db-sidebar-section-label">Workspaces</p>
                <button
                  className={`db-nav-item ${sidebarFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('all')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  All Rooms
                  <span className="db-nav-badge">{rooms.length}</span>
                </button>
                <button
                  className={`db-nav-item ${sidebarFilter === 'owned' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('owned')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Owned
                  {rooms.filter(r => r.ownerId === userId).length > 0 && <span className="db-nav-badge">{rooms.filter(r => r.ownerId === userId).length}</span>}
                </button>
                <button
                  className={`db-nav-item ${sidebarFilter === 'joined' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('joined')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Joined
                  {rooms.filter(r => r.ownerId !== userId).length > 0 && <span className="db-nav-badge">{rooms.filter(r => r.ownerId !== userId).length}</span>}
                </button>
                <button
                  className={`db-nav-item ${sidebarFilter === 'starred' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('starred')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"
                    fill={starredRoomsList.length > 0 ? '#eab308' : 'none'}
                    stroke={starredRoomsList.length > 0 ? '#eab308' : 'currentColor'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Starred
                  {starredRoomsList.length > 0 && <span className="db-nav-badge">{starredRoomsList.length}</span>}
                </button>
              </nav>
           </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="db-main">

            {/* ── WELCOME HERO ── */}
            <section className="db-welcome db-section">
              <h1 className="db-welcome-title">Welcome back, {username || 'there'}</h1>
              <p className="db-welcome-subtitle">Create a room, join a workspace, or continue collaborating with your team.</p>
              <div className="db-welcome-actions">
                <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Room
                </button>
                <button className="btn-back" onClick={() => setIsJoinModalOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Join Room
                </button>
              </div>
            </section>

            {/* ── OVERVIEW ── */}
            <section className="db-section">
              <div className="db-overview-grid">
                <div className="db-overview-card glass">
                  <div className="db-overview-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                    </svg>
                  </div>
                  <div>
                    <div className="db-overview-value">{rooms.length}</div>
                    <div className="db-overview-label">Total Rooms</div>
                  </div>
                </div>
                <div className="db-overview-card glass">
                  <div className="db-overview-icon" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <div className="db-overview-value">{rooms.filter(r => r.activeCount > 0).length}</div>
                    <div className="db-overview-label">Active</div>
                  </div>
                </div>
                <div className="db-overview-card glass">
                  <div className="db-overview-icon" style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="db-overview-value">{rooms.filter(r => r.ownerId === userId).length}</div>
                    <div className="db-overview-label">Owned</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── FILTER TABS ── */}
            <div className="db-filter-bar">
              <div className="db-filter-tabs">
                <button
                  className={`db-filter-tab ${sidebarFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('all')}
                >All Rooms</button>
                <button
                  className={`db-filter-tab ${sidebarFilter === 'owned' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('owned')}
                >Owned ({rooms.filter(r => r.ownerId === userId).length})</button>
                <button
                  className={`db-filter-tab ${sidebarFilter === 'joined' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('joined')}
                >Joined ({rooms.filter(r => r.ownerId !== userId).length})</button>
                <button
                  className={`db-filter-tab ${sidebarFilter === 'starred' ? 'active' : ''}`}
                  onClick={() => setSidebarFilter('starred')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={starredRoomsList.length > 0 ? '#eab308' : 'none'} stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Starred {starredRoomsList.length > 0 && `(${starredRoomsList.length})`}
                </button>
              </div>
              <div className="db-search-wrap" style={{ minWidth: 200 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="db-search-icon">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="db-search"
                  placeholder="Search rooms by name, ID, or owner…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* ── ROOMS GRID ── */}
            <section className="db-section">
              {rooms.length === 0 ? (
                <div className="db-empty-state glass">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="db-empty-icon">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                  </svg>
                  <h3 className="db-empty-title">No rooms yet</h3>
                  <p className="db-empty-desc">Create your first room or join one using a Room ID to get started.</p>
                  <div className="db-empty-actions">
                    <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Your First Room
                    </button>
                    <button className="btn-back" onClick={() => setIsJoinModalOpen(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      Join a Room
                    </button>
                  </div>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="db-empty-state glass" style={{ padding: '40px 24px' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="db-empty-icon" style={{ opacity: 0.3 }}>
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <p className="db-empty-desc" style={{ marginTop: 8 }}>
                    {searchQuery
                      ? <>No rooms match "<strong>{searchQuery}</strong>"</>
                      : sidebarFilter === 'owned'
                        ? 'You haven\'t created any rooms yet.'
                        : sidebarFilter === 'joined'
                          ? 'You haven\'t joined any rooms yet.'
                          : sidebarFilter === 'starred'
                            ? 'No starred rooms. Click the star icon on a room card to star it.'
                            : 'No rooms to show.'}
                  </p>
                  {(sidebarFilter === 'owned' || sidebarFilter === 'starred') && (
                    <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setIsCreateModalOpen(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create a Room
                    </button>
                  )}
                </div>
              ) : sidebarFilter === 'owned' || sidebarFilter === 'joined' || sidebarFilter === 'starred' ? (
                /* ── Single-filter view (owned, joined, or starred) ── */
                <div className="db-room-grid">
                  {filteredRooms.map(room => renderRoomCard(room))}
                </div>
              ) : sidebarFilter === 'all' || sidebarFilter === 'recent' ? (
                /* ── Split sections view ── */
                <>
                  {rooms.filter(r => r.ownerId === userId).length > 0 && (
                    <div className="db-room-section">
                      <div className="db-section-header">
                        <h2 className="db-section-title">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          My Rooms
                          <span className="db-section-count">{rooms.filter(r => r.ownerId === userId).length}</span>
                        </h2>
                      </div>
                      <div className="db-room-grid">
                        {rooms.filter(r => r.ownerId === userId).map(room => renderRoomCard(room))}
                      </div>
                    </div>
                  )}

                  {rooms.filter(r => r.ownerId !== userId).length > 0 && (
                    <div className="db-room-section">
                      <div className="db-section-header">
                        <h2 className="db-section-title">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          Joined Rooms
                          <span className="db-section-count">{rooms.filter(r => r.ownerId !== userId).length}</span>
                        </h2>
                      </div>
                      <div className="db-room-grid">
                        {rooms.filter(r => r.ownerId !== userId).map(room => renderRoomCard(room))}
                      </div>
                    </div>
                  )}

                  {starredRoomsList.length > 0 && (
                    <div className="db-room-section">
                      <div className="db-section-header">
                        <h2 className="db-section-title">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          Starred
                          <span className="db-section-count">{starredRoomsList.length}</span>
                        </h2>
                      </div>
                      <div className="db-room-grid">
                        {starredRoomsList.map(room => renderRoomCard(room))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </section>
          </main>
        </div>
      </div>

      {/* ── SETTINGS PANEL ── */}
      {settingsOpen && (
        <SettingsPanel
          cursorColor={cursorColor}
          onColorChange={(c) => { onColorChange(c); }}
          onClose={() => setSettingsOpen(false)}
          onSignOut={() => { setSettingsOpen(false); setSignOutConfirm(true); }}
        />
      )}

      {/* ── ROOM CREATED SUCCESS MODAL ── */}
      {createdRoomDetails && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCloseCreatedRoom(); }}>
          <div className="panel-card glass modal-content" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}>
              <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="rgba(34,197,94,0.15)" />
              <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="card-title" style={{ justifyContent: 'center', marginBottom: 12, color: '#f8fafc' }}>Room Created!</h3>
            <div style={{ margin: '16px 0', textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(226,232,240,0.85)' }}>Room Name</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, marginTop: 4, color: '#f8fafc' }}>{createdRoomDetails.name}</div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(226,232,240,0.85)' }}>Room ID</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: '#7dd3fc', letterSpacing: 2 }}>{createdRoomDetails.roomId}</span>
                <button
                  onClick={() => onCopyToClipboard(createdRoomDetails.roomId || '')}
                  style={{ background: 'rgba(125,211,252,0.12)', border: '1px solid rgba(125,211,252,0.35)', color: '#7dd3fc', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >Copy</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-back" style={{ flex: 1, justifyContent: 'center', padding: '10px 16px' }} onClick={onCloseCreatedRoom}>OK</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onEnterCreatedRoom}>Enter Room →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROOM PASSWORD PROMPT MODAL ── */}
      {promptRoom && (
        <div className="modal-overlay">
          <div className="panel-card glass modal-content" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Enter Password
              </h3>
              <button className="db-modal-close" onClick={onCancelPrompt} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Enter password for <strong>{promptRoom.name}</strong> <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>({promptRoom.roomId})</span>
            </p>
            {promptError && (
              <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 16 }}>
                {promptError}
              </div>
            )}
            <form onSubmit={handlePrompt}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Password</label>
                <div className="password-field">
                  <input
                    type={showPromptPassword ? 'text' : 'password'} className="text-input"
                    placeholder="Enter room password..."
                    value={promptPassword} onChange={e => setPromptPassword(e.target.value)}
                    required autoFocus
                  />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowPromptPassword(!showPromptPassword)}
                    aria-label={showPromptPassword ? 'Hide password' : 'Show password'}>
                    {showPromptPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn-back" style={{ padding: '10px 20px', borderRadius: 8 }} onClick={onCancelPrompt}>Cancel</button>
                <button type="submit" className="btn-primary">Join Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE ROOM MODAL ── */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setIsCreateModalOpen(false); }}>
          <div className="panel-card glass modal-content" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 8v8M8 12h8" />
                </svg>
                Create New Room
              </h3>
              <button type="button" className="db-modal-close" onClick={() => setIsCreateModalOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              if (!newRoomName.trim()) return;
              if (!newRoomPassword || newRoomPassword.length < 6) {
                showToast('Password must be at least 6 characters.', 'error');
                return;
              }
              setCreating(true);
              const createdRoom = await onCreateRoom(newRoomName.trim(), newRoomPassword);
              setCreating(false);
              if (createdRoom && sidebarFilter === 'starred') {
                toggleStar(createdRoom.roomId);
              }
              setNewRoomName('');
              setNewRoomPassword('');
              setIsCreateModalOpen(false);
            }}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Room Name</label>
                <input type="text" className="text-input" placeholder="Enter room name" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} required autoFocus />
              </div>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Password</label>
                <div className="password-field">
                  <input type={showCreatePassword ? 'text' : 'password'} className="text-input" placeholder="Min 6 characters..." value={newRoomPassword} onChange={e => setNewRoomPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowCreatePassword(!showCreatePassword)} aria-label={showCreatePassword ? 'Hide password' : 'Show password'}>
                    {showCreatePassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn-back" style={{ padding: '10px 20px', borderRadius: 8 }} onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Room'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── JOIN ROOM MODAL ── */}
      {isJoinModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setIsJoinModalOpen(false); setJoinRoomId(''); setJoinRoomPassword(''); } }}>
          <div className="panel-card glass modal-content" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join a Room
              </h3>
              <button type="button" className="db-modal-close" onClick={() => { setIsJoinModalOpen(false); setJoinRoomId(''); setJoinRoomPassword(''); }} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {joinError && (
              <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 16 }}>{joinError}</div>
            )}
            <form onSubmit={async e => {
              e.preventDefault();
              if (!joinRoomId.trim() || !joinRoomPassword) return;
              setJoining(true);
              const ok = await onJoinRoom(joinRoomId.trim(), joinRoomPassword);
              setJoining(false);
              if (ok !== false) { setJoinRoomId(''); setJoinRoomPassword(''); setIsJoinModalOpen(false); }
            }}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Room ID</label>
                <input type="text" className="text-input" placeholder="8-digit Room ID..." value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)} required autoFocus />
              </div>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Password</label>
                <div className="password-field">
                  <input type={showJoinPassword ? 'text' : 'password'} className="text-input" placeholder="Room password..." value={joinRoomPassword} onChange={e => setJoinRoomPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowJoinPassword(!showJoinPassword)} aria-label={showJoinPassword ? 'Hide password' : 'Show password'}>
                    {showJoinPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn-back" style={{ padding: '10px 20px', borderRadius: 8 }} onClick={() => { setIsJoinModalOpen(false); setJoinRoomId(''); setJoinRoomPassword(''); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={joining}>{joining ? 'Joining…' : 'Join Room'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmationModal
          message={`Delete "${deleteTarget.name || deleteTarget.roomName}" permanently? This action cannot be undone.`}
          confirmLabel="Delete Room"
          cancelLabel="Cancel"
          isDanger={true}
          onConfirm={async () => {
            const targetRoom = deleteTarget;
            setDeleteTarget(null);
            await onDeleteRoom(targetRoom);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {signOutConfirm && (
        <ConfirmationModal
          title="Sign out?"
          message="You will be returned to the landing page."
          confirmLabel="Sign Out"
          cancelLabel="Cancel"
          isDanger={true}
          onConfirm={() => { setSignOutConfirm(false); onLogout(); }}
          onCancel={() => setSignOutConfirm(false)}
        />
      )}

      <Starfield />
    </>
  );
}
