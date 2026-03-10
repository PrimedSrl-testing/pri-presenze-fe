"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ShieldAlert, Search } from "lucide-react";

interface AuditEntry {
  id: string;
  ts: string;
  utente: string;
  azione: string;
  entita: string;
  dettaglio: string;
  ip: string;
  esito: "ok" | "er";
}

const AUDIT_MOCK: AuditEntry[] = [
  { id: "a1",  ts: "2026-03-10 09:12:04", utente: "c.annicchiarico",  azione: "UPDATE", entita: "Collaboratore", dettaglio: "Aggiornato Marco Rossi (id:1)",          ip: "192.168.1.10", esito: "ok" },
  { id: "a2",  ts: "2026-03-10 09:05:18", utente: "c.annicchiarico",  azione: "APPROVE",entita: "Richiesta",     dettaglio: "Approvata richiesta ferie (id:rq1)",    ip: "192.168.1.10", esito: "ok" },
  { id: "a3",  ts: "2026-03-10 08:57:33", utente: "m.rossi",          azione: "LOGIN",  entita: "Sistema",       dettaglio: "Accesso riuscito — ruolo mgr",           ip: "192.168.1.22", esito: "ok" },
  { id: "a4",  ts: "2026-03-09 17:44:01", utente: "c.annicchiarico",  azione: "RESOLVE",entita: "Anomalia",      dettaglio: "Risolta anomalia timbratura (id:an1)",  ip: "192.168.1.10", esito: "ok" },
  { id: "a5",  ts: "2026-03-09 16:30:55", utente: "a.fiore",          azione: "LOGIN",  entita: "Sistema",       dettaglio: "Accesso riuscito — ruolo amgr",          ip: "10.0.0.5",     esito: "ok" },
  { id: "a6",  ts: "2026-03-09 14:22:10", utente: "unknown",          azione: "LOGIN",  entita: "Sistema",       dettaglio: "Accesso fallito — credenziali errate",  ip: "85.34.22.1",   esito: "er" },
  { id: "a7",  ts: "2026-03-09 11:05:44", utente: "c.annicchiarico",  azione: "CREATE", entita: "Collaboratore", dettaglio: "Aggiunto nuovo collaboratore",           ip: "192.168.1.10", esito: "ok" },
  { id: "a8",  ts: "2026-03-08 09:00:00", utente: "c.annicchiarico",  azione: "EXPORT", entita: "Report",        dettaglio: "Export paghe Febbraio 2026",             ip: "192.168.1.10", esito: "ok" },
];

const AZIONE_COLORS: Record<string, string> = {
  UPDATE: "ac",
  APPROVE: "ok",
  LOGIN: "nn",
  RESOLVE: "ok",
  CREATE: "in",
  EXPORT: "pu",
  DELETE: "er",
};

export default function AuditPage() {
  const [q, setQ] = useState("");

  const list = AUDIT_MOCK.filter(
    (e) =>
      e.utente.includes(q.toLowerCase()) ||
      e.azione.includes(q.toUpperCase()) ||
      e.entita.toLowerCase().includes(q.toLowerCase()) ||
      e.dettaglio.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <Header title="Audit" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Log Audit</div>
            <div className="ss">Tutte le operazioni tracciate sul sistema</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--tm)" }}>
            <ShieldAlert size={14} />
            Ultimi 30 giorni
          </div>
        </div>

        <div className="toolbar">
          <div className="sbr" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={14} style={{ color: "var(--tm)" }} />
            <input
              placeholder="Cerca per utente, azione, entità…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Utente</th>
                <th>Azione</th>
                <th>Entità</th>
                <th>Dettaglio</th>
                <th>IP</th>
                <th>Esito</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td><span className="mono" style={{ fontSize: 11.5 }}>{e.ts}</span></td>
                  <td className="t-main">{e.utente}</td>
                  <td><span className={`bdg ${AZIONE_COLORS[e.azione] ?? "nn"}`}>{e.azione}</span></td>
                  <td>{e.entita}</td>
                  <td style={{ maxWidth: 240, fontSize: 12 }}>{e.dettaglio}</td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{e.ip}</span></td>
                  <td>
                    {e.esito === "ok"
                      ? <span className="bdg ok">OK</span>
                      : <span className="bdg er">Fallito</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
