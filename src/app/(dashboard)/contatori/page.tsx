"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/lib/store";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { Modal } from "@/components/ui/Modal";
import {
  Loader2, ArrowLeft, Calendar, Wallet, Clock,
  PiggyBank, TrendingUp, Building2, ChevronRight,
  Download, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Trash2,
} from "lucide-react";

type Vista = "totali" | "reparti" | "dipendenti";

interface TotaliData {
  mese: number;
  mesi_disponibili: number[];
  totale_ore: number;
  ferie: { saldo: number; maturate: number; usate: number };
  rol: { saldo: number; maturato: number; usato: number };
  banca_ore: { saldo: number; maturata: number; usata: number };
  bop: { saldo: number; maturato: number; usato: number };
}

const MESI_LABEL: Record<number, string> = {
  1: "Gennaio", 2: "Febbraio", 3: "Marzo", 4: "Aprile", 5: "Maggio", 6: "Giugno",
  7: "Luglio", 8: "Agosto", 9: "Settembre", 10: "Ottobre", 11: "Novembre", 12: "Dicembre",
};

interface RepartoRow {
  reparto: string; num_dipendenti: number;
  ferie_saldo: number; rol_saldo: number; banca_saldo: number; bop_saldo: number; totale: number;
}

interface DipRow {
  dip_id: number; nome: string; matricola: string;
  ferie: { maturate: number; usate: number; saldo: number };
  rol: { maturato: number; usato: number; saldo: number };
  banca_ore: { maturata: number; usata: number; saldo: number };
  bop: { maturato: number; usato: number; saldo: number };
  totale: number;
}

