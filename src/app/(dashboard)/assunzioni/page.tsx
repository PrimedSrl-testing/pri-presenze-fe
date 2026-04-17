"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Modal } from "@/components/ui/Modal";
import {
  Plus,
  FileText,
  PlayCircle,
  CheckCircle2,
  Users,
  Trash2,
  ExternalLink,
  Search,
  UserCheck,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import type { Assunzione, StatoAssunzione, TipoAssunzione } from "@/types";

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

const TABS: { key: string; label: string; stato: StatoAssunzione | null }[] = [
  { key: "tutti",     label: "Tutti",      stato: null },
  { key: "bozza",     label: "Bozza",      stato: "bozza" },
  { key: "in_corso",  label: "In Corso",   stato: "in_corso" },
  { key: "completata",label: "Completate", stato: "completata" },
  { key: "annullata", label: "Annullate",  stato: "annullata" },
];

/** Count checked checklist items for the appropriate type */
function checklistProgress(a: Assunzione): { done: number; total: number } {
  if (a.tipo === "stagionale") {
    const items = [a.kronos_riattivato, a.badge_assegnato, a.orario_configurato];
    return { done: items.filter(Boolean).length, total: items.length };
  }
  // nuovo
  const items = [
    a.doc_carta_identita, a.doc_codice_fiscale, a.doc_c2_storico,
    a.visita_medica_richiesta, a.visita_medica_effettuata,
    a.formazione_richiesta, a.formazione_effettuata,
    a.scheda_tecsam_generata, a.scheda_tecsam_inviata,
    a.sync_gestionale, a.sync_kronos, a.sync_anagrafica,
  ];
  return { done: items.filter(Boolean).length, total: items.length };
}

function fmtDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT");
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function AssunzioniPage() {
  const router = useRouter();

  /* ── State ─────────────────────────────────────────────────────────────── */
  const [rows, setRows] = useState<Assunzione[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tutti");
  const [tipoFilter, setTipoFilter] = useState<TipoAssunzione | "">("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assunzioni");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── KPI ────────────────────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const bozze = rows.filter((r) => r.stato === "bozza").length;
    const inCorso = rows.filter((r) => r.stato === "in_corso").length;
    const now = new Date();
    const completateMese = rows.filter((r) => {
      if (r.stato !== "completata") return false;
      const d = new Date(r.data_ins);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { bozze, inCorso, completateMese, totale: rows.length };
  }, [rows]);

  /* ── Filtered list ─────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = rows;
    const tab = TABS.find((t) => t.key === activeTab);
    if (tab?.stato) list = list.filter((r) => r.stato === tab.stato);
    if (tipoFilter) list = list.filter((r) => r.tipo === tipoFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.nome.toLowerCase().includes(q) ||
          r.cognome.toLowerCase().includes(q) ||
          (r.codice_fiscale ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, activeTab, tipoFilter, search]);

  /* ── Delete ─────────────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/assunzioni/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      fetchAll();
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Header title="Assunzioni" />

      <div className="pg anim-fi">
        {/* ── Page heading ────────────────────────────────────────────── */}
        <div className="sh">
          <div>
            <div className="stit">Gestione Assunzioni</div>
            <div className="ss">
              Workflow completo per nuove assunzioni e riattivazione stagionali
            </div>
          </div>
          <Button onClick={() => router.push("/assunzioni/nuova")}>
            <Plus size={14} />
            Nuova Assunzione
          </Button>
        </div>

        {/* ── KPI cards ──────────────────────────────────────────────── */}
        <div className="g4" style={{ marginBottom: 18 }}>
          <KpiCard
            label="Bozze"
            value={kpi.bozze}
            icon={FileText}
            iconColor="var(--tm)"
            iconBg="var(--bgm)"
          />
          <KpiCard
            label="In Corso"
            value={kpi.inCorso}
            icon={PlayCircle}
            iconColor="var(--in)"
            iconBg="var(--inl)"
          />
          <KpiCard
            label="Completate (mese)"
            value={kpi.completateMese}
            icon={CheckCircle2}
            iconColor="var(--ok)"
            iconBg="var(--okl)"
          />
          <KpiCard
            label="Totale"
            value={kpi.totale}
            icon={Users}
            iconColor="var(--ac)"
            iconBg="var(--acl)"
          />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="tabs">
          {TABS.map((t) => {
            const count =
              t.stato === null
                ? rows.length
                : rows.filter((r) => r.stato === t.stato).length;
            return (
              <button
                key={t.key}
                className={`tab ${activeTab === t.key ? "ac" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                <span className="tc">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="search-wrap">
            <Search size={14} />
            <input
              className="fi"
              placeholder="Cerca per nome, cognome, CF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select
              className="fi"
              style={{ width: 170 }}
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as TipoAssunzione | "")}
            >
              <option value="">Tutti i tipi</option>
              <option value="stagionale">Stagionale</option>
              <option value="nuovo">Nuovo</option>
            </select>
          </div>
        </div>

        {/* ── List ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="tw" style={{ padding: 48, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: 24,
                height: 24,
                border: "3px solid var(--bdr)",
                borderTopColor: "var(--ac)",
                borderRadius: "50%",
                animation: "sp .6s linear infinite",
              }}
            />
            <p style={{ marginTop: 10, color: "var(--tm)", fontSize: 13 }}>
              Caricamento assunzioni...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="tw" style={{ padding: 48, textAlign: "center" }}>
            <Users size={36} style={{ color: "var(--bdr)", marginBottom: 10 }} />
            <p style={{ color: "var(--tm)", fontSize: 13 }}>
              Nessuna assunzione trovata.
            </p>
            <Button
              variant="secondary"
              size="sm"
              style={{ marginTop: 12 }}
              onClick={() => router.push("/assunzioni/nuova")}
            >
              <Plus size={14} /> Crea la prima
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((a) => {
              const { done, total } = checklistProgress(a);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const statoCfg = STATO_BADGE[a.stato];
              const tipoCfg = TIPO_BADGE[a.tipo];

              return (
                <div key={a.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Icon */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: a.tipo === "stagionale" ? "var(--pul)" : "var(--inl)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {a.tipo === "stagionale" ? (
                        <UserCheck size={20} style={{ color: "var(--pu)" }} />
                      ) : (
                        <UserPlus size={20} style={{ color: "var(--in)" }} />
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--t)" }}>
                          {a.cognome} {a.nome}
                        </span>
                        <Badge variant={tipoCfg.variant}>{tipoCfg.label}</Badge>
                        <Badge variant={statoCfg.variant}>{statoCfg.label}</Badge>
                      </div>

                      {/* Details */}
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--t2)", marginBottom: 8 }}>
                        {a.des_reparto && <span>Reparto: <strong>{a.des_reparto}</strong></span>}
                        {a.data_assunzione && <span>Data ass.: <strong>{fmtDate(a.data_assunzione)}</strong></span>}
                        {a.tipo_rapporto && (
                          <span>Rapporto: <strong>{a.tipo_rapporto === "diretto" ? "Diretto" : "Somministrato"}</strong></span>
                        )}
                        {a.des_contratto && <span>Contratto: <strong>{a.des_contratto}</strong></span>}
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="pt" style={{ flex: 1, maxWidth: 200 }}>
                          <div
                            className="pf"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct === 100 ? "var(--ok)" : pct >= 50 ? "var(--ac)" : "var(--wa)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--t2)", fontFamily: "var(--m)" }}>
                          {done}/{total} ({pct}%)
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/assunzioni/${a.id}`)}
                      >
                        <ExternalLink size={13} /> Apri
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteId(a.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Conferma Eliminazione"
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={20} style={{ color: "var(--er)", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "var(--t)" }}>
            Sei sicuro di voler eliminare questa assunzione? L&apos;operazione non e&apos; reversibile.
          </p>
        </div>
      </Modal>
    </>
  );
}
