import "./PageHeader.css";

function PageHeader({
  title,
  description = "",
  eyebrow = "",
  actions = null,
  className = "",
}) {
  const classes = [
    "ui-page-header",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="ui-page-header-content">
        {eyebrow && (
          <span className="ui-page-header-eyebrow">
            {eyebrow}
          </span>
        )}

        <h2>{title}</h2>

        {description && (
          <p>{description}</p>
        )}
      </div>

      {actions && (
        <div className="ui-page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;