import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Cloud,
  Code2,
  Database,
  Download,
  FileBarChart,
  Hash,
  Info,
  KeyRound,
  Keyboard,
  Lock,
  Palette,
  Package,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Tractor,
  Trash2,
  Unlock,
  Upload,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";

import "./Settings.css";

const STORAGE_KEYS = {
  settings: "saoAutoTractorSettings",
  pin: "saoAutoTractorAppPin",
  loginPassword: "saoAutoTractorLoginPassword",

  trips: "saoAutoTractorTrips",
  payments: "saoAutoTractorPayments",
  parties: "saoAutoTractorParties",
  tractors: "saoAutoTractorTractors",
  materials: "saoAutoTractorMaterials",

  expenses: "saoAutoTractorExpenses",
  staff: "saoAutoTractorStaff",
  staffAttendance: "saoAutoTractorStaffAttendance",
  staffSalaryPayments: "saoAutoTractorStaffSalaryPayments",

  invoices: "saoAutoTractorInvoices",
  invoiceNumber: "saoAutoTractorInvoiceNumber",
  businessDetails: "saoAutoTractorBusinessDetails",

  backupMeta: "saoAutoTractorLastBackup",
};

const APP_VERSION = "1.4.0";

const defaultSettings = {
  companyName: "SAO AUTO TRACTOR",
  businessName: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  phone: "",
  email: "",
  website: "",
  gstNumber: "",
  panNumber: "",
  companyLogo: "",
  footerText:
    "SAO AUTO TRACTOR • Transportation Management System",

  defaultTripType: "Loading",
  defaultUnit: "Ton",
  rateType: "Per Trip",
  loadingRequired: true,
  unloadingRequired: false,
  autoTripNumber: true,

  currency: "₹",
  decimalPlaces: 0,
  billPrefix: "SAT",
  paymentMode: "Cash",
  allowAdvance: true,
  allowExtraPayment: true,

  autoPartyCode: true,
  creditTracking: true,
  duplicateWarning: true,

  dateFormat: "DD-MM-YYYY",
  timeFormat: "12 Hour",
  financialYear: "April - March",

  showTodayTrips: true,
  showBilling: true,
  showReceived: true,
  showDue: true,
  showTractors: true,
  showRecentRecords: true,

  notifications: true,
  dueAlerts: true,
  tripAlerts: true,
  maintenanceAlerts: true,
  staffSalaryAlerts: true,
  backupReminder: true,
  browserNotifications: false,

  theme: "Light",
  layout: "Comfortable",
  compactTables: false,

  appLock: false,
  autoLock: "Never",

  cloudSync: false,
  autoSync: false,
  cloudBackup: false,

  accountMode: "Local",
};

/* =========================================================
   SETTINGS NAVIGATION
========================================================= */

const menuGroups = [
  {
    id: "business",
    title: "Business",
    items: [
      {
        id: "company",
        icon: Building2,
        title: "Company Profile",
        subtitle: "Business identity & contact",
      },
      {
        id: "transport",
        icon: Tractor,
        title: "Transport",
        subtitle: "Trip preferences",
      },
      {
        id: "party",
        icon: Users,
        title: "Party",
        subtitle: "Customer management",
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    items: [
      {
        id: "billing",
        icon: WalletCards,
        title: "Billing",
        subtitle: "Bills & payments",
      },
    ],
  },
  {
    id: "system",
    title: "System",
    items: [
      {
        id: "datetime",
        icon: CalendarDays,
        title: "Date & Time",
        subtitle: "Date preferences",
      },
      {
        id: "dashboard",
        icon: FileBarChart,
        title: "Dashboard",
        subtitle: "Dashboard cards",
      },
      {
        id: "notifications",
        icon: Bell,
        title: "Notifications",
        subtitle: "Alerts & reminders",
      },
      {
        id: "appearance",
        icon: Palette,
        title: "Appearance",
        subtitle: "Display preferences",
      },
    ],
  },
  {
    id: "data-security",
    title: "Data & Security",
    items: [
      {
        id: "backup",
        icon: Database,
        title: "Backup & Data",
        subtitle: "Protect your data",
      },
      {
        id: "cloud",
        icon: Cloud,
        title: "Cloud Sync",
        subtitle: "Future multi-device sync",
      },
      {
        id: "security",
        icon: Lock,
        title: "Security",
        subtitle: "App protection",
      },
      {
        id: "account",
        icon: Users,
        title: "Account",
        subtitle: "Local & online account",
      },
    ],
  },
  {
    id: "app",
    title: "App",
    items: [
      {
        id: "about",
        icon: Info,
        title: "About",
        subtitle: "App information",
      },
    ],
  },
];

const menuItems = menuGroups.flatMap((group) => group.items);

/* =========================================================
   HELPERS
========================================================= */

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readObject(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unavailable";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function IconButton({ children, onClick, title }) {
  return (
    <button
      type="button"
      className="settings-icon-btn"
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  hint,
}) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>

      {options ? (
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option
              key={option.value ?? option}
              value={option.value ?? option}
            >
              {option.label ?? option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}

      {hint && (
        <small className="settings-field-hint">{hint}</small>
      )}
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, hint }) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {hint && (
        <small className="settings-field-hint">{hint}</small>
      )}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      className={`settings-toggle ${value ? "on" : ""}`}
      onClick={() => onChange(!value)}
      aria-label={label}
      aria-pressed={value}
    >
      <span className="settings-toggle-track">
        <span className="settings-knob" />
      </span>
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  last = false,
}) {
  return (
    <div
      className={`settings-setting-row ${last ? "last" : ""}`}
    >
      <div className="setting-row-left">
        <div className="setting-row-icon">
          <Icon size={15} />
        </div>
        <div className="setting-row-copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      <div className="setting-row-control">
        <Toggle value={value} onChange={onChange} label={title} />
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
  danger = false,
}) {
  return (
    <section
      className={`settings-card ${
        danger ? "settings-card-danger" : ""
      }`}
    >
      <div className="card-heading">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="card-content">{children}</div>
    </section>
  );
}

