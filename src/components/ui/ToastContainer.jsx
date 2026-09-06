import Toast from "./Toast";
import "./ToastContainer.css";

function ToastContainer({
  toasts = [],
  onRemove,
}) {
  if (!Array.isArray(toasts) || toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="ui-toast-container"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast, index) => (
        <Toast
          key={
            toast.id ??
            `${toast.title || "toast"}-${index}`
          }
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={
            onRemove
              ? () => onRemove(toast.id)
              : undefined
          }
        />
      ))}
    </div>
  );
}

export default ToastContainer;