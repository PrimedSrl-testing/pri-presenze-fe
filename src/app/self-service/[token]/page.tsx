"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  User, Mail, Phone, MapPin, CreditCard, Heart, Stethoscope,
  Loader2, Save, CheckCircle, AlertTriangle, Upload, Paperclip, Building2, Calendar, Clock, FileText,
} from "lucide-react";

interface DatiForm {
  codice_fiscale: string; email: string; telefono: string; pec: string;
  data_nascita: string; luogo_nascita: string; genere: string; nazionalita: string;
  indirizzo: string; citta: string; cap: string; provincia: string;
  iban: string;
  contatto_emergenza: string; contatto_emergenza_tel: string;
  medico_famiglia: string; medico_famiglia_tel: string;
}

const EMPTY: DatiForm = {
  codice_fiscale: "", email: "", telefono: "", pec: "",
  data_nascita: "", luogo_nascita: "", genere: "", nazionalita: "",
  indirizzo: "", citta: "", cap: "", provincia: "",
  iban: "", contatto_emergenza: "", contatto_emergenza_tel: "",
  medico_famiglia: "", medico_famiglia_tel: "",
};

export default function SelfServicePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [form, setForm] = useState<DatiForm>(EMPTY);
  const [docCI, setDocCI] = useState<string | null>(null);
  const [docCF, setDocCF] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/self-service/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setInfo(d);
        if (d.dati) {
          setForm({
            codice_fiscale: d.dati.codice_fiscale ?? "",
            email: d.dati.email ?? "", telefono: d.dati.telefono ?? "",
            pec: d.dati.pec ?? "",
            data_nascita: d.dati.data_nascita?.split?.("T")[0] ?? "",
            luogo_nascita: d.dati.luogo_nascita ?? "",
            genere: d.dati.genere ?? "", nazionalita: d.dati.nazionalita ?? "",
            indirizzo: d.dati.indirizzo ?? "", citta: d.dati.citta ?? "",
            cap: d.dati.cap ?? "", provincia: d.dati.provincia ?? "",
            iban: d.dati.iban ?? "",
            contatto_emergenza: d.dati.contatto_emergenza ?? "",
            contatto_emergenza_tel: d.dati.contatto_emergenza_tel ?? "",
            medico_famiglia: d.dati.medico_famiglia ?? "",
            medico_famiglia_tel: d.dati.medico_famiglia_tel ?? "",
          });
          setDocCI(d.dati.doc_ci_file ?? null);
          setDocCF(d.dati.doc_cf_file ?? null);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`/api/self-service/${token}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Errore");
      setSaved(true);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpload = async (tipo: "ci" | "cf", file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);
    const res = await fetch(`/api/self-service/${token}/upload`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      if (tipo === "ci") setDocCI(data.path); else setDocCF(data.path);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
      <Loader2 size={32} style={{ color: "#3b5bdb", animation: "sp 1s linear infinite" }} />
    </div>
  );

  if (error && !info) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", padding: 20 }}>
      <div style={{ maxWidth: 440, background: "#fff", padding: 32, borderRadius: 16, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,.08)" }}>
        <AlertTriangle size={40} style={{ color: "#e03131", margin: "0 auto 12px" }} />
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1d2939", marginBottom: 8 }}>Link non valido</h2>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f5f7fa 0%, #e9ecef 100%)", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #3b5bdb, #5c7cfa)", borderRadius: 16, padding: "24px 28px", color: "#fff", boxShadow: "0 8px 30px rgba(59,91,219,.3)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", opacity: 0.8 }}>PRIMED HR — Compilazione dati personali</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>Ciao {info?.nome?.split(" ")[0] ?? ""}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            Compila i tuoi dati. Verranno verificati dall'ufficio HR.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", fontSize: 12 }}>
            <span><Building2 size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{info?.reparto}</span>
            <span><FileText size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{info?.contratto}</span>
            <span><Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{info?.ore_settimanali}h/sett</span>
          </div>
        </div>

        {saved && (
          <div style={{ background: "#d1fae5", border: "1.5px solid #059669", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle size={20} style={{ color: "#059669" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#065f46" }}>Dati salvati con successo!</div>
              <div style={{ fontSize: 12, color: "#065f46", opacity: 0.85 }}>L'ufficio HR verifichera e ti contattera per eventuali correzioni.</div>
            </div>
          </div>
        )}

        {/* Dati Personali */}
        <Section icon={<User size={16} />} title="Dati Personali" color="#3b82f6">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Codice Fiscale"><input className="ss-fi" value={form.codice_fiscale} onChange={(e) => setForm(f => ({ ...f, codice_fiscale: e.target.value.toUpperCase() }))} maxLength={16} style={{ textTransform: "uppercase" }} placeholder="RSSMRC80A01H501A" /></Field>
            <Field label="Data di nascita"><input className="ss-fi" type="date" value={form.data_nascita} onChange={(e) => setForm(f => ({ ...f, data_nascita: e.target.value }))} /></Field>
            <Field label="Luogo di nascita"><input className="ss-fi" value={form.luogo_nascita} onChange={(e) => setForm(f => ({ ...f, luogo_nascita: e.target.value }))} placeholder="Roma" /></Field>
            <Field label="Nazionalita"><input className="ss-fi" value={form.nazionalita} onChange={(e) => setForm(f => ({ ...f, nazionalita: e.target.value }))} placeholder="Italiana" /></Field>
            <Field label="Genere">
              <div style={{ display: "flex", gap: 8 }}>
                {["M", "F"].map(g => (
                  <label key={g} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, cursor: "pointer", border: form.genere === g ? "2px solid #3b5bdb" : "1.5px solid #d0d5dd", background: form.genere === g ? "#eef2ff" : "#fff" }}>
                    <input type="radio" checked={form.genere === g} onChange={() => setForm(f => ({ ...f, genere: g }))} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{g === "M" ? "Maschio" : "Femmina"}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Contatti */}
        <Section icon={<Phone size={16} />} title="Contatti" color="#059669">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Email" icon={<Mail size={12} />}><input className="ss-fi" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nome@email.it" /></Field>
            <Field label="Telefono" icon={<Phone size={12} />}><input className="ss-fi" type="tel" value={form.telefono} onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="333 1234567" /></Field>
            <Field label="PEC" icon={<Mail size={12} />}><input className="ss-fi" type="email" value={form.pec} onChange={(e) => setForm(f => ({ ...f, pec: e.target.value }))} placeholder="nome@pec.it" /></Field>
          </div>
        </Section>

        {/* Indirizzo */}
        <Section icon={<MapPin size={16} />} title="Indirizzo di Residenza" color="#3b82f6">
          <Field label="Indirizzo"><input className="ss-fi" value={form.indirizzo} onChange={(e) => setForm(f => ({ ...f, indirizzo: e.target.value }))} placeholder="Via Roma 1" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <Field label="Citta"><input className="ss-fi" value={form.citta} onChange={(e) => setForm(f => ({ ...f, citta: e.target.value }))} placeholder="Milano" /></Field>
            <Field label="CAP"><input className="ss-fi" value={form.cap} onChange={(e) => setForm(f => ({ ...f, cap: e.target.value }))} placeholder="20100" maxLength={5} /></Field>
            <Field label="Provincia"><input className="ss-fi" value={form.provincia} onChange={(e) => setForm(f => ({ ...f, provincia: e.target.value.toUpperCase() }))} placeholder="MI" maxLength={2} style={{ textTransform: "uppercase" }} /></Field>
          </div>
        </Section>

        {/* IBAN */}
        <Section icon={<CreditCard size={16} />} title="Dati Bancari" color="#d97706">
          <Field label="IBAN"><input className="ss-fi" value={form.iban} onChange={(e) => setForm(f => ({ ...f, iban: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="IT60X0542811101000000123456" maxLength={34} style={{ textTransform: "uppercase", letterSpacing: ".5px", fontFamily: "monospace" }} /></Field>
        </Section>

        {/* Emergenza */}
        <Section icon={<Heart size={16} />} title="Contatto di Emergenza" color="#e03131">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Field label="Nome e relazione"><input className="ss-fi" value={form.contatto_emergenza} onChange={(e) => setForm(f => ({ ...f, contatto_emergenza: e.target.value }))} placeholder="Maria Rossi (moglie)" /></Field>
            <Field label="Telefono"><input className="ss-fi" type="tel" value={form.contatto_emergenza_tel} onChange={(e) => setForm(f => ({ ...f, contatto_emergenza_tel: e.target.value }))} placeholder="333 9876543" /></Field>
          </div>
        </Section>

        {/* Medico */}
        <Section icon={<Stethoscope size={16} />} title="Medico di Famiglia" color="#8b5cf6">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Field label="Nome e cognome"><input className="ss-fi" value={form.medico_famiglia} onChange={(e) => setForm(f => ({ ...f, medico_famiglia: e.target.value }))} placeholder="Dr. Mario Bianchi" /></Field>
            <Field label="Telefono"><input className="ss-fi" type="tel" value={form.medico_famiglia_tel} onChange={(e) => setForm(f => ({ ...f, medico_famiglia_tel: e.target.value }))} placeholder="02 1234567" /></Field>
          </div>
        </Section>

        {/* Documenti */}
        <Section icon={<Paperclip size={16} />} title="Documenti" color="#059669">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DocUpload label="Carta d'Identita" fileUrl={docCI} onFile={(f) => handleUpload("ci", f)} />
            <DocUpload label="Codice Fiscale / Tessera Sanitaria" fileUrl={docCF} onFile={(f) => handleUpload("cf", f)} />
          </div>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "16px", borderRadius: 12, border: "none", cursor: saving ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #3b5bdb, #5c7cfa)", color: "#fff",
            fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 4px 16px rgba(59,91,219,.3)",
          }}
        >
          {saving ? <Loader2 size={18} style={{ animation: "sp 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Salvataggio..." : "Invia i miei dati"}
        </button>
      </div>

      <style>{`
        .ss-fi { width: 100%; padding: 10px 12px; border: 1.5px solid #d0d5dd; border-radius: 8px; font-size: 14px; background: #fff; outline: none; transition: border-color .15s; font-family: inherit; }
        .ss-fi:focus { border-color: #3b5bdb; }
        @keyframes sp { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1d2939" }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 5 }}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function DocUpload({ label, fileUrl, onFile }: { label: string; fileUrl: string | null; onFile: (f: File) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, border: fileUrl ? "1.5px solid #059669" : "1.5px solid #d0d5dd", background: fileUrl ? "#ecfdf5" : "#fafbfc" }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: fileUrl ? "#059669" : "#333" }}>{label}</div>
      {fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#059669", textDecoration: "underline", marginRight: 8 }}>Vedi caricato</a>
      ) : null}
      <label style={{ padding: "6px 12px", borderRadius: 6, background: "#3b5bdb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        <Upload size={12} /> {fileUrl ? "Sostituisci" : "Carica"}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>
    </div>
  );
}
