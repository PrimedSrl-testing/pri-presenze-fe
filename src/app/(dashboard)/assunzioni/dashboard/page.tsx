"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import type { Assunzione } from "@/types";
import {
  PlayCircle,
  FileX,
  Stethoscope,
  CreditCard,
  Check,
  X,
  AlertTriangle,
  Clock,
  FileWarning,
  RefreshCw,
} from "lucide-react";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const STATO_COLS: Assunzione["stato"][] = ["bozza", "in_corso", "completata", "annullata"];

const STATO_LABEL: Record<Assunzione["stato"], string> = {
  bozza: "Bozza",
  in_corso: "In Corso",
  completata: "Completata",
  annullata: "Annullata",
};

const STATO_BADGE: Record<Assunzione["stato"], "nn" | "ac" | "ok" | "er"> = {
  bozza: "nn",
  in_corso: "ac",
  completata: "ok",
  annullata: "er",
};

const TIPO_BADGE: Record<Assunzione["tipo"], "pu" | "in"> = {
  stagionale: "pu",
  nuovo: "in",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysBetween(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

/** Compute completion % for a single assunzione */
function getCompletion(a: Assunzione): number {
  const fields =
    a.tipo === "stagionale"
      ? [a.kronos_riattivato, a.badge_assegnato, a.orario_configurato, a.sync_gestionale, a.sync_kronos, a.sync_anagrafica]
      : [
          a.doc_carta_identita,
          a.doc_codice_fiscale,
          a.doc_c2_storico,
          a.visita_medica_effettuata,
          a.formazione_effettuata,
          a.scheda_tecsam_inviata,
          a.sync_gestionale,
          a.sync_kronos,
          a.sync_anagrafica,
        ];
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}

/* ─── Circular Progress ─────────────────────────────────────────────────── */

function CircleProgress({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct === 100 ? "var(--ok)" : pct >= 60 ? "var(--wa)" : "var(--er)";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={20} cy={20} r={r} fill="none" stroke="var(--bdr)" strokeWidth={3} />
        <circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "var(--m)" }}>{pct}%</span>
    </div>
  );
}

/* ─── Mini progress bar for kanban cards ────────────────────────────────── */

function MiniBar({ pct }: { pct: number }) {
  const color = pct === 100 ? "var(--ok)" : pct >= 60 ? "var(--wa)" : "var(--er)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          background: "var(--bdr)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "var(--m)" }}>{pct}%</span>
    </div>
  );
}

/* ─── Check / X icon ────────────────────────────────────────────────────── */

