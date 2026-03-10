"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useHRStore, useToastStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils/date";
import type { StatoRichiesta } from "@/types";

const STATO_V: Record<StatoRichiesta, "wa" | "ok" | "er"> = {
  pending: "wa", approvata: "ok", rifiutata: "er",
};
const STATO_L: Record<StatoRichiesta, string> = {
  pending: "In attesa", approvata: "Approvata", rifiutata: "Rifiutata",
};

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
      id: crypto.randomUUID(), empId: currentUserId, causaleId: form.causaleId,
      dal: form.dal, al: form.al || form.dal,
      ore: form.ore ? Number(form.ore) : undefined,
      note: form.note, stato: "pending", createdAt: new Date().toISOString(),
    });
    showToast("Richiesta inviata", "ok");
    setModal(false);
    setForm({ causaleId: "", dal: "", al: "", ore: "", note: "" });
  }

  return (
    <div>
      <div className="toolbar">
        <select className="fi" style={{ width: "auto" }} value={fStato} onChange={(e) => setFStato(e.target.value as StatoRichiesta | "all")}>
          <option value="all">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approvata">Approvata</option>
          <option value="rifiutata">Rifiutata</option>
        </select>
        <Button size="sm" onClick={() => setModal(true)}>
          <Plus size={14} /> Nuova richiesta
        </Button>
      </div>

      <div className="tw">
        <table className="tbl">
          <thead>
            <tr>
              <th>Dipendente</th>
              <th>Causale</th>
              <th>Dal</th>
              <th>Al</th>
              <th>Note</th>
              <th>Stato</th>
              <th>Nota mgr</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const emp = getEmp(r.empId);
              const causale = getCausale(r.causaleId);
              return (
                <tr key={r.id}>
                  <td>
                    {emp
                      ? <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar ini={emp.ini} color={emp.col} size="sm" />
                          <span className="t-main">{emp.full}</span>
                        </div>
                      : <span className="muted">{r.empId}</span>
                    }
                  </td>
                  <td>
                    {causale
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span>{causale.icona}</span><span>{causale.nome}</span>
                        </span>
                      : r.causaleId
                    }
                  </td>
                  <td className="mono">{formatDate(r.dal)}</td>
                  <td className="mono">{formatDate(r.al)}</td>
                  <td style={{ maxWidth: 180 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {r.note || "—"}
                    </span>
                  </td>
                  <td><Badge variant={STATO_V[r.stato]}>{STATO_L[r.stato]}</Badge></td>
                  <td className="muted">{r.notaMgr || "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--tm)" }}>Nessuna richiesta trovata</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuova richiesta"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Annulla</Button><Button onClick={handleSubmit}>Invia richiesta</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="lbl">Causale *</label>
            <select className="fi" value={form.causaleId} onChange={(e) => setForm((f) => ({ ...f, causaleId: e.target.value }))}>
              <option value="">— Seleziona causale —</option>
              {causali.filter((c) => c.attiva && c.visibile_dipendente).map((c) => (
                <option key={c.id} value={c.id}>{c.icona} {c.nome}</option>
              ))}
            </select>
          </div>
          <div className="g2">
            <div>
              <label className="lbl">Dal *</label>
              <input className="fi" type="date" value={form.dal} onChange={(e) => setForm((f) => ({ ...f, dal: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Al</label>
              <input className="fi" type="date" value={form.al} onChange={(e) => setForm((f) => ({ ...f, al: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="lbl">Ore (per permessi orari)</label>
            <input className="fi" type="number" min="0.5" max="8" step="0.5" value={form.ore}
              onChange={(e) => setForm((f) => ({ ...f, ore: e.target.value }))} placeholder="es. 4" />
          </div>
          <div>
            <label className="lbl">Note</label>
            <textarea className="fi" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Motivazione o informazioni aggiuntive…" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
