import { useRef, useEffect, useState, useCallback } from 'react';
import FileUploadButton from './FileUploadButton';
import FileMessage from './FileMessage';
import ChatEmojiPicker from './ChatEmojiPicker';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import { useClickOutside } from '../utils/useClickOutside';
import useResizablePanel from '../hooks/useResizablePanel';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { unlockAudio } from '../utils/sound';
import { showToast } from '../utils/toast';
import { SERVER_URL } from '../config';

export default function ChatDrawer({ open, remoteCursors, username, userId, chatHistory, chatInput, onChatInput, onSendChat, onClose, roomId, isLightBoard, replyingTo, onSetReplyTarget, onCancelReply, allowChat = true, allowFiles = true, activeUserCount }) {
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiContainerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem('chat_muted') === 'true');

  const [copiedMsgId, setCopiedMsgId] = useState(null);

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

  const handleCopyMessage = useCallback(async (msg) => {
    const textToCopy =
      msg.text ||
      msg.message ||
      msg.content ||
      msg.fileUrl ||
      msg.file_name ||
      msg.original_name ||
      msg.fileName ||
      '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMsgId(msg.id || msg._id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message', err);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    await unlockAudio();
    const next = !muted;
    setMuted(next);
    localStorage.setItem('chat_muted', next ? 'true' : '');
  }, [muted]);

  const voice = useVoiceRecorder();
  const [voiceUploading, setVoiceUploading] = useState(false);

  const handleSendVoice = useCallback(async () => {
    if (!voice.audioBlob || voiceUploading) return;
    const token = localStorage.getItem('cursor_room_token');
    setVoiceUploading(true);
    try {
      const file = new File([voice.audioBlob], `voice-message-${Date.now()}.webm`, {
        type: voice.audioBlob.type || 'audio/webm'
      });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duration', Math.floor(voice.recordingTime));
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/voice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        voice.reset();
      } else {
        showToast(data.error || 'Failed to send voice message.', 'error');
      }
    } catch {
      showToast('Failed to send voice message.', 'error');
    } finally {
      setVoiceUploading(false);
    }
  }, [voice, voiceUploading, roomId]);

  const getReplyPreviewText = (msg) => {
    if (msg.type === 'file') return msg.file_name || msg.original_name || '[File]';
    const text = msg.message || msg.text || '';
    return text.length > 80 ? text.substring(0, 80) + '…' : text;
  };

  const drawerStyle = isMobile ? {} : { width: `${width}px` };

  const actionsMarkup = (msg) => (
    <div className="message-actions">
      <button
        className="msg-action-btn msg-action-copy"
        onClick={(e) => { e.stopPropagation(); handleCopyMessage(msg); }}
        title={copiedMsgId === (msg.id || msg._id) ? 'Copied!' : 'Copy'}
        aria-label="Copy message"
      >
        {copiedMsgId === (msg.id || msg._id) ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><rect x="4" y="4" width="11" height="11" rx="2" /></svg>
        )}
      </button>
      <button
        className="msg-action-btn msg-action-reply"
        onClick={(e) => { e.stopPropagation(); handleDoubleClick(msg); }}
        title="Reply"
        aria-label="Reply to message"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
      </button>
    </div>
  );

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
            {typeof activeUserCount === 'number' ? activeUserCount : Object.keys(remoteCursors).length + 1} active
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
          if (msg.type === 'voice') {
            return (
              <div
                key={msg.id || index}
                className={`chat-message-row ${isOwnMessage ? 'own' : 'other'}`}
                onDoubleClick={() => handleDoubleClick(msg)}
              >
                <div className={`chat-message-bubble voice-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'} ${copiedMsgId === (msg.id || msg._id) ? 'msg-copied' : ''}`}>
                  {!isOwnMessage && (
                    <div className="chat-message-sender" style={{ color: msg.sender_color }}>{msg.sender_name}</div>
                  )}
                  {msg.reply_to && (
                    <div className={`message-reply-box ${isOwnMessage ? 'reply-own' : 'reply-other'}`}>
                      <div className="reply-sender">{msg.reply_to.senderName}</div>
                      <div className="reply-text">{msg.reply_to.text}</div>
                    </div>
                  )}
                  <VoiceMessagePlayer
                    src={msg.audioUrl || msg.fileUrl}
                    duration={msg.duration}
                    isOwn={isOwnMessage}
                  />
                </div>
                {actionsMarkup(msg)}
              </div>
            );
          }
          if (msg.type === 'file') {
            return (
              <div
                key={msg.id || index}
                className={`chat-message-row ${isOwnMessage ? 'own' : 'other'}`}
                onDoubleClick={() => handleDoubleClick(msg)}
              >
                <div className={`chat-message-bubble file-bubble ${copiedMsgId === (msg.id || msg._id) ? 'msg-copied' : ''}`}>
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
                {actionsMarkup(msg)}
              </div>
            );
          }
          return (
            <div
              key={msg.id || index}
              className={`chat-message-row ${isOwnMessage ? 'own' : 'other'}`}
              onDoubleClick={() => handleDoubleClick(msg)}
            >
              <div className={`chat-message-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'} ${copiedMsgId === (msg.id || msg._id) ? 'msg-copied' : ''}`}>
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
              {actionsMarkup(msg)}
            </div>
          );
        })}
      </div>

      <div className="chat-input-area">
        {replyingTo && (
          <div className="chat-reply-preview">
            <div className="chat-reply-preview-bar" />
            <div className="chat-reply-preview-body">
              <div className="chat-reply-preview-title">
                Replying to {replyingTo.senderName}
              </div>
              <div className="chat-reply-preview-text">
                {getReplyPreviewText(replyingTo)}
              </div>
            </div>
            <button
              type="button"
              className="chat-reply-preview-close"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              ×
            </button>
          </div>
        )}
        {allowChat ? (
          <div className="chat-input-row">
            {allowFiles ? <FileUploadButton roomId={roomId} /> : <div className="chat-spacer-btn" />}

            {voice.isRecording ? (
              <div className="recording-composer">
                <button
                  type="button"
                  className="recording-cancel-btn"
                  onClick={voice.cancelRecording}
                  aria-label="Cancel recording"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <div className="recording-indicator">
                  <span className="recording-dot" />
                  <span className="recording-timer">
                    {String(Math.floor(voice.recordingTime / 60)).padStart(2, '0')}:{String(voice.recordingTime % 60).padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  className="recording-send-btn"
                  onClick={voice.stopRecording}
                  aria-label="Stop recording"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                </button>
              </div>
            ) : voice.audioUrl ? (
              <div className="recording-composer">
                <button
                  type="button"
                  className="recording-cancel-btn"
                  onClick={voice.cancelRecording}
                  aria-label="Cancel"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <div className="recording-preview-player">
                  <VoiceMessagePlayer src={voice.audioUrl} />
                </div>
                <button
                  type="button"
                  className="recording-send-btn"
                  onClick={handleSendVoice}
                  disabled={voiceUploading}
                  aria-label={voiceUploading ? 'Sending...' : 'Send voice message'}
                >
                  {voiceUploading ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="recording-spinner">
                      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22,2 11,13" /><polyline points="22,2 15,22 11,13 2,9" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="chat-emoji-wrapper" ref={emojiContainerRef}>
                  <button
                    type="button"
                    className="chat-emoji-toggle"
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
                  {chatInput.trim() ? (
                    <button type="submit" className="chat-send-btn" title="Send" aria-label="Send message">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polyline points="22 2 15 22 11 13 2 9" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chat-mic-btn"
                      onClick={voice.startRecording}
                      disabled={!!voice.error}
                      title="Record voice message"
                      aria-label="Record voice message"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
        ) : (
          <div className="chat-disabled-msg">Chat is disabled by owner.</div>
        )}
      </div>
    </div>
  );
}
