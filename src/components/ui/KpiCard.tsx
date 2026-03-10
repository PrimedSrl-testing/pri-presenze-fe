"use client";

import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
}

export function KpiCard({ label, value, icon: Icon, iconColor, iconBg, trend }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {trend && (
          <p className={`kpi-trend ${trend.positive ? "pos" : "neg"}`}>
            {trend.positive ? "▲" : "▼"} {trend.value}
          </p>
        )}
      </div>
      <div className="kpi-icon" style={{ background: iconBg ?? "var(--acl)" }}>
        <Icon style={{ color: iconColor ?? "var(--ac)" }} />
      </div>
    </div>
  );
}
