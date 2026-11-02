import {
  LayoutDashboard,
  Truck,
  Route,
  Users,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react";
import TractorLogo from "../icons/TractorLogo";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tractors", label: "Tractors", icon: Truck },
  { id: "trips", label: "Trips", icon: Route },
  { id: "parties", label: "Parties", icon: Users },
  { id: "billing", label: "Billing", icon: Receipt },
];

const BOTTOM_ITEMS = [
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ active = "dashboard", onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <TractorLogo size={22} />
        </div>
        <div className="sidebar__brand-text">
          <strong>SAO AUTO</strong>
          <span>TRACTOR</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <span className="sidebar__section">Workspace</span>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar__link ${active === id ? "sidebar__link--active" : ""}`}
            onClick={() => onNavigate?.(id)}
            type="button"
          >
            <Icon size={17} strokeWidth={1.9} />
            <span>{label}</span>
          </button>
        ))}

        <span className="sidebar__section">System</span>
        {BOTTOM_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar__link ${active === id ? "sidebar__link--active" : ""}`}
            onClick={() => onNavigate?.(id)}
            type="button"
          >
            <Icon size={17} strokeWidth={1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__link sidebar__link--logout" onClick={onLogout} type="button">
          <LogOut size={17} strokeWidth={1.9} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}