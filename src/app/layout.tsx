import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRIMED HR — Presenze NextGen",
  description: "Sistema HR per la gestione presenze e risorse umane",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