const CARDS = [
  { key: "totale", label: "TOTALE GENERALE", icon: <TrendingUp size={24} />, bg: "linear-gradient(135deg, #1d2939, #475467)" },
  { key: "ferie", label: "FERIE", icon: <Calendar size={24} />, bg: "linear-gradient(135deg, #059669, #34d399)" },
  { key: "rol", label: "ROL", icon: <Clock size={24} />, bg: "linear-gradient(135deg, #3b82f6, #60a5fa)" },
  { key: "banca_ore", label: "BANCA ORE", icon: <Wallet size={24} />, bg: "linear-gradient(135deg, #d97706, #fbbf24)" },
  { key: "bop", label: "BOP SALVADANAIO", icon: <PiggyBank size={24} />, bg: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
];

export default function ContatoriPage() {
  const { showToast } = useToastStore();
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [meseVis, setMeseVis] = useState<number | null>(null); // null = ultimo disponibile
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("totali");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedReparto, setSelectedReparto] = useState<string | null>(null);
  const [totali, setTotali] = useState<TotaliData | null>(null);
  const [reparti, setReparti] = useState<RepartoRow[]>([]);
  const [dipendenti, setDipendenti] = useState<DipRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ importati: number; saltati: number; errori: string[] } | null>(null);
  const [nextImport, setNextImport] = useState<{ anno: number; mese: number } | null>(null);
  const [importAnno, setImportAnno] = useState(new Date().getFullYear());
  const [importMese, setImportMese] = useState(new Date().getMonth() + 1);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const meseQS = meseVis ? `&mese=${meseVis}` : "";

  const fetchTotali = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contatori?anno=${anno}&vista=totali${meseQS}`);
      if (res.ok) setTotali(await res.json());
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setLoading(false); }
  }, [anno, meseQS, showToast]);

  const fetchReparti = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contatori?anno=${anno}&vista=reparti${meseQS}`);
      if (res.ok) { const d = await res.json(); setReparti(d.reparti ?? []); }
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setLoading(false); }
  }, [anno, meseQS, showToast]);

  const fetchDipendenti = useCallback(async (reparto: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contatori?anno=${anno}&vista=dipendenti&reparto=${encodeURIComponent(reparto)}${meseQS}`);
      if (res.ok) { const d = await res.json(); setDipendenti(d.dipendenti ?? []); }
    } catch (err: any) { showToast(err.message, "err"); }
    finally { setLoading(false); }
  }, [anno, meseQS, showToast]);

  useEffect(() => { fetchTotali(); }, [fetchTotali]);

  // Refetch viste reparti/dipendenti quando cambia mese o anno
  useEffect(() => {
    if (vista === "reparti") fetchReparti();
    else if (vista === "dipendenti" && selectedReparto) fetchDipendenti(selectedReparto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meseQS]);

  // Carica il prossimo mese da importare
  useEffect(() => {
    fetch("/api/contatori/import").then(r => r.json()).then(d => {
      if (d.prossimo) { setNextImport(d.prossimo); setImportAnno(d.prossimo.anno); setImportMese(d.prossimo.mese); }
    }).catch(() => {});
  }, [importResult]);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/contatori", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore azzeramento");
      showToast(`Contatori azzerati (${data.eliminati} record eliminati)`, "ok");
      setResetOpen(false);
      setVista("totali");
      setSelectedCard(null);
      fetchTotali();
    } catch (err: any) {
      showToast(err.message, "err");
    } finally {
      setResetting(false);
    }
  };

  const goReparti = (key: string) => { setSelectedCard(key); setVista("reparti"); fetchReparti(); };
  const goDip = (rep: string) => { setSelectedReparto(rep); setVista("dipendenti"); fetchDipendenti(rep); };
  const goBack = () => { if (vista === "dipendenti") { setVista("reparti"); } else { setVista("totali"); setSelectedCard(null); } };

  const cardLabel = CARDS.find(c => c.key === selectedCard)?.label ?? "";

  if (loading && !totali) return (<><Header title="Contatori" /><div className="pg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}><Loader2 size={28} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} /></div></>);

  return (
    <>
      <Header title="Contatori" />
      <div className="pg anim-fi" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Breadcrumb + Anno */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {vista !== "totali" && <button className="icon-btn" onClick={goBack}><ArrowLeft size={16} /></button>}
            <span style={{ fontSize: 14, color: "var(--tm)" }}>
              {vista === "totali" && "Panoramica Generale"}
              {vista === "reparti" && <><span style={{ fontWeight: 700, color: "var(--t)" }}>{cardLabel}</span> <ChevronRight size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Per Reparto</>}
              {vista === "dipendenti" && <><span style={{ fontWeight: 700, color: "var(--t)" }}>{cardLabel}</span> <ChevronRight size={12} style={{ display: "inline", verticalAlign: "middle" }} /> <span style={{ fontWeight: 700, color: "var(--t)" }}>{selectedReparto}</span></>}
            </span>
            {totali?.mese ? (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--bg2)", color: "var(--tm)", marginLeft: 8 }}>
                {MESI_LABEL[totali.mese]} {anno}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--tm)", fontWeight: 600 }}>Visualizza:</span>
            <select
              className="fi"
              style={{ width: 130 }}
              value={meseVis ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setMeseVis(v === "" ? null : Number(v));
              }}
              title="Mese di riferimento (vuoto = ultimo disponibile)"
            >
              <option value="">Ultimo mese</option>
              {(totali?.mesi_disponibili ?? []).map(m => (
                <option key={m} value={m}>{MESI_LABEL[m]}</option>
              ))}
            </select>
            <select className="fi" style={{ width: 90 }} value={anno} onChange={(e) => { setAnno(Number(e.target.value)); setMeseVis(null); setVista("totali"); setSelectedCard(null); }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div style={{ width: 1, height: 24, background: "var(--bdr)", margin: "0 4px" }} />
            <span style={{ fontSize: 12, color: "var(--tm)", fontWeight: 600 }}>Import:</span>
            <select className="fi" style={{ width: 70 }} value={importMese} onChange={(e) => setImportMese(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, "0")}</option>)}
            </select>
            <select className="fi" style={{ width: 80 }} value={importAnno} onChange={(e) => setImportAnno(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              type="button"
              disabled={resetting || importing}
              onClick={() => setResetOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: resetting || importing ? "not-allowed" : "pointer",
                background: "#fff", color: "#dc2626", border: "1.5px solid #dc2626",
              }}
              title="Elimina tutti i record dei contatori"
            >
              <Trash2 size={13} />
              Azzera contatori
            </button>
            <label style={{ cursor: importing ? "not-allowed" : "pointer" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: importing ? "not-allowed" : "pointer",
                background: "#3b5bdb", color: "#fff", border: "none",
              }}>
                {importing ? <Loader2 size={13} style={{ animation: "sp 1s linear infinite" }} /> : <Upload size={13} />}
                Importa {String(importMese).padStart(2, "0")}/{importAnno}
              </div>
              <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} disabled={importing} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true); setImportResult(null);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("anno", String(importAnno));
                  fd.append("mese", String(importMese));
                  const res = await fetch("/api/contatori/import", { method: "POST", body: fd });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Errore import");
                  setImportResult(data);
                  showToast(`Importati ${data.importati} record, ${data.saltati} saltati`, data.saltati > 0 ? "info" : "ok");
                  fetchTotali();
                } catch (err: any) { showToast(err.message, "err"); }
                finally { setImporting(false); e.target.value = ""; }
              }} />
            </label>
          </div>
        </div>

        {/* Risultato import */}
        {importResult && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 10,
            background: importResult.saltati > 0 ? "var(--wal)" : "var(--okl)",
            border: importResult.saltati > 0 ? "1.5px solid var(--wa)" : "1.5px solid var(--ok)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {importResult.saltati > 0 ? <AlertTriangle size={16} style={{ color: "var(--wa)" }} /> : <CheckCircle size={16} style={{ color: "var(--ok)" }} />}
              <span style={{ fontWeight: 700, fontSize: 14, color: importResult.saltati > 0 ? "var(--wa)" : "var(--ok)" }}>
                Import completato: {importResult.importati} importati, {importResult.saltati} saltati
              </span>
              <button onClick={() => setImportResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--tm)" }}>x</button>
            </div>
            {importResult.errori.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--wa)", maxHeight: 120, overflowY: "auto" }}>
                {importResult.errori.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        )}

        {/* ═══ LIVELLO 1: Card totali ═══ */}
        {vista === "totali" && totali && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {CARDS.map((card) => {
              let value = 0;
              if (card.key === "totale") value = totali.totale_ore;
              else if (card.key === "ferie") value = totali.ferie.saldo;
              else if (card.key === "rol") value = totali.rol.saldo;
              else if (card.key === "banca_ore") value = totali.banca_ore.saldo;
              else if (card.key === "bop") value = totali.bop.saldo;

              return (
                <button key={card.key} onClick={() => goReparti(card.key)} style={{
                  padding: "22px 18px", borderRadius: 14, border: "none", cursor: "pointer",
                  background: card.bg, color: "#fff", textAlign: "left",
                  boxShadow: "0 4px 16px rgba(0,0,0,.15)", transition: "transform .15s",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = ""}
                >
                  {card.icon}
                  <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}h</div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", opacity: 0.85 }}>{card.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Clicca per dettaglio →</div>
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ LIVELLO 2: Per reparto (ordinabile + ricercabile) ═══ */}
        {vista === "reparti" && !loading && (
          <div className="card" style={{ padding: 0 }}>
            <SortableTable<RepartoRow>
              columns={[
                { key: "reparto", label: "Reparto", getValue: (r) => r.reparto, render: (r) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={14} style={{ color: "var(--ac)" }} />
                    <span style={{ fontWeight: 600 }}>{r.reparto}</span>
                    <ChevronRight size={12} style={{ color: "var(--tm)", opacity: 0.4 }} />
                  </div>
                )},
                { key: "dip", label: "Dipendenti", align: "center", getValue: (r) => r.num_dipendenti },
                { key: "ferie", label: "Ferie", align: "right", color: "#059669", getValue: (r) => r.ferie_saldo, render: (r) => <span style={{ fontWeight: 600 }}>{r.ferie_saldo}h</span> },
                { key: "rol", label: "ROL", align: "right", color: "#3b82f6", getValue: (r) => r.rol_saldo, render: (r) => <span style={{ fontWeight: 600 }}>{r.rol_saldo}h</span> },
                { key: "banca", label: "Banca Ore", align: "right", color: "#d97706", getValue: (r) => r.banca_saldo, render: (r) => <span style={{ fontWeight: 600 }}>{r.banca_saldo}h</span> },
                { key: "bop", label: "BOP", align: "right", color: "#8b5cf6", getValue: (r) => r.bop_saldo, render: (r) => <span style={{ fontWeight: 600 }}>{r.bop_saldo}h</span> },
                { key: "totale", label: "Totale", align: "right", bold: true, getValue: (r) => r.totale, render: (r) => <span>{r.totale}h</span> },
              ]}
              data={reparti}
              rowKey={(r) => r.reparto}
              onRowClick={(r) => goDip(r.reparto)}
              emptyMessage={`Nessun dato per ${anno}`}
            />
          </div>
        )}

        {/* ═══ LIVELLO 3: Per dipendente (ordinabile + ricercabile) ═══ */}
        {vista === "dipendenti" && !loading && (
          <div className="card" style={{ padding: 0 }}>
            <SortableTable<DipRow>
              columns={[
                { key: "nome", label: "Dipendente", getValue: (d) => d.nome, render: (d) => <span style={{ fontWeight: 600 }}>{d.nome}</span> },
                { key: "matricola", label: "Matricola", getValue: (d) => d.matricola, render: (d) => <span style={{ fontSize: 12, fontFamily: "var(--m)", color: "var(--t2)" }}>{d.matricola}</span> },
                { key: "ferie", label: "Ferie", align: "right", color: "#059669", getValue: (d) => d.ferie.saldo, render: (d) => (
                  <div style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{d.ferie.saldo}h</div><div style={{ fontSize: 10, color: "var(--tm)" }}>{d.ferie.maturate}↑ {d.ferie.usate}↓</div></div>
                )},
                { key: "rol", label: "ROL", align: "right", color: "#3b82f6", getValue: (d) => d.rol.saldo, render: (d) => (
                  <div style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{d.rol.saldo}h</div><div style={{ fontSize: 10, color: "var(--tm)" }}>{d.rol.maturato}↑ {d.rol.usato}↓</div></div>
                )},
                { key: "banca", label: "Banca Ore", align: "right", color: "#d97706", getValue: (d) => d.banca_ore.saldo, render: (d) => (
                  <div style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{d.banca_ore.saldo}h</div><div style={{ fontSize: 10, color: "var(--tm)" }}>{d.banca_ore.maturata}↑ {d.banca_ore.usata}↓</div></div>
                )},
                { key: "bop", label: "BOP", align: "right", color: "#8b5cf6", getValue: (d) => d.bop.saldo, render: (d) => (
                  <div style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{d.bop.saldo}h</div><div style={{ fontSize: 10, color: "var(--tm)" }}>{d.bop.maturato}↑ {d.bop.usato}↓</div></div>
                )},
                { key: "totale", label: "Totale", align: "right", bold: true, getValue: (d) => d.totale, render: (d) => <span>{d.totale}h</span> },
              ]}
              data={dipendenti}
              rowKey={(d) => d.dip_id}
              emptyMessage="Nessun dato"
            />
          </div>
        )}

        {loading && vista !== "totali" && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} style={{ color: "var(--ac)", animation: "sp 1s linear infinite" }} /></div>
        )}
      </div>

      <Modal
        open={resetOpen}
        onClose={() => { if (!resetting) setResetOpen(false); }}
        title="Azzera tutti i contatori"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)} disabled={resetting}>Annulla</Button>
            <Button variant="danger" onClick={handleReset} disabled={resetting}>
              {resetting ? <><Loader2 size={13} style={{ animation: "sp 1s linear infinite" }} /> Azzeramento…</> : <><Trash2 size={13} /> Conferma azzeramento</>}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={20} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
            <div>
              Verranno <b>eliminati tutti i record</b> dei contatori (ferie, ROL, banca ore, BOP) per <b>tutti gli anni e mesi</b>.
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--tm)" }}>
            L'operazione è irreversibile. Per ripristinare i dati sarà necessario reimportare i file Excel del consulente.
          </div>
        </div>
      </Modal>
    </>
  );
}
