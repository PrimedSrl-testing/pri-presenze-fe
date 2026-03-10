"use client";

import { Header } from "@/components/layout/Header";
import { AZIENDE } from "@/lib/data/aziende";
import { useHRStore } from "@/lib/store";
import { Building2, Users } from "lucide-react";

export default function AziendePage() {
  const { collaboratori } = useHRStore();

  return (
    <>
      <Header title="Aziende" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Aziende</div>
            <div className="ss">{AZIENDE.length} aziende configurate</div>
          </div>
        </div>

        <div className="g2">
          {AZIENDE.map((az) => {
            const dipCount = collaboratori.filter((c) => c.co === az.id && c.attivo).length;
            return (
              <div key={az.id} className="card2">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: az.colore, display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14,
                  }}>
                    {az.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t)" }}>{az.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--tm)" }}>{az.sede}</div>
                  </div>
                </div>
                <div className="sr">
                  <span className="sl">P.IVA</span>
                  <span className="sv">{az.piva}</span>
                </div>
                <div className="sr">
                  <span className="sl">Dipendenti attivi</span>
                  <span className="sv" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Users size={13} style={{ color: "var(--ac)" }} />
                    {dipCount}
                  </span>
                </div>
                <div className="sr">
                  <span className="sl">Stato</span>
                  <span className="bdg ok">Attiva</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
