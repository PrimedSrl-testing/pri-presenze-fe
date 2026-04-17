"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PipelineBuilder,
  type PipelineItem,
} from "@/components/configurazione/PipelineBuilder";
import { useToastStore } from "@/lib/store";
import type {
  DipConfig,
  DipendenteDB,
  StepEccesso,
  StepDeficit,
  RegoleGlobali,
  TecsamRecord,
  RegolaPausa,
  StoricoContratto,
} from "@/types";
import {
  ArrowLeft, Save, Info, Loader2,
  User, FileText, Settings2, ShieldCheck,
  Phone, Mail, CreditCard, Building2, MapPin,
  CalendarClock, ExternalLink, RotateCcw,
  Coffee, TrendingUp, TrendingDown,
  Briefcase, Calendar, Clock, Heart,
  Plus, Pencil, Trash2, GraduationCap,
  AlertTriangle, CheckCircle,
  ChevronUp, ChevronDown, Upload, Download, Paperclip, RefreshCw,
} from "lucide-react";

/* ── Tab config ───────────────────────────────────────────────────────────── */
const TABS = [
  { id: "anagrafica" as const, label: "Anagrafica",              icon: <User size={14} /> },
  { id: "lavoro"     as const, label: "Lavoro & Contratto",      icon: <Briefcase size={14} /> },
  { id: "sicurezza"  as const, label: "Sicurezza & Formazione",  icon: <ShieldCheck size={14} /> },
  { id: "parametri"  as const, label: "Parametri Fine Mese",     icon: <Settings2 size={14} /> },
];
type TabId = (typeof TABS)[number]["id"];

/* ── Pipeline options ─────────────────────────────────────────────────────── */
const ECCESSO_OPT = [
  { key: "BOA", value: "boa" }, { key: "Straordinario", value: "straordinario" },
  { key: "BOP", value: "bop" }, { key: "BOS", value: "bos" },
];
const DEFICIT_OPT = [
  { key: "Ferie", value: "ferie" }, { key: "ROL", value: "rol" },
  { key: "BOA", value: "boa" }, { key: "BOP", value: "bop" },
];

