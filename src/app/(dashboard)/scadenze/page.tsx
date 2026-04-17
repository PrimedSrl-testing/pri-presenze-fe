"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { AlertTriangle, Calendar } from "lucide-react";

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface ScadenzaRow {
  id: string;
  full: string;
  ini: string;
  col: string;
  dept: string;
  tipo: string;
  data: string;
  days: number;
}

export default function ScadenzePage() {
  const { collaboratori } = useHRStore();

  const scadenze: ScadenzaRow[] = collaboratori
    .filter((c) => c.attivo && c.fin_contratto)
    .map((c) => ({
      id: c.id,
      full: c.full,
      ini: c.ini,
      col: c.col,
      dept: c.dept,
      tipo: c.tipo,
      data: c.fin_contratto!,
      days: daysDiff(c.fin_contratto!),
    }))
    .sort((a, b) => a.days - b.days);

  const critiche = scadenze.filter((s) => s.days <= 30).length;
  const inScadenza = scadenze.filter((s) => s.days > 30 && s.days <= 90).length;

  const columns: Column<ScadenzaRow>[] = [
    {
      key: "dipendente",
      label: "Dipendente",
      getValue: (r) => r.full,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Avatar ini={r.ini} color={r.col} size="sm" />
          <span className="t-main">{r.full}</span>
        </div>
      ),
    },
    { key: "reparto", label: "Reparto", getValue: (r) => r.dept },
    { key: "contratto", label: "Contratto", getValue: (r) => r.tipo },
    {
      key: "scadenza",
      label: "Scadenza",
      getValue: (r) => r.data,
      render: (r) => <span className="mono">{r.data}</span>,
    },
    {
      key: "giorni",
      label: "Giorni rimasti",
      getValue: (r) => r.days,
      render: (r) => (
        <span className={r.days <= 30 ? "gvh" : r.days <= 90 ? "gvm" : "gvl"}>
          {r.days > 0 ? `${r.days} gg` : "Scaduto"}
        </span>
      ),
    },
    {
      key: "urgenza",
      label: "Urgenza",
      getValue: (r) => r.days <= 0 ? "Scaduto" : r.days <= 30 ? "Critico" : r.days <= 90 ? "In scadenza" : "OK",
      render: (r) => (
        <>
          {r.days <= 0 && <span className="bdg er">Scaduto</span>}
          {r.days > 0 && r.days <= 30 && <span className="bdg er">Critico</span>}
          {r.days > 30 && r.days <= 90 && <span className="bdg wa">In scadenza</span>}
          {r.days > 90 && <span className="bdg ok">OK</span>}
        </>
      ),
    },
  ];

  return (
    <>
      <Header title="Scadenze" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Scadenze Contratti</div>
            <div className="ss">Monitoraggio contratti a termine e compliance</div>
          </div>
        </div>

        <div className="g3" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--erl)" }}>
              <AlertTriangle size={17} style={{ color: "var(--er)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--er)" }}>{critiche}</div>
            <div className="kpi-l">Scadenze critiche (≤30 gg)</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--wal)" }}>
              <Calendar size={17} style={{ color: "var(--wa)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--wa)" }}>{inScadenza}</div>
            <div className="kpi-l">In scadenza (31-90 gg)</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--acl)" }}>
              <Calendar size={17} style={{ color: "var(--ac)" }} />
            </div>
            <div className="kpi-v">{scadenze.length}</div>
            <div className="kpi-l">Contratti a termine</div>
          </div>
        </div>

        {critiche > 0 && (
          <div className="ab ab-e" style={{ marginBottom: 14 }}>
            <AlertTriangle size={15} />
            <span>{critiche} contratto/i in scadenza entro 30 giorni. Azione immediata richiesta.</span>
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          <SortableTable<ScadenzaRow>
            columns={columns}
            data={scadenze}
            rowKey={(r) => r.id}
            emptyMessage="Nessun contratto a termine registrato"
          />
        </div>
      </div>
    </>
  );
}
