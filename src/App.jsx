import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Moon,
  Package,
  Plus,
  ReceiptText,
  Settings as SettingsIcon,
  Sun,
  Tractor,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { useTheme } from "./theme";

import LoadingState from "./components/ui/LoadingState";
import AppDataProvider from "./context/AppDataContext";

import Dashboard from "./pages/dashboard/Dashboard";

import TractorManagement from "./pages/TractorManagement/TractorManagement";
import PartyManagement from "./pages/PartyManagement/PartyManagement";
import MaterialManagement from "./pages/MaterialManagement/MaterialManagement";
import AddTrip from "./pages/AddTrip/AddTrip";

import AllRecords from "./pages/AllRecords/AllRecords";
import DateWise from "./pages/DateWise/DateWise";
import Reports from "./pages/reports/Reports";

import Billing from "./pages/billing/Billing";
import PartyLedger from "./pages/PartyLedger/PartyLedger";
import Outstanding from "./pages/outstanding/Outstanding";
import Expenses from "./pages/expenses/Expenses";
import Invoice from "./pages/invoice/Invoice";
import Payments from "./pages/payments/Payments";

import StaffManagement from "./pages/StaffManagement/StaffManagement";

import Settings from "./pages/settings/Settings";
import DailyReport from "./pages/records/DailyReport/DailyReport";

import "./App.css";

const MOBILE_QUERY = "(max-width: 900px)";

/* =========================================================
   NAVIGATION
   ========================================================= */

