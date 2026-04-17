"use client";

const MESI_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

interface CicliciTimelineProps {
  periodo1_da_mese: number; // 1-12
  periodo2_da_mese: number; // 1-12
  periodo1_ore_sett: number;
  periodo2_ore_sett: number;
}

/**
 * Visual 12-month bar showing which months belong to which period.
 * Period 1 runs from periodo1_da_mese until periodo2_da_mese (exclusive),
 * Period 2 runs from periodo2_da_mese until periodo1_da_mese (exclusive) — wrapping around.
 */
export function CicliciTimeline({
  periodo1_da_mese,
  periodo2_da_mese,
  periodo1_ore_sett,
  periodo2_ore_sett,
}: CicliciTimelineProps) {
  const getPeriod = (month: number): 1 | 2 => {
    // month is 1-based
    if (periodo1_da_mese <= periodo2_da_mese) {
      // e.g. P1 starts in March (3), P2 starts in October (10)
      // P1 = months 3..9, P2 = months 10..2
      return month >= periodo1_da_mese && month < periodo2_da_mese ? 1 : 2;
    } else {
      // e.g. P1 starts in October (10), P2 starts in March (3)
      // P2 = months 3..9, P1 = months 10..2
      return month >= periodo2_da_mese && month < periodo1_da_mese ? 2 : 1;
    }
  };

  return (
    <div>
      {/* Month blocks */}
      <div style={{ display: "flex", gap: 2 }}>
        {MESI_SHORT.map((label, i) => {
          const month = i + 1;
          const period = getPeriod(month);
          const isP1 = period === 1;
          return (
            <div
              key={month}
              title={`${label}: Periodo ${period} (${isP1 ? periodo1_ore_sett : periodo2_ore_sett}h/sett)`}
              style={{
                flex: 1,
                height: 20,
                borderRadius: i === 0 ? "4px 0 0 4px" : i === 11 ? "0 4px 4px 0" : 0,
                background: isP1 ? "var(--ac)" : "var(--pu)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: "-.2px",
                cursor: "default",
                minWidth: 0,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--tm)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--ac)", display: "inline-block", flexShrink: 0 }} />
          P1: {periodo1_ore_sett}h/sett
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--tm)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--pu)", display: "inline-block", flexShrink: 0 }} />
          P2: {periodo2_ore_sett}h/sett
        </span>
      </div>
    </div>
  );
}
