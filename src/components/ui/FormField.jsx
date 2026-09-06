import "./FormField.css";

function FormField({
  label,
  htmlFor,
  required = false,
  hint = "",
  error = "",
  children,
  className = "",
}) {
  const classes = [
    "ui-form-field",
    error
      ? "ui-form-field-error"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="ui-form-field-label"
        >
          {label}

          {required && (
            <span
              className="ui-form-field-required"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="ui-form-field-control">
        {children}
      </div>

      {error ? (
        <p className="ui-form-field-error-text">
          {error}
        </p>
      ) : (
        hint && (
          <p className="ui-form-field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default FormField;