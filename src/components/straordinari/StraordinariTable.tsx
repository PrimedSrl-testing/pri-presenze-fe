"use client";

import { Badge } from "@/components/ui/Badge";
import { SortableTable, type Column } from "@/components/ui/SortableTable";

/* ─── Row shape coming from the API (riepilogo join) ─────────────────────── */
export interface StraordinariRow {
  id: number;
  dip_id: number;
  dip_nome: string;
  matricola: string;
  anno: number;
  settimana: number;
  ore_contrattuali: number;
  ore_lavorate: number;
  ore_supplementari: number;
  ore_straordinario_pagabile: number;
  ore_bob: number;
  ore_boa: number;
  ore_bop: number;
  ore_bos: number;
  calcolato_il: string;
  note: string | null;
}

interface Props {
  rows: StraordinariRow[];
  loading: boolean;
}

/* helper: format hours to 1 decimal */
const fh = (v: number) => (v ?? 0).toFixed(1);

/* helper: is part-time (< 40h weekly contract) */
const isPT = (ore: number) => ore < 40;

export function StraordinariTable({ rows, loading }: Props) {
  if (loading) {
    return (
      <div className="tw" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--bdr)", borderTopColor: "var(--ac)", borderRadius: "50%", animation: "sp .6s linear infinite" }} />
        <p style={{ marginTop: 10, color: "var(--tm)", fontSize: 13 }}>Caricamento dati straordinari...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="tw" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--tm)", fontSize: 13 }}>Nessun dato disponibile per il periodo selezionato.</p>
      </div>
    );
  }

  /* ── Totals ─────────────────────────────────────────────────────────────── */
  const tot = rows.reduce(
    (acc, r) => ({
      ore_contrattuali: acc.ore_contrattuali + Number(r.ore_contrattuali),
      ore_lavorate: acc.ore_lavorate + Number(r.ore_lavorate),
      ore_supplementari: acc.ore_supplementari + Number(r.ore_supplementari),
      ore_straordinario_pagabile: acc.ore_straordinario_pagabile + Number(r.ore_straordinario_pagabile),
      ore_bob: acc.ore_bob + Number(r.ore_bob),
    }),
    { ore_contrattuali: 0, ore_lavorate: 0, ore_supplementari: 0, ore_straordinario_pagabile: 0, ore_bob: 0 },
  );

  const columns: Column<StraordinariRow>[] = [
    {
      key: "dipendente",
      label: "Dipendente",
      getValue: (r) => r.dip_nome,
      render: (r) => {
        const pt = isPT(Number(r.ore_contrattuali));
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "var(--t)", fontSize: 13 }}>{r.dip_nome}</span>
              {pt && <Badge variant="ac">PT</Badge>}
            </div>
            <div style={{ fontSize: 11, color: "var(--tm)" }}>{r.matricola}</div>
          </div>
        );
      },
    },
    {
      key: "settimana",
      label: "Sett.",
      getValue: (r) => r.settimana,
      render: (r) => <span className="mono" style={{ fontSize: 12 }}>S{String(r.settimana).padStart(2, "0")}</span>,
    },
    {
      key: "ore_contrattuali",
      label: "Ore Contrattuali",
      align: "right",
      getValue: (r) => Number(r.ore_contrattuali),
      render: (r) => <span style={{ fontFamily: "var(--m)", fontSize: 13 }}>{fh(Number(r.ore_contrattuali))}</span>,
    },
    {
      key: "ore_lavorate",
      label: "Ore Lavorate",
      align: "right",
      getValue: (r) => Number(r.ore_lavorate),
      render: (r) => {
        const lav = Number(r.ore_lavorate);
        const contr = Number(r.ore_contrattuali);
        return (
          <span style={{ fontFamily: "var(--m)", fontSize: 13, fontWeight: 700, color: lav > 48 ? "var(--er)" : lav > contr ? "var(--wa)" : "var(--ok)" }}>
            {fh(lav)}
          </span>
        );
      },
    },
    {
      key: "supplementari",
      label: "Supplementari",
      align: "right",
      getValue: (r) => Number(r.ore_supplementari),
      render: (r) => {
        const supp = Number(r.ore_supplementari);
        return <span style={{ fontFamily: "var(--m)", fontSize: 13, color: supp > 0 ? "var(--in)" : "var(--tm)" }}>{supp > 0 ? fh(supp) : "-"}</span>;
      },
    },
    {
      key: "straordinario",
      label: "Straord. Pagabile",
      align: "right",
      getValue: (r) => Number(r.ore_straordinario_pagabile),
      render: (r) => {
        const strao = Number(r.ore_straordinario_pagabile);
        return <span style={{ fontFamily: "var(--m)", fontSize: 13, color: strao > 0 ? "var(--wa)" : "var(--tm)" }}>{strao > 0 ? fh(strao) : "-"}</span>;
      },
    },
    {
      key: "bob",
      label: "BOB",
      align: "right",
      getValue: (r) => Number(r.ore_bob),
      render: (r) => {
        const bob = Number(r.ore_bob);
        return <span style={{ fontFamily: "var(--m)", fontSize: 13, fontWeight: bob > 0 ? 700 : 400, color: bob > 0 ? "var(--er)" : "var(--tm)" }}>{bob > 0 ? fh(bob) : "-"}</span>;
      },
    },
    {
      key: "breakdown",
      label: "Breakdown",
      width: 140,
      sortable: false,
      searchable: false,
      getValue: () => "",
      render: (r) => {
        const lav = Number(r.ore_lavorate);
        const contr = Number(r.ore_contrattuali);
        const supp = Number(r.ore_supplementari);
        const strao = Number(r.ore_straordinario_pagabile);
        const bob = Number(r.ore_bob);
        const barMax = Math.max(lav, 48);
        const pctContr = (Math.min(contr, lav) / barMax) * 100;
        const pctSupp = (supp / barMax) * 100;
        const pctStrao = (strao / barMax) * 100;
        const pctBob = (bob / barMax) * 100;

        return (
          <div>
            <div
              style={{
                display: "flex",
                height: 8,
                borderRadius: 4,
                overflow: "hidden",
                background: "var(--bgm)",
                width: "100%",
                minWidth: 100,
              }}
              title={`Contrattuali: ${fh(contr)}h | Suppl.: ${fh(supp)}h | Straord.: ${fh(strao)}h | BOB: ${fh(bob)}h`}
            >
              <div style={{ width: `${pctContr}%`, background: "var(--ok)", transition: "width .4s ease" }} />
              {pctSupp > 0 && <div style={{ width: `${pctSupp}%`, background: "var(--in)", transition: "width .4s ease" }} />}
              {pctStrao > 0 && <div style={{ width: `${pctStrao}%`, background: "var(--wa)", transition: "width .4s ease" }} />}
              {pctBob > 0 && <div style={{ width: `${pctBob}%`, background: "var(--er)", transition: "width .4s ease" }} />}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
              <LegendDot color="var(--ok)" label="Contr." />
              {supp > 0 && <LegendDot color="var(--in)" label="Suppl." />}
              {strao > 0 && <LegendDot color="var(--wa)" label="Str." />}
              {bob > 0 && <LegendDot color="var(--er)" label="BOB" />}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        <SortableTable<StraordinariRow>
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          emptyMessage="Nessun dato disponibile per il periodo selezionato."
        />
      </div>

      {/* ── Totals row ────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--bgs)", borderTop: "2px solid var(--bdr)", padding: "10px 10px", display: "flex", gap: 20, fontSize: 13, fontFamily: "var(--m)", flexWrap: "wrap", borderRadius: "0 0 10px 10px" }}>
        <span style={{ fontWeight: 800, color: "var(--t)" }}>Totale ({rows.length} righe)</span>
        <span>Contrattuali: <b>{fh(tot.ore_contrattuali)}</b></span>
        <span>Lavorate: <b>{fh(tot.ore_lavorate)}</b></span>
        <span style={{ color: tot.ore_supplementari > 0 ? "var(--in)" : "var(--tm)" }}>Suppl.: <b>{fh(tot.ore_supplementari)}</b></span>
        <span style={{ color: tot.ore_straordinario_pagabile > 0 ? "var(--wa)" : "var(--tm)" }}>Straord.: <b>{fh(tot.ore_straordinario_pagabile)}</b></span>
        <span style={{ color: tot.ore_bob > 0 ? "var(--er)" : "var(--tm)" }}>BOB: <b>{fh(tot.ore_bob)}</b></span>
      </div>
    </div>
  );
}

/* ── Tiny legend dot ──────────────────────────────────────────────────────── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--tm)" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
