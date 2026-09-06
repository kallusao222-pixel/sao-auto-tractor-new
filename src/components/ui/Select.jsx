import {
  ChevronDown,
} from "lucide-react";

import "./Select.css";

function Select({
  value = "",
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  name,
  id,
  required = false,
  className = "",
}) {
  const classes = [
    "ui-select-wrapper",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="ui-select"
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map((option) => {
          const item =
            typeof option ===
            "string"
              ? {
                  value: option,
                  label: option,
                }
              : option;

          return (
            <option
              key={item.value}
              value={item.value}
              disabled={
                item.disabled ||
                false
              }
            >
              {item.label}
            </option>
          );
        })}
      </select>

      <ChevronDown
        className="ui-select-icon"
        size={17}
        strokeWidth={1.8}
      />
    </div>
  );
}

export default Select;