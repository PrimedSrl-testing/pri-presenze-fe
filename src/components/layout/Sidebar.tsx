"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useHRStore } from "@/lib/store";
import {
  Home, Users, Clock, AlertCircle, FileText, Settings, Building2,
  Layers, Database, PieChart, Activity, CheckCircle, Calendar,
  Wallet, User, BarChart3, ChevronLeft, ChevronRight, Search,
  ListChecks, AlertTriangle, ClipboardList, Archive, ShieldAlert,
  UserCheck, ClipboardCheck, MapPin, BookOpen,
} from "lucide-react";
import type { RuoloUtente } from "@/types";

// ─── Nav structure types ──────────────────────────────────────────────────────

type NavSep = { sep: true };
type NavSection = { sec: string };
type NavItem = {
  l: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  badgeWarn?: boolean;
};
type NavEntry = NavSep | NavSection | NavItem;

function isSep(e: NavEntry): e is NavSep { return "sep" in e; }
function isSec(e: NavEntry): e is NavSection { return "sec" in e; }
function isItem(e: NavEntry): e is NavItem { return "href" in e; }

// ─── Nav per ruolo ────────────────────────────────────────────────────────────

function buildNav(
  role: RuoloUtente,
  anomalieCount: number,
  richiesteCount: number,
): NavEntry[] {
  if (role === "hr") {
    return [
      { l: "Dashboard",         icon: <Home size={15} />,          href: "/dashboard" },
      { sec: "ANAGRAFICA" },
      { l: "Aziende",           icon: <Building2 size={15} />,     href: "/aziende" },
      { l: "Dipendenti",        icon: <Users size={15} />,         href: "/dipendenti" },
      { l: "Collaboratori",     icon: <UserCheck size={15} />,     href: "/collaboratori" },
      { sec: "MESE IN CORSO" },
      { l: "Timbrature",        icon: <Clock size={15} />,         href: "/timbrature" },
      { l: "Anomalie",          icon: <AlertTriangle size={15} />, href: "/anomalie",  badge: anomalieCount },
      { l: "Richieste",         icon: <ClipboardList size={15} />, href: "/richieste", badge: richiesteCount },
      { sec: "CHIUSURA MESE" },
      { l: "Console Mese",      icon: <Layers size={15} />,        href: "/console-mese" },
      { l: "Chiusura Mese",     icon: <CheckCircle size={15} />,   href: "/chiusura" },
      { l: "Contatori",         icon: <Database size={15} />,      href: "/contatori" },
      { sec: "REPORT & COMPLIANCE" },
      { l: "Basket",            icon: <Archive size={15} />,       href: "/basket" },
      { l: "Scadenze",          icon: <Calendar size={15} />,      href: "/scadenze" },
      { l: "Report",            icon: <BarChart3 size={15} />,     href: "/report" },
      { l: "Audit",             icon: <ShieldAlert size={15} />,   href: "/audit" },
      { sep: true },
      { l: "Impostazioni & Config", icon: <Settings size={15} />, href: "/configurazione" },
    ];
  }

  if (role === "mgr") {
    return [
      { l: "Dashboard",      icon: <Home size={15} />,            href: "/dashboard" },
      { l: "Dipendenti",     icon: <Users size={15} />,           href: "/reparto/dipendenti" },
      { l: "Presenze",       icon: <Clock size={15} />,           href: "/reparto/presenze" },
      { l: "Anomalie",       icon: <AlertTriangle size={15} />,   href: "/anomalie",            badge: anomalieCount },
      { l: "Da approvare",   icon: <ClipboardCheck size={15} />,  href: "/reparto/approvazioni",badge: richiesteCount },
    ];
  }

  if (role === "amgr") {
    return [
      { l: "Dashboard",    icon: <Home size={15} />,           href: "/dashboard" },
      { l: "Dipendenti",   icon: <Users size={15} />,          href: "/area/dipendenti" },
      { l: "Presenze",     icon: <Clock size={15} />,          href: "/area/presenze" },
      { l: "Anomalie",     icon: <AlertTriangle size={15} />,  href: "/area/anomalie",     badge: anomalieCount },
      { l: "Da approvare", icon: <ClipboardCheck size={15} />, href: "/area/approvazioni", badge: richiesteCount },
      { l: "Report mese",  icon: <BarChart3 size={15} />,      href: "/area/report" },
    ];
  }

  // dip
  return [
    { l: "Dashboard",          icon: <Home size={15} />,          href: "/dashboard" },
    { l: "Richieste",          icon: <ClipboardList size={15} />, href: "/mie-richieste",       badge: richiesteCount },
    { l: "Saldo ferie",        icon: <Wallet size={15} />,        href: "/saldo-ferie" },
    { l: "Scadenze",           icon: <Calendar size={15} />,      href: "/scadenze-personali",  badge: 1, badgeWarn: true },
    { l: "Cedolini",           icon: <FileText size={15} />,      href: "/cedolini" },
    { l: "Profilo",            icon: <User size={15} />,          href: "/profilo" },
  ];
}

