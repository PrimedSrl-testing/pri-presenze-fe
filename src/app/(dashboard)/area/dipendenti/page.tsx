"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Search } from "lucide-react";

export default function AreaDipendentiPage() {
  const { collaboratori } = useHRStore();
  const [q, setQ] = useState("");

  const list = collaboratori.filter(
    (c) =>
      c.attivo &&
      (c.full.toLowerCase().includes(q.toLowerCase()) ||
        c.dept.toLowerCase().includes(q.toLowerCase()))
  );

  // Group by dept
  const byDept: Record<string, typeof list> = {};
  list.forEach((c) => {
    if (!byDept[c.dept]) byDept[c.dept] = [];
    byDept[c.dept].push(c);
  });

  return (
    <>
      <Header title="Dipendenti Area" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Dipendenti dell&apos;area</div>
            <div className="ss">{list.length} dipendenti in {Object.keys(byDept).length} reparti</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="sbr" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ color: "var(--tm)" }} />
            <input
              placeholder="Cerca dipendente o reparto…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {Object.entries(byDept).map(([dept, members]) => (
          <div key={dept} className="card2" style={{ marginBottom: 14 }}>
            <div className="ctit">{dept} <span className="tc">{members.length}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {members.map((c) => (
                <div key={c.id} className="er_">
                  <Avatar ini={c.ini} color={c.col} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full}</div>
                    <div style={{ fontSize: 11.5, color: "var(--tm)" }}>{c.mansione}</div>
                  </div>
                  <span className={`status-dot ${c.status === "IN" ? "in" : "out"}`}>
                    <span className="dot" />
                    {c.status === "IN" ? "Presente" : "Assente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