/* ── Defaults ─────────────────────────────────────────────────────────────── */
const DEFAULT_CFG: Omit<DipConfig, "id" | "dip_id"> = {
  codice_fiscale: null, email: null, telefono: null, regole_pausa: null,
  pec: null,
  doc_carta_identita: false, doc_codice_fiscale: false, doc_c2_storico: false, doc_permesso_soggiorno: false,
  doc_ci_file: null, doc_cf_file: null, doc_c2_file: null, doc_ps_file: null,
  data_nascita: null, luogo_nascita: null, genere: null, nazionalita: null,
  indirizzo: null, citta: null, cap: null, provincia: null,
  iban: null, contatto_emergenza: null, contatto_emergenza_tel: null,
  tipo_rapporto: null,
  pausa_minuti: 30, pausa_soglia_ore: 8, pausa_auto: true,
  flg_bop: false, flg_boa: false, flg_bos: false,
  tipo_assunzione: null, stagionale_gia_censito: false,
  kronos_badge: null, kronos_attivo: false,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SchedaDipendentePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToastStore();

  const [tab, setTab] = useState<TabId>("anagrafica");
  const [dip, setDip] = useState<DipendenteDB | null>(null);
  const [cfg, setCfg] = useState<Omit<DipConfig, "id" | "dip_id">>(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Regole
  const [hasOverride, setHasOverride] = useState(false);
  const [regoleGlobali, setRegoleGlobali] = useState<RegoleGlobali | null>(null);
  const [oFt, setOFt] = useState<StepEccesso[]>([]);
  const [oPt, setOPt] = useState<StepEccesso[]>([]);
  const [oDef, setODef] = useState<StepDeficit[]>([]);
  const [oMaxSett, setOMaxSett] = useState<number | null>(null);
  const [oMaxGiorno, setOMaxGiorno] = useState<number | null>(null);
  const [oPriSab, setOPriSab] = useState<boolean | null>(null);
  const [regDirty, setRegDirty] = useState(false);
  const [regSaving, setRegSaving] = useState(false);

  // Orario
  const [templates, setTemplates] = useState<{ id: number; nome: string }[]>([]);
  const [dipOrario, setDipOrario] = useState<{ template_id: number; data_inizio_ciclo: string } | null>(null);
  const [orDirty, setOrDirty] = useState(false);

  // Regole pausa multi-livello
  const [regolePausa, setRegolePausa] = useState<RegolaPausa[]>([]);

  // Storico contratti
  const [contratti, setContratti] = useState<StoricoContratto[]>([]);

  // Contratto ciclico
  const [ciclico, setCiclico] = useState<any>(null);
  const [ciclicoForm, setCiclicoForm] = useState({ p1_mese: 9, p1_giorno: 1, p1_ore: 40, p2_mese: 5, p2_giorno: 1, p2_ore: 24, attivo: true, note: "" });
  const [ciclicoEdit, setCiclicoEdit] = useState(false);
  const [mesiTotali, setMesiTotali] = useState(0);
  const [contrattoForm, setContrattoForm] = useState<{ open: boolean; editId?: number; data: { data_inizio: string; data_fine: string; tipo_contratto: string; ore_settimanali: string; tipo_rapporto: string; note: string } }>({ open: false, data: { data_inizio: "", data_fine: "", tipo_contratto: "", ore_settimanali: "", tipo_rapporto: "diretto", note: "" } });
  const [contrattoSaving, setContrattoSaving] = useState(false);

  // Tecsam
  const [tecsam, setTecsam] = useState<TecsamRecord[]>([]);
  const [tecsamModal, setTecsamModal] = useState<{ open: boolean; editId?: number }>({ open: false });
  const [tecsamForm, setTecsamForm] = useState({ tipo: "visita_medica" as string, descrizione: "", data_scadenza: "", data_prossima: "", data_effettuata: "", stato: "da_programmare", esito: "", note: "" });
  const [tecsamSaving, setTecsamSaving] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dipR, cfgR, regR, orR, tplR, tecR, ctrR, cicR] = await Promise.all([
        fetch(`/api/dipendenti/${id}`), fetch(`/api/dipendenti/${id}/config`),
        fetch(`/api/dipendenti/${id}/regole`), fetch(`/api/dipendenti/${id}/orario`),
        fetch(`/api/orari-template`), fetch(`/api/tecsam?dip_id=${id}`),
        fetch(`/api/dipendenti/${id}/contratti`),
        fetch(`/api/contratti-ciclici`),
      ]);
      if (!dipR.ok) throw new Error("Dipendente non trovato");
      setDip(await dipR.json());

      if (cfgR.ok) {
        const c = await cfgR.json();
        setCfg({
          codice_fiscale: c.codice_fiscale, email: c.email, telefono: c.telefono,
          regole_pausa: c.regole_pausa,
          pec: c.pec,
          doc_carta_identita: !!c.doc_carta_identita, doc_codice_fiscale: !!c.doc_codice_fiscale,
          doc_c2_storico: !!c.doc_c2_storico, doc_permesso_soggiorno: !!c.doc_permesso_soggiorno,
          doc_ci_file: c.doc_ci_file, doc_cf_file: c.doc_cf_file,
          doc_c2_file: c.doc_c2_file, doc_ps_file: c.doc_ps_file,
          data_nascita: c.data_nascita?.split?.("T")?.[0] ?? c.data_nascita,
          luogo_nascita: c.luogo_nascita, genere: c.genere, nazionalita: c.nazionalita,
          indirizzo: c.indirizzo, citta: c.citta, cap: c.cap, provincia: c.provincia,
          iban: c.iban, contatto_emergenza: c.contatto_emergenza, contatto_emergenza_tel: c.contatto_emergenza_tel,
          tipo_rapporto: c.tipo_rapporto,
          pausa_minuti: c.pausa_minuti, pausa_soglia_ore: c.pausa_soglia_ore, pausa_auto: c.pausa_auto,
          flg_bop: c.flg_bop, flg_boa: c.flg_boa, flg_bos: c.flg_bos,
          tipo_assunzione: c.tipo_assunzione, stagionale_gia_censito: c.stagionale_gia_censito,
          kronos_badge: c.kronos_badge, kronos_attivo: c.kronos_attivo,
        });
        if (Array.isArray(c.regole_pausa) && c.regole_pausa.length > 0) {
          setRegolePausa(c.regole_pausa);
        }
      }
      if (regR.ok) {
        const r = await regR.json();
        setRegoleGlobali(r.globali ?? null); setHasOverride(!!r.has_override);
        if (r.override) {
          setOFt(r.override.ft_eccesso_pipeline ?? []); setOPt(r.override.pt_eccesso_pipeline ?? []);
          setODef(r.override.deficit_pipeline ?? []);
          setOMaxSett(r.override.straordinario_max_sett); setOMaxGiorno(r.override.straordinario_max_giorno);
          setOPriSab(r.override.straordinario_priorita_sabato);
        }
      }
      if (orR.ok) { const o = await orR.json(); if (o) setDipOrario({ template_id: o.template_id, data_inizio_ciclo: o.data_inizio_ciclo?.split("T")[0] ?? "" }); }
      if (tplR.ok) setTemplates((await tplR.json()).map((t: any) => ({ id: t.id, nome: t.nome })));
      if (tecR.ok) setTecsam(await tecR.json());
      if (ctrR.ok) { const cd = await ctrR.json(); setContratti(cd.contratti ?? []); setMesiTotali(cd.mesi_totali ?? 0); }
      if (cicR.ok) {
        const allCiclici = await cicR.json();
        const myCiclico = allCiclici.find((c: any) => c.dip_id === Number(id));
        if (myCiclico) {
          setCiclico(myCiclico);
          setCiclicoForm({
            p1_mese: myCiclico.periodo1_da_mese, p1_giorno: myCiclico.periodo1_da_giorno,
            p1_ore: myCiclico.periodo1_ore_sett, p2_mese: myCiclico.periodo2_da_mese,
            p2_giorno: myCiclico.periodo2_da_giorno, p2_ore: myCiclico.periodo2_ore_sett,
            attivo: myCiclico.attivo, note: myCiclico.note ?? "",
          });
        }
      }
    } catch (err: any) { showToast(err.message, "err"); } finally { setLoading(false); }
  }, [id, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const set = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) => { setCfg((p) => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dipendenti/${id}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cfg, regole_pausa: regolePausa.length > 0 ? regolePausa : null }) });
      if (!res.ok) throw new Error("Errore"); showToast("Salvato", "ok"); setDirty(false);
    } catch (err: any) { showToast(err.message, "err"); } finally { setSaving(false); }
  };

  const handleSaveRegole = async () => {
    setRegSaving(true);
    try {
      const res = await fetch(`/api/dipendenti/${id}/regole`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ft_eccesso_pipeline: oFt, pt_eccesso_pipeline: oPt, deficit_pipeline: oDef, straordinario_max_sett: oMaxSett, straordinario_max_giorno: oMaxGiorno, straordinario_priorita_sabato: oPriSab }) });
      if (!res.ok) throw new Error("Errore"); setRegDirty(false); showToast("Regole salvate", "ok");
    } catch (err: any) { showToast(err.message, "err"); } finally { setRegSaving(false); }
  };

  const handleSaveTecsam = async () => {
    if (!tecsamForm.descrizione.trim()) { showToast("Descrizione obbligatoria", "err"); return; }
    setTecsamSaving(true);
    try {
      const payload = { ...tecsamForm, dip_id: Number(id), data_scadenza: tecsamForm.data_scadenza || null, data_prossima: tecsamForm.data_prossima || null, data_effettuata: tecsamForm.data_effettuata || null, esito: tecsamForm.esito || null, note: tecsamForm.note || null };
      const url = tecsamModal.editId ? `/api/tecsam/${tecsamModal.editId}` : "/api/tecsam";
      const res = await fetch(url, { method: tecsamModal.editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Errore"); showToast("Salvato", "ok"); setTecsamModal({ open: false }); fetchData();
    } catch (err: any) { showToast(err.message, "err"); } finally { setTecsamSaving(false); }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "—";

  /* ── Loading / 404 ──────────────────────────────────────────────────────── */
  if (loading) return (<><Header title="Scheda Dipendente" /><div className="pg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}><Loader2 size={28} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} /></div></>);
  if (!dip) return (<><Header title="Scheda Dipendente" /><div className="pg" style={{ textAlign: "center", padding: 60, color: "var(--tm)" }}><p style={{ fontSize: 15, fontWeight: 600 }}>Dipendente non trovato</p><Button variant="secondary" size="sm" style={{ marginTop: 16 }} onClick={() => router.push("/dipendenti")}><ArrowLeft size={14} /> Torna alla lista</Button></div></>);

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Header title="Scheda Dipendente" />
      <div className="pg anim-fi" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Profile header ────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Avatar */}
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #3b5bdb 0%, #5c7cfa 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
              {dip.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 20, color: "var(--t)", letterSpacing: "-.4px" }}>{dip.nome}</span>
                {cfg.tipo_rapporto && <Badge variant={cfg.tipo_rapporto === "diretto" ? "ok" : "wa"}>{cfg.tipo_rapporto === "diretto" ? "Diretto" : "Interinale"}</Badge>}
              </div>
            </div>
            <button className="icon-btn" onClick={() => router.push("/dipendenti")} title="Torna alla lista"><ArrowLeft size={18} /></button>
          </div>
          {/* Info con etichette chiare */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--bdr)" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Matricola</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ac)", fontFamily: "var(--m)" }}>{dip.matricola}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Reparto</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t)" }}>{dip.des_reparto || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Contratto</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t)" }}>{dip.des_contratto || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Ore Settimanali</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t)" }}>{dip.ore_settimanali}h</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Data Assunzione</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t)", fontFamily: "var(--m)" }}>{fmtDate(dip.data_inizio)}</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          padding: "8px 0",
        }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "14px 10px", fontSize: 14,
                fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer",
                borderRadius: 12,
                border: active ? "2px solid #3b5bdb" : "2px solid #d0d5dd",
                color: active ? "#ffffff" : "#1d2939",
                background: active
                  ? "linear-gradient(135deg, #3b5bdb 0%, #5c7cfa 100%)"
                  : "#ffffff",
                boxShadow: active
                  ? "0 4px 16px rgba(59,91,219,.4)"
                  : "0 1px 4px rgba(0,0,0,.06)",
                transition: "all .2s ease",
              }}>{t.icon} {t.label}</button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: ANAGRAFICA                                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "anagrafica" && (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Nome e Cognome (editabili, salvano in ANAG_DIP) */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<User size={16} />} bg="var(--acl)" color="var(--ac)" title="Nome e Cognome" sub="Modifica i dati anagrafici principali" />
            <div className="g2">
              <div>
                <label className="lbl">Cognome e Nome (come da gestionale)</label>
                <input className="fi" value={dip.nome} onChange={(e) => setDip(d => d ? { ...d, nome: e.target.value } : d)} style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase" }} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button variant="secondary" size="sm" onClick={async () => {
                  try {
                    const res = await fetch(`/api/dipendenti/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: dip.nome }) });
                    if (!res.ok) throw new Error("Errore"); showToast("Nome aggiornato", "ok");
                  } catch (err: any) { showToast(err.message, "err"); }
                }}><Save size={13} /> Salva Nome</Button>
              </div>
            </div>
          </div>

          {/* Dati personali */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<CreditCard size={16} />} bg="var(--okl)" color="var(--ok)" title="Dati Personali" />
            <div className="g3">
              <div><label className="lbl">Codice Fiscale</label><input className="fi" value={cfg.codice_fiscale ?? ""} onChange={(e) => set("codice_fiscale", e.target.value.toUpperCase() || null)} placeholder="RSSMRC80A01H501A" maxLength={16} style={{ textTransform: "uppercase", fontFamily: "var(--m)" }} /></div>
              <div><label className="lbl">Data di nascita</label><input className="fi" type="date" value={cfg.data_nascita ?? ""} onChange={(e) => set("data_nascita", e.target.value || null)} /></div>
              <div><label className="lbl">Luogo di nascita</label><input className="fi" value={cfg.luogo_nascita ?? ""} onChange={(e) => set("luogo_nascita", e.target.value || null)} placeholder="Roma" /></div>
            </div>
            <div className="g3">
              <div>
                <label className="lbl">Genere</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["M", "F"] as const).map((g) => (
                    <label key={g} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "8px 16px", borderRadius: "var(--r2)", border: cfg.genere === g ? "2px solid var(--ac)" : "1.5px solid var(--bdr)", background: cfg.genere === g ? "var(--acl)" : "var(--bg)", transition: "all .15s", flex: 1, justifyContent: "center" }}>
                      <input type="radio" name="genere" checked={cfg.genere === g} onChange={() => set("genere", g)} style={{ accentColor: "var(--ac)" }} />
                      <span style={{ fontSize: 13, fontWeight: cfg.genere === g ? 700 : 500, color: cfg.genere === g ? "var(--ac)" : "var(--t2)" }}>{g === "M" ? "Maschio" : "Femmina"}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="lbl">Nazionalita</label><input className="fi" value={cfg.nazionalita ?? ""} onChange={(e) => set("nazionalita", e.target.value || null)} placeholder="Italiana" /></div>
              <div />
            </div>
          </div>

          {/* Contatti */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Phone size={16} />} bg="var(--okl)" color="var(--ok)" title="Contatti" />
            <div className="g3">
              <div><label className="lbl"><Mail size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Email</label><input className="fi" type="email" value={cfg.email ?? ""} onChange={(e) => set("email", e.target.value || null)} placeholder="nome@azienda.it" /></div>
              <div><label className="lbl"><Phone size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Telefono</label><input className="fi" type="tel" value={cfg.telefono ?? ""} onChange={(e) => set("telefono", e.target.value || null)} placeholder="333 1234567" /></div>
              <div><label className="lbl"><Mail size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />PEC</label><input className="fi" type="email" value={cfg.pec ?? ""} onChange={(e) => set("pec", e.target.value || null)} placeholder="nome@pec.it" /></div>
            </div>
          </div>

          {/* Indirizzo */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<MapPin size={16} />} bg="var(--inl)" color="var(--in)" title="Indirizzo di Residenza" />
            <div className="g2">
              <div style={{ gridColumn: "1 / -1" }}><label className="lbl">Indirizzo</label><input className="fi" value={cfg.indirizzo ?? ""} onChange={(e) => set("indirizzo", e.target.value || null)} placeholder="Via Roma 1" /></div>
            </div>
            <div className="g3">
              <div><label className="lbl">Citta</label><input className="fi" value={cfg.citta ?? ""} onChange={(e) => set("citta", e.target.value || null)} placeholder="Milano" /></div>
              <div><label className="lbl">CAP</label><input className="fi" value={cfg.cap ?? ""} onChange={(e) => set("cap", e.target.value || null)} placeholder="20100" maxLength={5} /></div>
              <div><label className="lbl">Provincia</label><input className="fi" value={cfg.provincia ?? ""} onChange={(e) => set("provincia", e.target.value.toUpperCase() || null)} placeholder="MI" maxLength={2} style={{ textTransform: "uppercase" }} /></div>
            </div>
          </div>

          {/* IBAN + Emergenza */}
          <div className="g2">
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Sec icon={<CreditCard size={16} />} bg="var(--wal)" color="var(--wa)" title="Dati Bancari" />
              <div><label className="lbl">IBAN</label><input className="fi" value={cfg.iban ?? ""} onChange={(e) => set("iban", e.target.value.toUpperCase().replace(/\s/g, "") || null)} placeholder="IT60X0542811101000000123456" maxLength={34} style={{ textTransform: "uppercase", fontFamily: "var(--m)", letterSpacing: ".5px" }} /></div>
            </div>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Sec icon={<Heart size={16} />} bg="var(--erl)" color="var(--er)" title="Contatto di Emergenza" />
              <div><label className="lbl">Nome e cognome</label><input className="fi" value={cfg.contatto_emergenza ?? ""} onChange={(e) => set("contatto_emergenza", e.target.value || null)} placeholder="Maria Rossi (moglie)" /></div>
              <div><label className="lbl">Telefono emergenza</label><input className="fi" type="tel" value={cfg.contatto_emergenza_tel ?? ""} onChange={(e) => set("contatto_emergenza_tel", e.target.value || null)} placeholder="333 9876543" /></div>
            </div>
          </div>

          {/* Documenti */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<FileText size={16} />} bg="var(--pul)" color="var(--pu)" title="Documenti Consegnati" sub="Checklist documenti ricevuti + allegati" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                { key: "doc_carta_identita" as const, fileKey: "doc_ci_file" as const, tipo: "ci", label: "Carta d'Identita" },
                { key: "doc_codice_fiscale" as const, fileKey: "doc_cf_file" as const, tipo: "cf", label: "Codice Fiscale / Tessera Sanitaria" },
                { key: "doc_c2_storico" as const, fileKey: "doc_c2_file" as const, tipo: "c2", label: "C2 Storico (Certificato Disoccupazione)" },
                { key: "doc_permesso_soggiorno" as const, fileKey: "doc_ps_file" as const, tipo: "ps", label: "Permesso di Soggiorno" },
              ]).map((doc) => (
                <div key={doc.key} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  borderRadius: 10, transition: "all .15s",
                  border: cfg[doc.key] ? "2px solid #059669" : "1.5px solid var(--bdr)",
                  background: cfg[doc.key] ? "#ecfdf5" : "#fff",
                }}>
                  {/* Check toggle */}
                  <div onClick={() => set(doc.key, !cfg[doc.key])} style={{
                    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: cfg[doc.key] ? "#059669" : "var(--bdr)", color: "#fff", cursor: "pointer", flexShrink: 0,
                  }}>
                    {cfg[doc.key] && <CheckCircle size={16} />}
                  </div>
                  {/* Label */}
                  <span onClick={() => set(doc.key, !cfg[doc.key])} style={{ flex: 1, fontSize: 13, fontWeight: cfg[doc.key] ? 700 : 500, color: cfg[doc.key] ? "#059669" : "var(--t2)", cursor: "pointer", userSelect: "none" }}>
                    {doc.label}
                  </span>
                  {/* File allegato */}
                  {cfg[doc.fileKey] ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a href={cfg[doc.fileKey]!} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ac)", textDecoration: "none" }}>
                        <Paperclip size={12} /> Allegato
                      </a>
                      <button className="icon-btn" style={{ color: "var(--er)" }} onClick={() => { set(doc.fileKey, null); setDirty(true); }} title="Rimuovi allegato"><Trash2 size={12} /></button>
                    </div>
                  ) : (
                    <label style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--bdr)", background: "var(--bgs)", cursor: "pointer", fontSize: 12, color: "var(--tm)" }}>
                      <Upload size={12} /> Allega
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("file", file);
                        fd.append("dip_id", id);
                        fd.append("tipo", doc.tipo);
                        try {
                          const res = await fetch("/api/upload", { method: "POST", body: fd });
                          if (!res.ok) throw new Error("Errore upload");
                          const data = await res.json();
                          set(doc.fileKey, data.path);
                          showToast(`File "${file.name}" caricato`, "ok");
                        } catch (err: any) { showToast(err.message, "err"); }
                        e.target.value = "";
                      }} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          <SaveBar dirty={dirty} saving={saving} onSave={handleSave} />
        </div>)}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: LAVORO & CONTRATTO                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "lavoro" && (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Dati dal gestionale */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Building2 size={16} />} bg="var(--acl)" color="var(--ac)" title="Inquadramento Attuale" sub="Dati dal gestionale Primed (sola lettura)" />
            <div className="g3">
              <RO label="Reparto" value={dip.des_reparto} />
              <RO label="Contratto attivo" value={dip.des_contratto} />
              <RO label="Ore settimanali" value={`${dip.ore_settimanali}h`} />
            </div>
            <div className="g3">
              <RO label="Programma" value={dip.des_programma || "—"} />
              <RO label="Dal" value={fmtDate(dip.data_inizio)} mono />
              <RO label="Al" value={dip.data_fine ? fmtDate(dip.data_fine) : "Indeterminato"} mono />
            </div>
          </div>

          {/* Badge mesi totali + Storico contratti */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Sec icon={<FileText size={16} />} bg="var(--pul)" color="var(--pu)" title="Storico Contratti" />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {contratti.length > 0 && (
                  <div style={{
                    padding: "8px 16px", borderRadius: 10, fontWeight: 800, fontSize: 14,
                    background: mesiTotali > 24 ? "var(--erl)" : mesiTotali > 12 ? "var(--wal)" : "var(--okl)",
                    color: mesiTotali > 24 ? "var(--er)" : mesiTotali > 12 ? "var(--wa)" : "var(--ok)",
                    border: mesiTotali > 24 ? "2px solid var(--er)" : mesiTotali > 12 ? "2px solid var(--wa)" : "2px solid var(--ok)",
                  }}>
                    {mesiTotali} mesi totali {mesiTotali > 24 && " — LIMITE SUPERATO"}{mesiTotali > 12 && mesiTotali <= 24 && " — Serve H Causale"}
                  </div>
                )}
                <Button variant="primary" size="sm" onClick={() => setContrattoForm({
                  open: true, data: { data_inizio: "", data_fine: "", tipo_contratto: dip.des_contratto ?? "", ore_settimanali: String(dip.ore_settimanali ?? ""), tipo_rapporto: cfg.tipo_rapporto ?? "diretto", note: "" }
                })}><Plus size={14} /> Nuovo Contratto</Button>
              </div>
            </div>

            {/* Alert limiti */}
            {mesiTotali > 24 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--erl)", border: "1.5px solid var(--er)", borderRadius: 10 }}>
                <AlertTriangle size={18} style={{ color: "var(--er)", flexShrink: 0 }} />
                <div><div style={{ fontWeight: 700, fontSize: 13, color: "var(--er)" }}>Limite 24 mesi superato!</div><div style={{ fontSize: 12, color: "var(--er)", opacity: 0.8 }}>Il dipendente ha cumulato {mesiTotali} mesi di contratti a termine. Verificare la situazione contrattuale.</div></div>
              </div>
            )}
            {mesiTotali > 12 && mesiTotali <= 24 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--wal)", border: "1.5px solid var(--wa)", borderRadius: 10 }}>
                <AlertTriangle size={18} style={{ color: "var(--wa)", flexShrink: 0 }} />
                <div><div style={{ fontWeight: 700, fontSize: 13, color: "var(--wa)" }}>Superati 12 mesi — Causale obbligatoria</div><div style={{ fontSize: 12, color: "var(--wa)", opacity: 0.8 }}>Dal prossimo rinnovo serve la causale giustificativa (H Causale). Residuo: {24 - mesiTotali} mesi.</div></div>
              </div>
            )}

            {/* Lista contratti */}
            {contratti.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--tm)" }}>
                <FileText size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Nessun contratto registrato. Aggiungi il primo.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contratti.map((c, idx) => {
                  const inizio = new Date(c.data_inizio);
                  const fine = c.data_fine ? new Date(c.data_fine) : new Date();
                  const mesi = Math.max(1, Math.round((fine.getTime() - inizio.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
                  const isActive = !c.data_fine || new Date(c.data_fine) >= new Date();
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: isActive ? "2px solid var(--ac)" : "1.5px solid var(--bdr)", background: isActive ? "var(--acl)" : "#fff" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: isActive ? "var(--ac)" : "var(--bdr)", color: isActive ? "#fff" : "var(--tm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--t)" }}>{c.tipo_contratto || "Contratto"}</span>
                          {isActive && <Badge variant="ok">Attivo</Badge>}
                          {c.tipo_rapporto && <Badge variant={c.tipo_rapporto === "diretto" ? "ac" : "wa"}>{c.tipo_rapporto === "diretto" ? "Diretto" : "Interinale"}</Badge>}
                          <Badge variant="nn">{mesi} mesi</Badge>
                          {c.ore_settimanali && <span style={{ fontSize: 12, color: "var(--tm)" }}>{c.ore_settimanali}h/sett</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 3, fontFamily: "var(--m)" }}>
                          {fmtDate(c.data_inizio)} → {c.data_fine ? fmtDate(c.data_fine) : "In corso"}
                        </div>
                        {c.note && <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 2, fontStyle: "italic" }}>{c.note}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="icon-btn" onClick={() => setContrattoForm({
                          open: true, editId: c.id,
                          data: { data_inizio: c.data_inizio?.toString().split("T")[0] ?? "", data_fine: c.data_fine?.toString().split("T")[0] ?? "", tipo_contratto: c.tipo_contratto ?? "", ore_settimanali: c.ore_settimanali != null ? String(c.ore_settimanali) : "", tipo_rapporto: c.tipo_rapporto ?? "diretto", note: c.note ?? "" }
                        })} title="Modifica"><Pencil size={13} /></button>
                        <button className="icon-btn" style={{ color: "var(--er)" }} onClick={async () => { if (!confirm("Eliminare questo contratto?")) return; await fetch(`/api/dipendenti/${id}/contratti?contratto_id=${c.id}`, { method: "DELETE" }); showToast("Contratto eliminato", "ok"); fetchData(); }} title="Elimina"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form inline nuovo/modifica contratto */}
            {contrattoForm.open && (
              <div style={{ padding: "16px", borderRadius: 10, border: "2px solid var(--ac)", background: "var(--acl)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ac)", marginBottom: 12 }}>{contrattoForm.editId ? "Modifica Contratto" : "Nuovo Contratto"}</div>
                <div className="g3">
                  <div><label className="lbl">Data inizio *</label><input className="fi" type="date" value={contrattoForm.data.data_inizio} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, data_inizio: e.target.value } }))} /></div>
                  <div><label className="lbl">Data fine</label><input className="fi" type="date" value={contrattoForm.data.data_fine} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, data_fine: e.target.value } }))} /></div>
                  <div><label className="lbl">Tipo contratto</label><input className="fi" value={contrattoForm.data.tipo_contratto} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, tipo_contratto: e.target.value } }))} placeholder="Es. Determinato" /></div>
                </div>
                <div className="g3" style={{ marginTop: 10 }}>
                  <div><label className="lbl">Ore settimanali</label><input className="fi" type="number" min={0} max={48} step={0.5} value={contrattoForm.data.ore_settimanali} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, ore_settimanali: e.target.value } }))} /></div>
                  <div><label className="lbl">Tipo rapporto</label><select className="fi" value={contrattoForm.data.tipo_rapporto} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, tipo_rapporto: e.target.value } }))}><option value="diretto">Diretto</option><option value="somministrato">Somministrato (Interinale)</option></select></div>
                  <div><label className="lbl">Note</label><input className="fi" value={contrattoForm.data.note} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, note: e.target.value } }))} placeholder="Note..." /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setContrattoForm(f => ({ ...f, open: false }))}>Annulla</Button>
                  <Button variant="primary" size="sm" disabled={contrattoSaving || !contrattoForm.data.data_inizio} onClick={async () => {
                    setContrattoSaving(true);
                    try {
                      const payload = { ...contrattoForm.data, data_fine: contrattoForm.data.data_fine || null, ore_settimanali: contrattoForm.data.ore_settimanali ? Number(contrattoForm.data.ore_settimanali) : null, contratto_id: contrattoForm.editId };
                      const method = contrattoForm.editId ? "PUT" : "POST";
                      const res = await fetch(`/api/dipendenti/${id}/contratti`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                      if (!res.ok) throw new Error("Errore");
                      showToast(contrattoForm.editId ? "Contratto aggiornato" : "Contratto aggiunto", "ok");
                      setContrattoForm(f => ({ ...f, open: false }));
                      fetchData();
                    } catch (err: any) { showToast(err.message, "err"); }
                    finally { setContrattoSaving(false); }
                  }}>{contrattoSaving ? <Loader2 size={13} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={13} />} {contrattoForm.editId ? "Salva" : "Aggiungi"}</Button>
                </div>
              </div>
            )}
          </div>

          {/* Contratto Ciclico (stagionale) */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Sec icon={<RefreshCw size={16} />} bg="var(--wal)" color="var(--wa)" title="Contratto Ciclico" sub="Per dipendenti con ore diverse in periodi dell'anno (es. stagionali)" />
              {!ciclicoEdit && !ciclico && (
                <Button variant="secondary" size="sm" onClick={() => setCiclicoEdit(true)}><Plus size={13} /> Aggiungi</Button>
              )}
            </div>

            {/* Visualizza ciclico esistente */}
            {ciclico && !ciclicoEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--wal)", borderRadius: 10, border: "1.5px solid var(--wa)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                    <div><span style={{ fontWeight: 700, color: "var(--wa)" }}>Periodo 1:</span> da {ciclico.periodo1_da_giorno}/{ciclico.periodo1_da_mese} — <strong>{ciclico.periodo1_ore_sett}h/sett</strong></div>
                    <div><span style={{ fontWeight: 700, color: "var(--pu)" }}>Periodo 2:</span> da {ciclico.periodo2_da_giorno}/{ciclico.periodo2_da_mese} — <strong>{ciclico.periodo2_ore_sett}h/sett</strong></div>
                  </div>
                  {ciclico.note && <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 4, fontStyle: "italic" }}>{ciclico.note}</div>}
                </div>
                <Badge variant={ciclico.attivo ? "ok" : "nn"}>{ciclico.attivo ? "Attivo" : "Disattivo"}</Badge>
                <button className="icon-btn" onClick={() => setCiclicoEdit(true)}><Pencil size={13} /></button>
              </div>
            )}

            {!ciclico && !ciclicoEdit && (
              <div style={{ textAlign: "center", padding: 20, color: "var(--tm)", fontSize: 13 }}>Nessun contratto ciclico configurato</div>
            )}

            {/* Form modifica/crea */}
            {ciclicoEdit && (
              <div style={{ padding: "14px 16px", borderRadius: 10, border: "2px solid var(--wa)", background: "var(--wal)" }}>
                <div className="g2">
                  <div style={{ padding: "10px 12px", background: "#fff", borderRadius: 8, border: "1px solid var(--bdr)" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--wa)", marginBottom: 8 }}>Periodo 1</div>
                    <div className="g3">
                      <div><label className="lbl">Mese inizio</label><input className="fi" type="number" min={1} max={12} value={ciclicoForm.p1_mese} onChange={(e) => setCiclicoForm(f => ({ ...f, p1_mese: Number(e.target.value) }))} /></div>
                      <div><label className="lbl">Giorno</label><input className="fi" type="number" min={1} max={31} value={ciclicoForm.p1_giorno} onChange={(e) => setCiclicoForm(f => ({ ...f, p1_giorno: Number(e.target.value) }))} /></div>
                      <div><label className="lbl">Ore/sett</label><input className="fi" type="number" min={0} max={48} step={0.5} value={ciclicoForm.p1_ore} onChange={(e) => setCiclicoForm(f => ({ ...f, p1_ore: Number(e.target.value) }))} /></div>
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fff", borderRadius: 8, border: "1px solid var(--bdr)" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--pu)", marginBottom: 8 }}>Periodo 2</div>
                    <div className="g3">
                      <div><label className="lbl">Mese inizio</label><input className="fi" type="number" min={1} max={12} value={ciclicoForm.p2_mese} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_mese: Number(e.target.value) }))} /></div>
                      <div><label className="lbl">Giorno</label><input className="fi" type="number" min={1} max={31} value={ciclicoForm.p2_giorno} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_giorno: Number(e.target.value) }))} /></div>
                      <div><label className="lbl">Ore/sett</label><input className="fi" type="number" min={0} max={48} step={0.5} value={ciclicoForm.p2_ore} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_ore: Number(e.target.value) }))} /></div>
                    </div>
                  </div>
                </div>
                <div className="g2" style={{ marginTop: 10 }}>
                  <div><label className="lbl">Note</label><input className="fi" value={ciclicoForm.note} onChange={(e) => setCiclicoForm(f => ({ ...f, note: e.target.value }))} placeholder="Note..." /></div>
                  <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={ciclicoForm.attivo} onChange={(e) => setCiclicoForm(f => ({ ...f, attivo: e.target.checked }))} style={{ accentColor: "var(--wa)" }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Attivo</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setCiclicoEdit(false)}>Annulla</Button>
                  <Button variant="primary" size="sm" onClick={async () => {
                    try {
                      const payload = {
                        dip_id: Number(id),
                        periodo1_da_mese: ciclicoForm.p1_mese, periodo1_da_giorno: ciclicoForm.p1_giorno, periodo1_ore_sett: ciclicoForm.p1_ore,
                        periodo2_da_mese: ciclicoForm.p2_mese, periodo2_da_giorno: ciclicoForm.p2_giorno, periodo2_ore_sett: ciclicoForm.p2_ore,
                        attivo: ciclicoForm.attivo, note: ciclicoForm.note || null,
                      };
                      const url = ciclico ? `/api/contratti-ciclici/${ciclico.id}` : "/api/contratti-ciclici";
                      const method = ciclico ? "PUT" : "POST";
                      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                      if (!res.ok) throw new Error("Errore");
                      showToast("Contratto ciclico salvato", "ok");
                      setCiclicoEdit(false);
                      fetchData();
                    } catch (err: any) { showToast(err.message, "err"); }
                  }}><Save size={13} /> Salva</Button>
                </div>
              </div>
            )}
          </div>

          {/* Orario */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<CalendarClock size={16} />} bg="var(--inl)" color="var(--in)" title="Orario Settimanale" sub={<>Template multi-settimanale. <a href="/configurazione/orari-template" style={{ color: "var(--ac)", textDecoration: "underline" }}>Gestisci template <ExternalLink size={10} style={{ display: "inline", verticalAlign: "middle" }} /></a></>} />
            <div className="g2">
              <div><label className="lbl">Template orario</label><select className="fi" value={dipOrario?.template_id ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setDipOrario(v ? { template_id: v, data_inizio_ciclo: dipOrario?.data_inizio_ciclo ?? "" } : null); setOrDirty(true); }}><option value="">-- Nessuno --</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
              <div><label className="lbl">Inizio ciclo (Lun. Sett. A)</label><input className="fi" type="date" value={dipOrario?.data_inizio_ciclo ?? ""} disabled={!dipOrario} onChange={(e) => { setDipOrario((p) => p ? { ...p, data_inizio_ciclo: e.target.value } : null); setOrDirty(true); }} /></div>
            </div>
            {orDirty && dipOrario && dipOrario.template_id > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}><Button variant="primary" size="sm" onClick={async () => { try { const r = await fetch(`/api/dipendenti/${id}/orario`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dipOrario) }); if (!r.ok) throw new Error("Errore"); setOrDirty(false); showToast("Orario assegnato", "ok"); } catch (e: any) { showToast(e.message, "err"); } }}><Save size={13} /> Salva Orario</Button></div>
            )}
          </div>

        </div>)}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SICUREZZA & FORMAZIONE                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "sicurezza" && (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPI mini */}
          <div className="g3">
            {[
              { l: "Visite Mediche", c: tecsam.filter(t => t.tipo === "visita_medica" && t.stato !== "effettuata").length, icon: <ShieldCheck size={16} />, color: "var(--wa)", bg: "var(--wal)" },
              { l: "Formazioni", c: tecsam.filter(t => t.tipo === "formazione" && t.stato !== "effettuata").length, icon: <GraduationCap size={16} />, color: "var(--in)", bg: "var(--inl)" },
              { l: "Scadute", c: tecsam.filter(t => t.stato === "scaduta").length, icon: <AlertTriangle size={16} />, color: "var(--er)", bg: "var(--erl)" },
            ].map((k, i) => (
              <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.color }}>{k.icon}</div>
                <div><div style={{ fontSize: 20, fontWeight: 800, color: k.c > 0 ? k.color : "var(--t)" }}>{k.c}</div><div style={{ fontSize: 11, color: "var(--tm)" }}>{k.l} pendenti</div></div>
              </div>
            ))}
          </div>

          {/* Lista + Add */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--t)" }}>Storico Visite & Formazioni</span>
            <Button variant="primary" size="sm" onClick={() => { setTecsamForm({ tipo: "visita_medica", descrizione: "", data_scadenza: "", data_prossima: "", data_effettuata: "", stato: "da_programmare", esito: "", note: "" }); setTecsamModal({ open: true }); }}><Plus size={14} /> Aggiungi</Button>
          </div>

          {tecsam.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--tm)" }}>
              <ShieldCheck size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Nessuna visita o formazione registrata</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tecsam.map((t) => (
                <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: t.tipo === "visita_medica" ? "var(--wal)" : t.tipo === "formazione" ? "var(--inl)" : "var(--bgs)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {t.tipo === "visita_medica" ? <ShieldCheck size={16} style={{ color: "var(--wa)" }} /> : t.tipo === "formazione" ? <GraduationCap size={16} style={{ color: "var(--in)" }} /> : <FileText size={16} style={{ color: "var(--tm)" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--t)" }}>{t.descrizione}</div>
                    <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {t.data_scadenza && <span>Scadenza: {fmtDate(t.data_scadenza)}</span>}
                      {t.data_prossima && <span>Prossima: {fmtDate(t.data_prossima)}</span>}
                      {t.data_effettuata && <span>Effettuata: {fmtDate(t.data_effettuata)}</span>}
                    </div>
                  </div>
                  <Badge variant={t.stato === "effettuata" ? "ok" : t.stato === "scaduta" ? "er" : t.stato === "programmata" ? "ac" : "wa"}>
                    {t.stato === "da_programmare" ? "Da programmare" : t.stato === "programmata" ? "Programmata" : t.stato === "effettuata" ? "Effettuata" : "Scaduta"}
                  </Badge>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" onClick={() => { setTecsamForm({ tipo: t.tipo, descrizione: t.descrizione, data_scadenza: t.data_scadenza?.toString().split("T")[0] ?? "", data_prossima: t.data_prossima?.toString().split("T")[0] ?? "", data_effettuata: t.data_effettuata?.toString().split("T")[0] ?? "", stato: t.stato, esito: t.esito ?? "", note: t.note ?? "" }); setTecsamModal({ open: true, editId: t.id }); }} title="Modifica"><Pencil size={13} /></button>
                    <button className="icon-btn" style={{ color: "var(--er)" }} onClick={async () => { if (!confirm("Eliminare?")) return; await fetch(`/api/tecsam/${t.id}`, { method: "DELETE" }); showToast("Eliminato", "ok"); fetchData(); }} title="Elimina"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tecsam modal inline */}
          {tecsamModal.open && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, border: "2px solid var(--ac)" }}>
              <Sec icon={<Plus size={16} />} bg="var(--acl)" color="var(--ac)" title={tecsamModal.editId ? "Modifica Record" : "Nuovo Record"} />
              <div className="g3">
                <div><label className="lbl">Tipo</label><select className="fi" value={tecsamForm.tipo} onChange={(e) => setTecsamForm(f => ({ ...f, tipo: e.target.value }))}><option value="visita_medica">Visita Medica</option><option value="formazione">Formazione</option><option value="altro">Altro</option></select></div>
                <div><label className="lbl">Stato</label><select className="fi" value={tecsamForm.stato} onChange={(e) => setTecsamForm(f => ({ ...f, stato: e.target.value }))}><option value="da_programmare">Da programmare</option><option value="programmata">Programmata</option><option value="effettuata">Effettuata</option><option value="scaduta">Scaduta</option></select></div>
                <div />
              </div>
              <div><label className="lbl">Descrizione *</label><input className="fi" value={tecsamForm.descrizione} onChange={(e) => setTecsamForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Es. Visita medica periodica" /></div>
              <div className="g3">
                <div><label className="lbl">Scadenza</label><input className="fi" type="date" value={tecsamForm.data_scadenza} onChange={(e) => setTecsamForm(f => ({ ...f, data_scadenza: e.target.value }))} /></div>
                <div><label className="lbl">Prossima</label><input className="fi" type="date" value={tecsamForm.data_prossima} onChange={(e) => setTecsamForm(f => ({ ...f, data_prossima: e.target.value }))} /></div>
                <div><label className="lbl">Effettuata</label><input className="fi" type="date" value={tecsamForm.data_effettuata} onChange={(e) => setTecsamForm(f => ({ ...f, data_effettuata: e.target.value }))} /></div>
              </div>
              <div className="g2">
                <div><label className="lbl">Esito</label><input className="fi" value={tecsamForm.esito} onChange={(e) => setTecsamForm(f => ({ ...f, esito: e.target.value }))} placeholder="Idoneo / Non idoneo / ..." /></div>
                <div><label className="lbl">Note</label><input className="fi" value={tecsamForm.note} onChange={(e) => setTecsamForm(f => ({ ...f, note: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => setTecsamModal({ open: false })}>Annulla</Button>
                <Button variant="primary" size="sm" disabled={tecsamSaving} onClick={handleSaveTecsam}>{tecsamSaving ? <Loader2 size={13} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={13} />} Salva</Button>
              </div>
            </div>
          )}
        </div>)}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: PARAMETRI FINE MESE                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "parametri" && (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── SEZIONE 1: PAUSA PRANZO (multi-livello) ──────────────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Coffee size={16} />} bg="var(--wal)" color="var(--wa)" title="Regole Pausa Pranzo" sub="Definisci la pausa in base alle ore lavorate nel giorno. Aggiungi piu righe per turni diversi." />

            {/* Tabella regole */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bdr)" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "var(--tm)" }}>Da ore</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "var(--tm)" }}>A ore</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "var(--tm)" }}>Pausa (minuti)</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "var(--tm)" }}>Dopo ore lavorate</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {regolePausa.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--tm)" }}>Nessuna regola. Aggiungi la prima fascia oraria.</td></tr>
                  )}
                  {regolePausa.map((rp, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--bdr)" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <input className="fi" type="number" min={0} max={24} step={0.5} style={{ width: 70 }} value={rp.ore_da} onChange={(e) => { const v = [...regolePausa]; v[idx] = { ...v[idx], ore_da: Number(e.target.value) }; setRegolePausa(v); setDirty(true); }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input className="fi" type="number" min={0} max={24} step={0.5} style={{ width: 70 }} value={rp.ore_a ?? ""} placeholder="--" onChange={(e) => { const v = [...regolePausa]; v[idx] = { ...v[idx], ore_a: e.target.value ? Number(e.target.value) : null }; setRegolePausa(v); setDirty(true); }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input className="fi" type="number" min={0} max={120} style={{ width: 70 }} value={rp.pausa_minuti} onChange={(e) => { const v = [...regolePausa]; v[idx] = { ...v[idx], pausa_minuti: Number(e.target.value) }; setRegolePausa(v); setDirty(true); }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input className="fi" type="number" min={0} max={12} step={0.5} style={{ width: 70 }} value={rp.dopo_ore} onChange={(e) => { const v = [...regolePausa]; v[idx] = { ...v[idx], dopo_ore: Number(e.target.value) }; setRegolePausa(v); setDirty(true); }} />
                      </td>
                      <td>
                        <button className="icon-btn" style={{ color: "var(--er)" }} onClick={() => { setRegolePausa(regolePausa.filter((_, i) => i !== idx)); setDirty(true); }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => { setRegolePausa([...regolePausa, { ore_da: regolePausa.length === 0 ? 0 : (regolePausa[regolePausa.length - 1].ore_a ?? 6), ore_a: null, pausa_minuti: 30, dopo_ore: 4 }]); setDirty(true); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "1.5px dashed var(--wa)", borderRadius: "var(--r2)", background: "transparent", color: "var(--wa)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--wal)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <Plus size={14} /> Aggiungi fascia oraria
            </button>

            {/* Esempio */}
            {regolePausa.length > 0 && (
              <div style={{ background: "var(--acl)", border: "1px solid rgba(59,91,219,.15)", borderRadius: "var(--r2)", padding: "10px 14px", fontSize: 12.5, color: "var(--ac)", lineHeight: 1.6 }}>
                <strong>Esempio:</strong>{" "}
                {regolePausa.map((rp, i) => (
                  <span key={i}>Turno {rp.ore_da}h{rp.ore_a ? `-${rp.ore_a}h` : "+"}: pausa {rp.pausa_minuti}min dopo {rp.dopo_ore}h.{i < regolePausa.length - 1 ? " | " : ""}</span>
                ))}
              </div>
            )}
          </div>

          {/* ── SEZIONE 2: ORE IN ECCESSO ────────────────────────────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<TrendingUp size={16} />} bg="var(--okl)" color="var(--ok)" title="Ore in Eccesso — Dove vanno le ore in piu" sub="Definisci la priorita dei basket. Il sistema riempie dall'alto in basso." />

            {/* Straordinario cap */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: "var(--bgs)", borderRadius: "var(--r2)", border: "1px solid var(--bdr)" }}>
              <ShieldCheck size={16} style={{ color: "var(--wa)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t)" }}>Straordinario pagabile:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--tm)" }}>Max</span>
                <input className="fi" type="number" min={0} max={20} step={0.5} style={{ width: 60 }} value={oMaxSett ?? 8} onChange={(e) => { setOMaxSett(Number(e.target.value)); setRegDirty(true); }} />
                <span style={{ fontSize: 12, color: "var(--tm)" }}>h/settimana</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--tm)" }}>Max</span>
                <input className="fi" type="number" min={0} max={8} step={0.5} style={{ width: 60 }} value={oMaxGiorno ?? 2} onChange={(e) => { setOMaxGiorno(Number(e.target.value)); setRegDirty(true); }} />
                <span style={{ fontSize: 12, color: "var(--tm)" }}>h/giorno</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "var(--t2)" }}>
                <input type="checkbox" checked={oPriSab ?? true} onChange={(e) => { setOPriSab(e.target.checked); setRegDirty(true); }} style={{ accentColor: "var(--ac)" }} />
                Priorita sabato
              </label>
            </div>

            {/* Pipeline eccesso */}
            <PriorityList
              items={oFt}
              setItems={(items) => { setOFt(items.map(i => ({ dest: i.dest as StepEccesso["dest"], max_ore: i.max_ore }))); setRegDirty(true); }}
              options={[
                { value: "straordinario", label: "Straordinario (pagabile)", color: "#d97706" },
                { value: "boa", label: "BOA - Banca Ore Assenza", color: "#3b82f6" },
                { value: "bop", label: "BOP - Salvadanaio Personale", color: "#8b5cf6" },
                { value: "bos", label: "BOS - Banca Ore Straordinario", color: "#6366f1" },
              ]}
            />
          </div>

          {/* ── SEZIONE 3: ORE IN DIFETTO ────────────────────────────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<TrendingDown size={16} />} bg="var(--erl)" color="var(--er)" title="Ore in Difetto — Da dove recuperare le ore mancanti" sub="Definisci la priorita delle fonti. Il sistema attinge dall'alto in basso." />

            <PriorityList
              items={oDef.map(d => ({ dest: d.source, max_ore: null }))}
              setItems={(items) => { setODef(items.map(i => ({ source: i.dest as StepDeficit["source"], per: "parziale" as const }))); setRegDirty(true); }}
              options={[
                { value: "rol", label: "ROL - Riduzione Orario Lavoro", color: "#059669" },
                { value: "ferie", label: "Ferie", color: "#d97706" },
                { value: "boa", label: "BOA - Banca Ore (sottrazione)", color: "#3b82f6" },
                { value: "bop", label: "BOP - Salvadanaio Personale", color: "#8b5cf6" },
              ]}
            />
          </div>

          {/* Save */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {(regDirty || dirty) && (
              <Button variant="primary" size="lg" disabled={regSaving || saving} onClick={async () => {
                // Salva sia config (pausa) che regole (eccesso/difetto)
                setSaving(true); setRegSaving(true);
                try {
                  await Promise.all([
                    fetch(`/api/dipendenti/${id}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cfg, regole_pausa: regolePausa.length > 0 ? regolePausa : null }) }),
                    fetch(`/api/dipendenti/${id}/regole`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ft_eccesso_pipeline: oFt, pt_eccesso_pipeline: oPt, deficit_pipeline: oDef, straordinario_max_sett: oMaxSett, straordinario_max_giorno: oMaxGiorno, straordinario_priorita_sabato: oPriSab }) }),
                  ]);
                  setDirty(false); setRegDirty(false);
                  showToast("Parametri salvati", "ok");
                } catch (err: any) { showToast(err.message, "err"); }
                finally { setSaving(false); setRegSaving(false); }
              }}>
                {(saving || regSaving) ? <Loader2 size={15} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={15} />}
                Salva Tutti i Parametri
              </Button>
            )}
          </div>
        </div>)}

      </div>
    </>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function Sec({ icon, bg, color, title, sub }: { icon: React.ReactNode; bg: string; color: string; title: string; sub?: React.ReactNode }) {
  return (<div><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: sub ? 4 : 0 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div><span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--t)" }}>{title}</span></div>{sub && <p style={{ fontSize: 12.5, color: "var(--tm)", marginLeft: 40 }}>{sub}</p>}</div>);
}

