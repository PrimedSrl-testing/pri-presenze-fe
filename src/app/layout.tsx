// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'PRIMED HR',
  description: 'Sistema Presenze & Gestione Risorse Umane',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
