"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { CheckCircle, Circle, AlertTriangle, Lock } from "lucide-react";

interface CheckItem {
  id: string;
  label: string;
  desc: string;
  severity: "ok" | "wa" | "er";
}

const CHECKLIST: CheckItem[] = [
  { id: "anomalie", label: "Anomalie risolte",       desc: "Tutte le anomalie del mese devono essere chiuse",   severity: "er" },
  { id: "richieste",label: "Richieste elaborate",    desc: "Nessuna richiesta in pending",                       severity: "wa" },
  { id: "timb",     label: "Timbrature verificate",  desc: "Timbrature mancanti integrate o giustificate",       severity: "er" },
  { id: "ferie",    label: "Ferie conteggiate",       desc: "Saldi ferie aggiornati per tutti i dipendenti",      severity: "ok" },
  { id: "extra",    label: "Straordinari approvati",  desc: "Ore extra verificate e approvate dai manager",       severity: "ok" },
  { id: "export",   label: "Export paghe pronto",     desc: "File per il commercialista generato ed esportato",   severity: "wa" },
];

export default function ChiusuraPage() {
  const { anomalie, richieste } = useHRStore();
  const [checked, setChecked] = useState<Record<string, boolean>>({
    timb: true,
    ferie: true,
    extra: true,
  });

  const anomalieAperte = anomalie.filter((a) => a.stato === "aperta").length;
  const richiestePending = richieste.filter((r) => r.stato === "pending").length;

  function getStatus(id: string): boolean {
    if (id === "anomalie") return anomalieAperte === 0;
    if (id === "richieste") return richiestePending === 0;
    return checked[id] ?? false;
  }

  const allDone = CHECKLIST.every((c) => getStatus(c.id));

  return (
    <>
      <Header title="Chiusura Mese" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Chiusura Mese</div>
            <div className="ss">Checklist pre-chiusura — Marzo 2026</div>
          </div>
          {allDone
            ? <span className="bdg ok">Pronto per chiusura</span>
            : <span className="bdg wa">Azioni richieste</span>
          }
        </div>

        {!allDone && (
          <div className="ab ab-w" style={{ marginBottom: 16 }}>
            <AlertTriangle size={16} />
            <div>Completa tutti i controlli prima di procedere alla chiusura del mese.</div>
          </div>
        )}

        <div className="card2" style={{ marginBottom: 16 }}>
          <div className="ctit">Checklist chiusura</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHECKLIST.map((item) => {
              const done = getStatus(item.id);
              const canToggle = item.id !== "anomalie" && item.id !== "richieste";
              return (
                <div
                  key={item.id}
                  className={`ci${done ? " ok" : item.severity === "er" ? " er" : " wa"}`}
                  style={{ cursor: canToggle ? "pointer" : "default" }}
                  onClick={() => {
                    if (canToggle) setChecked((p) => ({ ...p, [item.id]: !p[item.id] }));
                  }}
                >
                  {done
                    ? <CheckCircle size={18} style={{ color: "var(--ok)", flexShrink: 0 }} />
                    : <Circle size={18} style={{ color: item.severity === "er" ? "var(--er)" : "var(--wa)", flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--t)" }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 1 }}>{item.desc}</div>
                  </div>
                  {item.id === "anomalie" && anomalieAperte > 0 && (
                    <span className="nb">{anomalieAperte} aperte</span>
                  )}
                  {item.id === "richieste" && richiestePending > 0 && (
                    <span className="nb w">{richiestePending} pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="btn bp"
          disabled={!allDone}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Lock size={14} />
          Chiudi Mese Marzo 2026
        </button>
      </div>
    </>
  );
}
