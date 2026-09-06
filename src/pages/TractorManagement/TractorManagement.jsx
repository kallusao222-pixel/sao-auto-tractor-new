import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  CircleUserRound,
  Edit3,
  IndianRupee,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Tractor as TractorIcon,
  Truck,
  X,
  MessageCircle,
  FileBarChart,
  Clock3,
  AlertTriangle,
  CalendarDays,
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

const EMPTY_FORM = {
  vehicleNumber: "",
  tractorName: "",
  model: "",
  driverName: "",
  driverMobile: "",
  status: "active",
};

const TRIP_TYPES = ["Loading", "Unloading", "Site to Site"];

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
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
  return trip?.materialName || trip?.material || trip?.product || "Unknown";
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

function getTractorStats(tractor, trips) {
  const vehicleNumber = normalize(tractor?.vehicleNumber);

  const tractorTrips = trips.filter(
    (trip) => normalize(getVehicleNumber(trip)) === vehicleNumber,
  );

  let loading = 0;
  let unloading = 0;
  let siteToSite = 0;
  let quantity = 0;
  let billing = 0;

  tractorTrips.forEach((trip) => {
    const type = getTripType(trip);

    if (type === "Loading") loading += 1;
    if (type === "Unloading") unloading += 1;
    if (type === "Site to Site") siteToSite += 1;

    quantity += getTripQuantity(trip);
    billing += getTripAmount(trip);
  });

  return {
    records: tractorTrips.length,
    totalTrips: tractorTrips.length,
    loading,
    unloading,
    siteToSite,
    quantity,
    billing,
    latestTrip: getLatestTrip(tractorTrips),
  };
}

function getLastTripDate(tractor, trips) {
  const vehicleNumber = normalize(tractor?.vehicleNumber);
  const tractorTrips = trips.filter(
    (trip) => normalize(getVehicleNumber(trip)) === vehicleNumber,
  );

  if (tractorTrips.length === 0) return null;

  const sorted = [...tractorTrips].sort((a, b) => {
    const dateA = new Date(a?.date ?? a?.createdAt ?? 0).getTime();
    const dateB = new Date(b?.date ?? b?.createdAt ?? 0).getTime();
    return dateB - dateA;
  });

  return sorted[0]?.date || sorted[0]?.createdAt || null;
}

