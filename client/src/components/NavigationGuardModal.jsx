import { useEffect, useRef } from 'react';

export default function NavigationGuardModal({
  title,
  message,
  cancelText = 'Stay Here',
  confirmText = 'Leave Room',
  confirmDanger = true,
  onCancel,
  onConfirm,
  busy = false
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="navigation-guard-backdrop" onClick={onCancel}>
      <div
        className="navigation-guard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-guard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="nav-guard-title">{title}</h3>
        <p>{message}</p>
        <div className="navigation-guard-actions">
          <button
            ref={cancelRef}
            className="navigation-guard-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            className={confirmDanger ? 'navigation-guard-danger' : 'navigation-guard-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Leaving...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
