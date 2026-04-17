"use client";

import { Header } from "@/components/layout/Header";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { ShieldAlert } from "lucide-react";

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

const columns: Column<AuditEntry>[] = [
  {
    key: "ts",
    label: "Timestamp",
    getValue: (e) => e.ts,
    render: (e) => <span className="mono" style={{ fontSize: 11.5 }}>{e.ts}</span>,
  },
  {
    key: "utente",
    label: "Utente",
    getValue: (e) => e.utente,
    render: (e) => <span className="t-main">{e.utente}</span>,
  },
  {
    key: "azione",
    label: "Azione",
    getValue: (e) => e.azione,
    render: (e) => <span className={`bdg ${AZIONE_COLORS[e.azione] ?? "nn"}`}>{e.azione}</span>,
  },
  {
    key: "entita",
    label: "Entit\u00e0",
    getValue: (e) => e.entita,
  },
  {
    key: "dettaglio",
    label: "Dettaglio",
    getValue: (e) => e.dettaglio,
    render: (e) => <span style={{ maxWidth: 240, fontSize: 12 }}>{e.dettaglio}</span>,
  },
  {
    key: "ip",
    label: "IP",
    getValue: (e) => e.ip,
    render: (e) => <span className="mono" style={{ fontSize: 11 }}>{e.ip}</span>,
  },
  {
    key: "esito",
    label: "Esito",
    getValue: (e) => e.esito,
    render: (e) =>
      e.esito === "ok"
        ? <span className="bdg ok">OK</span>
        : <span className="bdg er">Fallito</span>,
  },
];

export default function AuditPage() {
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

        <div className="card" style={{ padding: 0 }}>
          <SortableTable<AuditEntry>
            columns={columns}
            data={AUDIT_MOCK}
            rowKey={(e) => e.id}
            emptyMessage="Nessun log trovato"
          />
        </div>
      </div>
    </>
  );
}
