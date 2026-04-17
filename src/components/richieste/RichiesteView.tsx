"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useHRStore, useToastStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { formatDate } from "@/lib/utils/date";
import type { Richiesta, StatoRichiesta } from "@/types";

const STATO_V: Record<StatoRichiesta, "wa" | "ok" | "er"> = { pending: "wa", approvata: "ok", rifiutata: "er" };
const STATO_L: Record<StatoRichiesta, string> = { pending: "In attesa", approvata: "Approvata", rifiutata: "Rifiutata" };

export function RichiesteView() {
  const { richieste, collaboratori, causali, addRichiesta, currentUserId } = useHRStore();
  const { showToast } = useToastStore();
  const [fStato, setFStato] = useState<StatoRichiesta | "all">("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ causaleId: "", dal: "", al: "", ore: "", note: "" });

  const filtered = richieste.filter((r) => fStato === "all" || r.stato === fStato);
  const getEmp = (id: string) => collaboratori.find((c) => c.id === id);
  const getCausale = (id: string) => causali.find((c) => c.id === id);

  function handleSubmit() {
    if (!form.causaleId || !form.dal) { showToast("Causale e data inizio obbligatorie", "err"); return; }
    addRichiesta({
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36), empId: currentUserId, causaleId: form.causaleId,
      dal: form.dal, al: form.al || form.dal, ore: form.ore ? Number(form.ore) : undefined,
      note: form.note, stato: "pending", createdAt: new Date().toISOString(),
    });
    showToast("Richiesta inviata", "ok");
    setModal(false);
    setForm({ causaleId: "", dal: "", al: "", ore: "", note: "" });
  }

  const columns: Column<Richiesta>[] = [
    { key: "dipendente", label: "Dipendente", getValue: (r) => getEmp(r.empId)?.full ?? r.empId, render: (r) => {
      const emp = getEmp(r.empId);
      return emp ? <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Avatar ini={emp.ini} color={emp.col} size="sm" /><span>{emp.full}</span></div> : <span>{r.empId}</span>;
    }},
    { key: "causale", label: "Causale", getValue: (r) => getCausale(r.causaleId)?.nome ?? r.causaleId, render: (r) => {
      const c = getCausale(r.causaleId);
      return c ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span>{c.icona}</span><span>{c.nome}</span></span> : <span>{r.causaleId}</span>;
    }},
    { key: "dal", label: "Dal", getValue: (r) => r.dal, render: (r) => <span style={{ fontFamily: "var(--m)", fontSize: 12.5 }}>{formatDate(r.dal)}</span> },
    { key: "al", label: "Al", getValue: (r) => r.al, render: (r) => <span style={{ fontFamily: "var(--m)", fontSize: 12.5 }}>{formatDate(r.al)}</span> },
    { key: "note", label: "Note", getValue: (r) => r.note, render: (r) => <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{r.note || "—"}</span> },
    { key: "stato", label: "Stato", getValue: (r) => r.stato, render: (r) => <Badge variant={STATO_V[r.stato]}>{STATO_L[r.stato]}</Badge> },
    { key: "nota_mgr", label: "Nota mgr", getValue: (r) => r.notaMgr ?? "", render: (r) => <span style={{ color: "var(--tm)" }}>{r.notaMgr || "—"}</span> },
  ];

  return (
    <div>
      <div className="toolbar">
        <select className="fi" style={{ width: "auto" }} value={fStato} onChange={(e) => setFStato(e.target.value as StatoRichiesta | "all")}>
          <option value="all">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approvata">Approvata</option>
          <option value="rifiutata">Rifiutata</option>
        </select>
        <Button size="sm" onClick={() => setModal(true)}><Plus size={14} /> Nuova richiesta</Button>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 12 }}>
        <SortableTable<Richiesta> columns={columns} data={filtered} rowKey={(r) => r.id} emptyMessage="Nessuna richiesta trovata" />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuova richiesta"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Annulla</Button><Button onClick={handleSubmit}>Invia richiesta</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label className="lbl">Causale *</label>
            <select className="fi" value={form.causaleId} onChange={(e) => setForm((f) => ({ ...f, causaleId: e.target.value }))}>
              <option value="">— Seleziona causale —</option>
              {causali.filter((c) => c.attiva && c.visibile_dipendente).map((c) => <option key={c.id} value={c.id}>{c.icona} {c.nome}</option>)}
            </select>
          </div>
          <div className="g2">
            <div><label className="lbl">Dal *</label><input className="fi" type="date" value={form.dal} onChange={(e) => setForm((f) => ({ ...f, dal: e.target.value }))} /></div>
            <div><label className="lbl">Al</label><input className="fi" type="date" value={form.al} onChange={(e) => setForm((f) => ({ ...f, al: e.target.value }))} /></div>
          </div>
          <div><label className="lbl">Ore (per permessi orari)</label><input className="fi" type="number" min="0.5" max="8" step="0.5" value={form.ore} onChange={(e) => setForm((f) => ({ ...f, ore: e.target.value }))} placeholder="es. 4" /></div>
          <div><label className="lbl">Note</label><textarea className="fi" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Motivazione..." /></div>
        </div>
      </Modal>
    </div>
  );
}
