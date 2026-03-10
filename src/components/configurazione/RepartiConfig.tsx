"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useHRStore, useToastStore } from "@/lib/store";
import { DIPARTIMENTI } from "@/lib/data/dipartimenti";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { DeptManagersMap } from "@/types";

export function RepartiConfig() {
  const { collaboratori, deptManagers, setDeptManagers } = useHRStore();
  const { showToast } = useToastStore();
  const [local, setLocal] = useState<DeptManagersMap>({ ...deptManagers });

  function toggle(dept: string, mat: string, role: "managers" | "area_managers") {
    setLocal((prev) => {
      const cfg = prev[dept] ?? { managers: [], area_managers: [], resp_principale: "", am_risponde_a: [] };
      const current = cfg[role];
      const next = current.includes(mat) ? current.filter((m) => m !== mat) : [...current, mat];
      return {
        ...prev,
        [dept]: {
          ...cfg,
          [role]: next,
          resp_principale: role === "managers" && next.length > 0 ? next[0] : cfg.resp_principale,
        },
      };
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Button onClick={() => { setDeptManagers(local); showToast("Configurazione salvata", "ok"); }}>
          <Save size={14} /> Salva configurazione
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DIPARTIMENTI.map((dept) => {
          const cfg = local[dept];
          const managers = cfg?.managers ?? [];
          const areaManagers = cfg?.area_managers ?? [];
          const deptEmps = collaboratori.filter((c) => c.dept === dept);
          const allRelevant = collaboratori.filter((c) => c.dept === dept || managers.includes(c.mat) || areaManagers.includes(c.mat));

          return (
            <div key={dept} className="card">
              <p className="card-title">{dept}</p>
              <div className="g2">
                <div>
                  <p className="lbl" style={{ marginBottom: 10 }}>Manager diretti</p>
                  {allRelevant.length === 0
                    ? <p className="muted">Nessun collaboratore in questo reparto</p>
                    : allRelevant.map((c) => (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 8px", borderRadius: "var(--r2)", marginBottom: 3, transition: "background .1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bgs)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <input type="checkbox" checked={managers.includes(c.mat)}
                          onChange={() => toggle(dept, c.mat, "managers")}
                          style={{ width: 15, height: 15, accentColor: "var(--ac)", flexShrink: 0 }} />
                        <Avatar ini={c.ini} color={c.col} size="sm" />
                        <span style={{ fontSize: 13, color: "var(--t)" }}>{c.full}</span>
                      </label>
                    ))}
                </div>
                <div>
                  <p className="lbl" style={{ marginBottom: 10 }}>Area Manager</p>
                  {allRelevant.length === 0
                    ? <p className="muted">Nessun collaboratore in questo reparto</p>
                    : allRelevant.map((c) => (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 8px", borderRadius: "var(--r2)", marginBottom: 3, transition: "background .1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bgs)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <input type="checkbox" checked={areaManagers.includes(c.mat)}
                          onChange={() => toggle(dept, c.mat, "area_managers")}
                          style={{ width: 15, height: 15, accentColor: "var(--ac)", flexShrink: 0 }} />
                        <Avatar ini={c.ini} color={c.col} size="sm" />
                        <span style={{ fontSize: 13, color: "var(--t)" }}>{c.full}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
