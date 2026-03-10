"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Wallet, Calendar, Clock } from "lucide-react";

const SALDI_MOCK: Record<string, { ferie: number; ferieUsate: number; rol: number; rolUsato: number; extra: number }> = {
  "1": { ferie: 26, ferieUsate: 4,  rol: 32, rolUsato: 8,  extra: 8  },
  "2": { ferie: 26, ferieUsate: 10, rol: 18, rolUsato: 14, extra: 2  },
  "3": { ferie: 26, ferieUsate: 8,  rol: 24, rolUsato: 10, extra: 12 },
  "4": { ferie: 22, ferieUsate: 6,  rol: 20, rolUsato: 4,  extra: 0  },
  "5": { ferie: 26, ferieUsate: 14, rol: 16, rolUsato: 8,  extra: 4  },
};

export default function SaldoFeriePage() {
  const { currentUserId } = useHRStore();
  const saldo = SALDI_MOCK[currentUserId] ?? { ferie: 26, ferieUsate: 0, rol: 32, rolUsato: 0, extra: 0 };

  const ferieRes = saldo.ferie - saldo.ferieUsate;
  const rolRes = saldo.rol - saldo.rolUsato;

  return (
    <>
      <Header title="Saldo Ferie & Permessi" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Saldo ferie & permessi</div>
            <div className="ss">Anno 2026 — aggiornato al {new Date().toLocaleDateString("it-IT")}</div>
          </div>
        </div>

        <div className="g3" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--acl)" }}>
              <Calendar size={17} style={{ color: "var(--ac)" }} />
            </div>
            <div className="kpi-v">{ferieRes}</div>
            <div className="kpi-l">Giorni ferie residui</div>
            <div className="kpi-s">{saldo.ferieUsate} usati su {saldo.ferie} spettanti</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--okl)" }}>
              <Wallet size={17} style={{ color: "var(--ok)" }} />
            </div>
            <div className="kpi-v">{rolRes}h</div>
            <div className="kpi-l">ROL residuo</div>
            <div className="kpi-s">{saldo.rolUsato}h usate su {saldo.rol}h spettanti</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: saldo.extra > 0 ? "var(--wal)" : "var(--bgm)" }}>
              <Clock size={17} style={{ color: saldo.extra > 0 ? "var(--wa)" : "var(--tm)" }} />
            </div>
            <div className="kpi-v" style={{ color: saldo.extra > 0 ? "var(--wa)" : "var(--t)" }}>
              {saldo.extra}h
            </div>
            <div className="kpi-l">Ore straordinario</div>
            <div className="kpi-s">Da recuperare o retribuire</div>
          </div>
        </div>

        {/* Barre progress */}
        <div className="card2">
          <div className="ctit">Utilizzo ferie</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12.5 }}>Ferie usate</span>
              <span style={{ fontSize: 12, color: "var(--tm)" }}>{saldo.ferieUsate}/{saldo.ferie} giorni</span>
            </div>
            <div className="pt">
              <div className="pf" style={{
                width: `${Math.round((saldo.ferieUsate / saldo.ferie) * 100)}%`,
                background: "var(--ac)",
              }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12.5 }}>ROL utilizzato</span>
              <span style={{ fontSize: 12, color: "var(--tm)" }}>{saldo.rolUsato}/{saldo.rol} ore</span>
            </div>
            <div className="pt">
              <div className="pf" style={{
                width: `${Math.round((saldo.rolUsato / saldo.rol) * 100)}%`,
                background: "var(--ok)",
              }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
