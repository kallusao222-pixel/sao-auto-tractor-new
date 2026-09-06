import "./Badge.css";

function Badge({
  children,
  variant = "neutral",
  size = "medium",
  dot = false,
  className = "",
}) {
  const classes = [
    "ui-badge",
    `ui-badge-${variant}`,
    `ui-badge-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {dot && (
        <span
          className="ui-badge-dot"
          aria-hidden="true"
        />
      )}

      <span>{children}</span>
    </span>
  );
}

export default Badge;