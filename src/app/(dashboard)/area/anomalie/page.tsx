"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle } from "lucide-react";

const GRAVITA_STYLE: Record<string, string> = { alta: "er", media: "wa", bassa: "in" };
const TIPO_LABELS: Record<string, string> = {
  timbratura_mancante: "Timbratura mancante",
  orario_insufficiente: "Orario insufficiente",
  assenza_ingiustificata: "Assenza ingiustificata",
  ritardo: "Ritardo",
  uscita_anticipata: "Uscita anticipata",
};

export default function AreaAnomaliePage() {
  const { anomalie, collaboratori, resolveAnomalia, currentUserId } = useHRStore();
  const aperte = anomalie.filter((a) => a.stato === "aperta");

  function getCollab(id: string) {
    return collaboratori.find((c) => c.id === id);
  }

  return (
    <>
      <Header title="Anomalie Area" />
      <div className="pg anim-fi">
        <div className="sh">
          <div>
            <div className="stit">Anomalie area</div>
            <div className="ss">{aperte.length} anomalie aperte su tutti i reparti</div>
          </div>
          {aperte.length > 0 && <span className="bdg er">{aperte.length} aperte</span>}
        </div>

        {aperte.length === 0 ? (
          <div className="ab ab-ok">
            <CheckCircle size={16} />
            <span>Nessuna anomalia aperta.</span>
          </div>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Gravità</th>
                  <th>Descrizione</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {aperte.map((a) => {
                  const c = getCollab(a.empId);
                  return (
                    <tr key={a.id}>
                      <td>
                        {c ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar ini={c.ini} color={c.col} size="sm" />
                            <span className="t-main">{c.full}</span>
                          </div>
                        ) : a.empId}
                      </td>
                      <td>{a.date}</td>
                      <td>{TIPO_LABELS[a.tipo] ?? a.tipo}</td>
                      <td><span className={`bdg ${GRAVITA_STYLE[a.gravita]}`}>{a.gravita}</span></td>
                      <td style={{ fontSize: 12 }}>{a.descrizione}</td>
                      <td>
                        <button
                          className="btn bp sm"
                          onClick={() => resolveAnomalia(a.id, "Risolto dal manager", currentUserId)}
                        >
                          Risolvi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
