// client/src/components/ui/KpiCard.jsx

/**
 * KpiCard — card KPI riutilizzabile con colore, valore e sottotitolo.
 *
 * @param {{ label: string, value: string|number, sub?: string, color?: string, icon?: string }} props
 */
export default function KpiCard({ label, value, sub, color = 'var(--ac)', icon }) {
  return (
    <div className="kpi-card">
      {icon && <div className="kpi-card-icon" style={{ color }}>{icon}</div>}
      <div className="kpi-card-value" style={{ color }}>{value}</div>
      <div className="kpi-card-label">{label}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  );
}
