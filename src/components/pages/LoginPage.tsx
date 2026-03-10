// src/components/pages/LoginPage.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { MOCK_USERS, ROLE_LABELS, ROLE_COLORS } from '@/data/users';

export default function LoginPage() {
  const { login, auth } = useApp();
  const router = useRouter();
  const [mat, setMat] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(mat.trim(), password.trim());
    if (ok) router.replace('/');
  };

  const quickLogin = async (u: { mat: string; password: string }) => {
    const ok = await login(u.mat, u.password);
    if (ok) router.replace('/');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo-mark">⬡</span>
          <div>
            <div className="login-logo-title">PRIMED HR</div>
            <div className="login-logo-sub">Sistema Presenze & Gestione HR</div>
          </div>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="mat">Matricola</label>
            <input
              id="mat"
              className="form-input"
              type="text"
              value={mat}
              onChange={(e) => setMat(e.target.value)}
              placeholder="Es: 999"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pwd">Password</label>
            <input
              id="pwd"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {auth.error && (
            <div className="login-error" role="alert">{auth.error}</div>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={auth.isLoading}
          >
            {auth.isLoading ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        {/* Quick login demo */}
        <div className="login-demo">
          <div className="login-demo-title">Accesso rapido (demo)</div>
          <div className="login-demo-grid">
            {MOCK_USERS.map((u) => (
              <button
                key={u.id}
                className="login-demo-btn"
                style={{
                  background: ROLE_COLORS[u.role] + '15',
                  borderColor: ROLE_COLORS[u.role] + '40',
                } as React.CSSProperties}
                onClick={() => quickLogin(u)}
                disabled={auth.isLoading}
              >
                <span
                  className="login-demo-ini"
                  style={{ background: ROLE_COLORS[u.role] + '30', color: ROLE_COLORS[u.role] }}
                >
                  {u.ini}
                </span>
                <div>
                  <div className="login-demo-name">{u.name}</div>
                  <div className="login-demo-role" style={{ color: ROLE_COLORS[u.role] }}>
                    {ROLE_LABELS[u.role]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