const NAVIGATION = [
  {
    kind: "item",
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    kind: "group",
    id: "transport",
    label: "Transport",
    icon: Tractor,
    children: [
      {
        id: "tractors",
        label: "Tractors",
        icon: Tractor,
      },
      {
        id: "parties",
        label: "Parties",
        icon: Users,
        alsoActive: ["party-details"],
      },
      {
        id: "materials",
        label: "Materials",
        icon: Package,
      },
      {
        id: "add-trip",
        label: "Add Trip",
        icon: Plus,
      },
    ],
  },

  {
    kind: "group",
    id: "records",
    label: "Records",
    icon: ClipboardList,
    children: [
      {
        id: "records",
        label: "All Records",
        icon: ClipboardList,
      },
      {
        id: "date-wise",
        label: "Date Wise",
        icon: CalendarDays,
      },
      {
        id: "reports",
        label: "Reports",
        icon: FileBarChart,
      },
      {
  id: "daily-report",
  label: "Daily Report",
  icon: FileBarChart,
},
    ],
  },

  {
    kind: "group",
    id: "finance",
    label: "Finance",
    icon: WalletCards,
    children: [
      {
        id: "billing",
        label: "Billing",
        icon: WalletCards,
      },
      {
        id: "party-ledger",
        label: "Party Ledger",
        icon: Users,
      },
      {
        id: "invoice",
        label: "Invoice",
        icon: FileBarChart,
      },
      {
        id: "payments",
        label: "Payments",
        icon: CreditCard,
      },
      {
        id: "outstanding",
        label: "Outstanding",
        icon: AlertCircle,
      },
      {
        id: "expenses",
        label: "Expenses",
        icon: ReceiptText,
      },
    ],
  },

  {
    kind: "group",
    id: "staff",
    label: "Staff",
    icon: Users,
    children: [
      {
        id: "staff",
        label: "Staff Management",
        icon: Users,
      },
    ],
  },

  {
    kind: "item",
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

/* =========================================================
   NAVIGATION MAPS
   ========================================================= */

const GROUP_FOR_PAGE = {};
const NAV_ENTRY_FOR_PAGE = {};

for (const item of NAVIGATION) {
  if (item.kind === "item") {
    NAV_ENTRY_FOR_PAGE[item.id] = item.id;
    continue;
  }

  for (const child of item.children) {
    const pages = [
      child.id,
      ...(child.alsoActive || []),
    ];

    for (const page of pages) {
      GROUP_FOR_PAGE[page] = item.id;
      NAV_ENTRY_FOR_PAGE[page] = child.id;
    }
  }
}

/* =========================================================
   PAGE LABEL
   ========================================================= */

function getPageLabel(pageId) {
  if (pageId === "dashboard") {
    return "Dashboard";
  }

  for (const item of NAVIGATION) {
    if (item.kind === "item") {
      if (item.id === pageId) {
        return item.label;
      }
    }

    if (item.kind === "group") {
      const child = item.children.find(
        (entry) =>
          entry.id === pageId ||
          (entry.alsoActive || []).includes(pageId),
      );

      if (child) {
        return child.label;
      }
    }
  }

  if (pageId === "party-details") {
    return "Party Details";
  }

  return "Workspace";
}

/* =========================================================
   PAGE PLACEHOLDER
   ========================================================= */

function PagePlaceholder({ page }) {
  return (
    <div className="app-page-placeholder">
      <div className="app-page-placeholder-inner">
        <span className="app-page-placeholder-eyebrow">
          SAO AUTO TRACTOR
        </span>

        <h2>{getPageLabel(page)}</h2>

        <p>
          This module is ready to be connected
          to the workspace.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function PageLoader() {
  return (
    <div className="app-page-loader">
      <LoadingState
        title="Loading workspace"
        message="Preparing this module..."
      />
    </div>
  );
}

/* =========================================================
   THEME ICON
   ========================================================= */

function ThemeIcon({ theme, size = 18 }) {
  return theme === "dark" ? (
    <Sun
      size={size}
      strokeWidth={1.8}
    />
  ) : (
    <Moon
      size={size}
      strokeWidth={1.8}
    />
  );
}

/* =========================================================
   APP LAYOUT
   ========================================================= */

function AppLayout() {
  const { theme, toggleTheme } = useTheme();

  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const [selectedParty, setSelectedParty] =
    useState(null);

  const [editTripRecord, setEditTripRecord] =
    useState(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(() => {
      if (
        typeof window === "undefined"
      ) {
        return false;
      }

      return window.matchMedia(
        MOBILE_QUERY,
      ).matches;
    });

  const [openMenu, setOpenMenu] =
    useState("transport");

  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  const hamburgerRef = useRef(null);

  /* =======================================================
     CURRENT DATE
     ======================================================= */

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(
        "en-IN",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      ),
    [],
  );

  /* =======================================================
     KEEP CURRENT GROUP OPEN
     ======================================================= */

  useEffect(() => {
    const group =
      GROUP_FOR_PAGE[currentPage];

    if (group) {
      setOpenMenu(group);
    }
  }, [currentPage]);

  /* =======================================================
     MOBILE BREAKPOINT
     ======================================================= */

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const media =
      window.matchMedia(MOBILE_QUERY);

    const handleChange = (event) => {
      setIsMobile(event.matches);

      if (!event.matches) {
        setSidebarOpen(false);
      }
    };

    setIsMobile(media.matches);

    media.addEventListener(
      "change",
      handleChange,
    );

    return () => {
      media.removeEventListener(
        "change",
        handleChange,
      );
    };
  }, []);

  const drawerOpen =
    isMobile && sidebarOpen;

  /* =======================================================
     BODY SCROLL LOCK
     ======================================================= */

  useEffect(() => {
    document.body.style.overflow =
      drawerOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  /* =======================================================
     ACCESSIBILITY / INERT
     ======================================================= */

  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.inert =
        isMobile && !sidebarOpen;
    }

    if (mainRef.current) {
      mainRef.current.inert =
        drawerOpen;
    }
  }, [
    isMobile,
    sidebarOpen,
    drawerOpen,
  ]);

  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setSidebarOpen(false);

      window.setTimeout(() => {
        hamburgerRef.current?.focus();
      }, 0);
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [drawerOpen]);

  /* =======================================================
     FOCUS SIDEBAR WHEN OPEN
     ======================================================= */

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    window.setTimeout(() => {
      sidebarRef.current
        ?.querySelector("button")
        ?.focus();
    }, 0);
  }, [drawerOpen]);

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const changePage = useCallback(
    (
      page,
      {
        keepEditRecord = false,
      } = {},
    ) => {
      if (!keepEditRecord) {
        setEditTripRecord(null);
      }

      setCurrentPage(page);
      setSidebarOpen(false);

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    },
    [],
  );

  const toggleMenu = useCallback(
    (menuId) => {
      setOpenMenu((current) =>
        current === menuId
          ? null
          : menuId,
      );
    },
    [],
  );

  /* =======================================================
     PARTY
     ======================================================= */

  const handleViewParty =
    useCallback(
      (party) => {
        setSelectedParty(party);

        changePage(
          "party-details",
        );
      },
      [changePage],
    );

  /* =======================================================
     EDIT TRIP
     ======================================================= */

  const handleEditRecord =
    useCallback(
      (record) => {
        setEditTripRecord(record);

        changePage(
          "add-trip",
          {
            keepEditRecord: true,
          },
        );
      },
      [changePage],
    );

  const handleEditComplete =
    useCallback(() => {
      setEditTripRecord(null);
    }, []);

  /* =======================================================
     PAGE RENDER
     ======================================================= */

  const renderPage = () => {
    switch (currentPage) {
      /* ===================================================
         DASHBOARD
         =================================================== */

      case "dashboard":
        return (
          <Dashboard
            onNavigate={changePage}
          />
        );

      /* ===================================================
         TRANSPORT
         =================================================== */

      case "tractors":
        return <TractorManagement />;

      case "parties":
        return <PartyManagement />;

      case "materials":
        return <MaterialManagement />;

      case "add-trip":
        return <AddTrip />;

      /* ===================================================
         RECORDS
         =================================================== */

      case "records":
        return <AllRecords />;

      case "date-wise":
        return <DateWise />;

      case "reports":
        return <Reports />;

        case "daily-report":
  return <DailyReport />;

      /* ===================================================
         FINANCE
         =================================================== */

      case "billing":
        return <Billing />;

      case "party-ledger":
        return <PartyLedger />;

      case "invoice":
        return <Invoice />;

      case "payments":
        return <Payments />;

      case "outstanding":
        return <Outstanding />;

      case "expenses":
        return <Expenses />;

      /* ===================================================
         STAFF
         =================================================== */

      case "staff":
        return <StaffManagement />;

      /* ===================================================
         SETTINGS
         =================================================== */

      case "settings":
        return <Settings />;

      /* ===================================================
         PARTY DETAILS
         =================================================== */

      case "party-details":
        return (
          <PagePlaceholder
            page="party-details"
          />
        );

      /* ===================================================
         FALLBACK
         =================================================== */

      default:
        return (
          <Dashboard
            onNavigate={changePage}
          />
        );
    }
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="app">
      {/* ===================================================
          MOBILE HEADER
          =================================================== */}

      <header className="mobile-header">
        <div className="mobile-header-left">
          <button
            ref={hamburgerRef}
            type="button"
            className="mobile-menu-button"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open navigation"
            aria-expanded={
              sidebarOpen
            }
            aria-controls="app-sidebar"
          >
            <span className="brand-mark">
              SA
            </span>
          </button>

          <div className="mobile-header-title">
            <span>
              SAO AUTO TRACTOR
            </span>

            <strong>
              {getPageLabel(
                currentPage,
              )}
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="mobile-theme-button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            theme === "dark"
              ? "Light mode"
              : "Dark mode"
          }
        >
          <ThemeIcon
            theme={theme}
            size={18}
          />
        </button>
      </header>

      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside
        id="app-sidebar"
        ref={sidebarRef}
        className={[
          "app-sidebar",
          drawerOpen
            ? "sidebar-open"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Main navigation"
      >
        {/* =================================================
            BRAND
            ================================================= */}

        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <span>SA</span>
          </div>

          <div className="sidebar-brand-text">
            <strong>
              SAO AUTO
            </strong>

            <span>
              TRACTOR
            </span>
          </div>

          <span
            className="sidebar-brand-status"
            aria-hidden="true"
          >
            ●
          </span>

          {isMobile && (
            <button
              type="button"
              className="sidebar-close"
              onClick={() =>
                setSidebarOpen(false)
              }
              aria-label="Close navigation"
            >
              <X
                size={19}
                strokeWidth={1.8}
              />
            </button>
          )}
        </div>

        {/* =================================================
            NAVIGATION
            ================================================= */}

        <nav
          className="sidebar-nav"
          aria-label="Workspace navigation"
        >
          <div className="sidebar-nav-heading">
            <span className="sidebar-section-label">
              WORKSPACE
            </span>

            <span className="sidebar-nav-line" />
          </div>

          <div className="sidebar-nav-list">
            {NAVIGATION.map(
              (item) => {
                /* =========================================
                   TOP LEVEL ITEM
                   ========================================= */

                if (
                  item.kind ===
                  "item"
                ) {
                  const Icon =
                    item.icon;

                  const active =
                    currentPage ===
                    item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        "sidebar-nav-item",
                        active
                          ? "active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        changePage(
                          item.id,
                        )
                      }
                      aria-current={
                        active
                          ? "page"
                          : undefined
                      }
                    >
                      <span className="sidebar-nav-item-icon">
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />
                      </span>

                      <span className="sidebar-nav-item-label">
                        {item.label}
                      </span>

                      {active && (
                        <span
                          className="sidebar-nav-active-dot"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                }

                /* =========================================
                   NAVIGATION GROUP
                   ========================================= */

                const GroupIcon =
                  item.icon;

                const groupOpen =
                  openMenu ===
                  item.id;

                const groupHasActivePage =
                  item.children.some(
                    (child) =>
                      currentPage ===
                        child.id ||
                      (
                        child.alsoActive ||
                        []
                      ).includes(
                        currentPage,
                      ),
                  );

                return (
                  <div
                    key={item.id}
                    className={[
                      "sidebar-group",
                      groupOpen
                        ? "open"
                        : "",
                      groupHasActivePage
                        ? "has-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className="sidebar-group-button"
                      onClick={() =>
                        toggleMenu(
                          item.id,
                        )
                      }
                      aria-expanded={
                        groupOpen
                      }
                    >
                      <span className="sidebar-group-main">
                        <span className="sidebar-group-icon">
                          <GroupIcon
                            size={18}
                            strokeWidth={1.8}
                          />
                        </span>

                        <span className="sidebar-group-label">
                          {
                            item.label
                          }
                        </span>
                      </span>

                      <span className="sidebar-group-control">
                        {groupHasActivePage && (
                          <span
                            className="sidebar-group-active-dot"
                            aria-hidden="true"
                          />
                        )}

                        <ChevronDown
                          className="sidebar-group-chevron"
                          size={16}
                          strokeWidth={1.8}
                        />
                      </span>
                    </button>

                    {groupOpen && (
                      <div
                        className="sidebar-subnav"
                        role="group"
                        aria-label={`${item.label} navigation`}
                      >
                        {item.children.map(
                          (
                            child,
                          ) => {
                            const ChildIcon =
                              child.icon;

                            const childActive =
                              currentPage ===
                                child.id ||
                              (
                                child.alsoActive ||
                                []
                              ).includes(
                                currentPage,
                              );

                            return (
                              <button
                                key={
                                  child.id
                                }
                                type="button"
                                className={[
                                  "sidebar-subnav-item",
                                  childActive
                                    ? "active"
                                    : "",
                                ]
                                  .filter(
                                    Boolean,
                                  )
                                  .join(" ")}
                                onClick={() =>
                                  changePage(
                                    child.id,
                                  )
                                }
                                aria-current={
                                  childActive
                                    ? "page"
                                    : undefined
                                }
                              >
                                <span className="sidebar-subnav-connector">
                                  <span />
                                </span>

                                <span className="sidebar-subnav-icon">
                                  <ChildIcon
                                    size={16}
                                    strokeWidth={1.8}
                                  />
                                </span>

                                <span className="sidebar-subnav-label">
                                  {
                                    child.label
                                  }
                                </span>

                                {childActive && (
                                  <ChevronRight
                                    className="sidebar-subnav-arrow"
                                    size={14}
                                    strokeWidth={1.8}
                                  />
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </nav>

        {/* =================================================
            SIDEBAR BOTTOM
            ================================================= */}

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-theme-toggle"
            onClick={toggleTheme}
          >
            <span className="sidebar-theme-icon">
              <ThemeIcon
                theme={theme}
                size={17}
              />
            </span>

            <span className="sidebar-theme-copy">
              <strong>
                {theme === "dark"
                  ? "Light Mode"
                  : "Dark Mode"}
              </strong>

              <small>
                Appearance
              </small>
            </span>

            <span
              className="sidebar-theme-status"
              aria-hidden="true"
            >
              {theme === "dark"
                ? "DARK"
                : "LIGHT"}
            </span>
          </button>

          <div className="sidebar-footer">
            <span>
              SAO AUTO TRACTOR
            </span>

            <small>
              Business Management
              System
            </small>
          </div>
        </div>
      </aside>

      {/* ===================================================
          MOBILE BACKDROP
          =================================================== */}

      {drawerOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ===================================================
          MAIN
          =================================================== */}

      <div
        ref={mainRef}
        className="app-main"
      >
        {/* =================================================
            DESKTOP HEADER
            ================================================= */}

        <header className="desktop-header">
          <div className="desktop-header-left">
            <div className="desktop-header-title">
              <span className="header-eyebrow">
                SAO AUTO TRACTOR
              </span>

              <div className="desktop-header-page-row">
                <h1>
                  {getPageLabel(
                    currentPage,
                  )}
                </h1>

                <span
                  className="header-page-indicator"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <div className="desktop-header-actions">
            <div className="header-date-block">
              <CalendarDays
                size={15}
                strokeWidth={1.7}
              />

              <span className="header-date">
                {todayLabel}
              </span>
            </div>

            <button
              type="button"
              className="header-theme-button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                theme === "dark"
                  ? "Light mode"
                  : "Dark mode"
              }
            >
              <ThemeIcon
                theme={theme}
                size={18}
              />
            </button>

            <div className="header-profile">
              <span className="profile-avatar">
                SA
              </span>

              <div className="profile-copy">
                <strong>
                  Administrator
                </strong>

                <span>
                  Office Account
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
            ================================================= */}

        <main className="app-content">
          <div className="app-content-inner">
            <Suspense
              fallback={
                <PageLoader />
              }
            >
              {renderPage()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   ROOT APP
   ========================================================= */

function App() {
  return (
    <AppDataProvider>
      <AppLayout />
    </AppDataProvider>
  );
}

export default App;