function TractorForm({ initialValue, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initialValue || {}),
  }));

  const [error, setError] = useState("");

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

  return (
    <div className="tractor-form-wrap">
      <div className="tractor-form-header">
        <div>
          <span className="tractor-form-eyebrow">
            {initialValue ? "EDIT TRACTOR" : "NEW TRACTOR"}
          </span>

          <h3>
            {initialValue ? "Update Tractor" : "Add Tractor"}
          </h3>

          <p>
            Keep vehicle and driver information ready for trip management.
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
        {error && (
          <div className="tractor-form-error" role="alert">
            {error}
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
        </div>

        <div className="tractor-form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button type="submit">
            {initialValue ? "Update Tractor" : "Save Tractor"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function TractorDetails({ tractor, trips, onClose, onEdit, onWhatsAppShare, initialDate }) {
  const today = getTodayISO();
  const [selectedDate, setSelectedDate] = useState(initialDate || today);

  // Get trips for this tractor
  const vehicleNumber = normalize(tractor?.vehicleNumber);
  const tractorTrips = useMemo(() => {
    return trips.filter(
      (trip) => normalize(getVehicleNumber(trip)) === vehicleNumber,
    );
  }, [trips, vehicleNumber]);

  // Filter trips by selected date
  const dateTrips = useMemo(() => {
    return tractorTrips.filter((trip) => {
      const tripDate = trip?.date || trip?.createdAt?.split('T')[0] || "";
      return tripDate === selectedDate;
    });
  }, [tractorTrips, selectedDate]);

  // Summary for selected date
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
        materialMap.set(material, (materialMap.get(material) || 0) + qty);
      }
    });

    return {
      totalTrips,
      totalQuantity,
      totalBilling,
      materials: Array.from(materialMap.entries()).map(([name, qty]) => ({ name, qty })),
    };
  }, [dateTrips]);

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const setToday = () => {
    setSelectedDate(today);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday.toISOString().split('T')[0]);
  };

  return (
    <div className="tractor-details-overlay">
      <div
        className="tractor-details-backdrop"
        onClick={onClose}
      />

      <aside
        className="tractor-details-drawer"
        aria-label="Tractor details"
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

              <span>
                {tractor?.model || "Model not specified"}
              </span>

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

          {/* ===================================================
              DAILY ACTIVITY SECTION - NEW
              =================================================== */}

          <div className="tractor-daily-activity">
            <div className="tractor-daily-header">
              <div className="tractor-daily-title">
                <CalendarDays size={17} />
                <span>Daily Activity</span>
              </div>

              <div className="tractor-daily-date-controls">
                <button
                  type="button"
                  className={`tractor-date-btn ${selectedDate === today ? 'active' : ''}`}
                  onClick={setToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="tractor-date-btn"
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
                <strong>{formatCurrency(dateSummary.totalBilling)}</strong>
              </div>
            </div>

            {dateTrips.length === 0 ? (
              <div className="tractor-daily-empty">
                <Activity size={18} />
                <span>No trips on {formatDate(selectedDate)}</span>
              </div>
            ) : (
              <>
                {/* Material breakdown */}
                {dateSummary.materials.length > 0 && (
                  <div className="tractor-daily-materials">
                    <span className="tractor-daily-materials-label">
                      Materials Used
                    </span>
                    <div className="tractor-daily-material-tags">
                      {dateSummary.materials.map(({ name, qty }) => (
                        <span key={name} className="tractor-daily-material-tag">
                          {name} <small>{qty} qty</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trip list */}
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
                    const time = trip?.time || trip?.createdAt || "";

                    return (
                      <div key={trip?.id || idx} className="tractor-daily-trip-row">
                        <span className="tractor-daily-trip-time">
                          {formatDate(time, { timeOnly: true }) || "N/A"}
                        </span>
                        <span className="tractor-daily-trip-material">
                          {material}
                          <StatusBadge status={type} label={type} size="small" />
                        </span>
                        <span className="tractor-daily-trip-qty">{qty}</span>
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

          {/* ===================================================
              END DAILY ACTIVITY
              =================================================== */}

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
                        trip?.id ||
                        trip?._id ||
                        `history-${index}`
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
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={() => onEdit(tractor)}
          >
            <Edit3 size={16} strokeWidth={1.8} />
            Edit Tractor
          </Button>
        </div>
      </aside>
    </div>
  );
}

function TractorManagement() {
  const {
    tractors = [],
    trips = [],
    refreshData,
  } = useAppData();

  const safeTractors = Array.isArray(tractors)
    ? tractors
    : [];

  const safeTrips = Array.isArray(trips)
    ? trips
    : [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("vehicle");

  const [showForm, setShowForm] = useState(false);
  const [editingTractor, setEditingTractor] = useState(null);
  const [selectedTractor, setSelectedTractor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dailyDate, setDailyDate] = useState(getTodayISO());

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
      loadingTrips +
      unloadingTrips +
      siteToSiteTrips;

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

  // SMART REMINDERS
  const idleTractors = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return safeTractors
      .filter((tractor) => normalize(tractor?.status) !== "inactive")
      .filter((tractor) => {
        const lastDate = getLastTripDate(tractor, safeTrips);
        if (!lastDate) return true;

        const lastTripDate = new Date(lastDate);
        return lastTripDate < sevenDaysAgo;
      });
  }, [safeTractors, safeTrips]);

  // WHATSAPP SHARE
  const handleWhatsAppShare = (tractor) => {
    const stats = getTractorStats(tractor, safeTrips);
    const message =
      `🚜 *Tractor Details*%0A%0A` +
      `📋 Vehicle: ${tractor?.vehicleNumber || 'N/A'}%0A` +
      `🚜 Name: ${tractor?.tractorName || 'N/A'}%0A` +
      `🔧 Model: ${tractor?.model || 'N/A'}%0A` +
      `👤 Driver: ${tractor?.driverName || 'Not assigned'}%0A` +
      `📱 Mobile: ${tractor?.driverMobile || 'N/A'}%0A` +
      `📊 Status: ${normalize(tractor?.status) === 'inactive' ? 'Inactive' : 'Active'}%0A` +
      `%0A` +
      `📈 *Performance*%0A` +
      `🔄 Total Trips: ${stats.totalTrips}%0A` +
      `📥 Loading: ${stats.loading}%0A` +
      `📤 Unloading: ${stats.unloading}%0A` +
      `🚚 Site to Site: ${stats.siteToSite}%0A` +
      `💰 Billing: ${formatCurrency(stats.billing)}%0A%0A` +
      `---%0A` +
      `SAO AUTO TRACTOR`;

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // EXPORT CSV
  const handleExportCSV = () => {
    const headers = [
      'Vehicle Number',
      'Tractor Name',
      'Model',
      'Driver Name',
      'Driver Mobile',
      'Status',
      'Total Trips',
      'Loading',
      'Unloading',
      'Site to Site',
      'Total Billing (INR)'
    ];

    const rows = filteredTractors.map((tractor) => {
      const stats = getTractorStats(tractor, safeTrips);
      return [
        tractor?.vehicleNumber || '',
        tractor?.tractorName || '',
        tractor?.model || '',
        tractor?.driverName || '',
        tractor?.driverMobile || '',
        normalize(tractor?.status) === 'inactive' ? 'Inactive' : 'Active',
        stats.totalTrips,
        stats.loading,
        stats.unloading,
        stats.siteToSite,
        stats.billing.toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tractors-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filteredTractors = useMemo(() => {
    const query = normalize(search);

    const result = safeTractors.filter((tractor) => {
      const matchesSearch =
        !query ||
        normalize(tractor?.vehicleNumber).includes(query) ||
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
      const statsA = getTractorStats(a, safeTrips);
      const statsB = getTractorStats(b, safeTrips);

      if (sortBy === "trips") {
        return statsB.totalTrips - statsA.totalTrips;
      }

      if (sortBy === "billing") {
        return statsB.billing - statsA.billing;
      }

      if (sortBy === "quantity") {
        return statsB.quantity - statsA.quantity;
      }

      return String(
        a?.vehicleNumber || "",
      ).localeCompare(
        String(b?.vehicleNumber || ""),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      );
    });
  }, [
    safeTractors,
    safeTrips,
    search,
    statusFilter,
    sortBy,
  ]);

  const saveTractor = (formData) => {
    const existingTractors = readStorage(
      STORAGE_KEYS.tractors,
      [],
    );

    const list = Array.isArray(existingTractors)
      ? existingTractors
      : [];

    const normalizedVehicle = normalize(
      formData.vehicleNumber,
    );

    const duplicate = list.find(
      (tractor) =>
        normalize(tractor?.vehicleNumber) ===
          normalizedVehicle &&
        tractor?.id !== formData?.id,
    );

    if (duplicate) {
      window.alert(
        "This vehicle number is already registered.",
      );
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

      writeStorage(
        STORAGE_KEYS.tractors,
        updatedList,
      );
    } else {
      const newTractor = {
        ...formData,
        id: createId(),
        createdAt: now,
        updatedAt: now,
      };

      writeStorage(STORAGE_KEYS.tractors, [
        ...list,
        newTractor,
      ]);
    }

    refreshData?.();

    setShowForm(false);
    setEditingTractor(null);
  };

  const handleEdit = (tractor) => {
    setSelectedTractor(null);
    setEditingTractor(tractor);
    setShowForm(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    const existingTractors = readStorage(
      STORAGE_KEYS.tractors,
      [],
    );

    const list = Array.isArray(existingTractors)
      ? existingTractors
      : [];

    const updatedList = list.filter(
      (tractor) =>
        tractor?.id !== deleteTarget?.id,
    );

    writeStorage(
      STORAGE_KEYS.tractors,
      updatedList,
    );

    refreshData?.();

    setDeleteTarget(null);

    if (
      selectedTractor?.id &&
      selectedTractor.id === deleteTarget.id
    ) {
      setSelectedTractor(null);
    }
  };

  const openAddForm = () => {
    setEditingTractor(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTractor(null);
  };

  const openDailyActivity = (tractor) => {
    setSelectedTractor(tractor);
    setDailyDate(getTodayISO());
  };

  return (
    <div className="tractor-management-page">

      {/* SMART REMINDERS */}
      {idleTractors.length > 0 && (
        <Card className="tractor-reminder-card">
          <div className="tractor-reminder-header">
            <div className="tractor-reminder-icon">
              <AlertTriangle size={17} />
            </div>
            <div>
              <span className="tractor-reminder-eyebrow">SMART REMINDER</span>
              <h4>
                {idleTractors.length} {idleTractors.length === 1 ? 'tractor' : 'tractors'} inactive for 7+ days
              </h4>
            </div>
          </div>
          <div className="tractor-reminder-list">
            {idleTractors.slice(0, 5).map((tractor) => (
              <div key={tractor.id} className="tractor-reminder-item">
                <span className="tractor-reminder-dot" />
                <strong>{tractor?.vehicleNumber || 'Unknown'}</strong>
                <span>{tractor?.driverName || 'No driver'}</span>
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

      {/* PAGE HEADER */}
      <div className="tractor-page-header">
        <div>
          <span className="tractor-page-eyebrow">
            TRANSPORT MANAGEMENT
          </span>

          <h2>Tractor Management</h2>

          <p>
            Manage tractors, drivers, trip activity and
            vehicle-wise business performance.
          </p>
        </div>

        <Button
          type="button"
          onClick={openAddForm}
        >
          <Plus size={17} strokeWidth={1.9} />
          Add Tractor
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <section
        className="tractor-summary-grid"
        aria-label="Tractor summary"
      >
        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <TractorIcon
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Total Tractors</span>
            <strong>{summary.total}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <CheckCircle2
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Active</span>
            <strong>{summary.active}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <CircleUserRound
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Inactive</span>
            <strong>{summary.inactive}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <Activity
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Total Trips</span>
            <strong>{summary.totalTrips}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <ArrowUpFromLine
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Loading</span>
            <strong>{summary.loadingTrips}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <ArrowDownToLine
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Unloading</span>
            <strong>{summary.unloadingTrips}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card">
          <div className="tractor-summary-icon">
            <Truck
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Site to Site</span>
            <strong>{summary.siteToSiteTrips}</strong>
          </div>
        </Card>

        <Card className="tractor-summary-card tractor-summary-finance">
          <div className="tractor-summary-icon">
            <IndianRupee
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Total Billing</span>

            <strong>
              {formatCurrency(summary.totalBilling)}
            </strong>
          </div>
        </Card>
      </section>

      {/* FORM */}
      {showForm && (
        <Card className="tractor-form-card">
          <TractorForm
            initialValue={editingTractor}
            onCancel={closeForm}
            onSave={saveTractor}
          />
        </Card>
      )}

      {/* TOOLBAR */}
      <Card className="tractor-toolbar-card">
        <div className="tractor-toolbar">
          <div className="tractor-search">
            <Search
              size={17}
              strokeWidth={1.8}
            />

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
                className={
                  statusFilter === "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatusFilter("all")
                }
              >
                All
              </button>

              <button
                type="button"
                className={
                  statusFilter === "active"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatusFilter("active")
                }
              >
                Active
              </button>

              <button
                type="button"
                className={
                  statusFilter === "inactive"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatusFilter("inactive")
                }
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
                <option value="vehicle">
                  Vehicle
                </option>

                <option value="trips">
                  Most Trips
                </option>

                <option value="billing">
                  Highest Billing
                </option>

                <option value="quantity">
                  Highest Quantity
                </option>
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

      {/* TABLE */}
      <Card className="tractor-table-card">
        <div className="tractor-table-header">
          <div>
            <span>TRACTOR REGISTER</span>
            <strong>All Tractors</strong>
          </div>

          <small>
            {filteredTractors.length} of{" "}
            {safeTractors.length}
          </small>
        </div>

        {filteredTractors.length === 0 ? (
          <div className="tractor-empty-state">
            <div className="tractor-empty-icon">
              <TractorIcon
                size={22}
                strokeWidth={1.7}
              />
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
              <Button
                type="button"
                onClick={openAddForm}
              >
                <Plus
                  size={16}
                  strokeWidth={1.9}
                />
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
                  const stats = getTractorStats(
                    tractor,
                    safeTrips,
                  );

                  return (
                    <tr key={tractor?.id}>
                      <td>
                        <button
                          type="button"
                          className="tractor-identity"
                          onClick={() =>
                            setSelectedTractor(
                              tractor,
                            )
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

                      <td>
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

                      <td>
                        <strong className="tractor-number">
                          {stats.totalTrips}
                        </strong>
                      </td>

                      <td>
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

                      <td>
                        <strong className="tractor-billing">
                          {formatCurrency(
                            stats.billing,
                          )}
                        </strong>
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            tractor?.status ||
                            "active"
                          }
                          label={
                            normalize(
                              tractor?.status,
                            ) === "inactive"
                              ? "Inactive"
                              : "Active"
                          }
                        />
                      </td>

                      <td>
                        <div className="tractor-row-actions">
                          <button
                            type="button"
                            title="View details"
                            aria-label={`View ${tractor?.vehicleNumber || "tractor"} details`}
                            onClick={() =>
                              setSelectedTractor(
                                tractor,
                              )
                            }
                          >
                            <MoreVertical
                              size={17}
                              strokeWidth={1.8}
                            />
                          </button>

                          <button
                            type="button"
                            title="Daily Activity"
                            aria-label={`Daily activity for ${tractor?.vehicleNumber || "tractor"}`}
                            onClick={() => openDailyActivity(tractor)}
                            className="tractor-daily-btn"
                          >
                            <CalendarDays size={16} />
                          </button>

                          <button
                            type="button"
                            title="Share on WhatsApp"
                            aria-label={`Share ${tractor?.vehicleNumber || "tractor"} on WhatsApp`}
                            onClick={() =>
                              handleWhatsAppShare(tractor)
                            }
                            className="tractor-whatsapp-row-btn"
                          >
                            <MessageCircle
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title="Edit tractor"
                            aria-label={`Edit ${tractor?.vehicleNumber || "tractor"}`}
                            onClick={() =>
                              handleEdit(tractor)
                            }
                          >
                            <Edit3
                              size={16}
                              strokeWidth={1.8}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete tractor"
                            aria-label={`Delete ${tractor?.vehicleNumber || "tractor"}`}
                            onClick={() =>
                              setDeleteTarget(
                                tractor,
                              )
                            }
                          >
                            <Trash2
                              size={16}
                              strokeWidth={1.8}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* DETAILS DRAWER */}
      {selectedTractor && (
        <TractorDetails
          tractor={selectedTractor}
          trips={safeTrips}
          onClose={() =>
            setSelectedTractor(null)
          }
          onEdit={handleEdit}
          onWhatsAppShare={handleWhatsAppShare}
          initialDate={dailyDate}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete tractor?"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${
                deleteTarget.vehicleNumber ||
                "this tractor"
              }? Existing trip records will not be deleted.`
            : ""
        }
        confirmLabel="Delete Tractor"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />
    </div>
  );
}

export default TractorManagement;