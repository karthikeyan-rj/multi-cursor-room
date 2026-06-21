import { useRef, useEffect, useState, useCallback } from 'react';
import FileUploadButton from './FileUploadButton';
import FileMessage from './FileMessage';
import ChatEmojiPicker from './ChatEmojiPicker';
import { useClickOutside } from '../utils/useClickOutside';
import useResizablePanel from '../hooks/useResizablePanel';
import { unlockMessageSound } from '../utils/sound';

export default function ChatDrawer({ open, remoteCursors, username, userId, chatHistory, chatInput, onChatInput, onSendChat, onClose, roomId, isLightBoard, replyingTo, onSetReplyTarget, onCancelReply }) {
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiContainerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem('chat_muted') === 'true');

  const { width, isMobile, onMouseDown: onResizeStart } = useResizablePanel({
    initialWidth: 320,
    minWidth: 320,
    maxWidth: 600,
    maxVw: 45
  });

  const closeEmoji = useCallback(() => setShowEmojiPicker(false), []);
  useClickOutside(emojiContainerRef, closeEmoji);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [chatInput]);

  const handleEmojiSelect = useCallback((emoji) => {
    onChatInput(chatInput + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [chatInput, onChatInput]);

  const handleTextareaKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendChat(e);
    }
  }, [onSendChat]);

  const handleDoubleClick = useCallback((msg) => {
    const target = {
      id: msg.id || msg._id,
      senderId: msg.sender_id || msg.senderId,
      senderName: msg.sender_name || msg.senderName || 'Unknown',
      text: (msg.type === 'file' ? msg.file_name || msg.original_name : null) || msg.message || msg.text || '[File]'
    };
    onSetReplyTarget(target);
  }, [onSetReplyTarget]);

  const toggleMute = useCallback(async () => {
    await unlockMessageSound();
    const next = !muted;
    setMuted(next);
    localStorage.setItem('chat_muted', next ? 'true' : '');
  }, [muted]);

  const getReplyPreviewText = (msg) => {
    if (msg.type === 'file') return msg.file_name || msg.original_name || '[File]';
    const text = msg.message || msg.text || '';
    return text.length > 80 ? text.substring(0, 80) + '…' : text;
  };

  const drawerStyle = isMobile ? {} : { width: `${width}px` };

  return (
    <div className={`chat-drawer glass ${isLightBoard ? 'chat-on-light-board' : 'chat-on-dark-board'} ${open ? '' : 'closed'}`} style={drawerStyle}>
      {!isMobile && <div className="chat-resize-handle" onMouseDown={onResizeStart} />}

      <div className="chat-header">
        <h3 className="chat-title">Chat</h3>
        <div className="chat-header-right">
          <button
            type="button"
            className="toolbar-btn chat-mute-btn"
            onClick={toggleMute}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <span className="chat-active-badge">
            <span className="chat-active-dot" />
            {Object.keys(remoteCursors).length + 1} active
          </span>
          <button className="toolbar-btn chat-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="chat-message-list" ref={listRef}>
        {chatHistory.length === 0 && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            No messages yet<br />Start the conversation!
          </div>
        )}
        {chatHistory.map((msg, index) => {
          const isOwnMessage = msg.sender_id === userId;
          if (msg.type === 'file') {
            return (
              <div
                key={msg.id || index}
                className={`chat-message-row ${isOwnMessage ? 'own' : 'other'}`}
                onDoubleClick={() => handleDoubleClick(msg)}
              >
                <div className="chat-message-bubble file-bubble">
                  {!isOwnMessage && (
                    <div className="chat-message-sender">{msg.sender_name}</div>
                  )}
                  {msg.reply_to && (
                    <div className="message-reply-box">
                      <div className="reply-sender">{msg.reply_to.senderName}</div>
                      <div className="reply-text">{msg.reply_to.text}</div>
                    </div>
                  )}
                  <FileMessage msg={msg} />
                </div>
              </div>
            );
          }
          return (
            <div
              key={msg.id || index}
              className={`chat-message-row ${isOwnMessage ? 'own' : 'other'}`}
              onDoubleClick={() => handleDoubleClick(msg)}
            >
              <div className={`chat-message-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'}`}>
                {!isOwnMessage && (
                  <div className="chat-message-sender" style={{ color: msg.sender_color }}>{msg.sender_name}</div>
                )}
                {msg.reply_to && (
                  <div className={`message-reply-box ${isOwnMessage ? 'reply-own' : 'reply-other'}`}>
                    <div className="reply-sender">{msg.reply_to.senderName}</div>
                    <div className="reply-text">{msg.reply_to.text}</div>
                  </div>
                )}
                <div className="message-text">{msg.message}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input-area">
        {replyingTo && (
          <div className="chat-reply-preview">
            <div className="chat-reply-preview-content">
              <span className="chat-reply-label">Replying to {replyingTo.senderName}</span>
              <span className="chat-reply-text">{replyingTo.text}</span>
            </div>
            <button
              type="button"
              className="chat-reply-cancel"
              onClick={onCancelReply}
              title="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}
        <FileUploadButton roomId={roomId} />
        <div className="chat-emoji-wrapper" ref={emojiContainerRef}>
          <button
            type="button"
            className="toolbar-btn chat-emoji-toggle"
            onClick={() => setShowEmojiPicker(v => !v)}
            title="Add emoji"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" />
            </svg>
          </button>
          {showEmojiPicker && (
            <ChatEmojiPicker onEmojiSelect={handleEmojiSelect} />
          )}
        </div>
        <form className="chat-input-form" onSubmit={onSendChat}>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={chatInput}
            onChange={(e) => onChatInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type a message..."
            rows={1}
          />
          <button type="submit" className="btn-primary chat-send-btn" title="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}