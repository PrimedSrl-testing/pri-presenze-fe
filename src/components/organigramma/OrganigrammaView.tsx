"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useHRStore } from "@/lib/store";
import { DIPARTIMENTI } from "@/lib/data/dipartimenti";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export function OrganigrammaView() {
  const { collaboratori, deptManagers } = useHRStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DIPARTIMENTI.slice(0, 4)));
  const [fDept, setFDept] = useState("all");

  const getEmpByMat = (mat: string) => collaboratori.find((c) => c.mat === mat);
  const getDeptEmps = (dept: string) => collaboratori.filter((c) => c.dept === dept && c.attivo);

  function toggleDept(dept: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  }

  const depts = fDept === "all" ? DIPARTIMENTI : [fDept];

  return (
    <div>
      <div className="toolbar">
        <select className="fi" style={{ width: "auto" }} value={fDept} onChange={(e) => setFDept(e.target.value)}>
          <option value="all">Tutti i reparti</option>
          {DIPARTIMENTI.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn bs sm" onClick={() => setExpanded(new Set(DIPARTIMENTI))}>Espandi tutto</button>
        <button className="btn bs sm" onClick={() => setExpanded(new Set())}>Comprimi tutto</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {depts.map((dept) => {
          const emps = getDeptEmps(dept);
          const cfg = deptManagers[dept];
          const isOpen = expanded.has(dept);

          return (
            <div key={dept} className="tw" style={{ overflow: "hidden" }}>
              <button className="org-dept-header" onClick={() => toggleDept(dept)}>
                <div className="org-dept-tag">{dept.slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "var(--t)" }}>{dept}</p>
                  <p className="muted">{emps.length} {emps.length === 1 ? "persona" : "persone"}</p>
                </div>
                {cfg?.managers && cfg.managers.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
                    {cfg.managers.slice(0, 2).map((m) => {
                      const emp = getEmpByMat(m);
                      return emp ? <Avatar key={m} ini={emp.ini} color={emp.col} size="sm" /> : null;
                    })}
                  </div>
                )}
                {isOpen
                  ? <ChevronDown size={15} style={{ color: "var(--tm)" }} />
                  : <ChevronRight size={15} style={{ color: "var(--tm)" }} />
                }
              </button>

              {isOpen && (
                <div className="org-dept-body">
                  {emps.length === 0
                    ? <p className="muted">Nessun collaboratore assegnato</p>
                    : <div className="g3">
                        {emps.map((emp) => {
                          const isMgr = cfg?.managers.includes(emp.mat);
                          const isAM  = cfg?.area_managers.includes(emp.mat);
                          return (
                            <div key={emp.id} className={`org-emp-card ${isMgr || isAM ? "highlighted" : ""}`}>
                              <Avatar ini={emp.ini} color={emp.col} size="sm" />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.full}</p>
                                <p className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.mansione}</p>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                {isMgr && <Badge variant="ac">Mgr</Badge>}
                                {isAM  && <Badge variant="in">AM</Badge>}
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: emp.status === "IN" ? "var(--ok)" : "var(--bdrh)", display: "block" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
