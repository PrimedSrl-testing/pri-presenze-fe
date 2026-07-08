"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PipelineBuilder,
  type PipelineItem,
} from "@/components/configurazione/PipelineBuilder";
import { useToastStore } from "@/lib/store";
import type { RegoleGlobali, StepEccesso, StepDeficit } from "@/types";
import {
  Save,
  Loader2,
  ArrowRight,
  Coffee,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Info,
  Plus,
} from "lucide-react";

/* ── Options per i PipelineBuilder ────────────────────────────────────────── */
const ECCESSO_OPTIONS = [
  { key: "BOA", value: "boa" },
  { key: "Straordinario", value: "straordinario" },
  { key: "BOP", value: "bop" },
];

const DEFICIT_OPTIONS = [
  { key: "Ferie", value: "ferie" },
  { key: "ROL", value: "rol" },
  { key: "BOA", value: "boa" },
  { key: "BOP", value: "bop" },
];

/* ── Defaults per nuova regola ────────────────────────────────────────────── */
const DEFAULT_REGOLA: Omit<RegoleGlobali, "id"> = {
  nome: "Default",
  ft_eccesso_pipeline: [
    { dest: "straordinario", max_ore: 8 },
    { dest: "bop", max_ore: null },
  ],
  pt_eccesso_pipeline: [
    { dest: "straordinario", max_ore: 8 },
    { dest: "bop", max_ore: null },
  ],
  pt_supplementari_attivo: true,
  straordinario_max_sett: 8,
  straordinario_max_giorno: 2,
  straordinario_priorita_sabato: true,
  deficit_pipeline: [
    { source: "rol", per: "parziale" },
    { source: "ferie", per: "intera" },
  ],
  pausa_minuti_default: 30,
  pausa_soglia_ore_default: 8,
  pausa_auto_default: true,
  attivo: true,
};

