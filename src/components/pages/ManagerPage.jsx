// client/src/components/pages/ManagerPage.jsx
// ─────────────────────────────────────────────────────────────
// Vista Manager: panoramica team, approvazioni, presenze
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { EMPLOYEES } from '@/data/employees';
import KpiCard from '@/components/ui/KpiCard';

// Mock: richieste pendenti
const PENDING_REQUESTS = [
  { id: 'r1', mat: '34', nome: 'Luca De Palma',  tipo: 'Ferie',   periodo: '15-19/03/2026', ore: 40, stato: 'in_attesa' },
  { id: 'r2', mat: '72', nome: 'Giulia Leporale', tipo: 'Permesso',periodo: '12/03/2026',    ore: 4,  stato: 'in_attesa' },
];

const STATO_COLORS = { in_attesa: '#f59e0b', approvata: '#10b981', rifiutata: '#ef4444' };

export default function ManagerPage() {
  const { auth, showToast } = useApp();
  const user = auth.user;
  const [activeTab, setActiveTab] = useState('team');
  const [requests, setRequests] = useState(PENDING_REQUESTS);

  // Filtra dipendenti del reparto del manager
  const myTeam = EMPLOYEES.filter(e =>
    e.dept === user?.dept && e.active && e.role !== 'mgr'
  );

  const handleApprove = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, stato: 'approvata' } : r));
    showToast('Richiesta approvata', 'ok');
  };

  const handleReject = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, stato: 'rifiutata' } : r));
    showToast('Richiesta rifiutata', 'warn');
  };

  const pendingCount = requests.filter(r => r.stato === 'in_attesa').length;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reparto {user?.dept}</h1>
          <div className="page-subtitle">Gestione presenze e approvazioni team</div>
        </div>
        {pendingCount > 0 && (
          <span className="badge badge--warning">{pendingCount} richieste in attesa</span>
        )}
      </div>

      {/* KPI */}
      <div className="kpi-grid kpi-grid--4">
        <KpiCard label="Dipendenti"  value={myTeam.length}                         color="var(--blue)"  />
        <KpiCard label="Presenti"    value={myTeam.filter(e => e.status === 'IN').length} color="var(--green)" />
        <KpiCard label="In attesa"   value={pendingCount}                           color="var(--orange)"/>
        <KpiCard label="Reparto"     value={user?.dept || '—'}                      color="var(--purple)" />
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'team',       label: 'Team'                                 },
          { id: 'approvals',  label: `Approvazioni ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
          { id: 'presenze',   label: 'Presenze mese'                        },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Team ── */}
      {activeTab === 'team' && (
        <div className="tab-content">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Mat.</th>
                  <th>Contratto</th>
                  <th>Ore/sett</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {myTeam.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div className="emp-cell">
                        <div className="emp-avatar-sm" style={{ background: emp.col + '22', color: emp.col }}>
                          {emp.ini}
                        </div>
                        <span className="emp-name">{emp.full}</span>
                      </div>
                    </td>
                    <td><span className="mono">{emp.mat}</span></td>
                    <td>{emp.contract}</td>
                    <td>{emp.hours}h</td>
                    <td>
                      <span className={`badge badge--${emp.status === 'IN' ? 'success' : 'neutral'}`}>
                        {emp.status === 'IN' ? 'In forza' : 'Uscito'}
                      </span>
                    </td>
                  </tr>
                ))}
                {myTeam.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      Nessun dipendente trovato per questo reparto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Approvazioni ── */}
      {activeTab === 'approvals' && (
        <div className="tab-content">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">Nessuna richiesta in attesa</div>
            </div>
          ) : (
            <div className="requests-list">
              {requests.map(req => (
                <div key={req.id} className="request-card">
                  <div className="request-card-header">
                    <span className="request-tipo">{req.tipo}</span>
                    <span
                      className="badge"
                      style={{ background: STATO_COLORS[req.stato] + '20', color: STATO_COLORS[req.stato] }}
                    >
                      {req.stato.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="request-nome">{req.nome} · Mat. {req.mat}</div>
                  <div className="request-periodo">📅 {req.periodo} · {req.ore}h</div>
                  {req.stato === 'in_attesa' && (
                    <div className="request-actions">
                      <button className="btn btn--success btn--sm" onClick={() => handleApprove(req.id)}>
                        ✓ Approva
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleReject(req.id)}>
                        ✕ Rifiuta
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Presenze mese ── */}
      {activeTab === 'presenze' && (
        <div className="tab-content">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Ore timbrate</th>
                  <th>Ore contratto</th>
                  <th>Δ</th>
                  <th>Assenze</th>
                </tr>
              </thead>
              <tbody>
                {myTeam.map(emp => {
                  const delta = 2.3; // mock
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className="emp-cell">
                          <div className="emp-avatar-sm" style={{ background: emp.col + '22', color: emp.col }}>
                            {emp.ini}
                          </div>
                          <span>{emp.full}</span>
                        </div>
                      </td>
                      <td><span className="mono">128.5h</span></td>
                      <td><span className="mono">{emp.hours * 4}h</span></td>
                      <td>
                        <span className="mono" style={{ color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {delta >= 0 ? '+' : ''}{delta}h
                        </span>
                      </td>
                      <td>0gg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
