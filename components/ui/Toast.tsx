// src/components/ui/Toast.tsx
'use client';

import { useEffect, useState } from 'react';
import type { ToastType } from '@/context/AppContext';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastProps {
  toast: ToastItem;
  onClose: () => void;
}

const TYPE_CFG: Record<ToastType, { icon: string; bg: string }> = {
  ok:    { icon: '✅', bg: '#10b981' },
  error: { icon: '❌', bg: '#ef4444' },
  warn:  { icon: '⚠️', bg: '#f59e0b' },
  info:  { icon: 'ℹ️', bg: '#6366f1' },
};

export default function Toast({ toast, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const cfg = TYPE_CFG[toast.type] ?? TYPE_CFG.info;

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
      style={{ '--toast-color': cfg.bg } as React.CSSProperties}
      role="alert"
    >
      <span className="toast-icon">{cfg.icon}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleClose} aria-label="Chiudi">✕</button>
    </div>
  );
}
