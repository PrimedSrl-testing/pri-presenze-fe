"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useHRStore, useToastStore } from "@/lib/store";
import { AZIENDE } from "@/lib/data/aziende";
import { DIPARTIMENTI } from "@/lib/data/dipartimenti";
import type { Collaboratore, TipoCollaborazione, RuoloUtente, TipoContratto } from "@/types";

interface Props { open: boolean; data?: Collaboratore; onClose: () => void; }

const EMPTY = {
  fn: "", ln: "", email: "", phone: "", cf: "", societa: "",
  tipo: "dipendente" as TipoCollaborazione,
  dept: "", co: "primed", mansione: "",
  ini_contratto: "", fin_contratto: null as string | null,
  compenso: "", note: "", attivo: true, role: "dip" as RuoloUtente,
  mat: "", col: "#3b5bdb", status: "OUT" as "IN" | "OUT", tempo: "Indeterminato" as TipoContratto,
  hours: 40,
};

export function CollaboratoreModal({ open, data, onClose }: Props) {
  const { addCollaboratore, updateCollaboratore } = useHRStore();
  const { showToast } = useToastStore();
  const isEdit = !!data;
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    if (data) { const { id, full, ini, assignments, ...rest } = data; setForm(rest as typeof EMPTY); }
    else setForm({ ...EMPTY });
  }, [data, open]);

  function p<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit() {
    if (!form.fn.trim() || !form.ln.trim()) { showToast("Nome e cognome obbligatori", "err"); return; }
    if (!form.dept) { showToast("Il reparto è obbligatorio", "err"); return; }
    const full = `${form.fn} ${form.ln}`;
    const ini = `${form.fn[0]}${form.ln[0]}`.toUpperCase();
    if (isEdit && data) {
      updateCollaboratore(data.id, { ...form, full, ini });
      showToast("Collaboratore aggiornato", "ok");
    } else {
      addCollaboratore({
        ...form, id: crypto.randomUUID(), full, ini,
        assignments: form.dept ? [{ dept: form.dept, dal: form.ini_contratto || new Date().toISOString().split("T")[0], al: null }] : [],
      });
      showToast("Collaboratore aggiunto", "ok");
    }
    onClose();
  }

  const footer = <>
    <Button variant="secondary" onClick={onClose}>Annulla</Button>
    <Button onClick={handleSubmit}>{isEdit ? "Salva modifiche" : "Aggiungi"}</Button>
  </>;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifica collaboratore" : "Nuovo collaboratore"} footer={footer} size="lg">
      <div className="form-grid">
        <div>
          <label className="lbl">Nome *</label>
          <input className="fi" value={form.fn} onChange={(e) => p("fn", e.target.value)} placeholder="Mario" />
        </div>
        <div>
          <label className="lbl">Cognome *</label>
          <input className="fi" value={form.ln} onChange={(e) => p("ln", e.target.value)} placeholder="Rossi" />
        </div>
        <div>
          <label className="lbl">Email</label>
          <input className="fi" type="email" value={form.email} onChange={(e) => p("email", e.target.value)} placeholder="m.rossi@primed.it" />
        </div>
        <div>
          <label className="lbl">Telefono</label>
          <input className="fi" value={form.phone} onChange={(e) => p("phone", e.target.value)} placeholder="333 1234567" />
        </div>
        <div>
          <label className="lbl">CF / P.IVA</label>
          <input className="fi" value={form.cf} onChange={(e) => p("cf", e.target.value)} />
        </div>
        <div>
          <label className="lbl">Società</label>
          <input className="fi" value={form.societa} onChange={(e) => p("societa", e.target.value)} />
        </div>
        <div>
          <label className="lbl">Tipo collaborazione *</label>
          <select className="fi" value={form.tipo} onChange={(e) => p("tipo", e.target.value as TipoCollaborazione)}>
            <option value="dipendente">Dipendente</option>
            <option value="libero_prof">Libero Professionista</option>
            <option value="consulente">Consulente</option>
            <option value="stagista">Stagista</option>
            <option value="apprendista">Apprendista</option>
            <option value="somministrato">Somministrato</option>
          </select>
        </div>
        <div>
          <label className="lbl">Azienda</label>
          <select className="fi" value={form.co} onChange={(e) => p("co", e.target.value)}>
            {AZIENDE.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Reparto *</label>
          <select className="fi" value={form.dept} onChange={(e) => p("dept", e.target.value)}>
            <option value="">— Seleziona —</option>
            {DIPARTIMENTI.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Mansione</label>
          <input className="fi" value={form.mansione} onChange={(e) => p("mansione", e.target.value)} />
        </div>
        <div>
          <label className="lbl">Tipo contratto</label>
          <select className="fi" value={form.tempo} onChange={(e) => p("tempo", e.target.value as TipoContratto)}>
            <option value="Indeterminato">Indeterminato</option>
            <option value="Determinato">Determinato</option>
          </select>
        </div>
        <div>
          <label className="lbl">Ruolo sistema</label>
          <select className="fi" value={form.role} onChange={(e) => p("role", e.target.value as RuoloUtente)}>
            <option value="dip">Dipendente</option>
            <option value="mgr">Manager</option>
            <option value="amgr">Area Manager</option>
            <option value="hr">HR</option>
          </select>
        </div>
        <div>
          <label className="lbl">Inizio contratto</label>
          <input className="fi" type="date" value={form.ini_contratto} onChange={(e) => p("ini_contratto", e.target.value)} />
        </div>
        <div>
          <label className="lbl">Fine contratto</label>
          <input className="fi" type="date" value={form.fin_contratto ?? ""} onChange={(e) => p("fin_contratto", e.target.value || null)} />
        </div>
        <div>
          <label className="lbl">Compenso</label>
          <input className="fi" value={form.compenso} onChange={(e) => p("compenso", e.target.value)} placeholder="2.500 €/mese" />
        </div>
        <div>
          <label className="lbl">Matricola</label>
          <input className="fi" value={form.mat} onChange={(e) => p("mat", e.target.value)} placeholder="E001" />
        </div>
        <div className="full">
          <label className="lbl">Note</label>
          <textarea className="fi" rows={3} value={form.note} onChange={(e) => p("note", e.target.value)} />
        </div>
        <div className="full" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            id="attivo" type="checkbox" checked={form.attivo}
            onChange={(e) => p("attivo", e.target.checked)}
            style={{ width: 15, height: 15, accentColor: "var(--ac)" }}
          />
          <label htmlFor="attivo" style={{ fontSize: 13, color: "var(--t2)", cursor: "pointer" }}>
            Collaboratore attivo
          </label>
        </div>
      </div>
    </Modal>
  );
}
