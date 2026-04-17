"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { KpiCard } from "@/components/ui/KpiCard";
import { CicliciTimeline } from "@/components/contratti-ciclici/CicliciTimeline";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Info,
  CalendarClock,
  Users,
  ToggleRight,
  Clock,
} from "lucide-react";
import type { ContrattoCiclico, DipendenteDB } from "@/types";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const MESI = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
] as const;

const currentYear = new Date().getFullYear();

type CiclicoDB = ContrattoCiclico & { dip_nome?: string; matricola?: string };

interface ContrattoTipo {
  ID: number;
  Nome: string;
  OreSett: number;
  OreMese: number;
  Giorni: number;
}

const emptyForm: Omit<ContrattoCiclico, "id"> = {
  dip_id: 0,
  periodo1_da_mese: 1,
  periodo1_da_giorno: 1,
  periodo1_ore_sett: 40,
  periodo1_contratto_id: null,
  periodo2_da_mese: 7,
  periodo2_da_giorno: 1,
  periodo2_ore_sett: 24,
  periodo2_contratto_id: null,
  override_data_switch1: null,
  override_data_switch2: null,
  anno_riferimento: null,
  attivo: true,
  note: null,
};

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function ContrattiCicliciPage() {
  /* ── State ───────────────────────────────────────────────────────────────── */
  const [rows, setRows] = useState<CiclicoDB[]>([]);
  const [dipendenti, setDipendenti] = useState<DipendenteDB[]>([]);
  const [contratti, setContratti] = useState<ContrattoTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<ContrattoCiclico, "id">>(emptyForm);

  /* Delete confirm */
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ── Fetch data ──────────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, dRes, cRes] = await Promise.all([
        fetch("/api/contratti-ciclici"),
        fetch("/api/dipendenti"),
        fetch("/api/contratti"),
      ]);
      const [rData, dData, cData] = await Promise.all([rRes.json(), dRes.json(), cRes.json()]);
      setRows(Array.isArray(rData) ? rData : []);
      setDipendenti(Array.isArray(dData) ? dData : []);
      setContratti(Array.isArray(cData) ? cData : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── KPI ─────────────────────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const totale = rows.length;
    const attivi = rows.filter((r) => r.attivo).length;
    const conOverride = rows.filter((r) => r.override_data_switch1 || r.override_data_switch2).length;
    const dipUnici = new Set(rows.map((r) => r.dip_id)).size;
    return { totale, attivi, conOverride, dipUnici };
  }, [rows]);

  /* ── Open modal for add ──────────────────────────────────────────────────── */
  const handleAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  /* ── Open modal for edit ─────────────────────────────────────────────────── */
  const handleEdit = (row: CiclicoDB) => {
    setEditId(row.id);
    setForm({
      dip_id: row.dip_id,
      periodo1_da_mese: row.periodo1_da_mese,
      periodo1_da_giorno: row.periodo1_da_giorno,
      periodo1_ore_sett: row.periodo1_ore_sett,
      periodo1_contratto_id: row.periodo1_contratto_id,
      periodo2_da_mese: row.periodo2_da_mese,
      periodo2_da_giorno: row.periodo2_da_giorno,
      periodo2_ore_sett: row.periodo2_ore_sett,
      periodo2_contratto_id: row.periodo2_contratto_id,
      override_data_switch1: row.override_data_switch1 ? row.override_data_switch1.slice(0, 10) : null,
      override_data_switch2: row.override_data_switch2 ? row.override_data_switch2.slice(0, 10) : null,
      anno_riferimento: row.anno_riferimento,
      attivo: row.attivo,
      note: row.note,
    });
    setModalOpen(true);
  };

  /* ── Save (create / update) ──────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.dip_id) return;
    setSaving(true);
    try {
      const url = editId ? `/api/contratti-ciclici/${editId}` : "/api/contratti-ciclici";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setModalOpen(false);
      fetchAll();
    } catch {
      // could hook into toast
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ──────────────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/contratti-ciclici/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      fetchAll();
    } catch {
      // silent
    }
  };

  /* ── Form helpers ────────────────────────────────────────────────────────── */
  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const meseOptions = MESI.map((m, i) => ({ value: i + 1, label: m }));
  const giornoOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  const getContrattoNome = (id: number | null) => {
    if (!id) return "-";
    return contratti.find((c) => c.ID === id)?.Nome ?? "-";
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Header title="Contratti Ciclici" />

      <div className="pg anim-fi">
        {/* ── Page heading ───────────────────────────────────────────────── */}
        <div className="sh">
          <div>
            <div className="stit">Contratti Ciclici</div>
            <div className="ss">
              Gestione automatica delle alternanze orarie per contratti stagionali
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus size={14} />
            Nuovo Contratto Ciclico
          </Button>
        </div>

        {/* ── Info banner ────────────────────────────────────────────────── */}
        <div className="ab ab-i" style={{ marginBottom: 16 }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Il sistema applica automaticamente il cambio orario nelle date configurate.
            Usa gli <strong>override</strong> per anticipare o posticipare il cambio per l&apos;anno corrente.
          </span>
        </div>

        {/* ── KPI cards ──────────────────────────────────────────────────── */}
        <div className="g4" style={{ marginBottom: 18 }}>
          <KpiCard
            label="Contratti Ciclici"
            value={kpi.totale}
            icon={CalendarClock}
            iconColor="var(--ac)"
            iconBg="var(--acl)"
          />
          <KpiCard
            label="Attivi"
            value={kpi.attivi}
            icon={ToggleRight}
            iconColor="var(--ok)"
            iconBg="var(--okl)"
          />
          <KpiCard
            label="Dipendenti Coinvolti"
            value={kpi.dipUnici}
            icon={Users}
            iconColor="var(--in)"
            iconBg="var(--inl)"
          />
          <KpiCard
            label="Con Override"
            value={kpi.conOverride}
            icon={Clock}
            iconColor="var(--wa)"
            iconBg="var(--wal)"
          />
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="tw" style={{ padding: 48, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: 24,
                height: 24,
                border: "3px solid var(--bdr)",
                borderTopColor: "var(--ac)",
                borderRadius: "50%",
                animation: "sp .6s linear infinite",
              }}
            />
            <p style={{ marginTop: 10, color: "var(--tm)", fontSize: 13 }}>
              Caricamento contratti ciclici...
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="tw" style={{ padding: 48, textAlign: "center" }}>
            <CalendarClock size={36} style={{ color: "var(--bdr)", marginBottom: 10 }} />
            <p style={{ color: "var(--tm)", fontSize: 13 }}>
              Nessun contratto ciclico configurato.
            </p>
            <Button
              variant="secondary"
              size="sm"
              style={{ marginTop: 12 }}
              onClick={handleAdd}
            >
              <Plus size={14} /> Aggiungi il primo
            </Button>
          </div>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Periodo 1</th>
                  <th>Periodo 2</th>
                  <th style={{ minWidth: 220 }}>Timeline</th>
                  <th>Override Anno Corrente</th>
                  <th>Stato</th>
                  <th style={{ textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {/* Dipendente */}
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--t)", fontSize: 13 }}>
                        {r.dip_nome ?? `Dip #${r.dip_id}`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--tm)" }}>
                        {r.matricola ?? ""}
                      </div>
                    </td>

                    {/* Periodo 1 */}
                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ fontWeight: 600 }}>
                          {r.periodo1_da_giorno} {MESI[r.periodo1_da_mese - 1]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--tm)" }}>
                        {r.periodo1_ore_sett}h/sett
                        {r.periodo1_contratto_id ? ` - ${getContrattoNome(r.periodo1_contratto_id)}` : ""}
                      </div>
                    </td>

                    {/* Periodo 2 */}
                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ fontWeight: 600 }}>
                          {r.periodo2_da_giorno} {MESI[r.periodo2_da_mese - 1]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--tm)" }}>
                        {r.periodo2_ore_sett}h/sett
                        {r.periodo2_contratto_id ? ` - ${getContrattoNome(r.periodo2_contratto_id)}` : ""}
                      </div>
                    </td>

                    {/* Timeline */}
                    <td>
                      <CicliciTimeline
                        periodo1_da_mese={r.periodo1_da_mese}
                        periodo2_da_mese={r.periodo2_da_mese}
                        periodo1_ore_sett={r.periodo1_ore_sett}
                        periodo2_ore_sett={r.periodo2_ore_sett}
                      />
                    </td>

                    {/* Override */}
                    <td>
                      {r.override_data_switch1 || r.override_data_switch2 ? (
                        <div style={{ fontSize: 11.5 }}>
                          {r.override_data_switch1 && (
                            <div>
                              <Badge variant="ac">P1</Badge>{" "}
                              {new Date(r.override_data_switch1).toLocaleDateString("it-IT")}
                            </div>
                          )}
                          {r.override_data_switch2 && (
                            <div style={{ marginTop: 3 }}>
                              <Badge variant="pu">P2</Badge>{" "}
                              {new Date(r.override_data_switch2).toLocaleDateString("it-IT")}
                            </div>
                          )}
                          {r.anno_riferimento && (
                            <div style={{ color: "var(--tm)", fontSize: 10, marginTop: 2 }}>
                              Anno {r.anno_riferimento}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--tm)", fontSize: 12 }}>Nessuno</span>
                      )}
                    </td>

                    {/* Stato */}
                    <td>
                      <Badge variant={r.attivo ? "ok" : "nn"}>
                        {r.attivo ? "Attivo" : "Disattivato"}
                      </Badge>
                    </td>

                    {/* Azioni */}
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(r)}>
                          <Pencil size={13} />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
       *  Modal — Add / Edit
       * ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Modifica Contratto Ciclico" : "Nuovo Contratto Ciclico"}
        size="lg"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.dip_id}>
              {saving ? "Salvataggio..." : editId ? "Salva Modifiche" : "Crea Contratto"}
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          {/* ── Dipendente ──────────────────────────────────────────────── */}
          <div className="full">
            <label className="lbl">Dipendente</label>
            <select
              className="fi"
              value={form.dip_id || ""}
              onChange={(e) => setField("dip_id", Number(e.target.value))}
            >
              <option value="">-- Seleziona dipendente --</option>
              {dipendenti.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({d.matricola})
                </option>
              ))}
            </select>
          </div>

          {/* ── PERIODO 1 ──────────────────────────────────────────────── */}
          <div className="full" style={{ marginTop: 8 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "var(--ac)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "var(--ac)",
                  display: "inline-block",
                }}
              />
              Periodo 1
            </div>
          </div>

          <div>
            <label className="lbl">Mese inizio</label>
            <select
              className="fi"
              value={form.periodo1_da_mese}
              onChange={(e) => setField("periodo1_da_mese", Number(e.target.value))}
            >
              {meseOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">Giorno inizio</label>
            <select
              className="fi"
              value={form.periodo1_da_giorno}
              onChange={(e) => setField("periodo1_da_giorno", Number(e.target.value))}
            >
              {giornoOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">Ore settimanali</label>
            <input
              type="number"
              className="fi"
              min={0}
              max={48}
              step={0.5}
              value={form.periodo1_ore_sett}
              onChange={(e) => setField("periodo1_ore_sett", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="lbl">Tipo contratto</label>
            <select
              className="fi"
              value={form.periodo1_contratto_id ?? ""}
              onChange={(e) =>
                setField("periodo1_contratto_id", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">-- Nessuno --</option>
              {contratti.map((c) => (
                <option key={c.ID} value={c.ID}>
                  {c.Nome} ({c.OreSett}h/sett)
                </option>
              ))}
            </select>
          </div>

          {/* ── PERIODO 2 ──────────────────────────────────────────────── */}
          <div className="full" style={{ marginTop: 8 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "var(--pu)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "var(--pu)",
                  display: "inline-block",
                }}
              />
              Periodo 2
            </div>
          </div>

          <div>
            <label className="lbl">Mese inizio</label>
            <select
              className="fi"
              value={form.periodo2_da_mese}
              onChange={(e) => setField("periodo2_da_mese", Number(e.target.value))}
            >
              {meseOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">Giorno inizio</label>
            <select
              className="fi"
              value={form.periodo2_da_giorno}
              onChange={(e) => setField("periodo2_da_giorno", Number(e.target.value))}
            >
              {giornoOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">Ore settimanali</label>
            <input
              type="number"
              className="fi"
              min={0}
              max={48}
              step={0.5}
              value={form.periodo2_ore_sett}
              onChange={(e) => setField("periodo2_ore_sett", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="lbl">Tipo contratto</label>
            <select
              className="fi"
              value={form.periodo2_contratto_id ?? ""}
              onChange={(e) =>
                setField("periodo2_contratto_id", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">-- Nessuno --</option>
              {contratti.map((c) => (
                <option key={c.ID} value={c.ID}>
                  {c.Nome} ({c.OreSett}h/sett)
                </option>
              ))}
            </select>
          </div>

          {/* ── OVERRIDE ───────────────────────────────────────────────── */}
          <div className="full" style={{ marginTop: 8 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "var(--wa)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "var(--wa)",
                  display: "inline-block",
                }}
              />
              Override Anno Corrente
            </div>
          </div>

          <div>
            <label className="lbl">Anno di riferimento</label>
            <input
              type="number"
              className="fi"
              min={currentYear - 1}
              max={currentYear + 2}
              value={form.anno_riferimento ?? ""}
              placeholder={String(currentYear)}
              onChange={(e) =>
                setField("anno_riferimento", e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>

          <div>
            <label className="lbl">Data switch Periodo 1</label>
            <input
              type="date"
              className="fi"
              value={form.override_data_switch1 ?? ""}
              onChange={(e) =>
                setField("override_data_switch1", e.target.value || null)
              }
            />
          </div>

          <div>
            <label className="lbl">Data switch Periodo 2</label>
            <input
              type="date"
              className="fi"
              value={form.override_data_switch2 ?? ""}
              onChange={(e) =>
                setField("override_data_switch2", e.target.value || null)
              }
            />
          </div>

          {/* ── Timeline preview ────────────────────────────────────────── */}
          {form.dip_id > 0 && (
            <div className="full" style={{ marginTop: 8 }}>
              <label className="lbl" style={{ marginBottom: 6 }}>Anteprima Timeline</label>
              <CicliciTimeline
                periodo1_da_mese={form.periodo1_da_mese}
                periodo2_da_mese={form.periodo2_da_mese}
                periodo1_ore_sett={form.periodo1_ore_sett}
                periodo2_ore_sett={form.periodo2_ore_sett}
              />
            </div>
          )}

          {/* ── Note ───────────────────────────────────────────────────── */}
          <div className="full" style={{ marginTop: 4 }}>
            <label className="lbl">Note</label>
            <textarea
              className="fi"
              rows={3}
              value={form.note ?? ""}
              placeholder="Note aggiuntive..."
              onChange={(e) => setField("note", e.target.value || null)}
            />
          </div>

          {/* ── Attivo ─────────────────────────────────────────────────── */}
          <div className="full">
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.attivo}
                onChange={(e) => setField("attivo", e.target.checked)}
              />
              Contratto attivo
            </label>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
       *  Modal — Delete Confirm
       * ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Conferma Eliminazione"
        size="sm"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Elimina
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: 13, color: "var(--t)" }}>
          Sei sicuro di voler eliminare questo contratto ciclico? L&apos;operazione non e&apos; reversibile.
        </p>
      </Modal>
    </>
  );
}
