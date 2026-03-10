// src/components/ui/ConfirmDialog.tsx

interface ConfirmDialogProps {
  msg: string;
  onYes?: () => void;
  onNo?: () => void;
}

export default function ConfirmDialog({ msg, onYes, onNo }: ConfirmDialogProps) {
  const [title, ...rest] = msg.split('\n\n');

  return (
    <div
      className="overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onNo?.(); }}
    >
      <div className="confirm-dialog" role="alertdialog" aria-modal="true">
        <div className="confirm-dialog-title">{title}</div>
        {rest.length > 0 && (
          <div className="confirm-dialog-body">{rest.join('\n\n')}</div>
        )}
        <div className="confirm-dialog-actions">
          <button className="btn btn--secondary" onClick={onNo}>Annulla</button>
          <button className="btn btn--danger" onClick={onYes}>Conferma</button>
        </div>
      </div>
    </div>
  );
}
