"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { Plus, Calendar } from "lucide-react";
import type { Richiesta } from "@/types";

const STATO_STYLE: Record<string, string> = {
  pending: "wa",
  approvata: "ok",
  rifiutata: "er",
};
const STATO_LABELS: Record<string, string> = {
  pending: "In attesa",
  approvata: "Approvata",
  rifiutata: "Rifiutata",
};

export default function MieRichiestePage() {
  const { richieste, causali, currentUserId } = useHRStore();
  const mie = richieste.filter((r) => r.empId === currentUserId);

  function getCausale(id: string) { return causali.find((c) => c.id === id); }

  const columns: Column<Richiesta>[] = [
    {
      key: "causale",
      label: "Causale",
      getValue: (r) => getCausale(r.causaleId)?.nome ?? r.causaleId,
      render: (r) => <span className="t-main">{getCausale(r.causaleId)?.nome ?? r.causaleId}</span>,
    },
    { key: "dal", label: "Dal", getValue: (r) => r.dal },
    { key: "al", label: "Al", getValue: (r) => r.al },
    {
      key: "ore",
      label: "Ore",
      getValue: (r) => r.ore ?? 0,
      render: (r) => <span>{r.ore ? `${r.ore}h` : "\u2014"}</span>,
    },
    {
      key: "note",
      label: "Note",
      getValue: (r) => r.note || "",
      render: (r) => <span style={{ fontSize: 12 }}>{r.note || "\u2014"}</span>,
    },
    {
      key: "stato",
      label: "Stato",
      getValue: (r) => STATO_LABELS[r.stato] ?? r.stato,
      render: (r) => <span className={`bdg ${STATO_STYLE[r.stato]}`}>{STATO_LABELS[r.stato]}</span>,
    },
    {
      key: "notaMgr",
      label: "Nota mgr",
      getValue: (r) => r.notaMgr || "",
      render: (r) => <span style={{ fontSize: 12, color: "var(--tm)" }}>{r.notaMgr || "\u2014"}</span>,
    },
  ];

  return (
    <>
      <Header title="Le mie richieste" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Le mie richieste</div>
            <div className="ss">{mie.length} richieste totali</div>
          </div>
          <button className="btn bp" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Nuova richiesta
          </button>
        </div>

        {mie.length === 0 ? (
          <div className="card2" style={{ textAlign: "center", padding: 40 }}>
            <Calendar size={32} style={{ color: "var(--tm)", margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nessuna richiesta</div>
            <div style={{ fontSize: 12.5, color: "var(--tm)" }}>Non hai ancora inviato richieste ferie o permessi.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <SortableTable<Richiesta>
              columns={columns}
              data={mie}
              rowKey={(r) => r.id}
              emptyMessage="Nessuna richiesta"
            />
          </div>
        )}
      </div>
    </>
  );
}
