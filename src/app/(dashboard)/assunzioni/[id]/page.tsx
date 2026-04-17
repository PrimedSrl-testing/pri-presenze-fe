"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Save,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Search,
  Server,
  Shield,
  Clock,
  UserCheck,
  UserPlus,
  Calendar,
  FileText,
} from "lucide-react";
import type { Assunzione, DipendenteDB, StatoAssunzione, TipoAssunzione } from "@/types";

/* ─── Types for lookups ───────────────────────────────────────────────────── */

interface ContrattoTipo {
  ID: number;
  Nome: string;
  OreSett: number;
}

interface Reparto {
  cod_reparto: number;
  des_reparto: string;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const STATO_BADGE: Record<StatoAssunzione, { variant: "nn" | "in" | "ok" | "er"; label: string }> = {
  bozza:     { variant: "nn", label: "Bozza" },
  in_corso:  { variant: "in", label: "In Corso" },
  completata:{ variant: "ok", label: "Completata" },
  annullata: { variant: "er", label: "Annullata" },
};

const TIPO_BADGE: Record<TipoAssunzione, { variant: "pu" | "in"; label: string }> = {
  stagionale: { variant: "pu", label: "Stagionale" },
  nuovo:      { variant: "in", label: "Nuovo" },
};

const STEPS: { stato: StatoAssunzione; label: string; icon: typeof FileText }[] = [
  { stato: "bozza",     label: "Bozza",     icon: FileText },
  { stato: "in_corso",  label: "In Corso",  icon: PlayCircle },
  { stato: "completata",label: "Completata",icon: CheckCircle2 },
];

function fmtDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT");
}

