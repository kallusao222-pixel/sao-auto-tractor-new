import {
  Search,
  X,
} from "lucide-react";

import "./SearchBox.css";

function SearchBox({
  value = "",
  onChange,
  placeholder = "Search...",
  disabled = false,
  className = "",
}) {
  const classes = [
    "ui-search-box",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <Search
        className="ui-search-box-icon"
        size={17}
        strokeWidth={1.8}
      />

      <input
        type="search"
        value={value}
        onChange={(event) =>
          onChange?.(
            event.target.value,
          )
        }
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
      />

      {value && (
        <button
          type="button"
          className="ui-search-box-clear"
          onClick={() =>
            onChange?.("")
          }
          aria-label="Clear search"
        >
          <X
            size={15}
            strokeWidth={1.8}
          />
        </button>
      )}
    </div>
  );
}

export default SearchBox;