import { COLORS } from '../constants';

export default function FloatingToolbar({ activeTool, brushColor, brushWidth, paletteOpen, onSetTool, onSetBrushColor, onSetBrushWidth, onTogglePalette, onClosePalette, onClearCanvas }) {
  return (
    <div className="floating-toolbar glass">
      <button className={`toolbar-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => onSetTool('cursor')} title="Pointer (V)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'sticky' ? 'active' : ''}`} onClick={() => onSetTool('sticky')} title="Sticky Note (S)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M16 8h-8v8" /><path d="M8 8h8v8" /><path d="M15 3v4a1 1 0 0 0 1 1h4" /><path d="m14.3 14.3 5.7 5.7" />
        </svg>
      </button>
      <div className="toolbar-divider" />
      <button className={`toolbar-btn ${activeTool === 'draw' ? 'active' : ''}`} onClick={() => onSetTool('draw')} title="Pen (P)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button className={`toolbar-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => onSetTool('eraser')} title="Eraser (E)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L16 17" />
          <path d="M6.5 13.5 12 19" />
        </svg>
      </button>
      <div className="color-picker-wrapper">
        <div className="brush-color-indicator" style={{ backgroundColor: brushColor }} onClick={onTogglePalette} title="Choose brush color" />
        {paletteOpen && (
          <div className="brush-palette-dropdown glass">
            {COLORS.map(c => (
              <div key={c} className="palette-dot" style={{ backgroundColor: c }} onClick={() => { onSetBrushColor(c); if (onClosePalette) onClosePalette(); }} />
            ))}
          </div>
        )}
      </div>
      <input type="range" min="2" max="20" value={brushWidth} onChange={(e) => onSetBrushWidth(parseInt(e.target.value, 10))} style={{ width: '80px', accentColor: brushColor }} title={`Brush Size: ${brushWidth}px`} />
      <div className="toolbar-divider" />
      <button className="toolbar-btn" onClick={() => { if (window.confirm('Clear the entire collaborative canvas for everyone?')) onClearCanvas(); }} title="Clear Collaborative Canvas">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
