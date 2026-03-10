"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { BarChart3, Download } from "lucide-react";

export default function AreaReportPage() {
  const { collaboratori, anomalie } = useHRStore();

  const byDept: Record<string, number> = {};
  collaboratori.filter((c) => c.attivo).forEach((c) => {
    byDept[c.dept] = (byDept[c.dept] ?? 0) + 1;
  });

  const depts = Object.entries(byDept);
  const maxCount = Math.max(...depts.map(([, n]) => n), 1);

  return (
    <>
      <Header title="Report Mese Area" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Report mese area</div>
            <div className="ss">Marzo 2026 — Riepilogo per reparto</div>
          </div>
          <button className="btn bp" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> Esporta PDF
          </button>
        </div>

        <div className="g2" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-v">{collaboratori.filter((c) => c.attivo).length}</div>
            <div className="kpi-l">Dipendenti area</div>
          </div>
          <div className="kpi2">
            <div className="kpi-v" style={{ color: anomalie.filter((a) => a.stato === "aperta").length > 0 ? "var(--er)" : "var(--ok)" }}>
              {anomalie.filter((a) => a.stato === "aperta").length}
            </div>
            <div className="kpi-l">Anomalie aperte</div>
          </div>
        </div>

        <div className="card2">
          <div className="ctit"><BarChart3 size={12} /> Distribuzione per reparto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {depts.map(([dept, count]) => (
              <div key={dept}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{dept}</span>
                  <span style={{ fontSize: 12, color: "var(--tm)" }}>{count} dip.</span>
                </div>
                <div className="pt">
                  <div className="pf" style={{ width: `${Math.round((count / maxCount) * 100)}%`, background: "var(--ac)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
