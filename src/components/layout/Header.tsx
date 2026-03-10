"use client";

import { Bell, ChevronDown } from "lucide-react";
import { useHRStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";

interface HeaderProps {
  title: string;
}

const ROLE_LABELS: Record<string, string> = {
  hr: "HR Admin",
  mgr: "Manager",
  amgr: "Area Manager",
  dip: "Dipendente",
};

export function Header({ title }: HeaderProps) {
  const { collaboratori, currentUserId } = useHRStore();
  const me = collaboratori.find((c) => c.id === currentUserId);

  return (
    <header className="top">
      {/* Titolo pagina */}
      <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--t)", flex: 1, letterSpacing: "-.2px" }}>
        {title}
      </span>

      {/* Company badge */}
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--ac)",
        background: "var(--acl)",
        padding: "3px 10px",
        borderRadius: 99,
        letterSpacing: ".04em",
      }}>
        PRIMED S.r.l.
      </span>

      {/* Right actions */}
      <div className="header-right">
        <button className="icon-btn" style={{ position: "relative" }}>
          <Bell size={16} />
          <span style={{
            position: "absolute", top: 6, right: 6,
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--er)", border: "2px solid var(--bg)",
          }} />
        </button>

        {me && (
          <button className="user-pill">
            <Avatar ini={me.ini} color={me.col} size="sm" />
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t)" }}>{me.full}</p>
              <p style={{ fontSize: 11, color: "var(--tm)" }}>{ROLE_LABELS[me.role] ?? me.role}</p>
            </div>
            <ChevronDown size={13} style={{ color: "var(--tm)" }} />
          </button>
        )}
      </div>
    </header>
  );
}
