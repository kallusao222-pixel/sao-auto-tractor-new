import {
  RotateCcw,
} from "lucide-react";

import Button from "./Button";

import "./FilterBar.css";

function FilterBar({
  children,
  onReset,
  showReset = false,
  resetLabel = "Reset",
  className = "",
}) {
  const classes = [
    "ui-filter-bar",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="ui-filter-bar-fields">
        {children}
      </div>

      {showReset && onReset && (
        <div className="ui-filter-bar-actions">
          <Button
            variant="ghost"
            size="small"
            icon={
              <RotateCcw
                size={15}
              />
            }
            onClick={onReset}
          >
            {resetLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default FilterBar;