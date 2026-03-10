"use client";

import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/store";
import type { ToastMessage } from "@/types";

const icons: Record<ToastMessage["type"], React.ReactNode> = {
  ok:   <CheckCircle size={16} />,
  err:  <XCircle size={16} />,
  info: <Info size={16} />,
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {icons[t.type]}
          <span className="toast-msg">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tm)", display: "flex" }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
