import { useRef, useEffect } from 'react';

export default function ChatDrawer({ open, remoteCursors, username, chatHistory, chatInput, onChatInput, onSendChat, onClose }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div className={`chat-drawer glass ${open ? '' : 'closed'}`}>
      <div className="chat-header">
        <h3 className="chat-title">Chat & Online List</h3>
        <button className="toolbar-btn" style={{ width: '28px', height: '28px', borderRadius: '50%' }} onClick={onClose}>✕</button>
      </div>
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border-light)',
        background: 'rgba(255, 255, 255, 0.01)', display: 'flex', alignItems: 'center',
        gap: '8px', fontSize: '12px', color: 'var(--text-secondary)'
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e',
          display: 'inline-block', boxShadow: '0 0 8px #22c55e'
        }} />
        {Object.keys(remoteCursors).length + 1} active in room
      </div>
      <div className="chat-message-list" ref={listRef}>
        {chatHistory.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px',
            padding: '40px 20px', lineHeight: '1.6'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
            No messages yet<br />Start the conversation!
          </div>
        )}
        {chatHistory.map((msg, index) => {
          const isMe = msg.sender_name === username;
          return (
            <div key={msg.id || index} className={`chat-message-item ${isMe ? 'me' : ''}`}>
              <span className="message-sender" style={{ color: msg.sender_color }}>
                {msg.sender_name} {isMe && '(You)'}
              </span>
              <div className="message-bubble">{msg.message}</div>
            </div>
          );
        })}
      </div>
      <form className="chat-input-wrapper" onSubmit={onSendChat}>
        <input type="text" className="text-input" value={chatInput} onChange={(e) => onChatInput(e.target.value)} placeholder="Type message..." maxLength={140} />
        <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
    </div>
  );
}
