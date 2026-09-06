import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  Filter,
  IndianRupee,
  Package,
  Printer,
  RotateCcw,
  Search,
  Truck,
  Users,
  X,
  Copy,
  MessageCircle,
  Pencil,
  Save,
  TrendingUp,
  TrendingDown,
  Award,
  ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import "./DateWise.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const PAGE_SIZE = 12;

const TRIP_TYPE_LABELS = {
  loading: "Loading",
  unloading: "Unloading",
  "site to site": "Site to Site",
  site_to_site: "Site to Site",
  "site-to-site": "Site to Site",
};

function readTrips() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
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

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getToday() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  const normalized = normalizeDate(value);
  if (!normalized) return "—";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function formatLongDate(value) {
  const normalized = normalizeDate(value);
  if (!normalized) return "—";
  const date = new Date(`${normalized}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getTripType(trip) {
  const raw = String(
    trip?.tripType || trip?.type || trip?.workType || ""
  )
    .trim()
    .toLowerCase();
  return TRIP_TYPE_LABELS[raw] || trip?.tripType || "Other";
}

function getVehicle(trip) {
  return trip?.vehicleNumber || trip?.tractorNumber || trip?.vehicleNo || "—";
}

function getParty(trip) {
  return trip?.partyName || trip?.party || "Unassigned";
}

function getMaterial(trip) {
  return trip?.materialName || trip?.material || "—";
}

function getSite(trip) {
  return trip?.site || trip?.location || "—";
}

function getQuantity(trip) {
  return Number(trip?.quantity) || 0;
}

function getRate(trip) {
  return Number(trip?.rate) || 0;
}

function getAmount(trip) {
  if (trip?.amount !== undefined && trip?.amount !== null) {
    return Number(trip.amount) || 0;
  }
  return getQuantity(trip) * getRate(trip);
}

function getUnit(trip) {
  return trip?.unit || "Trip";
}

function getDateRange(type) {
  const today = new Date();
  const toISO = (date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

  if (type === "today") {
    return { from: toISO(today), to: toISO(today) };
  }
  if (type === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: toISO(yesterday), to: toISO(yesterday) };
  }
  if (type === "week") {
    const day = today.getDay();
    const difference = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - difference);
    return { from: toISO(start), to: toISO(today) };
  }
  if (type === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(start), to: toISO(today) };
  }
  return { from: "", to: "" };
}

function ClipboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </svg>
  );
}

export default function DateWise() {
  const [trips, setTrips] = useState([]);
  const [fromDate, setFromDate] = useState(getToday());
  const [toDate, setToDate] = useState(getToday());
  const [activePreset, setActivePreset] = useState("today");
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [tractorFilter, setTractorFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [page, setPage] = useState(1);
  const [showTrend, setShowTrend] = useState(true);
  const [trendMode, setTrendMode] = useState("billing"); // 'billing' or 'trips'

  const loadTrips = useCallback(() => {
    setTrips(readTrips());
  }, []);

  useEffect(() => {
    loadTrips();
    const handleStorage = (event) => {
      if (!event.key || event.key === TRIPS_KEY) loadTrips();
    };
    const handleDataChange = () => loadTrips();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("saoAutoTractorDataChanged", handleDataChange);
    const interval = window.setInterval(loadTrips, 1500);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("saoAutoTractorDataChanged", handleDataChange);
      window.clearInterval(interval);
    };
  }, [loadTrips]);

  const parties = useMemo(() => {
    return [...new Set(trips.map(getParty).filter((v) => v && v !== "Unassigned"))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [trips]);

  const tractors = useMemo(() => {
    return [...new Set(trips.map(getVehicle).filter((v) => v && v !== "—"))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [trips]);

  const materials = useMemo(() => {
    return [...new Set(trips.map(getMaterial).filter((v) => v && v !== "—"))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trips
      .filter((trip) => {
        const date = normalizeDate(trip?.date);
        if (fromDate && (!date || date < fromDate)) return false;
        if (toDate && (!date || date > toDate)) return false;
        if (partyFilter && getParty(trip) !== partyFilter) return false;
        if (tractorFilter && getVehicle(trip) !== tractorFilter) return false;
        if (materialFilter && getMaterial(trip) !== materialFilter) return false;
        if (tripTypeFilter && getTripType(trip) !== tripTypeFilter) return false;
        if (query) {
          const searchable = [
            getParty(trip),
            getVehicle(trip),
            getMaterial(trip),
            getSite(trip),
            getTripType(trip),
            trip?.driverName || "",
            trip?.notes || "",
          ]
            .join(" ")
            .toLowerCase();
          if (!searchable.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = normalizeDate(a?.date);
        const dateB = normalizeDate(b?.date);
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
      });
  }, [trips, fromDate, toDate, partyFilter, tractorFilter, materialFilter, tripTypeFilter, search]);

  // =========================================================
  // TREND CHART DATA
  // =========================================================

  const trendData = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const date = normalizeDate(trip?.date);
      if (!date) return;
      if (!map.has(date)) {
        map.set(date, { date, trips: 0, billing: 0 });
      }
      const day = map.get(date);
      day.trips += 1;
      day.billing += getAmount(trip);
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
    filteredTrips.forEach((trip) => {
      const name = getParty(trip);
      if (name === "Unassigned") return;
      if (!map.has(name)) map.set(name, { name, trips: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.billing += getAmount(trip);
    });
    return Array.from(map.values()).sort((a, b) => b.billing - a.billing).slice(0, 5);
  }, [filteredTrips]);

  const topTractors = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const name = getVehicle(trip);
      if (name === "—") return;
      if (!map.has(name)) map.set(name, { name, trips: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.billing += getAmount(trip);
    });
    return Array.from(map.values()).sort((a, b) => b.billing - a.billing).slice(0, 5);
  }, [filteredTrips]);

  const topMaterials = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const name = getMaterial(trip);
      if (name === "—") return;
      if (!map.has(name)) map.set(name, { name, trips: 0, billing: 0 });
      const item = map.get(name);
      item.trips += 1;
      item.billing += getAmount(trip);
    });
    return Array.from(map.values()).sort((a, b) => b.billing - a.billing).slice(0, 5);
  }, [filteredTrips]);

  // =========================================================
  // DAY-OVER-DAY COMPARISON
  // =========================================================

  const dayComparison = useMemo(() => {
    const today = getToday();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, "0"),
      String(yesterday.getDate()).padStart(2, "0"),
    ].join("-");

    const todayTrips = filteredTrips.filter((t) => normalizeDate(t?.date) === today);
    const yesterdayTrips = filteredTrips.filter((t) => normalizeDate(t?.date) === yDate);

    const todayBilling = todayTrips.reduce((s, t) => s + getAmount(t), 0);
    const yesterdayBilling = yesterdayTrips.reduce((s, t) => s + getAmount(t), 0);
    const todayCount = todayTrips.length;
    const yesterdayCount = yesterdayTrips.length;

    const billingChange = yesterdayBilling > 0 ? ((todayBilling - yesterdayBilling) / yesterdayBilling) * 100 : 0;
    const tripsChange = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0;

    return {
      todayBilling,
      yesterdayBilling,
      todayCount,
      yesterdayCount,
      billingChange: Number.isFinite(billingChange) ? billingChange : 0,
      tripsChange: Number.isFinite(tripsChange) ? tripsChange : 0,
    };
  }, [filteredTrips]);

  // =========================================================
  // QUICK STATS
  // =========================================================

  const quickStats = useMemo(() => {
    const days = new Set(filteredTrips.map((t) => normalizeDate(t?.date)).filter(Boolean));
    const totalDays = days.size || 1;
    const totalBilling = filteredTrips.reduce((s, t) => s + getAmount(t), 0);
    const totalTrips = filteredTrips.length;
    const avgPerDay = totalBilling / totalDays;

    // Busiest day
    const dayMap = new Map();
    filteredTrips.forEach((t) => {
      const d = normalizeDate(t?.date);
      if (!d) return;
      if (!dayMap.has(d)) dayMap.set(d, { date: d, trips: 0, billing: 0 });
      const item = dayMap.get(d);
      item.trips += 1;
      item.billing += getAmount(t);
    });
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => b.billing - a.billing);
    const busiestDay = sortedDays.length > 0 ? sortedDays[0] : null;

    return { totalDays, avgPerDay, busiestDay, totalBilling, totalTrips };
  }, [filteredTrips]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary = useMemo(() => {
    let loading = 0,
      unloading = 0,
      siteToSite = 0,
      quantity = 0,
      billing = 0;
    filteredTrips.forEach((trip) => {
      const type = getTripType(trip).toLowerCase();
      if (type === "loading") loading += 1;
      else if (type === "unloading") unloading += 1;
      else if (type === "site to site") siteToSite += 1;
      quantity += getQuantity(trip);
      billing += getAmount(trip);
    });
    return { records: filteredTrips.length, trips: filteredTrips.length, loading, unloading, siteToSite, quantity, billing };
  }, [filteredTrips]);

  // =========================================================
  // DAILY SUMMARY
  // =========================================================

  const dailySummary = useMemo(() => {
    const grouped = new Map();
    filteredTrips.forEach((trip) => {
      const date = normalizeDate(trip?.date);
      if (!date) return;
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          trips: 0,
          vehicles: new Set(),
          parties: new Set(),
          materials: new Set(),
          quantity: 0,
          billing: 0,
          loading: 0,
          unloading: 0,
          siteToSite: 0,
          tractorWise: new Map(),
          partyWise: new Map(),
          materialWise: new Map(),
        });
      }
      const day = grouped.get(date);
      const tripType = getTripType(trip).toLowerCase();
      const vehicle = getVehicle(trip);
      const party = getParty(trip);
      const material = getMaterial(trip);
      const quantity = getQuantity(trip);
      const amount = getAmount(trip);

      day.trips += 1;
      day.quantity += quantity;
      day.billing += amount;
      if (vehicle && vehicle !== "—") day.vehicles.add(vehicle);
      if (party && party !== "Unassigned") day.parties.add(party);
      if (material && material !== "—") day.materials.add(material);
      if (tripType === "loading") day.loading += 1;
      else if (tripType === "unloading") day.unloading += 1;
      else if (tripType === "site to site") day.siteToSite += 1;

      if (vehicle && vehicle !== "—") {
        if (!day.tractorWise.has(vehicle)) {
          day.tractorWise.set(vehicle, { name: vehicle, trips: 0, quantity: 0, billing: 0 });
        }
        const t = day.tractorWise.get(vehicle);
        t.trips += 1;
        t.quantity += quantity;
        t.billing += amount;
      }
      if (party && party !== "Unassigned") {
        if (!day.partyWise.has(party)) {
          day.partyWise.set(party, { name: party, trips: 0, quantity: 0, billing: 0 });
        }
        const p = day.partyWise.get(party);
        p.trips += 1;
        p.quantity += quantity;
        p.billing += amount;
      }
      if (material && material !== "—") {
        if (!day.materialWise.has(material)) {
          day.materialWise.set(material, { name: material, trips: 0, quantity: 0, billing: 0 });
        }
        const m = day.materialWise.get(material);
        m.trips += 1;
        m.quantity += quantity;
        m.billing += amount;
      }
    });
    return Array.from(grouped.values())
      .map((day) => ({
        ...day,
        vehicles: day.vehicles.size,
        parties: day.parties.size,
        materials: day.materials.size,
        tractorWise: Array.from(day.tractorWise.values()).sort((a, b) => b.trips - a.trips),
        partyWise: Array.from(day.partyWise.values()).sort((a, b) => b.trips - a.trips),
        materialWise: Array.from(day.materialWise.values()).sort((a, b) => b.trips - a.trips),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTrips]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE));
  const paginatedTrips = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTrips.slice(start, start + PAGE_SIZE);
  }, [filteredTrips, page]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, partyFilter, tractorFilter, materialFilter, tripTypeFilter, search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const applyPreset = (preset) => {
    const range = getDateRange(preset);
    setFromDate(range.from);
    setToDate(range.to);
    setActivePreset(preset);
  };

  const clearFilters = () => {
    setSearch("");
    setPartyFilter("");
    setTractorFilter("");
    setMaterialFilter("");
    setTripTypeFilter("");
    const today = getToday();
    setFromDate(today);
    setToDate(today);
    setActivePreset("today");
  };

  const hasAdvancedFilters = Boolean(partyFilter || tractorFilter || materialFilter || tripTypeFilter);
  const printReport = () => window.print();

  const exportCSV = () => {
    if (!filteredTrips.length) return;
    const headers = ["Date", "Vehicle", "Party", "Material", "Trip Type", "Site", "Quantity", "Unit", "Rate", "Amount", "Driver"];
    const rows = filteredTrips.map((trip) => [
      formatDate(trip?.date),
      getVehicle(trip),
      getParty(trip),
      getMaterial(trip),
      getTripType(trip),
      getSite(trip),
      getQuantity(trip),
      getUnit(trip),
      getRate(trip),
      getAmount(trip),
      trip?.driverName || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SAO-Date-Wise-${fromDate || "all"}-${toDate || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportDailyCSV = () => {
    if (!dailySummary.length) return;
    const headers = ["Date", "Trips", "Vehicles", "Parties", "Materials", "Quantity", "Billing"];
    const rows = dailySummary.map((day) => [
      formatDate(day.date),
      day.trips,
      day.vehicles,
      day.parties,
      day.materials,
      day.quantity,
      day.billing,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SAO-Daily-Summary-${fromDate || "all"}-${toDate || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // =========================================================
  // CLONE TRIP
  // =========================================================

  const cloneTrip = (trip) => {
    const currentTrips = readTrips();
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
    loadTrips();
    if (selectedTrip) setSelectedTrip(null);
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
  // QUICK EDIT
  // =========================================================

  const openEditModal = (trip) => {
    setEditTrip(trip);
    if (selectedTrip) setSelectedTrip(null);
  };

  const saveEdit = (updatedTrip) => {
    const currentTrips = readTrips();
    const index = currentTrips.findIndex((t) => t?.id === updatedTrip?.id);
    if (index === -1) {
      alert("Trip not found. Please refresh.");
      setEditTrip(null);
      return;
    }
    const newTrips = [...currentTrips];
    newTrips[index] = {
      ...newTrips[index],
      ...updatedTrip,
      updatedAt: new Date().toISOString(),
    };
    writeTrips(newTrips);
    loadTrips();
    setEditTrip(null);
  };

  return (
    <div className="date-wise-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <header className="date-wise-header">
        <div className="date-wise-header-copy">
          <span className="date-wise-eyebrow">RECORD ANALYSIS</span>
          <h1>Date Wise</h1>
          <p>Review transport activity, quantities and billing for any selected date range.</p>
        </div>
        <div className="date-wise-header-actions">
          <button type="button" className="dw-button dw-button-secondary" onClick={loadTrips} title="Refresh records">
            <RotateCcw size={16} />
            <span>Refresh</span>
          </button>
          <button type="button" className="dw-button dw-button-secondary" onClick={exportCSV} disabled={!filteredTrips.length}>
            <FileDown size={16} />
            <span>Export CSV</span>
          </button>
          <button type="button" className="dw-button dw-button-primary" onClick={printReport}>
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>
      </header>

      {/* =====================================================
          DATE CONTROL
      ===================================================== */}

      <section className="dw-date-panel">
        <div className="dw-date-panel-top">
          <div className="dw-date-title">
            <div className="dw-date-icon">
              <CalendarDays size={19} />
            </div>
            <div>
              <strong>Select Period</strong>
              <span>Choose a date range to analyse your transport records.</span>
            </div>
          </div>
          <div className="dw-preset-list">
            {["today", "yesterday", "week", "month"].map((p) => (
              <button
                key={p}
                type="button"
                className={activePreset === p ? "active" : ""}
                onClick={() => applyPreset(p)}
              >
                {p === "today" && "Today"}
                {p === "yesterday" && "Yesterday"}
                {p === "week" && "This Week"}
                {p === "month" && "This Month"}
              </button>
            ))}
          </div>
        </div>
        <div className="dw-date-inputs">
          <label>
            <span>From Date</span>
            <div className="dw-input-wrap">
              <CalendarDays size={16} />
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setActivePreset("custom");
                }}
              />
            </div>
          </label>
          <div className="dw-date-arrow">
            <ChevronRight size={17} />
          </div>
          <label>
            <span>To Date</span>
            <div className="dw-input-wrap">
              <CalendarDays size={16} />
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setActivePreset("custom");
                }}
              />
            </div>
          </label>
          <div className="dw-selected-period">
            <span>SELECTED PERIOD</span>
            <strong>
              {fromDate && toDate
                ? fromDate === toDate
                  ? formatLongDate(fromDate)
                  : `${formatLongDate(fromDate)} — ${formatLongDate(toDate)}`
                : "All Dates"}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK STATS + DAY OVER DAY
      ===================================================== */}

      <section className="dw-quick-stats">
        <div className="dw-quick-stat-card">
          <span>Total Records</span>
          <strong>{summary.records}</strong>
          <small>{quickStats.totalDays} days</small>
        </div>
        <div className="dw-quick-stat-card">
          <span>Total Billing</span>
          <strong>{formatCurrency(summary.billing)}</strong>
          <small>Avg. {formatCurrency(quickStats.avgPerDay)} / day</small>
        </div>
        <div className="dw-quick-stat-card">
          <span>Busiest Day</span>
          <strong>{quickStats.busiestDay ? formatCurrency(quickStats.busiestDay.billing) : "—"}</strong>
          <small>{quickStats.busiestDay ? formatLongDate(quickStats.busiestDay.date) : "No data"}</small>
        </div>
        <div className="dw-quick-stat-card dw-compare-card">
          <span>Today vs Yesterday</span>
          <div className="dw-compare-values">
            <div>
              <span>Today</span>
              <strong>{formatCurrency(dayComparison.todayBilling)}</strong>
            </div>
            <div className="dw-compare-arrow">
              {dayComparison.billingChange > 0 ? (
                <TrendingUp size={16} className="dw-trend-up" />
              ) : dayComparison.billingChange < 0 ? (
                <TrendingDown size={16} className="dw-trend-down" />
              ) : (
                <span className="dw-trend-flat">—</span>
              )}
              <span className={dayComparison.billingChange >= 0 ? "dw-trend-up" : "dw-trend-down"}>
                {Math.abs(dayComparison.billingChange).toFixed(1)}%
              </span>
            </div>
            <div>
              <span>Yesterday</span>
              <strong>{formatCurrency(dayComparison.yesterdayBilling)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          TREND CHART
      ===================================================== */}

      <section className="dw-trend-section">
        <div className="dw-trend-header">
          <div>
            <span>TREND</span>
            <h2>Activity Trend</h2>
          </div>
          <div className="dw-trend-controls">
            <button
              type="button"
              className={trendMode === "billing" ? "active" : ""}
              onClick={() => setTrendMode("billing")}
            >
              Billing
            </button>
            <button
              type="button"
              className={trendMode === "trips" ? "active" : ""}
              onClick={() => setTrendMode("trips")}
            >
              Trips
            </button>
          </div>
        </div>
        <div className="dw-trend-chart">
          {trendData.data.length === 0 ? (
            <div className="dw-trend-empty">
              <span>No data for the selected period</span>
            </div>
          ) : (
            <div className="dw-trend-bars">
              {trendData.data.map((item) => {
                const value = trendMode === "billing" ? item.billing : item.trips;
                const height = trendData.max > 0 ? (value / trendData.max) * 100 : 0;
                const label = formatDate(item.date);
                return (
                  <div key={item.date} className="dw-trend-bar-wrapper">
                    <div className="dw-trend-bar-value">{trendMode === "billing" ? formatCurrency(value) : value}</div>
                    <div className="dw-trend-bar-track">
                      <div className="dw-trend-bar" style={{ height: `${Math.max(height, 4)}%` }} />
                    </div>
                    <div className="dw-trend-bar-label">{label}</div>
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

      <section className="dw-top-performers">
        <div className="dw-top-performer-card">
          <div className="dw-top-performer-header">
            <Users size={17} />
            <span>Top Parties</span>
          </div>
          {topParties.length === 0 ? (
            <div className="dw-top-empty">No party data</div>
          ) : (
            topParties.map((item, index) => (
              <div key={item.name} className="dw-top-performer-row">
                <span className="dw-top-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <strong>{item.name}</strong>
                <span>{item.trips} trips</span>
                <strong className="dw-top-amount">{formatCurrency(item.billing)}</strong>
              </div>
            ))
          )}
        </div>

        <div className="dw-top-performer-card">
          <div className="dw-top-performer-header">
            <Truck size={17} />
            <span>Top Tractors</span>
          </div>
          {topTractors.length === 0 ? (
            <div className="dw-top-empty">No tractor data</div>
          ) : (
            topTractors.map((item, index) => (
              <div key={item.name} className="dw-top-performer-row">
                <span className="dw-top-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <strong>{item.name}</strong>
                <span>{item.trips} trips</span>
                <strong className="dw-top-amount">{formatCurrency(item.billing)}</strong>
              </div>
            ))
          )}
        </div>

        <div className="dw-top-performer-card">
          <div className="dw-top-performer-header">
            <Package size={17} />
            <span>Top Materials</span>
          </div>
          {topMaterials.length === 0 ? (
            <div className="dw-top-empty">No material data</div>
          ) : (
            topMaterials.map((item, index) => (
              <div key={item.name} className="dw-top-performer-row">
                <span className="dw-top-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <strong>{item.name}</strong>
                <span>{item.trips} trips</span>
                <strong className="dw-top-amount">{formatCurrency(item.billing)}</strong>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="dw-summary-grid">
        <div className="dw-summary-card">
          <div className="dw-summary-icon"><ClipboardIcon /></div>
          <div><span>Total Records</span><strong>{summary.records}</strong></div>
        </div>
        <div className="dw-summary-card">
          <div className="dw-summary-icon"><Truck size={18} /></div>
          <div><span>Total Trips</span><strong>{summary.trips}</strong></div>
        </div>
        <div className="dw-summary-card">
          <div className="dw-summary-icon"><Package size={18} /></div>
          <div><span>Total Quantity</span><strong>{formatNumber(summary.quantity)}</strong></div>
        </div>
        <div className="dw-summary-card dw-summary-money">
          <div className="dw-summary-icon"><IndianRupee size={18} /></div>
          <div><span>Total Billing</span><strong>{formatCurrency(summary.billing)}</strong></div>
        </div>
      </section>

      {/* =====================================================
          ACTIVITY BREAKDOWN
      ===================================================== */}

      <section className="dw-breakdown">
        <div className="dw-breakdown-heading">
          <div><span>ACTIVITY BREAKDOWN</span><h2>Transport Activity</h2></div>
          <div className="dw-record-count">{filteredTrips.length} {filteredTrips.length === 1 ? "record" : "records"}</div>
        </div>
        <div className="dw-breakdown-grid">
          <div className="dw-breakdown-item">
            <span className="dw-breakdown-dot loading" />
            <div><strong>{summary.loading}</strong><span>Loading</span></div>
          </div>
          <div className="dw-breakdown-item">
            <span className="dw-breakdown-dot unloading" />
            <div><strong>{summary.unloading}</strong><span>Unloading</span></div>
          </div>
          <div className="dw-breakdown-item">
            <span className="dw-breakdown-dot site" />
            <div><strong>{summary.siteToSite}</strong><span>Site to Site</span></div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FILTER BAR + RECORDS
      ===================================================== */}

      <section className="dw-record-section">
        <div className="dw-toolbar">
          <div className="dw-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search party, tractor, material, site..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={["dw-filter-button", showFilters || hasAdvancedFilters ? "active" : ""].filter(Boolean).join(" ")}
            onClick={() => setShowFilters((value) => !value)}
          >
            <Filter size={16} />
            <span>Filters{hasAdvancedFilters ? " •" : ""}</span>
          </button>
        </div>

        {showFilters && (
          <div className="dw-filter-panel">
            <div className="dw-filter-field">
              <label>Party</label>
              <select value={partyFilter} onChange={(event) => setPartyFilter(event.target.value)}>
                <option value="">All Parties</option>
                {parties.map((party) => (
                  <option key={party} value={party}>{party}</option>
                ))}
              </select>
            </div>
            <div className="dw-filter-field">
              <label>Tractor</label>
              <select value={tractorFilter} onChange={(event) => setTractorFilter(event.target.value)}>
                <option value="">All Tractors</option>
                {tractors.map((tractor) => (
                  <option key={tractor} value={tractor}>{tractor}</option>
                ))}
              </select>
            </div>
            <div className="dw-filter-field">
              <label>Material</label>
              <select value={materialFilter} onChange={(event) => setMaterialFilter(event.target.value)}>
                <option value="">All Materials</option>
                {materials.map((material) => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>
            <div className="dw-filter-field">
              <label>Trip Type</label>
              <select value={tripTypeFilter} onChange={(event) => setTripTypeFilter(event.target.value)}>
                <option value="">All Trip Types</option>
                <option value="Loading">Loading</option>
                <option value="Unloading">Unloading</option>
                <option value="Site to Site">Site to Site</option>
              </select>
            </div>
            <button type="button" className="dw-clear-button" onClick={clearFilters}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        )}

        {/* DESKTOP TABLE */}

        <div className="dw-table-wrap">
          {paginatedTrips.length === 0 ? (
            <div className="dw-empty">
              <div className="dw-empty-icon"><CalendarDays size={25} /></div>
              <h3>No records found</h3>
              <p>No transport records match the selected date range and filters.</p>
              <button type="button" onClick={clearFilters}>Reset Filters</button>
            </div>
          ) : (
            <table className="dw-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Party</th>
                  <th>Material</th>
                  <th>Trip Type</th>
                  <th>Site</th>
                  <th className="align-right">Qty</th>
                  <th className="align-right">Rate</th>
                  <th className="align-right">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip, index) => {
                  const tripType = getTripType(trip);
                  const typeClass = tripType.toLowerCase().replaceAll(" ", "-");
                  return (
                    <tr key={trip?.id || `${trip?.date}-${index}`}>
                      <td>
                        <div className="dw-date-cell">
                          <strong>{formatDate(trip?.date)}</strong>
                          <span>{formatLongDate(trip?.date)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="dw-vehicle-cell">
                          <div className="dw-mini-icon"><Truck size={14} /></div>
                          <strong>{getVehicle(trip)}</strong>
                        </div>
                      </td>
                      <td><strong className="dw-primary-text">{getParty(trip)}</strong></td>
                      <td><span className="dw-secondary-text">{getMaterial(trip)}</span></td>
                      <td>
                        <span className={["dw-trip-badge", typeClass].filter(Boolean).join(" ")}>{tripType}</span>
                      </td>
                      <td><span className="dw-secondary-text dw-site-text">{getSite(trip)}</span></td>
                      <td className="align-right">
                        <strong className="dw-number">{formatNumber(getQuantity(trip))}</strong>
                        <span className="dw-unit">{getUnit(trip)}</span>
                      </td>
                      <td className="align-right"><span className="dw-number">{formatCurrency(getRate(trip))}</span></td>
                      <td className="align-right"><strong className="dw-amount">{formatCurrency(getAmount(trip))}</strong></td>
                      <td>
                        <div className="dw-row-actions">
                          <button type="button" className="dw-view-button" onClick={() => setSelectedTrip(trip)} title="View details">
                            <Eye size={15} />
                          </button>
                          <button type="button" className="dw-clone-btn" onClick={() => cloneTrip(trip)} title="Clone trip">
                            <Copy size={14} />
                          </button>
                          <button type="button" className="dw-whatsapp-btn" onClick={() => shareWhatsApp(trip)} title="Share on WhatsApp">
                            <MessageCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MOBILE CARDS */}

        {paginatedTrips.length > 0 && (
          <div className="dw-mobile-list">
            {paginatedTrips.map((trip, index) => {
              const tripType = getTripType(trip);
              const typeClass = tripType.toLowerCase().replaceAll(" ", "-");
              return (
                <article key={trip?.id || `mobile-${trip?.date}-${index}`} className="dw-mobile-card">
                  <div className="dw-mobile-card-top">
                    <div>
                      <span>{formatLongDate(trip?.date)}</span>
                      <strong>{getVehicle(trip)}</strong>
                    </div>
                    <span className={["dw-trip-badge", typeClass].filter(Boolean).join(" ")}>{tripType}</span>
                  </div>
                  <div className="dw-mobile-party"><Users size={15} /><strong>{getParty(trip)}</strong></div>
                  <div className="dw-mobile-details">
                    <div><span>Material</span><strong>{getMaterial(trip)}</strong></div>
                    <div><span>Site</span><strong>{getSite(trip)}</strong></div>
                    <div><span>Quantity</span><strong>{formatNumber(getQuantity(trip))} {getUnit(trip)}</strong></div>
                    <div><span>Amount</span><strong>{formatCurrency(getAmount(trip))}</strong></div>
                  </div>
                  <div className="dw-mobile-actions">
                    <button type="button" className="dw-mobile-view" onClick={() => setSelectedTrip(trip)}>
                      <Eye size={15} /> View
                    </button>
                    <button type="button" className="dw-mobile-clone" onClick={() => cloneTrip(trip)}>
                      <Copy size={14} /> Clone
                    </button>
                    <button type="button" className="dw-mobile-whatsapp" onClick={() => shareWhatsApp(trip)}>
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}

        {filteredTrips.length > 0 && (
          <div className="dw-pagination">
            <span>
              Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong> –{" "}
              <strong>{Math.min(page * PAGE_SIZE, filteredTrips.length)}</strong> of{" "}
              <strong>{filteredTrips.length}</strong>
            </span>
            <div className="dw-pagination-buttons">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft size={16} />
              </button>
              <div className="dw-page-number">{page} / {totalPages}</div>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          DAILY ACTIVITY SUMMARY
      ===================================================== */}

      <section className="dw-daily-summary">
        <div className="dw-daily-summary-heading">
          <div>
            <span>DATE WISE SUMMARY</span>
            <h2>Daily Activity</h2>
            <p>Selected period ke har date ka complete transport summary.</p>
          </div>
          <div className="dw-daily-summary-actions">
            <button type="button" className="dw-button dw-button-secondary" onClick={exportDailyCSV} disabled={!dailySummary.length}>
              <FileDown size={16} /> Export
            </button>
            <div className="dw-daily-summary-count">{dailySummary.length} {dailySummary.length === 1 ? "day" : "days"}</div>
          </div>
        </div>

        {dailySummary.length === 0 ? (
          <div className="dw-daily-summary-empty">
            <CalendarDays size={24} />
            <div><strong>No daily activity</strong><span>Selected date range aur filters ke according koi record nahi mila.</span></div>
          </div>
        ) : (
          <div className="dw-daily-summary-list">
            {dailySummary.map((day) => (
              <article key={day.date} className="dw-daily-summary-card">
                <div className="dw-daily-summary-card-header">
                  <div className="dw-daily-summary-date">
                    <div className="dw-daily-summary-date-icon"><CalendarDays size={17} /></div>
                    <div>
                      <strong>{formatLongDate(day.date)}</strong>
                      <span>{formatDate(day.date)}</span>
                    </div>
                  </div>
                  <div className="dw-daily-summary-total">
                    <span>Total Billing</span>
                    <strong>{formatCurrency(day.billing)}</strong>
                  </div>
                </div>

                <div className="dw-daily-summary-stats">
                  <div><Truck size={15} /><span>Trips</span><strong>{day.trips}</strong></div>
                  <div><Truck size={15} /><span>Vehicles</span><strong>{day.vehicles}</strong></div>
                  <div><Users size={15} /><span>Parties</span><strong>{day.parties}</strong></div>
                  <div><Package size={15} /><span>Materials</span><strong>{day.materials}</strong></div>
                  <div><Package size={15} /><span>Quantity</span><strong>{formatNumber(day.quantity)}</strong></div>
                </div>

                <div className="dw-daily-summary-breakdown">
                  <span>Loading <strong>{day.loading}</strong></span>
                  <span>Unloading <strong>{day.unloading}</strong></span>
                  <span>Site to Site <strong>{day.siteToSite}</strong></span>
                </div>

                <div className="dw-daily-detail-grid">
                  <div className="dw-daily-detail-card">
                    <div className="dw-daily-detail-header">
                      <div><span>TRACTOR WISE</span><h3>Vehicle Activity</h3></div>
                      <Truck size={17} />
                    </div>
                    {day.tractorWise.length === 0 ? (
                      <div className="dw-daily-detail-empty">No vehicle data</div>
                    ) : (
                      <div className="dw-daily-detail-table">
                        <div className="dw-daily-detail-row dw-daily-detail-row-head">
                          <span>Vehicle</span><span>Trips</span><span>Qty</span><span>Amount</span>
                        </div>
                        {day.tractorWise.map((item) => (
                          <div className="dw-daily-detail-row" key={item.name}>
                            <strong>{item.name}</strong><span>{item.trips}</span>
                            <span>{formatNumber(item.quantity)}</span>
                            <strong className="dw-daily-detail-amount">{formatCurrency(item.billing)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="dw-daily-detail-card">
                    <div className="dw-daily-detail-header">
                      <div><span>PARTY WISE</span><h3>Customer Activity</h3></div>
                      <Users size={17} />
                    </div>
                    {day.partyWise.length === 0 ? (
                      <div className="dw-daily-detail-empty">No party data</div>
                    ) : (
                      <div className="dw-daily-detail-table">
                        <div className="dw-daily-detail-row dw-daily-detail-row-head">
                          <span>Party</span><span>Trips</span><span>Qty</span><span>Amount</span>
                        </div>
                        {day.partyWise.map((item) => (
                          <div className="dw-daily-detail-row" key={item.name}>
                            <strong>{item.name}</strong><span>{item.trips}</span>
                            <span>{formatNumber(item.quantity)}</span>
                            <strong className="dw-daily-detail-amount">{formatCurrency(item.billing)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="dw-daily-detail-card">
                    <div className="dw-daily-detail-header">
                      <div><span>MATERIAL WISE</span><h3>Material Activity</h3></div>
                      <Package size={17} />
                    </div>
                    {day.materialWise.length === 0 ? (
                      <div className="dw-daily-detail-empty">No material data</div>
                    ) : (
                      <div className="dw-daily-detail-table">
                        <div className="dw-daily-detail-row dw-daily-detail-row-head">
                          <span>Material</span><span>Trips</span><span>Qty</span><span>Amount</span>
                        </div>
                        {day.materialWise.map((item) => (
                          <div className="dw-daily-detail-row" key={item.name}>
                            <strong>{item.name}</strong><span>{item.trips}</span>
                            <span>{formatNumber(item.quantity)}</span>
                            <strong className="dw-daily-detail-amount">{formatCurrency(item.billing)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          VIEW DETAIL MODAL
      ===================================================== */}

      {selectedTrip && (
        <div className="dw-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTrip(null); }}>
          <div className="dw-modal" role="dialog" aria-modal="true" aria-label="Trip details">
            <div className="dw-modal-header">
              <div>
                <span>TRIP DETAILS</span>
                <h2>{getParty(selectedTrip)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedTrip(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <div className="dw-modal-summary">
              <div><span>Date</span><strong>{formatLongDate(selectedTrip.date)}</strong></div>
              <div><span>Trip Type</span><strong>{getTripType(selectedTrip)}</strong></div>
              <div><span>Amount</span><strong>{formatCurrency(getAmount(selectedTrip))}</strong></div>
            </div>

            <div className="dw-modal-grid">
              <div><span>Vehicle</span><strong>{getVehicle(selectedTrip)}</strong></div>
              <div><span>Tractor</span><strong>{selectedTrip?.tractorName || "—"}</strong></div>
              <div><span>Driver</span><strong>{selectedTrip?.driverName || "—"}</strong></div>
              <div><span>Driver Mobile</span><strong>{selectedTrip?.driverMobile || "—"}</strong></div>
              <div><span>Material</span><strong>{getMaterial(selectedTrip)}</strong></div>
              <div><span>Site</span><strong>{getSite(selectedTrip)}</strong></div>
              <div><span>Quantity</span><strong>{formatNumber(getQuantity(selectedTrip))} {getUnit(selectedTrip)}</strong></div>
              <div><span>Rate</span><strong>{formatCurrency(getRate(selectedTrip))}</strong></div>
            </div>

            {selectedTrip?.notes && (
              <div className="dw-modal-notes">
                <span>Notes</span>
                <p>{selectedTrip.notes}</p>
              </div>
            )}

            <div className="dw-modal-footer">
              <button type="button" className="dw-button dw-button-secondary" onClick={() => shareWhatsApp(selectedTrip)}>
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button type="button" className="dw-button dw-button-secondary" onClick={() => { setSelectedTrip(null); openEditModal(selectedTrip); }}>
                <Pencil size={16} /> Edit
              </button>
              <button type="button" className="dw-button dw-button-secondary" onClick={() => { cloneTrip(selectedTrip); setSelectedTrip(null); }}>
                <Copy size={16} /> Clone
              </button>
              <button type="button" className="dw-button dw-button-primary" onClick={() => setSelectedTrip(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {editTrip && (
        <EditModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

// =========================================================
// EDIT MODAL COMPONENT
// =========================================================

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
      date: normalizeDate(trip?.date),
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuantityOrRateChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const nextQuantity = Number(next.quantity) || 0;
      const nextRate = Number(next.rate) || 0;
      next.amount = String(nextQuantity * nextRate);
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
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
    <div className="dw-edit-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dw-edit-header">
          <div>
            <span className="dw-edit-eyebrow">EDIT TRANSPORT RECORD</span>
            <h2>Edit Record</h2>
            <p>Update this record without creating a new trip entry.</p>
          </div>
          <button type="button" className="dw-edit-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dw-edit-grid">
            <label><span>Date *</span>
              <div className="dw-input-wrap">
                <CalendarDays size={15} />
                <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
              </div>
            </label>
            <label><span>Vehicle / Tractor *</span>
              <div className="dw-input-wrap">
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
            <label className="dw-edit-full"><span>Site / Location</span>
              <input type="text" value={form.site} onChange={(e) => handleChange("site", e.target.value)} placeholder="Site or location" />
            </label>
            <label><span>Quantity</span>
              <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => handleQuantityOrRateChange("quantity", e.target.value)} placeholder="0" />
            </label>
            <label><span>Unit</span>
              <input type="text" value={form.unit} onChange={(e) => handleChange("unit", e.target.value)} placeholder="Trip / Ton / CFT..." />
            </label>
            <label><span>Rate</span>
              <div className="dw-input-wrap">
                <IndianRupee size={15} />
                <input type="number" min="0" step="any" value={form.rate} onChange={(e) => handleQuantityOrRateChange("rate", e.target.value)} placeholder="0" />
              </div>
            </label>
            <label><span>Amount</span>
              <div className="dw-input-wrap">
                <IndianRupee size={15} />
                <input type="number" min="0" step="any" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} placeholder="0" />
              </div>
              <small className="dw-edit-helper">Quantity × Rate = {formatCurrency(calculatedAmount)}</small>
            </label>
            <label className="dw-edit-full"><span>Notes</span>
              <textarea rows="3" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Optional notes..." />
            </label>
          </div>
          <div className="dw-edit-footer">
            <button type="button" className="dw-button dw-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="dw-button dw-button-primary"><Save size={16} /> Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}