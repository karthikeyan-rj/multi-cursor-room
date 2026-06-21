import { useEffect } from 'react';

export default function ConfirmationModal({ message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', isLightBoard }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className={`confirm-modal ${isLightBoard ? 'confirm-modal-light' : ''}`} onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-leave-btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}