import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
  Filter,
  IndianRupee,
  Package,
  RefreshCw,
  Search,
  Truck,
  Users,
  X,
  Printer,
  Eye,
  Copy,
  MessageCircle,
  Pencil,
  Trash2,
  Save,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import "./Reports.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const PARTIES_KEY = "saoAutoTractorParties";
const TRACTORS_KEY = "saoAutoTractorTractors";

const PAGE_SIZE = 10;

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeTrips(trips) {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
  } catch {
    // ignore
  }
}

function getTripId(trip, index) {
  return trip?.id || trip?._id || trip?.tripId || `trip-${index}`;
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  const d = normalizeDate(date);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(value) {
  const d = normalizeDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(value) {
  const d = normalizeDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getToday() {
  return dateKey(new Date());
}

function getStartOfWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + diff);
  return dateKey(start);
}

function getStartOfMonth() {
  const today = new Date();
  return dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
}

function getTripDate(trip) {
  return trip?.date || trip?.tripDate || trip?.createdAt || trip?.createdDate || "";
}

function getTripType(trip) {
  const raw = String(
    trip?.tripType || trip?.workType || trip?.type || trip?.trip_type || ""
  )
    .trim()
    .toLowerCase();

  if (raw.includes("loading") || raw.includes("load") || raw === "l") return "Loading";
  if (raw.includes("unloading") || raw.includes("unload") || raw === "u") return "Unloading";
  if (raw.includes("site") || raw.includes("site-to-site") || raw.includes("site to site") || raw.includes("transport"))
    return "Site-to-Site";
  return trip?.tripType || trip?.workType || "Other";
}

function getVehicle(trip) {
  return trip?.vehicleNumber || trip?.tractorNumber || trip?.tractorNo || trip?.vehicleNo || trip?.vehicle || "—";
}

function getParty(trip) {
  return trip?.partyName || trip?.party || trip?.customerName || trip?.customer || "—";
}

function getMaterial(trip) {
  return trip?.materialName || trip?.material || trip?.productName || trip?.product || "—";
}

function getSite(trip) {
  return trip?.siteName || trip?.site || trip?.location || trip?.destination || "—";
}

function getQuantity(trip) {
  return Number(trip?.quantity ?? trip?.qty ?? trip?.loadQuantity ?? trip?.tripQuantity ?? 0) || 0;
}

function getRate(trip) {
  return Number(trip?.rate ?? trip?.price ?? trip?.tripRate ?? trip?.amountPerTrip ?? 0) || 0;
}

function getAmount(trip) {
  const directAmount = Number(trip?.amount ?? trip?.totalAmount ?? trip?.billingAmount ?? trip?.total ?? 0);
  if (Number.isFinite(directAmount) && directAmount !== 0) return directAmount;
  return getQuantity(trip) * getRate(trip);
}

function getUnit(trip) {
  return trip?.unit || trip?.quantityUnit || trip?.measurementUnit || "Unit";
}

function StatCard({ icon: Icon, label, value, detail, type = "default" }) {
  return (
    <div className={`report-stat-card report-stat-${type}`}>
      <div className="report-stat-icon">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="report-stat-content">
        <span className="report-stat-label">{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, total, amount }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="breakdown-item">
      <div className="breakdown-top">
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
      </div>
      <div className="breakdown-track">
        <div className="breakdown-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      {amount !== undefined && (
        <div className="breakdown-bottom">
          <span>{percentage.toFixed(1)}%</span>
          <span>{formatCurrency(amount)}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function DetailModal({ trip, onClose, onClone, onEdit, onDelete }) {
  if (!trip) return null;

  return (
    <div className="report-modal-backdrop" onMouseDown={onClose}>
      <div className="report-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div>
            <span className="report-modal-eyebrow">TRIP DETAILS</span>
            <h2>{getParty(trip)}</h2>
          </div>
          <button type="button" className="report-modal-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="report-modal-summary">
          <div><span>Date</span><strong>{formatLongDate(trip.date)}</strong></div>
          <div><span>Trip Type</span><strong>{getTripType(trip)}</strong></div>
          <div><span>Amount</span><strong>{formatCurrency(getAmount(trip))}</strong></div>
        </div>

        <div className="report-modal-grid">
          <div><span>Vehicle</span><strong>{getVehicle(trip)}</strong></div>
          <div><span>Tractor</span><strong>{trip?.tractorName || "—"}</strong></div>
          <div><span>Driver</span><strong>{trip?.driverName || "—"}</strong></div>
          <div><span>Driver Mobile</span><strong>{trip?.driverMobile || "—"}</strong></div>
          <div><span>Material</span><strong>{getMaterial(trip)}</strong></div>
          <div><span>Site</span><strong>{getSite(trip)}</strong></div>
          <div><span>Quantity</span><strong>{formatNumber(getQuantity(trip))} {getUnit(trip)}</strong></div>
          <div><span>Rate</span><strong>{formatCurrency(getRate(trip))}</strong></div>
        </div>

        {trip?.notes && (
          <div className="report-modal-notes">
            <span>Notes</span>
            <p>{trip.notes}</p>
          </div>
        )}

        <div className="report-modal-footer">
          <button type="button" className="report-action-btn secondary" onClick={() => onWhatsAppShare(trip)}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button type="button" className="report-action-btn secondary" onClick={() => { onClose(); onClone(trip); }}>
            <Copy size={16} /> Clone
          </button>
          <button type="button" className="report-action-btn secondary" onClick={() => { onClose(); onEdit(trip); }}>
            <Pencil size={16} /> Edit
          </button>
          <button type="button" className="report-action-btn danger" onClick={() => { onClose(); onDelete(trip); }}>
            <Trash2 size={16} /> Delete
          </button>
          <button type="button" className="report-action-btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EDIT MODAL
========================================================= */

function EditModal({ trip, onClose, onSave }) {
  const [form, setForm] = useState({
    date: "",
    vehicleNumber: "",
    partyName: "",
    materialName: "",
    driverName: "",
    tripType: "Loading",
    site: "",
    quantity: "",
    unit: "",
    rate: "",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    if (!trip) return;
    setForm({
      date: dateKey(trip?.date),
      vehicleNumber: trip?.vehicleNumber || trip?.tractorNumber || trip?.vehicleNo || trip?.vehicle || "",
      partyName: trip?.partyName || trip?.party || trip?.customerName || "",
      materialName: trip?.materialName || trip?.material || trip?.productName || trip?.product || "",
      driverName: trip?.driverName || trip?.driver || "",
      tripType: getTripType(trip) === "—" ? "Loading" : getTripType(trip),
      site: trip?.site || trip?.location || "",
      quantity: trip?.quantity !== undefined && trip?.quantity !== null ? String(trip.quantity) : "",
      unit: trip?.unit || "",
      rate: trip?.rate !== undefined && trip?.rate !== null ? String(trip.rate) : "",
      amount: trip?.amount !== undefined && trip?.amount !== null ? String(trip.amount) : "",
      notes: trip?.notes || "",
    });
  }, [trip]);

  if (!trip) return null;

  const quantity = Number(form.quantity) || 0;
  const rate = Number(form.rate) || 0;
  const calculatedAmount = quantity * rate;

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleQuantityOrRateChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      const nextQty = Number(next.quantity) || 0;
      const nextRate = Number(next.rate) || 0;
      next.amount = String(nextQty * nextRate);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date) { alert("Please select a date."); return; }
    if (!form.vehicleNumber.trim()) { alert("Please enter vehicle number."); return; }
    if (!form.partyName.trim()) { alert("Please enter party name."); return; }
    if (!form.materialName.trim()) { alert("Please enter material."); return; }
    const finalAmount = form.amount === "" ? calculatedAmount : Number(form.amount) || 0;
    onSave({
      id: trip.id,
      date: form.date,
      vehicleNumber: form.vehicleNumber.trim(),
      partyName: form.partyName.trim(),
      materialName: form.materialName.trim(),
      driverName: form.driverName.trim(),
      tripType: form.tripType,
      site: form.site.trim(),
      quantity: Number(form.quantity) || 0,
      unit: form.unit.trim(),
      rate: Number(form.rate) || 0,
      amount: finalAmount,
      notes: form.notes.trim(),
    });
  };

  return (
    <div className="report-edit-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="report-edit-header">
          <div>
            <span className="report-edit-eyebrow">EDIT TRANSPORT RECORD</span>
            <h2>Edit Record</h2>
            <p>Update this record without creating a new trip entry.</p>
          </div>
          <button type="button" className="report-edit-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="report-edit-grid">
            <label><span>Date *</span>
              <div className="report-input-wrap">
                <CalendarDays size={15} />
                <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
              </div>
            </label>
            <label><span>Vehicle / Tractor *</span>
              <div className="report-input-wrap">
                <Truck size={15} />
                <input type="text" value={form.vehicleNumber} onChange={(e) => handleChange("vehicleNumber", e.target.value)} placeholder="Vehicle number" required />
              </div>
            </label>
            <label><span>Party *</span>
              <input type="text" value={form.partyName} onChange={(e) => handleChange("partyName", e.target.value)} placeholder="Party name" required />
            </label>
            <label><span>Material *</span>
              <input type="text" value={form.materialName} onChange={(e) => handleChange("materialName", e.target.value)} placeholder="Material" required />
            </label>
            <label><span>Driver</span>
              <input type="text" value={form.driverName} onChange={(e) => handleChange("driverName", e.target.value)} placeholder="Driver name" />
            </label>
            <label><span>Trip Type</span>
              <select value={form.tripType} onChange={(e) => handleChange("tripType", e.target.value)}>
                <option value="Loading">Loading</option>
                <option value="Unloading">Unloading</option>
                <option value="Site to Site">Site to Site</option>
              </select>
            </label>
            <label className="report-edit-full"><span>Site / Location</span>
              <input type="text" value={form.site} onChange={(e) => handleChange("site", e.target.value)} placeholder="Site or location" />
            </label>
            <label><span>Quantity</span>
              <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => handleQuantityOrRateChange("quantity", e.target.value)} placeholder="0" />
            </label>
            <label><span>Unit</span>
              <input type="text" value={form.unit} onChange={(e) => handleChange("unit", e.target.value)} placeholder="Trip / Ton / CFT..." />
            </label>
            <label><span>Rate</span>
              <div className="report-input-wrap">
                <IndianRupee size={15} />
                <input type="number" min="0" step="any" value={form.rate} onChange={(e) => handleQuantityOrRateChange("rate", e.target.value)} placeholder="0" />
              </div>
            </label>
            <label><span>Amount</span>
              <div className="report-input-wrap">
                <IndianRupee size={15} />
                <input type="number" min="0" step="any" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} placeholder="0" />
              </div>
              <small className="report-edit-helper">Quantity × Rate = {formatCurrency(calculatedAmount)}</small>
            </label>
            <label className="report-edit-full"><span>Notes</span>
              <textarea rows="3" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Optional notes..." />
            </label>
          </div>
          <div className="report-edit-footer">
            <button type="button" className="report-action-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="report-action-btn primary"><Save size={16} /> Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   DELETE CONFIRM MODAL
========================================================= */

function DeleteConfirmModal({ trip, onCancel, onConfirm }) {
  if (!trip) return null;

  return (
    <div className="report-delete-backdrop" onMouseDown={onCancel}>
      <div className="report-delete-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="report-delete-icon"><Trash2 size={22} /></div>
        <div className="report-delete-content">
          <span className="report-delete-eyebrow">DELETE RECORD</span>
          <h2>Delete this transport record?</h2>
          <p>This record will be permanently removed from the transport records.</p>
        </div>
        <div className="report-delete-summary">
          <div><span>Date</span><strong>{formatDate(trip.date)}</strong></div>
          <div><span>Vehicle</span><strong>{getVehicle(trip)}</strong></div>
          <div><span>Party</span><strong>{getParty(trip)}</strong></div>
          <div><span>Trip Type</span><strong>{getTripType(trip)}</strong></div>
          <div><span>Amount</span><strong>{formatCurrency(getAmount(trip))}</strong></div>
        </div>
        <div className="report-delete-warning">
          <strong>This action cannot be undone.</strong>
          <span>Billing, reports and other calculations based on this trip may also change after deletion.</span>
        </div>
        <div className="report-delete-actions">
          <button type="button" className="report-action-btn secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="report-action-btn danger" onClick={onConfirm}><Trash2 size={16} /> Delete Record</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Reports() {
  const [trips, setTrips] = useState([]);
  const [parties, setParties] = useState([]);
  const [tractors, setTractors] = useState([]);

  const [fromDate, setFromDate] = useState(getStartOfMonth());
  const [toDate, setToDate] = useState(getToday());

  const [partyFilter, setPartyFilter] = useState("");
  const [tractorFilter, setTractorFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState("");

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState("This Month");
  const [page, setPage] = useState(1);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [deleteTrip, setDeleteTrip] = useState(null);

  const [trendMode, setTrendMode] = useState("billing");

  const loadData = () => {
    setTrips(readStorage(TRIPS_KEY));
    setParties(readStorage(PARTIES_KEY));
    setTractors(readStorage(TRACTORS_KEY));
  };

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    const handleCustom = () => loadData();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("saoAutoTractorDataChanged", handleCustom);
    const interval = window.setInterval(loadData, 1500);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("saoAutoTractorDataChanged", handleCustom);
      window.clearInterval(interval);
    };
  }, []);

  // =========================================================
  // FILTER OPTIONS
  // =========================================================

  const materialOptions = useMemo(() => {
    const values = trips.map(getMaterial).filter((v) => v && v !== "—");
    return [...new Set(values)].sort();
  }, [trips]);

  const partyOptions = useMemo(() => {
    const fromParties = parties.map(p => p?.partyName || p?.name || p?.customerName || p?.party || "").filter(Boolean);
    const fromTrips = trips.map(getParty).filter((v) => v && v !== "—");
    return [...new Set([...fromParties, ...fromTrips])].sort();
  }, [parties, trips]);

  const tractorOptions = useMemo(() => {
    const fromTractors = tractors.map(t => t?.vehicleNumber || t?.vehicleNo || t?.registrationNumber || "").filter(Boolean);
    const fromTrips = trips.map(getVehicle).filter((v) => v && v !== "—");
    return [...new Set([...fromTractors, ...fromTrips])].sort();
  }, [tractors, trips]);

  // =========================================================
  // FILTERED TRIPS
  // =========================================================

  const filteredTrips = useMemo(() => {
    const from = normalizeDate(fromDate);
    const to = normalizeDate(toDate);
    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);
    const query = search.trim().toLowerCase();

    return trips
      .filter((trip) => {
        const tripDate = normalizeDate(getTripDate(trip));
        if (!tripDate) return false;
        if (from && tripDate < from) return false;
        if (to && tripDate > to) return false;
        if (partyFilter && getParty(trip) !== partyFilter) return false;
        if (tractorFilter && getVehicle(trip) !== tractorFilter) return false;
        if (materialFilter && getMaterial(trip) !== materialFilter) return false;
        if (tripTypeFilter && getTripType(trip) !== tripTypeFilter) return false;
        if (query) {
          const searchable = [
            getParty(trip), getVehicle(trip), getMaterial(trip), getSite(trip),
            getTripType(trip), trip?.driverName, trip?.driver, trip?.notes, trip?.description
          ].filter(Boolean).join(" ").toLowerCase();
          if (!searchable.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = normalizeDate(getTripDate(a))?.getTime() || 0;
        const dateB = normalizeDate(getTripDate(b))?.getTime() || 0;
        return dateB - dateA;
      });
  }, [trips, fromDate, toDate, partyFilter, tractorFilter, materialFilter, tripTypeFilter, search]);

  useEffect(() => { setPage(1); }, [fromDate, toDate, partyFilter, tractorFilter, materialFilter, tripTypeFilter, search]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary = useMemo(() => {
    const records = filteredTrips.length;
    const loading = filteredTrips.filter((t) => getTripType(t) === "Loading").length;
    const unloading = filteredTrips.filter((t) => getTripType(t) === "Unloading").length;
    const siteToSite = filteredTrips.filter((t) => getTripType(t) === "Site-to-Site").length;
    const quantity = filteredTrips.reduce((s, t) => s + getQuantity(t), 0);
    const billing = filteredTrips.reduce((s, t) => s + getAmount(t), 0);
    const averageTripValue = records > 0 ? billing / records : 0;
    return { records, trips: records, loading, unloading, siteToSite, quantity, billing, averageTripValue };
  }, [filteredTrips]);

  // =========================================================
  // QUICK STATS
  // =========================================================

  const quickStats = useMemo(() => {
    const days = new Set(filteredTrips.map((t) => dateKey(t?.date)).filter(Boolean));
    const totalDays = days.size || 1;
    const totalBilling = filteredTrips.reduce((s, t) => s + getAmount(t), 0);
    const avgPerDay = totalBilling / totalDays;
    const dayMap = new Map();
    filteredTrips.forEach((t) => {
      const d = dateKey(t?.date);
      if (!d) return;
      if (!dayMap.has(d)) dayMap.set(d, { date: d, trips: 0, billing: 0 });
      const item = dayMap.get(d);
      item.trips += 1;
      item.billing += getAmount(t);
    });
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => b.billing - a.billing);
    const busiestDay = sortedDays.length > 0 ? sortedDays[0] : null;
    return { totalDays, avgPerDay, busiestDay };
  }, [filteredTrips]);

  // =========================================================
  // DAY-OVER-DAY COMPARISON
  // =========================================================

  const dayComparison = useMemo(() => {
    const today = getToday();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = dateKey(yesterday);

    const todayTrips = filteredTrips.filter((t) => dateKey(t?.date) === today);
    const yesterdayTrips = filteredTrips.filter((t) => dateKey(t?.date) === yDate);

    const todayBilling = todayTrips.reduce((s, t) => s + getAmount(t), 0);
    const yesterdayBilling = yesterdayTrips.reduce((s, t) => s + getAmount(t), 0);
    const todayCount = todayTrips.length;
    const yesterdayCount = yesterdayTrips.length;

    const billingChange = yesterdayBilling > 0 ? ((todayBilling - yesterdayBilling) / yesterdayBilling) * 100 : 0;
    const tripsChange = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0;

    return {
      todayBilling, yesterdayBilling, todayCount, yesterdayCount,
      billingChange: Number.isFinite(billingChange) ? billingChange : 0,
      tripsChange: Number.isFinite(tripsChange) ? tripsChange : 0,
    };
  }, [filteredTrips]);

  // =========================================================
  // TREND CHART DATA
  // =========================================================

  const trendData = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((t) => {
      const d = dateKey(t?.date);
      if (!d) return;
      if (!map.has(d)) map.set(d, { date: d, trips: 0, billing: 0 });
      const item = map.get(d);
      item.trips += 1;
      item.billing += getAmount(t);
    });
    const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    const max = sorted.length > 0 ? Math.max(...sorted.map((d) => (trendMode === "billing" ? d.billing : d.trips))) : 1;
    return { data: sorted, max: max || 1 };
  }, [filteredTrips, trendMode]);

  // =========================================================
  // TOP PERFORMERS
  // =========================================================

  const topParties = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((t) => {
      const name = getParty(t);
      if (name === "—") return;
      if (!map.has(name)) map.set(name, { name, trips: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.billing += getAmount(t);
    });
    return Array.from(map.values()).sort((a, b) => b.billing - a.billing).slice(0, 5);
  }, [filteredTrips]);

  const topTractors = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((t) => {
      const name = getVehicle(t);
      if (name === "—") return;
      if (!map.has(name)) map.set(name, { name, trips: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.billing += getAmount(t);
    });
    return Array.from(map.values()).sort((a, b) => b.billing - a.billing).slice(0, 5);
  }, [filteredTrips]);

  const topMaterials = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((t) => {
      const name = getMaterial(t);
      if (name === "—") return;
      if (!map.has(name)) map.set(name, { name, trips: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.billing += getAmount(t);
    });
    return Array.from(map.values()).sort((a, b) => b.billing - a.billing).slice(0, 5);
  }, [filteredTrips]);

  // =========================================================
  // REPORTS
  // =========================================================

  const partyReport = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const name = getParty(trip);
      if (!map.has(name)) map.set(name, { name, trips: 0, quantity: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.quantity += getQuantity(trip);
      item.billing += getAmount(trip);
    });
    return [...map.values()].sort((a, b) => b.billing - a.billing);
  }, [filteredTrips]);

  const tractorReport = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const name = getVehicle(trip);
      if (!map.has(name)) map.set(name, { name, trips: 0, quantity: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.quantity += getQuantity(trip);
      item.billing += getAmount(trip);
    });
    return [...map.values()].sort((a, b) => b.trips - a.trips);
  }, [filteredTrips]);

  const materialReport = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const name = getMaterial(trip);
      if (!map.has(name)) map.set(name, { name, trips: 0, quantity: 0, billing: 0, unit: getUnit(trip) });
      const item = map.get(name);
      item.trips += 1;
      item.quantity += getQuantity(trip);
      item.billing += getAmount(trip);
    });
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }, [filteredTrips]);

  const tripTypeReport = useMemo(() => {
    const types = ["Loading", "Unloading", "Site-to-Site", "Other"];
    return types
      .map((type) => {
        const records = filteredTrips.filter((t) => getTripType(t) === type);
        return {
          type,
          trips: records.length,
          quantity: records.reduce((s, t) => s + getQuantity(t), 0),
          billing: records.reduce((s, t) => s + getAmount(t), 0),
        };
      })
      .filter((item) => item.trips > 0);
  }, [filteredTrips]);

  const dailyReport = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const key = dateKey(getTripDate(trip));
      if (!map.has(key)) map.set(key, { date: getTripDate(trip), trips: 0, quantity: 0, billing: 0 });
      const item = map.get(key);
      item.trips += 1;
      item.quantity += getQuantity(trip);
      item.billing += getAmount(trip);
    });
    return [...map.values()].sort((a, b) => (normalizeDate(b.date)?.getTime() || 0) - (normalizeDate(a.date)?.getTime() || 0)).slice(0, 10);
  }, [filteredTrips]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE));
  const paginatedTrips = filteredTrips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters = partyFilter || tractorFilter || materialFilter || tripTypeFilter || search;

  const clearFilters = () => {
    setPartyFilter("");
    setTractorFilter("");
    setMaterialFilter("");
    setTripTypeFilter("");
    setSearch("");
    setFromDate(getStartOfMonth());
    setToDate(getToday());
    setActivePreset("This Month");
  };

  const applyPreset = (preset) => {
    const today = new Date();
    if (preset === "Today") { setFromDate(getToday()); setToDate(getToday()); }
    if (preset === "This Week") { setFromDate(getStartOfWeek()); setToDate(getToday()); }
    if (preset === "This Month") { setFromDate(getStartOfMonth()); setToDate(getToday()); }
    if (preset === "All Time") { setFromDate(""); setToDate(""); }
    setActivePreset(preset);
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const exportCSV = () => {
    if (!filteredTrips.length) return;
    const headers = ["Date", "Party", "Vehicle", "Material", "Site", "Trip Type", "Quantity", "Unit", "Rate", "Amount"];
    const rows = filteredTrips.map((trip) => [
      formatDate(getTripDate(trip)), getParty(trip), getVehicle(trip), getMaterial(trip),
      getSite(trip), getTripType(trip), getQuantity(trip), getUnit(trip), getRate(trip), getAmount(trip)
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sao-auto-tractor-report-${getToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // =========================================================
  // PDF EXPORT
  // =========================================================

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) { alert("Please allow pop-ups to export PDF."); return; }

    const companyName = "SAO AUTO TRACTOR";
    const currentDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const from = fromDate ? formatDate(fromDate) : "All";
    const to = toDate ? formatDate(toDate) : "All";

    let tableRows = paginatedTrips.map((trip) => `
      <tr>
        <td>${formatDate(getTripDate(trip))}</td>
        <td>${getParty(trip)}</td>
        <td>${getVehicle(trip)}</td>
        <td>${getMaterial(trip)}</td>
        <td>${getTripType(trip)}</td>
        <td>${formatNumber(getQuantity(trip))}</td>
        <td>${formatCurrency(getAmount(trip))}</td>
      </tr>
    `).join("");

    if (tableRows === "") {
      tableRows = `<tr><td colspan="7" style="text-align:center;padding:30px;">No records found for the selected period.</td></tr>`;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>SAO AUTO TRACTOR - Report</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #152033; background: #fff; }
            .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1b4b73; padding-bottom: 10px; margin-bottom: 20px; }
            .report-header h1 { font-size: 24px; margin: 0; color: #1b4b73; }
            .report-header .meta { font-size: 12px; color: #6d675e; text-align: right; }
            .report-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .report-summary .stat { padding: 12px; border: 1px solid #d8d3c9; border-radius: 8px; background: #faf9f5; }
            .report-summary .stat span { display: block; font-size: 10px; color: #6d675e; text-transform: uppercase; letter-spacing: 0.05em; }
            .report-summary .stat strong { display: block; font-size: 20px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #f3efe6; padding: 10px 8px; border: 1px solid #d8d3c9; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 8px; border: 1px solid #d8d3c9; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d8d3c9; font-size: 10px; color: #6d675e; display: flex; justify-content: space-between; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>${companyName}</h1>
            <div class="meta"><strong>Transport Report</strong><br />Period: ${from} - ${to}<br />Generated: ${currentDate}</div>
          </div>
          <div class="report-summary">
            <div class="stat"><span>Total Records</span><strong>${formatNumber(summary.records)}</strong></div>
            <div class="stat"><span>Total Trips</span><strong>${formatNumber(summary.trips)}</strong></div>
            <div class="stat"><span>Total Quantity</span><strong>${formatNumber(summary.quantity)}</strong></div>
            <div class="stat"><span>Total Billing</span><strong>${formatCurrency(summary.billing)}</strong></div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Party</th><th>Vehicle</th><th>Material</th><th>Trip Type</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer"><span>${companyName} - Transport Management System</span><span>Page 1 of 1</span></div>
          <script>
            window.onload = function() { window.focus(); window.print(); };
            window.onafterprint = function() { window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // =========================================================
  // CLONE TRIP
  // =========================================================

  const cloneTrip = (trip) => {
    const currentTrips = readStorage(TRIPS_KEY);
    const newTrip = {
      ...trip,
      id: undefined,
      _id: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: getToday(),
    };
    delete newTrip.__id;
    const updatedTrips = [newTrip, ...currentTrips];
    writeTrips(updatedTrips);
    loadData();
  };

  // =========================================================
  // WHATSAPP SHARE
  // =========================================================

  const shareWhatsApp = (trip) => {
    const message =
      `🚜 *Trip Details*%0A` +
      `📅 Date: ${formatLongDate(trip?.date)}%0A` +
      `🚜 Vehicle: ${getVehicle(trip)}%0A` +
      `👤 Party: ${getParty(trip)}%0A` +
      `📦 Material: ${getMaterial(trip)}%0A` +
      `📋 Type: ${getTripType(trip)}%0A` +
      `📍 Site: ${getSite(trip)}%0A` +
      `📊 Qty: ${formatNumber(getQuantity(trip))} ${getUnit(trip)}%0A` +
      `💰 Amount: ${formatCurrency(getAmount(trip))}%0A%0A` +
      `---%0A` +
      `SAO AUTO TRACTOR`;
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  // =========================================================
  // EDIT
  // =========================================================

  const openEdit = (trip) => {
    setEditTrip(trip);
    if (selectedTrip) setSelectedTrip(null);
  };

  const saveEdit = (updatedTrip) => {
    const currentTrips = readStorage(TRIPS_KEY);
    const index = currentTrips.findIndex((t) => t?.id === updatedTrip?.id);
    if (index === -1) { alert("Trip not found. Please refresh."); setEditTrip(null); return; }
    const newTrips = [...currentTrips];
    newTrips[index] = { ...newTrips[index], ...updatedTrip, updatedAt: new Date().toISOString() };
    writeTrips(newTrips);
    loadData();
    setEditTrip(null);
  };

  // =========================================================
  // DELETE
  // =========================================================

  const requestDelete = (trip) => {
    setDeleteTrip(trip);
    if (selectedTrip) setSelectedTrip(null);
  };

  const confirmDelete = () => {
    if (!deleteTrip) return;
    const currentTrips = readStorage(TRIPS_KEY);
    const updatedTrips = currentTrips.filter((t) => t?.id !== deleteTrip?.id);
    writeTrips(updatedTrips);
    loadData();
    setDeleteTrip(null);
  };

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div className="reports-header-copy">
          <div className="reports-eyebrow">
            <FileBarChart size={15} />
            BUSINESS REPORTS
          </div>
          <h1>Reports</h1>
          <p>Analyse transport activity, billing, tractors, parties and materials from one place.</p>
        </div>
        <div className="reports-header-actions">
          <button className="report-action secondary" onClick={loadData} title="Refresh">
            <RefreshCw size={17} /> <span>Refresh</span>
          </button>
          <button className="report-action secondary" onClick={handleExportPDF} disabled={!filteredTrips.length}>
            <Printer size={17} /> <span>PDF</span>
          </button>
          <button className="report-action primary" onClick={exportCSV} disabled={!filteredTrips.length}>
            <Download size={17} /> <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* =====================================================
          QUICK STATS
      ===================================================== */}

      <section className="report-quick-stats">
        <div className="report-quick-stat">
          <span>Total Records</span>
          <strong>{summary.records}</strong>
          <small>{quickStats.totalDays} days</small>
        </div>
        <div className="report-quick-stat">
          <span>Total Billing</span>
          <strong>{formatCurrency(summary.billing)}</strong>
          <small>Avg. {formatCurrency(quickStats.avgPerDay)} / day</small>
        </div>
        <div className="report-quick-stat">
          <span>Busiest Day</span>
          <strong>{quickStats.busiestDay ? formatCurrency(quickStats.busiestDay.billing) : "—"}</strong>
          <small>{quickStats.busiestDay ? formatLongDate(quickStats.busiestDay.date) : "No data"}</small>
        </div>
        <div className="report-quick-stat report-compare">
          <span>Today vs Yesterday</span>
          <div className="report-compare-values">
            <div><span>Today</span><strong>{formatCurrency(dayComparison.todayBilling)}</strong></div>
            <div className="report-compare-arrow">
              {dayComparison.billingChange > 0 ? <TrendingUp size={16} className="trend-up" /> :
               dayComparison.billingChange < 0 ? <TrendingDown size={16} className="trend-down" /> :
               <span className="trend-flat">—</span>}
              <span className={dayComparison.billingChange >= 0 ? "trend-up" : "trend-down"}>
                {Math.abs(dayComparison.billingChange).toFixed(1)}%
              </span>
            </div>
            <div><span>Yesterday</span><strong>{formatCurrency(dayComparison.yesterdayBilling)}</strong></div>
          </div>
        </div>
      </section>

      {/* =====================================================
          TREND CHART
      ===================================================== */}

      <section className="report-trend-section">
        <div className="report-trend-header">
          <div><span>TREND</span><h2>Activity Trend</h2></div>
          <div className="report-trend-controls">
            <button className={trendMode === "billing" ? "active" : ""} onClick={() => setTrendMode("billing")}>Billing</button>
            <button className={trendMode === "trips" ? "active" : ""} onClick={() => setTrendMode("trips")}>Trips</button>
          </div>
        </div>
        <div className="report-trend-chart">
          {trendData.data.length === 0 ? (
            <div className="report-trend-empty">No data for the selected period</div>
          ) : (
            <div className="report-trend-bars">
              {trendData.data.map((item) => {
                const value = trendMode === "billing" ? item.billing : item.trips;
                const height = trendData.max > 0 ? (value / trendData.max) * 100 : 0;
                return (
                  <div key={item.date} className="report-trend-bar-wrapper">
                    <div className="report-trend-bar-value">{trendMode === "billing" ? formatCurrency(value) : value}</div>
                    <div className="report-trend-bar-track">
                      <div className="report-trend-bar" style={{ height: `${Math.max(height, 4)}%` }} />
                    </div>
                    <div className="report-trend-bar-label">{formatDate(item.date)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          TOP PERFORMERS
      ===================================================== */}

      <section className="report-top-performers">
        <div className="report-top-card">
          <div className="report-top-header"><Users size={17} /> Top Parties</div>
          {topParties.length === 0 ? <div className="report-top-empty">No party data</div> :
            topParties.map((item, i) => (
              <div key={item.name} className="report-top-row">
                <span className="report-top-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <strong>{item.name}</strong>
                <span>{item.trips} trips</span>
                <strong className="report-top-amount">{formatCurrency(item.billing)}</strong>
              </div>
            ))}
        </div>
        <div className="report-top-card">
          <div className="report-top-header"><Truck size={17} /> Top Tractors</div>
          {topTractors.length === 0 ? <div className="report-top-empty">No tractor data</div> :
            topTractors.map((item, i) => (
              <div key={item.name} className="report-top-row">
                <span className="report-top-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <strong>{item.name}</strong>
                <span>{item.trips} trips</span>
                <strong className="report-top-amount">{formatCurrency(item.billing)}</strong>
              </div>
            ))}
        </div>
        <div className="report-top-card">
          <div className="report-top-header"><Package size={17} /> Top Materials</div>
          {topMaterials.length === 0 ? <div className="report-top-empty">No material data</div> :
            topMaterials.map((item, i) => (
              <div key={item.name} className="report-top-row">
                <span className="report-top-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <strong>{item.name}</strong>
                <span>{item.trips} trips</span>
                <strong className="report-top-amount">{formatCurrency(item.billing)}</strong>
              </div>
            ))}
        </div>
      </section>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <section className="report-filter-panel">
        <div className="report-date-controls">
          <div className="report-filter-label"><CalendarDays size={15} /> REPORT PERIOD</div>
          <div className="report-presets">
            {["Today", "This Week", "This Month", "All Time"].map((preset) => (
              <button key={preset} className={activePreset === preset ? "active" : ""} onClick={() => applyPreset(preset)}>
                {preset}
              </button>
            ))}
          </div>
          <div className="report-date-inputs">
            <label><span>From</span>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setActivePreset(""); }} />
            </label>
            <span className="date-arrow">→</span>
            <label><span>To</span>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setActivePreset(""); }} />
            </label>
          </div>
        </div>

        <div className="report-filter-bottom">
          <div className="report-search">
            <Search size={17} />
            <input type="text" placeholder="Search party, tractor, material, site..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="search-clear" onClick={() => setSearch("")}><X size={15} /></button>}
          </div>
          <button className={`filter-toggle ${showFilters || hasActiveFilters ? "active" : ""}`} onClick={() => setShowFilters((v) => !v)}>
            <Filter size={16} /> Filters {hasActiveFilters && <span className="filter-dot" />}
          </button>
          {hasActiveFilters && <button className="clear-filter-btn" onClick={clearFilters}>Clear all</button>}
        </div>

        {showFilters && (
          <div className="advanced-filters">
            <label><span>Party</span>
              <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)}>
                <option value="">All parties</option>
                {partyOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label><span>Tractor</span>
              <select value={tractorFilter} onChange={(e) => setTractorFilter(e.target.value)}>
                <option value="">All tractors</option>
                {tractorOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label><span>Material</span>
              <select value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)}>
                <option value="">All materials</option>
                {materialOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label><span>Trip Type</span>
              <select value={tripTypeFilter} onChange={(e) => setTripTypeFilter(e.target.value)}>
                <option value="">All trip types</option>
                <option value="Loading">Loading</option>
                <option value="Unloading">Unloading</option>
                <option value="Site-to-Site">Site-to-Site</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="report-stats-grid">
        <StatCard icon={BarChart3} label="Total Records" value={formatNumber(summary.records)} detail={`${summary.trips} transport entries`} />
        <StatCard icon={Truck} label="Total Trips" value={formatNumber(summary.trips)} detail={`${summary.loading} loading · ${summary.unloading} unloading`} type="blue" />
        <StatCard icon={Package} label="Total Quantity" value={formatNumber(summary.quantity)} detail="Across selected period" type="brown" />
        <StatCard icon={IndianRupee} label="Total Billing" value={formatCurrency(summary.billing)} detail={`Avg. ${formatCurrency(summary.averageTripValue)} / trip`} type="dark" />
      </section>

      {/* =====================================================
          BREAKDOWN
      ===================================================== */}

      <section className="report-analysis-grid">
        <div className="report-panel">
          <div className="report-panel-header">
            <div><span className="panel-kicker">ACTIVITY</span><h2>Trip Type Breakdown</h2></div>
          </div>
          <div className="breakdown-list">
            <BreakdownBar label="Loading" value={summary.loading} total={summary.records}
              amount={filteredTrips.filter((t) => getTripType(t) === "Loading").reduce((s, t) => s + getAmount(t), 0)} />
            <BreakdownBar label="Unloading" value={summary.unloading} total={summary.records}
              amount={filteredTrips.filter((t) => getTripType(t) === "Unloading").reduce((s, t) => s + getAmount(t), 0)} />
            <BreakdownBar label="Site-to-Site" value={summary.siteToSite} total={summary.records}
              amount={filteredTrips.filter((t) => getTripType(t) === "Site-to-Site").reduce((s, t) => s + getAmount(t), 0)} />
          </div>
        </div>
        <div className="report-panel">
          <div className="report-panel-header">
            <div><span className="panel-kicker">DAILY ACTIVITY</span><h2>Recent Daily Summary</h2></div>
          </div>
          <div className="daily-summary-list">
            {dailyReport.length ? dailyReport.map((item) => (
              <div className="daily-summary-row" key={dateKey(item.date)}>
                <div className="daily-date"><strong>{formatDate(item.date)}</strong><span>{item.trips} trips</span></div>
                <div className="daily-metrics"><span>{formatNumber(item.quantity)} qty</span><strong>{formatCurrency(item.billing)}</strong></div>
              </div>
            )) : <div className="report-empty-small">No daily records for the selected period.</div>}
          </div>
        </div>
      </section>

      {/* =====================================================
          PARTY REPORT
      ===================================================== */}

      <section className="report-panel report-table-panel">
        <div className="report-panel-header report-table-header">
          <div><span className="panel-kicker">PARTY PERFORMANCE</span><h2>Party-wise Report</h2><p>Billing and transport activity grouped by party.</p></div>
          <span className="panel-count">{partyReport.length} parties</span>
        </div>
        {partyReport.length ? (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Party</th><th>Trips</th><th>Quantity</th><th>Billing</th></tr></thead>
              <tbody>
                {partyReport.map((item) => (
                  <tr key={item.name}>
                    <td><div className="entity-cell"><span className="entity-icon"><Users size={16} /></span><strong>{item.name}</strong></div></td>
                    <td>{formatNumber(item.trips)}</td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td className="amount-cell">{formatCurrency(item.billing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="report-empty"><Users size={30} /><strong>No party data</strong><span>Try changing the selected filters or date range.</span></div>}
      </section>

      {/* =====================================================
          TRACTOR + MATERIAL REPORT
      ===================================================== */}

      <section className="report-two-column">
        <div className="report-panel">
          <div className="report-panel-header"><div><span className="panel-kicker">FLEET</span><h2>Tractor-wise Report</h2></div><span className="panel-count">{tractorReport.length}</span></div>
          {tractorReport.length ? (
            <div className="compact-report-list">
              {tractorReport.slice(0, 8).map((item, index) => (
                <div className="compact-report-row" key={item.name}>
                  <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                  <div className="compact-main"><strong>{item.name}</strong><span>{formatNumber(item.quantity)} quantity</span></div>
                  <div className="compact-value"><strong>{item.trips}</strong><span>trips</span></div>
                </div>
              ))}
            </div>
          ) : <div className="report-empty-small">No tractor data available.</div>}
        </div>
        <div className="report-panel">
          <div className="report-panel-header"><div><span className="panel-kicker">MATERIAL</span><h2>Material-wise Report</h2></div><span className="panel-count">{materialReport.length}</span></div>
          {materialReport.length ? (
            <div className="compact-report-list">
              {materialReport.slice(0, 8).map((item, index) => (
                <div className="compact-report-row" key={item.name}>
                  <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                  <div className="compact-main"><strong>{item.name}</strong><span>{item.trips} trips</span></div>
                  <div className="compact-value"><strong>{formatNumber(item.quantity)}</strong><span>{item.unit}</span></div>
                </div>
              ))}
            </div>
          ) : <div className="report-empty-small">No material data available.</div>}
        </div>
      </section>

      {/* =====================================================
          TRIP TYPE REPORT
      ===================================================== */}

      <section className="report-panel report-table-panel">
        <div className="report-panel-header"><div><span className="panel-kicker">TRANSPORT MIX</span><h2>Trip Type Report</h2></div></div>
        <div className="trip-type-cards">
          {tripTypeReport.map((item) => (
            <div className="trip-type-card" key={item.type}>
              <span>{item.type}</span>
              <strong>{item.trips}</strong>
              <small>{formatNumber(item.quantity)} qty · {formatCurrency(item.billing)}</small>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          RECORDS TABLE
      ===================================================== */}

      <section className="report-panel report-records-panel">
        <div className="report-panel-header report-table-header">
          <div><span className="panel-kicker">RECORD DETAIL</span><h2>Report Records</h2><p>Detailed transport entries for the selected period.</p></div>
          <span className="panel-count">{filteredTrips.length} records</span>
        </div>

        {paginatedTrips.length ? (
          <>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Party</th>
                    <th>Vehicle</th>
                    <th>Material</th>
                    <th>Trip Type</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th className="report-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrips.map((trip, index) => (
                    <tr key={trip?.id || `${getTripDate(trip)}-${index}`}>
                      <td>{formatDate(getTripDate(trip))}</td>
                      <td><strong>{getParty(trip)}</strong></td>
                      <td><span className="vehicle-badge">{getVehicle(trip)}</span></td>
                      <td><div className="material-cell"><strong>{getMaterial(trip)}</strong><span>{getSite(trip)}</span></div></td>
                      <td><span className={`trip-badge trip-${getTripType(trip).toLowerCase().replace(/[^a-z]+/g, "-")}`}>{getTripType(trip)}</span></td>
                      <td>{formatNumber(getQuantity(trip))} <small>{getUnit(trip)}</small></td>
                      <td className="amount-cell">{formatCurrency(getAmount(trip))}</td>
                      <td className="report-actions-col">
                        <div className="report-row-actions">
                          <button className="report-action-btn icon" onClick={() => setSelectedTrip(trip)} title="View">
                            <Eye size={15} />
                          </button>
                          <button className="report-action-btn icon clone" onClick={() => cloneTrip(trip)} title="Clone">
                            <Copy size={14} />
                          </button>
                          <button className="report-action-btn icon whatsapp" onClick={() => shareWhatsApp(trip)} title="WhatsApp">
                            <MessageCircle size={14} />
                          </button>
                          <button className="report-action-btn icon edit" onClick={() => openEdit(trip)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button className="report-action-btn icon delete" onClick={() => requestDelete(trip)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-pagination">
              <span>Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong> – <strong>{Math.min(page * PAGE_SIZE, filteredTrips.length)}</strong> of <strong>{filteredTrips.length}</strong></span>
              <div className="pagination-buttons">
                <button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}><ChevronLeft size={16} /></button>
                <span>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((v) => v + 1)}><ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="report-empty">
            <FileBarChart size={34} />
            <strong>No records found</strong>
            <span>There are no transport records matching the current filters.</span>
          </div>
        )}
      </section>

      {/* =====================================================
          MODALS
      ===================================================== */}

      {selectedTrip && (
        <DetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onClone={cloneTrip}
          onEdit={openEdit}
          onDelete={requestDelete}
        />
      )}

      {editTrip && (
        <EditModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={saveEdit}
        />
      )}

      {deleteTrip && (
        <DeleteConfirmModal
          trip={deleteTrip}
          onCancel={() => setDeleteTrip(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}