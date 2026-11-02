import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Copy,
  Edit3,
  Eye,
  FileBarChart,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";

import { useAppData } from "../../context/AppDataContext";
import { STORAGE_KEYS } from "../../data/storageKeys";
import { readStorage, writeStorage } from "../../data/storage";
import {
  calculateTotalBilling,
  calculateTotalReceived,
  calculateOutstanding,
  calculateTripAmount,
} from "../../utils/calculations";
import { getActivePaymentAmount, isPaymentReversed } from "../../utils/paymentRecords";
import { getInvoiceFinance } from "../../utils/financeReconciliation";
import { formatCurrency } from "../../utils/currency";
import { formatDate, getTodayISO } from "../../utils/date";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import "./PartyManagement.css";

/* =========================================================
   CONSTANTS
   ========================================================= */

const EMPTY_FORM = {
  partyName: "",
  partyCode: "",
  contact: "",
  email: "",
  address: "",
  siteInfo: "",
  paymentQr: "",
  status: "active",
};

const EMPTY_ARRAY = [];

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const SEARCH_DEBOUNCE_MS = 200;
const REMINDER_DAYS = 30;

/* =========================================================
   UTILITIES
   ========================================================= */

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createId() {
  return `PTY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPartyName(trip) {
  return String(
    trip?.partyName ?? trip?.party ?? trip?.party_name ?? "",
  ).trim();
}

function getTripAmount(trip) {
  const directAmount = Number(
    trip?.amount ??
      trip?.totalAmount ??
      trip?.billingAmount ??
      trip?.total ??
      0,
  );

  if (Number.isFinite(directAmount) && directAmount > 0) {
    return directAmount;
  }

  const quantity = Number(trip?.quantity ?? trip?.qty ?? 0);
  const rate = Number(trip?.rate ?? trip?.price ?? 0);

  return calculateTripAmount(quantity, rate);
}

function getTripQuantity(trip) {
  const quantity = Number(trip?.quantity ?? trip?.qty ?? 0);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function getTripMaterial(trip) {
  return (
    trip?.materialName ||
    trip?.material ||
    trip?.product ||
    "Unknown"
  );
}

function getTripType(trip) {
  const raw = normalize(
    trip?.tripType ??
      trip?.type ??
      trip?.workType ??
      trip?.trip_type ??
      "",
  );

  if (
    raw === "loading + unloading" ||
    raw === "loading and unloading" ||
    raw === "loading/unloading"
  ) {
    return "Loading + Unloading";
  }

  if (raw === "loading" || raw === "loading only") {
    return "Loading";
  }

  if (raw === "unloading" || raw === "unloading only") {
    return "Unloading";
  }

  if (
    raw === "site to site" ||
    raw === "site-to-site" ||
    raw === "site_to_site" ||
    raw === "sitetosite"
  ) {
    return "Site to Site";
  }

  return "";
}

function getPaymentPartyName(payment) {
  return String(
    payment?.partyName ??
      payment?.party ??
      payment?.party_name ??
      "",
  ).trim();
}

function getPaymentAmount(payment) {
  return getActivePaymentAmount(payment);
}

function getInitials(name, fallback = "PT") {
  const value = String(name || "").trim();

  if (!value) return fallback;

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function createPartyCode(parties = []) {
  const used = new Set(
    parties.map((party) => normalize(party?.partyCode)).filter(Boolean),
  );
  let sequence = 1;
  let candidate = "";
  do {
    candidate = `PTY-${String(sequence).padStart(4, "0")}`;
    sequence += 1;
  } while (used.has(normalize(candidate)));
  return candidate;
}

function getRecordDate(record) {
  return record?.date || record?.createdAt?.split("T")[0] || "";
}

function getLocalDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeOnly(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function buildPartyStatsMap(parties, trips, payments) {
  const map = new Map();

  const tripsByParty = new Map();

  for (const trip of trips) {
    const key = normalize(getPartyName(trip));
    if (!key) continue;

    if (!tripsByParty.has(key)) tripsByParty.set(key, []);
    tripsByParty.get(key).push(trip);
  }

  const paymentsByParty = new Map();

  for (const payment of payments) {
    const key = normalize(getPaymentPartyName(payment));
    if (!key) continue;

    if (!paymentsByParty.has(key)) paymentsByParty.set(key, []);
    paymentsByParty.get(key).push(payment);
  }

  for (const party of parties) {
    const key = normalize(party?.partyName);
    const partyTrips = key ? tripsByParty.get(key) || [] : [];
    const partyPayments = key
      ? paymentsByParty.get(key) || []
      : [];

    let billing = 0;
    for (const trip of partyTrips) billing += getTripAmount(trip);

    let received = 0;
    for (const payment of partyPayments) {
      received += getPaymentAmount(payment);
    }

    map.set(party?.id, {
      trips: partyTrips.length,
      billing,
      received,
      outstanding: Math.max(0, billing - received),
    });
  }

  return map;
}

/* =========================================================
   HOOKS
   ========================================================= */

function useDebouncedValue(value, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

function useFocusTrap(containerRef, isActive) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const node = containerRef.current;
    const previouslyFocused = document.activeElement;

    const focusables = node.querySelectorAll(FOCUSABLE_SELECTOR);

    if (focusables.length) {
      window.setTimeout(() => focusables[0]?.focus?.(), 0);
    }

    const handleKey = (e) => {
      if (e.key !== "Tab") return;

      const list = node.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!list.length) return;

      const first = list[0];
      const last = list[list.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleKey);

    return () => {
      node.removeEventListener("keydown", handleKey);

      if (
        previouslyFocused &&
        document.contains(previouslyFocused)
      ) {
        window.setTimeout(() => previouslyFocused.focus?.(), 0);
      }
    };
  }, [containerRef, isActive]);
}

/* =========================================================
   DETAIL METRIC (small reusable card)
   ========================================================= */

function DetailMetric({ icon, label, value, className = "" }) {
  return (
    <div className={`party-metric ${className}`}>
      <div className="party-metric-icon">{icon}</div>

      <div className="party-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================================================
   ROW ACTIONS MENU
   ========================================================= */

function PartyRowActions({
  party,
  onView,
  onEdit,
  onDelete,
  onPrint,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handle = (fn) => (e) => {
    e.stopPropagation();
    setOpen(false);
    fn?.(party);
  };

  const label = party?.partyName || "party";

  return (
    <div className="party-row-actions" ref={wrapperRef}>
      <button
        type="button"
        className="party-row-primary-action"
        onClick={handle(onView)}
        title="View details"
        aria-label={`View ${label} details`}
      >
        <Eye size={17} strokeWidth={1.8} />
      </button>

      <button
        type="button"
        className="party-row-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`More actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
      >
        <Settings2 size={15} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="party-row-menu"
          role="menu"
          aria-label={`Actions for ${label}`}
        >
          <button
            type="button"
            role="menuitem"
            className="party-row-menu-item"
            onClick={handle(onView)}
          >
            <Eye size={14} strokeWidth={1.8} />
            <span>View Details</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="party-row-menu-item"
            onClick={handle(onEdit)}
          >
            <Edit3 size={14} strokeWidth={1.8} />
            <span>Edit Party</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="party-row-menu-item"
            onClick={handle(onPrint)}
          >
            <Printer size={14} strokeWidth={1.8} />
            <span>Print / PDF</span>
          </button>

          <div className="party-row-menu-divider" />

          {normalize(party?.status) !== "inactive" && <button
            type="button"
            role="menuitem"
            className="party-row-menu-item"
            onClick={handle(onDelete)}
          >
            <Archive size={14} strokeWidth={1.8} />
            <span>Archive Party</span>
          </button>}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PARTY FORM
   ========================================================= */

function PartyForm({
  initialValue,
  onCancel,
  onSave,
  externalError,
  saving,
}) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initialValue || {}),
  }));

  const [error, setError] = useState("");

  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape" && !saving) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onCancel, saving]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (saving) return;

    const partyName = form.partyName.trim();
    const contact = form.contact.trim();

    if (!partyName) {
      setError("Party name is required.");
      return;
    }

    if (contact && !/^[0-9]{10}$/.test(contact)) {
      setError("Enter a valid 10-digit contact number.");
      return;
    }

    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    onSave({
      ...form,
      partyName,
      partyCode: form.partyCode.trim(),
      contact,
      email: email.toLowerCase(),
      address: form.address.trim(),
      siteInfo: form.siteInfo.trim(),
      paymentQr: form.paymentQr.trim(),
      status: form.status || "active",
    });
  };

  const displayError = error || externalError || "";

  return (
    <div className="party-form-wrap">
      <div className="party-form-header">
        <div>
          <span className="party-form-eyebrow">
            {initialValue ? "EDIT PARTY" : "NEW PARTY"}
          </span>

          <h3>{initialValue ? "Update Party" : "Add Party"}</h3>

          <p>
            Keep customer, site and payment information
            organized.
          </p>
        </div>

        <button
          type="button"
          className="party-form-close"
          onClick={onCancel}
          aria-label="Close form"
          title="Close"
          disabled={saving}
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="party-form"
        noValidate
      >
        {displayError && (
          <div
            className="party-form-error"
            role="alert"
            aria-live="polite"
          >
            {displayError}
          </div>
        )}

        <div className="party-form-grid">
          <label className="party-field">
            <span>Party Name *</span>

            <input
              name="partyName"
              value={form.partyName}
              onChange={handleChange}
              placeholder="Enter party name"
              autoComplete="organization"
              autoFocus={!initialValue}
              required
              aria-required="true"
              aria-invalid={Boolean(
                error && !form.partyName.trim(),
              )}
              disabled={saving}
            />
          </label>

          <label className="party-field">
            <span>Party Code</span>

            <input
              name="partyCode"
              value={form.partyCode}
              onChange={handleChange}
              placeholder="e.g. PT-001"
              autoComplete="off"
              disabled={saving}
            />
          </label>

          <label className="party-field">
            <span>Contact</span>

            <input
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              type="tel"
              maxLength={10}
              pattern="[0-9]{10}"
              autoComplete="tel"
              aria-describedby="party-contact-hint"
              disabled={saving}
            />

            <small
              id="party-contact-hint"
              className="party-field-hint"
            >
              Optional • 10 digits
            </small>
          </label>

          <label className="party-field">
            <span>Email (optional)</span>
            <input
              name="email"
              type="email"
              value={form.email || ""}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="email"
              disabled={saving}
            />
          </label>

          <label className="party-field">
            <span>Site Information</span>

            <input
              name="siteInfo"
              value={form.siteInfo}
              onChange={handleChange}
              placeholder="Main site / work location"
              disabled={saving}
            />
          </label>

          <label className="party-field party-field-full">
            <span>Address</span>

            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Party address"
              rows={3}
              disabled={saving}
            />
          </label>

          <label className="party-field party-field-full">
            <span>Payment / QR Information</span>

            <input
              name="paymentQr"
              value={form.paymentQr}
              onChange={handleChange}
              placeholder="UPI ID or payment information"
              disabled={saving}
            />
          </label>

          <label className="party-field">
            <span>Status</span>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        <div className="party-form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : initialValue
              ? "Update Party"
              : "Save Party"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   PARTY DETAILS DRAWER (rich)
   ========================================================= */

function PartyDetails({
  party,
  trips,
  payments,
  invoices,
  onClose,
  onEdit,
  autoOpenPrint = false,
}) {
  const today = getTodayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [showPrintPreview, setShowPrintPreview] = useState(
    Boolean(autoOpenPrint),
  );
  const [copied, setCopied] = useState(false);

  const drawerRef = useRef(null);

  useFocusTrap(drawerRef, true);

  /* ---- Escape key: preview > drawer ---- */
  useEffect(() => {
    const handle = (e) => {
      if (e.key !== "Escape") return;

      if (showPrintPreview) {
        setShowPrintPreview(false);
        return;
      }

      onClose?.();
    };

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose, showPrintPreview]);

  /* ---- Ctrl/Cmd + P shortcut ---- */
  useEffect(() => {
    const handle = (e) => {
      const isPrintShortcut =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p";

      if (!isPrintShortcut) return;

      e.preventDefault();
      setShowPrintPreview(true);
    };

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  /* =========================================================
     ACCOUNT CALCULATIONS
     ========================================================= */

  const account = useMemo(() => {
    const partyNameKey = normalize(party?.partyName);

    const partyTrips = trips.filter(
      (trip) => normalize(getPartyName(trip)) === partyNameKey,
    );

    const partyPayments = payments.filter(
      (payment) =>
        normalize(getPaymentPartyName(payment)) === partyNameKey,
    );

    const partyInvoices = invoices.filter(
      (invoice) => normalize(invoice?.partyName) === partyNameKey,
    );

    let billing = 0;
    let loading = 0;
    let unloading = 0;
    let combined = 0;
    let siteToSite = 0;

    const reminderCutoff = new Date();
    reminderCutoff.setDate(
      reminderCutoff.getDate() - REMINDER_DAYS,
    );

    const oldDueTrips = [];

    for (const trip of partyTrips) {
      const amount = getTripAmount(trip);
      billing += amount;

      const type = getTripType(trip);
      if (type === "Loading") loading += 1;
      else if (type === "Unloading") unloading += 1;
      else if (type === "Loading + Unloading") combined += 1;
      else if (type === "Site to Site") siteToSite += 1;

      if (amount > 0) {
        const tripDate = new Date(getRecordDate(trip) || 0);

        if (
          Number.isFinite(tripDate.getTime()) &&
          tripDate < reminderCutoff
        ) {
          oldDueTrips.push(trip);
        }
      }
    }

    let received = 0;
    for (const payment of partyPayments) {
      received += getPaymentAmount(payment);
    }

    const due = Math.max(0, billing - received);
    const advance = Math.max(0, received - billing);
    const hasOldDue = oldDueTrips.length > 0 && due > 0;

    const activity = [
      ...partyTrips.map((trip, index) => ({
        id: `trip-${trip?.id || index}`,
        date: getRecordDate(trip),
        kind: "trip",
        title: getTripType(trip) || "Trip",
        description: getTripMaterial(trip),
        amount: getTripAmount(trip),
        quantity: getTripQuantity(trip),
        tripData: trip,
      })),

      ...partyPayments.map((payment, index) => ({
        id: `payment-${payment?.id || payment?._id || index}`,
        date: getRecordDate(payment),
        kind: isPaymentReversed(payment) ? "reversal" : "payment",
        title: isPaymentReversed(payment) ? "Receipt Reversed" : "Payment Received",
        description: isPaymentReversed(payment)
          ? payment?.reversalReason || "Reason not recorded"
          : payment?.paymentMode || payment?.mode || payment?.reference || "Payment received",
        amount: isPaymentReversed(payment)
          ? Number(payment?.amount ?? payment?.paymentAmount ?? payment?.receivedAmount ?? payment?.paidAmount) || 0
          : getPaymentAmount(payment),
      })),

      ...partyInvoices.map((invoice, index) => ({
        id: `invoice-${invoice?.id || index}`,
        date: invoice?.invoiceDate || getRecordDate(invoice),
        kind: "invoice",
        title: invoice?.invoiceNumber || "Invoice",
        description: `Invoice · ${getInvoiceFinance(invoice, payments).status}`,
        amount: Number(invoice?.grandTotal) || 0,
      })),
    ].sort((a, b) => {
      const dateA = new Date(a?.date || 0).getTime();
      const dateB = new Date(b?.date || 0).getTime();

      return dateB - dateA;
    });

    return {
      partyTrips,
      partyPayments,
      partyInvoices,
      billing,
      received,
      due,
      advance,
      loading,
      unloading,
      combined,
      siteToSite,
      activity,
      hasOldDue,
      oldDueTrips,
    };
  }, [party, trips, payments, invoices]);

  /* =========================================================
     DAILY ACTIVITY
     ========================================================= */

  const dailyActivity = useMemo(() => {
    const partyNameKey = normalize(party?.partyName);

    const dayTrips = trips.filter((trip) => {
      const tripDate = getRecordDate(trip);

      return (
        normalize(getPartyName(trip)) === partyNameKey &&
        tripDate === selectedDate
      );
    });

    const dayPayments = payments.filter((payment) => {
      const paymentDate = getRecordDate(payment);

      return (
        normalize(getPaymentPartyName(payment)) === partyNameKey &&
        paymentDate === selectedDate
      );
    });

    const combined = [
      ...dayTrips.map((trip, index) => ({
        id: `day-trip-${trip?.id || index}`,
        kind: "trip",
        date: getRecordDate(trip),
        title: getTripType(trip) || "Trip",
        description: getTripMaterial(trip),
        amount: getTripAmount(trip),
        quantity: getTripQuantity(trip),
        time: trip?.time || trip?.createdAt || "",
        tripData: trip,
      })),

      ...dayPayments.map((payment, index) => ({
        id: `day-payment-${payment?.id || payment?._id || index}`,
        kind: isPaymentReversed(payment) ? "reversal" : "payment",
        date: getRecordDate(payment),
        title: isPaymentReversed(payment) ? "Receipt Reversed" : "Payment",
        description: isPaymentReversed(payment)
          ? payment?.reversalReason || "Reason not recorded"
          : payment?.paymentMode || payment?.mode || "Payment received",
        amount: isPaymentReversed(payment)
          ? Number(payment?.amount ?? payment?.paymentAmount ?? payment?.receivedAmount ?? payment?.paidAmount) || 0
          : getPaymentAmount(payment),
        quantity: 0,
        time: payment?.time || payment?.createdAt || "",
      })),
    ].sort((a, b) => {
      const dateA = new Date(a?.date || 0).getTime();
      const dateB = new Date(b?.date || 0).getTime();

      return dateB - dateA;
    });

    let totalBilling = 0;
    for (const trip of dayTrips) totalBilling += getTripAmount(trip);

    let totalReceived = 0;
    for (const payment of dayPayments) {
      totalReceived += getPaymentAmount(payment);
    }

    let totalQuantity = 0;
    for (const trip of dayTrips) {
      totalQuantity += getTripQuantity(trip);
    }

    return {
      dayTrips,
      dayPayments,
      combined,
      totalTrips: dayTrips.length,
      totalPayments: dayPayments.length,
      totalQuantity,
      totalBilling,
      totalReceived,
    };
  }, [party, trips, payments, selectedDate]);

  /* =========================================================
     HANDLERS
     ========================================================= */

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const setToday = () => {
    setSelectedDate(today);
  };

  const yesterdayISO = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateISO(y);
  }, []);

  const setYesterday = () => {
    setSelectedDate(yesterdayISO);
  };

  const isYesterday = selectedDate === yesterdayISO;

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
  };

  const handleConfirmPrint = () => {
    window.print();
  };

  /* ---- WhatsApp Share ---- */
  const handleWhatsAppShare = () => {
    const lines = [
      `🏢 *Party Account Statement*`,
      ``,
      `👤 *${party?.partyName || "Party"}*`,
      party?.partyCode ? `📋 Code: ${party.partyCode}` : null,
      party?.contact ? `📞 Contact: ${party.contact}` : null,
      ``,
      `📊 *Summary*`,
      `💰 Total Billing: ${formatCurrency(account.billing)}`,
      `📥 Received: ${formatCurrency(account.received)}`,
      `📤 Outstanding: ${formatCurrency(account.due)}`,
      account.advance > 0
        ? `📈 Advance: ${formatCurrency(account.advance)}`
        : null,
      `📋 Trips: ${account.partyTrips.length}`,
      `💳 Payments: ${account.partyPayments.length}`,
      ``,
      `— Sent via SAO AUTO TRACTOR`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ---- Copy party code ---- */
  const handleCopyCode = async () => {
    const code = party?.partyCode || party?.partyName || "";

    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      /* silently handled */
    }
  };

  /* ---- Balance status ---- */
  const balanceStatus =
    account.due > 0
      ? "due"
      : account.advance > 0
      ? "advance"
      : "paid";

  const balanceLabel =
    balanceStatus === "due"
      ? "Outstanding"
      : balanceStatus === "advance"
      ? "Advance"
      : "Fully Paid";

  /* ---- History (recent 10) ---- */
  const recentHistory = useMemo(
    () => account.activity.slice(0, 10),
    [account.activity],
  );

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="party-details-overlay" role="presentation">
      <button
        type="button"
        className="party-details-backdrop"
        onClick={onClose}
        aria-label="Close party details"
        tabIndex={-1}
      />

      <aside
        ref={drawerRef}
        className="party-details-drawer party-details-drawer--wide"
        role="dialog"
        aria-modal="true"
        aria-label={`${party?.partyName || "Party"} details`}
      >
        {/* ================= HEADER ================= */}

        <div className="party-details-header">
          <div className="party-details-header-copy">
            <span className="party-details-eyebrow">
              PARTY ACCOUNT
            </span>

            <h2>{party?.partyName || "Party Details"}</h2>

            <p>
              Complete account summary, activity and payment
              history.
            </p>
          </div>

          <div className="party-details-header-actions">
            {account.hasOldDue && (
              <span
                className="party-reminder-badge"
                title={`Payment overdue for ${REMINDER_DAYS}+ days`}
              >
                <Bell size={13} />
                Reminder
              </span>
            )}

            <button
              type="button"
              className="party-action-btn party-action-whatsapp"
              onClick={handleWhatsAppShare}
              title="Share on WhatsApp"
              aria-label="Share party statement on WhatsApp"
            >
              <MessageCircle size={16} strokeWidth={1.9} />
            </button>

            {party?.contact && (
              <a
                className="party-action-btn"
                href={`tel:${party.contact}`}
                title="Call party"
                aria-label={`Call ${party.partyName || "party"}`}
              >
                <Phone size={16} strokeWidth={1.9} />
              </a>
            )}

            {party?.contact && (
              <a
                className="party-action-btn party-action-whatsapp"
                href={`https://wa.me/91${String(party.contact).replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Message party on WhatsApp"
                aria-label={`Message ${party.partyName || "party"} on WhatsApp`}
              >
                <MessageCircle size={16} strokeWidth={1.9} />
              </a>
            )}

            {party?.email && (
              <a
                className="party-action-btn"
                href={`mailto:${party.email}`}
                title="Email party"
                aria-label={`Email ${party.partyName || "party"}`}
              >
                <Mail size={16} strokeWidth={1.9} />
              </a>
            )}

            <button
              type="button"
              className="party-action-btn"
              onClick={handlePrint}
              title="Print / PDF (Ctrl+P)"
              aria-label="Print party statement"
            >
              <Printer size={16} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              className="party-details-close"
              onClick={onClose}
              aria-label="Close party details"
              title="Close (Esc)"
            >
              <X size={18} strokeWidth={1.9} />
            </button>
          </div>
        </div>

        {/* ================= BODY ================= */}

        <div className="party-details-body">
          {/* ---- Reminder banner ---- */}

          {account.hasOldDue && (
            <div className="party-reminder-banner" role="status">
              <Bell size={17} strokeWidth={1.9} />

              <div>
                <strong>Payment Reminder</strong>

                <span>
                  {account.oldDueTrips.length} trip(s) overdue
                  for {REMINDER_DAYS}+ days • Total due:{" "}
                  {formatCurrency(account.due)}
                </span>
              </div>
            </div>
          )}

          {/* ---- Profile card ---- */}

          <section className="party-profile-card">
            <div className="party-profile-main">
              <div className="party-profile-avatar">
                {getInitials(party?.partyName)}
              </div>

              <div className="party-profile-info">
                <strong>
                  {party?.partyName || "Unnamed Party"}
                </strong>

                <span>
                  {party?.partyCode || "No party code"}
                </span>

                <small>
                  {party?.contact || "No contact number"}
                </small>
              </div>
            </div>

            <div className="party-profile-side">
              <StatusBadge
                status={party?.status || "active"}
                label={
                  normalize(party?.status) === "inactive"
                    ? "Inactive"
                    : "Active"
                }
              />

              {party?.partyCode && (
                <button
                  type="button"
                  className={`party-copy-code ${
                    copied ? "is-copied" : ""
                  }`}
                  onClick={handleCopyCode}
                  title="Copy party code"
                  aria-label="Copy party code"
                >
                  <Copy size={12} strokeWidth={1.9} />
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </section>

          {/* ---- Balance banner ---- */}

          <section
            className={`party-balance-banner party-balance-${balanceStatus}`}
          >
            <div className="party-balance-left">
              <span>CURRENT BALANCE</span>

              <strong>{formatCurrency(account.due || 0)}</strong>
            </div>

            <div
              className={`party-balance-status party-balance-status--${balanceStatus}`}
            >
              {balanceLabel}
            </div>
          </section>

          {/* ---- Metrics ---- */}

          <section className="party-metrics-grid">
            <DetailMetric
              icon={<ReceiptText size={16} strokeWidth={1.9} />}
              label="Total Billing"
              value={formatCurrency(account.billing)}
            />

            <DetailMetric
              icon={<ArrowDownLeft size={16} strokeWidth={1.9} />}
              label="Received"
              value={formatCurrency(account.received)}
            />

            <DetailMetric
              icon={<IndianRupee size={16} strokeWidth={1.9} />}
              label="Outstanding"
              value={formatCurrency(account.due)}
              className={account.due > 0 ? "is-due" : ""}
            />

            <DetailMetric
              icon={<Activity size={16} strokeWidth={1.9} />}
              label="Total Trips"
              value={account.partyTrips.length}
            />
          </section>

          {/* ---- Trip breakdown ---- */}

          <section className="party-section">
            <div className="party-section-heading">
              <div>
                <span>TRIP BREAKDOWN</span>
                <h3>Transport Activity</h3>
              </div>
            </div>

            <div className="party-trip-grid">
              <div>
                <span>Loading</span>
                <strong>{account.loading}</strong>
              </div>

              <div>
                <span>Load + Unload</span>
                <strong>{account.combined}</strong>
              </div>

              <div>
                <span>Unloading</span>
                <strong>{account.unloading}</strong>
              </div>

              <div>
                <span>Site to Site</span>
                <strong>{account.siteToSite}</strong>
              </div>
            </div>
          </section>

          {/* ---- Party information ---- */}

          <section className="party-section">
            <div className="party-section-heading">
              <div>
                <span>PARTY INFORMATION</span>
                <h3>Contact & Location</h3>
              </div>
            </div>

            <div className="party-info-grid">
              <div className="party-info-item">
                <Phone size={16} strokeWidth={1.9} />

                <div>
                  <span>Contact</span>
                  <strong>
                    {party?.contact || "Not provided"}
                  </strong>
                </div>
              </div>

              {party?.email && (
                <div className="party-info-item">
                  <Mail size={16} strokeWidth={1.9} />
                  <div>
                    <span>Email</span>
                    <strong>{party.email}</strong>
                  </div>
                </div>
              )}

              <div className="party-info-item">
                <MapPin size={16} strokeWidth={1.9} />

                <div>
                  <span>Site</span>
                  <strong>
                    {party?.siteInfo || "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="party-info-item party-info-item--full">
                <MapPin size={16} strokeWidth={1.9} />

                <div>
                  <span>Address</span>
                  <strong>
                    {party?.address || "Not specified"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* ---- Payment info ---- */}

          <section className="party-section">
            <div className="party-section-heading">
              <div>
                <span>PAYMENT INFORMATION</span>
                <h3>Payment Details</h3>
              </div>
            </div>

            <div className="party-payment-card">
              <IndianRupee size={16} strokeWidth={1.9} />

              <div>
                <span>UPI / Payment Info</span>
                <strong>
                  {party?.paymentQr ||
                    "No payment information added"}
                </strong>
              </div>
            </div>

            {account.advance > 0 && (
              <div className="party-advance-note">
                <ArrowUpRight size={15} strokeWidth={1.9} />

                <span>
                  This account has an advance of{" "}
                  <strong>
                    {formatCurrency(account.advance)}
                  </strong>
                  .
                </span>
              </div>
            )}
          </section>

          {/* ---- Invoices ---- */}

          <section className="party-section party-history-section">
            <div className="party-section-heading">
              <div>
                <span>INVOICE RECORDS</span>
                <h3>Invoices</h3>
              </div>
              <small>{account.partyInvoices.length} invoices</small>
            </div>

            {account.partyInvoices.length === 0 ? (
              <div className="party-history-empty">
                <ReceiptText size={17} strokeWidth={1.9} />
                <span>No invoices saved for this party.</span>
              </div>
            ) : (
              <div className="party-history-list">
                {account.partyInvoices
                  .slice()
                  .sort((a, b) => String(b?.invoiceDate || "").localeCompare(String(a?.invoiceDate || "")))
                  .map((invoice, index) => (
                    <div className="party-history-item" key={invoice?.id || invoice?.invoiceNumber || index}>
                      <div className="party-history-icon party-history-icon--invoice">
                        <ReceiptText size={14} strokeWidth={1.9} />
                      </div>
                      <div className="party-history-content">
                        <strong>{invoice?.invoiceNumber || "Invoice"}</strong>
                        <span>
                          {formatDate(invoice?.invoiceDate || getRecordDate(invoice))} · {getInvoiceFinance(invoice, payments).status} · Due {formatCurrency(getInvoiceFinance(invoice, payments).due)}
                        </span>
                      </div>
                      <div className="party-history-amount-wrap">
                        <strong className="party-history-amount">{formatCurrency(Number(invoice?.grandTotal) || 0)}</strong>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* ---- Daily activity ---- */}

          <section className="party-section party-daily-section">
            <div className="party-section-heading">
              <div>
                <span>DAILY ACTIVITY</span>
                <h3>Date Wise Activity</h3>
              </div>
            </div>

            <div className="party-daily-controls">
              <button
                type="button"
                className={`party-date-btn ${
                  selectedDate === today ? "active" : ""
                }`}
                onClick={setToday}
                aria-pressed={selectedDate === today}
              >
                Today
              </button>

              <button
                type="button"
                className={`party-date-btn ${
                  isYesterday ? "active" : ""
                }`}
                onClick={setYesterday}
                aria-pressed={isYesterday}
              >
                Yesterday
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="party-date-input"
                aria-label="Select activity date"
              />
            </div>

            <div className="party-daily-summary">
              <div className="party-daily-stat">
                <span>Trips</span>
                <strong>{dailyActivity.totalTrips}</strong>
              </div>

              <div className="party-daily-stat">
                <span>Payments</span>
                <strong>{dailyActivity.totalPayments}</strong>
              </div>

              <div className="party-daily-stat">
                <span>Qty</span>
                <strong>{dailyActivity.totalQuantity}</strong>
              </div>

              <div className="party-daily-stat party-daily-finance">
                <span>Billing</span>
                <strong>
                  {formatCurrency(dailyActivity.totalBilling)}
                </strong>
              </div>
            </div>

            {dailyActivity.combined.length === 0 ? (
              <div className="party-daily-empty">
                <Activity size={17} strokeWidth={1.9} />
                <span>No activity on {formatDate(selectedDate)}</span>
              </div>
            ) : (
              <div className="party-daily-list">
                {dailyActivity.combined.map((item) => (
                  <div
                    key={item.id}
                    className={`party-daily-item party-daily-item--${item.kind}`}
                  >
                    <div
                      className={`party-daily-icon party-daily-icon--${item.kind}`}
                    >
                      {item.kind === "trip" || item.kind === "reversal" ? (
                        <ArrowUpRight size={14} strokeWidth={1.9} />
                      ) : (
                        <ArrowDownLeft size={14} strokeWidth={1.9} />
                      )}
                    </div>

                    <div className="party-daily-content">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>

                    <div className="party-daily-amount-wrap">
                      <strong
                        className={`party-daily-amount party-daily-amount--${item.kind}`}
                      >
                        {formatCurrency(item.amount)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---- Recent history ---- */}

          <section className="party-section party-history-section">
            <div className="party-section-heading">
              <div>
                <span>RECENT ACTIVITY</span>
                <h3>Party History</h3>
              </div>

              <small>{account.activity.length} records</small>
            </div>

            {recentHistory.length === 0 ? (
              <div className="party-history-empty">
                <Activity size={17} strokeWidth={1.9} />
                <span>No party history available.</span>
              </div>
            ) : (
              <div className="party-history-list">
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`party-history-item party-history-item--${item.kind}`}
                  >
                    <div
                      className={`party-history-icon party-history-icon--${item.kind}`}
                    >
                      {item.kind === "trip" || item.kind === "reversal" ? (
                        <ArrowUpRight size={14} strokeWidth={1.9} />
                      ) : (
                        <ArrowDownLeft size={14} strokeWidth={1.9} />
                      )}
                    </div>

                    <div className="party-history-content">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>

                      <small>
                        <CalendarDays size={11} strokeWidth={1.9} />
                        {formatDate(item.date)}
                      </small>
                    </div>

                    <div className="party-history-amount-wrap">
                      <strong
                        className={`party-history-amount party-history-amount--${item.kind}`}
                      >
                        {formatCurrency(item.amount)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ================= FOOTER ================= */}

        <div className="party-details-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleWhatsAppShare}
            title="Share on WhatsApp"
          >
            <MessageCircle size={16} strokeWidth={1.9} />
            WhatsApp
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handlePrint}
            title="Print or save as PDF"
          >
            <Printer size={16} strokeWidth={1.9} />
            Print / PDF
          </Button>

          <Button type="button" onClick={() => onEdit(party)}>
            <Edit3 size={16} strokeWidth={1.9} />
            Edit Party
          </Button>
        </div>
      </aside>

      {/* =========================================================
          PRINT PREVIEW MODAL
          ========================================================= */}

      {showPrintPreview && (
        <div
          className="party-print-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Party print preview"
        >
          <div
            className="party-print-preview-backdrop"
            onClick={closePrintPreview}
          />

          <section className="party-print-preview">
            <header className="party-print-preview-header">
              <div>
                <span className="party-print-preview-eyebrow">
                  PRINT PREVIEW
                </span>

                <h2>Party Activity Report</h2>

                <p>
                  Preview before printing or saving as PDF.
                </p>
              </div>

              <button
                type="button"
                className="party-print-preview-close"
                onClick={closePrintPreview}
                aria-label="Close print preview"
              >
                <X size={20} strokeWidth={1.8} />
              </button>
            </header>

            <div className="party-print-preview-body">
              <div className="party-print-sheet">
                {/* HEADER */}
                <div className="party-print-sheet-header">
                  <div>
                    <span className="party-print-label">
                      PARTY ACCOUNT
                    </span>

                    <h3>
                      {party?.partyName || "Party Details"}
                    </h3>

                    <p>Party Activity Report</p>
                  </div>

                  <div className="party-print-date">
                    <span>REPORT DATE</span>

                    <strong>{formatDate(selectedDate)}</strong>
                  </div>
                </div>

                {/* META */}
                <div className="party-print-meta">
                  <div>
                    <span>PARTY CODE</span>
                    <strong>{party?.partyCode || "—"}</strong>
                  </div>

                  <div>
                    <span>CONTACT</span>
                    <strong>{party?.contact || "—"}</strong>
                  </div>

                  <div>
                    <span>STATUS</span>
                    <strong>
                      {normalize(party?.status) === "inactive"
                        ? "Inactive"
                        : "Active"}
                    </strong>
                  </div>

                  <div className="party-print-meta-full">
                    <span>SITE</span>
                    <strong>{party?.siteInfo || "—"}</strong>
                  </div>

                  <div className="party-print-meta-full">
                    <span>ADDRESS</span>
                    <strong>{party?.address || "—"}</strong>
                  </div>
                </div>

                {/* FINANCIAL SUMMARY */}
                <div className="party-print-summary">
                  <div>
                    <span>Billing</span>
                    <strong>
                      {formatCurrency(account.billing)}
                    </strong>
                  </div>

                  <div>
                    <span>Received</span>
                    <strong>
                      {formatCurrency(account.received)}
                    </strong>
                  </div>

                  <div>
                    <span>Outstanding</span>
                    <strong className="party-print-due">
                      {formatCurrency(account.due)}
                    </strong>
                  </div>
                </div>

                {/* DAILY ACTIVITY */}
                <div className="party-print-section">
                  <div className="party-print-section-heading">
                    <span>DAILY ACTIVITY</span>
                    <strong>{formatDate(selectedDate)}</strong>
                  </div>

                  <div className="party-print-daily-totals">
                    <div>
                      <span>Trips</span>
                      <strong>{dailyActivity.totalTrips}</strong>
                    </div>

                    <div>
                      <span>Payments</span>
                      <strong>
                        {dailyActivity.totalPayments}
                      </strong>
                    </div>

                    <div>
                      <span>Qty</span>
                      <strong>
                        {dailyActivity.totalQuantity}
                      </strong>
                    </div>

                    <div>
                      <span>Billing</span>
                      <strong>
                        {formatCurrency(
                          dailyActivity.totalBilling,
                        )}
                      </strong>
                    </div>
                  </div>

                  {dailyActivity.combined.length === 0 ? (
                    <div className="party-print-empty">
                      No activity recorded for this date.
                    </div>
                  ) : (
                    <div className="party-print-table-wrap">
                      <table className="party-print-table">
                        <thead>
                          <tr>
                            <th>TIME</th>
                            <th>TYPE</th>
                            <th>DESCRIPTION</th>
                            <th>QTY</th>
                            <th>AMOUNT</th>
                          </tr>
                        </thead>

                        <tbody>
                          {dailyActivity.combined.map(
                            (item, index) => (
                              <tr
                                key={
                                  item.id ||
                                  `print-item-${index}`
                                }
                              >
                                <td>
                                  {formatTimeOnly(item.time) ||
                                    "—"}
                                </td>

                                <td>{item.title}</td>

                                <td>{item.description}</td>

                                <td>
                                  {item.kind === "trip"
                                    ? item.quantity
                                    : "—"}
                                </td>

                                <td>
                                  {formatCurrency(item.amount)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* OVERALL SUMMARY */}
                <div className="party-print-section">
                  <div className="party-print-section-heading">
                    <span>OVERALL SUMMARY</span>
                    <strong>All Activity</strong>
                  </div>

                  <div className="party-print-overall-grid">
                    <div>
                      <span>Total Trips</span>
                      <strong>{account.partyTrips.length}</strong>
                    </div>

                    <div>
                      <span>Total Billing</span>
                      <strong>
                        {formatCurrency(account.billing)}
                      </strong>
                    </div>

                    <div>
                      <span>Total Received</span>
                      <strong>
                        {formatCurrency(account.received)}
                      </strong>
                    </div>

                    <div>
                      <span>Outstanding</span>
                      <strong>
                        {formatCurrency(account.due)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* PAYMENT INFO */}
                {party?.paymentQr && (
                  <div className="party-print-section">
                    <div className="party-print-section-heading">
                      <span>PAYMENT INFORMATION</span>
                      <strong>—</strong>
                    </div>

                    <div className="party-print-payment">
                      {party.paymentQr}
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div className="party-print-footer">
                  <span>Generated from SAO AUTO TRACTOR</span>
                  <span>
                    {new Date().toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <footer className="party-print-preview-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={closePrintPreview}
              >
                <X size={16} strokeWidth={1.8} />
                Close
              </Button>

              <Button type="button" onClick={handleConfirmPrint}>
                <Printer size={16} strokeWidth={1.8} />
                Print / Save PDF
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

function PartyManagement() {
  const {
    parties = EMPTY_ARRAY,
    trips = EMPTY_ARRAY,
    payments = EMPTY_ARRAY,
    refreshData,
  } = useAppData();

  const safeParties = useMemo(
    () => (Array.isArray(parties) ? parties : EMPTY_ARRAY),
    [parties],
  );

  const safeTrips = useMemo(
    () => (Array.isArray(trips) ? trips : EMPTY_ARRAY),
    [trips],
  );

  const safePayments = useMemo(
    () => (Array.isArray(payments) ? payments : EMPTY_ARRAY),
    [payments],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedParty, setSelectedParty] = useState(null);
  const [partyInvoices, setPartyInvoices] = useState(EMPTY_ARRAY);
  const [autoOpenPrint, setAutoOpenPrint] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(
    search,
    SEARCH_DEBOUNCE_MS,
  );

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    sortBy !== "name";

  /* ---- Stats map ---- */

  const statsMap = useMemo(
    () => buildPartyStatsMap(safeParties, safeTrips, safePayments),
    [safeParties, safeTrips, safePayments],
  );

  const getStats = useCallback(
    (party) =>
      statsMap.get(party?.id) || {
        trips: 0,
        billing: 0,
        received: 0,
        outstanding: 0,
      },
    [statsMap],
  );

  /* ---- Summary ---- */

  const summary = useMemo(() => {
    const total = safeParties.length;

    const active = safeParties.filter(
      (party) => normalize(party?.status) !== "inactive",
    ).length;

    const inactive = safeParties.filter(
      (party) => normalize(party?.status) === "inactive",
    ).length;

    const totalBilling = calculateTotalBilling(safeTrips);
    const totalReceived = calculateTotalReceived(safePayments);
    const outstanding = calculateOutstanding(
      totalBilling,
      totalReceived,
    );

    return {
      total,
      active,
      inactive,
      totalTrips: safeTrips.length,
      totalBilling,
      totalReceived,
      outstanding,
    };
  }, [safeParties, safeTrips, safePayments]);

  /* ---- CSV export ---- */

  const handleExportCSV = useCallback(() => {
    const escapeCell = (value) => {
      let str = String(value ?? "");
      if (/^[\t\r ]*[=+\-@]/.test(str)) str = `'${str}`;
      const needsQuotes =
        str.includes(",") ||
        str.includes('"') ||
        str.includes("\n") ||
        str.includes("\r");

      if (!needsQuotes) return str;

      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      "Party Name",
      "Party Code",
      "Contact",
      "Email",
      "Site Info",
      "Address",
      "Payment Info",
      "Status",
      "Total Trips",
      "Billing (INR)",
      "Received (INR)",
      "Outstanding (INR)",
    ];

    const rows = filteredPartiesRef.current.map((party) => {
      const stats = getStats(party);

      return [
        party?.partyName || "",
        party?.partyCode || "",
        party?.contact || "",
        party?.email || "",
        party?.siteInfo || "",
        party?.address || "",
        party?.paymentQr || "",
        normalize(party?.status) === "inactive"
          ? "Inactive"
          : "Active",
        stats.trips,
        stats.billing.toFixed(2),
        stats.received.toFixed(2),
        stats.outstanding.toFixed(2),
      ];
    });

    const csvContent = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `parties-export-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    link.click();

    URL.revokeObjectURL(link.href);
  }, [getStats]);

  /* ---- Filter + sort ---- */

  const filteredParties = useMemo(() => {
    const query = normalize(debouncedSearch);

    const result = safeParties.filter((party) => {
      const matchesSearch =
        !query ||
        normalize(party?.partyName).includes(query) ||
        normalize(party?.partyCode).includes(query) ||
        normalize(party?.contact).includes(query) ||
        normalize(party?.email).includes(query) ||
        normalize(party?.address).includes(query) ||
        normalize(party?.siteInfo).includes(query);

      const partyStatus =
        normalize(party?.status) === "inactive"
          ? "inactive"
          : "active";

      const matchesStatus =
        statusFilter === "all" || partyStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      const statsA = getStats(a);
      const statsB = getStats(b);

      if (sortBy === "trips") return statsB.trips - statsA.trips;
      if (sortBy === "billing")
        return statsB.billing - statsA.billing;
      if (sortBy === "received")
        return statsB.received - statsA.received;
      if (sortBy === "outstanding")
        return statsB.outstanding - statsA.outstanding;

      return String(a?.partyName || "").localeCompare(
        String(b?.partyName || ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      );
    });
  }, [
    safeParties,
    debouncedSearch,
    statusFilter,
    sortBy,
    getStats,
  ]);

  const filteredPartiesRef = useRef(filteredParties);

  useEffect(() => {
    filteredPartiesRef.current = filteredParties;
  }, [filteredParties]);

  /* ---- Helpers ---- */

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setSortBy("name");
  }, []);

  /* ---- Save ---- */

  const saveParty = useCallback(
    async (formData) => {
      setSaving(true);
      setFormError("");

      try {
        const existingParties = readStorage(
          STORAGE_KEYS.parties,
          [],
        );

        const list = Array.isArray(existingParties)
          ? existingParties
          : [];

        const normalizedName = normalize(formData.partyName);
        const settings = readStorage(STORAGE_KEYS.settings, {}) || {};

        const duplicate = list.find(
          (party) =>
            normalize(party?.partyName) === normalizedName &&
            party?.id !== formData?.id,
        );

        if (duplicate && settings.duplicateWarning !== false) {
          const proceed = window.confirm(
            `A party named “${duplicate.partyName}” already exists. Save this as a separate party anyway?`,
          );
          if (!proceed) {
            setSaving(false);
            return;
          }
        }

        const normalizedCode = normalize(formData.partyCode);
        const duplicateCode = normalizedCode && list.find(
          (party) =>
            normalize(party?.partyCode) === normalizedCode &&
            party?.id !== formData?.id,
        );
        if (duplicateCode) {
          setFormError("This party code is already registered. Use a unique code or leave it blank.");
          setSaving(false);
          return;
        }

        const now = new Date().toISOString();

        if (editingParty) {
          const updatedList = list.map((party) =>
            party?.id === editingParty?.id
              ? {
                  ...party,
                  ...formData,
                  id: party.id,
                  updatedAt: now,
                }
              : party,
          );

          if (!writeStorage(STORAGE_KEYS.parties, updatedList)) {
            throw new Error("storage");
          }
        } else {
          const partyCode =
            normalize(formData.partyCode) ||
            (settings.autoPartyCode === false ? "" : createPartyCode(list));
          const newParty = {
            ...formData,
            partyCode,
            id: createId(),
            createdAt: now,
            updatedAt: now,
          };

          if (!writeStorage(STORAGE_KEYS.parties, [...list, newParty])) {
            throw new Error("storage");
          }
        }

        refreshData?.();

        setShowForm(false);
        setEditingParty(null);
        setFormError("");
      } catch (err) {
        setFormError("Party could not be saved in this browser. Check available storage and try again; your form is still open.");
      } finally {
        setSaving(false);
      }
    },
    [editingParty, refreshData],
  );

  const handleEdit = useCallback((party) => {
    setSelectedParty(null);
    setAutoOpenPrint(false);
    setEditingParty(party);
    setFormError("");
    setShowForm(true);
  }, []);

  /* ---- Archive; preserve related transport and payment history ---- */

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      const existingParties = readStorage(
        STORAGE_KEYS.parties,
        [],
      );

      const list = Array.isArray(existingParties)
        ? existingParties
        : [];

      const updatedList = list.map((party) =>
        party?.id === deleteTarget?.id
          ? { ...party, status: "inactive", updatedAt: new Date().toISOString() }
          : party,
      );

      if (!writeStorage(STORAGE_KEYS.parties, updatedList)) {
        setDeleteError("Could not archive party because browser storage is unavailable. No change was saved.");
        return;
      }

      refreshData?.();

      if (
        selectedParty?.id &&
        selectedParty.id === deleteTarget.id
      ) {
        setSelectedParty(null);
      }

      setDeleteTarget(null);
    } catch (err) {
      setDeleteError("Could not archive party. No change was saved; try again.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, selectedParty, refreshData]);

  const openAddForm = useCallback(() => {
    setEditingParty(null);
    setFormError("");
    setShowForm(true);
  }, []);

  useEffect(() => {
    const handleQuickAction = (event) => {
      if (event.detail?.action !== "add-party") return;
      openAddForm();
    };

    window.addEventListener("saoAutoTractorQuickAction", handleQuickAction);
    return () =>
      window.removeEventListener("saoAutoTractorQuickAction", handleQuickAction);
  }, [openAddForm]);

  const closeForm = useCallback(() => {
    if (saving) return;
    setShowForm(false);
    setEditingParty(null);
    setFormError("");
  }, [saving]);

  const openPartyDetails = useCallback((party) => {
    const savedInvoices = readStorage(STORAGE_KEYS.invoices, EMPTY_ARRAY);
    setPartyInvoices(Array.isArray(savedInvoices) ? savedInvoices : EMPTY_ARRAY);
    setAutoOpenPrint(false);
    setSelectedParty(party);
  }, []);

  const openPartyPrint = useCallback((party) => {
    const savedInvoices = readStorage(STORAGE_KEYS.invoices, EMPTY_ARRAY);
    setPartyInvoices(Array.isArray(savedInvoices) ? savedInvoices : EMPTY_ARRAY);
    setAutoOpenPrint(true);
    setSelectedParty(party);
  }, []);

  const closePartyDetails = useCallback(() => {
    setSelectedParty(null);
    setAutoOpenPrint(false);
  }, []);

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="party-management-page">
      {/* ---- Page Header ---- */}

      <div className="party-page-header">
        <div className="party-page-header-content">
          <div className="party-page-header-icon">
            <Users size={25} strokeWidth={1.8} />
          </div>

          <div className="party-page-header-copy">
            <span className="party-page-eyebrow">
              CUSTOMER MANAGEMENT
            </span>

            <h2>Party Management</h2>

            <p>
              Manage customers, trip activity, billing, payments
              and outstanding balances from one place.
            </p>
          </div>
        </div>

        <div className="party-page-header-accent">
          <Users size={17} strokeWidth={1.8} />
          <span>PARTIES</span>
        </div>

        <div className="party-page-header-action">
          <Button type="button" onClick={openAddForm}>
            <Plus size={17} strokeWidth={1.9} />
            Add Party
          </Button>
        </div>
      </div>

      {/* ---- Summary ---- */}

      <section
        className="party-summary-grid"
        aria-label="Party summary"
      >
        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <Users size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Total Parties</span>
            <strong>{summary.total}</strong>
          </div>
        </Card>

        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <CheckCircle2 size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Active</span>
            <strong>{summary.active}</strong>
          </div>
        </Card>

        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <CircleUserRound size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Inactive</span>
            <strong>{summary.inactive}</strong>
          </div>
        </Card>

        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <Activity size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Total Trips</span>
            <strong>{summary.totalTrips}</strong>
          </div>
        </Card>

        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <IndianRupee size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Total Billing</span>
            <strong>
              {formatCurrency(summary.totalBilling)}
            </strong>
          </div>
        </Card>

        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <IndianRupee size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Received</span>
            <strong>
              {formatCurrency(summary.totalReceived)}
            </strong>
          </div>
        </Card>

        <Card className="party-summary-card party-summary-due">
          <div className="party-summary-icon">
            <IndianRupee size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Outstanding</span>
            <strong>
              {formatCurrency(summary.outstanding)}
            </strong>
          </div>
        </Card>
      </section>

      {/* ---- Form ---- */}

      {showForm && (
        <Card className="party-form-card">
          <PartyForm
            initialValue={editingParty}
            onCancel={closeForm}
            onSave={saveParty}
            externalError={formError}
            saving={saving}
          />
        </Card>
      )}

      {/* ---- Toolbar ---- */}

      <Card className="party-toolbar-card">
        <div className="party-toolbar">
          <div className="party-search">
            <Search
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search party, code, contact or site..."
              aria-label="Search parties"
            />

            {search && (
              <button
                type="button"
                className="party-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear party search"
                title="Clear search"
              >
                <X size={15} strokeWidth={1.9} />
              </button>
            )}
          </div>

          <div
            className="party-filter-tabs"
            role="group"
            aria-label="Party status filter"
          >
            <button
              type="button"
              className={
                statusFilter === "all" ? "active" : ""
              }
              onClick={() => setStatusFilter("all")}
              aria-pressed={statusFilter === "all"}
            >
              All
            </button>

            <button
              type="button"
              className={
                statusFilter === "active" ? "active" : ""
              }
              onClick={() => setStatusFilter("active")}
              aria-pressed={statusFilter === "active"}
            >
              Active
            </button>

            <button
              type="button"
              className={
                statusFilter === "inactive" ? "active" : ""
              }
              onClick={() => setStatusFilter("inactive")}
              aria-pressed={statusFilter === "inactive"}
            >
              Inactive
            </button>
          </div>

          <label className="party-sort">
            <span>Sort</span>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
              aria-label="Sort parties"
            >
              <option value="name">Party Name</option>
              <option value="trips">Most Trips</option>
              <option value="billing">Highest Billing</option>
              <option value="received">
                Highest Received
              </option>
              <option value="outstanding">
                Highest Outstanding
              </option>
            </select>
          </label>

          <button
            type="button"
            className="party-export-btn"
            onClick={handleExportCSV}
            title="Export as CSV"
            aria-label="Export party list as CSV"
          >
            <FileBarChart size={15} />
            Export
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="party-clear-filters"
              onClick={clearFilters}
              title="Reset search, filter and sorting"
            >
              <X size={14} strokeWidth={1.9} />
              Clear Filters
            </button>
          )}
        </div>
      </Card>

      {/* ---- Table ---- */}

      <Card className="party-table-card">
        <div className="party-table-header">
          <div>
            <span>PARTY REGISTER</span>
            <strong>All Parties</strong>
          </div>

          <small>
            {filteredParties.length} of {safeParties.length}
          </small>
        </div>

        {filteredParties.length === 0 ? (
          <div className="party-empty-state">
            <div className="party-empty-icon">
              <Users size={22} strokeWidth={1.7} />
            </div>

            <h3>
              {safeParties.length === 0
                ? "No parties added yet"
                : "No parties found"}
            </h3>

            <p>
              {safeParties.length === 0
                ? "Add your first customer to start managing party-wise business."
                : "Try changing your search or status filter."}
            </p>

            {safeParties.length === 0 ? (
              <Button type="button" onClick={openAddForm}>
                <Plus size={16} strokeWidth={1.9} />
                Add First Party
              </Button>
            ) : hasActiveFilters ? (
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
              >
                <X size={16} strokeWidth={1.9} />
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="party-table-wrap">
            <table className="party-table">
              <thead>
                <tr>
                  <th>PARTY</th>
                  <th>CONTACT</th>
                  <th>TRIPS</th>
                  <th>BILLING</th>
                  <th>RECEIVED</th>
                  <th>OUTSTANDING</th>
                  <th>STATUS</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredParties.map((party) => {
                  const stats = getStats(party);

                  return (
                    <tr key={party?.id}>
                      <td data-label="Party">
                        <button
                          type="button"
                          className="party-identity"
                          onClick={() =>
                            openPartyDetails(party)
                          }
                          title={`View ${
                            party?.partyName || "party"
                          } details`}
                        >
                          <span className="party-avatar">
                            {getInitials(party?.partyName)}
                          </span>

                          <span>
                            <strong>
                              {party?.partyName ||
                                "Unnamed Party"}
                            </strong>

                            <small>
                              {party?.partyCode ||
                                "No party code"}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td data-label="Contact">
                        <div className="party-contact-cell">
                          <strong>
                            {party?.contact || "Not provided"}
                          </strong>

                          <small>
                            {party?.siteInfo ||
                              party?.address ||
                              "No site information"}
                          </small>
                        </div>
                      </td>

                      <td data-label="Trips">
                        <strong className="party-number">
                          {stats.trips}
                        </strong>
                      </td>

                      <td data-label="Billing">
                        <strong className="party-money">
                          {formatCurrency(stats.billing)}
                        </strong>
                      </td>

                      <td data-label="Received">
                        <strong className="party-money">
                          {formatCurrency(stats.received)}
                        </strong>
                      </td>

                      <td data-label="Outstanding">
                        <strong
                          className={
                            stats.outstanding > 0
                              ? "party-money party-money-due"
                              : "party-money"
                          }
                        >
                          {formatCurrency(stats.outstanding)}
                        </strong>
                      </td>

                      <td data-label="Status">
                        <StatusBadge
                          status={party?.status || "active"}
                          label={
                            normalize(party?.status) ===
                            "inactive"
                              ? "Inactive"
                              : "Active"
                          }
                        />
                      </td>

                      <td data-label="Actions">
                        <PartyRowActions
                          party={party}
                          onView={openPartyDetails}
                          onEdit={handleEdit}
          onDelete={(t) => { setDeleteError(""); setDeleteTarget(t); }}
                          onPrint={openPartyPrint}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- Details Drawer ---- */}

      {selectedParty && (
        <PartyDetails
          party={selectedParty}
          trips={safeTrips}
          payments={safePayments}
          invoices={partyInvoices}
          onClose={closePartyDetails}
          onEdit={handleEdit}
          autoOpenPrint={autoOpenPrint}
        />
      )}

      {/* ---- Delete Confirmation ---- */}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive party?"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${
                deleteTarget.partyName || "this party"
              } will be moved to Inactive parties. Trip, payment and invoice history will be kept.${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
        confirmLabel={deleting ? "Archiving..." : "Archive Party"}
        cancelLabel="Cancel"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (deleting) return;
          setDeleteError("");
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

export default PartyManagement;