/* ── Component ────────────────────────────────────────────────────────────── */
export default function RegoleCalcoloPage() {
  const { showToast } = useToastStore();
  const [regola, setRegola] = useState<RegoleGlobali | null>(null);
  const [form, setForm] = useState<Omit<RegoleGlobali, "id">>(DEFAULT_REGOLA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/regole-globali");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const data: RegoleGlobali[] = await res.json();
      const attiva = data.find((r) => r.attivo) ?? data[0];
      if (attiva) {
        setRegola(attiva);
        setForm({
          nome: attiva.nome,
          ft_eccesso_pipeline: attiva.ft_eccesso_pipeline,
          pt_eccesso_pipeline: attiva.pt_eccesso_pipeline,
          pt_supplementari_attivo: attiva.pt_supplementari_attivo,
          straordinario_max_sett: attiva.straordinario_max_sett,
          straordinario_max_giorno: attiva.straordinario_max_giorno,
          straordinario_priorita_sabato: attiva.straordinario_priorita_sabato,
          deficit_pipeline: attiva.deficit_pipeline,
          pausa_minuti_default: attiva.pausa_minuti_default,
          pausa_soglia_ore_default: attiva.pausa_soglia_ore_default,
          pausa_auto_default: attiva.pausa_auto_default,
          attivo: attiva.attivo,
        });
      }
    } catch (err: any) {
      showToast(err.message || "Errore nel caricamento", "err");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const set = <K extends keyof typeof form>(
    key: K,
    val: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  /* ── Save ────────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const url = regola
        ? `/api/regole-globali/${regola.id}`
        : "/api/regole-globali";
      const method = regola ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore nel salvataggio");
      }
      const saved: RegoleGlobali = await res.json();
      setRegola(saved);
      setDirty(false);
      showToast("Regole salvate con successo", "ok");
    } catch (err: any) {
      showToast(err.message || "Errore nel salvataggio", "err");
    } finally {
      setSaving(false);
    }
  };

  /* ── Pipeline adapters (PipelineItem <-> StepEccesso/StepDeficit) ───────── */
  const eccessoToPipeline = (steps: StepEccesso[]): PipelineItem[] =>
    steps.map((s) => ({ dest: s.dest, max_ore: s.max_ore }));

  const pipelineToEccesso = (items: PipelineItem[]): StepEccesso[] =>
    items.map((i) => ({
      dest: i.dest as StepEccesso["dest"],
      max_ore: i.max_ore,
    }));

  const deficitToPipeline = (steps: StepDeficit[]): PipelineItem[] =>
    steps.map((s) => ({ dest: s.source, max_ore: null, per: s.per }));

  const pipelineToDeficit = (items: PipelineItem[]): StepDeficit[] =>
    items.map((i) => ({
      source: i.dest as StepDeficit["source"],
      per: (i.per ?? "parziale") as StepDeficit["per"],
    }));

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <Header title="Regole Calcolo Ore" />
        <div
          className="pg"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}
        >
          <Loader2
            size={28}
            style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }}
          />
        </div>
      </>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <Header title="Regole Calcolo Ore" />
      <div
        className="pg anim-fi"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Header info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: "var(--t)",
                letterSpacing: "-.3px",
              }}
            >
              Configurazione Regole Globali
            </h2>
            <p style={{ fontSize: 13, color: "var(--tm)", marginTop: 3 }}>
              Queste regole si applicano a tutti i dipendenti di default.
              Override individuali si configurano nella scheda del singolo
              dipendente.
            </p>
          </div>
          {regola && <Badge variant="ok">ID: {regola.id}</Badge>}
          {!regola && <Badge variant="wa">Nessuna regola salvata</Badge>}
        </div>

        {/* ── 1. Pipeline Eccesso Full-Time ─────────────────────────────────── */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionHeader
            icon={<TrendingUp size={16} style={{ color: "var(--ok)" }} />}
            bg="var(--okl)"
            title="Pipeline Eccesso - Full Time"
            subtitle="Come gestire le ore in eccedenza per dipendenti full-time (>=40h/settimana)"
          />
          <PipelineBuilder
            items={eccessoToPipeline(form.ft_eccesso_pipeline)}
            onChange={(items) =>
              set("ft_eccesso_pipeline", pipelineToEccesso(items))
            }
            options={ECCESSO_OPTIONS}
            mode="eccesso"
          />
        </div>

        {/* ── 2. Pipeline Eccesso Part-Time ─────────────────────────────────── */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionHeader
            icon={<TrendingUp size={16} style={{ color: "var(--in)" }} />}
            bg="var(--inl)"
            title="Pipeline Eccesso - Part Time"
            subtitle="Come gestire le ore in eccedenza per dipendenti part-time (<40h/settimana). Il supplementare (ore tra contratto e 40h) viene calcolato automaticamente prima della pipeline."
          />

          {/* Toggle supplementari */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={form.pt_supplementari_attivo}
              onChange={(e) =>
                set("pt_supplementari_attivo", e.target.checked)
              }
              style={{ width: 16, height: 16, accentColor: "var(--ac)" }}
            />
            <span
              style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}
            >
              Calcolo supplementare attivo (ore tra contratto e 40h)
            </span>
          </label>

          <PipelineBuilder
            items={eccessoToPipeline(form.pt_eccesso_pipeline)}
            onChange={(items) =>
              set("pt_eccesso_pipeline", pipelineToEccesso(items))
            }
            options={ECCESSO_OPTIONS}
            mode="eccesso"
          />
        </div>

        {/* ── 3. Cap Legali Straordinario ────────────────────────────────────── */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionHeader
            icon={
              <ShieldCheck size={16} style={{ color: "var(--wa)" }} />
            }
            bg="var(--wal)"
            title="Cap Legali Straordinario"
            subtitle="Limiti massimi di straordinario pagabile applicati quando la pipeline contiene lo step 'Straordinario'"
          />

          <div className="g3">
            <div>
              <label className="lbl">Max ore/settimana</label>
              <input
                className="fi"
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={form.straordinario_max_sett}
                onChange={(e) =>
                  set("straordinario_max_sett", Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="lbl">Max ore/giorno</label>
              <input
                className="fi"
                type="number"
                min={0}
                max={8}
                step={0.5}
                value={form.straordinario_max_giorno}
                onChange={(e) =>
                  set("straordinario_max_giorno", Number(e.target.value))
                }
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.straordinario_priorita_sabato}
                  onChange={(e) =>
                    set("straordinario_priorita_sabato", e.target.checked)
                  }
                  style={{ width: 16, height: 16, accentColor: "var(--ac)" }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--t2)",
                  }}
                >
                  Priorita dal sabato
                </span>
              </label>
            </div>
          </div>

          <div
            style={{
              background: "var(--acl)",
              border: "1px solid rgba(59,91,219,.15)",
              borderRadius: "var(--r2)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Info
              size={15}
              style={{ color: "var(--ac)", flexShrink: 0, marginTop: 1 }}
            />
            <span
              style={{ fontSize: 12.5, color: "var(--ac)", lineHeight: 1.55 }}
            >
              <strong>Priorita sabato:</strong> Il sistema calcola lo
              straordinario partendo dalle ore del sabato, poi aggiunge gli
              altri giorni. Max {form.straordinario_max_giorno}h/giorno e{" "}
              {form.straordinario_max_sett}h/settimana.
            </span>
          </div>
        </div>

        {/* ── 4. Pipeline Deficit ─────────────────────────────────────────────── */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionHeader
            icon={
              <TrendingDown size={16} style={{ color: "var(--er)" }} />
            }
            bg="var(--erl)"
            title="Pipeline Deficit - Ore Mancanti"
            subtitle="Da quali fonti attingere quando il dipendente lavora meno delle ore contrattuali. Ordine = priorita."
          />
          <PipelineBuilder
            items={deficitToPipeline(form.deficit_pipeline)}
            onChange={(items) =>
              set("deficit_pipeline", pipelineToDeficit(items))
            }
            options={DEFICIT_OPTIONS}
            mode="deficit"
          />
        </div>

        {/* ── 5. Default Pausa Pranzo ─────────────────────────────────────────── */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionHeader
            icon={<Coffee size={16} style={{ color: "var(--wa)" }} />}
            bg="var(--wal)"
            title="Default Pausa Pranzo"
            subtitle="Valori di default per la pausa pranzo. Ogni dipendente puo avere un override nella propria configurazione."
          />

          <div className="g3">
            <div>
              <label className="lbl">Minuti pausa</label>
              <input
                className="fi"
                type="number"
                min={0}
                max={120}
                value={form.pausa_minuti_default}
                onChange={(e) =>
                  set("pausa_minuti_default", Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="lbl">Soglia ore minime</label>
              <input
                className="fi"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={form.pausa_soglia_ore_default}
                onChange={(e) =>
                  set("pausa_soglia_ore_default", Number(e.target.value))
                }
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", paddingTop: 18 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.pausa_auto_default}
                  onChange={(e) =>
                    set("pausa_auto_default", e.target.checked)
                  }
                  style={{ width: 16, height: 16, accentColor: "var(--ac)" }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--t2)",
                  }}
                >
                  Detrazione automatica attiva
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Save button ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 0 8px",
            borderTop: "1px solid var(--bdr)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--tm)" }}>
            {dirty
              ? "Hai modifiche non salvate"
              : "Nessuna modifica pendente"}
          </span>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2
                size={15}
                style={{ animation: "sp 1s linear infinite" }}
              />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Salvataggio..." : "Salva Regole Globali"}
          </Button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-component: Section header ────────────────────────────────────────── */
function SectionHeader({
  icon,
  bg,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 14.5,
            color: "var(--t)",
          }}
        >
          {title}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--tm)", marginLeft: 40 }}>
        {subtitle}
      </p>
    </div>
  );
}
