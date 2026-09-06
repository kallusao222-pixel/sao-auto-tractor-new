import "./InfoRow.css";

function InfoRow({
  label,
  value,
  icon = null,
  valueClassName = "",
  className = "",
}) {
  return (
    <div
      className={[
        "ui-info-row",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ui-info-row-label">
        {icon && (
          <span className="ui-info-row-icon">
            {icon}
          </span>
        )}

        <span>{label}</span>
      </div>

      <div
        className={[
          "ui-info-row-value",
          valueClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

export default InfoRow;