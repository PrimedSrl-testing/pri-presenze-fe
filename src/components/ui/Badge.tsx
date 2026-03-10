"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "ok" | "er" | "wa" | "in" | "ac" | "pu" | "nn";
  className?: string;
}

export function Badge({ children, variant = "nn", className }: BadgeProps) {
  return (
    <span className={`bdg ${variant} ${className ?? ""}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: "IN" | "OUT" }) {
  return (
    <span className={`dot-presence ${status === "IN" ? "in" : "out"}`}>
      {status === "IN" ? "Presente" : "Assente"}
    </span>
  );
}
