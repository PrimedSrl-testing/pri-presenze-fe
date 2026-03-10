"use client";

import { useState } from "react";
import { useHRStore, useToastStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils/date";
import type { Anomalia, GravitaAnomalia, StatoAnomalia, TipoAnomalia } from "@/types";

const GRAVITA_V: Record<GravitaAnomalia, "er" | "wa" | "in"> = { alta: "er", media: "wa", bassa: "in" };
const TIPO_LABELS: Record<TipoAnomalia, string> = {
  timbratura_mancante:    "Timbratura mancante",
  orario_insufficiente:   "Orario insufficiente",
  assenza_ingiustificata: "Assenza ingiustificata",
  ritardo:                "Ritardo",
  uscita_anticipata:      "Uscita anticipata",
};

export function AnomalieTable() {
  const { anomalie, collaboratori, resolveAnomalia } = useHRStore();
  const { showToast } = useToastStore();
  const [fStato, setFStato] = useState<StatoAnomalia | "all">("all");
  const [fGravita, setFGravita] = useState<GravitaAnomalia | "all">("all");
  const [detail, setDetail] = useState<{ open: boolean; anomalia?: Anomalia }>({ open: false });
  const [risoluzione, setRisoluzione] = useState("");

  const filtered = anomalie.filter((a) => {
    const matchS = fStato === "all" || a.stato === fStato;
    const matchG = fGravita === "all" || a.gravita === fGravita;
    return matchS && matchG;
  });

  const getEmp = (id: string) => collaboratori.find((c) => c.id === id);

  function handleResolve() {
    if (!detail.anomalia) return;
    resolveAnomalia(detail.anomalia.id, risoluzione, "1");
    showToast("Anomalia risolta", "ok");
    setDetail({ open: false });
  }

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
          <option value="all">Tutte le gravità</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="bassa">Bassa</option>
        </select>
      </div>

      <div className="tw">
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Dipendente</th>
              <th>Tipo</th>
              <th>Gravità</th>
              <th>Stato</th>
              <th>Descrizione</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const emp = getEmp(a.empId);
              return (
                <tr key={a.id} style={{ opacity: a.stato === "risolta" ? .6 : 1 }}>
                  <td className="mono t-main" style={{ fontSize: 12.5 }}>{formatDate(a.date)}</td>
                  <td>
                    {emp
                      ? <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar ini={emp.ini} color={emp.col} size="sm" />
                          <span className="t-main">{emp.full}</span>
                        </div>
                      : <span className="muted">{a.empId}</span>
                    }
                  </td>
                  <td>{TIPO_LABELS[a.tipo]}</td>
                  <td><Badge variant={GRAVITA_V[a.gravita]}>{a.gravita.charAt(0).toUpperCase() + a.gravita.slice(1)}</Badge></td>
                  <td>
                    <Badge variant={a.stato === "risolta" ? "ok" : a.stato === "in_lavorazione" ? "in" : "wa"}>
                      {a.stato === "aperta" ? "Aperta" : a.stato === "in_lavorazione" ? "In lavorazione" : "Risolta"}
                    </Badge>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {a.descrizione}
                    </span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => { setRisoluzione(""); setDetail({ open: true, anomalia: a }); }}>
                      Dettagli
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--tm)" }}>Nessuna anomalia trovata</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={detail.open}
        onClose={() => setDetail({ open: false })}
        title="Dettaglio anomalia"
        footer={
          detail.anomalia?.stato !== "risolta"
            ? <><Button variant="secondary" onClick={() => setDetail({ open: false })}>Chiudi</Button>
                <Button onClick={handleResolve}>Segna come risolta</Button></>
            : <Button variant="secondary" onClick={() => setDetail({ open: false })}>Chiudi</Button>
        }
      >
        {detail.anomalia && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--bgs)", borderRadius: "var(--r2)", padding: 14, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <p><span style={{ fontWeight: 600 }}>Data:</span> {formatDate(detail.anomalia.date)}</p>
              <p><span style={{ fontWeight: 600 }}>Tipo:</span> {TIPO_LABELS[detail.anomalia.tipo]}</p>
              <p><span style={{ fontWeight: 600 }}>Gravità:</span> <Badge variant={GRAVITA_V[detail.anomalia.gravita]}>{detail.anomalia.gravita}</Badge></p>
              <p><span style={{ fontWeight: 600 }}>Descrizione:</span> {detail.anomalia.descrizione}</p>
              {detail.anomalia.risoluzione && <p><span style={{ fontWeight: 600 }}>Risoluzione:</span> {detail.anomalia.risoluzione}</p>}
            </div>
            {detail.anomalia.stato !== "risolta" && (
              <div>
                <label className="lbl">Motivazione risoluzione</label>
                <textarea className="fi" rows={3} value={risoluzione} onChange={(e) => setRisoluzione(e.target.value)} placeholder="Inserisci il motivo della risoluzione…" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
