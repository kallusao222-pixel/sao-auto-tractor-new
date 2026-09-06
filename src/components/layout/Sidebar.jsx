import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Package,
  Settings,
  Tractor,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

import "./Sidebar.css";

const NAVIGATION = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Add Trip",
    icon: Truck,
  },
  {
    label: "All Records",
    icon: ClipboardList,
  },
  {
    label: "Tractor Management",
    icon: Tractor,
  },
  {
    label: "Party Management",
    icon: Users,
  },
  {
    label: "Material Management",
    icon: Package,
  },
  {
    label: "Billing",
    icon: CreditCard,
  },
  {
    label: "Payments",
    icon: WalletCards,
  },
  {
    label: "Reports",
    icon: FileBarChart,
  },
  {
    label: "Staff Management",
    icon: BarChart3,
  },
  {
    label: "Settings",
    icon: Settings,
  },
];

function Sidebar({
  activePage,
  onNavigate,
  mobileOpen = false,
}) {
  return (
    <aside
      className={[
        "sidebar",
        mobileOpen
          ? "mobile-open"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          SA
        </div>

        <div className="sidebar-brand-text">
          <strong>SAO AUTO</strong>

          <span>TRACTOR</span>
        </div>
      </div>

      <nav
        className="sidebar-nav"
        aria-label="Main navigation"
      >
        <span className="sidebar-nav-label">
          WORKSPACE
        </span>

        <div className="sidebar-nav-list">
          {NAVIGATION.map(
            ({
              label,
              icon: Icon,
            }) => {
              const isActive =
                activePage === label;

              return (
                <button
                  key={label}
                  type="button"
                  className={[
                    "sidebar-nav-item",
                    isActive
                      ? "active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    onNavigate?.(label)
                  }
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />

                  <span>{label}</span>
                </button>
              );
            },
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <span>SAO AUTO TRACTOR</span>

        <small>
          Business Management System
        </small>
      </div>
    </aside>
  );
}

export default Sidebar;