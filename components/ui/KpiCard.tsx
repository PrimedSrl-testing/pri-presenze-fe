// src/components/ui/KpiCard.tsx

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

export default function KpiCard({ label, value, sub, color = 'var(--ac)', icon }: KpiCardProps) {
  return (
    <div className="kpi-card">
      {icon && <div className="kpi-card-icon" style={{ color }}>{icon}</div>}
      <div className="kpi-card-value" style={{ color }}>{value}</div>
      <div className="kpi-card-label">{label}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  );
}
