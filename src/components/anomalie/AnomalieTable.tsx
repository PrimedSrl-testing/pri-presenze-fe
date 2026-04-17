"use client";

import { useState } from "react";
import { useHRStore, useToastStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { formatDate } from "@/lib/utils/date";
import type { Anomalia, GravitaAnomalia, StatoAnomalia, TipoAnomalia } from "@/types";

const GRAVITA_V: Record<GravitaAnomalia, "er" | "wa" | "in"> = { alta: "er", media: "wa", bassa: "in" };
const TIPO_LABELS: Record<TipoAnomalia, string> = {
  timbratura_mancante: "Timbratura mancante", orario_insufficiente: "Orario insufficiente",
  assenza_ingiustificata: "Assenza ingiustificata", ritardo: "Ritardo", uscita_anticipata: "Uscita anticipata",
};

export function AnomalieTable() {
  const { anomalie, collaboratori, resolveAnomalia } = useHRStore();
  const { showToast } = useToastStore();
  const [fStato, setFStato] = useState<StatoAnomalia | "all">("all");
  const [fGravita, setFGravita] = useState<GravitaAnomalia | "all">("all");
  const [detail, setDetail] = useState<{ open: boolean; anomalia?: Anomalia }>({ open: false });
  const [risoluzione, setRisoluzione] = useState("");

  const filtered = anomalie.filter((a) => {
    return (fStato === "all" || a.stato === fStato) && (fGravita === "all" || a.gravita === fGravita);
  });

  const getEmp = (id: string) => collaboratori.find((c) => c.id === id);

  function handleResolve() {
    if (!detail.anomalia) return;
    resolveAnomalia(detail.anomalia.id, risoluzione, "1");
    showToast("Anomalia risolta", "ok");
    setDetail({ open: false });
  }

  const columns: Column<Anomalia>[] = [
    { key: "data", label: "Data", getValue: (a) => a.date, render: (a) => <span style={{ fontSize: 12.5, fontFamily: "var(--m)" }}>{formatDate(a.date)}</span> },
    { key: "dipendente", label: "Dipendente", getValue: (a) => getEmp(a.empId)?.full ?? a.empId, render: (a) => {
      const emp = getEmp(a.empId);
      return emp ? <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Avatar ini={emp.ini} color={emp.col} size="sm" /><span>{emp.full}</span></div> : <span>{a.empId}</span>;
    }},
    { key: "tipo", label: "Tipo", getValue: (a) => TIPO_LABELS[a.tipo] },
    { key: "gravita", label: "Gravita", getValue: (a) => a.gravita, render: (a) => <Badge variant={GRAVITA_V[a.gravita]}>{a.gravita.charAt(0).toUpperCase() + a.gravita.slice(1)}</Badge> },
    { key: "stato", label: "Stato", getValue: (a) => a.stato, render: (a) => <Badge variant={a.stato === "risolta" ? "ok" : a.stato === "in_lavorazione" ? "in" : "wa"}>{a.stato === "aperta" ? "Aperta" : a.stato === "in_lavorazione" ? "In lavorazione" : "Risolta"}</Badge> },
    { key: "desc", label: "Descrizione", getValue: (a) => a.descrizione, render: (a) => <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{a.descrizione}</span> },
    { key: "azione", label: "", sortable: false, searchable: false, getValue: () => "", render: (a) => <Button variant="ghost" size="sm" onClick={() => { setRisoluzione(""); setDetail({ open: true, anomalia: a }); }}>Dettagli</Button> },
  ];

  return (
    <div>
      <div className="toolbar">
        <select className="fi" style={{ width: "auto" }} value={fStato} onChange={(e) => setFStato(e.target.value as StatoAnomalia | "all")}>
          <option value="all">Tutti gli stati</option>
          <option value="aperta">Aperta</option>
          <option value="in_lavorazione">In lavorazione</option>
          <option value="risolta">Risolta</option>
        </select>
        <select className="fi" style={{ width: "auto" }} value={fGravita} onChange={(e) => setFGravita(e.target.value as GravitaAnomalia | "all")}>
          <option value="all">Tutte le gravita</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="bassa">Bassa</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 12 }}>
        <SortableTable<Anomalia> columns={columns} data={filtered} rowKey={(a) => a.id} emptyMessage="Nessuna anomalia trovata" />
      </div>

      <Modal open={detail.open} onClose={() => setDetail({ open: false })} title="Dettaglio anomalia"
        footer={detail.anomalia?.stato !== "risolta"
          ? <><Button variant="secondary" onClick={() => setDetail({ open: false })}>Chiudi</Button><Button onClick={handleResolve}>Segna come risolta</Button></>
          : <Button variant="secondary" onClick={() => setDetail({ open: false })}>Chiudi</Button>}>
        {detail.anomalia && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--bgs)", borderRadius: "var(--r2)", padding: 14, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <p><span style={{ fontWeight: 600 }}>Data:</span> {formatDate(detail.anomalia.date)}</p>
              <p><span style={{ fontWeight: 600 }}>Tipo:</span> {TIPO_LABELS[detail.anomalia.tipo]}</p>
              <p><span style={{ fontWeight: 600 }}>Gravita:</span> <Badge variant={GRAVITA_V[detail.anomalia.gravita]}>{detail.anomalia.gravita}</Badge></p>
              <p><span style={{ fontWeight: 600 }}>Descrizione:</span> {detail.anomalia.descrizione}</p>
              {detail.anomalia.risoluzione && <p><span style={{ fontWeight: 600 }}>Risoluzione:</span> {detail.anomalia.risoluzione}</p>}
            </div>
            {detail.anomalia.stato !== "risolta" && (
              <div><label className="lbl">Motivazione risoluzione</label><textarea className="fi" rows={3} value={risoluzione} onChange={(e) => setRisoluzione(e.target.value)} placeholder="Inserisci il motivo..." /></div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
