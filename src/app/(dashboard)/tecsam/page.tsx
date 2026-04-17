"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { KpiCard } from "@/components/ui/KpiCard";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { useToastStore } from "@/lib/store";
import type { TecsamRecord, TipoTecsam, StatoTecsam } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  GraduationCap,
  AlertTriangle,
  Calendar,
  Loader2,
  Save,
  Search,
  Filter,
  CheckCircle,
  Clock,
} from "lucide-react";

const TIPO_LABELS: Record<TipoTecsam, string> = {
  visita_medica: "Visita Medica",
  formazione: "Formazione",
  altro: "Altro",
};

const STATO_LABELS: Record<StatoTecsam, string> = {
  da_programmare: "Da programmare",
  programmata: "Programmata",
  effettuata: "Effettuata",
  scaduta: "Scaduta",
};

const STATO_VARIANTS: Record<StatoTecsam, "er" | "wa" | "ok" | "nn"> = {
  scaduta: "er",
  da_programmare: "wa",
  programmata: "ac" as any,
  effettuata: "ok",
};

const EMPTY_FORM = {
  dip_id: 0,
  tipo: "visita_medica" as TipoTecsam,
  descrizione: "",
  data_scadenza: "",
  data_prossima: "",
  data_effettuata: "",
  stato: "da_programmare" as StatoTecsam,
  esito: "",
  note: "",
};

