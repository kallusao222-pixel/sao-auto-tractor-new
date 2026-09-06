import "./SummaryStrip.css";

function SummaryStrip({
  items = [],
  className = "",
}) {
  const classes = [
    "ui-summary-strip",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {items.map((item, index) => (
        <div
          key={
            item.key ||
            item.label ||
            index
          }
          className="ui-summary-strip-item"
        >
          {item.icon && (
            <div className="ui-summary-strip-icon">
              {item.icon}
            </div>
          )}

          <div className="ui-summary-strip-content">
            <span>
              {item.label}
            </span>

            <strong>
              {item.value}
            </strong>

            {item.description && (
              <small>
                {item.description}
              </small>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryStrip;