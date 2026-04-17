"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import type { Collaboratore } from "@/types";

export default function RepartoDipendentiPage() {
  const { collaboratori, currentUserId } = useHRStore();
  const me = collaboratori.find((c) => c.id === currentUserId);
  const myDept = me?.dept ?? "";
  const list = collaboratori.filter((c) => c.attivo && c.dept === myDept);

  const columns: Column<Collaboratore>[] = [
    { key: "nome", label: "Dipendente", getValue: (c) => c.full, render: (c) => (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Avatar ini={c.ini} color={c.col} size="sm" />
        <div><div className="t-main">{c.full}</div><div style={{ fontSize: 11, color: "var(--tm)" }}>{c.email}</div></div>
      </div>
    )},
    { key: "mansione", label: "Mansione", getValue: (c) => c.mansione },
    { key: "contratto", label: "Contratto", getValue: (c) => c.tempo, render: (c) => <span className={`bdg ${c.tempo === "Indeterminato" ? "ok" : "wa"}`}>{c.tempo}</span> },
    { key: "stato", label: "Stato", getValue: (c) => c.status, render: (c) => (
      <span className={`status-dot ${c.status === "IN" ? "in" : "out"}`}><span className="dot" />{c.status === "IN" ? "Presente" : "Assente"}</span>
    )},
  ];

  return (
    <>
      <Header title="Dipendenti Reparto" />
      <div className="pg anim-fi">
        <div className="sh"><div><div className="stit">Dipendenti del reparto</div><div className="ss">{myDept} — {list.length} dipendenti</div></div></div>
        <div className="card" style={{ padding: 0, marginTop: 16 }}>
          <SortableTable<Collaboratore> columns={columns} data={list} rowKey={(c) => c.id} emptyMessage="Nessun dipendente nel reparto" />
        </div>
      </div>
    </>
  );
}
