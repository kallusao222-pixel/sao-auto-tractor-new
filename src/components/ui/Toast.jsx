import {
  CheckCircle2,
  Info,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import "./Toast.css";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

function Toast({
  type = "info",
  title = "",
  message = "",
  onClose,
}) {
  const normalizedType =
    ICONS[type] ? type : "info";

  const Icon =
    ICONS[normalizedType];

  return (
    <div
      className={[
        "ui-toast",
        `ui-toast-${normalizedType}`,
      ].join(" ")}
      role="status"
    >
      <div className="ui-toast-icon">
        <Icon size={18} />
      </div>

      <div className="ui-toast-content">
        {title && (
          <strong>{title}</strong>
        )}

        {message && (
          <p>{message}</p>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          className="ui-toast-close"
          onClick={onClose}
          aria-label="Close notification"
          title="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Toast;