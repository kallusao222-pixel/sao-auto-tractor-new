import "./FormActions.css";

function FormActions({
  children,
  align = "right",
  className = "",
}) {
  const classes = [
    "ui-form-actions",
    `ui-form-actions-${align}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

export default FormActions;