function RO({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (<div><label className="lbl">{label}</label><div style={{ padding: "9px 12px", borderRadius: "var(--r2)", background: "var(--bgs)", border: "1px solid var(--bdr)", fontSize: 13, fontWeight: 600, color: "var(--t)", fontFamily: mono ? "var(--m)" : "inherit" }}>{value || "—"}</div></div>);
}

function SaveBar({ dirty, saving, onSave, label }: { dirty: boolean; saving: boolean; onSave: () => void; label?: string }) {
  return (<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 6px", borderTop: "1px solid var(--bdr)" }}><span style={{ fontSize: 12, color: "var(--tm)" }}>{dirty ? "Modifiche non salvate" : "Nessuna modifica"}</span><Button variant="primary" size="lg" onClick={onSave} disabled={saving || !dirty}>{saving ? <Loader2 size={15} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={15} />}{saving ? "Salvataggio..." : label ?? "Salva"}</Button></div>);
}

/* Priorita list per eccesso/difetto — semplice e chiaro */
function PriorityList({ items, setItems, options }: {
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
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: "1.5px solid var(--bdr)", borderRadius: 10 }}>
            {/* Numero priorita */}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: opt?.color ?? "#888", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
            {/* Dropdown */}
            <select className="fi" style={{ flex: 1 }} value={item.dest} onChange={(e) => {
              const v = [...items]; v[idx] = { ...v[idx], dest: e.target.value }; setItems(v);
            }}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {/* Max ore */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--tm)" }}>Max:</span>
              <input className="fi" type="number" min={0} step={0.5} style={{ width: 60 }} value={item.max_ore ?? ""} placeholder="--"
                onChange={(e) => { const v = [...items]; v[idx] = { ...v[idx], max_ore: e.target.value ? Number(e.target.value) : null }; setItems(v); }} />
              <span style={{ fontSize: 10, color: "var(--tm)" }}>h</span>
            </div>
            {/* Move up/down */}
            <button className="icon-btn" disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }} onClick={() => { const v = [...items]; [v[idx], v[idx - 1]] = [v[idx - 1], v[idx]]; setItems(v); }} title="Su"><ChevronUp size={14} /></button>
            <button className="icon-btn" disabled={idx === items.length - 1} style={{ opacity: idx === items.length - 1 ? 0.3 : 1 }} onClick={() => { const v = [...items]; [v[idx], v[idx + 1]] = [v[idx + 1], v[idx]]; setItems(v); }} title="Giu"><ChevronDown size={14} /></button>
            {/* Remove */}
            <button className="icon-btn" style={{ color: "var(--er)" }} onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={13} /></button>
          </div>
        );
      })}
      {available.length > 0 && (
        <button onClick={() => setItems([...items, { dest: available[0].value, max_ore: null }])}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, border: "1.5px dashed var(--ac)", borderRadius: 10, background: "transparent", color: "var(--ac)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--acl)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <Plus size={14} /> Aggiungi basket
        </button>
      )}
      {items.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: 12, color: "var(--tm)" }}>
          <span style={{ fontWeight: 600 }}>Flusso:</span>
          {items.map((item, i) => {
            const opt = options.find(o => o.value === item.dest);
            return (<span key={i}><span style={{ fontWeight: 600, color: opt?.color }}>{opt?.label.split(" ")[0]}</span>{item.max_ore != null && <span style={{ fontSize: 10 }}> (max {item.max_ore}h)</span>}{i < items.length - 1 && <span> → </span>}</span>);
          })}
        </div>
      )}
    </div>
  );
}
