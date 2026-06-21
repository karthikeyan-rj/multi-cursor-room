import { useEffect } from 'react';

export default function ConfirmationModal({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', isLightBoard, isDanger }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className={`confirm-modal ${isLightBoard ? 'confirm-modal-light' : ''} ${isDanger ? 'confirm-modal-danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="confirm-title">{title}</h3>}
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`confirm-leave-btn ${isDanger ? 'confirm-danger-btn' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}