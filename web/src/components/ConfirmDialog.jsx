export default function ConfirmDialog({
  title,
  message,
  confirmText = "Підтвердити",
  cancelText = "Скасувати",
  danger = false,
  disabled = false,
  children,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="confirm-layer" role="presentation" onClick={onCancel}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-head">
          <h2 id="confirm-title">{title}</h2>
          <button className="drawer-close" type="button" onClick={onCancel}>×</button>
        </div>
        {message && <p className="confirm-message">{message}</p>}
        {children && <div className="confirm-content">{children}</div>}
        <div className="confirm-actions">
          <button className="btn ghost" type="button" onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${danger ? "danger" : "primary"}`} type="button" disabled={disabled} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
