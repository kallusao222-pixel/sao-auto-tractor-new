import "./Textarea.css";

function Textarea({
  label,
  error = "",
  helperText = "",
  required = false,
  id,
  name,
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  readOnly = false,
  rows = 4,
  maxLength,
  className = "",
  ...rest
}) {
  const textareaId =
    id || name || undefined;

  return (
    <div
      className={[
        "ui-textarea-field",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <label htmlFor={textareaId}>
          {label}

          {required && (
            <span
              className="ui-textarea-required"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? "true" : "false"}
        {...rest}
      />

      {error && (
        <span className="ui-textarea-error">
          {error}
        </span>
      )}

      {!error && helperText && (
        <span className="ui-textarea-helper">
          {helperText}
        </span>
      )}
    </div>
  );
}

export default Textarea;