import "./IconButton.css";

function IconButton({
  icon,
  label,
  type = "button",
  variant = "default",
  size = "medium",
  disabled = false,
  onClick,
  className = "",
}) {
  const classes = [
    "ui-icon-button",
    `ui-icon-button-${variant}`,
    `ui-icon-button-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

export default IconButton;