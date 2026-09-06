import {
  Inbox,
} from "lucide-react";

import Button from "./Button";

import "./EmptyState.css";

function EmptyState({
  icon = null,
  title = "No records found",
  message = "",
  action = null,
  className = "",
}) {
  const displayIcon =
    icon || (
      <Inbox
        size={24}
        strokeWidth={1.6}
      />
    );

  const classes = [
    "ui-empty-state",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="ui-empty-state-icon">
        {displayIcon}
      </div>

      <h3>{title}</h3>

      {message && (
        <p>{message}</p>
      )}

      {action && (
        <div className="ui-empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;