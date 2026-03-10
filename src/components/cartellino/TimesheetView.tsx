"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHRStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { genMonthTS, formatTimbratura, meseLabel } from "@/lib/utils/timesheet";
import { formatHours } from "@/lib/utils/date";
import type { StatoGiorno } from "@/types";

const STATO_BADGE: Record<StatoGiorno, { label: string; v: "ok" | "wa" | "er" | "nn" }> = {
  ok:       { label: "OK",       v: "ok" },
  anomalia: { label: "Anomalia", v: "wa" },
  assenza:  { label: "Assenza",  v: "er" },
  festivo:  { label: "Festivo",  v: "nn" },
  weekend:  { label: "Weekend",  v: "nn" },
};

export function TimesheetView() {
  const { collaboratori, currentUserId } = useHRStore();
  const now = new Date();
  const [anno, setAnno] = useState(now.getFullYear());
  const [mese, setMese] = useState(now.getMonth() + 1);
  const [empId, setEmpId] = useState(currentUserId);

  const emp = collaboratori.find((c) => c.id === empId) ?? collaboratori[0];
  const ts = genMonthTS(empId, anno, mese);

  function prevMese() {
    if (mese === 1) { setMese(12); setAnno((y) => y - 1); }
    else setMese((m) => m - 1);
  }
  function nextMese() {
    if (mese === 12) { setMese(1); setAnno((y) => y + 1); }
    else setMese((m) => m + 1);
  }

  return (
    <div>
      {/* Controls */}
      <div className="toolbar">
        <select className="fi" style={{ width: "auto" }} value={empId} onChange={(e) => setEmpId(e.target.value)}>
          {collaboratori.map((c) => <option key={c.id} value={c.id}>{c.full}</option>)}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="icon-btn" onClick={prevMese}><ChevronLeft size={15} /></button>
          <span style={{ minWidth: 160, textAlign: "center", fontWeight: 600, color: "var(--t)", fontSize: 14 }}>
            {meseLabel(anno, mese)}
          </span>
          <button className="icon-btn" onClick={nextMese}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Summary */}
      {emp && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <Avatar ini={emp.ini} color={emp.col} size="lg" />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--t)" }}>{emp.full}</p>
            <p className="muted">{emp.dept} · {emp.mansione}</p>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "Teoriche", val: formatHours(ts.totaleTeoriche), color: "var(--t)" },
              { label: "Lavorate", val: formatHours(ts.totaleLavorate), color: "var(--t)" },
              { label: "Saldo",    val: `${ts.saldo >= 0 ? "+" : ""}${formatHours(ts.saldo)}`,
                color: ts.saldo >= 0 ? "var(--ok)" : "var(--er)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p className="muted" style={{ fontSize: 11 }}>{s.label}</p>
                <p style={{ fontFamily: "var(--m)", fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: "-.5px" }}>
                  {s.val}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="tw">
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Timbrature</th>
              <th>Teoriche</th>
              <th>Lavorate</th>
              <th>Δ</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {ts.giorni.map((g) => {
              const isOff = g.stato === "weekend" || g.stato === "festivo";
              const delta = g.oreLavorate - g.oreTeoriche;
              const rowClass = g.stato === "weekend" ? "ts-row-weekend"
                : g.stato === "anomalia" ? "ts-row-anomalia"
                : g.stato === "assenza"  ? "ts-row-assenza" : "";

              return (
                <tr key={g.date} className={rowClass}>
                  <td className="t-main mono" style={{ fontSize: 12.5 }}>
                    {new Date(g.date + "T12:00:00").toLocaleDateString("it-IT", {
                      weekday: "short", day: "numeric", month: "short",
                    })}
                  </td>
                  <td>
                    {g.timbrature.length === 0
                      ? <span className="muted">—</span>
                      : <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {g.timbrature.map((t, i) => (
                            <span key={i} className={`ts-punch ${t.tipo === "IN" ? "in" : "out"}`}>
                              {t.tipo} {formatTimbratura(t.ts)}
                            </span>
                          ))}
                        </div>
                    }
                  </td>
                  <td className="mono">{g.oreTeoriche > 0 ? formatHours(g.oreTeoriche) : "—"}</td>
                  <td className="mono">{g.oreLavorate > 0 ? formatHours(g.oreLavorate) : "—"}</td>
                  <td>
                    {g.oreTeoriche > 0 ? (
                      <span className="mono" style={{
                        fontSize: 12, fontWeight: 600,
                        color: Math.abs(delta) < .25 ? "var(--tm)" : delta > 0 ? "var(--ok)" : "var(--er)",
                      }}>
                        {Math.abs(delta) < .25 ? "—" : `${delta > .25 ? "+" : ""}${formatHours(delta)}`}
                      </span>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td>
                    <Badge variant={STATO_BADGE[g.stato].v}>{STATO_BADGE[g.stato].label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
