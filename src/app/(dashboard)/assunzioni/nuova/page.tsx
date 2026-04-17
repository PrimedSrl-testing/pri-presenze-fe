"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  UserCheck,
  UserPlus,
  ArrowLeft,
  Save,
  PlayCircle,
  AlertTriangle,
  Info,
  Search,
  Server,
  Shield,
  Clock,
} from "lucide-react";
import type { DipendenteDB, TipoAssunzione } from "@/types";

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

/* ─── Default form state ──────────────────────────────────────────────────── */

interface FormState {
  tipo: TipoAssunzione;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  email: string;
  telefono: string;
  data_assunzione: string;
  data_fine_contratto: string;
  id_contratto: number | null;
  id_reparto: number | null;
  ore_settimanali: number | null;
  tipo_rapporto: "diretto" | "somministrato" | null;
  causale_contratto: string;
  mesi_residui_24: number | null;
  superato_12_mesi: boolean;
  dip_id: number | null;
  note: string;
  // Checklist stagionale
  kronos_riattivato: boolean;
  badge_assegnato: boolean;
  orario_configurato: boolean;
  // Checklist nuovo
  doc_carta_identita: boolean;
  doc_codice_fiscale: boolean;
  doc_c2_storico: boolean;
  visita_medica_richiesta: boolean;
  visita_medica_effettuata: boolean;
  formazione_richiesta: boolean;
  formazione_effettuata: boolean;
  scheda_tecsam_generata: boolean;
  scheda_tecsam_inviata: boolean;
  sync_gestionale: boolean;
  sync_kronos: boolean;
  sync_anagrafica: boolean;
}

