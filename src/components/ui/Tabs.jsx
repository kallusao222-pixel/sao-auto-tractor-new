import "./Tabs.css";

function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = "",
}) {
  const classes = [
    "ui-tabs",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role="tablist"
    >
      {tabs.map((tab) => {
        const value =
          typeof tab === "string"
            ? tab
            : tab.value;

        const label =
          typeof tab === "string"
            ? tab
            : tab.label;

        const disabled =
          typeof tab === "object" &&
          tab.disabled;

        const isActive =
          String(activeTab) ===
          String(value);

        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={
              isActive
            }
            disabled={disabled}
            className={
              isActive
                ? "ui-tab ui-tab-active"
                : "ui-tab"
            }
            onClick={() =>
              onChange?.(value)
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;