import "./Input.css";

function Input({
  label,
  error = "",
  helperText = "",
  required = false,
  id,
  name,
  type = "text",
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  readOnly = false,
  min,
  max,
  step,
  autoComplete,
  className = "",
  ...rest
}) {
  const inputId =
    id || name || undefined;

  return (
    <div
      className={[
        "ui-input-field",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <label htmlFor={inputId}>
          {label}

          {required && (
            <span
              className="ui-input-required"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : "false"}
        {...rest}
      />

      {error && (
        <span className="ui-input-error">
          {error}
        </span>
      )}

      {!error && helperText && (
        <span className="ui-input-helper">
          {helperText}
        </span>
      )}
    </div>
  );
}

export default Input;