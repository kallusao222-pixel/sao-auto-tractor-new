import { X } from "lucide-react";
import { useEffect } from "react";

import "./Drawer.css";

function Drawer({
  open = false,
  onClose,
  title = "",
  description = "",
  children,
  footer = null,
  position = "right",
  size = "medium",
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="ui-drawer-root"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Drawer"}
    >
      <button
        type="button"
        className="ui-drawer-overlay"
        aria-label="Close drawer"
        onClick={onClose}
      />

      <aside
        className={[
          "ui-drawer",
          `ui-drawer-${position}`,
          `ui-drawer-${size}`,
        ].join(" ")}
      >
        <header className="ui-drawer-header">
          <div>
            {title && (
              <h2>{title}</h2>
            )}

            {description && (
              <p>{description}</p>
            )}
          </div>

          <button
            type="button"
            className="ui-drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ui-drawer-body">
          {children}
        </div>

        {footer && (
          <footer className="ui-drawer-footer">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

export default Drawer;