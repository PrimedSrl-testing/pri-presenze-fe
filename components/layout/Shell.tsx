// src/components/layout/Shell.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ROLE_LABELS, ROLE_COLORS } from '@/data/users';
import ActiveLink from './ActiveLink';
import KvStatusBadge from '@/components/ui/KvStatusBadge';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  dip: [
    { to: '/me',      label: 'La mia scheda', icon: '👤' },
  ],
  mgr: [
    { to: '/me',      label: 'La mia scheda', icon: '👤' },
    { to: '/manager', label: 'Il mio team',   icon: '👥' },
  ],
  hr: [
    { to: '/hr',      label: 'Dashboard HR',  icon: '🏢' },
    { to: '/manager', label: 'Presenze',       icon: '📋' },
    { to: '/me',      label: 'Profilo',        icon: '👤' },
  ],
  dir: [
    { to: '/dir',     label: 'Dashboard Dir.', icon: '📊' },
    { to: '/me',      label: 'Profilo',         icon: '👤' },
  ],
  prod: [
    { to: '/me',      label: 'La mia scheda',  icon: '👤' },
    { to: '/manager', label: 'Produzione',      icon: '🏭' },
  ],
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const { auth, logout, toggleTheme, theme, toasts, hideToast, confirmDialog, hideConfirm } = useApp();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const user = auth.user;
  const items = NAV_ITEMS[user?.role ?? ''] ?? [];
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? '#6366f1';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className={`shell ${theme}`} data-theme={theme}>

      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark" style={{ color: roleColor }}>⬡</span>
          {sidebarOpen && (
            <span className="sidebar-logo-text">
              PRIMED <span style={{ color: roleColor }}>HR</span>
            </span>
          )}
        </div>

        {/* Badge utente */}
        {sidebarOpen && user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: roleColor + '22', color: roleColor }}>
              {user.ini}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role" style={{ color: roleColor }}>
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </div>
        )}

        {/* Navigazione */}
        <nav className="sidebar-nav">
          {items.map((item) => (
            <ActiveLink
              key={item.to}
              to={item.to}
              end={item.to === '/me'}
              className="sidebar-nav-item"
              activeClassName="active"
              activeStyle={{ '--nav-color': roleColor } as React.CSSProperties}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="sidebar-nav-label">{item.label}</span>}
            </ActiveLink>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="sidebar-footer">
          <KvStatusBadge />
          <button className="sidebar-action-btn" onClick={toggleTheme} title="Cambia tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            className="sidebar-action-btn sidebar-action-btn--collapse"
            onClick={() => setSidebarOpen((s) => !s)}
            title={sidebarOpen ? 'Chiudi sidebar' : 'Apri sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <button
            className="sidebar-action-btn sidebar-action-btn--logout"
            onClick={handleLogout}
            title="Esci"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ── Contenuto principale ──────────────────────────── */}
      <main className="shell-main">
        {children}
      </main>

      {/* ── Bottom nav (mobile) ───────────────────────────── */}
      <nav className="bottom-nav">
        {items.map((item) => (
          <ActiveLink
            key={item.to}
            to={item.to}
            end={item.to === '/me'}
            className="bottom-nav-item"
            activeClassName="active"
          >
            <span>{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </ActiveLink>
        ))}
        <button className="bottom-nav-item" onClick={handleLogout}>
          <span>🚪</span>
          <span className="bottom-nav-label">Esci</span>
        </button>
      </nav>

      {/* ── Toast container ──────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => hideToast(t.id)} />
        ))}
      </div>

      {/* ── Confirm dialog ────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmDialog
          msg={confirmDialog.msg}
          onYes={() => { hideConfirm(); confirmDialog.onYes?.(); }}
          onNo={() => { hideConfirm(); confirmDialog.onNo?.(); }}
        />
      )}
    </div>
  );
}
