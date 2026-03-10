"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle, XCircle } from "lucide-react";

export default function AreaApprovazioniPage() {
  const { richieste, collaboratori, causali, approveRichiesta, rejectRichiesta, currentUserId } = useHRStore();
  const pending = richieste.filter((r) => r.stato === "pending");

  function getCollab(id: string) { return collaboratori.find((c) => c.id === id); }
  function getCausale(id: string) { return causali.find((c) => c.id === id); }

  return (
    <>
      <Header title="Approvazioni Area" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Approvazioni area</div>
            <div className="ss">{pending.length} richieste in attesa di approvazione</div>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="ab ab-ok">
            <CheckCircle size={16} />
            <span>Nessuna richiesta in attesa.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((r) => {
              const c = getCollab(r.empId);
              const caus = getCausale(r.causaleId);
              return (
                <div key={r.id} className="card2" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {c && <Avatar ini={c.ini} color={c.col} size="sm" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c?.full ?? r.empId}</div>
                    <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 2 }}>
                      {caus?.nome ?? r.causaleId} — {r.dal}{r.al !== r.dal ? ` → ${r.al}` : ""}
                    </div>
                    {r.note && <div style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 3 }}>{r.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn bs sm"
                      style={{ color: "var(--er)" }}
                      onClick={() => rejectRichiesta(r.id, "Rifiutata dall'area manager")}
                    >
                      <XCircle size={13} /> Rifiuta
                    </button>
                    <button
                      className="btn bp sm"
                      onClick={() => approveRichiesta(r.id, "Approvata", currentUserId)}
                    >
                      <CheckCircle size={13} /> Approva
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
