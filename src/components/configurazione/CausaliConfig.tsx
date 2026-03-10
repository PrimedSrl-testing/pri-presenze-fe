"use client";

import { useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useHRStore, useToastStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Causale, ProtezioneAssenza, TipoDurata } from "@/types";

const PROTEZIONE_V: Record<ProtezioneAssenza, "er" | "wa" | "nn"> = {
  protetta: "er", compensabile: "wa", neutra: "nn",
};

const EMPTY_CAUSALE: Omit<Causale, "id"> = {
  nome: "", tipo_durata: "giorni", chi_inserisce: ["hr"],
  approvazione_hr: false, protezione: "neutra",
  colore: "#3b5bdb", icona: "📋", note: "",
  visibile_dipendente: true, attiva: true,
};

export function CausaliConfig() {
  const { causali, addCausale, updateCausale, deleteCausale } = useHRStore();
  const { showToast } = useToastStore();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data?: Causale }>({ open: false });
  const [form, setForm] = useState({ ...EMPTY_CAUSALE });

  const filtered = causali.filter((c) => !q || c.nome.toLowerCase().includes(q.toLowerCase()));

  function openEdit(c?: Causale) {
    if (c) { const { id, ...rest } = c; setForm(rest); }
    else setForm({ ...EMPTY_CAUSALE });
    setModal({ open: true, data: c });
  }

  function handleSave() {
    if (!form.nome.trim()) { showToast("Il nome è obbligatorio", "err"); return; }
    if (modal.data) { updateCausale(modal.data.id, form); showToast("Causale aggiornata", "ok"); }
    else { addCausale({ ...form, id: crypto.randomUUID() }); showToast("Causale aggiunta", "ok"); }
    setModal({ open: false });
  }

  function handleDelete(c: Causale) {
    if (!confirm(`Eliminare "${c.nome}"?`)) return;
    deleteCausale(c.id);
    showToast("Causale eliminata", "ok");
  }

  return (
    <div>
      <div className="toolbar">
        <div className="search-wrap">
          <Search />
          <input className="fi" placeholder="Cerca causale…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="sm" onClick={() => openEdit()}><Plus size={14} /> Nuova causale</Button>
      </div>

      <div className="g3">
        {filtered.map((c) => (
          <div key={c.id} className="causale-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{c.icona}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13.5, color: "var(--t)" }}>{c.nome}</p>
                  <p className="muted">{c.tipo_durata.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <button className="icon-btn" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                <button className="icon-btn" onClick={() => handleDelete(c)} style={{ color: "var(--er)" }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <Badge variant={PROTEZIONE_V[c.protezione]}>{c.protezione}</Badge>
              {c.approvazione_hr && <Badge variant="in">Approv. HR</Badge>}
              {!c.attiva && <Badge variant="nn">Inattiva</Badge>}
            </div>
            {c.note && <p className="muted" style={{ marginTop: 8, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.note}</p>}
          </div>
        ))}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })}
        title={modal.data ? "Modifica causale" : "Nuova causale"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModal({ open: false })}>Annulla</Button><Button onClick={handleSave}>{modal.data ? "Salva" : "Aggiungi"}</Button></>}>
        <div className="form-grid">
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "80px 1fr", gap: 10 }}>
            <div>
              <label className="lbl">Icona</label>
              <input className="fi" style={{ textAlign: "center", fontSize: 18 }} value={form.icona} onChange={(e) => setForm((f) => ({ ...f, icona: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Nome *</label>
              <input className="fi" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome causale" />
            </div>
          </div>
          <div>
            <label className="lbl">Tipo durata</label>
            <select className="fi" value={form.tipo_durata} onChange={(e) => setForm((f) => ({ ...f, tipo_durata: e.target.value as TipoDurata }))}>
              <option value="giorni">Giorni</option>
              <option value="ore_giornaliere">Ore giornaliere</option>
              <option value="ore_libere">Ore libere</option>
              <option value="periodo">Periodo</option>
              <option value="giornata_intera">Giornata intera</option>
            </select>
          </div>
          <div>
            <label className="lbl">Protezione</label>
            <select className="fi" value={form.protezione} onChange={(e) => setForm((f) => ({ ...f, protezione: e.target.value as ProtezioneAssenza }))}>
              <option value="protetta">Protetta</option>
              <option value="compensabile">Compensabile</option>
              <option value="neutra">Neutra</option>
            </select>
          </div>
          <div>
            <label className="lbl">Colore</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="color" value={form.colore} onChange={(e) => setForm((f) => ({ ...f, colore: e.target.value }))}
                style={{ width: 44, height: 36, border: "1px solid var(--bdr)", borderRadius: "var(--r2)", padding: 3, cursor: "pointer" }} />
              <span className="mono muted">{form.colore}</span>
            </div>
          </div>
          <div className="full">
            <label className="lbl">Note operative</label>
            <textarea className="fi" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Riferimenti normativi, istruzioni…" />
          </div>
          <div className="full" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {[
              { key: "approvazione_hr", label: "Richiede approvazione HR" },
              { key: "visibile_dipendente", label: "Visibile al dipendente" },
              { key: "attiva", label: "Causale attiva" },
            ].map((item) => (
              <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "var(--t2)" }}>
                <input type="checkbox"
                  checked={form[item.key as keyof typeof form] as boolean}
                  onChange={(e) => setForm((f) => ({ ...f, [item.key]: e.target.checked }))}
                  style={{ width: 15, height: 15, accentColor: "var(--ac)" }}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
