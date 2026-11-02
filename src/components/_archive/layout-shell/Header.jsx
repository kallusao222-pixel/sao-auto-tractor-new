import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";

import "./Header.css";

function Header({
  activePage,
  onMenuClick,
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          title="Open navigation"
        >
          <Menu
            size={20}
            strokeWidth={1.8}
          />
        </button>

        <div className="header-title">
          <span className="header-eyebrow">
            SAO AUTO TRACTOR
          </span>

          <h1>{activePage}</h1>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Search"
          title="Search"
        >
          <Search
            size={18}
            strokeWidth={1.8}
          />
        </button>

        <button
          type="button"
          className="header-icon-button"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell
            size={18}
            strokeWidth={1.8}
          />

          <span
            className="notification-dot"
            aria-hidden="true"
          />
        </button>

        <div className="header-divider" />

        <button
          type="button"
          className="profile-button"
          aria-label="Open profile menu"
        >
          <span className="profile-avatar">
            SA
          </span>

          <span className="profile-info">
            <strong>
              Administrator
            </strong>

            <span>
              Office Account
            </span>
          </span>

          <ChevronDown
            className="profile-chevron"
            size={16}
            strokeWidth={1.8}
          />
        </button>
      </div>
    </header>
  );
}

export default Header;