"use client";

import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";

// ─── Generic pipeline step (works for both excess and deficit) ──────────────

export interface PipelineStep {
  key: string; // display label
  value: string; // stored value
}

export interface PipelineItem {
  dest: string;
  max_ore: number | null;
  /** Only for deficit: "intera" | "parziale" */
  per?: string;
}

interface PipelineBuilderProps {
  items: PipelineItem[];
  onChange: (items: PipelineItem[]) => void;
  options: PipelineStep[];
  mode: "eccesso" | "deficit";
  disabled?: boolean;
}

const LABELS_ECCESSO: Record<string, string> = {
  boa: "BOA (Banca Ore Assenza)",
  straordinario: "Straordinario (pagabile)",
  bop: "BOP (Salvadanaio personale)",
  bos: "BOS (Banca Ore Straordinario)",
};

const LABELS_DEFICIT: Record<string, string> = {
  ferie: "Ferie",
  rol: "ROL (Riduzione Orario)",
  boa: "BOA (Banca Ore Assenza)",
  bop: "BOP (Salvadanaio personale)",
};

export function PipelineBuilder({
  items,
  onChange,
  options,
  mode,
  disabled,
}: PipelineBuilderProps) {
  const labels = mode === "eccesso" ? LABELS_ECCESSO : LABELS_DEFICIT;

  const addStep = () => {
    const usedDests = new Set(items.map((i) => i.dest));
    const next = options.find((o) => !usedDests.has(o.value));
    if (!next) return;
    const newItem: PipelineItem =
      mode === "deficit"
        ? { dest: next.value, max_ore: null, per: "parziale" }
        : { dest: next.value, max_ore: null };
    onChange([...items, newItem]);
  };

  const removeStep = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newItems = [...items];
    const target = idx + dir;
    if (target < 0 || target >= newItems.length) return;
    [newItems[idx], newItems[target]] = [newItems[target], newItems[idx]];
    onChange(newItems);
  };

  const updateStep = (idx: number, patch: Partial<PipelineItem>) => {
    const newItems = items.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );
    onChange(newItems);
  };

  const canAdd = items.length < options.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.length === 0 && (
        <div
          style={{
            padding: "20px 16px",
            textAlign: "center",
            color: "var(--tm)",
            fontSize: 13,
            border: "1.5px dashed var(--bdr)",
            borderRadius: "var(--r2)",
          }}
        >
          Nessuno step configurato. Aggiungi il primo step della pipeline.
        </div>
      )}

      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "var(--bgs)",
            border: "1px solid var(--bdr)",
            borderRadius: "var(--r2)",
          }}
        >
          {/* Step number */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--ac)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {idx + 1}
          </div>

          {/* Destination select */}
          <select
            className="fi"
            style={{ flex: 1, minWidth: 0 }}
            value={item.dest}
            onChange={(e) => updateStep(idx, { dest: e.target.value })}
            disabled={disabled}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {labels[opt.value] ?? opt.key}
              </option>
            ))}
          </select>

          {/* Max ore input */}
          {mode === "eccesso" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--tm)",
                  whiteSpace: "nowrap",
                }}
              >
                Max ore:
              </label>
              <input
                className="fi"
                type="number"
                min={0}
                step={0.5}
                style={{ width: 70 }}
                value={item.max_ore ?? ""}
                placeholder="--"
                onChange={(e) =>
                  updateStep(idx, {
                    max_ore: e.target.value ? Number(e.target.value) : null,
                  })
                }
                disabled={disabled}
              />
              <span
                style={{ fontSize: 10, color: "var(--tm)", whiteSpace: "nowrap" }}
              >
                (vuoto = illimitato)
              </span>
            </div>
          )}

          {/* Deficit: tipo applicazione */}
          {mode === "deficit" && (
            <select
              className="fi"
              style={{ width: 140 }}
              value={item.per ?? "parziale"}
              onChange={(e) => updateStep(idx, { per: e.target.value })}
              disabled={disabled}
            >
              <option value="parziale">Ore parziali</option>
              <option value="intera">Giornata intera</option>
            </select>
          )}

          {/* Move/Remove buttons */}
          {!disabled && (
            <div
              style={{
                display: "flex",
                gap: 2,
                flexShrink: 0,
              }}
            >
              <button
                className="icon-btn"
                onClick={() => moveStep(idx, -1)}
                disabled={idx === 0}
                title="Sposta su"
                style={{ opacity: idx === 0 ? 0.3 : 1 }}
              >
                <ChevronUp size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => moveStep(idx, 1)}
                disabled={idx === items.length - 1}
                title="Sposta giu"
                style={{ opacity: idx === items.length - 1 ? 0.3 : 1 }}
              >
                <ChevronDown size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => removeStep(idx)}
                title="Rimuovi"
                style={{ color: "var(--er)" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add button */}
      {!disabled && canAdd && (
        <button
          onClick={addStep}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 16px",
            border: "1.5px dashed var(--ac)",
            borderRadius: "var(--r2)",
            background: "transparent",
            color: "var(--ac)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background .15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--acl)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Plus size={14} />
          Aggiungi Step
        </button>
      )}

      {/* Arrow flow indicator */}
      {items.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "var(--acl)",
            borderRadius: "var(--r2)",
            fontSize: 12,
            color: "var(--ac)",
          }}
        >
          <span style={{ fontWeight: 700 }}>Flusso:</span>
          {items.map((item, idx) => (
            <span key={idx}>
              <span style={{ fontWeight: 600 }}>
                {labels[item.dest]?.split(" ")[0] ?? item.dest.toUpperCase()}
              </span>
              {item.max_ore != null && (
                <span style={{ fontSize: 10, opacity: 0.8 }}>
                  {" "}
                  (max {item.max_ore}h)
                </span>
              )}
              {idx < items.length - 1 && (
                <span style={{ margin: "0 4px", opacity: 0.5 }}> → </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
