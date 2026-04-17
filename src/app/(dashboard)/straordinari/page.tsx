"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { StraordinariTable, type StraordinariRow } from "@/components/straordinari/StraordinariTable";
import {
  Clock,
  Timer,
  Vault,
  AlertTriangle,
  Download,
  RefreshCw,
  Info,
} from "lucide-react";
import type { DipendenteDB } from "@/types";

/* ─── Month helpers ──────────────────────────────────────────────────────── */
const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
] as const;

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1; // 1-based

export default function StraordinariPage() {
  /* ── Filters ─────────────────────────────────────────────────────────────── */
  const [anno, setAnno] = useState(currentYear);
  const [meseDa, setMeseDa] = useState(currentMonth);
  const [meseA, setMeseA] = useState(currentMonth);
  const [dipFilter, setDipFilter] = useState<string>("");

  /* ── Data ─────────────────────────────────────────────────────────────────── */
  const [dipendenti, setDipendenti] = useState<DipendenteDB[]>([]);
  const [rows, setRows] = useState<StraordinariRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* ── Fetch dipendenti (once) ─────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/dipendenti")
      .then((r) => r.json())
      .then((data: DipendenteDB[]) => setDipendenti(Array.isArray(data) ? data : []))
      .catch(() => setDipendenti([]));
  }, []);

  /* ── Fetch riepilogo ─────────────────────────────────────────────────────── */
  const fetchRiepilogo = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        anno: String(anno),
        mese_da: String(meseDa),
        mese_a: String(meseA),
      });
      if (dipFilter) params.set("dip_id", dipFilter);

      const res = await fetch(`/api/straordinari/riepilogo?${params}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [anno, meseDa, meseA, dipFilter]);

  /* auto-fetch on mount & filter change */
  useEffect(() => {
    fetchRiepilogo();
  }, [fetchRiepilogo]);

  /* ── KPI computed values ─────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const totStraordinario = rows.reduce((s, r) => s + Number(r.ore_straordinario_pagabile), 0);
    const totSupplementari = rows.reduce((s, r) => s + Number(r.ore_supplementari), 0);
    const totBob = rows.reduce((s, r) => s + Number(r.ore_bob), 0);
    const dipConEccedenze = new Set(
      rows.filter((r) => Number(r.ore_bob) > 0).map((r) => r.dip_id),
    ).size;
    return { totStraordinario, totSupplementari, totBob, dipConEccedenze };
  }, [rows]);

  /* ── Export Excel ────────────────────────────────────────────────────────── */
  const handleExport = async () => {
    setExporting(true);
    try {
      /* Convert month range to approximate ISO week range */
      const settDa = Math.max(1, Math.floor((meseDa - 1) * 4.33) + 1);
      const settA = Math.min(53, Math.ceil(meseA * 4.33));

      const params = new URLSearchParams({
        anno: String(anno),
        settimana_da: String(settDa),
        settimana_a: String(settA),
      });

      const res = await fetch(`/api/export/consulente?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ore_consulente_${anno}_mese${meseDa}-${meseA}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* silently fail — could hook into toast system */
    } finally {
      setExporting(false);
    }
  };

  /* ── Year options ────────────────────────────────────────────────────────── */
  const years = useMemo(() => {
    const y: number[] = [];
    for (let i = currentYear + 1; i >= currentYear - 3; i--) y.push(i);
    return y;
  }, []);

  return (
    <>
      <Header title="Straordinari" />

      <div className="pg anim-fi">
        {/* ── Page heading ─────────────────────────────────────────────────── */}
        <div className="sh">
          <div>
            <div className="stit">Gestione Straordinari</div>
            <div className="ss">Riepilogo settimanale, calcolo automatico, export consulente</div>
          </div>
        </div>

        {/* ── Info banner ──────────────────────────────────────────────────── */}
        <div className="ab ab-i" style={{ marginBottom: 16 }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Il limite legale è di <strong>48h settimanali</strong>. Lo straordinario pagabile è max <strong>8h/settimana</strong>. Le eccedenze confluiscono automaticamente in <strong>Banca Ore (BOB)</strong>.
          </span>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="g4" style={{ marginBottom: 18 }}>
          <KpiCard
            label="Ore Straordinario"
            value={kpi.totStraordinario.toFixed(1)}
            icon={Clock}
            iconColor="var(--wa)"
            iconBg="var(--wal)"
            trend={kpi.totStraordinario > 0 ? { value: `${MESI[meseDa - 1]}`, positive: false } : undefined}
          />
          <KpiCard
            label="Ore Supplementari"
            value={kpi.totSupplementari.toFixed(1)}
            icon={Timer}
            iconColor="var(--in)"
            iconBg="var(--inl)"
          />
          <KpiCard
            label="Ore BOB (Banca Ore)"
            value={kpi.totBob.toFixed(1)}
            icon={Vault}
            iconColor="var(--er)"
            iconBg="var(--erl)"
          />
          <KpiCard
            label="Dip. con Eccedenze"
            value={kpi.dipConEccedenze}
            icon={AlertTriangle}
            iconColor={kpi.dipConEccedenze > 0 ? "var(--er)" : "var(--ok)"}
            iconBg={kpi.dipConEccedenze > 0 ? "var(--erl)" : "var(--okl)"}
          />
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          {/* Dipendente filter */}
          <div>
            <label className="lbl">Dipendente</label>
            <select
              className="fi"
              style={{ width: 220 }}
              value={dipFilter}
              onChange={(e) => setDipFilter(e.target.value)}
            >
              <option value="">Tutti</option>
              {dipendenti.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.nome} ({d.matricola})
                </option>
              ))}
            </select>
          </div>

          {/* Anno */}
          <div>
            <label className="lbl">Anno</label>
            <select
              className="fi"
              style={{ width: 100 }}
              value={anno}
              onChange={(e) => setAnno(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Mese da */}
          <div>
            <label className="lbl">Da mese</label>
            <select
              className="fi"
              style={{ width: 140 }}
              value={meseDa}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMeseDa(v);
                if (v > meseA) setMeseA(v);
              }}
            >
              {MESI.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Mese a */}
          <div>
            <label className="lbl">A mese</label>
            <select
              className="fi"
              style={{ width: 140 }}
              value={meseA}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMeseA(v);
                if (v < meseDa) setMeseDa(v);
              }}
            >
              {MESI.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginLeft: "auto", paddingTop: 18 }}>
            <Button variant="secondary" onClick={fetchRiepilogo} disabled={loading}>
              <RefreshCw size={14} style={loading ? { animation: "sp .6s linear infinite" } : undefined} />
              Ricalcola
            </Button>
            <Button variant="primary" onClick={handleExport} disabled={exporting || rows.length === 0}>
              <Download size={14} />
              {exporting ? "Esportando..." : "Esporta per Consulente"}
            </Button>
          </div>
        </div>

        {/* ── Legend bar ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          <LegendItem color="var(--ok)" label="Ore contrattuali (ordinarie)" />
          <LegendItem color="var(--in)" label="Supplementari (solo PT)" />
          <LegendItem color="var(--wa)" label="Straordinario pagabile (max 8h)" />
          <LegendItem color="var(--er)" label="BOB - Eccedenza (> 48h)" />
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <StraordinariTable rows={rows} loading={loading} />
      </div>
    </>
  );
}

/* ── Legend item helper ────────────────────────────────────────────────────── */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--t2)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}
