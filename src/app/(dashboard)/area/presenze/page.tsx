"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";

export default function AreaPresenzePage() {
  const { collaboratori } = useHRStore();
  const attivi = collaboratori.filter((c) => c.attivo);
  const presenti = attivi.filter((c) => c.status === "IN").length;
  const assenti = attivi.length - presenti;

  const byDept: Record<string, typeof attivi> = {};
  attivi.forEach((c) => {
    if (!byDept[c.dept]) byDept[c.dept] = [];
    byDept[c.dept].push(c);
  });

  return (
    <>
      <Header title="Presenze Area" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Presenze area</div>
            <div className="ss">{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
        </div>

        <div className="g3" style={{ marginBottom: 20 }}>
          <div className="kpi2">
            <div className="kpi-v" style={{ color: "var(--ok)" }}>{presenti}</div>
            <div className="kpi-l">Presenti</div>
          </div>
          <div className="kpi2">
            <div className="kpi-v" style={{ color: "var(--er)" }}>{assenti}</div>
            <div className="kpi-l">Assenti</div>
          </div>
          <div className="kpi2">
            <div className="kpi-v">{Math.round((presenti / attivi.length) * 100)}%</div>
            <div className="kpi-l">Presenza</div>
          </div>
        </div>

        {Object.entries(byDept).map(([dept, members]) => {
          const pres = members.filter((c) => c.status === "IN").length;
          return (
            <div key={dept} className="card2" style={{ marginBottom: 14 }}>
              <div className="ctit" style={{ justifyContent: "space-between" }}>
                <span>{dept}</span>
                <span>{pres}/{members.length} presenti</span>
              </div>
              <div className="pt" style={{ marginBottom: 12 }}>
                <div className="pf" style={{ width: `${Math.round((pres / members.length) * 100)}%`, background: "var(--ac)" }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {members.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: c.status === "IN" ? "var(--okl)" : "var(--bgm)" }}>
                    <Avatar ini={c.ini} color={c.col} size="sm" />
                    <span style={{ fontSize: 12, fontWeight: 500, color: c.status === "IN" ? "var(--ok)" : "var(--tm)" }}>
                      {c.fn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
