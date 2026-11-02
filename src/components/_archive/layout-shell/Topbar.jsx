import { Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import "./Topbar.css";

export default function Topbar({ title = "Dashboard", subtitle }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="topbar">
      <div className="topbar__title-wrap">
        <h1 className="topbar__title">{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>

      <div className="topbar__actions">
        <label className="topbar__search">
          <Search size={15} strokeWidth={2} aria-hidden="true" />
          <input type="search" placeholder="Search trips, tractors, parties…" />
        </label>

        <button className="topbar__icon-btn" aria-label="Notifications" type="button">
          <Bell size={17} strokeWidth={1.9} />
          <span className="topbar__dot" />
        </button>

        <button
          className="topbar__icon-btn"
          onClick={toggle}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          type="button"
        >
          {isDark ? <Sun size={17} strokeWidth={1.9} /> : <Moon size={17} strokeWidth={1.9} />}
        </button>

        <div className="topbar__avatar" aria-hidden="true">SA</div>
      </div>
    </header>
  );
}