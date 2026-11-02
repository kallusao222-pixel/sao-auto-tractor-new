import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./AppShell.css";

export default function AppShell({
  children,
  title,
  subtitle,
  activeNav,
  onNavigate,
  onLogout,
}) {
  return (
    <div className="shell">
      <Sidebar active={activeNav} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="shell__main">
        <Topbar title={title} subtitle={subtitle} />
        <main className="shell__content">{children}</main>
      </div>
    </div>
  );
}