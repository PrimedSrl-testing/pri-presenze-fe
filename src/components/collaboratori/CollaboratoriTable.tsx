"use client";

import { useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useHRStore, useToastStore } from "@/lib/store";
import { AZIENDE } from "@/lib/data/aziende";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { formatDate, getContractUrgency, daysUntil } from "@/lib/utils/date";
import type { Collaboratore, TipoCollaborazione } from "@/types";
import { CollaboratoreModal } from "./CollaboratoreModal";

const TIPO_LABELS: Record<TipoCollaborazione, string> = {
  dipendente:   "Dipendente",
  libero_prof:  "Libero Prof.",
  consulente:   "Consulente",
  stagista:     "Stagista",
  apprendista:  "Apprendista",
  somministrato:"Somministrato",
};

export function CollaboratoriTable() {
  const { collaboratori, deleteCollaboratore } = useHRStore();
  const { showToast } = useToastStore();
  const [q, setQ] = useState("");
  const [fAz, setFAz] = useState("all");
  const [fTip, setFTip] = useState("all");
  const [modal, setModal] = useState<{ open: boolean; data?: Collaboratore }>({ open: false });

  const filtered = collaboratori.filter((c) => {
    const matchQ = !q || c.full.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase()) || c.mat.toLowerCase().includes(q.toLowerCase());
    const matchAz = fAz === "all" || c.co === fAz;
    const matchTip = fTip === "all" || c.tipo === fTip;
    return matchQ && matchAz && matchTip;
  });

  function handleDelete(c: Collaboratore) {
    if (!confirm(`Eliminare ${c.full}?`)) return;
    deleteCollaboratore(c.id);
    showToast(`${c.full} eliminato`, "ok");
  }

  function urgencyBadge(c: Collaboratore) {
    if (!c.fin_contratto) return null;
    const u = getContractUrgency(c.fin_contratto);
    if (!u) return null;
    const days = daysUntil(c.fin_contratto);
    const variant = days < 0 ? "er" : u === "critica" ? "er" : u === "alta" ? "wa" : "in";
    return <Badge variant={variant as "er" | "wa" | "in"}>{days < 0 ? "Scaduto" : `${days}gg`}</Badge>;
  }

  const columns: Column<Collaboratore>[] = [
    {
      key: "collaboratore",
      label: "Collaboratore",
      getValue: (c) => c.full,
      render: (c) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar ini={c.ini} color={c.col} size="sm" />
          <div>
            <p className="t-main">{c.full}</p>
            <p className="muted">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      getValue: (c) => TIPO_LABELS[c.tipo],
      render: (c) => <Badge variant="nn">{TIPO_LABELS[c.tipo]}</Badge>,
    },
    { key: "reparto", label: "Reparto", getValue: (c) => c.dept },
    {
      key: "azienda",
      label: "Azienda",
      getValue: (c) => AZIENDE.find((a) => a.id === c.co)?.nome ?? c.co,
      render: (c) => {
        const az = AZIENDE.find((a) => a.id === c.co);
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: az?.colore ?? "#94a3b8", display: "inline-block" }} />
            {az?.nome ?? c.co}
          </span>
        );
      },
    },
    { key: "contratto", label: "Contratto", getValue: (c) => c.tempo },
    {
      key: "scadenza",
      label: "Scadenza",
      getValue: (c) => c.fin_contratto ?? "",
      render: (c) =>
        c.fin_contratto ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--m)", fontSize: 12 }}>{formatDate(c.fin_contratto)}</span>
            {urgencyBadge(c)}
          </span>
        ) : <span className="muted">&mdash;</span>,
    },
    {
      key: "stato",
      label: "Stato",
      getValue: (c) => c.attivo ? "Attivo" : "Inattivo",
      render: (c) => <Badge variant={c.attivo ? "ok" : "nn"}>{c.attivo ? "Attivo" : "Inattivo"}</Badge>,
    },
    {
      key: "azioni",
      label: "",
      sortable: false,
      searchable: false,
      getValue: () => "",
      render: (c) => (
        <div style={{ display: "flex", gap: 2 }}>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setModal({ open: true, data: c }); }} title="Modifica">
            <Pencil size={14} />
          </button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(c); }} title="Elimina"
            style={{ color: "var(--er)" }}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search />
          <input
            className="fi"
            placeholder="Cerca per nome, email, matricola…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select className="fi" style={{ width: "auto" }} value={fAz} onChange={(e) => setFAz(e.target.value)}>
          <option value="all">Tutte le aziende</option>
          {AZIENDE.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        <select className="fi" style={{ width: "auto" }} value={fTip} onChange={(e) => setFTip(e.target.value)}>
          <option value="all">Tutti i tipi</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <Button size="sm" onClick={() => setModal({ open: true })}>
          <Plus size={14} /> Aggiungi
        </Button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <SortableTable<Collaboratore>
          columns={columns}
          data={filtered}
          rowKey={(c) => c.id}
          emptyMessage="Nessun collaboratore trovato"
        />
      </div>

      <p className="muted" style={{ marginTop: 10 }}>{filtered.length} di {collaboratori.length} collaboratori</p>

      <CollaboratoreModal open={modal.open} data={modal.data} onClose={() => setModal({ open: false })} />
    </div>
  );
}
