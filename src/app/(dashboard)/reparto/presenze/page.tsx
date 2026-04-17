"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { LogIn, LogOut } from "lucide-react";
import type { Collaboratore } from "@/types";

const TODAY_PUNCHES: Record<string, { in?: string; out?: string }> = {
  "1": { in: "08:02" }, "2": { in: "08:15", out: "12:30" },
  "3": { in: "09:45" }, "4": { in: "08:00", out: "17:00" },
};

export default function RepartoPresenzePage() {
  const { collaboratori, currentUserId } = useHRStore();
  const me = collaboratori.find((c) => c.id === currentUserId);
  const myDept = me?.dept ?? "";
  const list = collaboratori.filter((c) => c.attivo && c.dept === myDept);

  const columns: Column<Collaboratore>[] = [
    { key: "nome", label: "Dipendente", getValue: (c) => c.full, render: (c) => (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Avatar ini={c.ini} color={c.col} size="sm" /><span>{c.full}</span></div>
    )},
    { key: "ingresso", label: "Ingresso", getValue: (c) => TODAY_PUNCHES[c.id]?.in ?? "", render: (c) => {
      const p = TODAY_PUNCHES[c.id]; return p?.in ? <span className="ts-punch in"><LogIn size={11} /> {p.in}</span> : <span className="muted">—</span>;
    }},
    { key: "uscita", label: "Uscita", getValue: (c) => TODAY_PUNCHES[c.id]?.out ?? "", render: (c) => {
      const p = TODAY_PUNCHES[c.id]; return p?.out ? <span className="ts-punch out"><LogOut size={11} /> {p.out}</span> : <span className="muted">—</span>;
    }},
    { key: "stato", label: "Stato", getValue: (c) => { const p = TODAY_PUNCHES[c.id]; return p?.in && !p.out ? "In sede" : p?.in && p.out ? "Uscito" : "Assente"; }, render: (c) => {
      const p = TODAY_PUNCHES[c.id];
      return p?.in && !p.out ? <span className="bdg ok">In sede</span> : p?.in && p.out ? <span className="bdg ac">Uscito</span> : <span className="bdg er">Assente</span>;
    }},
  ];

  return (
    <>
      <Header title="Presenze Reparto" />
      <div className="pg anim-fi">
        <div className="sh"><div><div className="stit">Presenze reparto</div><div className="ss">{myDept} — {new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</div></div></div>
        <div className="card" style={{ padding: 0, marginTop: 16 }}>
          <SortableTable<Collaboratore> columns={columns} data={list} rowKey={(c) => c.id} emptyMessage="Nessun dipendente" />
        </div>
      </div>
    </>
  );
}
