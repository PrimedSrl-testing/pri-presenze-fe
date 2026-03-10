// client/src/App.jsx
// ─────────────────────────────────────────────────────────────
// Root dell'applicazione: Provider di contesto + routing
// ─────────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import Shell from '@/components/layout/Shell';
import LoginPage from '@/components/pages/LoginPage';
import DipendentePage from '@/components/pages/DipendentePage';
import ManagerPage from '@/components/pages/ManagerPage';
import HRPage from '@/components/pages/HRPage';
import DirPage from '@/components/pages/DirPage';
import NotFoundPage from '@/components/pages/NotFoundPage';

// ── Guard per route protette ──────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { auth } = useApp();

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ── Redirect root basato sul ruolo ────────────────────────────
function RoleRedirect() {
  const { auth } = useApp();
  if (!auth.user) return <Navigate to="/login" replace />;

  const roleHome = {
    dip:  '/me',
    mgr:  '/manager',
    hr:   '/hr',
    dir:  '/dir',
    prod: '/manager',
  };
  return <Navigate to={roleHome[auth.user.role] || '/login'} replace />;
}

// ── Routing principale ────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* Pubblica */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root → redirect per ruolo */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Shell avvolge tutte le route autenticate */}
        <Route element={<Shell />}>

          {/* ── Dipendente ── */}
          <Route
            path="/me"
            element={
              <ProtectedRoute allowedRoles={['dip', 'mgr', 'hr', 'dir', 'prod']}>
                <DipendentePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me/timesheet/:month"
            element={
              <ProtectedRoute allowedRoles={['dip', 'mgr', 'hr', 'dir', 'prod']}>
                <DipendentePage />
              </ProtectedRoute>
            }
          />

          {/* ── Manager / Responsabile ── */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['mgr', 'hr', 'dir', 'prod']}>
                <ManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/:section"
            element={
              <ProtectedRoute allowedRoles={['mgr', 'hr', 'dir', 'prod']}>
                <ManagerPage />
              </ProtectedRoute>
            }
          />

          {/* ── HR ── */}
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/:section"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/employees/:id"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRPage />
              </ProtectedRoute>
            }
          />

          {/* ── Direzione ── */}
          <Route
            path="/dir"
            element={
              <ProtectedRoute allowedRoles={['dir']}>
                <DirPage />
              </ProtectedRoute>
            }
          />

        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppProvider>
  );
}
