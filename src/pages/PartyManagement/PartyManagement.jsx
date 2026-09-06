import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleUserRound,
  Edit3,
  IndianRupee,
  MoreVertical,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  CalendarDays,
  Truck,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
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
import { formatCurrency } from "../../utils/currency";
import { formatDate, getTodayISO } from "../../utils/date";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import "./PartyManagement.css";

const EMPTY_FORM = {
  partyName: "",
  partyCode: "",
  contact: "",
  address: "",
  siteInfo: "",
  paymentQr: "",
  status: "active",
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createId() {
  return `PTY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPartyName(trip) {
  return String(
    trip?.partyName ??
      trip?.party ??
      trip?.party_name ??
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

function getPaymentPartyName(payment) {
  return String(
    payment?.partyName ??
      payment?.party ??
      payment?.party_name ??
      "",
  ).trim();
}

function getPaymentAmount(payment) {
  const amount = Number(
    payment?.amount ??
      payment?.received ??
      payment?.paymentAmount ??
      0,
  );

  return Number.isFinite(amount) && amount > 0 ? amount : 0;
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

function getPartyStats(party, trips, payments) {
  const partyName = normalize(party?.partyName);

  const partyTrips = trips.filter(
    (trip) => normalize(getPartyName(trip)) === partyName,
  );

  const partyPayments = payments.filter(
    (payment) =>
      normalize(getPaymentPartyName(payment)) === partyName,
  );

  const billing = partyTrips.reduce(
    (sum, trip) => sum + getTripAmount(trip),
    0,
  );

  const received = partyPayments.reduce(
    (sum, payment) => sum + getPaymentAmount(payment),
    0,
  );

  return {
    trips: partyTrips.length,
    billing,
    received,
    outstanding: Math.max(0, billing - received),
  };
}

function PartyForm({ initialValue, onCancel, onSave }) {
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

    onSave({
      ...form,
      partyName,
      partyCode: form.partyCode.trim(),
      contact,
      address: form.address.trim(),
      siteInfo: form.siteInfo.trim(),
      paymentQr: form.paymentQr.trim(),
      status: form.status || "active",
    });
  };

  return (
    <div className="party-form-wrap">
      <div className="party-form-header">
        <div>
          <span className="party-form-eyebrow">
            {initialValue ? "EDIT PARTY" : "NEW PARTY"}
          </span>

          <h3>
            {initialValue ? "Update Party" : "Add Party"}
          </h3>

          <p>
            Keep customer, site and payment information organized.
          </p>
        </div>

        <button
          type="button"
          className="party-form-close"
          onClick={onCancel}
          aria-label="Close form"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="party-form">
        {error && (
          <div className="party-form-error" role="alert">
            {error}
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
              maxLength={10}
              autoComplete="tel"
            />
          </label>

          <label className="party-field">
            <span>Site Information</span>
            <input
              name="siteInfo"
              value={form.siteInfo}
              onChange={handleChange}
              placeholder="Main site / work location"
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
            />
          </label>

          <label className="party-field party-field-full">
            <span>Payment / QR Information</span>
            <input
              name="paymentQr"
              value={form.paymentQr}
              onChange={handleChange}
              placeholder="UPI ID or payment information"
            />
          </label>

          <label className="party-field">
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

        <div className="party-form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button type="submit">
            {initialValue ? "Update Party" : "Save Party"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PartyDetails({
  party,
  trips,
  payments,
  onClose,
  onEdit,
}) {
  const today = getTodayISO();
  const [selectedDate, setSelectedDate] = useState(today);

  const stats = useMemo(
    () => getPartyStats(party, trips, payments),
    [party, trips, payments],
  );

  const partyName = normalize(party?.partyName);

  const partyTrips = useMemo(() => {
    return trips.filter(
      (trip) => normalize(getPartyName(trip)) === partyName,
    );
  }, [trips, partyName]);

  // Filter trips by selected date
  const dateTrips = useMemo(() => {
    return partyTrips.filter((trip) => {
      const tripDate = trip?.date || trip?.createdAt?.split('T')[0] || "";
      return tripDate === selectedDate;
    });
  }, [partyTrips, selectedDate]);

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

  const history = useMemo(() => {
    const tripHistory = partyTrips
      .map((trip, index) => ({
        id: trip?.id || `trip-${index}`,
        date: trip?.date,
        type: trip?.tripType || trip?.type || "Trip",
        amount: getTripAmount(trip),
        label: "Trip",
        description:
          trip?.material ||
          trip?.site ||
          trip?.location ||
          "Transport trip",
      }));

    const paymentHistory = payments
      .filter(
        (payment) =>
          normalize(getPaymentPartyName(payment)) ===
          partyName,
      )
      .map((payment, index) => ({
        id:
          payment?.id ||
          payment?._id ||
          `payment-${index}`,
        date: payment?.date,
        type: "Payment",
        amount: getPaymentAmount(payment),
        label: "Received",
        description:
          payment?.paymentMode ||
          payment?.mode ||
          "Payment received",
      }));

    return [...tripHistory, ...paymentHistory]
      .sort((a, b) => {
        const dateA = new Date(a?.date || 0).getTime();
        const dateB = new Date(b?.date || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 10);
  }, [party, trips, payments, partyName]);

  return (
    <div className="party-details-overlay">
      <div
        className="party-details-backdrop"
        onClick={onClose}
      />

      <aside
        className="party-details-drawer"
        aria-label="Party details"
      >
        <div className="party-details-header">
          <div>
            <span className="party-details-eyebrow">
              PARTY ACCOUNT
            </span>

            <h2>
              {party?.partyName || "Party Details"}
            </h2>
          </div>

          <button
            type="button"
            className="party-details-close"
            onClick={onClose}
            aria-label="Close party details"
          >
            <X size={19} strokeWidth={1.8} />
          </button>
        </div>

        <div className="party-details-body">
          <div className="party-profile">
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

            <StatusBadge
              status={party?.status || "active"}
              label={
                normalize(party?.status) === "inactive"
                  ? "Inactive"
                  : "Active"
              }
            />
          </div>

          <div className="party-info-card">
            <div className="party-info-icon">
              <MapPin size={18} strokeWidth={1.8} />
            </div>

            <div>
              <span>Site / Address</span>

              <strong>
                {party?.siteInfo || "Site not specified"}
              </strong>

              <small>
                {party?.address || "Address not specified"}
              </small>
            </div>
          </div>

          <div className="party-detail-stats">
            <div>
              <span>Total Trips</span>
              <strong>{stats.trips}</strong>
            </div>

            <div>
              <span>Billing</span>
              <strong>
                {formatCurrency(stats.billing)}
              </strong>
            </div>

            <div>
              <span>Received</span>
              <strong>
                {formatCurrency(stats.received)}
              </strong>
            </div>

            <div>
              <span>Outstanding</span>
              <strong className="party-due-value">
                {formatCurrency(stats.outstanding)}
              </strong>
            </div>
          </div>

          {/* ===================================================
              DAILY ACTIVITY SECTION
              =================================================== */}

          <div className="party-daily-activity">
            <div className="party-daily-header">
              <div className="party-daily-title">
                <CalendarDays size={17} />
                <span>Daily Activity</span>
              </div>

              <div className="party-daily-date-controls">
                <button
                  type="button"
                  className={`party-date-btn ${selectedDate === today ? 'active' : ''}`}
                  onClick={setToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="party-date-btn"
                  onClick={setYesterday}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="party-date-input"
                  aria-label="Select date"
                />
              </div>
            </div>

            <div className="party-daily-summary">
              <div className="party-daily-stat">
                <span>Trips</span>
                <strong>{dateSummary.totalTrips}</strong>
              </div>
              <div className="party-daily-stat">
                <span>Materials</span>
                <strong>{dateSummary.materials.length}</strong>
              </div>
              <div className="party-daily-stat">
                <span>Total Qty</span>
                <strong>{dateSummary.totalQuantity}</strong>
              </div>
              <div className="party-daily-stat party-daily-finance">
                <span>Billing</span>
                <strong>{formatCurrency(dateSummary.totalBilling)}</strong>
              </div>
            </div>

            {dateTrips.length === 0 ? (
              <div className="party-daily-empty">
                <Activity size={18} />
                <span>No trips on {formatDate(selectedDate)}</span>
              </div>
            ) : (
              <>
                {dateSummary.materials.length > 0 && (
                  <div className="party-daily-materials">
                    <span className="party-daily-materials-label">
                      Materials Used
                    </span>
                    <div className="party-daily-material-tags">
                      {dateSummary.materials.map(({ name, qty }) => (
                        <span key={name} className="party-daily-material-tag">
                          {name} <small>{qty} qty</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="party-daily-trip-list">
                  <div className="party-daily-trip-header">
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
                      <div key={trip?.id || idx} className="party-daily-trip-row">
                        <span className="party-daily-trip-time">
                          {formatDate(time, { timeOnly: true }) || "N/A"}
                        </span>
                        <span className="party-daily-trip-material">
                          {material}
                          <StatusBadge status={type} label={type} size="small" />
                        </span>
                        <span className="party-daily-trip-qty">{qty}</span>
                        <span className="party-daily-trip-amount">
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

          <div className="party-payment-info">
            <span>PAYMENT INFORMATION</span>

            <strong>
              {party?.paymentQr ||
                "No payment information added"}
            </strong>
          </div>

          <div className="party-history-section">
            <div className="party-history-title">
              <div>
                <span>RECENT ACTIVITY</span>
                <strong>Party History</strong>
              </div>

              <span>{history.length} records</span>
            </div>

            {history.length === 0 ? (
              <div className="party-history-empty">
                <Activity
                  size={18}
                  strokeWidth={1.8}
                />

                <span>
                  No party history available.
                </span>
              </div>
            ) : (
              <div className="party-history-list">
                {history.map((item) => (
                  <div
                    className="party-history-item"
                    key={item.id}
                  >
                    <div className="party-history-date">
                      <strong>
                        {formatDate(item.date)}
                      </strong>

                      <span>
                        {item.description}
                      </span>
                    </div>

                    <div className="party-history-type">
                      <StatusBadge
                        status={
                          item.label === "Received"
                            ? "paid"
                            : item.type
                        }
                        label={item.label}
                      />
                    </div>

                    <div
                      className={
                        item.label === "Received"
                          ? "party-history-amount received"
                          : "party-history-amount"
                      }
                    >
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            onClick={() => onEdit(party)}
          >
            <Edit3 size={16} strokeWidth={1.8} />
            Edit Party
          </Button>
        </div>
      </aside>
    </div>
  );
}

function PartyManagement({ onViewParty }) {
  const {
    parties = [],
    trips = [],
    payments = [],
    refreshData,
  } = useAppData();

  const safeParties = Array.isArray(parties)
    ? parties
    : [];

  const safeTrips = Array.isArray(trips)
    ? trips
    : [];

  const safePayments = Array.isArray(payments)
    ? payments
    : [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const summary = useMemo(() => {
    const total = safeParties.length;

    const active = safeParties.filter(
      (party) =>
        normalize(party?.status) !== "inactive",
    ).length;

    const inactive = safeParties.filter(
      (party) =>
        normalize(party?.status) === "inactive",
    ).length;

    const totalBilling = calculateTotalBilling(
      safeTrips,
    );

    const totalReceived = calculateTotalReceived(
      safePayments,
    );

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

  const filteredParties = useMemo(() => {
    const query = normalize(search);

    const result = safeParties.filter((party) => {
      const matchesSearch =
        !query ||
        normalize(party?.partyName).includes(query) ||
        normalize(party?.partyCode).includes(query) ||
        normalize(party?.contact).includes(query) ||
        normalize(party?.address).includes(query) ||
        normalize(party?.siteInfo).includes(query);

      const partyStatus =
        normalize(party?.status) === "inactive"
          ? "inactive"
          : "active";

      const matchesStatus =
        statusFilter === "all" ||
        partyStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      const statsA = getPartyStats(
        a,
        safeTrips,
        safePayments,
      );

      const statsB = getPartyStats(
        b,
        safeTrips,
        safePayments,
      );

      if (sortBy === "trips") {
        return statsB.trips - statsA.trips;
      }

      if (sortBy === "billing") {
        return statsB.billing - statsA.billing;
      }

      if (sortBy === "received") {
        return statsB.received - statsA.received;
      }

      if (sortBy === "outstanding") {
        return statsB.outstanding - statsA.outstanding;
      }

      return String(a?.partyName || "").localeCompare(
        String(b?.partyName || ""),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      );
    });
  }, [
    safeParties,
    safeTrips,
    safePayments,
    search,
    statusFilter,
    sortBy,
  ]);

  const saveParty = (formData) => {
    const existingParties = readStorage(
      STORAGE_KEYS.parties,
      [],
    );

    const list = Array.isArray(existingParties)
      ? existingParties
      : [];

    const normalizedName = normalize(
      formData.partyName,
    );

    const duplicate = list.find(
      (party) =>
        normalize(party?.partyName) === normalizedName &&
        party?.id !== formData?.id,
    );

    if (duplicate) {
      window.alert(
        "This party name is already registered.",
      );
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

      writeStorage(
        STORAGE_KEYS.parties,
        updatedList,
      );
    } else {
      const newParty = {
        ...formData,
        id: createId(),
        createdAt: now,
        updatedAt: now,
      };

      writeStorage(STORAGE_KEYS.parties, [
        ...list,
        newParty,
      ]);
    }

    refreshData?.();

    setShowForm(false);
    setEditingParty(null);
  };

  const handleEdit = (party) => {
    setSelectedParty(null);
    setEditingParty(party);
    setShowForm(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    const existingParties = readStorage(
      STORAGE_KEYS.parties,
      [],
    );

    const list = Array.isArray(existingParties)
      ? existingParties
      : [];

    const updatedList = list.filter(
      (party) =>
        party?.id !== deleteTarget?.id,
    );

    writeStorage(
      STORAGE_KEYS.parties,
      updatedList,
    );

    refreshData?.();

    if (
      selectedParty?.id &&
      selectedParty.id === deleteTarget.id
    ) {
      setSelectedParty(null);
    }

    setDeleteTarget(null);
  };

  const openAddForm = () => {
    setEditingParty(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingParty(null);
  };

  const openPartyDetails = (party) => {
    setSelectedParty(party);

    if (onViewParty) {
      onViewParty(party);
    }
  };

  return (
    <div className="party-management-page">
      <div className="party-page-header">
        <div>
          <span className="party-page-eyebrow">
            CUSTOMER MANAGEMENT
          </span>

          <h2>Party Management</h2>

          <p>
            Manage customers, trip activity, billing,
            payments and outstanding balances.
          </p>
        </div>

        <Button
          type="button"
          onClick={openAddForm}
        >
          <Plus size={17} strokeWidth={1.9} />
          Add Party
        </Button>
      </div>

      <section
        className="party-summary-grid"
        aria-label="Party summary"
      >
        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <Users
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Total Parties</span>
            <strong>{summary.total}</strong>
          </div>
        </Card>

        <Card className="party-summary-card">
          <div className="party-summary-icon">
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

        <Card className="party-summary-card">
          <div className="party-summary-icon">
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

        <Card className="party-summary-card">
          <div className="party-summary-icon">
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

        <Card className="party-summary-card">
          <div className="party-summary-icon">
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

        <Card className="party-summary-card">
          <div className="party-summary-icon">
            <IndianRupee
              size={18}
              strokeWidth={1.8}
            />
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
            <IndianRupee
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Outstanding</span>
            <strong>
              {formatCurrency(summary.outstanding)}
            </strong>
          </div>
        </Card>
      </section>

      {showForm && (
        <Card className="party-form-card">
          <PartyForm
            initialValue={editingParty}
            onCancel={closeForm}
            onSave={saveParty}
          />
        </Card>
      )}

      <Card className="party-toolbar-card">
        <div className="party-toolbar">
          <div className="party-search">
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
              placeholder="Search party, code, contact or site..."
              aria-label="Search parties"
            />
          </div>

          <div className="party-filter-tabs">
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

          <label className="party-sort">
            <span>Sort</span>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
            >
              <option value="name">
                Party Name
              </option>

              <option value="trips">
                Most Trips
              </option>

              <option value="billing">
                Highest Billing
              </option>

              <option value="received">
                Highest Received
              </option>

              <option value="outstanding">
                Highest Outstanding
              </option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="party-table-card">
        <div className="party-table-header">
          <div>
            <span>PARTY REGISTER</span>
            <strong>All Parties</strong>
          </div>

          <small>
            {filteredParties.length} of{" "}
            {safeParties.length}
          </small>
        </div>

        {filteredParties.length === 0 ? (
          <div className="party-empty-state">
            <div className="party-empty-icon">
              <Users
                size={22}
                strokeWidth={1.7}
              />
            </div>

            <h3>
              {safeParties.length === 0
                ? "No parties added yet"
                : "No parties found"}
            </h3>

            <p>
              {safeParties.length === 0
                ? "Add your first customer to start managing party-wise business."
                : "Try changing the search or status filter."}
            </p>

            {safeParties.length === 0 && (
              <Button
                type="button"
                onClick={openAddForm}
              >
                <Plus
                  size={16}
                  strokeWidth={1.9}
                />
                Add First Party
              </Button>
            )}
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
                  const stats = getPartyStats(
                    party,
                    safeTrips,
                    safePayments,
                  );

                  return (
                    <tr key={party?.id}>
                      <td>
                        <button
                          type="button"
                          className="party-identity"
                          onClick={() =>
                            openPartyDetails(party)
                          }
                        >
                          <span className="party-avatar">
                            {getInitials(
                              party?.partyName,
                            )}
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

                      <td>
                        <div className="party-contact-cell">
                          <strong>
                            {party?.contact ||
                              "Not provided"}
                          </strong>

                          <small>
                            {party?.siteInfo ||
                              party?.address ||
                              "No site information"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <strong className="party-number">
                          {stats.trips}
                        </strong>
                      </td>

                      <td>
                        <strong className="party-money">
                          {formatCurrency(
                            stats.billing,
                          )}
                        </strong>
                      </td>

                      <td>
                        <strong className="party-money">
                          {formatCurrency(
                            stats.received,
                          )}
                        </strong>
                      </td>

                      <td>
                        <strong
                          className={
                            stats.outstanding > 0
                              ? "party-money party-money-due"
                              : "party-money"
                          }
                        >
                          {formatCurrency(
                            stats.outstanding,
                          )}
                        </strong>
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            party?.status ||
                            "active"
                          }
                          label={
                            normalize(
                              party?.status,
                            ) === "inactive"
                              ? "Inactive"
                              : "Active"
                          }
                        />
                      </td>

                      <td>
                        <div className="party-row-actions">
                          <button
                            type="button"
                            title="View details"
                            aria-label={`View ${party?.partyName || "party"} details`}
                            onClick={() =>
                              openPartyDetails(
                                party,
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
                            title="Edit party"
                            aria-label={`Edit ${party?.partyName || "party"}`}
                            onClick={() =>
                              handleEdit(party)
                            }
                          >
                            <Edit3
                              size={16}
                              strokeWidth={1.8}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete party"
                            aria-label={`Delete ${party?.partyName || "party"}`}
                            onClick={() =>
                              setDeleteTarget(
                                party,
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

      {selectedParty && (
        <PartyDetails
          party={selectedParty}
          trips={safeTrips}
          payments={safePayments}
          onClose={() =>
            setSelectedParty(null)
          }
          onEdit={handleEdit}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete party?"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.partyName || "this party"}? Existing trip and payment records will not be deleted.`
            : ""
        }
        confirmLabel="Delete Party"
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

export default PartyManagement;