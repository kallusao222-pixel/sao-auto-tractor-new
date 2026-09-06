import {
  LoaderCircle,
} from "lucide-react";

import "./LoadingState.css";

function LoadingState({
  title = "Loading...",
  message = "",
  fullPage = false,
  className = "",
}) {
  const classes = [
    "ui-loading-state",
    fullPage
      ? "ui-loading-state-full-page"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <LoaderCircle
        className="ui-loading-spinner"
        size={28}
        strokeWidth={1.7}
      />

      {title && (
        <h3>{title}</h3>
      )}

      {message && (
        <p>{message}</p>
      )}
    </div>
  );
}

export default LoadingState;