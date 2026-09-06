import "./Card.css";

function Card({
  children,
  title = "",
  description = "",
  actions = null,
  padding = "medium",
  className = "",
  as: Component = "section",
}) {
  const classes = [
    "ui-card",
    `ui-card-padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes}>
      {(title || description || actions) && (
        <div className="ui-card-header">
          <div className="ui-card-heading">
            {title && (
              <h2>{title}</h2>
            )}

            {description && (
              <p>{description}</p>
            )}
          </div>

          {actions && (
            <div className="ui-card-actions">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="ui-card-body">
        {children}
      </div>
    </Component>
  );
}

export default Card;