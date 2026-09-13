import {
  Component,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  CreditCard,
  FileBarChart,
  Info,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings as SettingsIcon,
  Sun,
  Tractor,
  TriangleAlert,
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
import Login from "./pages/Login/Login";

import "./App.css";

/* =========================================================
   CONFIG
   ========================================================= */

const MOBILE_QUERY = "(max-width: 900px)";
const LOGIN_KEY = "saoAutoTractorLoggedIn";
const PREF_KEY = "saoAutoTractorPrefs";
const WEATHER_REFRESH_MS = 10 * 60 * 1000;

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const DEFAULT_WEATHER_LOCATION = {
  latitude: 23.3441,
  longitude: 85.3096,
  name: "Ranchi",
  region: "Jharkhand",
};

/* Toast durations by variant — Pro Max: timing follows context */
const TOAST_DURATION = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
};

/* =========================================================
   NAVIGATION
   ========================================================= */

const NAVIGATION = [
  { kind: "item", id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    kind: "group",
    id: "transport",
    label: "Transport",
    icon: Tractor,
    children: [
      { id: "tractors", label: "Tractors", icon: Tractor },
      { id: "parties", label: "Parties", icon: Users, alsoActive: ["party-details"] },
      { id: "materials", label: "Materials", icon: Package },
      { id: "add-trip", label: "Add Trip", icon: Plus },
    ],
  },
  {
    kind: "group",
    id: "records",
    label: "Records",
    icon: ClipboardList,
    children: [
      { id: "records", label: "All Records", icon: ClipboardList },
      { id: "date-wise", label: "Date Wise", icon: CalendarDays },
      { id: "reports", label: "Reports", icon: FileBarChart },
      { id: "daily-report", label: "Daily Report", icon: FileBarChart },
    ],
  },
  {
    kind: "group",
    id: "finance",
    label: "Finance",
    icon: WalletCards,
    children: [
      { id: "billing", label: "Billing", icon: WalletCards },
      { id: "party-ledger", label: "Party Ledger", icon: Users },
      { id: "invoice", label: "Invoice", icon: FileBarChart },
      { id: "payments", label: "Payments", icon: CreditCard },
      { id: "outstanding", label: "Outstanding", icon: AlertCircle },
      { id: "expenses", label: "Expenses", icon: ReceiptText },
    ],
  },
  {
    kind: "group",
    id: "staff",
    label: "Staff",
    icon: Users,
    children: [
      { id: "staff", label: "Staff Management", icon: Users },
    ],
  },
  { kind: "item", id: "settings", label: "Settings", icon: SettingsIcon },
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
    const pages = [child.id, ...(child.alsoActive || [])];
    for (const page of pages) {
      GROUP_FOR_PAGE[page] = item.id;
      NAV_ENTRY_FOR_PAGE[page] = child.id;
    }
  }
}

/* =========================================================
   NAVIGATION HELPERS
   ========================================================= */

function getPageLabel(pageId) {
  if (pageId === "dashboard") return "Dashboard";
  if (pageId === "party-details") return "Party Details";

  for (const item of NAVIGATION) {
    if (item.kind === "item" && item.id === pageId) return item.label;
    if (item.kind === "group") {
      const child = item.children.find(
        (e) => e.id === pageId || (e.alsoActive || []).includes(pageId),
      );
      if (child) return child.label;
    }
  }
  return "Workspace";
}

function getBreadcrumb(pageId) {
  const crumbs = [{ label: "Workspace", id: null }];

  if (pageId === "dashboard") {
    crumbs.push({ label: "Dashboard", id: "dashboard" });
    return crumbs;
  }

  for (const item of NAVIGATION) {
    if (item.kind === "item") {
      if (item.id === pageId) {
        crumbs.push({ label: item.label, id: item.id });
        return crumbs;
      }
      continue;
    }
    const child = item.children.find(
      (e) => e.id === pageId || (e.alsoActive || []).includes(pageId),
    );
    if (child) {
      crumbs.push({ label: item.label, id: null });
      crumbs.push({ label: child.label, id: child.id });
      return crumbs;
    }
  }

  crumbs.push({ label: "Page", id: null });
  return crumbs;
}

/* =========================================================
   USER PREFERENCES
   ========================================================= */

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/* =========================================================
   ERROR BOUNDARY
   ========================================================= */

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error" role="alert">
          <div className="app-error__inner">
            <TriangleAlert size={28} strokeWidth={1.8} aria-hidden="true" />
            <h2>Something went wrong</h2>
            <p>
              We hit an unexpected error. Your data is safe — try reloading
              this section.
            </p>
            <button
              type="button"
              className="app-error__btn"
              onClick={this.handleReset}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =========================================================
   TOAST SYSTEM
   ========================================================= */

