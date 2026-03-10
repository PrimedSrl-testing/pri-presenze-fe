"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Users, Clock, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

export default function ConsoleMesePage() {
  const { collaboratori, anomalie, richieste } = useHRStore();

  const now = new Date();
  const meseName = now.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const attivi = collaboratori.filter((c) => c.attivo).length;
  const anomalieAperte = anomalie.filter((a) => a.stato === "aperta").length;
  const richiesteAperte = richieste.filter((r) => r.stato === "pending").length;
  const richiesteApprovate = richieste.filter((r) => r.stato === "approvata").length;

  // Simulated monthly hours
  const oreTeoriche = attivi * 168;
  const oreLavorate = Math.round(oreTeoriche * 0.94);
  const saldo = oreLavorate - oreTeoriche;

  return (
    <>
      <Header title="Console Mese" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Console Mese</div>
            <div className="ss" style={{ textTransform: "capitalize" }}>{meseName}</div>
          </div>
          <span className="bdg in">Mese in corso</span>
        </div>

        {/* KPI row */}
        <div className="g4" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--acl)" }}>
              <Users size={17} style={{ color: "var(--ac)" }} />
            </div>
            <div className="kpi-v">{attivi}</div>
            <div className="kpi-l">Dipendenti attivi</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--inl)" }}>
              <Clock size={17} style={{ color: "var(--in)" }} />
            </div>
            <div className="kpi-v">{oreLavorate.toLocaleString()}</div>
            <div className="kpi-l">Ore lavorate</div>
            <div className="kpi-s">{oreTeoriche.toLocaleString()} teoriche</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: saldo >= 0 ? "var(--okl)" : "var(--erl)" }}>
              <TrendingUp size={17} style={{ color: saldo >= 0 ? "var(--ok)" : "var(--er)" }} />
            </div>
            <div className="kpi-v" style={{ color: saldo >= 0 ? "var(--ok)" : "var(--er)" }}>
              {saldo >= 0 ? "+" : ""}{saldo}h
            </div>
            <div className="kpi-l">Saldo ore</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--wal)" }}>
              <AlertTriangle size={17} style={{ color: "var(--wa)" }} />
            </div>
            <div className="kpi-v" style={{ color: anomalieAperte > 0 ? "var(--er)" : "var(--ok)" }}>
              {anomalieAperte}
            </div>
            <div className="kpi-l">Anomalie aperte</div>
          </div>
        </div>

        {/* Richieste summary */}
        <div className="g2">
          <div className="card2">
            <div className="ctit"><CheckCircle size={12} /> Richieste</div>
            <div className="sr">
              <span className="sl">In attesa</span>
              <span className="bdg wa">{richiesteAperte}</span>
            </div>
            <div className="sr">
              <span className="sl">Approvate</span>
              <span className="bdg ok">{richiesteApprovate}</span>
            </div>
            <div className="sr">
              <span className="sl">Rifiutate</span>
              <span className="bdg er">{richieste.filter((r) => r.stato === "rifiutata").length}</span>
            </div>
          </div>

          <div className="card2">
            <div className="ctit"><Clock size={12} /> Ore del mese</div>
            <div className="sr">
              <span className="sl">Ore teoriche</span>
              <span className="sv">{oreTeoriche.toLocaleString()} h</span>
            </div>
            <div className="sr">
              <span className="sl">Ore lavorate</span>
              <span className="sv">{oreLavorate.toLocaleString()} h</span>
            </div>
            <div className="sr">
              <span className="sl">Copertura</span>
              <span className="sv">
                {Math.round((oreLavorate / oreTeoriche) * 100)}%
              </span>
            </div>
            <div className="pt" style={{ marginTop: 10 }}>
              <div
                className="pf"
                style={{
                  width: `${Math.round((oreLavorate / oreTeoriche) * 100)}%`,
                  background: "var(--ac)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
