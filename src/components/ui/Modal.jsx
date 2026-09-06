import {
  X,
} from "lucide-react";

import "./Modal.css";

function Modal({
  open = false,
  title = "",
  description = "",
  children,
  footer = null,
  onClose,
  size = "medium",
  closeOnBackdrop = true,
  className = "",
}) {
  if (!open) {
    return null;
  }

  const classes = [
    "ui-modal",
    `ui-modal-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleBackdropClick = (
    event,
  ) => {
    if (
      closeOnBackdrop &&
      event.target ===
        event.currentTarget
    ) {
      onClose?.();
    }
  };

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={
        handleBackdropClick
      }
    >
      <div
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          title
            ? "ui-modal-title"
            : undefined
        }
      >
        <div className="ui-modal-header">
          <div>
            {title && (
              <h2 id="ui-modal-title">
                {title}
              </h2>
            )}

            {description && (
              <p>{description}</p>
            )}
          </div>

          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X
              size={19}
              strokeWidth={1.8}
            />
          </button>
        </div>

        <div className="ui-modal-body">
          {children}
        </div>

        {footer && (
          <div className="ui-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;