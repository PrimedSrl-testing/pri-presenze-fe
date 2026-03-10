"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Plus, Calendar } from "lucide-react";

const STATO_STYLE: Record<string, string> = {
  pending: "wa",
  approvata: "ok",
  rifiutata: "er",
};
const STATO_LABELS: Record<string, string> = {
  pending: "In attesa",
  approvata: "Approvata",
  rifiutata: "Rifiutata",
};

export default function MieRichiestePage() {
  const { richieste, causali, currentUserId } = useHRStore();
  const mie = richieste.filter((r) => r.empId === currentUserId);

  function getCausale(id: string) { return causali.find((c) => c.id === id); }

  return (
    <>
      <Header title="Le mie richieste" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Le mie richieste</div>
            <div className="ss">{mie.length} richieste totali</div>
          </div>
          <button className="btn bp" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Nuova richiesta
          </button>
        </div>

        {mie.length === 0 ? (
          <div className="card2" style={{ textAlign: "center", padding: 40 }}>
            <Calendar size={32} style={{ color: "var(--tm)", margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nessuna richiesta</div>
            <div style={{ fontSize: 12.5, color: "var(--tm)" }}>Non hai ancora inviato richieste ferie o permessi.</div>
          </div>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Causale</th>
                  <th>Dal</th>
                  <th>Al</th>
                  <th>Ore</th>
                  <th>Note</th>
                  <th>Stato</th>
                  <th>Nota mgr</th>
                </tr>
              </thead>
              <tbody>
                {mie.map((r) => {
                  const caus = getCausale(r.causaleId);
                  return (
                    <tr key={r.id}>
                      <td className="t-main">{caus?.nome ?? r.causaleId}</td>
                      <td>{r.dal}</td>
                      <td>{r.al}</td>
                      <td>{r.ore ? `${r.ore}h` : "—"}</td>
                      <td style={{ fontSize: 12 }}>{r.note || "—"}</td>
                      <td><span className={`bdg ${STATO_STYLE[r.stato]}`}>{STATO_LABELS[r.stato]}</span></td>
                      <td style={{ fontSize: 12, color: "var(--tm)" }}>{r.notaMgr || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
