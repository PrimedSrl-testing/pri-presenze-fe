"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Search } from "lucide-react";

// Mock contatori per dipendente
const CONTATORI: Record<string, { ferie: number; ferieUsate: number; rol: number; extra: number }> = {
  "1": { ferie: 26, ferieUsate: 4,  rol: 32, extra: 8 },
  "2": { ferie: 26, ferieUsate: 10, rol: 18, extra: 2 },
  "3": { ferie: 26, ferieUsate: 8,  rol: 24, extra: 12 },
  "4": { ferie: 22, ferieUsate: 6,  rol: 20, extra: 0 },
  "5": { ferie: 26, ferieUsate: 14, rol: 16, extra: 4 },
  "6": { ferie: 26, ferieUsate: 2,  rol: 28, extra: 6 },
  "7": { ferie: 26, ferieUsate: 12, rol: 12, extra: 16 },
};

export default function ContatoriPage() {
  const { collaboratori } = useHRStore();
  const [q, setQ] = useState("");

  const list = collaboratori.filter(
    (c) =>
      c.attivo &&
      (c.full.toLowerCase().includes(q.toLowerCase()) || c.dept.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <Header title="Contatori" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Contatori ore</div>
            <div className="ss">Saldi ferie, ROL e straordinari — Marzo 2026</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="sbr" style={{ flex: 1, maxWidth: 320 }}>
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
                <th>Reparto</th>
                <th>Ferie residue</th>
                <th>ROL residuo</th>
                <th>Ore extra</th>
                <th>% Ferie usate</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const cnt = CONTATORI[c.id] ?? { ferie: 26, ferieUsate: 0, rol: 32, extra: 0 };
                const ferieRes = cnt.ferie - cnt.ferieUsate;
                const percFerie = Math.round((cnt.ferieUsate / cnt.ferie) * 100);
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
                      <span className={`gv${ferieRes < 5 ? "h" : ferieRes < 10 ? "m" : "l"}`}>
                        {ferieRes}g
                      </span>
                    </td>
                    <td>
                      <span className={`gv${cnt.rol < 8 ? "h" : cnt.rol < 16 ? "m" : "l"}`}>
                        {cnt.rol}h
                      </span>
                    </td>
                    <td>
                      {cnt.extra > 0
                        ? <span className="bdg wa">{cnt.extra}h</span>
                        : <span className="mono" style={{ fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="pt" style={{ flex: 1 }}>
                          <div
                            className="pf"
                            style={{
                              width: `${percFerie}%`,
                              background: percFerie > 70 ? "var(--er)" : percFerie > 40 ? "var(--wa)" : "var(--ok)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--tm)", width: 30, textAlign: "right" }}>
                          {percFerie}%
                        </span>
                      </div>
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
