"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHRStore } from "@/lib/store";
import { AZIENDE } from "@/lib/data/aziende";

const DEMO_ROLES = [
  { role: "hr",   label: "HR",           email: "c.annicchiarico@primed.it", empId: "2" },
  { role: "mgr",  label: "Manager",      email: "m.rossi@primed.it",          empId: "1" },
  { role: "amgr", label: "Area Manager", email: "a.fiore@noflystore.it",       empId: "5" },
  { role: "dip",  label: "Dipendente",   email: "l.depalma@primed.it",         empId: "3" },
];

export function LoginForm() {
  const router = useRouter();
  const { setCurrentUser, setCurrentRole } = useHRStore();

  const [azienda, setAzienda] = useState("primed");
  const [email, setEmail] = useState("c.annicchiarico@primed.it");
  const [password, setPassword] = useState("••••••••");
  const [selRole, setSelRole] = useState("hr");
  const [loading, setLoading] = useState(false);

  function selectDemo(d: typeof DEMO_ROLES[0]) {
    setSelRole(d.role);
    setEmail(d.email);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const demo = DEMO_ROLES.find((r) => r.role === selRole);
    setTimeout(() => {
      setLoading(false);
      if (demo) {
        setCurrentUser(demo.empId);
        setCurrentRole(demo.role as import("@/types").RuoloUtente);
      }
      router.push("/dashboard");
    }, 900);
  }

  return (
    <div className="login-root">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-bg-circles">
          <span style={{ width: 500, height: 500, top: -100, left: -150 }} />
          <span style={{ width: 300, height: 300, bottom: 50, right: -80 }} />
          <span style={{ width: 180, height: 180, top: "40%", left: "50%" }} />
        </div>
        <div className="login-left-content">
          <h2>Benvenuto in<br />PRIMED HR</h2>
          <p>Il sistema di gestione presenze e risorse umane per PRIMED S.r.l. e NOFLYSTORE</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32, justifyContent: "center" }}>
            {[
              { icon: "👥", text: "Collaboratori" },
              { icon: "📊", text: "Dashboard" },
              { icon: "🕒", text: "Presenze" },
              { icon: "📅", text: "Ferie & Permessi" },
            ].map((f) => (
              <div key={f.text} style={{ background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                <span>{f.icon}</span><span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-box">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-mark">PR</div>
            <div className="login-logo-text">
              <p>PRIMED HR</p>
              <p>Presenze & Personale — v2</p>
            </div>
          </div>

          <p className="login-title">Accedi</p>
          <p className="login-sub">Inserisci le tue credenziali per continuare</p>

          <form className="login-form" onSubmit={handleLogin}>
            {/* Azienda */}
            <div className="login-form-group">
              <label className="lbl">Azienda</label>
              <select className="fi" value={azienda} onChange={(e) => setAzienda(e.target.value)}>
                {AZIENDE.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>

            {/* Email */}
            <div className="login-form-group">
              <label className="lbl">Email</label>
              <input className="fi" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@primed.it" autoComplete="email" />
            </div>

            {/* Password */}
            <div className="login-form-group">
              <label className="lbl">Password</label>
              <input className="fi" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>

            {/* Demo roles */}
            <div>
              <p className="lbl" style={{ marginBottom: 8 }}>Demo — Accesso rapido</p>
              <div className="demo-grid">
                {DEMO_ROLES.map((d) => (
                  <button key={d.role} type="button" className={`demo-card ${selRole === d.role ? "sel" : ""}`} onClick={() => selectDemo(d)}>
                    <p>{d.label}</p>
                    <p>{d.email}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="btn bp lg" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "spin .7s linear infinite", display: "inline-block",
                  }} />
                  Accesso…
                </span>
              ) : "Accedi"}
            </button>
          </form>

          <p className="login-footer">PRIMED SRL © 2026 — HR NextGen v2</p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
