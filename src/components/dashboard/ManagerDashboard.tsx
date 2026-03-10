"use client";

import { useState } from "react";
import { Users, UserCheck, AlertTriangle, ClipboardList, CheckCircle, XCircle } from "lucide-react";
import { useHRStore, useToastStore } from "@/lib/store";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate, getContractUrgency, daysUntil } from "@/lib/utils/date";
import { CAUSALI_DEFAULT } from "@/lib/data/causali";
import type { Richiesta } from "@/types";

export function ManagerDashboard() {
  const { collaboratori, richieste, anomalie, approveRichiesta, rejectRichiesta } = useHRStore();
  const { showToast } = useToastStore();
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean; richiesta?: Richiesta; action?: "approve" | "reject";
  }>({ open: false });
  const [notaMgr, setNotaMgr] = useState("");

  const attivi = collaboratori.filter((c) => c.attivo);
  const presenti = attivi.filter((c) => c.status === "IN").length;
  const anomalieAperte = anomalie.filter((a) => a.stato === "aperta").length;
  const pending = richieste.filter((r) => r.stato === "pending").length;

  const contrattiInScadenza = collaboratori
    .filter((c) => c.fin_contratto && getContractUrgency(c.fin_contratto))
    .sort((a, b) => daysUntil(a.fin_contratto!) - daysUntil(b.fin_contratto!))
    .slice(0, 5);

  function openApproval(r: Richiesta, action: "approve" | "reject") {
    setNotaMgr("");
    setApprovalModal({ open: true, richiesta: r, action });
  }

  function handleApproval() {
    const { richiesta, action } = approvalModal;
    if (!richiesta) return;
    if (action === "approve") {
      approveRichiesta(richiesta.id, notaMgr, "1");
      showToast("Richiesta approvata", "ok");
    } else {
      rejectRichiesta(richiesta.id, notaMgr);
      showToast("Richiesta rifiutata", "info");
    }
    setApprovalModal({ open: false });
  }

  const getCausaleNome = (id: string) => CAUSALI_DEFAULT.find((c) => c.id === id)?.nome ?? id;
  const getEmpName = (id: string) => collaboratori.find((c) => c.id === id)?.full ?? id;

  function urgencyVariant(u: string | null) {
    if (u === "critica") return "er" as const;
    if (u === "alta") return "wa" as const;
    return "in" as const;
  }

  return (
    <div>
      {/* KPI */}
      <div className="g4" style={{ marginBottom: 24 }}>
        <KpiCard label="Team" value={attivi.length} icon={Users} iconBg="var(--acl)" iconColor="var(--ac)" />
        <KpiCard label="Presenti" value={presenti} icon={UserCheck} iconBg="var(--okl)" iconColor="var(--ok)"
          trend={{ value: `${Math.round((presenti / (attivi.length || 1)) * 100)}%`, positive: true }} />
        <KpiCard label="Anomalie aperte" value={anomalieAperte} icon={AlertTriangle} iconBg="var(--wal)" iconColor="var(--wa)" />
        <KpiCard label="Richieste pending" value={pending} icon={ClipboardList} iconBg="var(--inl)" iconColor="var(--in)" />
      </div>

      <div className="g2" style={{ marginBottom: 24 }}>
        {/* Contratti in scadenza */}
        <div className="card">
          <p className="card-title">Contratti in scadenza</p>
          {contrattiInScadenza.length === 0
            ? <p className="muted">Nessun contratto in scadenza nei prossimi 90 giorni</p>
            : contrattiInScadenza.map((c) => {
              const u = getContractUrgency(c.fin_contratto);
              const days = daysUntil(c.fin_contratto!);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Avatar ini={c.ini} color={c.col} size="sm" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t)" }}>{c.full}</p>
                    <p className="muted">{c.dept}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="muted mono" style={{ fontSize: 12 }}>{formatDate(c.fin_contratto!)}</p>
                    <Badge variant={urgencyVariant(u)}>{days < 0 ? "Scaduto" : `${days}gg`}</Badge>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Richieste pending */}
        <div className="card">
          <p className="card-title">Richieste da approvare</p>
          {richieste.filter((r) => r.stato === "pending").length === 0
            ? <p className="muted">Nessuna richiesta in attesa</p>
            : richieste.filter((r) => r.stato === "pending").map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", border: "1px solid var(--bdr)",
                borderRadius: "var(--r2)", marginBottom: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t)" }}>{getEmpName(r.empId)}</p>
                  <p className="muted">{getCausaleNome(r.causaleId)} · {formatDate(r.dal)}{r.al !== r.dal ? ` → ${formatDate(r.al)}` : ""}</p>
                </div>
                <button className="icon-btn" onClick={() => openApproval(r, "approve")} title="Approva"
                  style={{ color: "var(--ok)", borderColor: "var(--okl)" }}>
                  <CheckCircle size={15} />
                </button>
                <button className="icon-btn" onClick={() => openApproval(r, "reject")} title="Rifiuta"
                  style={{ color: "var(--er)", borderColor: "var(--erl)" }}>
                  <XCircle size={15} />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Team overview */}
      <div className="tw">
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--t)" }}>Panoramica team</p>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Collaboratore</th>
              <th>Reparto</th>
              <th>Presenza</th>
              <th>Ore sett.</th>
              <th>Anomalie</th>
            </tr>
          </thead>
          <tbody>
            {attivi.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar ini={c.ini} color={c.col} size="sm" />
                    <span className="t-main">{c.full}</span>
                  </div>
                </td>
                <td>{c.dept}</td>
                <td>
                  <span className={`dot-presence ${c.status === "IN" ? "in" : "out"}`}>
                    {c.status === "IN" ? "Presente" : "Assente"}
                  </span>
                </td>
                <td><span className="mono">{c.hours ?? 40}h</span></td>
                <td>{(c.anom ?? 0) > 0 ? <Badge variant="wa">{c.anom}</Badge> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval modal */}
      <Modal
        open={approvalModal.open}
        onClose={() => setApprovalModal({ open: false })}
        title={approvalModal.action === "approve" ? "Approva richiesta" : "Rifiuta richiesta"}
        footer={<>
          <Button variant="secondary" onClick={() => setApprovalModal({ open: false })}>Annulla</Button>
          <Button variant={approvalModal.action === "approve" ? "primary" : "danger"} onClick={handleApproval}>
            {approvalModal.action === "approve" ? "Approva" : "Rifiuta"}
          </Button>
        </>}
      >
        {approvalModal.richiesta && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--bgs)", borderRadius: "var(--r2)", padding: 14, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <p><span style={{ fontWeight: 600 }}>Dipendente:</span> {getEmpName(approvalModal.richiesta.empId)}</p>
              <p><span style={{ fontWeight: 600 }}>Causale:</span> {getCausaleNome(approvalModal.richiesta.causaleId)}</p>
              <p><span style={{ fontWeight: 600 }}>Periodo:</span> {formatDate(approvalModal.richiesta.dal)} → {formatDate(approvalModal.richiesta.al)}</p>
              {approvalModal.richiesta.note && <p><span style={{ fontWeight: 600 }}>Note:</span> {approvalModal.richiesta.note}</p>}
            </div>
            <div>
              <label className="lbl">Nota manager (opzionale)</label>
              <textarea className="fi" rows={3} value={notaMgr} onChange={(e) => setNotaMgr(e.target.value)} placeholder="Aggiungi una nota…" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
