"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useHRStore } from "@/lib/store";
import {
  Home, Users, Clock, FileText, Settings, Building2,
  Layers, Database, CheckCircle, Calendar,
  Wallet, User, BarChart3, ChevronLeft, ChevronRight, Search,
  AlertTriangle, ClipboardList, Archive, ShieldAlert,
  ClipboardCheck, Timer, RefreshCw,
  CalendarClock, ShieldCheck, ChevronDown,
} from "lucide-react";
import type { RuoloUtente } from "@/types";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface NavItem {
  l: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  badgeWarn?: boolean;
}

interface NavGroup {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

/* ── Menu per HR Admin (organizzato per flussi) ───────────────────────────── */

function buildHRGroups(anomalieCount: number, richiesteCount: number): NavGroup[] {
  return [
    {
      title: "Anagrafiche",
      icon: <Users size={15} />,
      defaultOpen: true,
      items: [
        { l: "Dipendenti",         icon: <Users size={14} />,     href: "/dipendenti" },
        { l: "Aziende",            icon: <Building2 size={14} />, href: "/aziende" },
        { l: "Scadenze Contratti", icon: <Calendar size={14} />,  href: "/scadenze" },
      ],
    },
    {
      title: "Gestione Mensile",
      icon: <Clock size={15} />,
      defaultOpen: true,
      items: [
        { l: "Timbrature",     icon: <Clock size={14} />,         href: "/timbrature" },
        { l: "Anomalie",       icon: <AlertTriangle size={14} />, href: "/anomalie", badge: anomalieCount },
        { l: "Richieste",      icon: <ClipboardList size={14} />, href: "/richieste", badge: richiesteCount },
        { l: "Straordinari",   icon: <Timer size={14} />,         href: "/straordinari" },
        { l: "Console Mese",   icon: <Layers size={14} />,        href: "/console-mese" },
        { l: "Chiusura Mese",  icon: <CheckCircle size={14} />,   href: "/chiusura" },
        { l: "Contatori",      icon: <Database size={14} />,      href: "/contatori" },
        { l: "Basket Assenze", icon: <Archive size={14} />,       href: "/basket" },
      ],
    },
    {
      title: "Report",
      icon: <BarChart3 size={15} />,
      items: [
        { l: "Report", icon: <BarChart3 size={14} />,   href: "/report" },
        { l: "Audit",  icon: <ShieldAlert size={14} />, href: "/audit" },
      ],
    },
    {
      title: "Impostazioni",
      icon: <Settings size={15} />,
      items: [
        { l: "Profili Parametri", icon: <Settings size={14} />,      href: "/configurazione/profili-parametri" },
        { l: "Orari Template",    icon: <CalendarClock size={14} />, href: "/configurazione/orari-template" },
        { l: "Causali",           icon: <FileText size={14} />,      href: "/configurazione/causali" },
        { l: "Reparti & Manager", icon: <Building2 size={14} />,     href: "/configurazione/reparti" },
      ],
    },
  ];
}

/* ── Menu per altri ruoli (flat, senza gruppi) ────────────────────────────── */

function buildFlatNav(
  role: RuoloUtente,
  anomalieCount: number,
  richiesteCount: number,
): NavItem[] {
  if (role === "mgr") {
    return [
      { l: "Dashboard",    icon: <Home size={14} />,            href: "/dashboard" },
      { l: "Dipendenti",   icon: <Users size={14} />,           href: "/reparto/dipendenti" },
      { l: "Presenze",     icon: <Clock size={14} />,           href: "/reparto/presenze" },
      { l: "Anomalie",     icon: <AlertTriangle size={14} />,   href: "/anomalie", badge: anomalieCount },
      { l: "Da approvare", icon: <ClipboardCheck size={14} />,  href: "/reparto/approvazioni", badge: richiesteCount },
    ];
  }
  if (role === "amgr") {
    return [
      { l: "Dashboard",    icon: <Home size={14} />,           href: "/dashboard" },
      { l: "Dipendenti",   icon: <Users size={14} />,          href: "/area/dipendenti" },
      { l: "Presenze",     icon: <Clock size={14} />,          href: "/area/presenze" },
      { l: "Anomalie",     icon: <AlertTriangle size={14} />,  href: "/area/anomalie", badge: anomalieCount },
      { l: "Da approvare", icon: <ClipboardCheck size={14} />, href: "/area/approvazioni", badge: richiesteCount },
      { l: "Report",       icon: <BarChart3 size={14} />,      href: "/area/report" },
    ];
  }
  // dip
  return [
    { l: "Dashboard",  icon: <Home size={14} />,          href: "/dashboard" },
    { l: "Richieste",  icon: <ClipboardList size={14} />, href: "/mie-richieste", badge: richiesteCount },
    { l: "Saldo ferie", icon: <Wallet size={14} />,       href: "/saldo-ferie" },
    { l: "Scadenze",   icon: <Calendar size={14} />,      href: "/scadenze-personali", badge: 1, badgeWarn: true },
    { l: "Cedolini",   icon: <FileText size={14} />,      href: "/cedolini" },
    { l: "Profilo",    icon: <User size={14} />,          href: "/profilo" },
  ];
}

/* ── Role labels ──────────────────────────────────────────────────────────── */

const ROLE_LABELS: Record<RuoloUtente, string> = {
  hr: "HR Admin",
  mgr: "Manager",
  amgr: "Area Manager",
  dip: "Dipendente",
};

/* ── Sidebar ──────────────────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { currentRole, anomalie, richieste } = useHRStore();

  const anomalieOpen = anomalie.filter((a) => a.stato === "aperta").length;
  const richiestePending = richieste.filter((r) => r.stato === "pending").length;

  const isHR = currentRole === "hr";

  return (
    <aside className={`sb${collapsed ? " col" : ""}`}>
      {/* Logo */}
      <div className="sb-top" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Espandi" : "Collassa"}>
        <div className="lm">PR</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t)", whiteSpace: "nowrap" }}>PRIMED HR</div>
              <div style={{ fontSize: 10, color: "var(--tm)" }}>{ROLE_LABELS[currentRole]}</div>
            </div>
            <ChevronLeft size={14} style={{ color: "var(--tm)", flexShrink: 0 }} />
          </>
        )}
        {collapsed && <ChevronRight size={14} style={{ color: "var(--tm)", flexShrink: 0, marginLeft: "auto" }} />}
      </div>

      <nav className="sb-nav">
        {/* Search */}
        {!collapsed && (
          <button className="ni ni-search" onClick={(e) => e.stopPropagation()} style={{ marginBottom: 6 }} title="Ricerca rapida">
            <Search size={13} style={{ color: "var(--tm)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--tm)" }}>Ricerca rapida...</span>
          </button>
        )}

        {/* Dashboard (sempre visibile) */}
        <SidebarLink pathname={pathname} href="/dashboard" icon={<Home size={14} />} label="Dashboard" collapsed={collapsed} />

        {/* HR: menu a gruppi collassabili */}
        {isHR && !collapsed && buildHRGroups(anomalieOpen, richiestePending).map((group) => (
          <SidebarGroup key={group.title} group={group} pathname={pathname} />
        ))}

        {/* HR collapsed: solo icone */}
        {isHR && collapsed && buildHRGroups(anomalieOpen, richiestePending).flatMap(g => g.items).map((item) => (
          <SidebarLink key={item.href} pathname={pathname} href={item.href} icon={item.icon} label={item.l} badge={item.badge} badgeWarn={item.badgeWarn} collapsed />
        ))}

        {/* Altri ruoli: flat */}
        {!isHR && buildFlatNav(currentRole, anomalieOpen, richiestePending).map((item) => (
          <SidebarLink key={item.href} pathname={pathname} href={item.href} icon={item.icon} label={item.l} badge={item.badge} badgeWarn={item.badgeWarn} collapsed={collapsed} />
        ))}
      </nav>

      <div className="sb-ft">
        {!collapsed && <span style={{ fontSize: 10.5, color: "var(--tm)", paddingLeft: 9 }}>v2.0 — 2026</span>}
      </div>
    </aside>
  );
}

