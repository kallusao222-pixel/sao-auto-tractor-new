import { useState } from "react";

import Sidebar from "./Sidebar";
import Header from "./Header";

import Dashboard from "../../pages/Dashboard/Dashboard";

import "./AppShell.css";

function AppShell() {
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const handleNavigation = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <Dashboard
            onNavigate={handleNavigation}
          />
        );

      default:
        return (
          <div className="page-placeholder">
            <span className="page-placeholder-label">
              SAO AUTO TRACTOR
            </span>

            <h2>{activePage}</h2>

            <p>
              This workspace is ready for the{" "}
              {activePage.toLowerCase()} module.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigation}
        mobileOpen={mobileMenuOpen}
      />

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}

      <div className="app-main">
        <Header
          activePage={activePage}
          onMenuClick={() =>
            setMobileMenuOpen(true)
          }
        />

        <main className="app-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default AppShell;