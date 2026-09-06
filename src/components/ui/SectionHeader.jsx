import "./SectionHeader.css";

function SectionHeader({
  eyebrow = "",
  title,
  description = "",
  actions = null,
  className = "",
}) {
  const classes = [
    "ui-section-header",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="ui-section-header-content">
        {eyebrow && (
          <span className="ui-section-header-eyebrow">
            {eyebrow}
          </span>
        )}

        {title && (
          <h2>{title}</h2>
        )}

        {description && (
          <p>{description}</p>
        )}
      </div>

      {actions && (
        <div className="ui-section-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;