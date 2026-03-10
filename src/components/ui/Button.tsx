"use client";

import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:   "bp",
  secondary: "bs",
  danger:    "bd",
  ghost:     "bg",
};

const sizeMap: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "sm",
  md: "",
  lg: "lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const cls = ["btn", variantMap[variant], sizeMap[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
