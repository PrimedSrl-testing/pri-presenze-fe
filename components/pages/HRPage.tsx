// src/components/pages/HRPage.tsx
'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { EMPLOYEES, getActive } from '@/data/employees';
import { DEPARTMENTS } from '@/data/constants';
import KpiCard from '@/components/ui/KpiCard';

const HR_SECTIONS = [
  { id: 'dashboard', label: '🏠 Dashboard'      },
  { id: 'employees', label: '👥 Dipendenti'      },
  { id: 'presenze',  label: '📋 Presenze'        },
  { id: 'richieste', label: '📨 Richieste HR'    },
  { id: 'report',    label: '📊 Report & Export' },
  { id: 'cfg',       label: '⚙️  Configurazione' },
];

export default function HRPage() {
  const { showToast } = useApp();
  const [section, setSection] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const activeEmps = getActive();
  const allDepts = [...new Set(EMPLOYEES.map((e) => e.dept))].sort();

  const filtered = EMPLOYEES.filter((emp) => {
    const matchSearch = !search || emp.full.toLowerCase().includes(search.toLowerCase()) || emp.mat.includes(search);
    const matchDept = !deptFilter || emp.dept === deptFilter;
    return matchSearch && matchDept;
  });

  const scadenzeProssime = EMPLOYEES.filter((e) => e.fin_contratto && new Date(e.fin_contratto) < new Date('2026-06-01'));

  return (
    <div className="page page--hr">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Dashboard</h1>
          <div className="page-subtitle">Gestione Risorse Umane — PRIMED S.r.l.</div>
        </div>
      </div>

      <div className="hr-subnav">
        {HR_SECTIONS.map((s) => (
          <button key={s.id} className={`hr-subnav-btn ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'dashboard' && (
        <div className="tab-content">
          <div className="kpi-grid kpi-grid--4">
            <KpiCard label="Dipendenti attivi" value={activeEmps.length}   color="var(--blue)"   />
            <KpiCard label="Reparti"           value={DEPARTMENTS.length}  color="var(--purple)" />
            <KpiCard label="Scadenze 30gg"     value={scadenzeProssime.length} color={scadenzeProssime.length > 0 ? 'var(--orange)' : 'var(--green)'} />
            <KpiCard label="Mese corrente"     value="Marzo 2026"          color="var(--green)"  />
          </div>
          {scadenzeProssime.length > 0 && (
            <div className="alert alert--warning" style={{ marginTop: 16 }}>
              <strong>⚠️ Contratti in scadenza:</strong>{' '}
              {scadenzeProssime.map((e) => `${e.full} (${e.fin_contratto})`).join(' · ')}
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">Dipendenti per reparto</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Reparto</th><th>Totale</th><th>Attivi</th><th>Temp. determinato</th></tr>
                </thead>
                <tbody>
                  {allDepts.map((dept) => {
                    const inDept = EMPLOYEES.filter((e) => e.dept === dept);
                    const active = inDept.filter((e) => e.active);
                    const temp   = inDept.filter((e) => e.tempo === 'determinato' && e.active);
                    const cfg    = DEPARTMENTS.find((d) => d.id === dept);
                    return (
                      <tr key={dept}>
                        <td><span className="dept-badge" style={{ background: (cfg?.col ?? '#6b7280') + '20', color: cfg?.col ?? '#6b7280' }}>{dept}</span></td>
                        <td><span className="mono">{inDept.length}</span></td>
                        <td><span className="mono">{active.length}</span></td>
                        <td>{temp.length > 0 ? <span className="badge badge--warning">{temp.length}</span> : <span className="mono" style={{ color: 'var(--muted)' }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === 'employees' && (
        <div className="tab-content">
          <div className="filter-bar">
            <input className="form-input filter-search" type="search" placeholder="🔍 Cerca per nome o matricola…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-input filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">Tutti i reparti</option>
              {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="filter-count">{filtered.length} dipendenti</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Dipendente</th><th>Mat.</th><th>Reparto</th><th>Contratto</th><th>Ore</th><th>Stato</th><th>Scadenza</th></tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const dept = DEPARTMENTS.find((d) => d.id === emp.dept);
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className="emp-cell">
                          <div className="emp-avatar-sm" style={{ background: emp.col + '22', color: emp.col }}>{emp.ini}</div>
                          <div>
                            <div className="emp-name">{emp.full}</div>
                            <div className="emp-ruolo">{emp.ruolo}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="mono">{emp.mat}</span></td>
                      <td><span className="dept-badge" style={{ background: (dept?.col ?? '#6b7280') + '20', color: dept?.col ?? '#6b7280' }}>{emp.dept}</span></td>
                      <td>{emp.contract}</td>
                      <td><span className="mono">{emp.hours}h</span></td>
                      <td><span className={`badge badge--${emp.active ? 'success' : 'neutral'}`}>{emp.active ? 'Attivo' : 'Non attivo'}</span></td>
                      <td>{emp.fin_contratto ? <span className="mono badge badge--warning">{emp.fin_contratto}</span> : <span className="mono" style={{ color: 'var(--muted)' }}>Indeterminato</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'report' && (
        <div className="tab-content">
          <div className="report-grid">
            {[
              { title: 'Export presenze mensile', desc: 'CSV con tutte le timbrature del mese',    icon: '📋' },
              { title: 'Report ferie e ROL',       desc: 'Saldi per tutti i dipendenti',           icon: '📅' },
              { title: 'Invio dati a paghe',        desc: 'Chiudi il mese e invia al gestionale',  icon: '💳' },
              { title: 'Report anomalie',           desc: 'Timbrature mancanti e irregolarità',    icon: '⚠️' },
            ].map((r) => (
              <div key={r.title} className="report-card">
                <div className="report-card-icon">{r.icon}</div>
                <div className="report-card-title">{r.title}</div>
                <div className="report-card-desc">{r.desc}</div>
                <button className="btn btn--secondary btn--sm" onClick={() => showToast(`${r.title} — funzione disponibile in produzione`, 'info')}>Genera</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'cfg' && (
        <div className="tab-content">
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <div className="empty-state-title">Configurazione</div>
            <div className="empty-state-sub">Turni, causali, permessi ruolo, blocco mesi e dispositivi di timbratura.</div>
          </div>
        </div>
      )}

      {(section === 'presenze' || section === 'richieste') && (
        <div className="tab-content">
          <div className="empty-state">
            <div className="empty-state-icon">{section === 'presenze' ? '📋' : '📨'}</div>
            <div className="empty-state-title">{section === 'presenze' ? 'Presenze' : 'Richieste HR'}</div>
            <div className="empty-state-sub">Funzionalità disponibile nella versione completa.</div>
          </div>
        </div>
      )}
    </div>
  );
}
