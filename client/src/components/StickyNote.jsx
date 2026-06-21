import { useRef, useEffect } from 'react';
import { STICKY_COLORS } from '../constants';

export default function StickyNote({ note, onNoteMouseDown, onNoteUpdate, onNoteDelete }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!note.text) {
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const stop = (e) => e.stopPropagation();

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onNoteDelete(note.id);
  };

  const handleColorClick = (col, e) => {
    e.stopPropagation();
    onNoteUpdate(note.id, note.text, col);
  };

  return (
    <div
      className="sticky-note-element"
      style={{ left: note.x, top: note.y, backgroundColor: note.color || '#FFEAA7', color: '#11131c' }}
      onMouseDown={(e) => onNoteMouseDown(note.id, e)}
    >
      <div className="sticky-note-header">
        <span>By {note.creator_name}</span>
        <button className="sticky-note-delete-btn" onPointerDown={stop} onMouseDown={stop} onClick={handleDeleteClick} title="Delete Note">✕</button>
      </div>
      <textarea
        ref={textareaRef}
        className="sticky-note-textarea"
        value={note.text || ''}
        onChange={(e) => onNoteUpdate(note.id, e.target.value, note.color)}
        onPointerDown={stop}
        onMouseDown={stop}
        onClick={stop}
        onDoubleClick={stop}
        onKeyDown={stop}
        placeholder="Type note..."
      />
      <div className="sticky-note-footer">
        {STICKY_COLORS.map(col => (
          <div key={col} className="sticky-color-dot" style={{ backgroundColor: col }} onClick={(e) => handleColorClick(col, e)} />
        ))}
      </div>
    </div>
  );
}
