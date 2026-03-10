// client/src/components/pages/DipendentePage.jsx
// ─────────────────────────────────────────────────────────────
// Vista Dipendente: scheda personale + foglio ore mensile
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import KpiCard from '@/components/ui/KpiCard';

// Dati mock per il mese corrente (febbraio 2026)
// In produzione: fetch GET /api/employees/:mat/timesheet/:month
const MOCK_MONTH_DATA = {
  ore_timb: 145.34,
  ore_fm:   135.30,
  ore_cons: 135.50,
  ore_plus:   2.00,
  saldo_timb: -14.66,
  assenze_fm:  6.30,
  fin_ferie:  -8.64,
  fin_rol:   -24.70,
  fin_boa:     0.00,
  fin_bop:     0.00,
  daily: [0,7.36,5.47,7.45,7.29,7.5,0,0,7.29,5.4,7.51,7.21,8.13,0,0,7.28,7.52,7.09,6.41,8.28,0,0,7.01,5.22,7.27,7.28,7.37,0,0],
};

const MONTH_NAME = 'Febbraio 2026';
const WEEK_DAYS = ['D','L','M','M','G','V','S'];

export default function DipendentePage() {
  const { auth, showToast } = useApp();
  const user = auth.user;
  const [activeTab, setActiveTab] = useState('riepilogo'); // riepilogo | foglio | richieste

  const d = MOCK_MONTH_DATA;

  const richiestaFerie = () => {
    showToast('Richiesta ferie inviata al responsabile', 'ok');
  };

  return (
    <div className="page">
      {/* Header pagina */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="emp-avatar" style={{ background: (user?.col || '#6366f1') + '22', color: user?.col || '#6366f1' }}>
            {user?.ini}
          </div>
          <div>
            <h1 className="page-title">{user?.full || user?.name}</h1>
            <div className="page-subtitle">{user?.ruolo} · {user?.dept} · Mat. {user?.mat}</div>
          </div>
        </div>
        <button className="btn btn--primary" onClick={richiestaFerie}>
          + Richiesta ferie / permesso
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'riepilogo', label: 'Riepilogo' },
          { id: 'foglio',    label: `Foglio ore — ${MONTH_NAME}` },
          { id: 'richieste', label: 'Richieste' },
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

      {/* ── Tab: Riepilogo ── */}
      {activeTab === 'riepilogo' && (
        <div className="tab-content">
          <div className="kpi-grid">
            <KpiCard
              label="Ore timbrate"
              value={`${d.ore_timb}h`}
              sub={`su ${d.ore_cons}h contratto`}
              color="var(--blue)"
            />
            <KpiCard
              label="Saldo ore"
              value={`${d.saldo_timb > 0 ? '+' : ''}${d.saldo_timb}h`}
              color={d.saldo_timb >= 0 ? 'var(--green)' : 'var(--red)'}
            />
            <KpiCard
              label="Ferie residue"
              value={`${d.fin_ferie > 0 ? '+' : ''}${d.fin_ferie}gg`}
              color={d.fin_ferie >= 0 ? 'var(--green)' : 'var(--orange)'}
            />
            <KpiCard
              label="ROL residuo"
              value={`${d.fin_rol > 0 ? '+' : ''}${d.fin_rol}h`}
              color={d.fin_rol >= 0 ? 'var(--green)' : 'var(--orange)'}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Foglio ore ── */}
      {activeTab === 'foglio' && (
        <div className="tab-content">
          <div className="timesheet-grid">
            {WEEK_DAYS.map(d => (
              <div key={d} className="timesheet-header-cell">{d}</div>
            ))}
            {/* Offset per il primo giorno del mese (Feb 2026 inizia di domenica = 0) */}
            {MOCK_MONTH_DATA.daily.slice(1).map((ore, idx) => {
              const day = idx + 1;
              const isWeekend = ((day + 6) % 7) >= 5; // semplificato
              const isEmpty = ore === 0;
              return (
                <div
                  key={day}
                  className={`timesheet-day ${isEmpty ? 'empty' : ''} ${isWeekend ? 'weekend' : ''}`}
                >
                  <span className="timesheet-day-num">{day}</span>
                  {!isEmpty && <span className="timesheet-day-ore">{ore}h</span>}
                </div>
              );
            })}
          </div>

          {/* Totali */}
          <div className="timesheet-totals">
            <div className="timesheet-total-item">
              <span className="timesheet-total-label">Ore timbrate</span>
              <span className="timesheet-total-value">{d.ore_timb}h</span>
            </div>
            <div className="timesheet-total-item">
              <span className="timesheet-total-label">Ore contratto</span>
              <span className="timesheet-total-value">{d.ore_cons}h</span>
            </div>
            <div className="timesheet-total-item">
              <span className="timesheet-total-label">Straordinari</span>
              <span className="timesheet-total-value" style={{ color: 'var(--orange)' }}>+{d.ore_plus}h</span>
            </div>
            <div className="timesheet-total-item">
              <span className="timesheet-total-label">Assenze</span>
              <span className="timesheet-total-value">{d.assenze_fm}h</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Richieste ── */}
      {activeTab === 'richieste' && (
        <div className="tab-content">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-title">Nessuna richiesta in corso</div>
            <div className="empty-state-sub">Le tue richieste di ferie e permessi appariranno qui.</div>
            <button className="btn btn--primary" onClick={richiestaFerie} style={{ marginTop: 16 }}>
              Nuova richiesta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
