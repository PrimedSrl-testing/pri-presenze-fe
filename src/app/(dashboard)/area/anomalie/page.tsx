"use client";

import { Header } from "@/components/layout/Header";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { CheckCircle } from "lucide-react";
import type { Anomalia } from "@/types";

const GRAVITA_STYLE: Record<string, string> = { alta: "er", media: "wa", bassa: "in" };
const TIPO_LABELS: Record<string, string> = {
  timbratura_mancante: "Timbratura mancante", orario_insufficiente: "Orario insufficiente",
  assenza_ingiustificata: "Assenza ingiustificata", ritardo: "Ritardo", uscita_anticipata: "Uscita anticipata",
};

export default function AreaAnomaliePage() {
  const { anomalie, collaboratori, resolveAnomalia, currentUserId } = useHRStore();
  const aperte = anomalie.filter((a) => a.stato === "aperta");
  const getCollab = (id: string) => collaboratori.find((c) => c.id === id);

  const columns: Column<Anomalia>[] = [
    { key: "dipendente", label: "Dipendente", getValue: (a) => getCollab(a.empId)?.full ?? a.empId, render: (a) => {
      const c = getCollab(a.empId);
      return c ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar ini={c.ini} color={c.col} size="sm" /><span>{c.full}</span></div> : <span>{a.empId}</span>;
    }},
    { key: "data", label: "Data", getValue: (a) => a.date },
    { key: "tipo", label: "Tipo", getValue: (a) => TIPO_LABELS[a.tipo] ?? a.tipo },
    { key: "gravita", label: "Gravita", getValue: (a) => a.gravita, render: (a) => <span className={`bdg ${GRAVITA_STYLE[a.gravita]}`}>{a.gravita}</span> },
    { key: "desc", label: "Descrizione", getValue: (a) => a.descrizione, render: (a) => <span style={{ fontSize: 12 }}>{a.descrizione}</span> },
    { key: "azione", label: "Azione", sortable: false, searchable: false, getValue: () => "", render: (a) => (
      <button className="btn bp sm" onClick={() => resolveAnomalia(a.id, "Risolto dal manager", currentUserId)}>Risolvi</button>
    )},
  ];

  return (
    <>
      <Header title="Anomalie Area" />
      <div className="pg anim-fi">
        <div className="sh">
          <div><div className="stit">Anomalie area</div><div className="ss">{aperte.length} anomalie aperte</div></div>
          {aperte.length > 0 && <span className="bdg er">{aperte.length} aperte</span>}
        </div>
        {aperte.length === 0 ? (
          <div className="ab ab-ok"><CheckCircle size={16} /><span>Nessuna anomalia aperta.</span></div>
        ) : (
          <div className="card" style={{ padding: 0, marginTop: 16 }}>
            <SortableTable<Anomalia> columns={columns} data={aperte} rowKey={(a) => a.id} emptyMessage="Nessuna anomalia" />
          </div>
        )}
      </div>
    </>
  );
}
