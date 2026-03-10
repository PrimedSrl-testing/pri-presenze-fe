"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { AlertTriangle, Calendar, FileText } from "lucide-react";

interface ScadenzaPersonale {
  id: string;
  tipo: string;
  scadenza: string;
  note: string;
  urgenza: "alta" | "media" | "bassa";
}

const SCADENZE_MOCK: Record<string, ScadenzaPersonale[]> = {
  "3": [
    { id: "s1", tipo: "Visita medica periodica",    scadenza: "2026-03-25", note: "Prenotare presso medico competente",       urgenza: "alta"  },
    { id: "s2", tipo: "Formazione antincendio",      scadenza: "2026-04-15", note: "Corso online obbligatorio (2h)",           urgenza: "media" },
    { id: "s3", tipo: "Aggiornamento privacy GDPR",  scadenza: "2026-05-31", note: "Modulo e-learning su portale aziendale",  urgenza: "bassa" },
  ],
};

const URG_STYLE: Record<string, string> = { alta: "er", media: "wa", bassa: "in" };

function daysDiff(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ScadenzePersonaliPage() {
  const { currentUserId } = useHRStore();
  const scadenze = SCADENZE_MOCK[currentUserId] ?? [];

  const critiche = scadenze.filter((s) => daysDiff(s.scadenza) <= 30).length;

  return (
    <>
      <Header title="Scadenze personali" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Le mie scadenze</div>
            <div className="ss">{scadenze.length} scadenze registrate</div>
          </div>
          {critiche > 0 && (
            <span className="bdg wa">{critiche} in scadenza</span>
          )}
        </div>

        {critiche > 0 && (
          <div className="ab ab-w" style={{ marginBottom: 14 }}>
            <AlertTriangle size={15} />
            <span>Hai {critiche} scadenza/e entro 30 giorni. Controlla e provvedi per tempo.</span>
          </div>
        )}

        {scadenze.length === 0 ? (
          <div className="card2" style={{ textAlign: "center", padding: 40 }}>
            <Calendar size={32} style={{ color: "var(--tm)", margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nessuna scadenza</div>
            <div style={{ fontSize: 12.5, color: "var(--tm)" }}>Non hai scadenze personali registrate.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scadenze.map((s) => {
              const days = daysDiff(s.scadenza);
              return (
                <div key={s.id} className={`ci${s.urgenza === "alta" && days <= 30 ? " er" : s.urgenza === "media" ? " wa" : ""}`}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `var(--${URG_STYLE[s.urgenza]}l)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={16} style={{ color: `var(--${URG_STYLE[s.urgenza]})` }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.tipo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--tm)", marginTop: 2 }}>{s.note}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.scadenza}</div>
                    <div style={{ fontSize: 11, color: days <= 30 ? "var(--er)" : "var(--tm)", marginTop: 2 }}>
                      {days > 0 ? `${days} giorni` : "Scaduta"}
                    </div>
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
