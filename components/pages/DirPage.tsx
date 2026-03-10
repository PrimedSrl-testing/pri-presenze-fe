// src/components/pages/DirPage.tsx
import KpiCard from '@/components/ui/KpiCard';

export default function DirPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard Direzione</h1>
        <div className="page-subtitle">Panoramica strategica — Marzo 2026</div>
      </div>

      <div className="kpi-grid kpi-grid--4">
        <KpiCard label="Dipendenti attivi" value="47"     sub="in organico"               color="var(--blue)"   />
        <KpiCard label="Ore lavorate"       value="6.800h" sub="su 7.520h teoriche (90%)" color="var(--green)"  />
        <KpiCard label="Costo straordinari" value="€319"  sub="18h · maggiorazione 25%"  color="var(--orange)" />
        <KpiCard label="Ferie residue"      value="187gg" sub="media 4gg/dip"            color="var(--purple)" />
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="alert alert--warning">
          ⚠️ <strong>2 contratti a termine</strong> scadono entro 30 giorni — verifica rinnovo.
        </div>
        <div className="alert alert--info" style={{ marginTop: 8 }}>
          ℹ️ Reparto IMBALLI: assenteismo 3.2% — oltre la soglia aziendale (2.5%).
        </div>
      </div>
    </div>
  );
}
