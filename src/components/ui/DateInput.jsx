import FormField from "./FormField";
import "./DateInput.css";

function DateInput({
  label,
  value = "",
  onChange,
  error = "",
  helperText = "",
  required = false,
  disabled = false,
  name = "date",
  min,
  max,
  className = "",
}) {
  return (
    <FormField
      label={label}
      htmlFor={name}
      error={error}
      helperText={helperText}
      required={required}
      className={className}
    >
      <input
        id={name}
        name={name}
        type="date"
        className="ui-date-input"
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
      />
    </FormField>
  );
}

export default DateInput;