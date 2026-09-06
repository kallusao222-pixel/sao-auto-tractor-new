import "./StatCard.css";

function StatCard({
  label,
  value,
  icon = null,
  trend = null,
  description = "",
  variant = "default",
  className = "",
}) {
  const classes = [
    "ui-stat-card",
    `ui-stat-card-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      {icon && (
        <div className="ui-stat-card-icon">
          {icon}
        </div>
      )}

      <div className="ui-stat-card-content">
        <span className="ui-stat-card-label">
          {label}
        </span>

        <strong className="ui-stat-card-value">
          {value}
        </strong>

        {(trend || description) && (
          <div className="ui-stat-card-meta">
            {trend && (
              <span className="ui-stat-card-trend">
                {trend}
              </span>
            )}

            {description && (
              <span>
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default StatCard;