function BoolIcon({ v }: { v: boolean }) {
  return v ? (
    <Check size={15} style={{ color: "var(--ok)" }} />
  ) : (
    <X size={15} style={{ color: "var(--er)" }} />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AssunzioniDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Assunzione[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    fetch("/api/assunzioni")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  /* ── KPI ───────────────────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const inCorso = data.filter((a) => a.stato === "in_corso");
    const iterInCorso = inCorso.length;

    const docMancanti = data.filter(
      (a) =>
        (a.stato === "in_corso" || a.stato === "bozza") &&
        a.tipo === "nuovo" &&
        (!a.doc_carta_identita || !a.doc_codice_fiscale || !a.doc_c2_storico),
    ).length;

    const visitePendenti = data.filter(
      (a) =>
        (a.stato === "in_corso" || a.stato === "bozza") &&
        a.visita_medica_richiesta &&
        !a.visita_medica_effettuata,
    ).length;

    const badgeDaAttivare = data.filter(
      (a) =>
        (a.stato === "in_corso" || a.stato === "completata") &&
        !a.badge_assegnato,
    ).length;

    return { iterInCorso, docMancanti, visitePendenti, badgeDaAttivare };
  }, [data]);

  /* ── Kanban grouped ────────────────────────────────────────────────────── */
  const kanban = useMemo(() => {
    const map: Record<Assunzione["stato"], Assunzione[]> = {
      bozza: [],
      in_corso: [],
      completata: [],
      annullata: [],
    };
    for (const a of data) {
      map[a.stato].push(a);
    }
    return map;
  }, [data]);

  /* ── Checklist table (in_corso, sorted by least complete first) ────────── */
  const checklistRows = useMemo(() => {
    return data
      .filter((a) => a.stato === "in_corso")
      .map((a) => ({ ...a, _pct: getCompletion(a) }))
      .sort((a, b) => a._pct - b._pct);
  }, [data]);

  /* ── Alerts ────────────────────────────────────────────────────────────── */
  const alerts = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; variant: "er" | "wa" }[] = [];

    // In corso da > 7 giorni
    for (const a of data) {
      if (a.stato === "in_corso" && daysBetween(a.data_ins) > 7) {
        items.push({
          icon: Clock,
          text: `${a.nome} ${a.cognome} - iter in corso da ${daysBetween(a.data_ins)} giorni (inserito il ${fmtDate(a.data_ins)})`,
          variant: "wa",
        });
      }
    }

    // Doc mancanti
    for (const a of data) {
      if (a.stato === "in_corso" && a.tipo === "nuovo") {
        const missing: string[] = [];
        if (!a.doc_carta_identita) missing.push("Carta Identita");
        if (!a.doc_codice_fiscale) missing.push("Codice Fiscale");
        if (!a.doc_c2_storico) missing.push("C2 Storico");
        if (missing.length > 0) {
          items.push({
            icon: FileWarning,
            text: `${a.nome} ${a.cognome} - documenti mancanti: ${missing.join(", ")}`,
            variant: "er",
          });
        }
      }
    }

    // Visite mediche richieste ma non effettuate
    for (const a of data) {
      if (a.stato === "in_corso" && a.visita_medica_richiesta && !a.visita_medica_effettuata) {
        items.push({
          icon: Stethoscope,
          text: `${a.nome} ${a.cognome} - visita medica richiesta ma non ancora effettuata`,
          variant: "er",
        });
      }
    }

    return items;
  }, [data]);

  /* ── Loading skeleton ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <Header title="Assunzioni" />
        <div className="pg anim-fi">
          <div className="sh">
            <div>
              <div className="stit">Dashboard Controllo Assunzioni</div>
              <div className="ss">Monitoraggio stato avanzamento di ogni iter</div>
            </div>
          </div>
          <div className="g4" style={{ marginBottom: 18 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card" style={{ height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={18} style={{ color: "var(--tm)", animation: "sp .8s linear infinite" }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (data.length === 0) {
    return (
      <>
        <Header title="Assunzioni" />
        <div className="pg anim-fi">
          <div className="sh">
            <div>
              <div className="stit">Dashboard Controllo Assunzioni</div>
              <div className="ss">Monitoraggio stato avanzamento di ogni iter</div>
            </div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <FileX size={40} style={{ color: "var(--tm)", marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--t)" }}>Nessuna assunzione trovata</p>
            <p style={{ fontSize: 13, color: "var(--tm)", marginTop: 4 }}>Non ci sono iter di assunzione registrati nel sistema.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Assunzioni" />

      <div className="pg anim-fi">
        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="sh">
          <div>
            <div className="stit">Dashboard Controllo Assunzioni</div>
            <div className="ss">Monitoraggio stato avanzamento di ogni iter</div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            1) KPI ROW
           ════════════════════════════════════════════════════════════════════ */}
        <div className="g4" style={{ marginBottom: 20 }}>
          <KpiCard
            label="Iter In Corso"
            value={kpi.iterInCorso}
            icon={PlayCircle}
            iconColor="var(--ac)"
            iconBg="var(--acl)"
          />
          <KpiCard
            label="Documenti Mancanti"
            value={kpi.docMancanti}
            icon={FileX}
            iconColor="var(--er)"
            iconBg="var(--erl)"
          />
          <KpiCard
            label="Visite Mediche Pendenti"
            value={kpi.visitePendenti}
            icon={Stethoscope}
            iconColor="var(--wa)"
            iconBg="var(--wal)"
          />
          <KpiCard
            label="Badge da Attivare"
            value={kpi.badgeDaAttivare}
            icon={CreditCard}
            iconColor="var(--pu)"
            iconBg="var(--pul)"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            2) KANBAN STATUS BOARD
           ════════════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 20, padding: 0 }}>
          <div style={{ padding: "16px 20px 0", fontWeight: 700, fontSize: 14 }}>
            Board Stato Assunzioni
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              padding: 16,
              overflowX: "auto",
            }}
          >
            {STATO_COLS.map((stato) => (
              <div
                key={stato}
                style={{
                  minWidth: 200,
                  background: "var(--bgs)",
                  borderRadius: "var(--r)",
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginRight: stato !== "annullata" ? 8 : 0,
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      color: "var(--tm)",
                    }}
                  >
                    {STATO_LABEL[stato]}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--m)",
                      background: "var(--bg)",
                      padding: "2px 7px",
                      borderRadius: 20,
                      color: "var(--t2)",
                      border: "1px solid var(--bdr)",
                    }}
                  >
                    {kanban[stato].length}
                  </span>
                </div>

                {/* Scrollable cards area */}
                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {kanban[stato].length === 0 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--tm)",
                        textAlign: "center",
                        padding: "20px 0",
                      }}
                    >
                      Nessun iter
                    </div>
                  )}
                  {kanban[stato].map((a) => (
                    <div
                      key={a.id}
                      onClick={() => router.push(`/assunzioni/${a.id}`)}
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--bdr)",
                        borderRadius: "var(--r2)",
                        padding: "10px 12px",
                        cursor: "pointer",
                        transition: "box-shadow .15s, border-color .15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = "var(--sh2)";
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--ac)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--bdr)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t)" }}>
                          {a.nome} {a.cognome}
                        </span>
                        <Badge variant={TIPO_BADGE[a.tipo]}>{a.tipo === "stagionale" ? "STAG" : "NUOVO"}</Badge>
                      </div>
                      {a.des_reparto && (
                        <div style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 3 }}>{a.des_reparto}</div>
                      )}
                      {a.data_assunzione && (
                        <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 2 }}>
                          Assunzione: {fmtDate(a.data_assunzione)}
                        </div>
                      )}
                      <MiniBar pct={getCompletion(a)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            3) TABELLA DETTAGLIO CHECKLIST
           ════════════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 20, padding: 0 }}>
          <div style={{ padding: "16px 20px 0", fontWeight: 700, fontSize: 14 }}>
            Dettaglio Checklist — Iter In Corso
          </div>
          <p style={{ padding: "0 20px 12px", fontSize: 12.5, color: "var(--tm)" }}>
            Ordinati per completamento crescente (chi necessita piu attenzione in cima)
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Reparto</th>
                  <th>Data Assunzione</th>
                  {/* Stagionale fields */}
                  <th style={{ textAlign: "center" }}>Kronos</th>
                  <th style={{ textAlign: "center" }}>Badge</th>
                  <th style={{ textAlign: "center" }}>Orario</th>
                  {/* Nuovo fields */}
                  <th style={{ textAlign: "center" }}>CI</th>
                  <th style={{ textAlign: "center" }}>CF</th>
                  <th style={{ textAlign: "center" }}>C2</th>
                  <th style={{ textAlign: "center" }}>Visita Med.</th>
                  <th style={{ textAlign: "center" }}>Formazione</th>
                  <th style={{ textAlign: "center" }}>Tecsam</th>
                  {/* Sync fields */}
                  <th style={{ textAlign: "center" }}>Sync Gest.</th>
                  <th style={{ textAlign: "center" }}>Sync Kronos</th>
                  <th style={{ textAlign: "center" }}>Sync Anag.</th>
                  <th style={{ textAlign: "center" }}>Compl.</th>
                </tr>
              </thead>
              <tbody>
                {checklistRows.length === 0 && (
                  <tr>
                    <td colSpan={17} style={{ textAlign: "center", padding: 32, color: "var(--tm)" }}>
                      Nessun iter in corso
                    </td>
                  </tr>
                )}
                {checklistRows.map((a) => {
                  const isStagionale = a.tipo === "stagionale";
                  return (
                    <tr
                      key={a.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/assunzioni/${a.id}`)}
                    >
                      <td className="t-main" style={{ whiteSpace: "nowrap" }}>
                        {a.nome} {a.cognome}
                      </td>
                      <td>
                        <Badge variant={TIPO_BADGE[a.tipo]}>
                          {isStagionale ? "Stagionale" : "Nuovo"}
                        </Badge>
                      </td>
                      <td>{a.des_reparto ?? "—"}</td>
                      <td>{fmtDate(a.data_assunzione)}</td>

                      {/* Stagionale: Kronos, Badge, Orario */}
                      <td style={{ textAlign: "center" }}>
                        {isStagionale ? <BoolIcon v={a.kronos_riattivato} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isStagionale ? <BoolIcon v={a.badge_assegnato} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isStagionale ? <BoolIcon v={a.orario_configurato} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>

                      {/* Nuovo: CI, CF, C2, Visita Med, Formazione, Tecsam */}
                      <td style={{ textAlign: "center" }}>
                        {!isStagionale ? <BoolIcon v={a.doc_carta_identita} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {!isStagionale ? <BoolIcon v={a.doc_codice_fiscale} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {!isStagionale ? <BoolIcon v={a.doc_c2_storico} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {!isStagionale ? <BoolIcon v={a.visita_medica_effettuata} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {!isStagionale ? <BoolIcon v={a.formazione_effettuata} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {!isStagionale ? <BoolIcon v={a.scheda_tecsam_inviata} /> : <span style={{ color: "var(--tm)" }}>—</span>}
                      </td>

                      {/* Sync */}
                      <td style={{ textAlign: "center" }}><BoolIcon v={a.sync_gestionale} /></td>
                      <td style={{ textAlign: "center" }}><BoolIcon v={a.sync_kronos} /></td>
                      <td style={{ textAlign: "center" }}><BoolIcon v={a.sync_anagrafica} /></td>

                      {/* Completamento */}
                      <td style={{ textAlign: "center" }}>
                        <CircleProgress pct={a._pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            4) ALERT SECTION
           ════════════════════════════════════════════════════════════════════ */}
        {alerts.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} style={{ color: "var(--wa)" }} />
              Attenzione — Elementi Critici ({alerts.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.map((alert, i) => {
                const Icon = alert.icon;
                const cls = alert.variant === "er" ? "ab ab-e" : "ab ab-w";
                return (
                  <div key={i} className={cls}>
                    <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{alert.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
