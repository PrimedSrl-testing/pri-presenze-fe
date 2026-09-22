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
import { WeekGridEditor } from "@/components/configurazione/WeekGridEditor";
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
  MessageCircle, Send, Link as LinkIcon, Copy, PiggyBank, GraduationCap as GradIcon,
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
  { key: "BOP", value: "bop" },
];
const DEFICIT_OPT = [
  { key: "Ferie", value: "ferie" }, { key: "ROL", value: "rol" },
  { key: "BOA", value: "boa" }, { key: "BOP", value: "bop" },
];

/* ── Tipologie contratto (storico) ────────────────────────────────────────── */
const TIPI_CONTRATTO = [
  "A tempo determinato",
  "A tempo indeterminato",
  "Tirocinio",
  "Altro",
] as const;

/* ── Defaults ─────────────────────────────────────────────────────────────── */
const DEFAULT_CFG: Omit<DipConfig, "id" | "dip_id"> = {
  codice_fiscale: null, email: null, telefono: null, regole_pausa: null,
  pec: null,
  doc_carta_identita: false, doc_codice_fiscale: false, doc_c2_storico: false, doc_permesso_soggiorno: false,
  doc_ci_file: null, doc_cf_file: null, doc_c2_file: null, doc_ps_file: null,
  medico_famiglia: null, medico_famiglia_tel: null,
  settimana_lavorativa: null,
  token_self_service: null, dati_da_verificare: false, data_autocompilazione: null,
  data_nascita: null, luogo_nascita: null, genere: null, nazionalita: null,
  indirizzo: null, citta: null, cap: null, provincia: null,
  iban: null, contatto_emergenza: null, contatto_emergenza_tel: null,
  tipo_rapporto: null,
  pausa_minuti: 30, pausa_soglia_ore: 8, pausa_auto: true,
  flg_bop: false, flg_boa: false, flg_bos: false,
  flg_compensazione_mensile: false, flg_non_timbrante: false,
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
  const [inquadramentoDirty, setInquadramentoDirty] = useState(false);
  const [inquadramentoSaving, setInquadramentoSaving] = useState(false);
  const [settimanaSaving, setSettimanaSaving] = useState(false);
  const [settimanaSaved, setSettimanaSaved] = useState(false);

  // Regole
  const [hasOverride, setHasOverride] = useState(false);
  const [regoleGlobali, setRegoleGlobali] = useState<RegoleGlobali | null>(null);
  const [oFt, setOFt] = useState<StepEccesso[]>([]);
  const [oPt, setOPt] = useState<StepEccesso[]>([]);
  const [oDef, setODef] = useState<StepDeficit[]>([]);
  const [oMaxSett, setOMaxSett] = useState<number | null>(null);
  const [oMaxGiorno, setOMaxGiorno] = useState<number | null>(null);
  const [oPriSab, setOPriSab] = useState<boolean | null>(null);
  const [oPSuppl, setOPSuppl] = useState<boolean | null>(null);
  const [regDirty, setRegDirty] = useState(false);
  const [regSaving, setRegSaving] = useState(false);

  // Orario
  const [templates, setTemplates] = useState<Array<{ id: number; nome: string; num_settimane: number; attivo: boolean; note: string | null; giorni: any[] }>>([]);
  const [dipOrario, setDipOrario] = useState<{ template_id: number; data_inizio_ciclo: string; base_template_id?: number | null; ciclico_override?: { periodo: 1 | 2; ore_sett: number; is_part_time: boolean; data_inizio: string; data_fine: string } | null } | null>(null);
  // Modifica template inline dalla scheda dipendente
  const [orarioEdit, setOrarioEdit] = useState<{ giorni: any[]; saving: boolean } | null>(null);
  const [orDirty, setOrDirty] = useState(false);

  // Regole pausa multi-livello
  const [regolePausa, setRegolePausa] = useState<RegolaPausa[]>([]);

  // Storico contratti
  const [contratti, setContratti] = useState<StoricoContratto[]>([]);

  // Reparti
  const [reparti, setReparti] = useState<{ cod_reparto: number; des_reparto: string }[]>([]);

  // BOP Movimenti
  const [bopMovimenti, setBopMovimenti] = useState<any[]>([]);
  const [bopSaldo, setBopSaldo] = useState(0);
  const [bopForm, setBopForm] = useState({ data_movimento: new Date().toISOString().split("T")[0], tipo: "scarico", ore: "", motivazione: "" });
  const [bopOpen, setBopOpen] = useState(false);

  // Attestati formazione
  const [attestati, setAttestati] = useState<any[]>([]);
  const [attestatoForm, setAttestatoForm] = useState<{ open: boolean; titolo: string; data_corso: string; data_scadenza: string; note: string; file: File | null }>({ open: false, titolo: "", data_corso: "", data_scadenza: "", note: "", file: null });

  // Contratto ciclico
  const [ciclico, setCiclico] = useState<any>(null);
  const [ciclicoForm, setCiclicoForm] = useState({ p1_mese: 9, p1_giorno: 1, p1_ore: 40, p1_template_id: null as number | null, p2_mese: 5, p2_giorno: 1, p2_ore: 24, p2_template_id: null as number | null, attivo: true, note: "" });
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
      const [dipR, cfgR, regR, orR, tplR, tecR, ctrR, cicR, bopR, attR, repR] = await Promise.all([
        fetch(`/api/dipendenti/${id}`), fetch(`/api/dipendenti/${id}/config`),
        fetch(`/api/dipendenti/${id}/regole`), fetch(`/api/dipendenti/${id}/orario`),
        fetch(`/api/orari-template`), fetch(`/api/tecsam?dip_id=${id}`),
        fetch(`/api/dipendenti/${id}/contratti`),
        fetch(`/api/contratti-ciclici`),
        fetch(`/api/dipendenti/${id}/bop-movimenti`),
        fetch(`/api/dipendenti/${id}/attestati`),
        fetch(`/api/reparti`),
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
          medico_famiglia: c.medico_famiglia, medico_famiglia_tel: c.medico_famiglia_tel,
          settimana_lavorativa: c.settimana_lavorativa,
          token_self_service: c.token_self_service,
          dati_da_verificare: !!c.dati_da_verificare,
          data_autocompilazione: c.data_autocompilazione,
          data_nascita: c.data_nascita?.split?.("T")?.[0] ?? c.data_nascita,
          luogo_nascita: c.luogo_nascita, genere: c.genere, nazionalita: c.nazionalita,
          indirizzo: c.indirizzo, citta: c.citta, cap: c.cap, provincia: c.provincia,
          iban: c.iban, contatto_emergenza: c.contatto_emergenza, contatto_emergenza_tel: c.contatto_emergenza_tel,
          tipo_rapporto: c.tipo_rapporto,
          pausa_minuti: c.pausa_minuti, pausa_soglia_ore: c.pausa_soglia_ore, pausa_auto: c.pausa_auto,
          flg_bop: c.flg_bop, flg_boa: c.flg_boa, flg_bos: c.flg_bos,
          flg_compensazione_mensile: !!c.flg_compensazione_mensile,
          flg_non_timbrante: !!c.flg_non_timbrante,
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
        // Carica effettive (override > globali) per popolare UI
        const eff = r.effettive ?? r.globali;
        if (eff) {
          setOFt(eff.ft_eccesso_pipeline ?? []); setOPt(eff.pt_eccesso_pipeline ?? []);
          // Deficit pipeline: forziamo la forma rigida (ROL parziale, FERIE intera, [BOP cap se presente])
          const existingDef: StepDeficit[] = Array.isArray(eff.deficit_pipeline) ? eff.deficit_pipeline : [];
          const existingBopCap = existingDef.find(d => d.source === "bop")?.max_ore ?? null;
          const rigidDef: StepDeficit[] = [
            { source: "rol", per: "parziale", max_ore: null },
            { source: "ferie", per: "intera", max_ore: null },
          ];
          if (existingBopCap && existingBopCap > 0) rigidDef.push({ source: "bop", per: "parziale", max_ore: existingBopCap });
          setODef(rigidDef);
          setOMaxSett(eff.straordinario_max_sett ?? 8); setOMaxGiorno(eff.straordinario_max_giorno ?? 2);
          setOPriSab(eff.straordinario_priorita_sabato ?? true);
          setOPSuppl(eff.pt_supplementari_attivo ?? true);
        }
      }
      if (orR.ok) {
        const o = await orR.json();
        if (o) setDipOrario({
          template_id: o.template_id,
          data_inizio_ciclo: o.data_inizio_ciclo?.split("T")[0] ?? "",
          base_template_id: o.base_template_id ?? null,
          ciclico_override: o.ciclico_override ?? null,
        });
      }
      if (tplR.ok) setTemplates((await tplR.json()).map((t: any) => ({
        id: t.id, nome: t.nome, num_settimane: t.num_settimane, attivo: !!t.attivo, note: t.note ?? null, giorni: t.giorni ?? [],
      })));
      if (tecR.ok) setTecsam(await tecR.json());
      if (ctrR.ok) { const cd = await ctrR.json(); setContratti(cd.contratti ?? []); setMesiTotali(cd.mesi_totali ?? 0); }
      if (bopR.ok) { const b = await bopR.json(); setBopMovimenti(b.movimenti ?? []); setBopSaldo(b.saldo ?? 0); }
      if (attR.ok) setAttestati(await attR.json());
      if (repR.ok) {
        const reps = await repR.json();
        setReparti(reps.map((r: any) => ({ cod_reparto: Number(r.cod_reparto), des_reparto: r.des_reparto })));
      }
      if (cicR.ok) {
        const allCiclici = await cicR.json();
        const myCiclico = allCiclici.find((c: any) => c.dip_id === Number(id));
        if (myCiclico) {
          setCiclico(myCiclico);
          setCiclicoForm({
            p1_mese: myCiclico.periodo1_da_mese, p1_giorno: myCiclico.periodo1_da_giorno,
            p1_ore: Number(myCiclico.periodo1_ore_sett),
            p1_template_id: myCiclico.periodo1_template_id ?? null,
            p2_mese: myCiclico.periodo2_da_mese, p2_giorno: myCiclico.periodo2_da_giorno,
            p2_ore: Number(myCiclico.periodo2_ore_sett),
            p2_template_id: myCiclico.periodo2_template_id ?? null,
            attivo: myCiclico.attivo, note: myCiclico.note ?? "",
          });
        }
      }
    } catch (err: any) { showToast(err.message, "err"); } finally { setLoading(false); }
  }, [id, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const set = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) => { setCfg((p) => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dipendenti/${id}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cfg, regole_pausa: regolePausa.length > 0 ? regolePausa : null }) });
      if (!res.ok) throw new Error("Errore"); showToast("Salvato", "ok"); setDirty(false); return true;
    } catch (err: any) { showToast(err.message, "err"); return false; } finally { setSaving(false); }
  };

  /* Settimana lavorativa: salvataggio immediato al clic, senza pulsante Salva. */
  const saveSettimanaLavorativa = async (v: "lun-ven" | "lun-sab") => {
    const precedente = cfg.settimana_lavorativa;
    if (precedente === v) return;
    setCfg((p) => ({ ...p, settimana_lavorativa: v }));
    setSettimanaSaved(false);
    setSettimanaSaving(true);
    try {
      const res = await fetch(`/api/dipendenti/${id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, settimana_lavorativa: v, regole_pausa: regolePausa.length > 0 ? regolePausa : null }),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio della settimana lavorativa");
      setDirty(false);
      setSettimanaSaved(true);
      showToast("Settimana lavorativa salvata", "ok");
    } catch (err: any) {
      setCfg((p) => ({ ...p, settimana_lavorativa: precedente }));
      showToast(err.message || "Errore nel salvataggio", "err");
    } finally {
      setSettimanaSaving(false);
    }
  };

  const handleSaveRegole = async () => {
    setRegSaving(true);
    try {
      const res = await fetch(`/api/dipendenti/${id}/regole`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ft_eccesso_pipeline: oFt, pt_eccesso_pipeline: oPt, deficit_pipeline: oDef, straordinario_max_sett: oMaxSett, straordinario_max_giorno: oMaxGiorno, straordinario_priorita_sabato: oPriSab, pt_supplementari_attivo: oPSuppl }) });
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
                {cfg.dati_da_verificare && <Badge variant="wa">Dati da verificare</Badge>}
              </div>
            </div>
            {/* Azioni rapide */}
            <div style={{ display: "flex", gap: 6 }}>
              {cfg.telefono && (
                <a href={`https://wa.me/${cfg.telefono.replace(/\D/g, "").replace(/^0/, "39")}`} target="_blank" rel="noopener noreferrer" className="icon-btn" title={`WhatsApp: ${cfg.telefono}`} style={{ color: "#25D366" }}>
                  <MessageCircle size={18} />
                </a>
              )}
              {cfg.email && (
                <a href={`mailto:${cfg.email}`} className="icon-btn" title={`Email: ${cfg.email}`} style={{ color: "var(--ac)" }}>
                  <Mail size={18} />
                </a>
              )}
              <button className="icon-btn" onClick={async () => {
                try {
                  const res = await fetch(`/api/dipendenti/${id}/token-self-service`, { method: "POST" });
                  if (!res.ok) throw new Error("Errore");
                  const data = await res.json();
                  const link = `${window.location.origin}/self-service/${data.token}`;
                  await navigator.clipboard.writeText(link).catch(() => {});
                  showToast(`Link copiato: ${link}`, "ok");
                } catch (err: any) { showToast(err.message, "err"); }
              }} title="Genera link self-service (copia negli appunti)" style={{ color: "var(--pu)" }}>
                <LinkIcon size={18} />
              </button>
              <button className="icon-btn" onClick={() => router.push("/dipendenti")} title="Torna alla lista"><ArrowLeft size={18} /></button>
            </div>
          </div>
          {/* Banner dati da verificare */}
          {cfg.dati_da_verificare && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef3c7", border: "1.5px solid #d97706", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={16} style={{ color: "#d97706" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>Dati compilati dal dipendente — da verificare</div>
                <div style={{ fontSize: 12, color: "#92400e", opacity: 0.85 }}>
                  Ultima compilazione: {cfg.data_autocompilazione ? new Date(cfg.data_autocompilazione).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={async () => {
                try {
                  const res = await fetch(`/api/dipendenti/${id}/config`, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...cfg, dati_da_verificare: false }),
                  });
                  if (!res.ok) throw new Error("Errore");
                  showToast("Dati approvati", "ok");
                  fetchData();
                } catch (err: any) { showToast(err.message, "err"); }
              }}><CheckCircle size={13} /> Approva dati</Button>
            </div>
          )}
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

          {/* Stato Contratto (visibile in homepage anagrafica) */}
          <StatoContrattoCard
            dip={dip}
            saving={inquadramentoSaving}
            onUpdate={(patch) => setDip(d => d ? { ...d, ...patch } : d)}
            onSaved={() => fetchData()}
            showToast={showToast}
            apiId={id}
          />

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

          {/* Medico di Famiglia */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Heart size={16} />} bg="var(--pul)" color="var(--pu)" title="Medico di Famiglia" sub="Necessario per la cartella sanitaria del dipendente" />
            <div className="g2">
              <div><label className="lbl">Nome e cognome medico</label><input className="fi" value={cfg.medico_famiglia ?? ""} onChange={(e) => set("medico_famiglia", e.target.value || null)} placeholder="Dr. Mario Bianchi" /></div>
              <div><label className="lbl">Telefono ambulatorio</label><input className="fi" type="tel" value={cfg.medico_famiglia_tel ?? ""} onChange={(e) => set("medico_famiglia_tel", e.target.value || null)} placeholder="02 1234567" /></div>
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

          {/* Inquadramento attuale — tutti i campi modificabili */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Building2 size={16} />} bg="var(--acl)" color="var(--ac)" title="Inquadramento Attuale" sub="Modifica i dati principali del rapporto di lavoro" />
            <div className="g3">
              <div>
                <label className="lbl"><Building2 size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Reparto</label>
                <select
                  className="fi"
                  value={(dip as any).id_reparto ?? ""}
                  onChange={(e) => {
                    const codRep = e.target.value ? Number(e.target.value) : null;
                    const descRep = reparti.find(r => r.cod_reparto === codRep)?.des_reparto ?? null;
                    setDip(d => d ? { ...d, des_reparto: descRep ?? "", id_reparto: codRep as any } : d);
                    setInquadramentoDirty(true);
                  }}
                >
                  <option value="">— Nessun reparto —</option>
                  {reparti.map(r => (
                    <option key={r.cod_reparto} value={r.cod_reparto}>{r.des_reparto}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl">Contratto attivo</label>
                <input
                  className="fi"
                  value={dip.des_contratto ?? ""}
                  onChange={(e) => { setDip(d => d ? { ...d, des_contratto: e.target.value } : d); setInquadramentoDirty(true); }}
                  placeholder="Es. Indeterminato"
                />
              </div>
              <div>
                <label className="lbl">Ore settimanali</label>
                <input
                  className="fi"
                  type="number"
                  min={0}
                  max={48}
                  step={0.5}
                  value={dip.ore_settimanali ?? ""}
                  onChange={(e) => { setDip(d => d ? { ...d, ore_settimanali: e.target.value ? Number(e.target.value) : 0 } : d); setInquadramentoDirty(true); }}
                />
              </div>
            </div>
            <div className="g3">
              <div>
                <label className="lbl">Programma</label>
                <input
                  className="fi"
                  value={dip.des_programma ?? ""}
                  onChange={(e) => { setDip(d => d ? { ...d, des_programma: e.target.value || null } : d); setInquadramentoDirty(true); }}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="lbl">Dal</label>
                <input
                  className="fi"
                  type="date"
                  value={dip.data_inizio ? new Date(dip.data_inizio).toISOString().split("T")[0] : ""}
                  onChange={(e) => { setDip(d => d ? { ...d, data_inizio: e.target.value ? (new Date(e.target.value).toISOString() as any) : null } : d); setInquadramentoDirty(true); }}
                />
              </div>
              <div>
                <label className="lbl">Al (vuoto = indeterminato)</label>
                <input
                  className="fi"
                  type="date"
                  value={dip.data_fine ? new Date(dip.data_fine).toISOString().split("T")[0] : ""}
                  onChange={(e) => { setDip(d => d ? { ...d, data_fine: e.target.value ? (new Date(e.target.value).toISOString() as any) : null } : d); setInquadramentoDirty(true); }}
                />
              </div>
            </div>

            {inquadramentoDirty && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--bdr)" }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={inquadramentoSaving}
                  onClick={async () => {
                    if (!dip) return;
                    setInquadramentoSaving(true);
                    try {
                      const payload = {
                        id_reparto: (dip as any).id_reparto ?? null,
                        des_reparto: dip.des_reparto || null,
                        des_contratto: dip.des_contratto || null,
                        ore_settimanali: dip.ore_settimanali ?? null,
                        des_programma: dip.des_programma ?? null,
                        data_inizio: dip.data_inizio || null,
                        data_fine: dip.data_fine || null,
                      };
                      const res = await fetch(`/api/dipendenti/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) throw new Error("Errore salvataggio inquadramento");
                      setInquadramentoDirty(false);
                      showToast("Inquadramento salvato", "ok");
                    } catch (err: any) { showToast(err.message, "err"); }
                    finally { setInquadramentoSaving(false); }
                  }}
                >
                  {inquadramentoSaving ? <Loader2 size={13} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={13} />}
                  Salva Inquadramento
                </Button>
              </div>
            )}
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
                  <div>
                    <label className="lbl">Tipo contratto</label>
                    <select className="fi" value={contrattoForm.data.tipo_contratto} onChange={(e) => setContrattoForm(f => ({ ...f, data: { ...f.data, tipo_contratto: e.target.value } }))}>
                      <option value="">— Seleziona —</option>
                      {/* Un contratto gia' registrato puo' avere una tipologia scritta a mano libera:
                          la si mantiene come opzione, altrimenti verrebbe cambiata in silenzio. */}
                      {contrattoForm.data.tipo_contratto !== "" && !TIPI_CONTRATTO.includes(contrattoForm.data.tipo_contratto as typeof TIPI_CONTRATTO[number]) && (
                        <option value={contrattoForm.data.tipo_contratto}>{contrattoForm.data.tipo_contratto} (valore esistente)</option>
                      )}
                      {TIPI_CONTRATTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {contrattoForm.data.tipo_contratto === "Altro" && (
                      <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 4 }}>Specifica i dettagli nel campo Note qui sotto.</div>
                    )}
                  </div>
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

          {/* Settimana Lavorativa */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<CalendarClock size={16} />} bg="var(--okl)" color="var(--ok)" title="Settimana Lavorativa" sub="Determina come il sistema calcola straordinari ed eccedenze del sabato. La scelta si salva da sola: non serve premere Salva." />
            <div style={{ display: "flex", gap: 12 }}>
              {([
                { v: "lun-ven" as const, l: "Lunedi - Venerdi", d: "Sabato conteggiato come straordinario" },
                { v: "lun-sab" as const, l: "Lunedi - Sabato", d: "Eccedenze valutate su tutta la settimana" },
              ]).map((o) => (
                <label key={o.v} style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: settimanaSaving ? "wait" : "pointer",
                  padding: "14px 20px", borderRadius: "var(--r)", userSelect: "none",
                  border: cfg.settimana_lavorativa === o.v ? "2px solid var(--ac)" : "1.5px solid var(--bdr)",
                  background: cfg.settimana_lavorativa === o.v ? "var(--acl)" : "var(--bg)",
                  opacity: settimanaSaving && cfg.settimana_lavorativa !== o.v ? .6 : 1,
                  transition: "all .15s", flex: 1,
                }}>
                  <input type="radio" name="settimana_lavorativa" checked={cfg.settimana_lavorativa === o.v}
                    disabled={settimanaSaving}
                    onChange={() => saveSettimanaLavorativa(o.v)} style={{ accentColor: "var(--ac)" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: cfg.settimana_lavorativa === o.v ? 700 : 500, color: cfg.settimana_lavorativa === o.v ? "var(--ac)" : "var(--t)" }}>{o.l}</div>
                    <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 2 }}>{o.d}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20, fontSize: 12.5 }}>
              {settimanaSaving ? (
                <>
                  <Loader2 size={13} style={{ animation: "sp 1s linear infinite", color: "var(--tm)" }} />
                  <span style={{ color: "var(--tm)" }}>Salvataggio in corso…</span>
                </>
              ) : settimanaSaved ? (
                <>
                  <CheckCircle size={13} style={{ color: "var(--ok)" }} />
                  <span style={{ color: "var(--ok)", fontWeight: 600 }}>Salvato — la scelta è registrata, puoi uscire dalla scheda</span>
                </>
              ) : cfg.settimana_lavorativa ? (
                <span style={{ color: "var(--tm)" }}>Impostazione registrata: <strong>{cfg.settimana_lavorativa === "lun-sab" ? "Lunedi - Sabato" : "Lunedi - Venerdi"}</strong></span>
              ) : (
                <span style={{ color: "var(--tm)" }}>Nessuna opzione selezionata</span>
              )}
            </div>
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
            {ciclico && !ciclicoEdit && (() => {
              // Calcola periodo attivo OGGI per evidenziare quello in vigore
              const p1Start = new Date(new Date().getFullYear(), ciclico.periodo1_da_mese - 1, ciclico.periodo1_da_giorno);
              const p2Start = new Date(new Date().getFullYear(), ciclico.periodo2_da_mese - 1, ciclico.periodo2_da_giorno);
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const ascending = p1Start <= p2Start;
              const inP1 = ascending ? (today >= p1Start && today < p2Start) : (today >= p1Start || today < p2Start);
              const activeNum: 1 | 2 = inP1 ? 1 : 2;
              const activeOre = activeNum === 1 ? Number(ciclico.periodo1_ore_sett) : Number(ciclico.periodo2_ore_sett);
              const isPT = activeOre < 40;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px", background: "var(--wal)", borderRadius: 10, border: "1.5px solid var(--wa)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                        <div style={{ fontWeight: activeNum === 1 ? 700 : 400 }}>
                          <span style={{ fontWeight: 700, color: "var(--wa)" }}>Periodo 1:</span> da {ciclico.periodo1_da_giorno}/{ciclico.periodo1_da_mese} — <strong>{ciclico.periodo1_ore_sett}h/sett</strong>
                          {activeNum === 1 && <Badge variant="ok"> Attivo oggi</Badge>}
                        </div>
                        <div style={{ fontWeight: activeNum === 2 ? 700 : 400 }}>
                          <span style={{ fontWeight: 700, color: "var(--pu)" }}>Periodo 2:</span> da {ciclico.periodo2_da_giorno}/{ciclico.periodo2_da_mese} — <strong>{ciclico.periodo2_ore_sett}h/sett</strong>
                          {activeNum === 2 && <Badge variant="ok"> Attivo oggi</Badge>}
                        </div>
                      </div>
                      {ciclico.note && <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 4, fontStyle: "italic" }}>{ciclico.note}</div>}
                    </div>
                    <Badge variant={ciclico.attivo ? "ok" : "nn"}>{ciclico.attivo ? "Attivo" : "Disattivo"}</Badge>
                    <button className="icon-btn" onClick={() => setCiclicoEdit(true)}><Pencil size={13} /></button>
                  </div>
                  {ciclico.attivo && (
                    <div style={{ fontSize: 11.5, color: isPT ? "#92400e" : "var(--tm)", padding: "6px 10px", background: isPT ? "#fff7ed" : "transparent", borderRadius: 6, border: isPT ? "1px dashed #f59e0b" : "none" }}>
                      ⓘ Oggi il dipendente lavora in regime {isPT ? <strong>Part-Time ({activeOre}h)</strong> : <strong>Full-Time ({activeOre}h)</strong>}.
                      {isPT && <> Le ore eccedenti fino a 40h/settimana saranno conteggiate come <strong>supplementari</strong>; oltre 40h come <strong>straordinario</strong> (max 8h).</>}
                    </div>
                  )}
                </div>
              );
            })()}

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
                    <div style={{ marginTop: 8 }}>
                      <label className="lbl">Template orario (opzionale)</label>
                      <select className="fi" value={ciclicoForm.p1_template_id ?? ""} onChange={(e) => setCiclicoForm(f => ({ ...f, p1_template_id: e.target.value ? Number(e.target.value) : null }))}>
                        <option value="">-- Usa template base --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fff", borderRadius: 8, border: "1px solid var(--bdr)" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--pu)", marginBottom: 8 }}>Periodo 2</div>
                    <div className="g3">
                      <div><label className="lbl">Mese inizio</label><input className="fi" type="number" min={1} max={12} value={ciclicoForm.p2_mese} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_mese: Number(e.target.value) }))} /></div>
                      <div><label className="lbl">Giorno</label><input className="fi" type="number" min={1} max={31} value={ciclicoForm.p2_giorno} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_giorno: Number(e.target.value) }))} /></div>
                      <div><label className="lbl">Ore/sett</label><input className="fi" type="number" min={0} max={48} step={0.5} value={ciclicoForm.p2_ore} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_ore: Number(e.target.value) }))} /></div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label className="lbl">Template orario (opzionale)</label>
                      <select className="fi" value={ciclicoForm.p2_template_id ?? ""} onChange={(e) => setCiclicoForm(f => ({ ...f, p2_template_id: e.target.value ? Number(e.target.value) : null }))}>
                        <option value="">-- Usa template base --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
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
                        periodo1_da_mese: ciclicoForm.p1_mese, periodo1_da_giorno: ciclicoForm.p1_giorno, periodo1_ore_sett: ciclicoForm.p1_ore, periodo1_template_id: ciclicoForm.p1_template_id,
                        periodo2_da_mese: ciclicoForm.p2_mese, periodo2_da_giorno: ciclicoForm.p2_giorno, periodo2_ore_sett: ciclicoForm.p2_ore, periodo2_template_id: ciclicoForm.p2_template_id,
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

          {/* Orario Settimanale — assegnazione + preview + edit inline */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<CalendarClock size={16} />} bg="var(--inl)" color="var(--in)" title="Orario Settimanale" sub={<>Template multi-settimanale. <a href="/configurazione/orari-template" style={{ color: "var(--ac)", textDecoration: "underline" }}>Gestisci tutti i template <ExternalLink size={10} style={{ display: "inline", verticalAlign: "middle" }} /></a></>} />
            {dipOrario?.ciclico_override && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderRadius: 10, background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                border: "1.5px solid #f59e0b",
              }}>
                <RefreshCw size={16} style={{ color: "#92400e", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                  <strong>Orario dinamico da Contratto Ciclico</strong> — periodo {dipOrario.ciclico_override.periodo} attivo
                  ({dipOrario.ciclico_override.ore_sett}h/sett, {dipOrario.ciclico_override.is_part_time ? "Part-Time" : "Full-Time"}).
                  Il template cambierà automaticamente al prossimo switch.
                </div>
              </div>
            )}
            <div className="g2">
              <div><label className="lbl">Template orario</label><select className="fi" value={dipOrario?.template_id ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setDipOrario(v ? { template_id: v, data_inizio_ciclo: dipOrario?.data_inizio_ciclo ?? "" } : null); setOrDirty(true); setOrarioEdit(null); }}><option value="">-- Nessuno --</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
              <div><label className="lbl">Inizio ciclo (Lun. Sett. A)</label><input className="fi" type="date" value={dipOrario?.data_inizio_ciclo ?? ""} disabled={!dipOrario} onChange={(e) => { setDipOrario((p) => p ? { ...p, data_inizio_ciclo: e.target.value } : null); setOrDirty(true); }} /></div>
            </div>
            {orDirty && dipOrario && dipOrario.template_id > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                {!dipOrario.data_inizio_ciclo && (
                  <span style={{ fontSize: 11.5, color: "var(--wa)" }}>⚠ Compila la data di inizio ciclo per salvare</span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!dipOrario.data_inizio_ciclo}
                  onClick={async () => {
                    try {
                      const r = await fetch(`/api/dipendenti/${id}/orario`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(dipOrario),
                      });
                      const data = await r.json().catch(() => ({}));
                      if (!r.ok) throw new Error(data.error || "Errore salvataggio orario");
                      setOrDirty(false);
                      showToast("Orario assegnato", "ok");
                    } catch (e: any) { showToast(e.message, "err"); }
                  }}
                ><Save size={13} /> Salva Assegnazione</Button>
              </div>
            )}

            {/* Preview del template selezionato (read-only) + edit inline */}
            {dipOrario?.template_id && (() => {
              const t = templates.find(x => x.id === dipOrario.template_id);
              if (!t) return null;
              const inEdit = orarioEdit !== null;
              const giorniDaMostrare = inEdit ? orarioEdit!.giorni : t.giorni;
              return (
                <div style={{ padding: "12px 14px", background: "var(--bgs)", borderRadius: 10, border: "1px solid var(--bdr)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--t)" }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: "var(--tm)" }}>{t.num_settimane} settiman{t.num_settimane === 1 ? "a" : "e"} di rotazione — anteprima ore giornaliere</div>
                    </div>
                    {!inEdit ? (
                      <Button variant="secondary" size="sm" onClick={() => setOrarioEdit({ giorni: t.giorni.map((g: any) => ({ ...g })), saving: false })}>
                        <Pencil size={12} /> Modifica orario
                      </Button>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button variant="secondary" size="sm" onClick={() => setOrarioEdit(null)} disabled={orarioEdit?.saving}>Annulla</Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={orarioEdit?.saving}
                          onClick={async () => {
                            if (!orarioEdit) return;
                            setOrarioEdit({ ...orarioEdit, saving: true });
                            try {
                              const payload = {
                                nome: t.nome,
                                num_settimane: t.num_settimane,
                                attivo: t.attivo,
                                note: t.note,
                                giorni: orarioEdit.giorni.map((g: any) => ({
                                  settimana_num: g.settimana_num,
                                  giorno_settimana: g.giorno_settimana,
                                  ore_teoriche: g.ore_teoriche ?? 0,
                                  orario_inizio: g.orario_inizio ?? null,
                                  orario_fine: g.orario_fine ?? null,
                                })),
                              };
                              const r = await fetch(`/api/orari-template/${t.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload),
                              });
                              if (!r.ok) throw new Error("Errore salvataggio template");
                              // Aggiorna lo state templates locale
                              setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, giorni: orarioEdit.giorni } : x));
                              showToast("Template orario salvato", "ok");
                              setOrarioEdit(null);
                            } catch (err: any) { showToast(err.message, "err"); setOrarioEdit(orarioEdit ? { ...orarioEdit, saving: false } : null); }
                          }}
                        >
                          {orarioEdit?.saving ? <Loader2 size={12} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={12} />} Salva template
                        </Button>
                      </div>
                    )}
                  </div>
                  <WeekGridEditor
                    numSettimane={t.num_settimane}
                    giorni={giorniDaMostrare.map((g: any) => ({
                      settimana_num: g.settimana_num,
                      giorno_settimana: g.giorno_settimana,
                      ore_teoriche: g.ore_teoriche,
                      orario_inizio: g.orario_inizio,
                      orario_fine: g.orario_fine,
                    }))}
                    onChange={(updated) => {
                      if (orarioEdit) setOrarioEdit({ ...orarioEdit, giorni: updated as any[] });
                    }}
                    readOnly={!inEdit}
                  />
                  {inEdit && (
                    <div style={{ fontSize: 11, color: "var(--wa)", marginTop: 8 }}>
                      ⚠ Le modifiche al template impatteranno <strong>tutti</strong> i dipendenti che lo utilizzano. Se vuoi un orario diverso solo per questo dipendente, crea un nuovo template e assegnalo.
                    </div>
                  )}
                </div>
              );
            })()}
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

          {/* ── Attestati Formazione (PDF singoli) ──────────────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Sec icon={<GradIcon size={16} />} bg="var(--inl)" color="var(--in)" title="Attestati Formazione" sub="Attestati singoli firmati per dipendente" />
              <Button variant="primary" size="sm" onClick={() => setAttestatoForm({ open: true, titolo: "", data_corso: "", data_scadenza: "", note: "", file: null })}><Plus size={13} /> Nuovo Attestato</Button>
            </div>

            {attestatoForm.open && (
              <div style={{ padding: "14px", borderRadius: 10, border: "2px solid var(--in)", background: "var(--inl)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--in)", marginBottom: 10 }}>Nuovo Attestato</div>
                <div className="g3">
                  <div style={{ gridColumn: "1 / 3" }}>
                    <label className="lbl">Titolo corso <span style={{ color: "var(--er)" }}>*</span></label>
                    <input
                      className="fi"
                      value={attestatoForm.titolo}
                      onChange={(e) => setAttestatoForm(f => ({ ...f, titolo: e.target.value }))}
                      placeholder="Es. Formazione Generale Sicurezza 4h"
                      style={!attestatoForm.titolo && attestatoForm.file ? { borderColor: "var(--er)", boxShadow: "0 0 0 2px var(--erl)" } : undefined}
                    />
                    {!attestatoForm.titolo && attestatoForm.file && (
                      <div style={{ fontSize: 11, color: "var(--er)", marginTop: 4 }}>⚠ Inserisci un titolo per poter salvare</div>
                    )}
                  </div>
                  <div><label className="lbl">Data corso</label><input className="fi" type="date" value={attestatoForm.data_corso} onChange={(e) => setAttestatoForm(f => ({ ...f, data_corso: e.target.value }))} /></div>
                </div>
                <div className="g2" style={{ marginTop: 10 }}>
                  <div><label className="lbl">Data scadenza</label><input className="fi" type="date" value={attestatoForm.data_scadenza} onChange={(e) => setAttestatoForm(f => ({ ...f, data_scadenza: e.target.value }))} /></div>
                  <div>
                    <label className="lbl">File PDF</label>
                    <input
                      className="fi"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setAttestatoForm(prev => ({
                          ...prev,
                          file: f,
                          // Auto-compila titolo dal nome file se ancora vuoto
                          titolo: prev.titolo || (f ? f.name.replace(/\.pdf$/i, "").trim() : prev.titolo),
                        }));
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}><label className="lbl">Note</label><input className="fi" value={attestatoForm.note} onChange={(e) => setAttestatoForm(f => ({ ...f, note: e.target.value }))} placeholder="Note..." /></div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 12 }}>
                  {!attestatoForm.titolo && (
                    <span style={{ fontSize: 11.5, color: "var(--er)" }}>⚠ Inserisci un titolo per poter salvare</span>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setAttestatoForm(f => ({ ...f, open: false }))}>Annulla</Button>
                  <Button variant="primary" size="sm" disabled={!attestatoForm.titolo} onClick={async () => {
                    try {
                      const fd = new FormData();
                      fd.append("titolo", attestatoForm.titolo);
                      if (attestatoForm.data_corso) fd.append("data_corso", attestatoForm.data_corso);
                      if (attestatoForm.data_scadenza) fd.append("data_scadenza", attestatoForm.data_scadenza);
                      if (attestatoForm.note) fd.append("note", attestatoForm.note);
                      if (attestatoForm.file) fd.append("file", attestatoForm.file);
                      const res = await fetch(`/api/dipendenti/${id}/attestati`, { method: "POST", body: fd });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.error || `Errore (HTTP ${res.status})`);
                      showToast("Attestato caricato", "ok");
                      setAttestatoForm({ open: false, titolo: "", data_corso: "", data_scadenza: "", note: "", file: null });
                      fetchData();
                    } catch (err: any) { showToast(err.message || "Errore upload attestato", "err"); }
                  }}><Save size={13} /> Salva</Button>
                </div>
              </div>
            )}

            {attestati.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: "var(--tm)", fontSize: 13 }}>Nessun attestato caricato</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {attestati.map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--bdr)", background: "#fff" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--inl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <GradIcon size={16} style={{ color: "var(--in)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.titolo}</div>
                      <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 2, display: "flex", gap: 12 }}>
                        {a.data_corso && <span>Corso: {new Date(a.data_corso).toLocaleDateString("it-IT")}</span>}
                        {a.data_scadenza && <span>Scade: {new Date(a.data_scadenza).toLocaleDateString("it-IT")}</span>}
                      </div>
                    </div>
                    {a.file_path && <a href={a.file_path} target="_blank" rel="noopener noreferrer" className="icon-btn" title="Apri"><Paperclip size={14} /></a>}
                    <button className="icon-btn" style={{ color: "var(--er)" }} onClick={async () => {
                      if (!confirm("Eliminare?")) return;
                      await fetch(`/api/dipendenti/${id}/attestati?id=${a.id}`, { method: "DELETE" });
                      showToast("Eliminato", "ok"); fetchData();
                    }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
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

          {/* ── SEZIONE 0: COMPORTAMENTO FINE MESE (flag dipendente) ──────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Settings2 size={16} />} bg="var(--pul)" color="var(--pu)" title="Comportamento Fine Mese"
              sub="Flag che modificano la modalità di calcolo a fine mese per questo dipendente." />

            <div className="g2">
              {/* Flag Compensazione Mensile */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 14px",
                borderRadius: 10, border: cfg.flg_compensazione_mensile ? "2px solid #f59e0b" : "1.5px solid var(--bdr)",
                background: cfg.flg_compensazione_mensile ? "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" : "#fff",
              }}>
                <input
                  type="checkbox"
                  checked={cfg.flg_compensazione_mensile}
                  onChange={(e) => set("flg_compensazione_mensile", e.target.checked)}
                  style={{ marginTop: 3, accentColor: "#f59e0b" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: cfg.flg_compensazione_mensile ? "#92400e" : "var(--t)" }}>
                    Compensazione Mensile
                  </div>
                  <div style={{ fontSize: 11.5, color: cfg.flg_compensazione_mensile ? "#92400e" : "var(--tm)", marginTop: 4, lineHeight: 1.55 }}>
                    A fine mese le ore in più <strong>compensano</strong> automaticamente le ore in meno (no ROL/Ferie scalate).
                    Solo dopo la compensazione il <strong>saldo attivo</strong> residuo viene processato dalla pipeline (supplementari → straordinario → BOP).
                  </div>
                </div>
              </label>

              {/* Flag Non Timbrante */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 14px",
                borderRadius: 10, border: cfg.flg_non_timbrante ? "2px solid var(--in)" : "1.5px solid var(--bdr)",
                background: cfg.flg_non_timbrante ? "var(--inl)" : "#fff",
              }}>
                <input
                  type="checkbox"
                  checked={cfg.flg_non_timbrante}
                  onChange={(e) => set("flg_non_timbrante", e.target.checked)}
                  style={{ marginTop: 3, accentColor: "var(--in)" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: cfg.flg_non_timbrante ? "var(--in)" : "var(--t)" }}>
                    Non Timbrante (orario fisso)
                  </div>
                  <div style={{ fontSize: 11.5, color: cfg.flg_non_timbrante ? "var(--in)" : "var(--tm)", marginTop: 4, lineHeight: 1.55 }}>
                    Le presenze vengono <strong>generate automaticamente</strong> dal template orario assegnato.
                    Restano inseribili manualmente i giustificativi di assenza (Ferie, ROL, permessi), che scalano regolarmente i saldi.
                  </div>
                </div>
              </label>
            </div>

            {/* Bottone genera presenze visibile solo se Non Timbrante attivo */}
            {cfg.flg_non_timbrante && (
              <AutoGeneraPresenzePanel apiId={id} showToast={showToast} />
            )}
          </div>

          {/* ── SEZIONE 1: PAUSA PRANZO (semplice) ─────────────────────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<Coffee size={16} />} bg="var(--wal)" color="var(--wa)"
              title="Pausa Pranzo"
              sub="Indica solo la durata della pausa. Il sistema verifica che il totale ore giornaliere sia congruo con il contratto, lasciando flessibilita sulla durata effettiva (15, 30, 60 min)." />
            <div className="g3">
              <div>
                <label className="lbl">Durata pausa (minuti)</label>
                <input className="fi" type="number" min={0} max={120} value={cfg.pausa_minuti}
                  onChange={(e) => set("pausa_minuti", Number(e.target.value))} placeholder="30" />
                <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 4 }}>Es. 15, 30, 60 minuti</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={cfg.pausa_auto}
                    onChange={(e) => set("pausa_auto", e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--ac)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>Controllo congruita ore giornaliere</span>
                </label>
              </div>
              <div />
            </div>
            <div style={{ background: "var(--acl)", border: "1px solid rgba(59,91,219,.15)", borderRadius: "var(--r2)", padding: "10px 14px", fontSize: 12.5, color: "var(--ac)", lineHeight: 1.55 }}>
              <strong>Come funziona:</strong> Il sistema verifica solo che il totale ore lavorate giornaliere sia in linea con le ore contrattuali. La durata della pausa ({cfg.pausa_minuti} min) viene scalata dal totale, ma non c'e un vincolo rigido su quando va effettuata.
            </div>
          </div>

          {/* ── SEZIONE 2: ORE IN ECCESSO ────────────────────────────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<TrendingUp size={16} />} bg="var(--okl)" color="var(--ok)" title="Ore in Eccesso — Dove vanno le ore in piu" sub="Definisci la priorita dei basket. Il sistema riempie dall'alto in basso." />

            {/* SUPPLEMENTARE (solo part-time, calcolato automaticamente prima della pipeline) */}
            {(() => {
              const oreContratto = dip?.ore_settimanali ?? 40;
              const isPT = oreContratto < 40;
              const capSuppl = Math.max(0, 40 - oreContratto);
              return (
                <div style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: isPT ? "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" : "var(--bgs)",
                  border: isPT ? "1.5px solid #f59e0b" : "1px solid var(--bdr)",
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isPT ? "#f59e0b" : "var(--bdr)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: isPT ? "#92400e" : "var(--tm)", textTransform: "uppercase", letterSpacing: ".3px" }}>SUPPLEMENTARE</span>
                      {isPT
                        ? <Badge variant="wa">Step 1 (automatico)</Badge>
                        : <Badge variant="nn">Solo part-time</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: isPT ? "#92400e" : "var(--tm)", marginTop: 4, lineHeight: 1.5 }}>
                      {isPT ? (
                        <>Contratto <strong>{oreContratto}h/sett</strong> → ore eccedenti fino a <strong>{capSuppl}h</strong> (gap a 40h totali) vengono conteggiate come Lavoro Supplementare. Priorità: prima il <strong>sabato</strong>, poi le ore in eccedenza nei giorni feriali. Oltre 40h totali → straordinario (max {oMaxSett ?? 8}h/sett).</>
                      ) : (
                        <>Il dipendente è full-time ({oreContratto}h). Il supplementare si applica solo ai part-time (&lt;40h). Le ore eccedenti vanno direttamente alla pipeline qui sotto.</>
                      )}
                    </div>
                  </div>
                  {isPT && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={oPSuppl ?? true}
                        onChange={(e) => { setOPSuppl(e.target.checked); setRegDirty(true); }}
                        style={{ accentColor: "#f59e0b" }}
                      />
                      Attivo
                    </label>
                  )}
                </div>
              );
            })()}

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
              ]}
            />
          </div>

          {/* ── SEZIONE 3: ORE IN DIFETTO (logica rigida automatica) ────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sec icon={<TrendingDown size={16} />} bg="var(--erl)" color="var(--er)" title="Ore in Difetto — Recupero automatico" sub="La logica è rigida e non configurabile. Il sistema applica automaticamente queste regole." />

            {/* Regole fisse visualizzate */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Step 1: parziale → ROL */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "#ecfdf5", border: "1.5px solid #059669" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>1</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#059669" }}>Assenza parziale → ROL</div>
                  <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>Se nella giornata il dipendente fa meno ore di quelle dovute (ma non è assente tutto il giorno), le ore mancanti vengono scalate dal saldo ROL.</div>
                </div>
                <Badge variant="ok">Automatico</Badge>
              </div>

              {/* Step 2: intera → FERIE */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "#fef3c7", border: "1.5px solid #d97706" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#d97706", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>2</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>Assenza intera giornata → FERIE</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 2 }}>Quando il dipendente non lavora per l'intera giornata lavorativa, la giornata viene scalata dal saldo Ferie.</div>
                </div>
                <Badge variant="wa">Automatico</Badge>
              </div>

              {/* Step 3: BOP (manuale, con tetto) */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "#ede9fe", border: "1.5px solid #8b5cf6" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#8b5cf6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>3</div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#6d28d9" }}>BOP – Salvadanaio personale (manuale)</div>
                    <div style={{ fontSize: 12, color: "#6d28d9", marginTop: 2 }}>L'azienda può decidere di attingere dal BOP. Imposta un tetto massimo di ore prelevabili per mese (0 = disabilitato).</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#6d28d9", fontWeight: 600 }}>Tetto:</span>
                    <input
                      className="fi"
                      type="number"
                      min={0}
                      step={0.5}
                      style={{ width: 70 }}
                      value={(() => { const b = oDef.find(d => d.source === "bop"); return b?.max_ore ?? 0; })()}
                      onChange={(e) => {
                        const cap = Number(e.target.value) || 0;
                        // Aggiorna sempre il deficit pipeline alla forma rigida
                        const rigid: StepDeficit[] = [
                          { source: "rol", per: "parziale", max_ore: null },
                          { source: "ferie", per: "intera", max_ore: null },
                        ];
                        if (cap > 0) rigid.push({ source: "bop", per: "parziale", max_ore: cap });
                        setODef(rigid);
                        setRegDirty(true);
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#6d28d9" }}>h/mese</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--tm)", fontStyle: "italic" }}>
              ⓘ Questa logica è applicata automaticamente dal sistema a fine mese. Non è possibile modificare l'ordine ROL→FERIE.
            </div>
          </div>

          {/* Save */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {(regDirty || dirty) && (
              <Button variant="primary" size="lg" disabled={regSaving || saving} onClick={async () => {
                // Salva sia config (pausa) che regole (eccesso/difetto)
                setSaving(true); setRegSaving(true);
                try {
                  const [cfgRes, regRes] = await Promise.all([
                    fetch(`/api/dipendenti/${id}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cfg, regole_pausa: regolePausa.length > 0 ? regolePausa : null }) }),
                    fetch(`/api/dipendenti/${id}/regole`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ft_eccesso_pipeline: oFt, pt_eccesso_pipeline: oPt, deficit_pipeline: oDef, straordinario_max_sett: oMaxSett, straordinario_max_giorno: oMaxGiorno, straordinario_priorita_sabato: oPriSab, pt_supplementari_attivo: oPSuppl }) }),
                  ]);
                  if (!cfgRes.ok || !regRes.ok) {
                    const errReg = await regRes.json().catch(() => ({}));
                    const errCfg = await cfgRes.json().catch(() => ({}));
                    throw new Error(errReg.error || errCfg.error || `Errore (config:${cfgRes.status} regole:${regRes.status})`);
                  }
                  setDirty(false); setRegDirty(false);
                  showToast("Parametri salvati", "ok");
                  // Ricarica per confermare che la persistenza è andata a buon fine
                  fetchData();
                } catch (err: any) { showToast(err.message || "Errore salvataggio", "err"); }
                finally { setSaving(false); setRegSaving(false); }
              }}>
                {(saving || regSaving) ? <Loader2 size={15} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={15} />}
                Salva Tutti i Parametri
              </Button>
            )}
          </div>

          {/* ── SEZIONE 4: BOP - Salvadanaio (movimenti manuali) ─────────── */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <Sec icon={<PiggyBank size={16} />} bg="var(--pul)" color="var(--pu)" title="BOP - Salvadanaio Personale" sub="Registro manuale dei carichi/scarichi ore" />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: "8px 16px", borderRadius: 10, background: bopSaldo >= 0 ? "var(--okl)" : "var(--erl)", border: `2px solid ${bopSaldo >= 0 ? "var(--ok)" : "var(--er)"}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: bopSaldo >= 0 ? "var(--ok)" : "var(--er)", textTransform: "uppercase", letterSpacing: ".3px" }}>Saldo</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: bopSaldo >= 0 ? "var(--ok)" : "var(--er)" }}>{bopSaldo >= 0 ? "+" : ""}{bopSaldo}h</div>
                </div>
                <Button variant="primary" size="sm" onClick={() => setBopOpen(true)}><Plus size={13} /> Nuovo movimento</Button>
              </div>
            </div>

            {bopOpen && (
              <div style={{ padding: "14px", borderRadius: 10, border: "2px solid var(--pu)", background: "var(--pul)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--pu)", marginBottom: 10 }}>Nuovo movimento BOP</div>
                <div className="g3">
                  <div><label className="lbl">Tipo</label>
                    <select className="fi" value={bopForm.tipo} onChange={(e) => setBopForm(f => ({ ...f, tipo: e.target.value }))}>
                      <option value="carico">Carico (+)</option>
                      <option value="scarico">Scarico (-)</option>
                    </select>
                  </div>
                  <div><label className="lbl">Data</label><input className="fi" type="date" value={bopForm.data_movimento} onChange={(e) => setBopForm(f => ({ ...f, data_movimento: e.target.value }))} /></div>
                  <div><label className="lbl">Ore</label><input className="fi" type="number" min={0} step={0.25} value={bopForm.ore} onChange={(e) => setBopForm(f => ({ ...f, ore: e.target.value }))} placeholder="2.5" /></div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label className="lbl">Motivazione</label>
                  <input className="fi" value={bopForm.motivazione} onChange={(e) => setBopForm(f => ({ ...f, motivazione: e.target.value }))} placeholder="Es. Compensazione orario ridotto 15/04" />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setBopOpen(false)}>Annulla</Button>
                  <Button variant="primary" size="sm" disabled={!bopForm.ore} onClick={async () => {
                    try {
                      const res = await fetch(`/api/dipendenti/${id}/bop-movimenti`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...bopForm, ore: Number(bopForm.ore) }),
                      });
                      if (!res.ok) throw new Error("Errore");
                      showToast("Movimento registrato", "ok");
                      setBopOpen(false);
                      setBopForm({ data_movimento: new Date().toISOString().split("T")[0], tipo: "scarico", ore: "", motivazione: "" });
                      fetchData();
                    } catch (err: any) { showToast(err.message, "err"); }
                  }}><Save size={13} /> Registra</Button>
                </div>
              </div>
            )}

            {/* Lista movimenti */}
            {bopMovimenti.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: "var(--tm)", fontSize: 13 }}>Nessun movimento registrato</div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--tm)" }}>Data</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--tm)" }}>Tipo</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, fontSize: 11, color: "var(--tm)" }}>Ore</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--tm)" }}>Motivazione</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {bopMovimenti.map((m: any) => (
                      <tr key={m.id} style={{ borderBottom: "1px solid var(--bdr)" }}>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--m)" }}>{new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
                        <td style={{ padding: "8px 10px" }}><Badge variant={m.tipo === "carico" ? "ok" : "wa"}>{m.tipo}</Badge></td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: m.tipo === "carico" ? "var(--ok)" : "var(--er)" }}>{m.tipo === "carico" ? "+" : "-"}{m.ore}h</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--tm)" }}>{m.motivazione || "—"}</td>
                        <td>
                          <button className="icon-btn" style={{ color: "var(--er)" }} onClick={async () => {
                            if (!confirm("Eliminare questo movimento?")) return;
                            await fetch(`/api/dipendenti/${id}/bop-movimenti?id=${m.id}`, { method: "DELETE" });
                            showToast("Eliminato", "ok"); fetchData();
                          }}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