// ─── Role label ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<RuoloUtente, string> = {
  hr: "HR Admin",
  mgr: "Manager",
  amgr: "Area Manager",
  dip: "Dipendente",
};

// ─── Sidebar component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { currentRole, anomalie, richieste } = useHRStore();

  const anomalieOpen = anomalie.filter((a) => a.stato === "aperta").length;
  const richiestePending = richieste.filter((r) => r.stato === "pending").length;

  const nav = buildNav(currentRole, anomalieOpen, richiestePending);

  return (
    <aside className={`sb${collapsed ? " col" : ""}`}>
      {/* Top / Logo */}
      <div className="sb-top" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Espandi sidebar" : "Collassa sidebar"}>
        <div className="lm">PR</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                PRIMED HR
              </div>
              <div style={{ fontSize: 10, color: "var(--tm)" }}>
                {ROLE_LABELS[currentRole]}
              </div>
            </div>
            <ChevronLeft size={14} style={{ color: "var(--tm)", flexShrink: 0 }} />
          </>
        )}
        {collapsed && <ChevronRight size={14} style={{ color: "var(--tm)", flexShrink: 0, marginLeft: "auto" }} />}
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {/* Command palette stub */}
        {!collapsed && (
          <button
            className="ni ni-search"
            onClick={(e) => { e.stopPropagation(); }}
            style={{ marginBottom: 6 }}
            title="Ricerca rapida (⌘K)"
          >
            <Search size={13} style={{ color: "var(--tm)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--tm)" }}>Ricerca rapida…</span>
            <span className="kbd" style={{ marginLeft: "auto" }}>⌘K</span>
          </button>
        )}

        {nav.map((entry, i) => {
          if (isSep(entry)) {
            return <div key={`sep-${i}`} style={{ height: 1, background: "var(--bdr)", margin: "8px 0" }} />;
          }
          if (isSec(entry)) {
            if (collapsed) return null;
            return (
              <div key={`sec-${i}`} className="nl">{entry.sec}</div>
            );
          }
          if (isItem(entry)) {
            const isActive =
              pathname === entry.href ||
              (entry.href !== "/dashboard" && pathname.startsWith(entry.href));

            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`ni${isActive ? " ac" : ""}`}
                title={collapsed ? entry.l : undefined}
                style={collapsed ? { position: "relative", justifyContent: "center" } : undefined}
              >
                <span style={{ flexShrink: 0, color: isActive ? "var(--ac)" : "var(--tm)" }}>
                  {entry.icon}
                </span>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.l}
                    </span>
                    {entry.badge !== undefined && entry.badge > 0 && (
                      <span className={`nb${entry.badgeWarn ? " w" : ""}`}>
                        {entry.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && entry.badge !== undefined && entry.badge > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: entry.badgeWarn ? "var(--wa)" : "var(--er)",
                    }}
                  />
                )}
              </Link>
            );
          }
          return null;
        })}
      </nav>

      {/* Footer */}
      <div className="sb-ft">
        {!collapsed && (
          <span style={{ fontSize: 10.5, color: "var(--tm)", paddingLeft: 9 }}>v2.0 — 2026</span>
        )}
      </div>
    </aside>
  );
}
