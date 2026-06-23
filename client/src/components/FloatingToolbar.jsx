import { useState, useRef, useCallback } from 'react';
import { TOOL_COLORS, BRUSH_SIZES, EMOJIS } from '../constants';
import { useClickOutside } from '../utils/useClickOutside';
import { downloadBoardScreenshot } from '../utils/downloadBoard';
import { showToast } from '../utils/toast';

function PopoverPanel({ show, onClose, children, className = '' }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  if (!show) return null;
  return (
    <div ref={ref} className={`toolbar-popover glass ${className}`}>
      {children}
    </div>
  );
}

export default function FloatingToolbar({
  activeTool, brushColor, brushWidth, onSetTool, onSetBrushColor, onSetBrushWidth, onClearCanvas, onClearBoard, onSendReaction, onUndo, canvasRef, allowDrawing = true, allowStickyNotes = true
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showClear, setShowClear] = useState(false);

  const emojiBtnRef = useRef(null);
  const colorBtnRef = useRef(null);
  const sizeBtnRef = useRef(null);

  const toggleEmoji = useCallback(() => setShowEmoji(v => !v), []);
  const toggleColor = useCallback(() => setShowColor(v => !v), []);
  const toggleSize = useCallback(() => setShowSize(v => !v), []);

  const handleSendReaction = useCallback((emoji) => {
    onSendReaction?.(emoji);
    setShowEmoji(false);
  }, [onSendReaction]);

  return (
    <>
    <div className="floating-toolbar glass">
      <button className={`toolbar-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => onSetTool('cursor')} title="Pointer (V)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'hand' ? 'active' : ''}`} onClick={() => onSetTool('hand')} title="Hand / Pan (H)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
          <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.21 0-4.21-.9-5.66-2.34L2.5 15.5a1.5 1.5 0 0 1 2.12-2.12L6 14.66" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'draw' ? 'active' : ''}${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onSetTool('draw')} title={allowDrawing ? "Pen (P)" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'line' ? 'active' : ''}${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onSetTool('line')} title={allowDrawing ? "Line (L)" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'rect' ? 'active' : ''}${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onSetTool('rect')} title={allowDrawing ? "Rectangle (R)" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="14" x="3" y="5" rx="1" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'circle' ? 'active' : ''}${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onSetTool('circle')} title={allowDrawing ? "Circle (C)" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'text' ? 'active' : ''}${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onSetTool('text')} title={allowDrawing ? "Text (T)" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" />
        </svg>
      </button>
      <div className="toolbar-divider" />
      <button className={`toolbar-btn ${activeTool === 'eraser' ? 'active' : ''}${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onSetTool('eraser')} title={allowDrawing ? "Eraser (E)" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L16 17" />
          <path d="M6.5 13.5 12 19" />
        </svg>
      </button>
      <div className="toolbar-divider" />
      <div className="toolbar-popover-group" ref={emojiBtnRef}>
        <button className="toolbar-btn" onClick={toggleEmoji} title="Emoji reaction">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" />
          </svg>
        </button>
        <PopoverPanel show={showEmoji} onClose={() => setShowEmoji(false)} className="popover-emoji">
          {EMOJIS.map(emoji => (
            <button key={emoji} className="reaction-btn" onClick={() => handleSendReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </PopoverPanel>
      </div>
      <div className="toolbar-popover-group" ref={colorBtnRef}>
        <button className="toolbar-btn" onClick={toggleColor} title="Brush color">
          <div className="toolbar-color-indicator" style={{ backgroundColor: brushColor }} />
        </button>
        <PopoverPanel show={showColor} onClose={() => setShowColor(false)} className="popover-color">
          {TOOL_COLORS.map(c => (
            <div key={c} className={`toolbar-color-dot ${brushColor === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => { onSetBrushColor(c); setShowColor(false); }} title={c} />
          ))}
        </PopoverPanel>
      </div>
      <div className="toolbar-popover-group" ref={sizeBtnRef}>
        <button className="toolbar-btn" onClick={toggleSize} title={`Brush size: ${brushWidth}px`}>
          <div className="toolbar-size-indicator">
            <div className="toolbar-size-indicator-dot" style={{ width: Math.max(4, brushWidth), height: Math.max(4, brushWidth) }} />
          </div>
        </button>
        <PopoverPanel show={showSize} onClose={() => setShowSize(false)} className="popover-size">
          {BRUSH_SIZES.map(s => (
            <div key={s} className={`toolbar-size-opt ${brushWidth === s ? 'active' : ''}`} onClick={() => { onSetBrushWidth(s); setShowSize(false); }} title={`${s}px`}>
              <div className="toolbar-size-dot" style={{ width: Math.max(4, s), height: Math.max(4, s) }} />
            </div>
          ))}
        </PopoverPanel>
      </div>
      <div className="toolbar-divider" />
      <button className={`toolbar-btn ${activeTool === 'sticky' ? 'active' : ''}${!allowStickyNotes ? ' disabled' : ''}`} onClick={() => allowStickyNotes && onSetTool('sticky')} title={allowStickyNotes ? "Sticky Note (S)" : "Sticky notes disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M16 8h-8v8" /><path d="M8 8h8v8" /><path d="M15 3v4a1 1 0 0 0 1 1h4" /><path d="m14.3 14.3 5.7 5.7" />
        </svg>
      </button>
      <button className={`toolbar-btn${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && onUndo?.()} title={allowDrawing ? "Undo (Ctrl+Z)" : "Drawing is disabled by the room owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <button className="toolbar-btn" onClick={() => downloadBoardScreenshot(canvasRef)} title="Download board as PNG">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      <button className={`toolbar-btn${!allowDrawing ? ' disabled' : ''}`} onClick={() => allowDrawing && setShowClear(true)} title={allowDrawing ? "Clear Canvas" : "Drawing disabled by owner"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>

      {showClear && (
        <div className="modal-overlay" onClick={() => setShowClear(false)}>
          <div className="panel-card glass modal-content" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '24px', lineHeight: '1.5' }}>
              What do you want to clear?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-primary"
                onClick={() => { onClearCanvas(); setShowClear(false); showToast('Drawings cleared', 'success'); }}
              >
                Clear Drawings Only
              </button>
              <button
                className="btn-primary"
                style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}
                onClick={() => { onClearBoard?.(); setShowClear(false); showToast('Board cleared', 'success'); }}
              >
                Clear Board
              </button>
              <button className="btn-back" style={{ padding: '10px 24px', borderRadius: '8px', justifyContent: 'center' }} onClick={() => setShowClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