/* Pannello che permette di generare le presenze del mese per i non-timbranti */
function AutoGeneraPresenzePanel({ apiId, showToast }: {
  apiId: string;
  showToast: (msg: string, type: "ok" | "err" | "info") => void;
}) {
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [mese, setMese] = useState(new Date().getMonth() + 1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ generate: number; saltati: number; errori: string[]; totale_errori: number } | null>(null);

  const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--inl)", border: "1.5px dashed var(--in)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: "var(--in)" }}>
          <strong>Genera presenze automatiche</strong> — popola le giornate lavorative del mese selezionato dal template orario.
          I giorni con presenze già esistenti (o assenze) vengono saltati.
        </div>
        <select className="fi" style={{ width: 130 }} value={mese} onChange={(e) => setMese(Number(e.target.value))}>
          {MESI.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="fi" style={{ width: 100 }} value={anno} onChange={(e) => setAnno(Number(e.target.value))}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button
          variant="primary"
          size="sm"
          disabled={running}
          onClick={async () => {
            setRunning(true); setResult(null);
            try {
              const res = await fetch(`/api/dipendenti/${apiId}/presenze/auto-genera?anno=${anno}&mese=${mese}`, { method: "POST" });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Errore generazione");
              setResult(data);
              showToast(`Generate ${data.generate} presenze (${data.saltati} saltate)`, data.totale_errori > 0 ? "info" : "ok");
            } catch (err: any) {
              showToast(err.message, "err");
            } finally { setRunning(false); }
          }}
        >
          {running ? <Loader2 size={13} style={{ animation: "sp 1s linear infinite" }} /> : <RefreshCw size={13} />}
          Genera presenze
        </Button>
      </div>
      {result && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#fff", borderRadius: 8, fontSize: 12, color: "var(--t2)" }}>
          <strong style={{ color: "var(--ok)" }}>Generate: {result.generate}</strong> · Saltate: {result.saltati}
          {result.errori.length > 0 && (
            <div style={{ marginTop: 6, color: "var(--er)", fontSize: 11 }}>
              {result.errori.slice(0, 5).map((e, i) => <div key={i}>• {e}</div>)}
              {result.totale_errori > 5 && <div>… e altri {result.totale_errori - 5} errori</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RO({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (<div><label className="lbl">{label}</label><div style={{ padding: "9px 12px", borderRadius: "var(--r2)", background: "var(--bgs)", border: "1px solid var(--bdr)", fontSize: 13, fontWeight: 600, color: "var(--t)", fontFamily: mono ? "var(--m)" : "inherit" }}>{value || "—"}</div></div>);
}

/* Card sintetica "Stato Contratto" mostrata in homepage Anagrafica:
   data inizio/fine + badge attivo/scaduto/indeterminato. Editabile inline. */
function StatoContrattoCard({ dip, saving, onUpdate, onSaved, showToast, apiId }: {
  dip: DipendenteDB | null;
  saving: boolean;
  onUpdate: (patch: Partial<DipendenteDB>) => void;
  onSaved: () => void;
  showToast: (msg: string, type: "ok" | "err" | "info") => void;
  apiId: string;
}) {
  const [localSaving, setLocalSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dInizio, setDInizio] = useState("");
  const [dFine, setDFine] = useState("");

  if (!dip) return null;

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const fine = dip.data_fine ? new Date(dip.data_fine) : null;
  const inizio = dip.data_inizio ? new Date(dip.data_inizio) : null;
  const isIndeterminato = !fine;
  const isScaduto = !!(fine && fine < oggi);
  const giorniRimanenti = fine ? Math.ceil((fine.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24)) : null;

  let badgeColor = "var(--ok)", badgeBg = "var(--okl)", badgeLabel = "Attivo";
  if (isScaduto) { badgeColor = "var(--er)"; badgeBg = "var(--erl)"; badgeLabel = "SCADUTO"; }
  else if (isIndeterminato) { badgeColor = "var(--ac)"; badgeBg = "var(--acl)"; badgeLabel = "Indeterminato"; }
  else if (giorniRimanenti != null && giorniRimanenti <= 30) { badgeColor = "var(--wa)"; badgeBg = "var(--wal)"; badgeLabel = `In scadenza (${giorniRimanenti}gg)`; }

  const fmt = (d: Date | null) => d ? d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const startEdit = () => {
    setDInizio(inizio ? inizio.toISOString().split("T")[0] : "");
    setDFine(fine ? fine.toISOString().split("T")[0] : "");
    setEditing(true);
  };

  const handleSave = async () => {
    setLocalSaving(true);
    try {
      const res = await fetch(`/api/dipendenti/${apiId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_inizio: dInizio || null,
          data_fine: dFine || null,
        }),
      });
      if (!res.ok) throw new Error("Errore");
      onUpdate({
        data_inizio: dInizio ? new Date(dInizio).toISOString() : null as any,
        data_fine: dFine ? new Date(dFine).toISOString() : null as any,
      });
      showToast("Date contratto aggiornate", "ok");
      setEditing(false);
      onSaved();
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setLocalSaving(false); }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: badgeBg, color: badgeColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Briefcase size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--t)" }}>Stato Contratto</div>
            <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 2 }}>
              {dip.des_contratto || "Contratto"} · {dip.ore_settimanali ?? 40}h/sett
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800,
            background: badgeBg, color: badgeColor, border: `1.5px solid ${badgeColor}`,
            textTransform: "uppercase", letterSpacing: ".3px",
          }}>{badgeLabel}</span>
          {!editing && (
            <Button variant="secondary" size="sm" onClick={startEdit}><Pencil size={12} /> Modifica</Button>
          )}
        </div>
      </div>

      {!editing && (
        <div className="g3">
          <RO label="Inizio contratto" value={fmt(inizio)} mono />
          <RO label="Fine contratto" value={isIndeterminato ? "Indeterminato" : fmt(fine)} mono />
          <RO label="Giorni rimanenti" value={isIndeterminato ? "—" : isScaduto ? "Scaduto" : `${giorniRimanenti} gg`} />
        </div>
      )}

      {editing && (
        <>
          <div className="g3">
            <div><label className="lbl">Inizio contratto</label><input className="fi" type="date" value={dInizio} onChange={(e) => setDInizio(e.target.value)} /></div>
            <div><label className="lbl">Fine contratto (vuoto = indeterminato)</label><input className="fi" type="date" value={dFine} onChange={(e) => setDFine(e.target.value)} /></div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={localSaving}>Annulla</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={localSaving}>
                {localSaving ? <Loader2 size={12} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={12} />} Salva
              </Button>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: -4 }}>
            ⓘ Modificando da qui aggiorni solo i campi principali. Per registrare la storia delle modifiche contrattuali usa "Storico Contratti" nel tab "Lavoro &amp; Contratto".
          </div>
        </>
      )}
    </div>
  );
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
