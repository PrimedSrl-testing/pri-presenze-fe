"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { BarChart3, Download, Filter } from "lucide-react";

const TABS = ["Presenze", "Ferie & Permessi", "Straordinari", "Anomalie"] as const;
type Tab = typeof TABS[number];

// Mock monthly data
const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const ORE_MESI = [1820, 1740, 1680, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const MAX_ORE = 2000;

export default function ReportPage() {
  const { collaboratori, anomalie } = useHRStore();
  const [tab, setTab] = useState<Tab>("Presenze");

  const attivi = collaboratori.filter((c) => c.attivo);

  const anomalieMese = [2, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <>
      <Header title="Report" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Report HR</div>
            <div className="ss">Anno 2026 — {attivi.length} dipendenti</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn bs" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Filter size={13} /> Filtri
            </button>
            <button className="btn bp" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Download size={13} /> Esporta
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab${tab === t ? " ac" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Presenze" && (
          <div className="card2">
            <div className="ctit"><BarChart3 size={12} /> Ore lavorate per mese</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, paddingTop: 10 }}>
              {MESI.map((m, i) => {
                const h = ORE_MESI[i];
                const pct = h ? Math.round((h / MAX_ORE) * 100) : 0;
                return (
                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 10, color: "var(--tm)" }}>{h || ""}</div>
                    <div
                      style={{
                        width: "100%",
                        height: `${pct}%`,
                        background: pct > 0 ? "var(--ac)" : "var(--bdr)",
                        borderRadius: "4px 4px 0 0",
                        minHeight: 4,
                        transition: "height .4s ease",
                        opacity: pct > 0 ? 1 : 0.3,
                      }}
                    />
                    <div style={{ fontSize: 10, color: "var(--tm)", fontWeight: 600 }}>{m}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "Anomalie" && (
          <div className="card2">
            <div className="ctit"><BarChart3 size={12} /> Anomalie per mese</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, paddingTop: 10 }}>
              {MESI.map((m, i) => {
                const h = anomalieMese[i];
                const max = Math.max(...anomalieMese, 1);
                const pct = Math.round((h / max) * 100);
                return (
                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 10, color: "var(--tm)" }}>{h || ""}</div>
                    <div
                      style={{
                        width: "100%",
                        height: `${pct}%`,
                        background: h > 0 ? "var(--er)" : "var(--bdr)",
                        borderRadius: "4px 4px 0 0",
                        minHeight: 4,
                        opacity: pct > 0 ? 1 : 0.3,
                      }}
                    />
                    <div style={{ fontSize: 10, color: "var(--tm)", fontWeight: 600 }}>{m}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(tab === "Ferie & Permessi" || tab === "Straordinari") && (
          <div className="card2">
            <div className="ctit">Dettaglio {tab}</div>
            <div className="tw" style={{ border: "none", boxShadow: "none" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Dipendente</th>
                    <th>{tab === "Ferie & Permessi" ? "Ferie usate" : "Ore extra"}</th>
                    <th>{tab === "Ferie & Permessi" ? "Permessi usati" : "Ore recuperate"}</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {attivi.slice(0, 6).map((c) => (
                    <tr key={c.id}>
                      <td className="t-main">{c.full}</td>
                      <td>{tab === "Ferie & Permessi" ? `${Math.floor(Math.random() * 10) + 1}g` : `${Math.floor(Math.random() * 20)}h`}</td>
                      <td>{tab === "Ferie & Permessi" ? `${Math.floor(Math.random() * 5)}g` : `${Math.floor(Math.random() * 10)}h`}</td>
                      <td><span className="bdg ok">Regolare</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