const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutMapRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const tid = timeoutMapRef.current.get(id);
    if (tid) {
      window.clearTimeout(tid);
      timeoutMapRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const variant = toast.variant || "info";

      const item = {
        id,
        variant,
        title: toast.title || "",
        message: toast.message || "",
        duration:
          toast.duration ?? TOAST_DURATION[variant] ?? 4000,
      };

      setToasts((cur) => [...cur, item]);

      if (item.duration > 0) {
        const tid = window.setTimeout(() => {
          remove(id);
        }, item.duration);
        timeoutMapRef.current.set(id, tid);
      }

      return id;
    },
    [remove],
  );

  useEffect(() => {
    const map = timeoutMapRef.current;
    return () => {
      map.forEach((tid) => window.clearTimeout(tid));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant}`}
            role={t.variant === "error" ? "alert" : "status"}
            aria-live={t.variant === "error" ? "assertive" : "polite"}
          >
            <span className="toast__icon" aria-hidden="true">
              {t.variant === "success" && <CheckCircle2 size={16} strokeWidth={2} />}
              {t.variant === "error" && <AlertCircle size={16} strokeWidth={2} />}
              {t.variant === "warning" && <TriangleAlert size={16} strokeWidth={2} />}
              {t.variant === "info" && <Info size={16} strokeWidth={2} />}
            </span>
            <div className="toast__body">
              {t.title && <strong>{t.title}</strong>}
              {t.message && <span>{t.message}</span>}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* =========================================================
   FOCUS TRAP HOOK
   ========================================================= */

function useFocusTrap(containerRef, isActive) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    const node = containerRef.current;

    const handleKey = (e) => {
      if (e.key !== "Tab") return;
      const focusables = node.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleKey);
    return () => node.removeEventListener("keydown", handleKey);
  }, [containerRef, isActive]);
}

/* =========================================================
   KEYBOARD SHORTCUT HOOK
   ========================================================= */

function useHotkey(combo, handler, { preventDefault = true } = {}) {
  useEffect(() => {
    const handle = (e) => {
      const key = e.key.toLowerCase();
      const isCmd = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      const matches =
        (combo === "cmd+/" && isCmd && key === "/") ||
        (combo === "shift+/" && isShift && key === "?");

      if (matches) {
        if (preventDefault) e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [combo, handler, preventDefault]);
}

/* =========================================================
   PAGE PLACEHOLDER
   ========================================================= */

function PagePlaceholder({ page }) {
  return (
    <div className="app-page-placeholder">
      <div className="app-page-placeholder-inner">
        <span className="app-page-placeholder-eyebrow">SAO AUTO TRACTOR</span>
        <h2>{getPageLabel(page)}</h2>
        <p>This module is ready to be connected to the workspace.</p>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE LOADER
   ========================================================= */

function PageLoader() {
  return (
    <div className="app-page-loader" role="status" aria-live="polite">
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
    <Sun size={size} strokeWidth={1.8} aria-hidden="true" />
  ) : (
    <Moon size={size} strokeWidth={1.8} aria-hidden="true" />
  );
}

/* =========================================================
   WEATHER HELPERS
   ========================================================= */

function getWeatherInfo(code) {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code === 1 || code === 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Cloudy", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "Foggy", Icon: CloudFog };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", Icon: CloudDrizzle };
  if ([61, 63, 65, 66, 67].includes(code)) return { label: "Rain", Icon: CloudRain };
  if ([71, 73, 75, 77].includes(code)) return { label: "Snow", Icon: CloudSnow };
  if ([80, 81, 82].includes(code)) return { label: "Rain showers", Icon: CloudRain };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Weather", Icon: Cloud };
}

/* =========================================================
   WEATHER HOOK
   ========================================================= */

function useWeather() {
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("loading");
  const [location, setLocation] = useState(DEFAULT_WEATHER_LOCATION);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchWeather = useCallback(async (loc) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");

    try {
      const params = new URLSearchParams({
        latitude: String(loc.latitude),
        longitude: String(loc.longitude),
        current: "temperature_2m,weather_code",
        timezone: "auto",
      });

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Weather request failed");
      const data = await res.json();
      const current = data?.current;
      if (!current) throw new Error("Weather data unavailable");

      if (!mountedRef.current) return;

      setWeather({
        temperature: Math.round(Number(current.temperature_2m)),
        weatherCode: Number(current.weather_code),
      });
      setStatus("ready");
    } catch (err) {
      if (err.name === "AbortError") return;
      if (!mountedRef.current) return;
      setWeather(null);
      setStatus("error");
    }
  }, []);

  const detectLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation(DEFAULT_WEATHER_LOCATION);
      fetchWeather(DEFAULT_WEATHER_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let loc = { latitude, longitude, name: "Current location", region: "" };

        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
          const res = await fetch(url, {
            headers: { Accept: "application/json", "Accept-Language": "en" },
          });
          if (res.ok) {
            const data = await res.json();
            const a = data?.address || {};
            loc = {
              latitude,
              longitude,
              name:
                a.city || a.town || a.village || a.municipality || a.county ||
                "Current location",
              region: a.state || "",
            };
          }
        } catch {
          /* keep generic */
        }

        if (!mountedRef.current) return;
        setLocation(loc);
        fetchWeather(loc);
      },
      () => {
        if (!mountedRef.current) return;
        setLocation(DEFAULT_WEATHER_LOCATION);
        fetchWeather(DEFAULT_WEATHER_LOCATION);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, [fetchWeather]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  useEffect(() => {
    const id = window.setInterval(() => fetchWeather(location), WEATHER_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [fetchWeather, location]);

  const info = useMemo(
    () => (weather ? getWeatherInfo(weather.weatherCode) : { label: "—", Icon: Cloud }),
    [weather],
  );

  return {
    weather,
    status,
    location,
    info,
    refresh: () => fetchWeather(location),
  };
}

/* =========================================================
   NOTIFICATION PANEL
   ========================================================= */

function NotificationPanel({ open, items, onClose, onNavigate }) {
  const panelRef = useRef(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open) return null;

  const severityIcon = {
    high: AlertCircle,
    medium: TriangleAlert,
    low: Info,
  };

  return (
    <div className="notif" role="dialog" aria-label="Notifications">
      <button
        type="button"
        className="notif__backdrop"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <div className="notif__panel" ref={panelRef}>
        <header className="notif__head">
          <div>
            <span className="notif__eyebrow">INBOX</span>
            <h3>Notifications</h3>
          </div>
          <button
            type="button"
            className="notif__close"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="notif__empty">
            <CheckCircle2 size={20} strokeWidth={1.8} aria-hidden="true" />
            <strong>All clear</strong>
            <span>No reminders right now.</span>
          </div>
        ) : (
          <ul className="notif__list" role="list">
            {items.map((n) => {
              const Icon = severityIcon[n.severity] || Info;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif__item notif__item--${n.severity}`}
                    onClick={() => {
                      if (n.action) onNavigate(n.action);
                      onClose();
                    }}
                  >
                    <span className="notif__icon" aria-hidden="true">
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="notif__body">
                      <strong>{n.title || "Reminder"}</strong>
                      <span>{n.message}</span>
                    </span>
                    <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   APP LAYOUT
   ========================================================= */

function AppLayout({ onLogout }) {
  const { theme, toggleTheme } = useTheme();
  useToast();

  const initialPrefs = useMemo(() => loadPrefs(), []);

  const [currentPage, setCurrentPage] = useState(
    initialPrefs.lastPage || "dashboard",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    !!initialPrefs.sidebarCollapsed,
  );
  const [openMenu, setOpenMenu] = useState(null);
  const [editTripRecord, setEditTripRecord] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  const {
    weather,
    status: weatherStatus,
    location: weatherLocation,
    info: weatherInfo,
    refresh: refreshWeather,
  } = useWeather();

  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  const hamburgerRef = useRef(null);
  const notifBtnRef = useRef(null);

  /* ---- Focus trap on mobile drawer ---- */
  useFocusTrap(sidebarRef, isMobile && sidebarOpen);

  /* ---- Hotkeys ---- */
  useHotkey("cmd+/", () => setShowHotkeys((v) => !v));
  useHotkey("shift+/", () => setShowHotkeys((v) => !v));

  /* ---- Global Escape — closes overlays ---- */
  useEffect(() => {
    const handle = (e) => {
      if (e.key !== "Escape") return;

      if (showHotkeys) {
        setShowHotkeys(false);
        return;
      }
      if (notifOpen) {
        setNotifOpen(false);
        return;
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [showHotkeys, notifOpen]);

  /* ---- Date ---- */
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  /* ---- Auto-open current group ---- */
  useEffect(() => {
    const group = GROUP_FOR_PAGE[currentPage];
    if (group) setOpenMenu(group);
  }, [currentPage]);

  /* ---- Persist prefs ---- */
  useEffect(() => {
    savePrefs({
      lastPage: currentPage,
      sidebarCollapsed,
    });
  }, [currentPage, sidebarCollapsed]);

  /* ---- Mobile breakpoint ---- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(MOBILE_QUERY);
    const handle = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    setIsMobile(media.matches);
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);

  const drawerOpen = isMobile && sidebarOpen;

  /* ---- Body scroll lock ---- */
  useEffect(() => {
    const anyOpen = drawerOpen || notifOpen || showHotkeys;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, notifOpen, showHotkeys]);

  /* ---- Inert main while drawer open ---- */
  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = isMobile && !sidebarOpen;
    if (mainRef.current) mainRef.current.inert = drawerOpen || notifOpen;
  }, [isMobile, sidebarOpen, drawerOpen, notifOpen]);

  /* ---- Escape closes mobile drawer ---- */
  useEffect(() => {
    if (!drawerOpen) return;
    const handle = (e) => {
      if (e.key !== "Escape") return;
      setSidebarOpen(false);
      window.setTimeout(() => hamburgerRef.current?.focus(), 0);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [drawerOpen]);

  /* ---- Focus first sidebar button ---- */
  useEffect(() => {
    if (!drawerOpen) return;
    window.setTimeout(() => {
      sidebarRef.current?.querySelector("button")?.focus();
    }, 0);
  }, [drawerOpen]);

  /* ---- Navigation ---- */
  const changePage = useCallback(
    (page, { keepEditRecord = false } = {}) => {
      if (!keepEditRecord) setEditTripRecord(null);
      setCurrentPage(page);
      setSidebarOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    },
    [],
  );

  const toggleMenu = useCallback((menuId) => {
    setOpenMenu((cur) => (cur === menuId ? null : menuId));
  }, []);

  /* ---- Party / edit handlers ---- */
  const handleViewParty = useCallback(
    (party) => {
      setEditTripRecord(null);
      changePage("party-details");
      // Store selected party for the details page if needed
      window.__saoSelectedParty = party;
    },
    [changePage],
  );

  const handleEditRecord = useCallback(
    (record) => {
      setEditTripRecord(record);
      changePage("add-trip", { keepEditRecord: true });
    },
    [changePage],
  );

  const handleEditComplete = useCallback(() => setEditTripRecord(null), []);

  /* ---- Breadcrumb ---- */
  const breadcrumb = useMemo(() => getBreadcrumb(currentPage), [currentPage]);

  /* ---- Notifications (hook to real data later) ---- */
  const notifications = useMemo(() => [], []);

  /* ---- Render page ---- */
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <Dashboard onNavigate={changePage} />;
      case "tractors": return <TractorManagement />;
      case "parties": return <PartyManagement onViewParty={handleViewParty} />;
      case "materials": return <MaterialManagement />;
      case "add-trip":
        return (
          <AddTrip
            editRecord={editTripRecord}
            onEditComplete={handleEditComplete}
          />
        );
      case "records": return <AllRecords onEditRecord={handleEditRecord} />;
      case "date-wise": return <DateWise />;
      case "reports": return <Reports />;
      case "daily-report": return <DailyReport />;
      case "billing": return <Billing />;
      case "party-ledger": return <PartyLedger />;
      case "invoice": return <Invoice />;
      case "payments": return <Payments />;
      case "outstanding": return <Outstanding />;
      case "expenses": return <Expenses />;
      case "staff": return <StaffManagement />;
      case "settings": return <Settings />;
      case "party-details": return <PagePlaceholder page="party-details" />;
      default: return <Dashboard onNavigate={changePage} />;
    }
  };

  const WeatherIcon = weatherInfo.Icon;
  const currentPageLabel = getPageLabel(currentPage);
  const unreadCount = notifications.length;

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className={`app ${sidebarCollapsed ? "app--sidebar-collapsed" : ""}`}>
      {/* ---- Skip link ---- */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ---- Mobile header ---- */}
      <header className="mobile-header">
        <div className="mobile-header-left">
          <button
            ref={hamburgerRef}
            type="button"
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <Menu size={20} strokeWidth={1.9} aria-hidden="true" />
          </button>

          <div className="mobile-header-title">
            <span>SAO AUTO TRACTOR</span>
            <strong title={currentPageLabel}>{currentPageLabel}</strong>
          </div>
        </div>

        <div className="mobile-header-actions">
          <button
            type="button"
            className="mobile-icon-button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <ThemeIcon theme={theme} size={18} />
          </button>
        </div>
      </header>

      {/* ---- Sidebar ---- */}
      <aside
        id="app-sidebar"
        ref={sidebarRef}
        className={[
          "app-sidebar",
          drawerOpen ? "sidebar-open" : "",
          sidebarCollapsed ? "sidebar-collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark" aria-hidden="true">
            <span>SA</span>
          </div>

          <div className="sidebar-brand-text">
            <strong>SAO AUTO</strong>
            <span>TRACTOR</span>
          </div>

          <span className="sidebar-brand-status" role="status">
            <span className="sr-only">Status: </span>
            Live
          </span>

          {isMobile ? (
            <button
              type="button"
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X size={19} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="sidebar-collapse"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={16} strokeWidth={1.9} aria-hidden="true" />
              ) : (
                <ChevronDown size={16} strokeWidth={1.9} aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <div className="sidebar-nav-heading">
            <span className="sidebar-section-label">WORKSPACE</span>
            <span className="sidebar-nav-line" aria-hidden="true" />
          </div>

          <div className="sidebar-nav-list">
            {NAVIGATION.map((item) => {
              /* ---- Top-level item ---- */
              if (item.kind === "item") {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={["sidebar-nav-item", active ? "active" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => changePage(item.id)}
                    aria-current={active ? "page" : undefined}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar-nav-item-icon">
                      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="sidebar-nav-item-label">{item.label}</span>
                    {active && (
                      <span className="sidebar-nav-active-dot" aria-hidden="true" />
                    )}
                  </button>
                );
              }

              /* ---- Group ---- */
              const GroupIcon = item.icon;
              const groupOpen = openMenu === item.id;
              const groupActive = item.children.some(
                (c) =>
                  currentPage === c.id || (c.alsoActive || []).includes(currentPage),
              );

              return (
                <div
                  key={item.id}
                  className={[
                    "sidebar-group",
                    groupOpen ? "open" : "",
                    groupActive ? "has-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    className="sidebar-group-button"
                    onClick={() => toggleMenu(item.id)}
                    aria-expanded={groupOpen}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar-group-main">
                      <span className="sidebar-group-icon">
                        <GroupIcon size={18} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="sidebar-group-label">{item.label}</span>
                    </span>
                    <span className="sidebar-group-control">
                      {groupActive && (
                        <span className="sidebar-group-active-dot" aria-hidden="true" />
                      )}
                      <ChevronDown
                        className="sidebar-group-chevron"
                        size={16}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  {groupOpen && !sidebarCollapsed && (
                    <div
                      className="sidebar-subnav"
                      role="group"
                      aria-label={`${item.label} navigation`}
                    >
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive =
                          currentPage === child.id ||
                          (child.alsoActive || []).includes(currentPage);

                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={["sidebar-subnav-item", childActive ? "active" : ""]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => changePage(child.id)}
                            aria-current={childActive ? "page" : undefined}
                            title={child.label}
                          >
                            <span className="sidebar-subnav-connector" aria-hidden="true">
                              <span />
                            </span>
                            <span className="sidebar-subnav-icon">
                              <ChildIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                            </span>
                            <span className="sidebar-subnav-label">{child.label}</span>
                            {childActive && (
                              <ChevronRight
                                className="sidebar-subnav-arrow"
                                size={14}
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={sidebarCollapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          >
            <span className="sidebar-theme-icon">
              <ThemeIcon theme={theme} size={17} />
            </span>
            <span className="sidebar-theme-copy">
              <strong>{theme === "dark" ? "Light Mode" : "Dark Mode"}</strong>
              <small>Appearance</small>
            </span>
            <span className="sidebar-theme-status" aria-hidden="true">
              {theme === "dark" ? "DARK" : "LIGHT"}
            </span>
          </button>

          <div className="sidebar-footer">
            <span>SAO AUTO TRACTOR</span>
            <small>Business Management System</small>
          </div>
        </div>
      </aside>

      {/* ---- Backdrop ---- */}
      {drawerOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ---- Main ---- */}
      <div ref={mainRef} className="app-main">
        <header className="desktop-header">
          <div className="desktop-header-left">
            <div className="desktop-header-title">
              <nav className="desktop-header-breadcrumb" aria-label="Breadcrumb">
                {breadcrumb.map((crumb, i) => (
                  <span key={`${crumb.label}-${i}`} className="breadcrumb-item">
                    {i > 0 && (
                      <ChevronRight
                        className="breadcrumb-sep"
                        size={11}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                    {i === breadcrumb.length - 1 ? (
                      <strong aria-current="page">{crumb.label}</strong>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>

              <div className="desktop-header-page-row">
                <h1 title={currentPageLabel}>{currentPageLabel}</h1>
                <span className="header-page-indicator" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="desktop-header-actions">
            {/* Date */}
            <div className="header-date-block">
              <CalendarDays size={15} strokeWidth={1.7} aria-hidden="true" />
              <span className="header-date">{todayLabel}</span>
            </div>

            {/* Weather */}
            <button
              type="button"
              className={[
                "header-weather-block",
                weatherStatus === "error" ? "has-error" : "",
                weatherStatus === "loading" ? "is-loading" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={refreshWeather}
              title={`${weatherInfo.label} • ${weatherLocation.name} — click to refresh`}
              aria-live="polite"
              aria-label={`Weather: ${weatherInfo.label}, ${
                weather ? `${weather.temperature}°C` : "unavailable"
              }. Location: ${weatherLocation.name}. Click to refresh.`}
            >
              {weatherStatus === "loading" ? (
                <>
                  <RefreshCw
                    size={15}
                    strokeWidth={1.8}
                    className="header-spin"
                    aria-hidden="true"
                  />
                  <span className="header-weather-temperature">--°C</span>
                </>
              ) : weatherStatus === "error" ? (
                <>
                  <AlertCircle size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span className="header-weather-temperature">Retry</span>
                </>
              ) : (
                <>
                  <WeatherIcon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <div className="header-weather-copy">
                    <span className="header-weather-temperature">
                      {weather ? `${weather.temperature}°C` : "--°C"}
                    </span>
                    <span className="header-weather-condition">
                      {weatherInfo.label}
                    </span>
                  </div>
                  <span className="header-weather-location">
                    <MapPin size={11} strokeWidth={1.8} aria-hidden="true" />
                    {weatherLocation.name}
                  </span>
                </>
              )}
            </button>

            {/* Notifications */}
            <button
              ref={notifBtnRef}
              type="button"
              className="header-icon-button header-notif-button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label={`Notifications${
                unreadCount ? `, ${unreadCount} unread` : ", none unread"
              }`}
              aria-expanded={notifOpen}
              title="Notifications"
            >
              <Bell size={17} strokeWidth={1.9} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="header-notif-dot" aria-hidden="true">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Theme */}
            <button
              type="button"
              className="header-theme-button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              <ThemeIcon theme={theme} size={18} />
            </button>

            {/* Profile / Sign out */}
            <button
              type="button"
              className="header-profile header-profile--button"
              onClick={() => onLogout?.()}
              aria-label="Sign out"
              title="Sign out"
            >
              <span className="profile-avatar" aria-hidden="true">SA</span>
              <div className="profile-copy">
                <strong>Administrator</strong>
                <span>Office Account</span>
              </div>
            </button>
          </div>
        </header>

        <main className="app-content" id="main-content" tabIndex={-1}>
          <div className="app-content-inner" key={currentPage}>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* ---- Notification panel ---- */}
      <NotificationPanel
        open={notifOpen}
        items={notifications}
        onClose={() => setNotifOpen(false)}
        onNavigate={changePage}
      />

      {/* ---- Hotkeys help ---- */}
      {showHotkeys && (
        <div
          className="hotkeys"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <button
            type="button"
            className="hotkeys__backdrop"
            onClick={() => setShowHotkeys(false)}
            aria-label="Close shortcuts"
          />
          <div className="hotkeys__panel">
            <h3>Keyboard shortcuts</h3>
            <ul>
              <li>
                <kbd>⌘</kbd> <kbd>/</kbd> <span>Show shortcuts</span>
              </li>
              <li>
                <kbd>Esc</kbd> <span>Close panels</span>
              </li>
            </ul>
            <button
              type="button"
              className="hotkeys__close"
              onClick={() => setShowHotkeys(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ROOT APP
   ========================================================= */

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem(LOGIN_KEY) === "true",
  );

  const handleLogin = useCallback(() => setIsLoggedIn(true), []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(LOGIN_KEY);
    setIsLoggedIn(false);
  }, []);

  return (
    <ErrorBoundary>
      <AppDataProvider>
        <ToastProvider>
          {isLoggedIn ? (
            <AppLayout onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </ToastProvider>
      </AppDataProvider>
    </ErrorBoundary>
  );
}

export default App;