export default function TecsamPage() {
  const { showToast } = useToastStore();
  const [records, setRecords] = useState<TecsamRecord[]>([]);
  const [dipendenti, setDipendenti] = useState<{ id: number; nome: string; matricola: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editId?: number }>({ open: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterStato, setFilterStato] = useState<string>("");
  const [q, setQ] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tecsamRes, dipRes] = await Promise.all([
        fetch("/api/tecsam"),
        fetch("/api/dipendenti"),
      ]);
      if (tecsamRes.ok) setRecords(await tecsamRes.json());
      if (dipRes.ok) {
        const dips = await dipRes.json();
        setDipendenti(dips.map((d: any) => ({ id: d.id, nome: d.nome, matricola: d.matricola })));
      }
    } catch (err: any) {
      showToast(err.message, "err");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = records.filter((r) => {
    if (filterTipo && r.tipo !== filterTipo) return false;
    if (filterStato && r.stato !== filterStato) return false;
    if (q) {
      const search = q.toLowerCase();
      return (
        (r.dip_nome ?? "").toLowerCase().includes(search) ||
        (r.matricola ?? "").toLowerCase().includes(search) ||
        r.descrizione.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setModal({ open: true });
  };

  const openEdit = (r: TecsamRecord) => {
    setForm({
      dip_id: r.dip_id,
      tipo: r.tipo,
      descrizione: r.descrizione,
      data_scadenza: r.data_scadenza?.toString().split("T")[0] ?? "",
      data_prossima: r.data_prossima?.toString().split("T")[0] ?? "",
      data_effettuata: r.data_effettuata?.toString().split("T")[0] ?? "",
      stato: r.stato,
      esito: r.esito ?? "",
      note: r.note ?? "",
    });
    setModal({ open: true, editId: r.id });
  };

  const handleSave = async () => {
    if (!form.dip_id || !form.descrizione.trim()) {
      showToast("Dipendente e descrizione sono obbligatori", "err");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        data_scadenza: form.data_scadenza || null,
        data_prossima: form.data_prossima || null,
        data_effettuata: form.data_effettuata || null,
        esito: form.esito || null,
        note: form.note || null,
      };

      const url = modal.editId ? `/api/tecsam/${modal.editId}` : "/api/tecsam";
      const method = modal.editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      showToast(modal.editId ? "Record aggiornato" : "Record creato", "ok");
      setModal({ open: false });
      fetchData();
    } catch (err: any) {
      showToast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: TecsamRecord) => {
    if (!confirm(`Eliminare "${r.descrizione}"?`)) return;
    try {
      await fetch(`/api/tecsam/${r.id}`, { method: "DELETE" });
      showToast("Record eliminato", "ok");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "err");
    }
  };

  // KPI counts
  const visitePending = records.filter((r) => r.tipo === "visita_medica" && r.stato !== "effettuata").length;
  const formazionePending = records.filter((r) => r.tipo === "formazione" && r.stato !== "effettuata").length;
  const scadute = records.filter((r) => r.stato === "scaduta").length;
  const daProgrammare = records.filter((r) => r.stato === "da_programmare").length;

  const columns: Column<TecsamRecord>[] = [
    {
      key: "dipendente",
      label: "Dipendente",
      getValue: (r) => r.dip_nome ?? `ID ${r.dip_id}`,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.dip_nome ?? `ID ${r.dip_id}`}</div>
          {r.matricola && <div style={{ fontSize: 11, color: "var(--tm)" }}>{r.matricola}</div>}
        </div>
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      getValue: (r) => TIPO_LABELS[r.tipo],
      render: (r) => (
        <Badge variant={r.tipo === "visita_medica" ? "wa" : r.tipo === "formazione" ? "ac" : "nn"}>
          {TIPO_LABELS[r.tipo]}
        </Badge>
      ),
    },
    {
      key: "descrizione",
      label: "Descrizione",
      getValue: (r) => r.descrizione,
      render: (r) => (
        <span style={{ fontSize: 13, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>
          {r.descrizione}
        </span>
      ),
    },
    {
      key: "scadenza",
      label: "Scadenza",
      getValue: (r) => r.data_scadenza ? new Date(r.data_scadenza).toLocaleDateString("it-IT") : "",
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "var(--t2)" }}>
          {r.data_scadenza ? new Date(r.data_scadenza).toLocaleDateString("it-IT") : "-"}
        </span>
      ),
    },
    {
      key: "prossima",
      label: "Prossima",
      getValue: (r) => r.data_prossima ? new Date(r.data_prossima).toLocaleDateString("it-IT") : "",
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "var(--t2)" }}>
          {r.data_prossima ? new Date(r.data_prossima).toLocaleDateString("it-IT") : "-"}
        </span>
      ),
    },
    {
      key: "stato",
      label: "Stato",
      getValue: (r) => STATO_LABELS[r.stato],
      render: (r) => (
        <Badge variant={STATO_VARIANTS[r.stato] ?? "nn"}>
          {STATO_LABELS[r.stato]}
        </Badge>
      ),
    },
    {
      key: "azioni",
      label: "Azioni",
      width: 70,
      sortable: false,
      searchable: false,
      getValue: () => "",
      render: (r) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openEdit(r); }} title="Modifica">
            <Pencil size={13} />
          </button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(r); }} title="Elimina" style={{ color: "var(--er)" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <>
        <Header title="Visite & Formazioni" />
        <div className="pg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <Loader2 size={28} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Visite & Formazioni — Tecsam" />
      <div className="pg anim-fi" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* KPIs */}
        <div className="g4">
          <KpiCard label="Visite Pendenti" value={visitePending} icon={ShieldCheck} />
          <KpiCard label="Formazioni Pendenti" value={formazionePending} icon={GraduationCap} />
          <KpiCard label="Scadute" value={scadute} icon={AlertTriangle} />
          <KpiCard label="Da Programmare" value={daProgrammare} icon={Clock} />
        </div>

        {/* Search + Filters + Add */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--tm)" }} />
            <input
              className="fi"
              style={{ paddingLeft: 32 }}
              placeholder="Cerca dipendente o descrizione..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="fi" style={{ width: 160 }} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
            <option value="">Tutti i tipi</option>
            <option value="visita_medica">Visita Medica</option>
            <option value="formazione">Formazione</option>
            <option value="altro">Altro</option>
          </select>
          <select className="fi" style={{ width: 160 }} value={filterStato} onChange={(e) => setFilterStato(e.target.value)}>
            <option value="">Tutti gli stati</option>
            <option value="da_programmare">Da programmare</option>
            <option value="programmata">Programmata</option>
            <option value="effettuata">Effettuata</option>
            <option value="scaduta">Scaduta</option>
          </select>
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus size={14} /> Nuovo
          </Button>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <SortableTable<TecsamRecord>
            columns={columns}
            data={filtered}
            rowKey={(r) => r.id}
            emptyMessage="Nessun record trovato"
          />
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.editId ? "Modifica Record" : "Nuovo Record Tecsam"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="lbl">Dipendente *</label>
            <select
              className="fi"
              value={form.dip_id || ""}
              onChange={(e) => setForm((f) => ({ ...f, dip_id: Number(e.target.value) }))}
            >
              <option value="">-- Seleziona --</option>
              {dipendenti.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({d.matricola})
                </option>
              ))}
            </select>
          </div>

          <div className="g2">
            <div>
              <label className="lbl">Tipo</label>
              <select
                className="fi"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoTecsam }))}
              >
                <option value="visita_medica">Visita Medica</option>
                <option value="formazione">Formazione</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="lbl">Stato</label>
              <select
                className="fi"
                value={form.stato}
                onChange={(e) => setForm((f) => ({ ...f, stato: e.target.value as StatoTecsam }))}
              >
                <option value="da_programmare">Da programmare</option>
                <option value="programmata">Programmata</option>
                <option value="effettuata">Effettuata</option>
                <option value="scaduta">Scaduta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="lbl">Descrizione *</label>
            <input
              className="fi"
              value={form.descrizione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              placeholder="Es. Visita medica periodica annuale"
            />
          </div>

          <div className="g3">
            <div>
              <label className="lbl">Data scadenza</label>
              <input
                className="fi"
                type="date"
                value={form.data_scadenza}
                onChange={(e) => setForm((f) => ({ ...f, data_scadenza: e.target.value }))}
              />
            </div>
            <div>
              <label className="lbl">Data prossima</label>
              <input
                className="fi"
                type="date"
                value={form.data_prossima}
                onChange={(e) => setForm((f) => ({ ...f, data_prossima: e.target.value }))}
              />
            </div>
            <div>
              <label className="lbl">Data effettuata</label>
              <input
                className="fi"
                type="date"
                value={form.data_effettuata}
                onChange={(e) => setForm((f) => ({ ...f, data_effettuata: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="lbl">Esito</label>
            <input
              className="fi"
              value={form.esito}
              onChange={(e) => setForm((f) => ({ ...f, esito: e.target.value }))}
              placeholder="Esito visita/formazione..."
            />
          </div>

          <div>
            <label className="lbl">Note</label>
            <input
              className="fi"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Note aggiuntive..."
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid var(--bdr)" }}>
            <Button variant="secondary" size="sm" onClick={() => setModal({ open: false })}>
              Annulla
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={14} />}
              {modal.editId ? "Salva Modifiche" : "Crea Record"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
