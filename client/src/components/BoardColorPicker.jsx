import { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../utils/useClickOutside';

const BOARD_COLORS = [
  { value: null, label: 'Default' },
  { value: '#000000', label: 'Black' },
  { value: '#0f172a', label: 'Dark Navy' },
  { value: '#ffffff', label: 'White' },
  { value: '#fef3c7', label: 'Cream' },
  { value: '#d1fae5', label: 'Mint' },
  { value: '#dbeafe', label: 'Sky' },
  { value: '#e9d5ff', label: 'Lavender' },
];

export default function BoardColorPicker({ boardColor, onColorChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, useCallback(() => setOpen(false), []));

  const handleClick = () => {
    if (disabled) return;
    setOpen(v => !v);
  };

  return (
    <div className="board-color-picker-group" ref={ref}>
      <button
        className={`board-color-picker-btn${disabled ? ' is-disabled' : ''}`}
        onClick={handleClick}
        title={disabled ? 'Board color change is disabled' : 'Board background color'}
      >
        <div
          className="board-color-picker-dot"
          style={{
            background: boardColor || 'transparent',
            border: boardColor ? '2px solid rgba(255,255,255,0.3)' : '2px dashed rgba(255,255,255,0.4)',
          }}
        />
      </button>
      {open && (
        <div className="board-color-picker-popover">
          {BOARD_COLORS.map(({ value, label }, i) => (
            <button
              key={i}
              className={`board-color-btn${boardColor === value ? ' active' : ''}`}
              data-color={value || 'default'}
              style={{ background: value || 'transparent' }}
              onClick={() => { if (!disabled) { onColorChange(value); setOpen(false); } }}
              title={label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
