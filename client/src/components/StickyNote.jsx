import { STICKY_COLORS } from '../constants';

export default function StickyNote({ note, onNoteMouseDown, onNoteUpdate, onNoteDelete }) {
  return (
    <div
      className="sticky-note-element"
      style={{ left: note.x, top: note.y, backgroundColor: note.color || '#FFEAA7', color: '#11131c' }}
      onMouseDown={(e) => onNoteMouseDown(note.id, e)}
    >
      <div className="sticky-note-header">
        <span>By {note.creator_name}</span>
        <button className="sticky-note-delete-btn" onClick={() => onNoteDelete(note.id)} title="Delete Note">✕</button>
      </div>
      <textarea
        className="sticky-note-textarea"
        value={note.text || ''}
        onChange={(e) => onNoteUpdate(note.id, e.target.value, note.color)}
        placeholder="Type note..."
      />
      <div className="sticky-note-footer">
        {STICKY_COLORS.map(col => (
          <div key={col} className="sticky-color-dot" style={{ backgroundColor: col }} onClick={() => onNoteUpdate(note.id, note.text, col)} />
        ))}
      </div>
    </div>
  );
}
