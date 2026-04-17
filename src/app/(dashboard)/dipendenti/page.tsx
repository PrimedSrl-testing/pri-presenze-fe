"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { useToastStore } from "@/lib/store";
import type { DipendenteDB } from "@/types";
import { Search, Settings2, Loader2, UserPlus, Save } from "lucide-react";

export default function DipendentiPage() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const [list, setList] = useState<DipendenteDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", cognome: "", des_reparto: "", des_contratto: "", data_inizio: "", ore_settimanali: "40" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dipendenti");
      if (!res.ok) throw new Error("Errore caricamento dipendenti");
      setList(await res.json());
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const handleCreate = async () => {
    const fullName = `${form.cognome} ${form.nome}`.trim();
    if (!fullName || fullName.length < 2) { showToast("Nome e cognome obbligatori", "err"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/dipendenti", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: fullName.toUpperCase(), des_reparto: form.des_reparto || null, des_contratto: form.des_contratto || null, data_inizio: form.data_inizio || null, ore_settimanali: form.ore_settimanali ? Number(form.ore_settimanali) : 40 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Errore");
      const data = await res.json();
      await fetch("/api/profili-parametri/applica", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dip_id: data.id }) }).catch(() => {});
      showToast(`Dipendente ${fullName} creato (Matr. ${data.matricola})`, "ok");
      setModal(false);
      setForm({ nome: "", cognome: "", des_reparto: "", des_contratto: "", data_inizio: "", ore_settimanali: "40" });
      fetchData();
      router.push(`/dipendenti/${data.id}/configurazione`);
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setSaving(false); }
  };

  const columns: Column<DipendenteDB>[] = [
    { key: "nome", label: "Dipendente", getValue: (d) => d.nome, render: (d) => (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #3b5bdb, #5c7cfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{getInitials(d.nome)}</div>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{d.nome}</span>
      </div>
    )},
    { key: "matricola", label: "Matricola", getValue: (d) => d.matricola, render: (d) => <span style={{ fontSize: 12, fontFamily: "var(--m)", color: "var(--t2)" }}>{d.matricola}</span> },
    { key: "reparto", label: "Reparto", getValue: (d) => d.des_reparto },
    { key: "contratto", label: "Contratto", getValue: (d) => d.des_contratto, render: (d) => <Badge variant={d.des_contratto?.includes("INDETERM") ? "ok" : "wa"}>{d.des_contratto}</Badge> },
    { key: "ore", label: "Ore/Sett.", align: "center", getValue: (d) => d.ore_settimanali, render: (d) => <span style={{ fontWeight: 600 }}>{d.ore_settimanali}h</span> },
    { key: "data", label: "Dal", getValue: (d) => d.data_inizio ?? "", render: (d) => <span style={{ fontSize: 12, fontFamily: "var(--m)", color: "var(--t2)" }}>{d.data_inizio ? new Date(d.data_inizio).toLocaleDateString("it-IT") : "—"}</span> },
  ];

  if (loading) return (<><Header title="Dipendenti" /><div className="pg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}><Loader2 size={28} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} /></div></>);

  return (
    <>
      <Header title="Dipendenti" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Dipendenti</div>
            <div className="ss">{list.length} dipendenti nel sistema</div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModal(true)}><UserPlus size={14} /> Nuovo Dipendente</Button>
        </div>

        <div className="card" style={{ padding: 0, marginTop: 16 }}>
          <SortableTable<DipendenteDB>
            columns={columns}
            data={list}
            rowKey={(d) => d.id}
            onRowClick={(d) => router.push(`/dipendenti/${d.id}/configurazione`)}
            emptyMessage="Nessun dipendente trovato"
          />
        </div>
      </div>

      {/* Modale Nuovo Dipendente */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)" }} onClick={() => setModal(false)} />
          <div style={{ position: "relative", width: 520, maxWidth: "90vw", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.2)", padding: "28px 28px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #3b5bdb, #5c7cfa)", display: "flex", alignItems: "center", justifyContent: "center" }}><UserPlus size={20} style={{ color: "#fff" }} /></div>
              <div><div style={{ fontWeight: 800, fontSize: 17, color: "var(--t)" }}>Nuovo Dipendente</div><div style={{ fontSize: 12, color: "var(--tm)" }}>Inserisci i dati base, poi completa la scheda</div></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Cognome *</label><input className="fi" value={form.cognome} onChange={(e) => setForm(f => ({ ...f, cognome: e.target.value }))} placeholder="Rossi" autoFocus /></div>
                <div><label className="lbl">Nome *</label><input className="fi" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Marco" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Reparto</label><input className="fi" value={form.des_reparto} onChange={(e) => setForm(f => ({ ...f, des_reparto: e.target.value }))} placeholder="PRODUZIONE" /></div>
                <div><label className="lbl">Tipo contratto</label><input className="fi" value={form.des_contratto} onChange={(e) => setForm(f => ({ ...f, des_contratto: e.target.value }))} placeholder="DETERMINATO" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Data assunzione</label><input className="fi" type="date" value={form.data_inizio} onChange={(e) => setForm(f => ({ ...f, data_inizio: e.target.value }))} /></div>
                <div><label className="lbl">Ore settimanali</label><input className="fi" type="number" min={0} max={48} step={0.5} value={form.ore_settimanali} onChange={(e) => setForm(f => ({ ...f, ore_settimanali: e.target.value }))} /></div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--bdr)" }}>
              <Button variant="secondary" size="sm" onClick={() => setModal(false)}>Annulla</Button>
              <Button variant="primary" size="sm" disabled={saving || !form.cognome.trim() || !form.nome.trim()} onClick={handleCreate}>
                {saving ? <Loader2 size={14} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={14} />} Crea e apri scheda
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
