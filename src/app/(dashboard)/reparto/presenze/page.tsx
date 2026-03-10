"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { LogIn, LogOut } from "lucide-react";

const TODAY_PUNCHES: Record<string, { in?: string; out?: string }> = {
  "1": { in: "08:02" },
  "2": { in: "08:15", out: "12:30" },
  "3": { in: "09:45" },
  "4": { in: "08:00", out: "17:00" },
};

export default function RepartoPresenzePage() {
  const { collaboratori, currentUserId } = useHRStore();
  const me = collaboratori.find((c) => c.id === currentUserId);
  const myDept = me?.dept ?? "";
  const list = collaboratori.filter((c) => c.attivo && c.dept === myDept);

  return (
    <>
      <Header title="Presenze Reparto" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Presenze reparto</div>
            <div className="ss">{myDept} — {new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</div>
          </div>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Ingresso</th>
                <th>Uscita</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const p = TODAY_PUNCHES[c.id];
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar ini={c.ini} color={c.col} size="sm" />
                        <span className="t-main">{c.full}</span>
                      </div>
                    </td>
                    <td>{p?.in ? <span className="ts-punch in"><LogIn size={11} /> {p.in}</span> : <span className="muted">—</span>}</td>
                    <td>{p?.out ? <span className="ts-punch out"><LogOut size={11} /> {p.out}</span> : <span className="muted">—</span>}</td>
                    <td>
                      {p?.in && !p.out && <span className="bdg ok">In sede</span>}
                      {p?.in && p.out && <span className="bdg ac">Uscito</span>}
                      {!p?.in && <span className="bdg er">Assente</span>}
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
