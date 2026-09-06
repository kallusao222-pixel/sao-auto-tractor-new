import "./Button.css";

function Button({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  icon = null,
  iconRight = null,
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  className = "",
}) {
  const classes = [
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-${size}`,
    fullWidth
      ? "ui-button-full"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span
          className="ui-button-spinner"
          aria-hidden="true"
        />
      ) : (
        icon
      )}

      <span className="ui-button-label">
        {children}
      </span>

      {!loading && iconRight}
    </button>
  );
}

export default Button;