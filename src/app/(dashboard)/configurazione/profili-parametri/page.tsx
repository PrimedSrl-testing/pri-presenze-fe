"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/lib/store";
import type { ProfiloParametri, StepEccesso, StepDeficit, RegolaPausa } from "@/types";
import {
  Plus, Save, Trash2, Pencil, Loader2, Filter, Play,
  Settings2, Coffee, TrendingUp, TrendingDown, ChevronUp, ChevronDown,
  Users, CheckCircle, AlertTriangle,
} from "lucide-react";

const EMPTY_PROFILO = {
  nome: "", filtro_tipo_contratto: "", filtro_tipo_rapporto: "",
  filtro_ore_da: "", filtro_ore_a: "",
  regole_pausa: [] as RegolaPausa[],
  pausa_minuti: 30, pausa_soglia_ore: 8, pausa_auto: true,
  eccesso_pipeline: [{ dest: "straordinario" as const, max_ore: 8 }, { dest: "bop" as const, max_ore: null }] as StepEccesso[],
  deficit_pipeline: [{ source: "rol" as const, per: "parziale" as const }, { source: "ferie" as const, per: "intera" as const }] as StepDeficit[],
  straordinario_max_sett: 8, straordinario_max_giorno: 2, straordinario_priorita_sabato: true,
  priorita: 0, attivo: true, note: "",
};

const ECCESSO_OPT = [
  { value: "straordinario", label: "Straordinario", color: "#d97706" },
  { value: "boa", label: "BOA", color: "#3b82f6" },
  { value: "bop", label: "BOP (Salvadanaio)", color: "#8b5cf6" },
  { value: "bos", label: "BOS", color: "#6366f1" },
];
const DEFICIT_OPT = [
  { value: "rol", label: "ROL", color: "#059669" },
  { value: "ferie", label: "Ferie", color: "#d97706" },
  { value: "boa", label: "BOA", color: "#3b82f6" },
  { value: "bop", label: "BOP", color: "#8b5cf6" },
];

