// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">Pagina non trovata</div>
        <div className="empty-state-sub">L'URL richiesto non esiste in questa applicazione.</div>
        <Link href="/" className="btn btn--primary" style={{ marginTop: 16 }}>
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
