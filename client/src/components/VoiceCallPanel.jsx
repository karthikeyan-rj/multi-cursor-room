export default function VoiceCallPanel({ roomId, onClose, voiceCall, isLightBoard }) {
  const {
    isConnected,
    isMuted,
    remoteUsers,
    isJoining,
    error,
    joinVoiceCall,
    leaveVoiceCall,
    toggleMute
  } = voiceCall;

  const glassClass = isLightBoard ? 'glass-on-light' : 'glass-on-dark';

  return (
    <div className={`voice-call-panel ${glassClass}`}>
      <div className="voice-call-header">
        <span className="voice-call-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Voice Call
        </span>
        <button className="voice-call-close" onClick={onClose} title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="voice-call-body">
        {isConnected ? (
          <>
            <div className="voice-call-connected">
              <span className="voice-call-status-badge connected">
                <span className="voice-call-dot" />
                Connected
              </span>
              <span className="voice-call-participant-count">
                {remoteUsers.length + 1} participant{remoteUsers.length + 1 !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="voice-call-controls">
              <button
                className={`voice-call-btn ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                className="voice-call-btn leave"
                onClick={() => { leaveVoiceCall(); onClose(); }}
                title="Leave Call"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
                <span>Leave</span>
              </button>
            </div>
          </>
        ) : isJoining ? (
          <div className="voice-call-join">
            <div className="voice-call-connecting">
              <span className="voice-call-spinner" />
              Connecting...
            </div>
          </div>
        ) : (
          <div className="voice-call-join">
            <div className="voice-call-not-connected">Not connected</div>
            {error && <div className="voice-call-error">{error}</div>}
            <button
              className="voice-call-btn join"
              onClick={() => joinVoiceCall(roomId)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              <span>Join Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
