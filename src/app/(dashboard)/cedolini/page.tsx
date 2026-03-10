"use client";

import { Header } from "@/components/layout/Header";
import { Download, FileText } from "lucide-react";

interface Cedolino {
  id: string;
  mese: string;
  anno: number;
  lordo: string;
  netto: string;
  dataDisp: string;
}

const CEDOLINI: Cedolino[] = [
  { id: "c6",  mese: "Febbraio",  anno: 2026, lordo: "2.850,00 €", netto: "2.020,00 €", dataDisp: "2026-03-05" },
  { id: "c5",  mese: "Gennaio",   anno: 2026, lordo: "2.850,00 €", netto: "2.020,00 €", dataDisp: "2026-02-05" },
  { id: "c4",  mese: "Dicembre",  anno: 2025, lordo: "5.200,00 €", netto: "3.680,00 €", dataDisp: "2026-01-05" },
  { id: "c3",  mese: "Novembre",  anno: 2025, lordo: "2.850,00 €", netto: "2.020,00 €", dataDisp: "2025-12-05" },
  { id: "c2",  mese: "Ottobre",   anno: 2025, lordo: "2.850,00 €", netto: "2.020,00 €", dataDisp: "2025-11-05" },
  { id: "c1",  mese: "Settembre", anno: 2025, lordo: "2.850,00 €", netto: "2.020,00 €", dataDisp: "2025-10-05" },
];

export default function CedoliniPage() {
  return (
    <>
      <Header title="Cedolini" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">I miei cedolini</div>
            <div className="ss">{CEDOLINI.length} buste paga disponibili</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CEDOLINI.map((c, i) => (
            <div key={c.id} className="card2" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 9,
                background: i === 0 ? "var(--acl)" : "var(--bgm)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <FileText size={18} style={{ color: i === 0 ? "var(--ac)" : "var(--tm)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {c.mese} {c.anno}
                  {i === 0 && <span className="bdg ac">Ultimo</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 2 }}>
                  Disponibile dal {c.dataDisp}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.netto}</div>
                <div style={{ fontSize: 11, color: "var(--tm)" }}>lordo {c.lordo}</div>
              </div>
              <button
                className="btn bs sm"
                style={{ display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => alert(`Download cedolino ${c.mese} ${c.anno}`)}
              >
                <Download size={13} /> PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
