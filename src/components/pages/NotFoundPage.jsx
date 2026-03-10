// client/src/components/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">Pagina non trovata</div>
        <div className="empty-state-sub">L'URL richiesto non esiste in questa applicazione.</div>
        <Link to="/" className="btn btn--primary" style={{ marginTop: 16 }}>
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
