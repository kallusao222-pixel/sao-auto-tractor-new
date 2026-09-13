import "./Button.css";

/**
 * Reusable button.
 * variants: "primary" | "secondary" | "ghost" | "danger"
 * sizes:    "sm" | "md" | "lg"
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...rest
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && "btn--full",
    loading && "btn--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        iconLeft && <span className="btn__icon">{iconLeft}</span>
      )}
      <span className="btn__label">{children}</span>
      {iconRight && !loading && <span className="btn__icon">{iconRight}</span>}
    </button>
  );
}