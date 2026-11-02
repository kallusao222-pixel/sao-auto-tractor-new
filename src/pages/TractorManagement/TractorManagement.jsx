import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  CircleUserRound,
  Edit3,
  IndianRupee,
  MoreVertical,
  Plus,
  Search,
  Tractor as TractorIcon,
  Truck,
  X,
  MessageCircle,
  FileBarChart,
  AlertTriangle,
  CalendarDays,
  Calendar,
  Share2,
} from "lucide-react";

import { useAppData } from "../../context/AppDataContext";
import { STORAGE_KEYS } from "../../data/storageKeys";
import { readStorage, writeStorage } from "../../data/storage";
import { calculateTripAmount } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";
import { formatDate, getTodayISO } from "../../utils/date";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import "./TractorManagement.css";

/* =========================================================
   CONSTANTS
   ========================================================= */

const EMPTY_FORM = {
  vehicleNumber: "",
  tractorName: "",
  model: "",
  driverName: "",
  driverMobile: "",
  driverStaffId: "",
  status: "active",
  insuranceExpiryDate: "",
  registrationExpiryDate: "",
  fitnessExpiryDate: "",
  pucExpiryDate: "",
  nextServiceDate: "",
};

const EMPTY_ARRAY = [];
const TRACTOR_DATE_REMINDERS = [
  ["insuranceExpiryDate", "Insurance"],
  ["registrationExpiryDate", "Registration"],
  ["fitnessExpiryDate", "Fitness certificate"],
  ["pucExpiryDate", "PUC"],
  ["nextServiceDate", "Service"],
];
const REMINDER_WINDOW_DAYS = 30;

function daysUntilDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* =========================================================
   UTILITIES
   ========================================================= */

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeVehicleNumber(value) {
  return String(value ?? "").replace(/[\s-]/g, "").toUpperCase();
}

