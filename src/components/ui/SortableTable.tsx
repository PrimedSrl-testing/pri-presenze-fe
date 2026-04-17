"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  color?: string;
  bold?: boolean;
  width?: number | string;
  searchable?: boolean;
  sortable?: boolean;
  getValue: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
}

interface SortableTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function SortableTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = "Nessun dato",
}: SortableTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  };

  const setFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const filtered = useMemo(() => {
    return data.filter((row) => {
      for (const col of columns) {
        const filterVal = filters[col.key];
        if (!filterVal) continue;
        const cellVal = String(col.getValue(row)).toLowerCase();
        if (!cellVal.includes(filterVal.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, columns, filters]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const col = columns.find((c) => c.key === sortCol);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "it", { numeric: true });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, columns]);

  const hasAnyFilter = columns.some((c) => c.searchable !== false);

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          {/* Labels row */}
          <tr style={{ borderBottom: "2px solid var(--bdr)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                style={{
                  padding: "10px 10px 6px",
                  textAlign: col.align ?? "left",
                  fontWeight: 700,
                  fontSize: 11.5,
                  color: col.color ?? "var(--tm)",
                  cursor: col.sortable !== false ? "pointer" : "default",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  width: col.width,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {col.label}
                  {col.sortable !== false && (
                    sortCol === col.key ? (
                      sortDir === "asc" ? <ChevronUp size={12} style={{ opacity: 0.8 }} /> : <ChevronDown size={12} style={{ opacity: 0.8 }} />
                    ) : (
                      <ChevronsUpDown size={11} style={{ opacity: 0.3 }} />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
          {/* Search row */}
          {hasAnyFilter && (
            <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
              {columns.map((col) => (
                <th key={`f-${col.key}`} style={{ padding: "4px 8px 8px" }}>
                  {col.searchable !== false ? (
                    <input
                      className="fi"
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        fontSize: 11,
                        background: "var(--bgs)",
                        textAlign: col.align ?? "left",
                      }}
                      placeholder="Cerca..."
                      value={filters[col.key] ?? ""}
                      onChange={(e) => setFilter(col.key, e.target.value)}
                    />
                  ) : (
                    <div />
                  )}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: "center", padding: 40, color: "var(--tm)" }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  cursor: onRowClick ? "pointer" : "default",
                  borderBottom: "1px solid var(--bdr)",
                }}
                onMouseEnter={onRowClick ? (e) => (e.currentTarget.style.background = "var(--bgs)") : undefined}
                onMouseLeave={onRowClick ? (e) => (e.currentTarget.style.background = "") : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "10px 10px",
                      textAlign: col.align ?? "left",
                      fontWeight: col.bold ? 800 : undefined,
                      fontSize: col.bold ? 14 : undefined,
                      color: col.bold ? "var(--ac)" : undefined,
                    }}
                  >
                    {col.render ? col.render(row) : String(col.getValue(row))}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
