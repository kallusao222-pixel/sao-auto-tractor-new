import { forwardRef } from "react";
import "./Input.css";

/**
 * Reusable input.
 * Props: label, hint, error, iconLeft, iconRight, fullWidth
 */
const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    iconLeft,
    iconRight,
    id,
    className = "",
    fullWidth = true,
    ...rest
  },
  ref,
) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`field ${fullWidth ? "field--full" : ""}`}>
      {(label || hint) && (
        <div className="field__top">
          {label && (
            <label htmlFor={inputId} className="field__label">
              {label}
            </label>
          )}
          {hint && <span className="field__hint">{hint}</span>}
        </div>
      )}

      <div className={`input ${error ? "input--error" : ""} ${className}`}>
        {iconLeft && <span className="input__lead">{iconLeft}</span>}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        {iconRight && <span className="input__trail">{iconRight}</span>}
      </div>

      <div className={`field__error ${error ? "field__error--show" : ""}`} aria-live="polite">
        {error && (
          <span id={errorId} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
});

export default Input;