/* ── Collapsible Group ────────────────────────────────────────────────────── */

function SidebarGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActive = group.items.some((i) => pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href)));
  const [open, setOpen] = useState(group.defaultOpen || hasActive);
  const totalBadges = group.items.reduce((sum, i) => sum + (i.badge ?? 0), 0);

  return (
    <div style={{ marginTop: 4 }}>
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", padding: "8px 10px",
          fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px",
          color: hasActive ? "var(--ac)" : "var(--tm)",
          background: "transparent", border: "none", cursor: "pointer",
          borderRadius: 6, transition: "color .15s",
        }}
      >
        <span style={{ flexShrink: 0, opacity: 0.7 }}>{group.icon}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{group.title}</span>
        {totalBadges > 0 && !open && (
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "var(--er)", borderRadius: 99, padding: "1px 6px", minWidth: 16, textAlign: "center" }}>
            {totalBadges}
          </span>
        )}
        <ChevronDown
          size={12}
          style={{
            flexShrink: 0, transition: "transform .2s",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            opacity: 0.5,
          }}
        />
      </button>

      {/* Group items */}
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 8 }}>
          {group.items.map((item) => (
            <SidebarLink key={item.href} pathname={pathname} href={item.href} icon={item.icon} label={item.l} badge={item.badge} badgeWarn={item.badgeWarn} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Single Link ──────────────────────────────────────────────────────────── */

function SidebarLink({
  pathname, href, icon, label, badge, badgeWarn, collapsed,
}: {
  pathname: string; href: string; icon: React.ReactNode; label: string;
  badge?: number; badgeWarn?: boolean; collapsed?: boolean;
}) {
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`ni${isActive ? " ac" : ""}`}
      title={collapsed ? label : undefined}
      style={collapsed ? { position: "relative", justifyContent: "center" } : undefined}
    >
      <span style={{ flexShrink: 0, color: isActive ? "var(--ac)" : "var(--tm)" }}>{icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={`nb${badgeWarn ? " w" : ""}`}>{badge}</span>
          )}
        </>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: badgeWarn ? "var(--wa)" : "var(--er)" }} />
      )}
    </Link>
  );
}
