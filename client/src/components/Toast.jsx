import { useState, useEffect } from 'react';
import { setToastHandler } from '../utils/toast';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = (message, type) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => setToastHandler(add), []);

  return (
    <>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
