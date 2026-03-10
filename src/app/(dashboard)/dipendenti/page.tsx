"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Search } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  dipendente: "Dipendente",
  libero_prof: "Lib. Professionista",
  consulente: "Consulente",
  stagista: "Stagista",
  apprendista: "Apprendista",
  somministrato: "Somministrato",
};

export default function DipendentiPage() {
  const { collaboratori } = useHRStore();
  const [q, setQ] = useState("");

  const list = collaboratori.filter(
    (c) =>
      c.attivo &&
      (c.full.toLowerCase().includes(q.toLowerCase()) ||
        c.dept.toLowerCase().includes(q.toLowerCase()) ||
        c.mat.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <Header title="Dipendenti" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Dipendenti</div>
            <div className="ss">{list.length} dipendenti attivi</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="sbr" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ color: "var(--tm)" }} />
            <input
              placeholder="Cerca dipendente, reparto, matricola…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Matricola</th>
                <th>Reparto</th>
                <th>Mansione</th>
                <th>Contratto</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Avatar ini={c.ini} color={c.col} size="sm" />
                      <div>
                        <div className="t-main" style={{ fontWeight: 600, color: "var(--t)" }}>{c.full}</div>
                        <div style={{ fontSize: 11, color: "var(--tm)" }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{c.mat}</span></td>
                  <td>{c.dept}</td>
                  <td>{c.mansione}</td>
                  <td>
                    <span className={`bdg ${c.tempo === "Indeterminato" ? "ok" : "wa"}`}>
                      {c.tempo}
                    </span>
                  </td>
                  <td>
                    <span className={`status-dot ${c.status === "IN" ? "in" : "out"}`}>
                      <span className="dot" />
                      {c.status === "IN" ? "Presente" : "Assente"}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--tm)" }}>
                    Nessun dipendente trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
