"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Mail, Phone, Briefcase, Calendar, Building2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  hr: "HR Admin",
  mgr: "Manager",
  amgr: "Area Manager",
  dip: "Dipendente",
};

export default function ProfiloPage() {
  const { collaboratori, currentUserId } = useHRStore();
  const me = collaboratori.find((c) => c.id === currentUserId);

  if (!me) {
    return (
      <>
        <Header title="Profilo" />
        <div className="pg">
          <div className="ab ab-e">Utente non trovato.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Profilo" />
      <div className="pg anim-fi">
        {/* Header profilo */}
        <div className="card2" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
            <Avatar ini={me.ini} color={me.col} size="lg" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.4px" }}>{me.full}</div>
              <div style={{ fontSize: 13, color: "var(--tm)", marginTop: 2 }}>{me.mansione}</div>
              <div style={{ marginTop: 6 }}>
                <span className="bdg ac">{ROLE_LABELS[me.role] ?? me.role}</span>
                {" "}
                <span className="bdg nn">{me.mat}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div className="sr">
              <span className="sl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={13} /> Email
              </span>
              <span className="sv">{me.email}</span>
            </div>
            <div className="sr">
              <span className="sl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={13} /> Telefono
              </span>
              <span className="sv">{me.phone || "—"}</span>
            </div>
            <div className="sr">
              <span className="sl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Briefcase size={13} /> Reparto
              </span>
              <span className="sv">{me.dept}</span>
            </div>
            <div className="sr">
              <span className="sl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={13} /> Azienda
              </span>
              <span className="sv">{me.societa}</span>
            </div>
            <div className="sr">
              <span className="sl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} /> Inizio contratto
              </span>
              <span className="sv">{me.ini_contratto}</span>
            </div>
            <div className="sr">
              <span className="sl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} /> Fine contratto
              </span>
              <span className="sv">{me.fin_contratto ?? "Indeterminato"}</span>
            </div>
          </div>
        </div>

        {/* Dati contrattuali */}
        <div className="card2">
          <div className="ctit">Dati contrattuali</div>
          <div className="sr">
            <span className="sl">Tipo contratto</span>
            <span className={`bdg ${me.tempo === "Indeterminato" ? "ok" : "wa"}`}>{me.tempo}</span>
          </div>
          <div className="sr">
            <span className="sl">Tipo collaborazione</span>
            <span className="sv" style={{ textTransform: "capitalize" }}>{me.tipo.replace("_", " ")}</span>
          </div>
          <div className="sr">
            <span className="sl">Compenso</span>
            <span className="sv">{me.compenso || "—"}</span>
          </div>
          <div className="sr">
            <span className="sl">Codice Fiscale</span>
            <span className="sv mono">{me.cf}</span>
          </div>
        </div>
      </div>
    </>
  );
}