const emptyForm = (tipo: TipoAssunzione): FormState => ({
  tipo,
  nome: "",
  cognome: "",
  codice_fiscale: "",
  email: "",
  telefono: "",
  data_assunzione: "",
  data_fine_contratto: "",
  id_contratto: null,
  id_reparto: null,
  ore_settimanali: null,
  tipo_rapporto: null,
  causale_contratto: "",
  mesi_residui_24: null,
  superato_12_mesi: false,
  dip_id: null,
  note: "",
  kronos_riattivato: false,
  badge_assegnato: false,
  orario_configurato: false,
  doc_carta_identita: false,
  doc_codice_fiscale: false,
  doc_c2_storico: false,
  visita_medica_richiesta: false,
  visita_medica_effettuata: false,
  formazione_richiesta: false,
  formazione_effettuata: false,
  scheda_tecsam_generata: false,
  scheda_tecsam_inviata: false,
  sync_gestionale: false,
  sync_kronos: false,
  sync_anagrafica: false,
});

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function NuovaAssunzionePage() {
  const router = useRouter();

  /* ── Wizard step ────────────────────────────────────────────────────────── */
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [form, setForm] = useState<FormState>(emptyForm("stagionale"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Lookups ────────────────────────────────────────────────────────────── */
  const [dipendenti, setDipendenti] = useState<DipendenteDB[]>([]);
  const [contratti, setContratti] = useState<ContrattoTipo[]>([]);
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [dipSearch, setDipSearch] = useState("");

  const fetchLookups = useCallback(async () => {
    try {
      const [dRes, cRes, rRes] = await Promise.all([
        fetch("/api/dipendenti"),
        fetch("/api/contratti"),
        fetch("/api/reparti"),
      ]);
      const [dData, cData, rData] = await Promise.all([dRes.json(), cRes.json(), rRes.json()]);
      setDipendenti(Array.isArray(dData) ? dData : []);
      setContratti(Array.isArray(cData) ? cData : []);
      setReparti(Array.isArray(rData) ? rData : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  /* ── Form helpers ───────────────────────────────────────────────────────── */
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ── Select tipo ────────────────────────────────────────────────────────── */
  const chooseTipo = (tipo: TipoAssunzione) => {
    setForm(emptyForm(tipo));
    setStep("form");
  };

  /* ── Select existing employee (stagionale) ──────────────────────────────── */
  const selectDipendente = (dip: DipendenteDB) => {
    const nameParts = dip.nome.split(" ");
    const cognome = nameParts[0] ?? "";
    const nome = nameParts.slice(1).join(" ") ?? "";

    // Calculate mesi residui: diff from data_inizio to today
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

  /* ── Save ────────────────────────────────────────────────────────────────── */
  const handleSave = async (stato: "bozza" | "in_corso") => {
    if (!form.nome.trim() || !form.cognome.trim()) {
      setError("Nome e cognome sono obbligatori.");
      return;
    }
    if (form.tipo === "stagionale" && form.superato_12_mesi && !form.causale_contratto.trim()) {
      setError("Causale obbligatoria per dipendenti che hanno superato i 12 mesi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        stato,
        codice_fiscale: form.codice_fiscale || null,
        email: form.email || null,
        telefono: form.telefono || null,
        data_assunzione: form.data_assunzione || null,
        data_fine_contratto: form.data_fine_contratto || null,
        ore_settimanali: form.ore_settimanali ?? null,
        causale_contratto: form.causale_contratto || null,
        note: form.note || null,
      };

      const res = await fetch("/api/assunzioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore durante il salvataggio");
      }

      const created = await res.json();
      router.push(`/assunzioni/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Filtered dipendenti for search ─────────────────────────────────────── */
  const filteredDip = dipSearch.trim()
    ? dipendenti.filter((d) =>
        d.nome.toLowerCase().includes(dipSearch.toLowerCase()) ||
        d.matricola.toLowerCase().includes(dipSearch.toLowerCase())
      )
    : dipendenti;

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Header title="Nuova Assunzione" />

      <div className="pg anim-fi">
        {/* ── Back + heading ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <button
            className="hbtn"
            onClick={() => (step === "form" ? setStep("choose") : router.push("/assunzioni"))}
            style={{ marginBottom: 8 }}
          >
            <ArrowLeft size={14} />
            {step === "form" ? "Cambia tipo" : "Torna alla lista"}
          </button>
          <div className="stit">Nuova Assunzione</div>
          <div className="ss">
            {step === "choose"
              ? "Seleziona il tipo di assunzione per procedere"
              : form.tipo === "stagionale"
                ? "Riattivazione personale stagionale"
                : "Inserimento nuovo dipendente"
            }
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
         *  STEP 1: Choose Type
         * ══════════════════════════════════════════════════════════════ */}
        {step === "choose" && (
          <div className="g2" style={{ maxWidth: 700 }}>
            {/* Card A: Stagionale */}
            <button
              className="card"
              style={{
                cursor: "pointer",
                textAlign: "center",
                padding: 32,
                border: "2px solid var(--bdr)",
                transition: "all .15s",
              }}
              onClick={() => chooseTipo("stagionale")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--pu)";
                e.currentTarget.style.background = "var(--pul)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.background = "var(--bg)";
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "var(--pul)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <UserCheck size={28} style={{ color: "var(--pu)" }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--t)", marginBottom: 6 }}>
                Personale Stagionale
              </div>
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>
                Dipendente gia presente nel sistema da riattivare
              </div>
              <Badge variant="pu" className="" >Stagionale</Badge>
            </button>

            {/* Card B: Nuovo */}
            <button
              className="card"
              style={{
                cursor: "pointer",
                textAlign: "center",
                padding: 32,
                border: "2px solid var(--bdr)",
                transition: "all .15s",
              }}
              onClick={() => chooseTipo("nuovo")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--in)";
                e.currentTarget.style.background = "var(--inl)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bdr)";
                e.currentTarget.style.background = "var(--bg)";
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "var(--inl)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <UserPlus size={28} style={{ color: "var(--in)" }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--t)", marginBottom: 6 }}>
                Personale Nuovo
              </div>
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>
                Prima assunzione, mai censito nel sistema
              </div>
              <Badge variant="in">Nuovo</Badge>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
         *  STEP 2: Form
         * ══════════════════════════════════════════════════════════════ */}
        {step === "form" && (
          <div style={{ maxWidth: 820 }}>
            {/* Error */}
            {error && (
              <div className="ab ab-e" style={{ marginBottom: 14 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* ─── FORM STAGIONALE ─────────────────────────────────── */}
            {form.tipo === "stagionale" && (
              <>
                {/* Search existing employee */}
                <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                  <SectionTitle
                    color="var(--pu)"
                    label="Seleziona Dipendente Esistente"
                  />
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
                      maxHeight: 200,
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
                {form.dip_id && form.mesi_residui_24 !== null && (
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
                      value={form.causale_contratto}
                      onChange={(e) => setField("causale_contratto", e.target.value)}
                    />
                  </div>
                )}

                {/* Dati contrattuali */}
                <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                  <SectionTitle color="var(--ac)" label="Dati Contrattuali" />
                  <div className="form-grid">
                    <div>
                      <label className="lbl">Data nuova assunzione</label>
                      <input
                        type="date"
                        className="fi"
                        value={form.data_assunzione}
                        onChange={(e) => setField("data_assunzione", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Data fine contratto</label>
                      <input
                        type="date"
                        className="fi"
                        value={form.data_fine_contratto}
                        onChange={(e) => setField("data_fine_contratto", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Tipo contratto</label>
                      <select
                        className="fi"
                        value={form.id_contratto ?? ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setField("id_contratto", id);
                          if (id) {
                            const c = contratti.find((ct) => ct.ID === id);
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
                            name="tipo_rapporto"
                            checked={form.tipo_rapporto === "diretto"}
                            onChange={() => setField("tipo_rapporto", "diretto")}
                          />
                          Diretto
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="tipo_rapporto"
                            checked={form.tipo_rapporto === "somministrato"}
                            onChange={() => setField("tipo_rapporto", "somministrato")}
                          />
                          Somministrato
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checklist stagionale */}
                <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                  <SectionTitle color="var(--pu)" label="Checklist Riattivazione" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <CheckItem
                      checked={form.kronos_riattivato}
                      onChange={(v) => setField("kronos_riattivato", v)}
                      label="Kronos riattivato"
                    />
                    <CheckItem
                      checked={form.badge_assegnato}
                      onChange={(v) => setField("badge_assegnato", v)}
                      label="Badge assegnato"
                    />
                    <CheckItem
                      checked={form.orario_configurato}
                      onChange={(v) => setField("orario_configurato", v)}
                      label="Orario configurato"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ─── FORM NUOVO ──────────────────────────────────────── */}
            {form.tipo === "nuovo" && (
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
                        value={form.nome}
                        onChange={(e) => setField("nome", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Cognome *</label>
                      <input
                        className="fi"
                        placeholder="Cognome"
                        value={form.cognome}
                        onChange={(e) => setField("cognome", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Codice Fiscale</label>
                      <input
                        className="fi"
                        placeholder="CF"
                        maxLength={16}
                        value={form.codice_fiscale}
                        onChange={(e) => setField("codice_fiscale", e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <label className="lbl">Email</label>
                      <input
                        className="fi"
                        type="email"
                        placeholder="email@esempio.it"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Telefono</label>
                      <input
                        className="fi"
                        placeholder="+39..."
                        value={form.telefono}
                        onChange={(e) => setField("telefono", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Dati contrattuali */}
                <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                  <SectionTitle color="var(--ac)" label="Dati Contrattuali" />
                  <div className="form-grid">
                    <div>
                      <label className="lbl">Data assunzione</label>
                      <input
                        type="date"
                        className="fi"
                        value={form.data_assunzione}
                        onChange={(e) => setField("data_assunzione", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Data fine contratto</label>
                      <input
                        type="date"
                        className="fi"
                        value={form.data_fine_contratto}
                        onChange={(e) => setField("data_fine_contratto", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="lbl">Tipo contratto</label>
                      <select
                        className="fi"
                        value={form.id_contratto ?? ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setField("id_contratto", id);
                          if (id) {
                            const c = contratti.find((ct) => ct.ID === id);
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
                            name="tipo_rapporto_n"
                            checked={form.tipo_rapporto === "diretto"}
                            onChange={() => setField("tipo_rapporto", "diretto")}
                          />
                          Diretto
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="tipo_rapporto_n"
                            checked={form.tipo_rapporto === "somministrato"}
                            onChange={() => setField("tipo_rapporto", "somministrato")}
                          />
                          Somministrato
                        </label>
                      </div>
                    </div>
                    <div className="full">
                      <label className="lbl">Causale contratto</label>
                      <input
                        className="fi"
                        placeholder="Causale (opzionale)"
                        value={form.causale_contratto}
                        onChange={(e) => setField("causale_contratto", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Documenti */}
                <div className="card" style={{ marginBottom: 16, padding: 18 }}>
                  <SectionTitle color="var(--wa)" label="Documenti" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <CheckItem
                      checked={form.doc_carta_identita}
                      onChange={(v) => setField("doc_carta_identita", v)}
                      label="Carta d'Identita"
                    />
                    <CheckItem
                      checked={form.doc_codice_fiscale}
                      onChange={(v) => setField("doc_codice_fiscale", v)}
                      label="Codice Fiscale"
                    />
                    <CheckItem
                      checked={form.doc_c2_storico}
                      onChange={(v) => setField("doc_c2_storico", v)}
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
                          checked={form.visita_medica_richiesta}
                          onChange={(v) => setField("visita_medica_richiesta", v)}
                          label="Visita medica richiesta"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <CheckItem
                          checked={form.visita_medica_effettuata}
                          onChange={(v) => setField("visita_medica_effettuata", v)}
                          label="Visita medica effettuata"
                          disabled={!form.visita_medica_richiesta}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <CheckItem
                          checked={form.formazione_richiesta}
                          onChange={(v) => setField("formazione_richiesta", v)}
                          label="Formazione richiesta"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <CheckItem
                          checked={form.formazione_effettuata}
                          onChange={(v) => setField("formazione_effettuata", v)}
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
                      checked={form.scheda_tecsam_generata}
                      onChange={(v) => setField("scheda_tecsam_generata", v)}
                      label="Scheda sanitaria generata"
                    />
                    <CheckItem
                      checked={form.scheda_tecsam_inviata}
                      onChange={(v) => setField("scheda_tecsam_inviata", v)}
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
                      checked={form.sync_gestionale}
                      onChange={() => {}}
                      label="Sincronizzato con Gestionale"
                      disabled
                      icon={<Server size={14} style={{ color: "var(--tm)" }} />}
                    />
                    <CheckItem
                      checked={form.sync_kronos}
                      onChange={() => {}}
                      label="Sincronizzato con Kronos"
                      disabled
                      icon={<Clock size={14} style={{ color: "var(--tm)" }} />}
                    />
                    <CheckItem
                      checked={form.sync_anagrafica}
                      onChange={() => {}}
                      label="Sincronizzato con Anagrafica"
                      disabled
                      icon={<Shield size={14} style={{ color: "var(--tm)" }} />}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Note ────────────────────────────────────────────────── */}
            <div className="card" style={{ marginBottom: 16, padding: 18 }}>
              <SectionTitle color="var(--t2)" label="Note" />
              <textarea
                className="fi"
                rows={3}
                placeholder="Note aggiuntive..."
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
              />
            </div>

            {/* ── Action buttons ───────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, paddingBottom: 20 }}>
              <Button
                variant="secondary"
                onClick={() => router.push("/assunzioni")}
              >
                Annulla
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSave("bozza")}
                disabled={saving}
              >
                <Save size={14} />
                {saving ? "Salvataggio..." : "Salva come Bozza"}
              </Button>
              <Button
                onClick={() => handleSave("in_corso")}
                disabled={saving}
              >
                <PlayCircle size={14} />
                {saving ? "Salvataggio..." : "Avvia Iter"}
              </Button>
            </div>
          </div>
        )}
      </div>
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
