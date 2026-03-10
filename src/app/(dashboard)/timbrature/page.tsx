"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, LogIn, LogOut } from "lucide-react";

// Mock timbrature giornaliere
const TODAY_PUNCHES: Record<string, { in?: string; out?: string }> = {
  "1": { in: "08:02", out: undefined },
  "2": { in: "08:15", out: "12:30" },
  "3": { in: "09:45" },
  "4": { in: "08:00", out: "17:00" },
  "5": { in: "08:30" },
  "6": { in: "08:10", out: "16:50" },
  "7": { in: undefined, out: undefined },
};

export default function TimbraturePage() {
  const { collaboratori } = useHRStore();
  const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const attivi = collaboratori.filter((c) => c.attivo);

  const presenti = attivi.filter((c) => TODAY_PUNCHES[c.id]?.in && !TODAY_PUNCHES[c.id]?.out).length;
  const usciti = attivi.filter((c) => TODAY_PUNCHES[c.id]?.in && TODAY_PUNCHES[c.id]?.out).length;
  const assenti = attivi.filter((c) => !TODAY_PUNCHES[c.id]?.in).length;

  return (
    <>
      <Header title="Timbrature" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Timbrature Giornaliere</div>
            <div className="ss" style={{ textTransform: "capitalize" }}>{oggi}</div>
          </div>
        </div>

        {/* KPI */}
        <div className="g3" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--okl)" }}>
              <LogIn size={17} style={{ color: "var(--ok)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--ok)" }}>{presenti}</div>
            <div className="kpi-l">In sede ora</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--acl)" }}>
              <LogOut size={17} style={{ color: "var(--ac)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--ac)" }}>{usciti}</div>
            <div className="kpi-l">Usciti oggi</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--erl)" }}>
              <Clock size={17} style={{ color: "var(--er)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--er)" }}>{assenti}</div>
            <div className="kpi-l">Non timbranti</div>
          </div>
        </div>

        {/* Tabella */}
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Reparto</th>
                <th>Ingresso</th>
                <th>Uscita</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {attivi.map((c) => {
                const punch = TODAY_PUNCHES[c.id];
                const stato = punch?.in && !punch?.out ? "presente" : punch?.in && punch?.out ? "uscito" : "assente";
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar ini={c.ini} color={c.col} size="sm" />
                        <span className="t-main">{c.full}</span>
                      </div>
                    </td>
                    <td>{c.dept}</td>
                    <td>
                      {punch?.in
                        ? <span className="ts-punch in"><LogIn size={11} /> {punch.in}</span>
                        : <span style={{ color: "var(--tm)", fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      {punch?.out
                        ? <span className="ts-punch out"><LogOut size={11} /> {punch.out}</span>
                        : <span style={{ color: "var(--tm)", fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      {stato === "presente" && <span className="bdg ok">In sede</span>}
                      {stato === "uscito" && <span className="bdg ac">Uscito</span>}
                      {stato === "assente" && <span className="bdg er">Assente</span>}
                    </td>
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
