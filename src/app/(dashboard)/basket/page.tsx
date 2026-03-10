"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Calendar, Wallet } from "lucide-react";

// Mock basket entries
const BASKET_ROWS = [
  { empId: "1", tipo: "ferie",   giorni: 3,  dal: "2026-03-20", al: "2026-03-22", stato: "confermato" },
  { empId: "2", tipo: "ferie",   giorni: 5,  dal: "2026-03-25", al: "2026-03-29", stato: "in_banca" },
  { empId: "3", tipo: "ferie",   giorni: 7,  dal: "2026-03-20", al: "2026-03-27", stato: "approvato" },
  { empId: "4", tipo: "permesso",giorni: 0.5,dal: "2026-03-11", al: "2026-03-11", stato: "approvato" },
  { empId: "5", tipo: "rol",     giorni: 1,  dal: "2026-03-14", al: "2026-03-14", stato: "in_banca" },
  { empId: "6", tipo: "ferie",   giorni: 2,  dal: "2026-03-18", al: "2026-03-19", stato: "confermato" },
];

const STATO_STYLES: Record<string, string> = {
  confermato: "ok",
  approvato: "ac",
  in_banca: "wa",
};

export default function BasketPage() {
  const { collaboratori } = useHRStore();

  const totalFerie = BASKET_ROWS.filter((r) => r.tipo === "ferie").reduce((s, r) => s + r.giorni, 0);
  const totalRol = BASKET_ROWS.filter((r) => r.tipo === "rol").reduce((s, r) => s + r.giorni, 0);
  const totalPerm = BASKET_ROWS.filter((r) => r.tipo === "permesso").reduce((s, r) => s + r.giorni, 0);

  function getCollab(id: string) {
    return collaboratori.find((c) => c.id === id);
  }

  return (
    <>
      <Header title="Basket" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Basket Ferie & Banca Ore</div>
            <div className="ss">Riepilogo assenze pianificate — Marzo 2026</div>
          </div>
        </div>

        <div className="g3" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--acl)" }}>
              <Calendar size={17} style={{ color: "var(--ac)" }} />
            </div>
            <div className="kpi-v">{totalFerie}</div>
            <div className="kpi-l">Giorni ferie pianificati</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--okl)" }}>
              <Wallet size={17} style={{ color: "var(--ok)" }} />
            </div>
            <div className="kpi-v">{totalRol}</div>
            <div className="kpi-l">Giorni ROL pianificati</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--wal)" }}>
              <Calendar size={17} style={{ color: "var(--wa)" }} />
            </div>
            <div className="kpi-v">{totalPerm}</div>
            <div className="kpi-l">Giorni permesso</div>
          </div>
        </div>

        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Tipo</th>
                <th>Dal</th>
                <th>Al</th>
                <th>Giorni</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {BASKET_ROWS.map((row, i) => {
                const c = getCollab(row.empId);
                return (
                  <tr key={i}>
                    <td>
                      {c ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar ini={c.ini} color={c.col} size="sm" />
                          <span className="t-main">{c.full}</span>
                        </div>
                      ) : row.empId}
                    </td>
                    <td><span style={{ textTransform: "capitalize" }}>{row.tipo}</span></td>
                    <td>{row.dal}</td>
                    <td>{row.al}</td>
                    <td className="t-main">{row.giorni}g</td>
                    <td><span className={`bdg ${STATO_STYLES[row.stato] ?? "nn"}`}>{row.stato.replace("_", " ")}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
