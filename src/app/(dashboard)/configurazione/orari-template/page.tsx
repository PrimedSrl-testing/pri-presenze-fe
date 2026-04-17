"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { KpiCard } from "@/components/ui/KpiCard";
import { WeekGridEditor } from "@/components/configurazione/WeekGridEditor";
import { useToastStore } from "@/lib/store";
import type { OrarioTemplate, OrarioTemplateGiorno } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Loader2,
  Save,
  Grid3X3,
  Users,
} from "lucide-react";

type GiornoForm = Omit<OrarioTemplateGiorno, "id" | "template_id">;

const EMPTY_FORM = {
  nome: "",
  num_settimane: 1,
  attivo: true,
  note: "",
  giorni: [] as GiornoForm[],
};

export default function OrariTemplatePage() {
  const { showToast } = useToastStore();
  const [templates, setTemplates] = useState<OrarioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editId?: number }>({ open: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orari-template");
      if (!res.ok) throw new Error("Errore nel caricamento");
      setTemplates(await res.json());
    } catch (err: any) {
      showToast(err.message, "err");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setModal({ open: true });
  };

  const openEdit = (t: OrarioTemplate) => {
    setForm({
      nome: t.nome,
      num_settimane: t.num_settimane,
      attivo: t.attivo,
      note: t.note ?? "",
      giorni: (t.giorni ?? []).map((g) => ({
        settimana_num: g.settimana_num,
        giorno_settimana: g.giorno_settimana,
        ore_teoriche: g.ore_teoriche,
        orario_inizio: g.orario_inizio,
        orario_fine: g.orario_fine,
      })),
    });
    setModal({ open: true, editId: t.id });
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      showToast("Il nome e obbligatorio", "err");
      return;
    }
    setSaving(true);
    try {
      const url = modal.editId
        ? `/api/orari-template/${modal.editId}`
        : "/api/orari-template";
      const method = modal.editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      showToast(modal.editId ? "Template aggiornato" : "Template creato", "ok");
      setModal({ open: false });
      fetchData();
    } catch (err: any) {
      showToast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: OrarioTemplate) => {
    if (!confirm(`Eliminare il template "${t.nome}"?`)) return;
    try {
      const res = await fetch(`/api/orari-template/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      showToast("Template eliminato", "ok");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "err");
    }
  };

  const SETT_LABELS = ["A", "B", "C", "D"];

  if (loading) {
    return (
      <>
        <Header title="Template Orari" />
        <div className="pg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <Loader2 size={28} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Template Orari Multi-Settimanali" />
      <div className="pg anim-fi" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* KPIs */}
        <div className="g3">
          <KpiCard label="Template Totali" value={templates.length} icon={Grid3X3} />
          <KpiCard label="Attivi" value={templates.filter((t) => t.attivo).length} icon={CalendarClock} />
          <KpiCard label="Multi-Settimana" value={templates.filter((t) => t.num_settimane > 1).length} icon={Users} />
        </div>

        {/* Header + Add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 16, color: "var(--t)" }}>
              Template Orari
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--tm)", marginTop: 2 }}>
              Definisci schemi orari settimanali con rotazione automatica (Sett. A, B, C, D)
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus size={14} /> Nuovo Template
          </Button>
        </div>

        {/* Templates list */}
        {templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--tm)" }}>
            <CalendarClock size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Nessun template configurato</p>
            <p style={{ fontSize: 12 }}>Crea il primo template per iniziare</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {templates.map((t) => (
              <div key={t.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--t)" }}>
                      {t.nome}
                    </span>
                    <Badge variant={t.attivo ? "ok" : "nn"}>
                      {t.attivo ? "Attivo" : "Disattivato"}
                    </Badge>
                    <Badge variant="ac">
                      {t.num_settimane} sett.{t.num_settimane > 1 ? ` (${SETT_LABELS.slice(0, t.num_settimane).join("/")} )` : ""}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="icon-btn" onClick={() => openEdit(t)} title="Modifica">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => handleDelete(t)} title="Elimina" style={{ color: "var(--er)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Preview grid */}
                {t.giorni && t.giorni.length > 0 && (
                  <WeekGridEditor
                    numSettimane={t.num_settimane}
                    giorni={t.giorni.map((g) => ({
                      settimana_num: g.settimana_num,
                      giorno_settimana: g.giorno_settimana,
                      ore_teoriche: g.ore_teoriche,
                      orario_inizio: g.orario_inizio,
                      orario_fine: g.orario_fine,
                    }))}
                    onChange={() => {}}
                    readOnly
                  />
                )}

                {t.note && (
                  <p style={{ fontSize: 12, color: "var(--tm)", fontStyle: "italic" }}>{t.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.editId ? "Modifica Template" : "Nuovo Template Orario"}
        size="lg"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="g2">
            <div>
              <label className="lbl">Nome template *</label>
              <input
                className="fi"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Es. Rotazione 2 settimane"
              />
            </div>
            <div>
              <label className="lbl">Numero settimane nel ciclo</label>
              <select
                className="fi"
                value={form.num_settimane}
                onChange={(e) => setForm((f) => ({ ...f, num_settimane: Number(e.target.value) }))}
              >
                <option value={1}>1 settimana (orario fisso)</option>
                <option value={2}>2 settimane (A/B)</option>
                <option value={3}>3 settimane (A/B/C)</option>
                <option value={4}>4 settimane (A/B/C/D)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="lbl" style={{ marginBottom: 8 }}>Ore per giorno</label>
            <WeekGridEditor
              numSettimane={form.num_settimane}
              giorni={form.giorni}
              onChange={(giorni) => setForm((f) => ({ ...f, giorni }))}
            />
          </div>

          <div className="g2">
            <div>
              <label className="lbl">Note</label>
              <input
                className="fi"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Note opzionali..."
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={form.attivo}
                  onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "var(--ac)" }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>Attivo</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid var(--bdr)" }}>
            <Button variant="secondary" size="sm" onClick={() => setModal({ open: false })}>
              Annulla
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={14} />}
              {modal.editId ? "Salva Modifiche" : "Crea Template"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