function fmtDateTime(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function checklistProgress(a: Assunzione): { done: number; total: number } {
  if (a.tipo === "stagionale") {
    const items = [a.kronos_riattivato, a.badge_assegnato, a.orario_configurato];
    return { done: items.filter(Boolean).length, total: items.length };
  }
  const items = [
    a.doc_carta_identita, a.doc_codice_fiscale, a.doc_c2_storico,
    a.visita_medica_richiesta, a.visita_medica_effettuata,
    a.formazione_richiesta, a.formazione_effettuata,
    a.scheda_tecsam_generata, a.scheda_tecsam_inviata,
    a.sync_gestionale, a.sync_kronos, a.sync_anagrafica,
  ];
  return { done: items.filter(Boolean).length, total: items.length };
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function AssunzioneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  /* ── State ─────────────────────────────────────────────────────────────── */
  const [data, setData] = useState<Assunzione | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable form fields (populated from data)
  const [form, setForm] = useState<Partial<Assunzione>>({});

  // Lookups
  const [dipendenti, setDipendenti] = useState<DipendenteDB[]>([]);
  const [contratti, setContratti] = useState<ContrattoTipo[]>([]);
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [dipSearch, setDipSearch] = useState("");

  // Modals
  const [confirmAction, setConfirmAction] = useState<{ stato: StatoAssunzione; label: string } | null>(null);

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, dRes, cRes, rRes] = await Promise.all([
        fetch(`/api/assunzioni/${id}`),
        fetch("/api/dipendenti"),
        fetch("/api/contratti"),
        fetch("/api/reparti"),
      ]);
      if (!aRes.ok) throw new Error("Assunzione non trovata");
      const [aData, dData, cData, rData] = await Promise.all([
        aRes.json(),
        dRes.json(),
        cRes.json(),
        rRes.json(),
      ]);
      setData(aData);
      setForm(buildForm(aData));
      setDipendenti(Array.isArray(dData) ? dData : []);
      setContratti(Array.isArray(cData) ? cData : []);
      setReparti(Array.isArray(rData) ? rData : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function buildForm(a: Assunzione): Partial<Assunzione> {
    return {
      nome: a.nome,
      cognome: a.cognome,
      codice_fiscale: a.codice_fiscale,
      email: a.email,
      telefono: a.telefono,
      data_assunzione: a.data_assunzione ? a.data_assunzione.slice(0, 10) : null,
      data_fine_contratto: a.data_fine_contratto ? a.data_fine_contratto.slice(0, 10) : null,
      id_contratto: a.id_contratto,
      id_reparto: a.id_reparto,
      ore_settimanali: a.ore_settimanali,
      tipo_rapporto: a.tipo_rapporto,
      causale_contratto: a.causale_contratto,
      mesi_residui_24: a.mesi_residui_24,
      superato_12_mesi: a.superato_12_mesi,
      dip_id: a.dip_id,
      note: a.note,
      // Checklist stagionale
      kronos_riattivato: a.kronos_riattivato,
      badge_assegnato: a.badge_assegnato,
      orario_configurato: a.orario_configurato,
      // Checklist nuovo
      doc_carta_identita: a.doc_carta_identita,
      doc_codice_fiscale: a.doc_codice_fiscale,
      doc_c2_storico: a.doc_c2_storico,
      visita_medica_richiesta: a.visita_medica_richiesta,
      visita_medica_effettuata: a.visita_medica_effettuata,
      formazione_richiesta: a.formazione_richiesta,
      formazione_effettuata: a.formazione_effettuata,
      scheda_tecsam_generata: a.scheda_tecsam_generata,
      scheda_tecsam_inviata: a.scheda_tecsam_inviata,
      sync_gestionale: a.sync_gestionale,
      sync_kronos: a.sync_kronos,
      sync_anagrafica: a.sync_anagrafica,
    };
  }

  /* ── Form helpers ───────────────────────────────────────────────────────── */
  const setField = <K extends keyof Assunzione>(key: K, value: Assunzione[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ── Save form ──────────────────────────────────────────────────────────── */
  const handleSave = async (overrideStato?: StatoAssunzione) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body = { ...form };
      if (overrideStato) body.stato = overrideStato;

      // Normalize empty strings to null
      if (!body.codice_fiscale) body.codice_fiscale = null;
      if (!body.email) body.email = null;
      if (!body.telefono) body.telefono = null;
      if (!body.data_assunzione) body.data_assunzione = null;
      if (!body.data_fine_contratto) body.data_fine_contratto = null;
      if (!body.causale_contratto) body.causale_contratto = null;
      if (!body.note) body.note = null;

      const res = await fetch(`/api/assunzioni/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Errore durante il salvataggio");
      }

      const updated = await res.json();
      setData(updated);
      setForm(buildForm(updated));
      setSuccess("Salvato con successo");
      setConfirmAction(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Checkbox immediate save ────────────────────────────────────────────── */
  const toggleCheck = async (key: keyof Assunzione, value: boolean) => {
    setField(key, value as any);
    // Also do an immediate API call
    try {
      const res = await fetch(`/api/assunzioni/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
      }
    } catch {
      // Revert on error
      setField(key, !value as any);
    }
  };

  /* ── Select employee (stagionale) ───────────────────────────────────────── */
  const selectDipendente = (dip: DipendenteDB) => {
    const nameParts = dip.nome.split(" ");
    const cognome = nameParts[0] ?? "";
    const nome = nameParts.slice(1).join(" ") ?? "";

    let mesiResidui = 0;
    let superato12 = false;
    if (dip.data_inizio) {
      const inizio = new Date(dip.data_inizio);
      const now = new Date();
      const totalMonths =
        (now.getFullYear() - inizio.getFullYear()) * 12 +
        (now.getMonth() - inizio.getMonth());
      mesiResidui = Math.max(0, 24 - totalMonths);
      superato12 = totalMonths > 12;
    }

    setForm((prev) => ({
      ...prev,
      dip_id: dip.id,
      nome,
      cognome,
      id_contratto: dip.id_contratto,
      id_reparto: dip.id_reparto,
      ore_settimanali: dip.ore_settimanali,
      mesi_residui_24: mesiResidui,
      superato_12_mesi: superato12,
    }));
  };

  const filteredDip = dipSearch.trim()
    ? dipendenti.filter((d) =>
        d.nome.toLowerCase().includes(dipSearch.toLowerCase()) ||
        d.matricola.toLowerCase().includes(dipSearch.toLowerCase())
      )
    : dipendenti;

  /* ── Status transitions ─────────────────────────────────────────────────── */
  const canTransitionTo = (target: StatoAssunzione): boolean => {
    if (!data) return false;
    if (target === "annullata") return data.stato !== "annullata";
    if (data.stato === "bozza" && target === "in_corso") return true;
    if (data.stato === "in_corso" && target === "completata") return true;
    return false;
  };

  /* ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <>
        <Header title="Dettaglio Assunzione" />
        <div className="pg anim-fi" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: 28,
                height: 28,
                border: "3px solid var(--bdr)",
                borderTopColor: "var(--ac)",
                borderRadius: "50%",
                animation: "sp .6s linear infinite",
              }}
            />
            <p style={{ marginTop: 10, color: "var(--tm)", fontSize: 13 }}>Caricamento...</p>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header title="Errore" />
        <div className="pg anim-fi">
          <div className="ab ab-e">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error || "Assunzione non trovata"}</span>
          </div>
          <Button variant="secondary" style={{ marginTop: 12 }} onClick={() => router.push("/assunzioni")}>
            <ArrowLeft size={14} /> Torna alla lista
          </Button>
        </div>
      </>
    );
  }

  const tipoCfg = TIPO_BADGE[data.tipo];
  const statoCfg = STATO_BADGE[data.stato];
  const { done, total } = checklistProgress(data);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <Header title={`Assunzione #${data.id}`} />

      <div className="pg anim-fi">
        {/* ── Back + heading ──────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <button className="hbtn" onClick={() => router.push("/assunzioni")} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Torna alla lista
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: data.tipo === "stagionale" ? "var(--pul)" : "var(--inl)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {data.tipo === "stagionale" ? (
                <UserCheck size={22} style={{ color: "var(--pu)" }} />
              ) : (
                <UserPlus size={22} style={{ color: "var(--in)" }} />
              )}
            </div>
            <div>
              <div className="stit">{data.cognome} {data.nome}</div>
              <div className="ss">Assunzione #{data.id}</div>
            </div>
            <Badge variant={tipoCfg.variant}>{tipoCfg.label}</Badge>
            <Badge variant={statoCfg.variant}>{statoCfg.label}</Badge>
          </div>
        </div>

        <div style={{ maxWidth: 860 }}>
          {/* ── Progress stepper ──────────────────────────────────── */}
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {STEPS.map((s, idx) => {
                const stepIdx = STEPS.findIndex((st) => st.stato === data.stato);
                const isAnnullata = data.stato === "annullata";
                const isActive = !isAnnullata && idx <= stepIdx;
                const isCurrent = !isAnnullata && s.stato === data.stato;
                const Icon = s.icon;

                return (
                  <div key={s.stato} style={{ display: "flex", alignItems: "center", flex: idx < STEPS.length - 1 ? 1 : "none" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 14px",
                        borderRadius: 99,
                        background: isCurrent ? "var(--acl)" : isActive ? "var(--okl)" : "var(--bgm)",
                        transition: "all .2s",
                      }}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isCurrent ? "var(--ac)" : isActive ? "var(--ok)" : "var(--tm)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isCurrent ? 700 : 600,
                          color: isCurrent ? "var(--ac)" : isActive ? "var(--ok)" : "var(--tm)",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          background: isActive && idx < stepIdx ? "var(--ok)" : "var(--bdr)",
                          margin: "0 8px",
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {data.stato === "annullata" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    borderRadius: 99,
                    background: "var(--erl)",
                    marginLeft: 12,
                  }}
                >
                  <XCircle size={16} style={{ color: "var(--er)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--er)" }}>
                    Annullata
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--tm)" }}>Checklist:</span>
              <div className="pt" style={{ flex: 1 }}>
                <div
                  className="pf"
                  style={{
                    width: `${pct}%`,
                    background: pct === 100 ? "var(--ok)" : pct >= 50 ? "var(--ac)" : "var(--wa)",
                  }}
                />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--t2)", fontFamily: "var(--m)" }}>
                {done}/{total} ({pct}%)
              </span>
            </div>

            {/* Metadata */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 11.5, color: "var(--tm)" }}>
              <span><Calendar size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> Creato: {fmtDateTime(data.data_ins)}</span>
              {data.data_mod && (
                <span><Calendar size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> Modificato: {fmtDateTime(data.data_mod)}</span>
              )}
              {data.creato_da && <span>Creato da: {data.creato_da}</span>}
            </div>
          </div>

          {/* ── Messages ──────────────────────────────────────────── */}
          {error && (
            <div className="ab ab-e" style={{ marginBottom: 14 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="ab ab-ok" style={{ marginBottom: 14 }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{success}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
           *  STAGIONALE form
           * ══════════════════════════════════════════════════════════ */}
          {data.tipo === "stagionale" && (
            <>
              {/* Select employee */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--pu)" label="Dipendente Esistente" />
                <div className="sbr" style={{ marginBottom: 10 }}>
                  <Search size={14} style={{ color: "var(--tm)" }} />
                  <input
                    placeholder="Cerca per nome o matricola..."
                    value={dipSearch}
                    onChange={(e) => setDipSearch(e.target.value)}
                  />
                </div>
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    border: "1px solid var(--bdr)",
                    borderRadius: "var(--r2)",
                  }}
                >
                  {filteredDip.length === 0 ? (
                    <div style={{ padding: 14, textAlign: "center", color: "var(--tm)", fontSize: 13 }}>
                      Nessun dipendente trovato
                    </div>
                  ) : (
                    filteredDip.slice(0, 50).map((d) => (
                      <button
                        key={d.id}
                        className="er_"
                        style={{
                          width: "100%",
                          border: "none",
                          background: form.dip_id === d.id ? "var(--pul)" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "var(--f)",
                        }}
                        onClick={() => selectDipendente(d)}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--t)" }}>
                            {d.nome}
                          </span>
                          <span style={{ fontSize: 11.5, color: "var(--tm)", marginLeft: 8 }}>
                            Mat. {d.matricola}
                          </span>
                        </div>
                        <span style={{ fontSize: 11.5, color: "var(--t2)", marginLeft: "auto" }}>
                          {d.des_reparto}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {form.dip_id && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ok)", fontWeight: 600 }}>
                    Dipendente selezionato: {form.cognome} {form.nome} (ID: {form.dip_id})
                  </div>
                )}
              </div>

              {/* Mesi residui alert */}
              {form.mesi_residui_24 !== null && form.mesi_residui_24 !== undefined && (
                <div
                  className={`ab ${form.superato_12_mesi ? "ab-w" : "ab-i"}`}
                  style={{ marginBottom: 14 }}
                >
                  {form.superato_12_mesi ? (
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <div>
                    <span>
                      Mesi residui su 24: <strong>{form.mesi_residui_24}</strong>
                    </span>
                    {form.superato_12_mesi && (
                      <div style={{ marginTop: 4, fontWeight: 700 }}>
                        Superata soglia 12 mesi - inserire causale obbligatoria
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Causale */}
              {form.superato_12_mesi && (
                <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                  <label className="lbl">Causale contratto *</label>
                  <input
                    className="fi"
                    placeholder="Inserire la causale obbligatoria..."
                    value={form.causale_contratto ?? ""}
                    onChange={(e) => setField("causale_contratto", e.target.value)}
                  />
                </div>
              )}

              {/* Dati contrattuali */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--ac)" label="Dati Contrattuali" />
                <ContractFields
                  form={form}
                  setField={setField}
                  contratti={contratti}
                  reparti={reparti}
                />
              </div>

              {/* Checklist stagionale */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--pu)" label="Checklist Riattivazione" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <CheckItem
                    checked={!!form.kronos_riattivato}
                    onChange={(v) => toggleCheck("kronos_riattivato", v)}
                    label="Kronos riattivato"
                  />
                  <CheckItem
                    checked={!!form.badge_assegnato}
                    onChange={(v) => toggleCheck("badge_assegnato", v)}
                    label="Badge assegnato"
                  />
                  <CheckItem
                    checked={!!form.orario_configurato}
                    onChange={(v) => toggleCheck("orario_configurato", v)}
                    label="Orario configurato"
                  />
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════
           *  NUOVO form
           * ══════════════════════════════════════════════════════════ */}
          {data.tipo === "nuovo" && (
            <>
              {/* Anagrafica */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--in)" label="Anagrafica" />
                <div className="form-grid">
                  <div>
                    <label className="lbl">Nome *</label>
                    <input
                      className="fi"
                      placeholder="Nome"
                      value={form.nome ?? ""}
                      onChange={(e) => setField("nome", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="lbl">Cognome *</label>
                    <input
                      className="fi"
                      placeholder="Cognome"
                      value={form.cognome ?? ""}
                      onChange={(e) => setField("cognome", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="lbl">Codice Fiscale</label>
                    <input
                      className="fi"
                      placeholder="CF"
                      maxLength={16}
                      value={form.codice_fiscale ?? ""}
                      onChange={(e) => setField("codice_fiscale", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="lbl">Email</label>
                    <input
                      className="fi"
                      type="email"
                      placeholder="email@esempio.it"
                      value={form.email ?? ""}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="lbl">Telefono</label>
                    <input
                      className="fi"
                      placeholder="+39..."
                      value={form.telefono ?? ""}
                      onChange={(e) => setField("telefono", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Dati contrattuali */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--ac)" label="Dati Contrattuali" />
                <ContractFields
                  form={form}
                  setField={setField}
                  contratti={contratti}
                  reparti={reparti}
                />
                <div style={{ marginTop: 14 }}>
                  <label className="lbl">Causale contratto</label>
                  <input
                    className="fi"
                    placeholder="Causale (opzionale)"
                    value={form.causale_contratto ?? ""}
                    onChange={(e) => setField("causale_contratto", e.target.value)}
                  />
                </div>
              </div>

              {/* Documenti */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--wa)" label="Documenti" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <CheckItem
                    checked={!!form.doc_carta_identita}
                    onChange={(v) => toggleCheck("doc_carta_identita", v)}
                    label="Carta d'Identita"
                  />
                  <CheckItem
                    checked={!!form.doc_codice_fiscale}
                    onChange={(v) => toggleCheck("doc_codice_fiscale", v)}
                    label="Codice Fiscale"
                  />
                  <CheckItem
                    checked={!!form.doc_c2_storico}
                    onChange={(v) => toggleCheck("doc_c2_storico", v)}
                    label="C2 Storico"
                  />
                </div>
              </div>

              {/* Visite e Formazione */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--ok)" label="Visite e Formazione" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <CheckItem
                        checked={!!form.visita_medica_richiesta}
                        onChange={(v) => toggleCheck("visita_medica_richiesta", v)}
                        label="Visita medica richiesta"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <CheckItem
                        checked={!!form.visita_medica_effettuata}
                        onChange={(v) => toggleCheck("visita_medica_effettuata", v)}
                        label="Visita medica effettuata"
                        disabled={!form.visita_medica_richiesta}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <CheckItem
                        checked={!!form.formazione_richiesta}
                        onChange={(v) => toggleCheck("formazione_richiesta", v)}
                        label="Formazione richiesta"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <CheckItem
                        checked={!!form.formazione_effettuata}
                        onChange={(v) => toggleCheck("formazione_effettuata", v)}
                        label="Formazione effettuata"
                        disabled={!form.formazione_richiesta}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tecsam */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--pu)" label="Integrazione Tecsam" />
                <div className="ab ab-i" style={{ marginBottom: 12 }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Integrazione Tecsam - funzionalita futura</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <CheckItem
                    checked={!!form.scheda_tecsam_generata}
                    onChange={(v) => toggleCheck("scheda_tecsam_generata", v)}
                    label="Scheda sanitaria generata"
                  />
                  <CheckItem
                    checked={!!form.scheda_tecsam_inviata}
                    onChange={(v) => toggleCheck("scheda_tecsam_inviata", v)}
                    label="Scheda sanitaria inviata"
                    disabled={!form.scheda_tecsam_generata}
                  />
                </div>
              </div>

              {/* Sincronizzazione */}
              <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                <SectionTitle color="var(--tm)" label="Sincronizzazione" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.6 }}>
                  <CheckItem
                    checked={!!form.sync_gestionale}
                    onChange={() => {}}
                    label="Sincronizzato con Gestionale"
                    disabled
                    icon={<Server size={14} style={{ color: "var(--tm)" }} />}
                  />
                  <CheckItem
                    checked={!!form.sync_kronos}
                    onChange={() => {}}
                    label="Sincronizzato con Kronos"
                    disabled
                    icon={<Clock size={14} style={{ color: "var(--tm)" }} />}
                  />
                  <CheckItem
                    checked={!!form.sync_anagrafica}
                    onChange={() => {}}
                    label="Sincronizzato con Anagrafica"
                    disabled
                    icon={<Shield size={14} style={{ color: "var(--tm)" }} />}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Note ──────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 16, padding: 18 }}>
            <SectionTitle color="var(--t2)" label="Note" />
            <textarea
              className="fi"
              rows={3}
              placeholder="Note aggiuntive..."
              value={form.note ?? ""}
              onChange={(e) => setField("note", e.target.value)}
            />
          </div>

          {/* ── Action buttons ─────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
              flexWrap: "wrap",
              paddingTop: 4,
              paddingBottom: 20,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {canTransitionTo("annullata") && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setConfirmAction({ stato: "annullata", label: "Annulla questa assunzione" })
                  }
                >
                  <XCircle size={14} /> Annulla Assunzione
                </Button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" onClick={() => handleSave()} disabled={saving}>
                <Save size={14} />
                {saving ? "Salvataggio..." : "Salva Modifiche"}
              </Button>

              {canTransitionTo("in_corso") && (
                <Button
                  onClick={() => setConfirmAction({ stato: "in_corso", label: "Avvia l'iter" })}
                >
                  <PlayCircle size={14} /> Avvia Iter
                </Button>
              )}

              {canTransitionTo("completata") && (
                <Button
                  onClick={() => setConfirmAction({ stato: "completata", label: "Completa l'assunzione" })}
                  style={{ background: "var(--ok)" }}
                >
                  <CheckCircle2 size={14} /> Completa
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status transition confirm ─────────────────────────────────────── */}
      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title="Conferma Transizione"
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Annulla
            </Button>
            <Button
              variant={confirmAction?.stato === "annullata" ? "danger" : "primary"}
              onClick={() => confirmAction && handleSave(confirmAction.stato)}
              disabled={saving}
            >
              {saving ? "Salvataggio..." : "Conferma"}
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: 13, color: "var(--t)" }}>
          {confirmAction?.label}? Questa operazione cambiera lo stato dell&apos;assunzione
          a <strong>{confirmAction?.stato === "annullata" ? "Annullata" : confirmAction?.stato === "in_corso" ? "In Corso" : "Completata"}</strong>.
        </p>
      </Modal>
    </>
  );
}

/* ─── Reusable sub-components ─────────────────────────────────────────────── */

function SectionTitle({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 12,
        color,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </div>
  );
}

function CheckItem({
  checked,
  onChange,
  label,
  disabled,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={`ci ${checked ? "ok" : ""}`}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--ok)", width: 16, height: 16 }}
      />
      {icon}
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t)" }}>{label}</span>
    </label>
  );
}

interface ContractFieldsProps {
  form: Partial<Assunzione>;
  setField: <K extends keyof Assunzione>(key: K, value: Assunzione[K]) => void;
  contratti: { ID: number; Nome: string; OreSett: number }[];
  reparti: { cod_reparto: number; des_reparto: string }[];
}

function ContractFields({ form, setField, contratti, reparti }: ContractFieldsProps) {
  return (
    <div className="form-grid">
      <div>
        <label className="lbl">Data assunzione</label>
        <input
          type="date"
          className="fi"
          value={form.data_assunzione ?? ""}
          onChange={(e) => setField("data_assunzione", e.target.value)}
        />
      </div>
      <div>
        <label className="lbl">Data fine contratto</label>
        <input
          type="date"
          className="fi"
          value={form.data_fine_contratto ?? ""}
          onChange={(e) => setField("data_fine_contratto", e.target.value)}
        />
      </div>
      <div>
        <label className="lbl">Tipo contratto</label>
        <select
          className="fi"
          value={form.id_contratto ?? ""}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            setField("id_contratto", val);
            if (val) {
              const c = contratti.find((ct) => ct.ID === val);
              if (c) setField("ore_settimanali", c.OreSett);
            }
          }}
        >
          <option value="">-- Seleziona --</option>
          {contratti.map((c) => (
            <option key={c.ID} value={c.ID}>
              {c.Nome} ({c.OreSett}h/sett)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="lbl">Ore settimanali</label>
        <input
          type="number"
          className="fi"
          min={0}
          max={48}
          step={0.5}
          value={form.ore_settimanali ?? ""}
          onChange={(e) =>
            setField("ore_settimanali", e.target.value ? Number(e.target.value) : null)
          }
        />
      </div>
      <div>
        <label className="lbl">Reparto</label>
        <select
          className="fi"
          value={form.id_reparto ?? ""}
          onChange={(e) =>
            setField("id_reparto", e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">-- Seleziona --</option>
          {reparti.map((r) => (
            <option key={r.cod_reparto} value={r.cod_reparto}>
              {r.des_reparto}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="lbl">Tipo rapporto</label>
        <div style={{ display: "flex", gap: 14, paddingTop: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input
              type="radio"
              name="tipo_rapporto_detail"
              checked={form.tipo_rapporto === "diretto"}
              onChange={() => setField("tipo_rapporto", "diretto")}
            />
            Diretto
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input
              type="radio"
              name="tipo_rapporto_detail"
              checked={form.tipo_rapporto === "somministrato"}
              onChange={() => setField("tipo_rapporto", "somministrato")}
            />
            Somministrato
          </label>
        </div>
      </div>
    </div>
  );
}
