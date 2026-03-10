"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Search } from "lucide-react";

export default function RepartoDipendentiPage() {
  const { collaboratori, currentUserId } = useHRStore();
  const [q, setQ] = useState("");

  // Trova reparto del manager corrente
  const me = collaboratori.find((c) => c.id === currentUserId);
  const myDept = me?.dept ?? "";

  const list = collaboratori.filter(
    (c) =>
      c.attivo &&
      c.dept === myDept &&
      (c.full.toLowerCase().includes(q.toLowerCase()) || c.mansione.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <Header title="Dipendenti Reparto" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Dipendenti del reparto</div>
            <div className="ss">{myDept} — {list.length} dipendenti</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="sbr" style={{ flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ color: "var(--tm)" }} />
            <input
              placeholder="Cerca dipendente…"
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
                        <div className="t-main">{c.full}</div>
                        <div style={{ fontSize: 11, color: "var(--tm)" }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{c.mansione}</td>
                  <td><span className={`bdg ${c.tempo === "Indeterminato" ? "ok" : "wa"}`}>{c.tempo}</span></td>
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
                  <td colSpan={4} style={{ textAlign: "center", padding: 28, color: "var(--tm)" }}>
                    Nessun dipendente nel reparto
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