function InfoBox({
  icon: Icon = Info,
  title,
  children,
  muted = false,
}) {
  return (
    <div
      className={`settings-info-box ${muted ? "muted" : ""}`}
    >
      <div className="settings-info-icon">
        <Icon size={15} />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function BackupCard({
  icon: Icon,
  title,
  description,
  buttonText,
  onClick,
  disabled,
}) {
  return (
    <div className="backup-card">
      <div className="backup-icon">
        <Icon size={18} />
      </div>
      <div className="backup-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className="settings-btn settings-btn-secondary backup-action"
        onClick={onClick}
        disabled={disabled}
      >
        {buttonText}
      </button>
    </div>
  );
}

function Credit({ icon: Icon, label, value }) {
  return (
    <div className="credit-card">
      <div className="credit-icon">
        <Icon size={14} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DangerRow({
  icon: Icon,
  title,
  description,
  onClick,
  last = false,
}) {
  return (
    <div className={`danger-row ${last ? "last" : ""}`}>
      <div className="danger-row-left">
        <div className="danger-icon">
          <Icon size={15} />
        </div>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <button
        type="button"
        className="settings-btn settings-btn-danger"
        onClick={onClick}
      >
        <Trash2 size={14} />
        Clear
      </button>
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeSection, setActiveSection] = useState("company");
  const [search, setSearch] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  /* Search suggestion dropdown */
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] =
    useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState(-1);

  /* Leave modal */
  const [leaveModal, setLeaveModal] = useState(null);

  /* Backup preview modal */
  const [backupPreview, setBackupPreview] = useState(null);

  /* Keyboard shortcuts overlay */
  const [showShortcuts, setShowShortcuts] = useState(false);

  /* Login password */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [logoError, setLogoError] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [dataStats, setDataStats] = useState({});
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);

  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);
  const messageTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  /* =======================================================
     INITIAL LOAD + DATA SYNC
  ======================================================= */

  useEffect(() => {
    loadSettings();
    refreshDataStats();

    const pinValue = localStorage.getItem(STORAGE_KEYS.pin);
    setHasPin(Boolean(pinValue));

    const backup = readObject(STORAGE_KEYS.backupMeta, null);
    setLastBackup(backup);

    estimateStorage();

    const sync = () => {
      loadSettings();
      refreshDataStats();

      const currentPin = localStorage.getItem(STORAGE_KEYS.pin);
      setHasPin(Boolean(currentPin));

      setLastBackup(readObject(STORAGE_KEYS.backupMeta, null));
      estimateStorage();
    };

    window.addEventListener("storage", sync);
    window.addEventListener("saoAutoTractorDataChanged", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        "saoAutoTractorDataChanged",
        sync
      );
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  /* =======================================================
     KEYBOARD SHORTCUTS
  ======================================================= */

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchSuggestionsOpen(true);
        return;
      }

      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s";

      if (isSaveShortcut) {
        event.preventDefault();
        saveSettings();
        return;
      }

      /* ? key shows shortcuts (when not typing in an input) */
      const tag = (event.target?.tagName || "").toLowerCase();
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        event.target?.isContentEditable;

      if (!typing && event.key === "?") {
        event.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, [settings, hasUnsavedChanges]);

  /* =======================================================
     OUTSIDE CLICK — close search suggestions
  ======================================================= */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(event.target)
      ) {
        setSearchSuggestionsOpen(false);
        setHighlightedSuggestionIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  /* =======================================================
     UNSAVED CHANGE PROTECTION
  ======================================================= */

  useEffect(() => {
    const protectUnsavedChanges = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      protectUnsavedChanges
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        protectUnsavedChanges
      );
    };
  }, [hasUnsavedChanges]);

  /* =======================================================
     SETTINGS
  ======================================================= */

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) {
        setSettings(defaultSettings);
        return;
      }
      const saved = JSON.parse(raw);
      setSettings({
        ...defaultSettings,
        ...(saved || {}),
      });
    } catch {
      setSettings(defaultSettings);
    }
  }

  function refreshDataStats() {
    const stats = {
      tractors: readArray(STORAGE_KEYS.tractors).length,
      trips: readArray(STORAGE_KEYS.trips).length,
      parties: readArray(STORAGE_KEYS.parties).length,
      materials: readArray(STORAGE_KEYS.materials).length,
      payments: readArray(STORAGE_KEYS.payments).length,
      expenses: readArray(STORAGE_KEYS.expenses).length,
      staff: readArray(STORAGE_KEYS.staff).length,
      invoices: readArray(STORAGE_KEYS.invoices).length,
      attendance: Object.keys(
        readObject(STORAGE_KEYS.staffAttendance, {})
      ).length,
      salaryPayments: readArray(
        STORAGE_KEYS.staffSalaryPayments
      ).length,
    };
    setDataStats(stats);
  }

  async function estimateStorage() {
    try {
      if (
        navigator.storage &&
        typeof navigator.storage.estimate === "function"
      ) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    } catch {
      setStorageEstimate(null);
    }
  }

  function showMessage(message, type = "success") {
    setSavedMessage(message);
    setMessageType(type);

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = setTimeout(() => {
      setSavedMessage("");
    }, 3500);
  }

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
    setHasUnsavedChanges(true);
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(settings)
      );

      setHasUnsavedChanges(false);

      window.dispatchEvent(
        new Event("saoAutoTractorDataChanged")
      );

      showMessage("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      showMessage(
        "Unable to save settings. Please try again.",
        "error"
      );
    }
  }

  function saveAndReload() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(settings)
      );

      setHasUnsavedChanges(false);

      window.dispatchEvent(
        new Event("saoAutoTractorDataChanged")
      );

      showMessage("Settings saved. Reloading...");

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error(error);
      showMessage("Unable to save settings.", "error");
    }
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all application settings to default values?\n\nYour trips, parties, tractors, payments, expenses and other business data will NOT be deleted."
    );

    if (!confirmed) return;

    setSettings(defaultSettings);
    setHasUnsavedChanges(true);
    showMessage("Settings reset to default. Save to apply.");
  }

  /* =======================================================
     LOGO
  ======================================================= */

  function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoError("");

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      setLogoError(
        "Only PNG, JPG or WEBP images are allowed."
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo size must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateSetting("companyLogo", reader.result);
      showMessage("Logo selected. Save settings to keep it.");
    };

    reader.onerror = () => {
      setLogoError("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
  }

  function removeLogo() {
    updateSetting("companyLogo", "");
    setLogoError("");
  }

  /* =======================================================
     BACKUP
  ======================================================= */

  function createBackupObject() {
    return {
      application: "SAO AUTO TRACTOR",
      version: APP_VERSION,
      backupType: "Full Local Backup",
      createdAt: new Date().toISOString(),

      settings: readObject(
        STORAGE_KEYS.settings,
        defaultSettings
      ),

      data: {
        trips: readArray(STORAGE_KEYS.trips),
        payments: readArray(STORAGE_KEYS.payments),
        parties: readArray(STORAGE_KEYS.parties),
        tractors: readArray(STORAGE_KEYS.tractors),
        materials: readArray(STORAGE_KEYS.materials),
        expenses: readArray(STORAGE_KEYS.expenses),
        staff: readArray(STORAGE_KEYS.staff),
        staffAttendance: readObject(
          STORAGE_KEYS.staffAttendance,
          {}
        ),
        staffSalaryPayments: readArray(
          STORAGE_KEYS.staffSalaryPayments
        ),
        invoices: readArray(STORAGE_KEYS.invoices),
        invoiceNumber: localStorage.getItem(
          STORAGE_KEYS.invoiceNumber
        ),
        businessDetails: readObject(
          STORAGE_KEYS.businessDetails,
          {}
        ),
      },
    };
  }

  function getBackupCounts(backup) {
    const data = backup?.data || {};
    return {
      trips: Array.isArray(data.trips) ? data.trips.length : 0,
      payments: Array.isArray(data.payments)
        ? data.payments.length
        : 0,
      parties: Array.isArray(data.parties)
        ? data.parties.length
        : 0,
      tractors: Array.isArray(data.tractors)
        ? data.tractors.length
        : 0,
      materials: Array.isArray(data.materials)
        ? data.materials.length
        : 0,
      expenses: Array.isArray(data.expenses)
        ? data.expenses.length
        : 0,
      staff: Array.isArray(data.staff)
        ? data.staff.length
        : 0,
      invoices: Array.isArray(data.invoices)
        ? data.invoices.length
        : 0,
      settings: backup?.settings ? "Included" : "Not included",
    };
  }

  function downloadJSON(filename, data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function backupData() {
    try {
      const backup = createBackupObject();
      const counts = getBackupCounts(backup);

      downloadJSON(
        `SAO-AUTO-TRACTOR-Backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
        backup
      );

      const meta = {
        createdAt: backup.createdAt,
        version: APP_VERSION,
        counts,
      };

      localStorage.setItem(
        STORAGE_KEYS.backupMeta,
        JSON.stringify(meta)
      );

      setLastBackup(meta);
      showMessage("Full backup created successfully.");
      refreshDataStats();
    } catch (error) {
      console.error(error);
      showMessage("Backup could not be created.", "error");
    }
  }

  /* =======================================================
     EXPORT / IMPORT SETTINGS ONLY
  ======================================================= */

  function exportSettings() {
    try {
      downloadJSON(
        `SAO-AUTO-TRACTOR-Settings-${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
        {
          application: "SAO AUTO TRACTOR",
          type: "Settings Only",
          version: APP_VERSION,
          createdAt: new Date().toISOString(),
          settings,
        }
      );
      showMessage("Settings exported successfully.");
    } catch (error) {
      console.error(error);
      showMessage("Unable to export settings.", "error");
    }
  }

  function handleSettingsImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (
          !parsed ||
          parsed.application !== "SAO AUTO TRACTOR" ||
          !parsed.settings ||
          typeof parsed.settings !== "object"
        ) {
          throw new Error("Invalid settings file");
        }

        const confirmed = window.confirm(
          "Import settings from this file?\n\nYour business data (trips, payments, parties etc.) will NOT be affected.\n\nCurrent settings will be replaced."
        );

        if (!confirmed) {
          event.target.value = "";
          return;
        }

        setSettings({
          ...defaultSettings,
          ...parsed.settings,
        });

        setHasUnsavedChanges(true);

        showMessage("Settings imported. Save to apply.");
      } catch (error) {
        console.error(error);
        showMessage("Invalid settings file.", "error");
      }

      event.target.value = "";
    };

    reader.onerror = () => {
      showMessage("Unable to read the file.", "error");
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  /* =======================================================
     RESTORE
  ======================================================= */

  function handleRestoreSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);

        if (
          !backup ||
          backup.application !== "SAO AUTO TRACTOR"
        ) {
          throw new Error("Invalid application backup.");
        }

        if (
          !backup.data ||
          typeof backup.data !== "object"
        ) {
          throw new Error("Backup data section is missing.");
        }

        setBackupPreview(backup);
        setRestoreLoading(false);
      } catch (error) {
        console.error(error);
        showMessage(
          "Invalid or corrupted backup file.",
          "error"
        );
        setRestoreLoading(false);
      }

      event.target.value = "";
    };

    reader.onerror = () => {
      showMessage("Unable to read backup file.", "error");
      setRestoreLoading(false);
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function confirmRestore() {
    const backup = backupPreview;
    if (!backup) return;

    try {
      /* ---- Auto-snapshot: current data ko pehle download kar lo ---- */
      try {
        const preRestoreSnapshot = createBackupObject();
        preRestoreSnapshot.backupType =
          "Pre-Restore Safety Snapshot";
        preRestoreSnapshot.restoredFrom = {
          createdAt: backup.createdAt || null,
          version: backup.version || null,
        };

        downloadJSON(
          `SAO-AUTO-TRACTOR-PRE-RESTORE-${new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/[:T]/g, "-")}.json`,
          preRestoreSnapshot
        );
      } catch (snapshotError) {
        console.warn(
          "Pre-restore snapshot failed:",
          snapshotError
        );
        // Snapshot fail ho toh bhi restore rokna nahi
      }

      if (backup.settings) {
        localStorage.setItem(
          STORAGE_KEYS.settings,
          JSON.stringify({
            ...defaultSettings,
            ...backup.settings,
          })
        );
      }

      const data = backup.data;

      const arrayKeys = [
        ["trips", STORAGE_KEYS.trips],
        ["payments", STORAGE_KEYS.payments],
        ["parties", STORAGE_KEYS.parties],
        ["tractors", STORAGE_KEYS.tractors],
        ["materials", STORAGE_KEYS.materials],
        ["expenses", STORAGE_KEYS.expenses],
        ["staff", STORAGE_KEYS.staff],
        [
          "staffSalaryPayments",
          STORAGE_KEYS.staffSalaryPayments,
        ],
        ["invoices", STORAGE_KEYS.invoices],
      ];

      arrayKeys.forEach(([sourceKey, storageKey]) => {
        if (Array.isArray(data[sourceKey])) {
          localStorage.setItem(
            storageKey,
            JSON.stringify(data[sourceKey])
          );
        }
      });

      if (
        data.staffAttendance &&
        typeof data.staffAttendance === "object"
      ) {
        localStorage.setItem(
          STORAGE_KEYS.staffAttendance,
          JSON.stringify(data.staffAttendance)
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          data,
          "invoiceNumber"
        )
      ) {
        if (
          data.invoiceNumber === null ||
          data.invoiceNumber === undefined
        ) {
          localStorage.removeItem(
            STORAGE_KEYS.invoiceNumber
          );
        } else {
          localStorage.setItem(
            STORAGE_KEYS.invoiceNumber,
            String(data.invoiceNumber)
          );
        }
      }

      if (
        data.businessDetails &&
        typeof data.businessDetails === "object"
      ) {
        localStorage.setItem(
          STORAGE_KEYS.businessDetails,
          JSON.stringify(data.businessDetails)
        );
      }

      window.dispatchEvent(
        new Event("saoAutoTractorDataChanged")
      );

      setHasUnsavedChanges(false);
      setBackupPreview(null);

      showMessage(
        "Backup restored. A safety copy of your previous data was also downloaded."
      );

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      console.error(error);
      showMessage("Restore failed.", "error");
    }
  }

  /* =======================================================
     CLEAR DATA
  ======================================================= */

  function clearData(storageKey, label) {
    const count = readArray(storageKey).length;

    if (count === 0) {
      showMessage(`${label} is already empty.`);
      return;
    }

    const confirmed = window.confirm(
      `Delete all ${label.toLowerCase()}?\n\nRecords: ${count}\n\nThis action cannot be undone. Please create a backup first.`
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      `Final confirmation:\n\nDelete ${count} ${label.toLowerCase()} permanently?`
    );

    if (!secondConfirm) return;

    localStorage.removeItem(storageKey);

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    refreshDataStats();
    estimateStorage();

    showMessage(`${label} cleared successfully.`);
  }

  /* =======================================================
     PIN / SECURITY
  ======================================================= */

  function savePin() {
    const value = pin.trim();

    if (!/^\d{4,6}$/.test(value)) {
      showMessage("PIN must contain 4 to 6 digits.", "error");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.pin, value);

    setHasPin(true);
    setPin("");

    updateSetting("appLock", true);

    showMessage("App PIN saved. Save settings to finish.");
  }

  function removePin() {
    const confirmed = window.confirm(
      "Remove the app PIN and disable app lock?"
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEYS.pin);

    setHasPin(false);
    setPin("");

    updateSetting("appLock", false);

    showMessage("App PIN removed. Save settings to apply.");
  }

  /* =======================================================
     LOGIN PASSWORD
  ======================================================= */

  function changeLoginPassword() {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    const savedPassword =
      localStorage.getItem(STORAGE_KEYS.loginPassword) ||
      "1234";

    if (!current || !next || !confirm) {
      showMessage(
        "Please fill in all password fields.",
        "error"
      );
      return;
    }

    if (current !== savedPassword) {
      showMessage(
        "Current password is incorrect.",
        "error"
      );
      return;
    }

    if (next.length < 4) {
      showMessage(
        "New password must contain at least 4 characters.",
        "error"
      );
      return;
    }

    if (next !== confirm) {
      showMessage(
        "New password and confirmation do not match.",
        "error"
      );
      return;
    }

    if (next === current) {
      showMessage(
        "New password must be different from the current password.",
        "error"
      );
      return;
    }

    localStorage.setItem(
      STORAGE_KEYS.loginPassword,
      next
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    showMessage("Login password changed successfully.");
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function requestBrowserNotifications() {
    if (!("Notification" in window)) {
      showMessage(
        "This browser does not support notifications.",
        "error"
      );
      return;
    }

    if (Notification.permission === "granted") {
      updateSetting("browserNotifications", true);
      showMessage("Browser notifications are already allowed.");
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        updateSetting("browserNotifications", true);
        showMessage("Browser notifications enabled.");
      } else {
        showMessage(
          "Browser notification permission was not granted.",
          "error"
        );
      }
    });
  }

  function sendTestNotification() {
    if (!("Notification" in window)) {
      showMessage(
        "This browser does not support notifications.",
        "error"
      );
      return;
    }

    if (Notification.permission !== "granted") {
      showMessage(
        "Enable browser notifications first.",
        "error"
      );
      return;
    }

    try {
      new Notification("SAO AUTO TRACTOR", {
        body: "This is a test notification from your settings.",
      });

      showMessage("Test notification sent.");
    } catch (error) {
      console.error(error);
      showMessage("Unable to send notification.", "error");
    }
  }

  /* =======================================================
     FUTURE FEATURES
  ======================================================= */

  function simulateCloudSync() {
    showMessage(
      "Cloud Sync is ready for future backend integration. No fake online sync was performed."
    );
  }

  function simulateAccountAction() {
    showMessage(
      "Online account system is not connected yet. Local mode remains active."
    );
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function selectSection(id) {
    setActiveSection(id);
    setSearchSuggestionsOpen(false);
    setHighlightedSuggestionIndex(-1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return menuGroups;

    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query) ||
            group.title.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search]);

  const filteredMenu = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups]
  );

  const suggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    return menuItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [search]);

  /* FIX: Auto-navigate after search if current section is hidden */
  useEffect(() => {
    if (!search.trim()) return;

    const isCurrentVisible = filteredMenu.some(
      (item) => item.id === activeSection
    );

    if (!isCurrentVisible && filteredMenu.length > 0) {
      setActiveSection(filteredMenu[0].id);
    }
  }, [search, filteredMenu, activeSection]);

  const current =
    menuItems.find((item) => item.id === activeSection) ||
    menuItems[0];

  const CurrentIcon = current.icon;

  const totalRecords =
    (dataStats.trips || 0) +
    (dataStats.payments || 0) +
    (dataStats.parties || 0) +
    (dataStats.tractors || 0) +
    (dataStats.materials || 0) +
    (dataStats.expenses || 0) +
    (dataStats.staff || 0) +
    (dataStats.invoices || 0);

  const storagePercent =
    storageEstimate?.usage && storageEstimate?.quota
      ? Math.min(
          100,
          Math.round(
            (storageEstimate.usage /
              storageEstimate.quota) *
              100
          )
        )
      : null;

  /* =======================================================
     SEARCH SUGGESTION KEYBOARD NAV
  ======================================================= */

  function handleSearchKeyDown(event) {
    if (!searchSuggestionsOpen) {
      if (
        event.key === "ArrowDown" &&
        suggestions.length > 0
      ) {
        event.preventDefault();
        setSearchSuggestionsOpen(true);
        setHighlightedSuggestionIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (event.key === "Enter") {
      if (
        highlightedSuggestionIndex >= 0 &&
        suggestions[highlightedSuggestionIndex]
      ) {
        event.preventDefault();
        selectSection(
          suggestions[highlightedSuggestionIndex].id
        );
        setSearch("");
      }
    } else if (event.key === "Escape") {
      setSearchSuggestionsOpen(false);
      setHighlightedSuggestionIndex(-1);
    }
  }

  /* =======================================================
     SECTION CONTENT
  ======================================================= */

  function renderSection() {
    switch (activeSection) {
      case "company":
        return (
          <>
            <InfoBox icon={Building2} title="Business identity">
              These details are used across invoices,
              billing and business documents.
            </InfoBox>

            <SettingsCard
              title="Company Logo"
              description="Use a clear square logo for invoices and business identity."
            >
              <div className="logo-editor">
                <div className="logo-preview-large">
                  {settings.companyLogo ? (
                    <img
                      src={settings.companyLogo}
                      alt="Company logo"
                    />
                  ) : (
                    <Building2 size={32} />
                  )}
                </div>

                <div className="logo-editor-info">
                  <strong>Business logo</strong>
                  <p>
                    PNG, JPG or WEBP · Maximum 2 MB
                  </p>

                  <div className="button-row">
                    <button
                      type="button"
                      className="settings-btn settings-btn-secondary"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                    >
                      <Upload size={14} />
                      Upload Logo
                    </button>

                    {settings.companyLogo && (
                      <button
                        type="button"
                        className="settings-btn settings-btn-danger"
                        onClick={removeLogo}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>

                  {logoError && (
                    <div className="field-error">
                      {logoError}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogo}
                    hidden
                  />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Company Details"
              description="Primary business information."
            >
              <div className="settings-grid">
                <Field
                  label="Company Name"
                  value={settings.companyName}
                  onChange={(value) =>
                    updateSetting("companyName", value)
                  }
                  placeholder="SAO AUTO TRACTOR"
                />
                <Field
                  label="Business Name"
                  value={settings.businessName}
                  onChange={(value) =>
                    updateSetting("businessName", value)
                  }
                  placeholder="Optional trade name"
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title="Owner / Contact Person"
              description="Business owner or primary contact."
            >
              <div className="settings-grid">
                <Field
                  label="Owner Name"
                  value={settings.ownerName}
                  onChange={(value) =>
                    updateSetting("ownerName", value)
                  }
                />
                <Field
                  label="Owner Phone"
                  value={settings.ownerPhone}
                  onChange={(value) =>
                    updateSetting("ownerPhone", value)
                  }
                />
                <Field
                  label="Owner Email"
                  value={settings.ownerEmail}
                  onChange={(value) =>
                    updateSetting("ownerEmail", value)
                  }
                  type="email"
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title="Business Address"
              description="Address displayed on business documents."
            >
              <div className="settings-grid">
                <TextAreaField
                  label="Address"
                  value={settings.address}
                  onChange={(value) =>
                    updateSetting("address", value)
                  }
                />

                <div className="settings-grid settings-grid-inner">
                  <Field
                    label="City"
                    value={settings.city}
                    onChange={(value) =>
                      updateSetting("city", value)
                    }
                  />
                  <Field
                    label="State"
                    value={settings.state}
                    onChange={(value) =>
                      updateSetting("state", value)
                    }
                  />
                  <Field
                    label="PIN Code"
                    value={settings.pinCode}
                    onChange={(value) =>
                      updateSetting("pinCode", value)
                    }
                  />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Contact & Tax"
              description="Optional business registration and contact details."
            >
              <div className="settings-grid">
                <Field
                  label="Phone"
                  value={settings.phone}
                  onChange={(value) =>
                    updateSetting("phone", value)
                  }
                />
                <Field
                  label="Email"
                  value={settings.email}
                  onChange={(value) =>
                    updateSetting("email", value)
                  }
                  type="email"
                />
                <Field
                  label="Website"
                  value={settings.website}
                  onChange={(value) =>
                    updateSetting("website", value)
                  }
                />
                <Field
                  label="GST Number"
                  value={settings.gstNumber}
                  onChange={(value) =>
                    updateSetting("gstNumber", value)
                  }
                />
                <Field
                  label="PAN Number"
                  value={settings.panNumber}
                  onChange={(value) =>
                    updateSetting("panNumber", value)
                  }
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title="Document Footer"
              description="Footer text used on business documents."
            >
              <TextAreaField
                label="Footer Text"
                value={settings.footerText}
                onChange={(value) =>
                  updateSetting("footerText", value)
                }
              />
            </SettingsCard>
          </>
        );

      case "transport":
        return (
          <>
            <InfoBox icon={Tractor} title="Transport defaults">
              These settings control the default behavior
              when creating new transport records.
            </InfoBox>

            <SettingsCard
              title="Trip Defaults"
              description="Default values for Add Trip."
            >
              <div className="settings-grid">
                <Field
                  label="Default Trip Type"
                  value={settings.defaultTripType}
                  onChange={(value) =>
                    updateSetting("defaultTripType", value)
                  }
                  options={[
                    "Loading",
                    "Unloading",
                    "Site to Site",
                  ]}
                />
                <Field
                  label="Default Unit"
                  value={settings.defaultUnit}
                  onChange={(value) =>
                    updateSetting("defaultUnit", value)
                  }
                  options={["Ton", "Load", "Trip", "Piece"]}
                />
                <Field
                  label="Rate Type"
                  value={settings.rateType}
                  onChange={(value) =>
                    updateSetting("rateType", value)
                  }
                  options={[
                    "Per Trip",
                    "Per Ton",
                    "Per Load",
                    "Fixed",
                  ]}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title="Trip Workflow"
              description="Control common transport workflow behavior."
            >
              <SettingRow
                icon={Package}
                title="Loading Required"
                description="Treat loading as a normal part of the transport workflow."
                value={settings.loadingRequired}
                onChange={(value) =>
                  updateSetting("loadingRequired", value)
                }
              />
              <SettingRow
                icon={Package}
                title="Unloading Required"
                description="Enable unloading as a required workflow step."
                value={settings.unloadingRequired}
                onChange={(value) =>
                  updateSetting("unloadingRequired", value)
                }
              />
              <SettingRow
                icon={Hash}
                title="Automatic Trip Number"
                description="Automatically generate a trip number for new records."
                value={settings.autoTripNumber}
                onChange={(value) =>
                  updateSetting("autoTripNumber", value)
                }
                last
              />
            </SettingsCard>
          </>
        );

      case "billing":
        return (
          <>
            <InfoBox
              icon={WalletCards}
              title="Billing configuration"
            >
              Keep billing preferences consistent with
              your existing Billing, Payments and Invoice
              modules.
            </InfoBox>

            <SettingsCard
              title="Billing Defaults"
              description="Currency, bill numbering and payment defaults."
            >
              <div className="settings-grid">
                <Field
                  label="Currency"
                  value={settings.currency}
                  onChange={(value) =>
                    updateSetting("currency", value)
                  }
                  options={["₹", "$", "€", "£"]}
                />
                <Field
                  label="Decimal Places"
                  value={settings.decimalPlaces}
                  onChange={(value) =>
                    updateSetting(
                      "decimalPlaces",
                      Number(value)
                    )
                  }
                  options={[
                    { value: 0, label: "0" },
                    { value: 1, label: "1" },
                    { value: 2, label: "2" },
                  ]}
                />
                <Field
                  label="Bill Prefix"
                  value={settings.billPrefix}
                  onChange={(value) =>
                    updateSetting("billPrefix", value)
                  }
                />
                <Field
                  label="Default Payment Mode"
                  value={settings.paymentMode}
                  onChange={(value) =>
                    updateSetting("paymentMode", value)
                  }
                  options={["Cash", "UPI", "Bank", "Other"]}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title="Payment Rules"
              description="Control payment and credit behavior."
            >
              <SettingRow
                icon={WalletCards}
                title="Allow Advance"
                description="Allow advance payments against bills."
                value={settings.allowAdvance}
                onChange={(value) =>
                  updateSetting("allowAdvance", value)
                }
              />
              <SettingRow
                icon={ArrowUp}
                title="Allow Extra Payment"
                description="Allow payment entries greater than current due when needed."
                value={settings.allowExtraPayment}
                onChange={(value) =>
                  updateSetting("allowExtraPayment", value)
                }
                last
              />
            </SettingsCard>
          </>
        );

      case "party":
        return (
          <>
            <SettingsCard
              title="Party Management"
              description="Customer and credit management preferences."
            >
              <SettingRow
                icon={Hash}
                title="Automatic Party Code"
                description="Generate a unique code when creating parties."
                value={settings.autoPartyCode}
                onChange={(value) =>
                  updateSetting("autoPartyCode", value)
                }
              />
              <SettingRow
                icon={WalletCards}
                title="Credit Tracking"
                description="Track billed, received and outstanding amounts."
                value={settings.creditTracking}
                onChange={(value) =>
                  updateSetting("creditTracking", value)
                }
              />
              <SettingRow
                icon={AlertCircle}
                title="Duplicate Warning"
                description="Warn before creating likely duplicate party records."
                value={settings.duplicateWarning}
                onChange={(value) =>
                  updateSetting("duplicateWarning", value)
                }
                last
              />
            </SettingsCard>
          </>
        );

      case "datetime":
        return (
          <>
            <SettingsCard
              title="Date & Time"
              description="Choose how dates and times appear across the application."
            >
              <div className="settings-grid">
                <Field
                  label="Date Format"
                  value={settings.dateFormat}
                  onChange={(value) =>
                    updateSetting("dateFormat", value)
                  }
                  options={[
                    "DD-MM-YYYY",
                    "DD/MM/YYYY",
                    "YYYY-MM-DD",
                    "MM-DD-YYYY",
                  ]}
                />
                <Field
                  label="Time Format"
                  value={settings.timeFormat}
                  onChange={(value) =>
                    updateSetting("timeFormat", value)
                  }
                  options={["12 Hour", "24 Hour"]}
                />
                <Field
                  label="Financial Year"
                  value={settings.financialYear}
                  onChange={(value) =>
                    updateSetting("financialYear", value)
                  }
                  options={[
                    "April - March",
                    "January - December",
                  ]}
                />
              </div>
            </SettingsCard>
          </>
        );

      case "dashboard":
        return (
          <>
            <InfoBox
              icon={FileBarChart}
              title="Dashboard visibility"
            >
              Turn dashboard sections on or off according
              to the information you use most often.
            </InfoBox>

            <SettingsCard
              title="Dashboard Cards"
              description="Control which summary sections are visible."
            >
              <SettingRow
                icon={CalendarDays}
                title="Today's Trips"
                description="Show today's transport activity."
                value={settings.showTodayTrips}
                onChange={(value) =>
                  updateSetting("showTodayTrips", value)
                }
              />
              <SettingRow
                icon={WalletCards}
                title="Billing"
                description="Show billing summary."
                value={settings.showBilling}
                onChange={(value) =>
                  updateSetting("showBilling", value)
                }
              />
              <SettingRow
                icon={ArrowDown}
                title="Received"
                description="Show payment received summary."
                value={settings.showReceived}
                onChange={(value) =>
                  updateSetting("showReceived", value)
                }
              />
              <SettingRow
                icon={AlertCircle}
                title="Due"
                description="Show outstanding due summary."
                value={settings.showDue}
                onChange={(value) =>
                  updateSetting("showDue", value)
                }
              />
              <SettingRow
                icon={Tractor}
                title="Tractors"
                description="Show tractor overview."
                value={settings.showTractors}
                onChange={(value) =>
                  updateSetting("showTractors", value)
                }
              />
              <SettingRow
                icon={ReceiptText}
                title="Recent Records"
                description="Show latest transport records."
                value={settings.showRecentRecords}
                onChange={(value) =>
                  updateSetting("showRecentRecords", value)
                }
                last
              />
            </SettingsCard>
          </>
        );

      case "notifications":
        return (
          <>
            <InfoBox icon={Bell} title="Smart notifications">
              These controls prepare the app for useful
              business reminders. No fake notifications are
              generated.
            </InfoBox>

            <SettingsCard
              title="Business Alerts"
              description="Enable the reminders you actually need."
            >
              <SettingRow
                icon={Bell}
                title="Notifications"
                description="Master switch for application reminders."
                value={settings.notifications}
                onChange={(value) =>
                  updateSetting("notifications", value)
                }
              />
              <SettingRow
                icon={WalletCards}
                title="Due Payment Alerts"
                description="Remind about pending party payments."
                value={settings.dueAlerts}
                onChange={(value) =>
                  updateSetting("dueAlerts", value)
                }
              />
              <SettingRow
                icon={Tractor}
                title="Trip Alerts"
                description="Prepare reminders around transport activity."
                value={settings.tripAlerts}
                onChange={(value) =>
                  updateSetting("tripAlerts", value)
                }
              />
              <SettingRow
                icon={Wrench}
                title="Maintenance Alerts"
                description="Prepare tractor maintenance reminders."
                value={settings.maintenanceAlerts}
                onChange={(value) =>
                  updateSetting("maintenanceAlerts", value)
                }
              />
              <SettingRow
                icon={Users}
                title="Staff Salary Alerts"
                description="Prepare salary and staff payment reminders."
                value={settings.staffSalaryAlerts}
                onChange={(value) =>
                  updateSetting("staffSalaryAlerts", value)
                }
              />
              <SettingRow
                icon={Database}
                title="Backup Reminder"
                description="Remind you to keep regular local backups."
                value={settings.backupReminder}
                onChange={(value) =>
                  updateSetting("backupReminder", value)
                }
                last
              />
            </SettingsCard>

            <SettingsCard
              title="Browser Notifications"
              description="Optional browser permission for future real reminders."
            >
              <SettingRow
                icon={Bell}
                title="Allow Browser Notifications"
                description="Use the browser notification system when supported."
                value={settings.browserNotifications}
                onChange={(value) => {
                  if (value) {
                    requestBrowserNotifications();
                  } else {
                    updateSetting(
                      "browserNotifications",
                      false
                    );
                  }
                }}
                last
              />

              <div className="button-row">
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={sendTestNotification}
                  disabled={!settings.browserNotifications}
                >
                  <Bell size={14} />
                  Send Test Notification
                </button>
              </div>
            </SettingsCard>
          </>
        );

      case "appearance":
        return (
          <>
            <SettingsCard
              title="Appearance"
              description="Keep the professional Dashboard visual language consistent."
            >
              <div className="settings-grid">
                <Field
                  label="Theme"
                  value={settings.theme}
                  onChange={(value) =>
                    updateSetting("theme", value)
                  }
                  options={["Light", "Dark", "System"]}
                  hint="Light remains the current master Dashboard theme."
                />
                <Field
                  label="Layout"
                  value={settings.layout}
                  onChange={(value) =>
                    updateSetting("layout", value)
                  }
                  options={["Comfortable", "Compact"]}
                />
              </div>

              <div className="appearance-preview">
                <div className="appearance-preview-top">
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-line wide" />
                </div>

                <div className="appearance-preview-body">
                  <div className="preview-sidebar">
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>

                  <div className="preview-content">
                    <div className="preview-card">
                      <div className="preview-line medium" />
                      <div className="preview-line short" />
                    </div>
                    <div className="preview-card">
                      <div className="preview-line long" />
                      <div className="preview-line medium" />
                    </div>
                  </div>
                </div>

                <div className="appearance-preview-label">
                  SAO AUTO TRACTOR design preview
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Density"
              description="Optional compact mode for users who manage many records."
            >
              <SettingRow
                icon={Package}
                title="Compact Tables"
                description="Reduce table spacing where supported."
                value={settings.compactTables}
                onChange={(value) =>
                  updateSetting("compactTables", value)
                }
                last
              />
            </SettingsCard>
          </>
        );

      case "backup":
        return (
          <>
            <InfoBox
              icon={ShieldCheck}
              title="Your PIN and Login Password are never included in backups."
            >
              Full backups contain business data and
              settings, but your App PIN and Login Password
              are deliberately excluded for security.
            </InfoBox>

            <div className="backup-grid">
              <BackupCard
                icon={Download}
                title="Create Full Backup"
                description="Export trips, parties, tractors, materials, payments, expenses, staff, attendance, salary payments, invoices and business details."
                buttonText="Create Backup"
                onClick={backupData}
              />
              <BackupCard
                icon={Upload}
                title="Restore Backup"
                description="Import a previously created SAO AUTO TRACTOR JSON backup after reviewing its contents."
                buttonText={
                  restoreLoading
                    ? "Reading..."
                    : "Choose Backup"
                }
                onClick={() =>
                  restoreInputRef.current?.click()
                }
                disabled={restoreLoading}
              />
            </div>

            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleRestoreSelect}
              hidden
            />

            <SettingsCard
              title="Settings Only"
              description="Export or import only your application preferences, separate from business data."
            >
              <div className="button-row">
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={exportSettings}
                >
                  <Download size={14} />
                  Export Settings
                </button>

                <label className="settings-btn settings-btn-secondary settings-import-label">
                  <Upload size={14} />
                  Import Settings
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleSettingsImport}
                    hidden
                  />
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Backup Status"
              description="Local information about your latest backup."
            >
              <div className="backup-status-grid">
                <div className="backup-stat">
                  <span>Last Backup</span>
                  <strong>
                    {formatDateTime(lastBackup?.createdAt)}
                  </strong>
                </div>
                <div className="backup-stat">
                  <span>Backup Version</span>
                  <strong>{lastBackup?.version || "—"}</strong>
                </div>
                <div className="backup-stat">
                  <span>Total Records</span>
                  <strong>{totalRecords}</strong>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Data Health"
              description="Current local record counts across the application."
            >
              <div className="data-health-grid">
                <div className="data-health-item">
                  <Tractor />
                  <span>Tractors</span>
                  <strong>{dataStats.tractors || 0}</strong>
                </div>
                <div className="data-health-item">
                  <ReceiptText />
                  <span>Trips</span>
                  <strong>{dataStats.trips || 0}</strong>
                </div>
                <div className="data-health-item">
                  <Users />
                  <span>Parties</span>
                  <strong>{dataStats.parties || 0}</strong>
                </div>
                <div className="data-health-item">
                  <Package />
                  <span>Materials</span>
                  <strong>{dataStats.materials || 0}</strong>
                </div>
                <div className="data-health-item">
                  <WalletCards />
                  <span>Payments</span>
                  <strong>{dataStats.payments || 0}</strong>
                </div>
                <div className="data-health-item">
                  <ReceiptText />
                  <span>Expenses</span>
                  <strong>{dataStats.expenses || 0}</strong>
                </div>
                <div className="data-health-item">
                  <Users />
                  <span>Staff</span>
                  <strong>{dataStats.staff || 0}</strong>
                </div>
                <div className="data-health-item">
                  <FileBarChart />
                  <span>Invoices</span>
                  <strong>{dataStats.invoices || 0}</strong>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Storage Overview"
              description="Browser storage estimate, when supported. Values are approximate."
            >
              <div className="storage-overview">
                <div className="storage-main">
                  <Database size={18} />
                  <div>
                    <strong>
                      {storageEstimate
                        ? `${formatBytes(
                            storageEstimate.usage
                          )} used`
                        : "Storage estimate unavailable"}
                    </strong>
                    <span>
                      {storageEstimate
                        ? `Approximate browser quota: ${formatBytes(
                            storageEstimate.quota
                          )}`
                        : "Your browser does not provide a storage estimate."}
                    </span>
                  </div>
                </div>

                {storagePercent !== null && (
                  <div className="storage-meter">
                    <div className="storage-meter-track">
                      <div
                        className="storage-meter-fill"
                        style={{
                          width: `${storagePercent}%`,
                        }}
                      />
                    </div>
                    <strong>{storagePercent}%</strong>
                  </div>
                )}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Data Management"
              description="Delete individual data groups only when necessary."
              danger
            >
              <DangerRow
                icon={ReceiptText}
                title="Clear Trips"
                description={`${dataStats.trips || 0} trip records`}
                onClick={() =>
                  clearData(STORAGE_KEYS.trips, "Trips")
                }
              />
              <DangerRow
                icon={WalletCards}
                title="Clear Payments"
                description={`${dataStats.payments || 0} payment records`}
                onClick={() =>
                  clearData(
                    STORAGE_KEYS.payments,
                    "Payments"
                  )
                }
              />
              <DangerRow
                icon={ReceiptText}
                title="Clear Expenses"
                description={`${dataStats.expenses || 0} expense records`}
                onClick={() =>
                  clearData(
                    STORAGE_KEYS.expenses,
                    "Expenses"
                  )
                }
              />
              <DangerRow
                icon={Users}
                title="Clear Staff"
                description={`${dataStats.staff || 0} staff records`}
                onClick={() =>
                  clearData(STORAGE_KEYS.staff, "Staff")
                }
              />
              <DangerRow
                icon={FileBarChart}
                title="Clear Invoices"
                description={`${dataStats.invoices || 0} invoice records`}
                onClick={() =>
                  clearData(
                    STORAGE_KEYS.invoices,
                    "Invoices"
                  )
                }
              />
              <DangerRow
                icon={Users}
                title="Clear Parties"
                description={`${dataStats.parties || 0} party records`}
                onClick={() =>
                  clearData(
                    STORAGE_KEYS.parties,
                    "Parties"
                  )
                }
              />
              <DangerRow
                icon={Tractor}
                title="Clear Tractors"
                description={`${dataStats.tractors || 0} tractor records`}
                onClick={() =>
                  clearData(
                    STORAGE_KEYS.tractors,
                    "Tractors"
                  )
                }
              />
              <DangerRow
                icon={Package}
                title="Clear Materials"
                description={`${dataStats.materials || 0} material records`}
                onClick={() =>
                  clearData(
                    STORAGE_KEYS.materials,
                    "Materials"
                  )
                }
                last
              />
            </SettingsCard>
          </>
        );

      case "cloud":
        return (
          <>
            <InfoBox icon={Cloud} title="Cloud Sync is future-ready">
              The interface is prepared for Firebase,
              Supabase or another backend later. The current
              app does not pretend to sync data online.
            </InfoBox>

            <SettingsCard
              title="Cloud Sync"
              description="Optional cloud configuration for future multi-device support."
            >
              <SettingRow
                icon={Cloud}
                title="Enable Cloud Sync"
                description="Prepare the application for future online synchronization."
                value={settings.cloudSync}
                onChange={(value) =>
                  updateSetting("cloudSync", value)
                }
              />
              <SettingRow
                icon={RefreshCw}
                title="Automatic Sync"
                description="Automatically sync changes when a backend is connected."
                value={settings.autoSync}
                onChange={(value) =>
                  updateSetting("autoSync", value)
                }
              />
              <SettingRow
                icon={Database}
                title="Cloud Backup"
                description="Prepare automatic backup to a connected cloud service."
                value={settings.cloudBackup}
                onChange={(value) =>
                  updateSetting("cloudBackup", value)
                }
                last
              />
            </SettingsCard>

            <SettingsCard
              title="Sync Status"
              description="Current local status."
            >
              <div className="future-feature-panel">
                <div className="future-feature-icon">
                  <Cloud size={20} />
                </div>
                <div className="future-feature-copy">
                  <strong>Local mode active</strong>
                  <span>
                    No cloud account or backend is connected.
                  </span>
                </div>
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={simulateCloudSync}
                >
                  <RefreshCw size={14} />
                  Sync Now
                </button>
              </div>
            </SettingsCard>
          </>
        );

      case "account":
        return (
          <>
            <InfoBox
              icon={Users}
              title="Online account system is optional"
            >
              Your current application works completely in
              local mode. Online sign-in, multi-device access
              and online account management require a real
              backend. Your local app login password is managed
              separately under Security.
            </InfoBox>

            <SettingsCard
              title="Account Mode"
              description="Current application identity."
            >
              <div className="account-mode-card">
                <div className="account-avatar">
                  <Users size={20} />
                </div>
                <div className="account-mode-copy">
                  <span>Current mode</span>
                  <strong>Local Business Account</strong>
                  <small>
                    Data is stored locally in this browser.
                  </small>
                </div>
                <span className="status-badge-local">
                  Local
                </span>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Online Account"
              description="Future-ready controls without fake authentication."
            >
              <div className="future-feature-list">
                <div>
                  <KeyRound size={16} />
                  <span>Sign In / Create Account</span>
                </div>
                <div>
                  <Hash size={16} />
                  <span>Business ID</span>
                </div>
                <div>
                  <Users size={16} />
                  <span>Multi-device Access</span>
                </div>
                <div>
                  <ShieldCheck size={16} />
                  <span>Account Security</span>
                </div>
              </div>

              <button
                type="button"
                className="settings-btn settings-btn-secondary"
                onClick={simulateAccountAction}
              >
                <Sparkles size={14} />
                Configure Later
              </button>
            </SettingsCard>
          </>
        );

      case "security":
        return (
          <>
            <InfoBox icon={ShieldCheck} title="Local app security">
              Your App PIN and Login Password are stored
              locally in this browser and are never included
              in backups.
            </InfoBox>

            <SettingsCard
              title="Login Password"
              description="Change the password used to access SAO AUTO TRACTOR."
            >
              <div className="password-editor">
                <div className="password-editor-header">
                  <div className="password-icon">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <strong>Change Login Password</strong>
                    <p>
                      Use at least 4 characters. Your password
                      is stored locally in this browser.
                    </p>
                  </div>
                </div>

                <div className="settings-grid">
                  <div className="settings-field">
                    <label className="settings-label">
                      Current Password
                    </label>
                    <div className="pin-input-wrap">
                      <input
                        type={
                          showCurrentPassword
                            ? "text"
                            : "password"
                        }
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(
                            event.target.value
                          )
                        }
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />
                      <IconButton
                        title={
                          showCurrentPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        onClick={() =>
                          setShowCurrentPassword(
                            (value) => !value
                          )
                        }
                      >
                        {showCurrentPassword ? (
                          <Unlock size={15} />
                        ) : (
                          <Lock size={15} />
                        )}
                      </IconButton>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">
                      New Password
                    </label>
                    <div className="pin-input-wrap">
                      <input
                        type={
                          showNewPassword
                            ? "text"
                            : "password"
                        }
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="Enter new password"
                        autoComplete="new-password"
                      />
                      <IconButton
                        title={
                          showNewPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        onClick={() =>
                          setShowNewPassword(
                            (value) => !value
                          )
                        }
                      >
                        {showNewPassword ? (
                          <Unlock size={15} />
                        ) : (
                          <Lock size={15} />
                        )}
                      </IconButton>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">
                      Confirm New Password
                    </label>
                    <div className="pin-input-wrap">
                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(
                            event.target.value
                          )
                        }
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                      />
                      <IconButton
                        title={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        onClick={() =>
                          setShowConfirmPassword(
                            (value) => !value
                          )
                        }
                      >
                        {showConfirmPassword ? (
                          <Unlock size={15} />
                        ) : (
                          <Lock size={15} />
                        )}
                      </IconButton>
                    </div>
                  </div>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="settings-btn settings-btn-primary"
                    onClick={changeLoginPassword}
                  >
                    <KeyRound size={14} />
                    Change Password
                  </button>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="App Lock"
              description="Protect the application with a 4–6 digit PIN."
            >
              <SettingRow
                icon={Lock}
                title="Enable App Lock"
                description="Require the app PIN when the application is locked."
                value={settings.appLock}
                onChange={(value) => {
                  if (!value) {
                    removePin();
                  } else if (hasPin) {
                    updateSetting("appLock", true);
                  } else {
                    showMessage(
                      "Create a PIN below first.",
                      "error"
                    );
                  }
                }}
              />

              <div className="pin-editor">
                <div className="pin-editor-header">
                  <div className="pin-icon">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <strong>
                      {hasPin
                        ? "PIN is configured"
                        : "Create App PIN"}
                    </strong>
                    <p>Use 4 to 6 digits.</p>
                  </div>
                </div>

                {!hasPin && (
                  <div className="pin-input-row">
                    <div className="pin-input-wrap">
                      <input
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(event) =>
                          setPin(
                            event.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                        placeholder="Enter PIN"
                      />
                      <IconButton
                        title={
                          showPin ? "Hide PIN" : "Show PIN"
                        }
                        onClick={() =>
                          setShowPin((value) => !value)
                        }
                      >
                        {showPin ? (
                          <Unlock size={15} />
                        ) : (
                          <Lock size={15} />
                        )}
                      </IconButton>
                    </div>

                    <button
                      type="button"
                      className="settings-btn settings-btn-primary"
                      onClick={savePin}
                    >
                      <KeyRound size={14} />
                      Save PIN
                    </button>
                  </div>
                )}

                {hasPin && (
                  <button
                    type="button"
                    className="settings-btn settings-btn-danger"
                    onClick={removePin}
                  >
                    <Trash2 size={14} />
                    Remove PIN
                  </button>
                )}
              </div>

              <div className="security-enabled">
                <div>
                  <div className="security-check">
                    <ShieldCheck size={15} />
                  </div>
                  <div>
                    <strong>Security status</strong>
                    <p>
                      {hasPin
                        ? "App PIN is configured."
                        : "No app PIN is configured."}
                    </p>
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Automatic Lock"
              description="Choose when the app should automatically lock."
            >
              <Field
                label="Auto Lock"
                value={settings.autoLock}
                onChange={(value) =>
                  updateSetting("autoLock", value)
                }
                options={[
                  "Never",
                  "5",
                  "15",
                  "30",
                ].map((value) => ({
                  value,
                  label:
                    value === "Never"
                      ? "Never"
                      : `${value} minutes`,
                }))}
                hint="Automatic locking requires an enabled app PIN."
              />
            </SettingsCard>
          </>
        );

      case "about":
        return (
          <>
            <div className="about-hero">
              <div className="about-logo">
                {settings.companyLogo ? (
                  <img
                    src={settings.companyLogo}
                    alt={settings.companyName}
                  />
                ) : (
                  <Tractor size={33} />
                )}
              </div>

              <span className="about-version">
                VERSION {APP_VERSION}
              </span>

              <h2>
                {settings.companyName || "SAO AUTO TRACTOR"}
              </h2>

              <p>
                Professional Transportation Management
                System
              </p>
            </div>

            <div className="about-grid">
              <Credit
                icon={Code2}
                label="Application"
                value="SAO AUTO TRACTOR"
              />
              <Credit
                icon={Sparkles}
                label="Development"
                value="Prabin"
              />
              <Credit
                icon={Code2}
                label="Technology"
                value="React + Vite"
              />
              <Credit
                icon={ShieldCheck}
                label="Data Mode"
                value="Local Storage"
              />
            </div>

            <SettingsCard
              title="Application Information"
              description="About this version of the system."
            >
              <p className="about-description">
                SAO AUTO TRACTOR is designed to manage
                tractor transportation, trips, parties,
                billing, payments, expenses, staff,
                invoices and business records from one
                professional application.
              </p>

              <div className="about-tech-grid">
                <div>
                  <span>Version</span>
                  <strong>{APP_VERSION}</strong>
                </div>
                <div>
                  <span>Storage</span>
                  <strong>Browser Local Storage</strong>
                </div>
                <div>
                  <span>UI System</span>
                  <strong>Responsive Business UI</strong>
                </div>
                <div>
                  <span>Development Assistance</span>
                  <strong>ChatGPT by OpenAI</strong>
                </div>
              </div>
            </SettingsCard>

            <div className="about-footer">
              {settings.footerText}
            </div>
          </>
        );

      default:
        return null;
    }
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <div className="settings-page">
      {/* HEADER */}
      <header className="settings-header">
        <div className="settings-header-left">
          <div className="settings-header-icon">
            <Wrench size={22} />
          </div>

          <div className="settings-header-copy">
            <div className="settings-breadcrumb">
              <span>Settings</span>
              <span>/</span>
              <strong>{current.title}</strong>
            </div>

            <h1>Settings</h1>

            <p>
              Configure your SAO AUTO TRACTOR business
              system.
            </p>
          </div>
        </div>

        <div className="settings-header-actions">
          {hasUnsavedChanges && (
            <div className="unsaved-indicator">
              <span />
              Unsaved changes
            </div>
          )}

          <button
            type="button"
            className="settings-icon-btn"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>

          <button
            type="button"
            className="settings-btn settings-btn-secondary"
            onClick={resetSettings}
          >
            <RefreshCw size={14} />
            Reset
          </button>

          <button
            type="button"
            className="settings-btn settings-btn-secondary"
            onClick={saveAndReload}
            disabled={!hasUnsavedChanges}
          >
            <RefreshCw size={14} />
            Save & Reload
          </button>

          <button
            type="button"
            className="settings-btn settings-btn-primary"
            onClick={saveSettings}
          >
            <Save size={14} />
            Save Settings
          </button>
        </div>
      </header>

      {/* TOAST */}
      {savedMessage && (
        <div
          className={`settings-toast ${
            messageType === "error"
              ? "settings-toast-error"
              : ""
          }`}
        >
          <div className="settings-toast-icon">
            {messageType === "error" ? (
              <AlertCircle size={15} />
            ) : (
              <Check size={15} />
            )}
          </div>
          <span>{savedMessage}</span>
          <button
            type="button"
            onClick={() => setSavedMessage("")}
            aria-label="Close message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* SEARCH */}
      <div
        className="settings-searchbar"
        ref={searchWrapRef}
      >
        <div className="settings-search-icon">
          <Search size={17} />
        </div>

        <input
          ref={searchInputRef}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSearchSuggestionsOpen(true);
            setHighlightedSuggestionIndex(-1);
          }}
          onFocus={() => setSearchSuggestionsOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search settings... (Ctrl+K)"
          aria-label="Search settings"
        />

        {search && (
          <button
            type="button"
            className="settings-search-clear"
            onClick={() => {
              setSearch("");
              setSearchSuggestionsOpen(false);
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}

        <kbd>Ctrl K</kbd>

        {searchSuggestionsOpen && suggestions.length > 0 && (
          <div className="settings-search-suggestions">
            {suggestions.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-search-suggestion ${
                    index === highlightedSuggestionIndex
                      ? "highlighted"
                      : ""
                  }`}
                  onMouseEnter={() =>
                    setHighlightedSuggestionIndex(index)
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    selectSection(item.id);
                    setSearch("");
                  }}
                >
                  <span className="settings-search-suggestion-icon">
                    <ItemIcon size={15} />
                  </span>
                  <span className="settings-search-suggestion-copy">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <ChevronRight size={13} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* WORKSPACE */}
      <div className="settings-shell">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">
            <div>
              <span>Settings</span>
              <small>Manage your application</small>
            </div>
            <span className="settings-sidebar-count">
              {menuItems.length}
            </span>
          </div>

          <nav className="settings-nav">
            {filteredGroups.length ? (
              filteredGroups.map((group) => (
                <div
                  className="settings-nav-group"
                  key={group.id}
                >
                  <div className="settings-nav-group-title">
                    <span>{group.title}</span>
                    <span>{group.items.length}</span>
                  </div>

                  <div className="settings-nav-group-items">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`settings-nav-item ${
                            activeSection === item.id
                              ? "active"
                              : ""
                          }`}
                          onClick={() => selectSection(item.id)}
                          title={item.subtitle}
                        >
                          <div className="settings-nav-icon">
                            <ItemIcon size={16} />
                          </div>
                          <div className="settings-nav-copy">
                            <strong>{item.title}</strong>
                            <small>{item.subtitle}</small>
                          </div>
                          <div className="settings-nav-arrow">
                            <ChevronRight size={13} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="settings-no-results">
                <div>
                  <Search size={17} />
                </div>
                <strong>No settings found</strong>
                <span>Try another search.</span>
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={() => setSearch("")}
                >
                  Clear Search
                </button>
              </div>
            )}
          </nav>

          <div className="settings-sidebar-footer">
            <div className="settings-sidebar-status">
              <span className="status-dot" />
              <span>Local system active</span>
            </div>
            <small>v{APP_VERSION}</small>
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-content-header">
            <div className="settings-content-heading">
              <div className="settings-section-icon">
                <CurrentIcon size={20} />
              </div>
              <div>
                <span className="settings-content-eyebrow">
                  Configuration
                </span>
                <h2>{current.title}</h2>
                <p>{current.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="settings-content-body">
            {renderSection()}
          </div>
        </main>
      </div>

      {/* BOTTOM BAR */}
      <div className="settings-bottom-bar">
        <div className="bottom-status">
          <div
            className={`bottom-status-icon ${
              hasUnsavedChanges ? "pending" : "saved"
            }`}
          >
            {hasUnsavedChanges ? (
              <AlertCircle size={15} />
            ) : (
              <Check size={15} />
            )}
          </div>
          <div>
            <strong>
              {hasUnsavedChanges
                ? "Changes not saved"
                : "All settings saved"}
            </strong>
            <small>
              {hasUnsavedChanges
                ? "Save before leaving this page."
                : "Your current preferences are stored locally."}
            </small>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="settings-btn settings-btn-secondary"
            onClick={resetSettings}
          >
            <RefreshCw size={14} />
            Reset
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-primary"
            onClick={saveSettings}
          >
            <Save size={14} />
            Save Settings
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="settings-footer">
        <span>
          {settings.companyName || "SAO AUTO TRACTOR"}
        </span>
        <span>•</span>
        <strong>Transportation Management System</strong>
        <span>•</span>
        <span>v{APP_VERSION}</span>
      </footer>

      {/* BACKUP PREVIEW MODAL */}
      {backupPreview && (
        <div
          className="settings-modal-backdrop"
          onMouseDown={() => setBackupPreview(null)}
        >
          <div
            className="settings-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-header">
              <div>
                <span className="section-kicker">
                  BACKUP PREVIEW
                </span>
                <h2>Restore this backup?</h2>
                <p>
                  Review the contents before restoring.
                </p>
              </div>
              <button
                type="button"
                className="settings-icon-btn"
                onClick={() => setBackupPreview(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="settings-modal-body">
              <div className="backup-preview-info">
                <div className="backup-preview-row">
                  <span>Application</span>
                  <strong>
                    {backupPreview.application || "—"}
                  </strong>
                </div>
                <div className="backup-preview-row">
                  <span>Version</span>
                  <strong>
                    {backupPreview.version || "—"}
                  </strong>
                </div>
                <div className="backup-preview-row">
                  <span>Created</span>
                  <strong>
                    {formatDateTime(
                      backupPreview.createdAt
                    )}
                  </strong>
                </div>
              </div>

              <div className="backup-preview-counts">
                <h4>Data included</h4>
                <div className="backup-preview-grid">
                  {Object.entries(
                    getBackupCounts(backupPreview)
                  ).map(([key, value]) => (
                    <div key={key}>
                      <span>
                        {key.charAt(0).toUpperCase() +
                          key.slice(1)}
                      </span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="backup-preview-warning">
                <AlertCircle size={16} />
                <span>
                  Restore will replace the current saved
                  data for these modules. Your App PIN and
                  Login Password will NOT be restored.
                  A safety copy of your previous data will
                  be downloaded automatically.
                </span>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                type="button"
                className="settings-btn settings-btn-secondary"
                onClick={() => setBackupPreview(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={confirmRestore}
              >
                <Upload size={14} />
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHORTCUTS MODAL */}
      {showShortcuts && (
        <div
          className="settings-modal-backdrop"
          onMouseDown={() => setShowShortcuts(false)}
        >
          <div
            className="settings-modal settings-shortcuts-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-header">
              <div>
                <span className="section-kicker">
                  KEYBOARD SHORTCUTS
                </span>
                <h2>Quick Actions</h2>
                <p>Use these shortcuts anywhere in Settings.</p>
              </div>
              <button
                type="button"
                className="settings-icon-btn"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="settings-modal-body">
              <div className="shortcuts-list">
                <div className="shortcut-row">
                  <span>Search settings</span>
                  <kbd>Ctrl</kbd>
                  <kbd>K</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Save settings</span>
                  <kbd>Ctrl</kbd>
                  <kbd>S</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Show shortcuts</span>
                  <kbd>?</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Close modal</span>
                  <kbd>Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}