"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { AlertTriangle, Calendar } from "lucide-react";

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ScadenzePage() {
  const { collaboratori } = useHRStore();

  const scadenze = collaboratori
    .filter((c) => c.attivo && c.fin_contratto)
    .map((c) => ({
      c,
      days: daysDiff(c.fin_contratto!),
      data: c.fin_contratto!,
    }))
    .sort((a, b) => a.days - b.days);

  const critiche = scadenze.filter((s) => s.days <= 30).length;
  const inScadenza = scadenze.filter((s) => s.days > 30 && s.days <= 90).length;

  return (
    <>
      <Header title="Scadenze" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Scadenze Contratti</div>
            <div className="ss">Monitoraggio contratti a termine e compliance</div>
          </div>
        </div>

        <div className="g3" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--erl)" }}>
              <AlertTriangle size={17} style={{ color: "var(--er)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--er)" }}>{critiche}</div>
            <div className="kpi-l">Scadenze critiche (≤30 gg)</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--wal)" }}>
              <Calendar size={17} style={{ color: "var(--wa)" }} />
            </div>
            <div className="kpi-v" style={{ color: "var(--wa)" }}>{inScadenza}</div>
            <div className="kpi-l">In scadenza (31-90 gg)</div>
          </div>
          <div className="kpi2">
            <div className="kpi-i" style={{ background: "var(--acl)" }}>
              <Calendar size={17} style={{ color: "var(--ac)" }} />
            </div>
            <div className="kpi-v">{scadenze.length}</div>
            <div className="kpi-l">Contratti a termine</div>
          </div>
        </div>

        {critiche > 0 && (
          <div className="ab ab-e" style={{ marginBottom: 14 }}>
            <AlertTriangle size={15} />
            <span>{critiche} contratto/i in scadenza entro 30 giorni. Azione immediata richiesta.</span>
          </div>
        )}

        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Reparto</th>
                <th>Contratto</th>
                <th>Scadenza</th>
                <th>Giorni rimasti</th>
                <th>Urgenza</th>
              </tr>
            </thead>
            <tbody>
              {scadenze.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--tm)" }}>
                    Nessun contratto a termine registrato
                  </td>
                </tr>
              ) : (
                scadenze.map(({ c, days, data }) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar ini={c.ini} color={c.col} size="sm" />
                        <span className="t-main">{c.full}</span>
                      </div>
                    </td>
                    <td>{c.dept}</td>
                    <td>{c.tipo}</td>
                    <td className="mono">{data}</td>
                    <td>
                      <span className={days <= 30 ? "gvh" : days <= 90 ? "gvm" : "gvl"}>
                        {days > 0 ? `${days} gg` : "Scaduto"}
                      </span>
                    </td>
                    <td>
                      {days <= 0 && <span className="bdg er">Scaduto</span>}
                      {days > 0 && days <= 30 && <span className="bdg er">Critico</span>}
                      {days > 30 && days <= 90 && <span className="bdg wa">In scadenza</span>}
                      {days > 90 && <span className="bdg ok">OK</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
