import {
  AlertTriangle,
  X,
} from "lucide-react";

import Button from "./Button";

import "./ConfirmDialog.css";

function ConfirmDialog({
  open = false,
  title = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onCancel?.();
        }
      }}
    >
      <div
        className="ui-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="ui-confirm-dialog-header">
          <div className="ui-confirm-dialog-icon">
            <AlertTriangle
              size={20}
              strokeWidth={1.8}
            />
          </div>

          <button
            type="button"
            className="ui-confirm-dialog-close"
            onClick={onCancel}
            aria-label="Close"
            disabled={loading}
          >
            <X
              size={18}
              strokeWidth={1.8}
            />
          </button>
        </div>

        <div className="ui-confirm-dialog-content">
          <h2 id="confirm-dialog-title">
            {title}
          </h2>

          {message && (
            <p>{message}</p>
          )}
        </div>

        <div className="ui-confirm-dialog-actions">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;