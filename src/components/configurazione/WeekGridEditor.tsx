"use client";

import type { OrarioTemplateGiorno } from "@/types";

const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const SETT_LABELS = ["A", "B", "C", "D"];

interface WeekGridEditorProps {
  numSettimane: number;
  giorni: Omit<OrarioTemplateGiorno, "id" | "template_id">[];
  onChange: (giorni: Omit<OrarioTemplateGiorno, "id" | "template_id">[]) => void;
  readOnly?: boolean;
}

export function WeekGridEditor({
  numSettimane,
  giorni,
  onChange,
  readOnly,
}: WeekGridEditorProps) {
  const getGiorno = (sett: number, giorno: number) =>
    giorni.find((g) => g.settimana_num === sett && g.giorno_settimana === giorno);

  const setOre = (sett: number, giorno: number, ore: number) => {
    const existing = giorni.filter(
      (g) => !(g.settimana_num === sett && g.giorno_settimana === giorno)
    );
    existing.push({
      settimana_num: sett,
      giorno_settimana: giorno,
      ore_teoriche: ore,
      orario_inizio: getGiorno(sett, giorno)?.orario_inizio ?? null,
      orario_fine: getGiorno(sett, giorno)?.orario_fine ?? null,
    });
    onChange(existing);
  };

  const getTotale = (sett: number) =>
    giorni
      .filter((g) => g.settimana_num === sett)
      .reduce((sum, g) => sum + (g.ore_teoriche ?? 0), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "8px 10px",
                textAlign: "left",
                fontWeight: 700,
                fontSize: 12,
                color: "var(--tm)",
                borderBottom: "2px solid var(--bdr)",
              }}
            >
              Giorno
            </th>
            {Array.from({ length: numSettimane }, (_, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 10px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  color: "var(--ac)",
                  borderBottom: "2px solid var(--bdr)",
                  minWidth: 80,
                }}
              >
                Sett. {SETT_LABELS[i] ?? i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GIORNI.map((nome, gIdx) => {
            const giornoNum = gIdx + 1; // 1=Lun..7=Dom
            const isWeekend = giornoNum >= 6;
            return (
              <tr
                key={gIdx}
                style={{
                  background: isWeekend ? "var(--bgs)" : "transparent",
                }}
              >
                <td
                  style={{
                    padding: "6px 10px",
                    fontWeight: 600,
                    color: isWeekend ? "var(--tm)" : "var(--t)",
                    borderBottom: "1px solid var(--bdr)",
                  }}
                >
                  {nome}
                </td>
                {Array.from({ length: numSettimane }, (_, sIdx) => {
                  const settNum = sIdx + 1;
                  const g = getGiorno(settNum, giornoNum);
                  const ore = g?.ore_teoriche ?? 0;
                  return (
                    <td
                      key={sIdx}
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        borderBottom: "1px solid var(--bdr)",
                      }}
                    >
                      {readOnly ? (
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: ore > 0 ? "var(--t)" : "var(--tm)",
                          }}
                        >
                          {ore > 0 ? `${ore}h` : "-"}
                        </span>
                      ) : (
                        <input
                          className="fi"
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          style={{
                            width: 60,
                            textAlign: "center",
                            margin: "0 auto",
                          }}
                          value={ore || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setOre(
                              settNum,
                              giornoNum,
                              Number(e.target.value) || 0
                            )
                          }
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {/* Totals row */}
          <tr>
            <td
              style={{
                padding: "8px 10px",
                fontWeight: 800,
                fontSize: 12,
                color: "var(--ac)",
                borderTop: "2px solid var(--bdr)",
              }}
            >
              Totale
            </td>
            {Array.from({ length: numSettimane }, (_, sIdx) => {
              const tot = getTotale(sIdx + 1);
              return (
                <td
                  key={sIdx}
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    color: tot > 0 ? "var(--ac)" : "var(--tm)",
                    borderTop: "2px solid var(--bdr)",
                  }}
                >
                  {tot}h
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
