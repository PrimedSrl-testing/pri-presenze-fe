// client/src/components/ui/Toast.jsx
import { useEffect, useState } from 'react';

const TYPE_CFG = {
  ok:    { icon: '✅', bg: '#10b981' },
  error: { icon: '❌', bg: '#ef4444' },
  warn:  { icon: '⚠️', bg: '#f59e0b' },
  info:  { icon: 'ℹ️', bg: '#6366f1' },
};

export default function Toast({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  const cfg = TYPE_CFG[toast.type] || TYPE_CFG.info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`toast toast--${visible ? 'visible' : 'hidden'}`}
      style={{ '--toast-color': cfg.bg }}
      role="alert"
    >
      <span className="toast-icon">{cfg.icon}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleClose} aria-label="Chiudi">✕</button>
    </div>
  );
}
