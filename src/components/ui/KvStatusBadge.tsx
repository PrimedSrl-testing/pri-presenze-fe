// src/components/ui/KvStatusBadge.tsx
'use client';

import { useApp } from '@/context/AppContext';
import type { KvStatus } from '@/context/AppContext';

const STATUS_CFG: Record<KvStatus, { dot: string; label: string }> = {
  idle:    { dot: '#94a3b8', label: '—'        },
  loading: { dot: '#f59e0b', label: 'Carico…'  },
  saving:  { dot: '#f59e0b', label: 'Salvo…'   },
  saved:   { dot: '#10b981', label: 'Salvato'  },
  error:   { dot: '#ef4444', label: 'Errore'   },
};

export default function KvStatusBadge() {
  const { kvStatus } = useApp();
  const cfg = STATUS_CFG[kvStatus] ?? STATUS_CFG.idle;

  return (
    <span className="kv-badge" title={`Sync: ${kvStatus}`}>
      <span className="kv-badge-dot" style={{ background: cfg.dot }} />
      <span className="kv-badge-label">{cfg.label}</span>
    </span>
  );
}