export default function ProfiliParametriPage() {
  const { showToast } = useToastStore();
  const [profili, setProfili] = useState<ProfiloParametri[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_PROFILO);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profili-parametri");
      if (res.ok) setProfili(await res.json());
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setForm({ ...EMPTY_PROFILO });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: ProfiloParametri) => {
    setForm({
      nome: p.nome,
      filtro_tipo_contratto: p.filtro_tipo_contratto ?? "",
      filtro_tipo_rapporto: p.filtro_tipo_rapporto ?? "",
      filtro_ore_da: p.filtro_ore_da != null ? String(p.filtro_ore_da) : "",
      filtro_ore_a: p.filtro_ore_a != null ? String(p.filtro_ore_a) : "",
      regole_pausa: p.regole_pausa ?? [],
      pausa_minuti: p.pausa_minuti,
      pausa_soglia_ore: p.pausa_soglia_ore,
      pausa_auto: p.pausa_auto,
      eccesso_pipeline: p.eccesso_pipeline,
      deficit_pipeline: p.deficit_pipeline,
      straordinario_max_sett: p.straordinario_max_sett,
      straordinario_max_giorno: p.straordinario_max_giorno,
      straordinario_priorita_sabato: p.straordinario_priorita_sabato,
      priorita: p.priorita, attivo: p.attivo, note: p.note ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { showToast("Nome obbligatorio", "err"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        filtro_tipo_contratto: form.filtro_tipo_contratto || null,
        filtro_tipo_rapporto: form.filtro_tipo_rapporto || null,
        filtro_ore_da: form.filtro_ore_da ? Number(form.filtro_ore_da) : null,
        filtro_ore_a: form.filtro_ore_a ? Number(form.filtro_ore_a) : null,
        regole_pausa: form.regole_pausa.length > 0 ? form.regole_pausa : null,
        note: form.note || null,
      };
      const url = editId ? `/api/profili-parametri/${editId}` : "/api/profili-parametri";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Errore");
      showToast(editId ? "Profilo aggiornato" : "Profilo creato", "ok");
      setShowForm(false);
      fetchData();
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setSaving(false); }
  };

  const handleApply = async () => {
    if (!confirm("Applicare i profili parametri a TUTTI i dipendenti che matchano? I parametri individuali verranno sovrascritti.")) return;
    setApplying(true);
    try {
      const res = await fetch("/api/profili-parametri/applica", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      showToast(`Parametri applicati a ${data.applicati} dipendenti`, "ok");
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setApplying(false); }
  };

  if (loading) return (<><Header title="Profili Parametri" /><div className="pg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}><Loader2 size={28} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} /></div></>);

  return (
    <>
      <Header title="Profili Parametri Fine Mese" />
      <div className="pg anim-fi" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 18, color: "var(--t)" }}>Profili Parametri</h2>
            <p style={{ fontSize: 13, color: "var(--tm)", marginTop: 2 }}>
              Definisci filtri + parametri. Il sistema li applica automaticamente ai dipendenti che matchano.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" onClick={handleApply} disabled={applying || profili.length === 0}>
              {applying ? <Loader2 size={14} style={{ animation: "sp 1s linear infinite" }} /> : <Play size={14} />}
              Applica a tutti i dipendenti
            </Button>
            <Button variant="primary" size="sm" onClick={openNew}><Plus size={14} /> Nuovo Profilo</Button>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--acl)", border: "1px solid rgba(59,91,219,.15)", borderRadius: 10, fontSize: 12.5, color: "var(--ac)", lineHeight: 1.6 }}>
          <Settings2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Come funziona:</strong> Crea un profilo con i filtri (es. "Contratto = DETERMINATO, Rapporto = Diretto")
            e definisci i parametri di fine mese. Quando clicchi "Applica", il sistema cerca tutti i dipendenti
            che matchano i filtri e imposta automaticamente i loro parametri.
            Se un dipendente matcha piu profili, vince quello con priorita piu alta.
            Quando inserisci un nuovo dipendente, i profili vengono applicati automaticamente.
          </div>
        </div>

        {/* Lista profili */}
        {profili.length === 0 && !showForm && (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--tm)" }}>
            <Filter size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Nessun profilo configurato</p>
            <p style={{ fontSize: 12 }}>Crea il primo profilo per iniziare ad automatizzare i parametri</p>
          </div>
        )}

        {profili.map((p) => (
          <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--t)" }}>{p.nome}</span>
                <Badge variant={p.attivo ? "ok" : "nn"}>{p.attivo ? "Attivo" : "Disattivo"}</Badge>
                <Badge variant="ac">Priorita: {p.priorita}</Badge>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="icon-btn" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                <button className="icon-btn" style={{ color: "var(--er)" }} onClick={async () => {
                  if (!confirm(`Eliminare "${p.nome}"?`)) return;
                  await fetch(`/api/profili-parametri/${p.id}`, { method: "DELETE" });
                  showToast("Eliminato", "ok"); fetchData();
                }}><Trash2 size={13} /></button>
              </div>
            </div>
            {/* Filtri */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tm)" }}>FILTRI:</span>
              {p.filtro_tipo_contratto && <Badge variant="wa">{p.filtro_tipo_contratto}</Badge>}
              {p.filtro_tipo_rapporto && <Badge variant="ac">{p.filtro_tipo_rapporto === "diretto" ? "Diretto" : "Interinale"}</Badge>}
              {p.filtro_ore_da != null && <Badge variant="nn">Da {p.filtro_ore_da}h</Badge>}
              {p.filtro_ore_a != null && <Badge variant="nn">A {p.filtro_ore_a}h</Badge>}
              {!p.filtro_tipo_contratto && !p.filtro_tipo_rapporto && !p.filtro_ore_da && <Badge variant="nn">Tutti i dipendenti</Badge>}
            </div>
            {/* Parametri riassunto */}
            <div style={{ fontSize: 12, color: "var(--tm)", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Pausa: {p.pausa_minuti}min dopo {p.pausa_soglia_ore}h</span>
              <span>Straord. max: {p.straordinario_max_sett}h/sett</span>
              <span>Eccesso: {p.eccesso_pipeline.map(s => s.dest.toUpperCase()).join(" → ")}</span>
              <span>Deficit: {p.deficit_pipeline.map(s => s.source.toUpperCase()).join(" → ")}</span>
            </div>
          </div>
        ))}

        {/* Form nuovo/modifica */}
        {showForm && (
          <div className="card" style={{ border: "2px solid var(--ac)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ac)" }}>{editId ? "Modifica Profilo" : "Nuovo Profilo"}</div>

            {/* Nome + Priorita */}
            <div className="g3">
              <div><label className="lbl">Nome profilo *</label><input className="fi" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Es. Determinati diretti full-time" /></div>
              <div><label className="lbl">Priorita (numero alto = alta)</label><input className="fi" type="number" min={0} value={form.priorita} onChange={(e) => setForm(f => ({ ...f, priorita: Number(e.target.value) }))} /></div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.attivo} onChange={(e) => setForm(f => ({ ...f, attivo: e.target.checked }))} style={{ accentColor: "var(--ac)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Attivo</span>
                </label>
              </div>
            </div>

            {/* Filtri */}
            <div style={{ padding: "14px 16px", background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#d97706", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Filter size={14} /> FILTRI — Chi sono i destinatari?</div>
              <div className="g2">
                <div><label className="lbl">Tipo contratto (contiene)</label><input className="fi" value={form.filtro_tipo_contratto} onChange={(e) => setForm(f => ({ ...f, filtro_tipo_contratto: e.target.value }))} placeholder="Es. DETERMINATO (vuoto = tutti)" /></div>
                <div><label className="lbl">Tipo rapporto</label>
                  <select className="fi" value={form.filtro_tipo_rapporto} onChange={(e) => setForm(f => ({ ...f, filtro_tipo_rapporto: e.target.value }))}>
                    <option value="">Tutti</option>
                    <option value="diretto">Diretto</option>
                    <option value="somministrato">Somministrato (Interinale)</option>
                  </select>
                </div>
              </div>
              <div className="g2" style={{ marginTop: 8 }}>
                <div><label className="lbl">Ore settimanali DA</label><input className="fi" type="number" min={0} max={48} step={0.5} value={form.filtro_ore_da} onChange={(e) => setForm(f => ({ ...f, filtro_ore_da: e.target.value }))} placeholder="Es. 40 (vuoto = qualsiasi)" /></div>
                <div><label className="lbl">Ore settimanali A</label><input className="fi" type="number" min={0} max={48} step={0.5} value={form.filtro_ore_a} onChange={(e) => setForm(f => ({ ...f, filtro_ore_a: e.target.value }))} placeholder="Es. 40 (vuoto = qualsiasi)" /></div>
              </div>
            </div>

            {/* Parametri pausa */}
            <div style={{ padding: "14px 16px", background: "var(--wal)", border: "1.5px solid var(--wa)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--wa)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Coffee size={14} /> PAUSA PRANZO</div>
              <div className="g3">
                <div><label className="lbl">Minuti pausa</label><input className="fi" type="number" min={0} max={120} value={form.pausa_minuti} onChange={(e) => setForm(f => ({ ...f, pausa_minuti: Number(e.target.value) }))} /></div>
                <div><label className="lbl">Soglia ore</label><input className="fi" type="number" min={0} max={24} step={0.5} value={form.pausa_soglia_ore} onChange={(e) => setForm(f => ({ ...f, pausa_soglia_ore: Number(e.target.value) }))} /></div>
                <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}><label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" checked={form.pausa_auto} onChange={(e) => setForm(f => ({ ...f, pausa_auto: e.target.checked }))} style={{ accentColor: "var(--wa)" }} /><span style={{ fontSize: 13, fontWeight: 600 }}>Auto</span></label></div>
              </div>
            </div>

            {/* Ore in eccesso */}
            <div style={{ padding: "14px 16px", background: "var(--okl)", border: "1.5px solid var(--ok)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ok)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} /> ORE IN ECCESSO — Priorita basket</div>
              <div className="g3" style={{ marginBottom: 10 }}>
                <div><label className="lbl">Max straord./settimana</label><input className="fi" type="number" min={0} max={20} step={0.5} value={form.straordinario_max_sett} onChange={(e) => setForm(f => ({ ...f, straordinario_max_sett: Number(e.target.value) }))} /></div>
                <div><label className="lbl">Max straord./giorno</label><input className="fi" type="number" min={0} max={8} step={0.5} value={form.straordinario_max_giorno} onChange={(e) => setForm(f => ({ ...f, straordinario_max_giorno: Number(e.target.value) }))} /></div>
                <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}><label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" checked={form.straordinario_priorita_sabato} onChange={(e) => setForm(f => ({ ...f, straordinario_priorita_sabato: e.target.checked }))} style={{ accentColor: "var(--ok)" }} /><span style={{ fontSize: 13, fontWeight: 600 }}>Priorita sabato</span></label></div>
              </div>
              <MiniPipeline items={form.eccesso_pipeline} setItems={(items) => setForm(f => ({ ...f, eccesso_pipeline: items as StepEccesso[] }))} options={ECCESSO_OPT} />
            </div>

            {/* Ore in difetto */}
            <div style={{ padding: "14px 16px", background: "var(--erl)", border: "1.5px solid var(--er)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--er)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><TrendingDown size={14} /> ORE IN DIFETTO — Priorita fonti</div>
              <MiniPipeline items={form.deficit_pipeline.map(d => ({ dest: d.source, max_ore: null }))} setItems={(items) => setForm(f => ({ ...f, deficit_pipeline: items.map(i => ({ source: i.dest as any, per: "parziale" as const })) }))} options={DEFICIT_OPT} />
            </div>

            {/* Note */}
            <div><label className="lbl">Note</label><input className="fi" value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note opzionali..." /></div>

            {/* Azioni */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid var(--bdr)" }}>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Annulla</Button>
              <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 size={14} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={14} />}
                {editId ? "Salva Modifiche" : "Crea Profilo"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* Mini pipeline per il form profilo */
function MiniPipeline({ items, setItems, options }: {
  items: { dest: string; max_ore: number | null }[];
  setItems: (items: { dest: string; max_ore: number | null }[]) => void;
  options: { value: string; label: string; color: string }[];
}) {
  const used = new Set(items.map(i => i.dest));
  const available = options.filter(o => !used.has(o.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, idx) => {
        const opt = options.find(o => o.value === item.dest);
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", borderRadius: 8, border: "1px solid var(--bdr)" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: opt?.color ?? "#888", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{idx + 1}</div>
            <select className="fi" style={{ flex: 1 }} value={item.dest} onChange={(e) => { const v = [...items]; v[idx] = { ...v[idx], dest: e.target.value }; setItems(v); }}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="fi" type="number" min={0} step={0.5} style={{ width: 60 }} value={item.max_ore ?? ""} placeholder="--" onChange={(e) => { const v = [...items]; v[idx] = { ...v[idx], max_ore: e.target.value ? Number(e.target.value) : null }; setItems(v); }} />
            <span style={{ fontSize: 10, color: "var(--tm)" }}>h</span>
            <button className="icon-btn" disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }} onClick={() => { const v = [...items]; [v[idx], v[idx-1]] = [v[idx-1], v[idx]]; setItems(v); }}><ChevronUp size={12} /></button>
            <button className="icon-btn" disabled={idx === items.length-1} style={{ opacity: idx === items.length-1 ? 0.3 : 1 }} onClick={() => { const v = [...items]; [v[idx], v[idx+1]] = [v[idx+1], v[idx]]; setItems(v); }}><ChevronDown size={12} /></button>
            <button className="icon-btn" style={{ color: "var(--er)" }} onClick={() => setItems(items.filter((_,i) => i !== idx))}><Trash2 size={11} /></button>
          </div>
        );
      })}
      {available.length > 0 && (
        <button onClick={() => setItems([...items, { dest: available[0].value, max_ore: null }])}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: 6, border: "1px dashed var(--bdr)", borderRadius: 8, background: "transparent", color: "var(--tm)", fontSize: 12, cursor: "pointer" }}>
          <Plus size={12} /> Aggiungi
        </button>
      )}
    </div>
  );
}
