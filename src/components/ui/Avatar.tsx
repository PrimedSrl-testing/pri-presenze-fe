"use client";

interface AvatarProps {
  ini: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ ini, color = "#3b5bdb", size = "md" }: AvatarProps) {
  return (
    <span className={`av ${size}`} style={{ backgroundColor: color }}>
      {ini}
    </span>
  );
}