function getTripType(trip) {
  const raw = normalize(
    trip?.tripType ??
      trip?.type ??
      trip?.workType ??
      trip?.trip_type ??
      "",
  );

  if (raw === "loading") return "Loading";
  if (raw === "unloading") return "Unloading";

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

function getVehicleNumber(trip) {
  return String(
    trip?.vehicleNumber ??
      trip?.tractorVehicleNumber ??
      trip?.tractor ??
      trip?.vehicle ??
      trip?.vehicleNo ??
      "",
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

function getTripDate(trip) {
  return trip?.date || trip?.createdAt?.split("T")[0] || "";
}

function getLatestTrip(trips) {
  if (!Array.isArray(trips) || trips.length === 0) return null;

  return [...trips].sort((a, b) => {
    const dateA = new Date(a?.date ?? a?.createdAt ?? 0).getTime();
    const dateB = new Date(b?.date ?? b?.createdAt ?? 0).getTime();

    return dateB - dateA;
  })[0];
}

function createId() {
  return `TR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitials(name, fallback = "TR") {
  const value = String(name || "").trim();

  if (!value) return fallback;

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Build a stats map for all tractors in one pass.
 * Feature #7 — memoization of getTractorStats.
 */
function buildTractorStatsMap(tractors, trips) {
  const map = new Map();

  // Group trips by normalized vehicle number — single pass
  const tripsByVehicle = new Map();

  for (const trip of trips) {
    const key = normalizeVehicleNumber(getVehicleNumber(trip));

    if (!key) continue;

    if (!tripsByVehicle.has(key)) {
      tripsByVehicle.set(key, []);
    }

    tripsByVehicle.get(key).push(trip);
  }

  for (const tractor of tractors) {
    const key = normalizeVehicleNumber(tractor?.vehicleNumber);
    const tractorTrips = key ? tripsByVehicle.get(key) || [] : [];

    let loading = 0;
    let unloading = 0;
    let siteToSite = 0;
    let quantity = 0;
    let billing = 0;
    let latestTripDate = null;

    for (const trip of tractorTrips) {
      const type = getTripType(trip);

      if (type === "Loading") loading += 1;
      if (type === "Unloading") unloading += 1;
      if (type === "Site to Site") siteToSite += 1;

      quantity += getTripQuantity(trip);
      billing += getTripAmount(trip);

      const tripDate = trip?.date || trip?.createdAt;

      if (tripDate) {
        const ts = new Date(tripDate).getTime();

        if (
          Number.isFinite(ts) &&
          (!latestTripDate || ts > latestTripDate.ts)
        ) {
          latestTripDate = { ts, raw: tripDate };
        }
      }
    }

    map.set(tractor?.id, {
      records: tractorTrips.length,
      totalTrips: tractorTrips.length,
      loading,
      unloading,
      siteToSite,
      quantity,
      billing,
      latestTrip: latestTripDate?.raw || null,
      trips: tractorTrips,
    });
  }

  return map;
}

/* =========================================================
   FOCUS TRAP HOOK (Feature #4)
   ========================================================= */

function useFocusTrap(containerRef, isActive) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const node = containerRef.current;
    const previouslyFocused = document.activeElement;

    // Focus first focusable
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
   ROW ACTIONS MENU (Feature #6)
   ========================================================= */

function TractorRowActions({
  tractor,
  onView,
  onDaily,
  onWhatsApp,
  onEdit,
  onDelete,
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
    fn?.(tractor);
  };

  const label = tractor?.vehicleNumber || "tractor";

  return (
    <div className="tractor-row-actions" ref={wrapperRef}>
      <button
        type="button"
        className="tractor-row-primary-action"
        onClick={handle(onView)}
        title="View details"
        aria-label={`View ${label} details`}
      >
        <MoreVertical size={17} strokeWidth={1.8} />
      </button>

      <button
        type="button"
        className="tractor-row-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`More actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
      >
        <Edit3 size={15} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className="tractor-row-menu"
          role="menu"
          aria-label={`Actions for ${label}`}
        >
          <button
            type="button"
            role="menuitem"
            className="tractor-row-menu-item"
            onClick={handle(onDaily)}
          >
            <CalendarDays size={14} strokeWidth={1.8} />
            <span>Daily Activity</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="tractor-row-menu-item"
            onClick={handle(onWhatsApp)}
          >
            <MessageCircle size={14} strokeWidth={1.8} />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="tractor-row-menu-item"
            onClick={handle(onEdit)}
          >
            <Edit3 size={14} strokeWidth={1.8} />
            <span>Edit Tractor</span>
          </button>

          <div className="tractor-row-menu-divider" />

          {normalize(tractor?.status) !== "inactive" && <button
            type="button"
            role="menuitem"
            className="tractor-row-menu-item"
            onClick={handle(onDelete)}
          >
            <Archive size={14} strokeWidth={1.8} />
            <span>Archive Tractor</span>
          </button>}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TRACTOR FORM
   ========================================================= */

function TractorForm({
  initialValue,
  staffOptions = [],
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
  const formRef = useRef(null);

  // Feature #11 — Escape closes form
  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onCancel]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "driverStaffId") {
        const staffMember = staffOptions.find((person) => String(person.id) === value);
        return { ...current, driverStaffId: value, driverName: staffMember?.name || "", driverMobile: staffMember?.mobile || "" };
      }
      return { ...current, [name]: value, ...(name === "driverName" || name === "driverMobile" ? { driverStaffId: "" } : {}) };
    });

    if (error) setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (saving) return;

    const vehicleNumber = form.vehicleNumber.trim();
    const driverName = form.driverName.trim();
    const driverMobile = form.driverMobile.trim();

    if (!vehicleNumber) {
      setError("Vehicle number is required.");
      return;
    }

    if (driverMobile && !/^[0-9]{10}$/.test(driverMobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    onSave({
      ...form,
      vehicleNumber,
      tractorName: form.tractorName.trim(),
      model: form.model.trim(),
      driverName,
      driverMobile,
      status: form.status || "active",
    });
  };

  const displayError = error || externalError || "";

  return (
    <div className="tractor-form-wrap" ref={formRef}>
      <div className="tractor-form-header">
        <div>
          <span className="tractor-form-eyebrow">
            {initialValue ? "EDIT TRACTOR" : "NEW TRACTOR"}
          </span>

          <h3>
            {initialValue ? "Update Tractor" : "Add Tractor"}
          </h3>

          <p>
            Keep vehicle and driver information ready for trip
            management.
          </p>
        </div>

        <button
          type="button"
          className="tractor-form-close"
          onClick={onCancel}
          aria-label="Close form"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="tractor-form">
        {displayError && (
          <div
            className="tractor-form-error"
            role="alert"
            aria-live="polite"
          >
            {displayError}
          </div>
        )}

        <div className="tractor-form-grid">
          <label className="tractor-field">
            <span>Vehicle Number *</span>

            <input
              name="vehicleNumber"
              value={form.vehicleNumber}
              onChange={handleChange}
              placeholder="e.g. WB 55 AB 1234"
              autoComplete="off"
              autoFocus
            />
          </label>

          <label className="tractor-field">
            <span>Tractor Name</span>

            <input
              name="tractorName"
              value={form.tractorName}
              onChange={handleChange}
              placeholder="e.g. Sonalika"
              autoComplete="off"
            />
          </label>

          <label className="tractor-field">
            <span>Model</span>

            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              placeholder="e.g. DI 745 III"
              autoComplete="off"
            />
          </label>

          <label className="tractor-field">
            <span>Assign Staff Driver</span>
            <select name="driverStaffId" value={form.driverStaffId || ""} onChange={handleChange}>
              <option value="">Manual / not linked</option>
              {staffOptions.filter((person) => !person.status || person.status === "Active").map((person) => <option key={person.id} value={person.id}>{person.name}{person.mobile ? ` · ${person.mobile}` : ""}</option>)}
            </select>
            <small>Choose a staff profile to keep driver details connected.</small>
          </label>

          <label className="tractor-field">
            <span>Driver Name</span>

            <input
              name="driverName"
              value={form.driverName}
              onChange={handleChange}
              placeholder="Driver name"
              autoComplete="name"
            />
          </label>

          <label className="tractor-field">
            <span>Driver Mobile</span>

            <input
              name="driverMobile"
              value={form.driverMobile}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
            />
          </label>

          <label className="tractor-field">
            <span>Status</span>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {TRACTOR_DATE_REMINDERS.map(([name, label]) => (
            <label className="tractor-field" key={name}>
              <span>{label} {name === "nextServiceDate" ? "Due" : "Expiry"}</span>
              <input
                type="date"
                name={name}
                value={form[name] || ""}
                onChange={handleChange}
              />
            </label>
          ))}
        </div>

        <div className="tractor-form-actions">
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
              ? "Update Tractor"
              : "Save Tractor"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   TRACTOR DETAILS DRAWER
   ========================================================= */

function TractorDetails({
  tractor,
  trips,
  onClose,
  onEdit,
  onWhatsAppShare,
  onAddTrip,
  initialDate,
}) {
  const today = getTodayISO();

  const [selectedDate, setSelectedDate] = useState(
    initialDate || today,
  );
  const [maintenanceLogs, setMaintenanceLogs] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.tractorMaintenance) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  });
  const [maintenanceForm, setMaintenanceForm] = useState({ date: today, type: "Routine service", cost: "", engineHours: "", notes: "" });

  const drawerRef = useRef(null);

  // Feature #4 — focus trap + escape + focus return
  useFocusTrap(drawerRef, true);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const vehicleNumber = normalizeVehicleNumber(tractor?.vehicleNumber);

  const tractorTrips = useMemo(() => {
    return trips.filter(
      (trip) =>
        normalizeVehicleNumber(getVehicleNumber(trip)) === vehicleNumber,
    );
  }, [trips, vehicleNumber]);

  const dateTrips = useMemo(() => {
    return tractorTrips.filter((trip) => {
      const tripDate = getTripDate(trip);
      return tripDate === selectedDate;
    });
  }, [tractorTrips, selectedDate]);

  const dateSummary = useMemo(() => {
    let totalTrips = dateTrips.length;
    let totalQuantity = 0;
    let totalBilling = 0;

    const materialMap = new Map();

    dateTrips.forEach((trip) => {
      const qty = getTripQuantity(trip);
      const amt = getTripAmount(trip);

      totalQuantity += qty;
      totalBilling += amt;

      const material = getTripMaterial(trip);

      if (material) {
        materialMap.set(
          material,
          (materialMap.get(material) || 0) + qty,
        );
      }
    });

    return {
      totalTrips,
      totalQuantity,
      totalBilling,
      materials: Array.from(materialMap.entries()).map(
        ([name, qty]) => ({ name, qty }),
      ),
    };
  }, [dateTrips]);

  const tractorMaintenance = useMemo(() => maintenanceLogs
    .filter((log) => normalizeVehicleNumber(log.vehicleNumber) === vehicleNumber)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))), [maintenanceLogs, vehicleNumber]);

  const saveMaintenance = (event) => {
    event.preventDefault();
    const next = [{ id: `MNT-${Date.now()}`, vehicleNumber: tractor?.vehicleNumber || "", ...maintenanceForm, cost: Number(maintenanceForm.cost) || 0, engineHours: Number(maintenanceForm.engineHours) || 0 }, ...maintenanceLogs];
    try {
      localStorage.setItem(STORAGE_KEYS.tractorMaintenance, JSON.stringify(next));
      setMaintenanceLogs(next);
      setMaintenanceForm({ date: today, type: "Routine service", cost: "", engineHours: "", notes: "" });
      window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    } catch { window.alert("Service record could not be saved. Check available browser storage."); }
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const setToday = () => {
    setSelectedDate(today);
  };

  const setYesterday = () => {
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);

    setSelectedDate(yesterday.toISOString().split("T")[0]);
  };

  const isYesterday =
    selectedDate ===
    (() => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return y.toISOString().split("T")[0];
    })();

  return (
    <div className="tractor-details-overlay">
      <div
        className="tractor-details-backdrop"
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        className="tractor-details-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Tractor details for ${
          tractor?.vehicleNumber || "tractor"
        }`}
      >
        <div className="tractor-details-header">
          <div>
            <span className="tractor-details-eyebrow">
              TRACTOR ACCOUNT
            </span>

            <h2>
              {tractor?.vehicleNumber || "Tractor Details"}
            </h2>
          </div>

          <button
            type="button"
            className="tractor-details-close"
            onClick={onClose}
            aria-label="Close tractor details"
          >
            <X size={19} strokeWidth={1.8} />
          </button>
        </div>

        <div className="tractor-details-body">
          <div className="tractor-profile">
            <div className="tractor-profile-avatar">
              {getInitials(
                tractor?.tractorName || tractor?.vehicleNumber,
              )}
            </div>

            <div className="tractor-profile-info">
              <strong>
                {tractor?.tractorName ||
                  tractor?.vehicleNumber ||
                  "Unnamed Tractor"}
              </strong>

              <span>{tractor?.model || "Model not specified"}</span>

              <small>
                {tractor?.vehicleNumber ||
                  "Vehicle number not specified"}
              </small>
            </div>

            <StatusBadge
              status={tractor?.status || "active"}
              label={
                normalize(tractor?.status) === "inactive"
                  ? "Inactive"
                  : "Active"
              }
            />
          </div>

          <div className="tractor-driver-card">
            <div className="tractor-driver-icon">
              <CircleUserRound size={18} strokeWidth={1.8} />
            </div>

            <div>
              <span>Driver</span>

              <strong>
                {tractor?.driverName || "Not assigned"}
              </strong>

              <small>
                {tractor?.driverMobile || "No mobile number"}
              </small>
            </div>

            {tractor?.driverMobile && (
              <button
                type="button"
                className="tractor-whatsapp-driver-btn"
                onClick={() => onWhatsAppShare(tractor)}
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
              >
                <MessageCircle size={16} />
              </button>
            )}
          </div>

          <section className="tractor-maintenance-panel" aria-label="Service history">
            <div className="tractor-maintenance-heading"><div><span>FLEET RECORD</span><h3>Service history</h3></div><small>{tractorMaintenance.length} records</small></div>
            <form className="tractor-maintenance-form" onSubmit={saveMaintenance}>
              <label>Date<input type="date" value={maintenanceForm.date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })} required /></label>
              <label>Service type<select value={maintenanceForm.type} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}><option>Routine service</option><option>Repair</option><option>Tyre</option><option>Engine</option><option>Other</option></select></label>
              <label>Cost (₹)<input type="number" min="0" step="0.01" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} placeholder="0" /></label>
              <label>Engine hours<input type="number" min="0" step="0.1" value={maintenanceForm.engineHours} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, engineHours: e.target.value })} placeholder="Optional" /></label>
              <label className="maintenance-notes">Garage / notes<input value={maintenanceForm.notes} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })} placeholder="Work done, garage, parts..." /></label>
              <button type="submit"><Plus size={15} /> Add service record</button>
            </form>
            {tractorMaintenance.length ? <div className="tractor-maintenance-list">{tractorMaintenance.slice(0, 5).map((log) => <div key={log.id}><strong>{log.type}</strong><span>{formatDate(log.date)}{log.engineHours ? ` · ${log.engineHours} hrs` : ""}</span><b>{formatCurrency(log.cost || 0)}</b>{log.notes && <small>{log.notes}</small>}</div>)}</div> : <p className="tractor-maintenance-empty">No service history recorded for this tractor yet.</p>}
          </section>

          {/* ---- Daily Activity ---- */}

          <div className="tractor-daily-activity">
            <div className="tractor-daily-header">
              <div className="tractor-daily-title">
                <CalendarDays size={17} />
                <span>Daily Activity</span>
              </div>

              <div className="tractor-daily-date-controls">
                <button
                  type="button"
                  className={`tractor-date-btn ${
                    selectedDate === today ? "active" : ""
                  }`}
                  onClick={setToday}
                >
                  Today
                </button>

                <button
                  type="button"
                  className={`tractor-date-btn ${
                    isYesterday ? "active" : ""
                  }`}
                  onClick={setYesterday}
                >
                  Yesterday
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="tractor-date-input"
                  aria-label="Select date"
                />
              </div>
            </div>

            <div className="tractor-daily-summary">
              <div className="tractor-daily-stat">
                <span>Trips</span>
                <strong>{dateSummary.totalTrips}</strong>
              </div>

              <div className="tractor-daily-stat">
                <span>Materials</span>
                <strong>{dateSummary.materials.length}</strong>
              </div>

              <div className="tractor-daily-stat">
                <span>Total Qty</span>
                <strong>{dateSummary.totalQuantity}</strong>
              </div>

              <div className="tractor-daily-stat tractor-daily-finance">
                <span>Billing</span>
                <strong>
                  {formatCurrency(dateSummary.totalBilling)}
                </strong>
              </div>
            </div>

            {dateTrips.length === 0 ? (
              <div className="tractor-daily-empty">
                <Activity size={18} />
                <span>
                  No trips on {formatDate(selectedDate)}
                </span>
              </div>
            ) : (
              <>
                {dateSummary.materials.length > 0 && (
                  <div className="tractor-daily-materials">
                    <span className="tractor-daily-materials-label">
                      Materials Used
                    </span>

                    <div className="tractor-daily-material-tags">
                      {dateSummary.materials.map(({ name, qty }) => (
                        <span
                          key={name}
                          className="tractor-daily-material-tag"
                        >
                          {name}
                          <small>{qty} qty</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="tractor-daily-trip-list">
                  <div className="tractor-daily-trip-header">
                    <span>Time</span>
                    <span>Material</span>
                    <span>Qty</span>
                    <span>Amount</span>
                  </div>

                  {dateTrips.map((trip, idx) => {
                    const type = getTripType(trip);
                    const material = getTripMaterial(trip);
                    const qty = getTripQuantity(trip);
                    const amount = getTripAmount(trip);

                    const time =
                      trip?.time || trip?.createdAt || "";

                    return (
                      <div
                        key={trip?.id || idx}
                        className="tractor-daily-trip-row"
                      >
                        <span className="tractor-daily-trip-time">
                          {formatDate(time, { timeOnly: true }) ||
                            "N/A"}
                        </span>

                        <span className="tractor-daily-trip-material">
                          {material}

                          <StatusBadge
                            status={type}
                            label={type}
                            size="small"
                          />
                        </span>

                        <span className="tractor-daily-trip-qty">
                          {qty}
                        </span>

                        <span className="tractor-daily-trip-amount">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ---- History ---- */}

          <div className="tractor-history-section">
            <div className="tractor-history-title">
              <div>
                <span>RECENT ACTIVITY</span>
                <strong>All Trip History</strong>
              </div>

              <span>{tractorTrips.length} records</span>
            </div>

            {tractorTrips.length === 0 ? (
              <div className="tractor-history-empty">
                <Activity size={18} strokeWidth={1.8} />
                <span>No trip history available.</span>
              </div>
            ) : (
              <div className="tractor-history-list">
                {tractorTrips.slice(0, 8).map((trip, index) => {
                  const type = getTripType(trip);
                  const amount = getTripAmount(trip);

                  return (
                    <div
                      className="tractor-history-item"
                      key={
                        trip?.id || trip?._id || `history-${index}`
                      }
                    >
                      <div className="tractor-history-date">
                        <strong>
                          {formatDate(trip?.date)}
                        </strong>
                        <span>
                          {trip?.partyName ||
                            trip?.party ||
                            "No party"}
                        </span>
                      </div>

                      <div className="tractor-history-type">
                        <StatusBadge
                          status={type}
                          label={type || "Unknown"}
                        />
                      </div>

                      <div className="tractor-history-amount">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="tractor-details-footer">
          {normalize(tractor?.status) !== "inactive" && (
            <Button type="button" variant="secondary" onClick={() => onAddTrip?.(tractor)}>
              <Plus size={16} strokeWidth={1.8} />
              Add Trip
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>

          <Button type="button" onClick={() => onEdit(tractor)}>
            <Edit3 size={16} strokeWidth={1.8} />
            Edit Tractor
          </Button>
        </div>
      </aside>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

function TractorManagement({ onAddTrip }) {
  const {
    tractors = EMPTY_ARRAY,
    trips = EMPTY_ARRAY,
    staff = EMPTY_ARRAY,
    refreshData,
  } = useAppData();

  // Feature #3 — stable empty fallbacks
  const safeTractors = useMemo(
    () => (Array.isArray(tractors) ? tractors : EMPTY_ARRAY),
    [tractors],
  );

  const safeTrips = useMemo(
    () => (Array.isArray(trips) ? trips : EMPTY_ARRAY),
    [trips],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("vehicle");

  const [showForm, setShowForm] = useState(false);
  const [editingTractor, setEditingTractor] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedTractor, setSelectedTractor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [dailyDate, setDailyDate] = useState(getTodayISO());

  /* ---- Stats map (Feature #7) ---- */

  const statsMap = useMemo(
    () => buildTractorStatsMap(safeTractors, safeTrips),
    [safeTractors, safeTrips],
  );

  const getStats = useCallback(
    (tractor) =>
      statsMap.get(tractor?.id) || {
        records: 0,
        totalTrips: 0,
        loading: 0,
        unloading: 0,
        siteToSite: 0,
        quantity: 0,
        billing: 0,
        latestTrip: null,
        trips: [],
      },
    [statsMap],
  );

  /* ---- Summary ---- */

  const summary = useMemo(() => {
    const total = safeTractors.length;

    const active = safeTractors.filter(
      (tractor) =>
        normalize(tractor?.status) !== "inactive",
    ).length;

    const inactive = safeTractors.filter(
      (tractor) =>
        normalize(tractor?.status) === "inactive",
    ).length;

    const loadingTrips = safeTrips.filter(
      (trip) => getTripType(trip) === "Loading",
    ).length;

    const unloadingTrips = safeTrips.filter(
      (trip) => getTripType(trip) === "Unloading",
    ).length;

    const siteToSiteTrips = safeTrips.filter(
      (trip) => getTripType(trip) === "Site to Site",
    ).length;

    const totalTrips =
      loadingTrips + unloadingTrips + siteToSiteTrips;

    const totalBilling = safeTrips.reduce(
      (sum, trip) => sum + getTripAmount(trip),
      0,
    );

    return {
      total,
      active,
      inactive,
      totalTrips,
      loadingTrips,
      unloadingTrips,
      siteToSiteTrips,
      totalBilling,
    };
  }, [safeTractors, safeTrips]);

  /* ---- Smart Reminders — idle tractors ---- */

  const idleTractors = useMemo(() => {
    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return safeTractors
      .filter(
        (tractor) =>
          normalize(tractor?.status) !== "inactive",
      )
      .filter((tractor) => {
        const stats = statsMap.get(tractor?.id);

        if (!stats?.latestTrip) return true;

        const lastTripDate = new Date(stats.latestTrip);

        return (
          Number.isFinite(lastTripDate.getTime()) &&
          lastTripDate < sevenDaysAgo
        );
      });
  }, [safeTractors, statsMap]);

  const dateReminders = useMemo(() => {
    const reminders = [];
    for (const tractor of safeTractors) {
      if (normalize(tractor?.status) === "inactive") continue;
      for (const [field, label] of TRACTOR_DATE_REMINDERS) {
        const days = daysUntilDate(tractor?.[field]);
        if (days === null || days > REMINDER_WINDOW_DAYS) continue;
        reminders.push({ tractor, field, label, days });
      }
    }
    return reminders.sort((a, b) => a.days - b.days);
  }, [safeTractors]);

  /* ---- WhatsApp Share ---- */

  const handleWhatsAppShare = useCallback(
    (tractor) => {
      const stats = getStats(tractor);

      const message =
        `🚜 *Tractor Details*%0A%0A` +
        `📋 Vehicle: ${tractor?.vehicleNumber || "N/A"}%0A` +
        `🚜 Name: ${tractor?.tractorName || "N/A"}%0A` +
        `🔧 Model: ${tractor?.model || "N/A"}%0A` +
        `👤 Driver: ${
          tractor?.driverName || "Not assigned"
        }%0A` +
        `📱 Mobile: ${tractor?.driverMobile || "N/A"}%0A` +
        `📊 Status: ${
          normalize(tractor?.status) === "inactive"
            ? "Inactive"
            : "Active"
        }%0A` +
        `%0A` +
        `📈 *Performance*%0A` +
        `🔄 Total Trips: ${stats.totalTrips}%0A` +
        `📥 Loading: ${stats.loading}%0A` +
        `📤 Unloading: ${stats.unloading}%0A` +
        `🚚 Site to Site: ${stats.siteToSite}%0A` +
        `💰 Billing: ${formatCurrency(stats.billing)}%0A%0A` +
        `---%0A` +
        `SAO AUTO TRACTOR`;

      window.open(
        `https://wa.me/?text=${message}`,
        "_blank",
      );
    },
    [getStats],
  );

  /* ---- CSV export (Feature #1 — proper escaping) ---- */

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
      "Vehicle Number",
      "Tractor Name",
      "Model",
      "Driver Name",
      "Driver Mobile",
      "Status",
      "Total Trips",
      "Loading",
      "Unloading",
      "Site to Site",
      "Total Billing (INR)",
    ];

    const rows = filteredTractorsRef.current.map((tractor) => {
      const stats = getStats(tractor);

      return [
        tractor?.vehicleNumber || "",
        tractor?.tractorName || "",
        tractor?.model || "",
        tractor?.driverName || "",
        tractor?.driverMobile || "",
        normalize(tractor?.status) === "inactive"
          ? "Inactive"
          : "Active",
        stats.totalTrips,
        stats.loading,
        stats.unloading,
        stats.siteToSite,
        stats.billing.toFixed(2),
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
    link.download = `tractors-export-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    link.click();

    URL.revokeObjectURL(link.href);
  }, [getStats]);

  /* ---- Filter + sort ---- */

  const filteredTractors = useMemo(() => {
    const query = normalize(search);

    const result = safeTractors.filter((tractor) => {
      const matchesSearch =
        !query ||
        normalizeVehicleNumber(tractor?.vehicleNumber).includes(normalizeVehicleNumber(search)) ||
        normalize(tractor?.tractorName).includes(query) ||
        normalize(tractor?.model).includes(query) ||
        normalize(tractor?.driverName).includes(query) ||
        normalize(tractor?.driverMobile).includes(query);

      const tractorStatus =
        normalize(tractor?.status) === "inactive"
          ? "inactive"
          : "active";

      const matchesStatus =
        statusFilter === "all" ||
        tractorStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      const statsA = getStats(a);
      const statsB = getStats(b);

      if (sortBy === "trips") {
        return statsB.totalTrips - statsA.totalTrips;
      }

      if (sortBy === "billing") {
        return statsB.billing - statsA.billing;
      }

      if (sortBy === "quantity") {
        return statsB.quantity - statsA.quantity;
      }

      return String(a?.vehicleNumber || "").localeCompare(
        String(b?.vehicleNumber || ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      );
    });
  }, [
    safeTractors,
    search,
    statusFilter,
    sortBy,
    getStats,
  ]);

  // Ref so CSV export sees latest filtered list without stale closure
  const filteredTractorsRef = useRef(filteredTractors);

  useEffect(() => {
    filteredTractorsRef.current = filteredTractors;
  }, [filteredTractors]);

  /* ---- Save (Feature #2 — inline error, no alert) ---- */

  const saveTractor = useCallback(
    async (formData) => {
      setSaving(true);
      setFormError("");

      try {
        const existingTractors = readStorage(
          STORAGE_KEYS.tractors,
          [],
        );

        const list = Array.isArray(existingTractors)
          ? existingTractors
          : [];

        const normalizedVehicle = normalizeVehicleNumber(
          formData.vehicleNumber,
        );

        const duplicate = list.find(
          (tractor) =>
            normalizeVehicleNumber(tractor?.vehicleNumber) ===
              normalizedVehicle &&
            tractor?.id !== formData?.id,
        );

        if (duplicate) {
          setFormError(
            "This vehicle number is already registered.",
          );
          setSaving(false);
          return;
        }

        const now = new Date().toISOString();

        if (editingTractor) {
          const updatedList = list.map((tractor) =>
            tractor?.id === editingTractor?.id
              ? {
                  ...tractor,
                  ...formData,
                  id: tractor.id,
                  updatedAt: now,
                }
              : tractor,
          );

          if (!writeStorage(STORAGE_KEYS.tractors, updatedList)) {
            throw new Error("storage");
          }
        } else {
          const newTractor = {
            ...formData,
            id: createId(),
            createdAt: now,
            updatedAt: now,
          };

          if (!writeStorage(STORAGE_KEYS.tractors, [
            ...list,
            newTractor,
          ])) {
            throw new Error("storage");
          }
        }

        refreshData?.();

        setShowForm(false);
        setEditingTractor(null);
        setFormError("");
      } catch (err) {
        setFormError(
          "Tractor could not be saved in this browser. Check available storage and try again; your form is still open.",
        );
      } finally {
        setSaving(false);
      }
    },
    [editingTractor, refreshData],
  );

  const handleEdit = useCallback((tractor) => {
    setSelectedTractor(null);
    setEditingTractor(tractor);
    setFormError("");
    setShowForm(true);
  }, []);

  /* ---- Archive; retain trip history and allow reactivation ---- */

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      const existingTractors = readStorage(
        STORAGE_KEYS.tractors,
        [],
      );

      const list = Array.isArray(existingTractors)
        ? existingTractors
        : [];

      const updatedList = list.map((tractor) =>
        tractor?.id === deleteTarget?.id
          ? { ...tractor, status: "inactive", updatedAt: new Date().toISOString() }
          : tractor,
      );

      if (!writeStorage(STORAGE_KEYS.tractors, updatedList)) {
        setDeleteError("Could not archive tractor because browser storage is unavailable. No change was saved.");
        return;
      }

      refreshData?.();

      if (
        selectedTractor?.id &&
        selectedTractor.id === deleteTarget.id
      ) {
        setSelectedTractor(null);
      }

      setDeleteTarget(null);
    } catch (err) {
      setDeleteError("Could not archive tractor. No change was saved; try again.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, selectedTractor, refreshData]);

  const openAddForm = useCallback(() => {
    setEditingTractor(null);
    setFormError("");
    setShowForm(true);
  }, []);

  useEffect(() => {
    const handleQuickAction = (event) => {
      if (event.detail?.action !== "add-tractor") return;
      openAddForm();
    };

    window.addEventListener("saoAutoTractorQuickAction", handleQuickAction);
    return () =>
      window.removeEventListener("saoAutoTractorQuickAction", handleQuickAction);
  }, [openAddForm]);

  const closeForm = useCallback(() => {
    if (saving) return;
    setShowForm(false);
    setEditingTractor(null);
    setFormError("");
  }, [saving]);

  const openDailyActivity = useCallback((tractor) => {
    setSelectedTractor(tractor);
    setDailyDate(getTodayISO());
  }, []);

  const startTripForTractor = useCallback((tractor) => {
    setSelectedTractor(null);
    onAddTrip?.(tractor);
  }, [onAddTrip]);

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="tractor-management-page">

      {/* ---- Smart Reminders ---- */}

      {idleTractors.length > 0 && (
        <Card className="tractor-reminder-card">
          <div className="tractor-reminder-header">
            <div className="tractor-reminder-icon">
              <AlertTriangle size={17} />
            </div>

            <div>
              <span className="tractor-reminder-eyebrow">
                SMART REMINDER
              </span>

              <h4>
                {idleTractors.length}{" "}
                {idleTractors.length === 1
                  ? "tractor"
                  : "tractors"}{" "}
                with no trips for 7+ days
              </h4>
            </div>
          </div>

          <div className="tractor-reminder-list">
            {idleTractors.slice(0, 5).map((tractor) => (
              <div
                key={tractor.id}
                className="tractor-reminder-item"
              >
                <span className="tractor-reminder-dot" />

                <strong>
                  {tractor?.vehicleNumber || "Unknown"}
                </strong>

                <span>
                  {tractor?.driverName || "No driver"}
                </span>

                <small>No trips in last 7 days</small>
              </div>
            ))}

            {idleTractors.length > 5 && (
              <span className="tractor-reminder-more">
                +{idleTractors.length - 5} more tractors
              </span>
            )}
          </div>
        </Card>
      )}

      {dateReminders.length > 0 && (
        <Card className="tractor-reminder-card tractor-document-reminders">
          <div className="tractor-reminder-header">
            <div className="tractor-reminder-icon"><CalendarDays size={17} /></div>
            <div>
              <span className="tractor-reminder-eyebrow">DOCUMENTS & SERVICE</span>
              <h4>{dateReminders.length} reminder{dateReminders.length === 1 ? "" : "s"} due within 30 days</h4>
            </div>
          </div>
          <div className="tractor-reminder-list">
            {dateReminders.slice(0, 8).map(({ tractor, field, label, days }) => (
              <button
                type="button"
                key={`${tractor.id}-${field}`}
                className="tractor-reminder-item tractor-document-reminder-item"
                onClick={() => handleEdit(tractor)}
                aria-label={`Update ${label} date for ${tractor.vehicleNumber || "tractor"}; ${days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "due today" : `due in ${days} days`}`}
              >
                <span className="tractor-reminder-dot" />
                <strong>{tractor?.vehicleNumber || "Unknown"}</strong>
                <span>{label}</span>
                <small>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `In ${days}d`}</small>
              </button>
            ))}
            {dateReminders.length > 8 && <span className="tractor-reminder-more">+{dateReminders.length - 8} more reminders</span>}
          </div>
        </Card>
      )}

      {/* ---- Page Header ---- */}

      <div className="tractor-page-header">
        <div className="tractor-page-header-content">
          <div className="tractor-page-header-icon">
            <TractorIcon size={25} strokeWidth={1.8} />
          </div>

          <div className="tractor-page-header-copy">
            <span className="tractor-page-eyebrow">
              FLEET MANAGEMENT
            </span>

            <h2>Tractor Management</h2>

            <p>
              Manage your tractors, drivers, trip activity and
              vehicle-wise business performance from one place.
            </p>
          </div>
        </div>

        <div className="tractor-page-header-accent">
          <Truck size={17} strokeWidth={1.8} />
          <span>FLEET</span>
        </div>

        <div className="tractor-page-header-action">
          <Button type="button" onClick={openAddForm}>
            <Plus size={17} strokeWidth={1.9} />
            Add Tractor
          </Button>
        </div>
      </div>

      {/* ---- Summary ---- */}

      <section
        className="tractor-summary-grid"
        aria-label="Tractor summary"
      >
        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <TractorIcon size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Total Tractors</span>
            <strong>{summary.total}</strong>
            <small>{summary.active} active · {summary.inactive} inactive</small>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <Activity size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Total Trips</span>
            <strong>{summary.totalTrips}</strong>
            <small>Loading {summary.loadingTrips} · Unloading {summary.unloadingTrips} · Site to Site {summary.siteToSiteTrips}</small>
          </div>
        </Card>

        <Card className="tractor-summary-card tractor-summary-finance">
          <div className="tractor-summary-icon">
            <IndianRupee size={18} strokeWidth={1.8} />
          </div>
          <div>
            <span>Total Billing</span>
            <strong>
              {formatCurrency(summary.totalBilling)}
            </strong>
            <small>Across all saved trips</small>
          </div>
        </Card>
      </section>

      {/* ---- Form ---- */}

      {showForm && (
        <Card className="tractor-form-card">
          <TractorForm
            initialValue={editingTractor}
            staffOptions={Array.isArray(staff) ? staff : EMPTY_ARRAY}
            onCancel={closeForm}
            onSave={saveTractor}
            externalError={formError}
            saving={saving}
          />
        </Card>
      )}

      {/* ---- Toolbar ---- */}

      <Card className="tractor-toolbar-card">
        <div className="tractor-toolbar">
          <div className="tractor-search">
            <Search size={17} strokeWidth={1.8} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search vehicle, driver or model..."
              aria-label="Search tractors"
            />
          </div>

          <div className="tractor-toolbar-actions">
            <div className="tractor-filter-tabs">
              <button
                type="button"
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>

              <button
                type="button"
                className={
                  statusFilter === "active" ? "active" : ""
                }
                onClick={() => setStatusFilter("active")}
              >
                Active
              </button>

              <button
                type="button"
                className={
                  statusFilter === "inactive" ? "active" : ""
                }
                onClick={() => setStatusFilter("inactive")}
              >
                Inactive
              </button>
            </div>

            <label className="tractor-sort">
              <span>Sort</span>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
              >
                <option value="vehicle">Vehicle</option>
                <option value="trips">Most Trips</option>
                <option value="billing">Highest Billing</option>
                <option value="quantity">Highest Quantity</option>
              </select>
            </label>

            <button
              type="button"
              className="tractor-export-btn"
              onClick={handleExportCSV}
              title="Export as CSV"
              aria-label="Export tractor list as CSV"
            >
              <FileBarChart size={15} />
              Export
            </button>
          </div>
        </div>
      </Card>

      {/* ---- Table ---- */}

      <Card className="tractor-table-card">
        <div className="tractor-table-header">
          <div>
            <span>TRACTOR REGISTER</span>
            <strong>All Tractors</strong>
          </div>

          <small>
            {filteredTractors.length} of {safeTractors.length}
          </small>
        </div>

        {filteredTractors.length === 0 ? (
          <div className="tractor-empty-state">
            <div className="tractor-empty-icon">
              <TractorIcon size={22} strokeWidth={1.7} />
            </div>

            <h3>
              {safeTractors.length === 0
                ? "No tractors added yet"
                : "No tractors found"}
            </h3>

            <p>
              {safeTractors.length === 0
                ? "Add your first tractor to start managing vehicle-wise trips."
                : "Try changing the search or status filter."}
            </p>

            {safeTractors.length === 0 && (
              <Button type="button" onClick={openAddForm}>
                <Plus size={16} strokeWidth={1.9} />
                Add First Tractor
              </Button>
            )}
          </div>
        ) : (
          <div className="tractor-table-wrap">
            <table className="tractor-table">
              <thead>
                <tr>
                  <th>TRACTOR</th>
                  <th>DRIVER</th>
                  <th>TRIPS</th>
                  <th>ACTIVITY</th>
                  <th>BILLING</th>
                  <th>STATUS</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredTractors.map((tractor) => {
                  const stats = getStats(tractor);

                  return (
                    <tr key={tractor?.id}>
                      <td data-label="Tractor">
                        <button
                          type="button"
                          className="tractor-identity"
                          onClick={() =>
                            setSelectedTractor(tractor)
                          }
                        >
                          <span className="tractor-avatar">
                            {getInitials(
                              tractor?.tractorName ||
                                tractor?.vehicleNumber,
                            )}
                          </span>

                          <span>
                            <strong>
                              {tractor?.vehicleNumber ||
                                "No vehicle number"}
                            </strong>

                            <small>
                              {tractor?.tractorName ||
                                tractor?.model ||
                                "Tractor"}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td data-label="Driver">
                        <div className="tractor-driver-cell">
                          <strong>
                            {tractor?.driverName ||
                              "Not assigned"}
                          </strong>

                          <small>
                            {tractor?.driverMobile ||
                              "No mobile"}
                          </small>
                        </div>
                      </td>

                      <td data-label="Trips">
                        <strong className="tractor-number">
                          {stats.totalTrips}
                        </strong>
                      </td>

                      <td data-label="Activity">
                        <div className="tractor-activity">
                          <span title="Loading">
                            L {stats.loading}
                          </span>
                          <span title="Unloading">
                            U {stats.unloading}
                          </span>
                          <span title="Site to Site">
                            S {stats.siteToSite}
                          </span>
                        </div>
                      </td>

                      <td data-label="Billing">
                        <strong className="tractor-billing">
                          {formatCurrency(stats.billing)}
                        </strong>
                      </td>

                      <td data-label="Status">
                        <StatusBadge
                          status={tractor?.status || "active"}
                          label={
                            normalize(tractor?.status) ===
                            "inactive"
                              ? "Inactive"
                              : "Active"
                          }
                        />
                      </td>

                      <td data-label="Actions">
                        <TractorRowActions
                          tractor={tractor}
                          onView={(t) => setSelectedTractor(t)}
                          onDaily={openDailyActivity}
                          onWhatsApp={handleWhatsAppShare}
                          onEdit={handleEdit}
          onDelete={(t) => { setDeleteError(""); setDeleteTarget(t); }}
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

      {selectedTractor && (
        <TractorDetails
          tractor={selectedTractor}
          trips={safeTrips}
          onClose={() => setSelectedTractor(null)}
          onEdit={handleEdit}
          onWhatsAppShare={handleWhatsAppShare}
          onAddTrip={startTripForTractor}
          initialDate={dailyDate}
        />
      )}

      {/* ---- Delete Confirmation ---- */}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive tractor?"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${
                deleteTarget.vehicleNumber || "this tractor"
              } will be moved to Inactive tractors. Trip records and billing history will be kept.${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
        confirmLabel={deleting ? "Archiving..." : "Archive Tractor"}
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

export default TractorManagement;
