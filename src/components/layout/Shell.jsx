// client/src/components/layout/Shell.jsx
// ─────────────────────────────────────────────────────────────
// Layout principale: Sidebar desktop + Bottom nav mobile +
// area contenuto. Avvolge tutte le route autenticate.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ROLE_LABELS, ROLE_COLORS } from '@/data/users';
import KvStatusBadge from '@/components/ui/KvStatusBadge';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Navigazione per ruolo
const NAV_ITEMS = {
  dip: [
    { to: '/me',      label: 'La mia scheda',  icon: '👤' },
  ],
  mgr: [
    { to: '/me',      label: 'La mia scheda',  icon: '👤' },
    { to: '/manager', label: 'Il mio team',    icon: '👥' },
  ],
  hr: [
    { to: '/hr',      label: 'Dashboard HR',   icon: '🏢' },
    { to: '/manager', label: 'Presenze',        icon: '📋' },
    { to: '/me',      label: 'Profilo',         icon: '👤' },
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

export default function Shell() {
  const { auth, logout, toggleTheme, theme, toasts, hideToast, confirmDialog, hideConfirm } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const user  = auth.user;
  const items = NAV_ITEMS[user?.role] || [];
  const roleColor = ROLE_COLORS[user?.role] || '#6366f1';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`shell ${theme}`} data-theme={theme}>

      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark" style={{ color: roleColor }}>⬡</span>
          {sidebarOpen && <span className="sidebar-logo-text">PRIMED <span style={{ color: roleColor }}>HR</span></span>}
        </div>

        {/* Badge utente */}
        {sidebarOpen && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: roleColor + '22', color: roleColor }}>
              {user?.ini || '?'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role" style={{ color: roleColor }}>
                {ROLE_LABELS[user?.role]}
              </div>
            </div>
          </div>
        )}

        {/* Navigazione */}
        <nav className="sidebar-nav">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/me'}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={({ isActive }) => isActive ? { '--nav-color': roleColor } : {}}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="sidebar-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="sidebar-footer">
          <KvStatusBadge />
          <button className="sidebar-action-btn" onClick={toggleTheme} title="Cambia tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="sidebar-action-btn sidebar-action-btn--collapse"
            onClick={() => setSidebarOpen(s => !s)}
            title={sidebarOpen ? 'Chiudi sidebar' : 'Apri sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <button className="sidebar-action-btn sidebar-action-btn--logout"
            onClick={handleLogout} title="Esci"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ── Contenuto principale ──────────────────────────── */}
      <main className="shell-main">
        <Outlet />
      </main>

      {/* ── Bottom nav (mobile) ───────────────────────────── */}
      <nav className="bottom-nav">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/me'}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
        <button className="bottom-nav-item" onClick={handleLogout}>
          <span>🚪</span>
          <span className="bottom-nav-label">Esci</span>
        </button>
      </nav>

      {/* ── Toast container ──────────────────────────────── */}
      <div className="toast-container">
        {toasts.map(t => (
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
