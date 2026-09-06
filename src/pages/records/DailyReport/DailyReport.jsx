import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Printer,
  Download,
  RefreshCw,
  Truck,
  Users,
  FileText,
  Search,
  X,
  Filter,
  ArrowUpRight,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import "./DailyReport.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const BUSINESS_KEY = "saoAutoTractorBusinessDetails";

/* ============================================================
   HELPERS
============================================================ */

function readStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateWithDay(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${dayName}, ${day}-${month}-${year}`;
}

function getVehicleNumber(trip) {
  return String(
    trip?.vehicleNumber || trip?.tractorNumber || trip?.vehicleNo || ""
  ).trim();
}

function getPartyName(trip) {
  return String(trip?.partyName || trip?.party || "").trim();
}

function getSite(trip) {
  return String(
    trip?.site ||
      trip?.location ||
      trip?.loadingAddress ||
      trip?.unloadingAddress ||
      trip?.address ||
      ""
  ).trim();
}

function getProduct(trip) {
  return String(
    trip?.material || trip?.materialName || trip?.product || ""
  ).trim();
}

function getTripCount(trip) {
  const qty = Number(trip?.quantity || trip?.trips || 1);
  return qty > 0 ? qty : 1;
}

function getTripType(trip) {
  const raw = String(trip?.tripType || trip?.type || "").toLowerCase().trim();
  
  if (raw === "loading" || raw === "loading only" || raw === "load") return "Loading";
  if (raw === "unloading" || raw === "unloading only" || raw === "unload") return "Unloading";
  if (raw.includes("site to site") || raw.includes("site-to-site") || raw === "site to site") return "Site to Site";
  
  const site = getSite(trip).toLowerCase();
  if (site.includes("loading")) return "Loading";
  if (site.includes("unloading")) return "Unloading";
  
  // Check if party name has "unloading" or site has "unload"
  const party = getPartyName(trip).toLowerCase();
  if (party.includes("unloading") || site.includes("unload")) return "Unloading";
  
  return "—";
}

function getDriverName(trip) {
  return String(trip?.driverName || trip?.driver || "").trim();
}

function getAmount(trip) {
  const amount = Number(trip?.amount || 0);
  if (amount > 0) return amount;
  const qty = Number(trip?.quantity || 0);
  const rate = Number(trip?.rate || 0);
  return qty * rate;
}

function getTripDate(trip) {
  return String(trip?.date || trip?.createdAt || "").trim();
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const DEFAULT_BUSINESS = {
  businessName: "SAO AUTO TRACTOR",
  ownerName: "",
  address: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  gstin: "",
  upiId: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  logo: "",
  qrCode: "",
  signature: "",
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

function DailyReport() {
  const [trips, setTrips] = useState([]);
  const [business, setBusiness] = useState(DEFAULT_BUSINESS);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "fullview"

  const loadData = () => {
    const tripData = readStorage(TRIPS_KEY, []);
    setTrips(Array.isArray(tripData) ? tripData : []);
    const businessData = readStorage(BUSINESS_KEY, DEFAULT_BUSINESS);
    setBusiness(businessData || DEFAULT_BUSINESS);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const uniqueVehicles = useMemo(() => {
    const vehicles = trips.map(getVehicleNumber).filter(Boolean);
    return [...new Set(vehicles)].sort();
  }, [trips]);

  const uniqueParties = useMemo(() => {
    const parties = trips.map(getPartyName).filter(Boolean);
    return [...new Set(parties)].sort();
  }, [trips]);

  // Filter by date
  const dayTrips = useMemo(() => {
    if (!selectedDate) return [];
    return trips.filter((trip) => {
      const tripDate = String(trip?.date || trip?.createdAt || "").split("T")[0];
      return tripDate === selectedDate;
    });
  }, [trips, selectedDate]);

  // Apply search + filters
  const filteredTrips = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return dayTrips.filter((trip) => {
      const vehicle = getVehicleNumber(trip).toLowerCase();
      const party = getPartyName(trip).toLowerCase();
      const site = getSite(trip).toLowerCase();
      const product = getProduct(trip).toLowerCase();
      const type = getTripType(trip).toLowerCase();

      if (filterVehicle && vehicle !== filterVehicle.toLowerCase()) return false;
      if (filterParty && party !== filterParty.toLowerCase()) return false;

      if (query) {
        const haystack = `${vehicle} ${party} ${site} ${product} ${type}`;
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [dayTrips, searchQuery, filterVehicle, filterParty]);

  // Trip type breakdown
  const tripTypeBreakdown = useMemo(() => {
    let loading = 0, unloading = 0, siteToSite = 0, other = 0;
    filteredTrips.forEach((trip) => {
      const type = getTripType(trip);
      const count = getTripCount(trip);
      if (type === "Loading") loading += count;
      else if (type === "Unloading") unloading += count;
      else if (type === "Site to Site") siteToSite += count;
      else other += count;
    });
    return { loading, unloading, siteToSite, other };
  }, [filteredTrips]);

  // Vehicle summary
  const vehicleSummary = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const vehicle = getVehicleNumber(trip) || "No Vehicle";
      const count = getTripCount(trip);
      const type = getTripType(trip);
      if (!map.has(vehicle)) {
        map.set(vehicle, { total: 0, loading: 0, unloading: 0, siteToSite: 0 });
      }
      const data = map.get(vehicle);
      data.total += count;
      if (type === "Loading") data.loading += count;
      else if (type === "Unloading") data.unloading += count;
      else if (type === "Site to Site") data.siteToSite += count;
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([vehicle, data]) => ({ vehicle, ...data }));
  }, [filteredTrips]);

  const totalTrips = useMemo(() => {
    return filteredTrips.reduce((sum, trip) => sum + getTripCount(trip), 0);
  }, [filteredTrips]);

  const totalRecords = filteredTrips.length;

  // Date navigation
  const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(todayISO());

  // Open full view
  const openFullView = () => setViewMode("fullview");
  const closeFullView = () => setViewMode("list");

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setFilterVehicle("");
    setFilterParty("");
  };

  // Print
  const handlePrint = () => window.print();

  // Export CSV
  const exportCSV = () => {
    if (filteredTrips.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = ["Date", "Vehicle No.", "Party Name", "Site / Location", "Product", "Trip Type", "Trips"];
    const rows = filteredTrips.map((trip) => [
      formatDate(trip?.date || trip?.createdAt),
      getVehicleNumber(trip),
      getPartyName(trip),
      getSite(trip),
      getProduct(trip),
      getTripType(trip),
      getTripCount(trip),
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-report-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayDate = formatDate(selectedDate);
  const displayDateWithDay = formatDateWithDay(selectedDate);
  const isFilterActive = filterVehicle || filterParty || searchQuery;
  const isToday = selectedDate === todayISO();

  const getTypeBadgeClass = (type) => {
    if (type === "Loading") return "trip-type-loading";
    if (type === "Unloading") return "trip-type-unloading";
    if (type === "Site to Site") return "trip-type-site";
    return "trip-type-other";
  };

  // ============================================================
  // RENDER: LIST VIEW
  // ============================================================
  if (viewMode === "list") {
    return (
      <div className="daily-report-page">
        {/* HEADER */}
        <header className="daily-report-header">
          <div className="daily-report-title">
            <div className="daily-report-icon">
              <FileText size={22} strokeWidth={1.8} />
            </div>
            <div>
              <span className="section-kicker">📋 DAILY REPORT</span>
              <h1>Daily Trip Report</h1>
              <p>
                {displayDateWithDay}
                {isToday && <span className="today-badge">Today</span>}
              </p>
            </div>
          </div>
          <div className="daily-report-actions">
            <button type="button" className="daily-btn daily-btn-light" onClick={loadData}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="daily-btn daily-btn-light" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
            <button type="button" className="daily-btn daily-btn-primary" onClick={openFullView}>
              <Eye size={14} /> View Full Report
            </button>
            <button type="button" className="daily-btn daily-btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
          </div>
        </header>

        {/* DATE NAV */}
        <section className="daily-date-nav">
          <button type="button" className="daily-nav-btn" onClick={goToPreviousDay}>
            <ChevronLeft size={16} /> Previous
          </button>
          <button type="button" className={`daily-nav-btn daily-nav-today ${isToday ? "active" : ""}`} onClick={goToToday}>
            <Calendar size={14} /> Today
          </button>
          <button type="button" className="daily-nav-btn" onClick={goToNextDay}>
            Next <ChevronRight size={16} />
          </button>
        </section>

        {/* CONTROLS */}
        <section className="daily-report-controls">
          <div className="daily-date-picker">
            <div className="daily-date-input-wrap">
              <CalendarDays size={15} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <span className="daily-date-display">
              <Calendar size={13} /> {displayDate}
            </span>
          </div>

          <div className="daily-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search vehicle, party, site, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="daily-btn daily-btn-light daily-btn-small"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={13} /> {showFilters ? "Hide Filters" : "Filters"}
          </button>

          {isFilterActive && (
            <button
              type="button"
              className="daily-btn daily-btn-ghost daily-btn-small"
              onClick={resetFilters}
            >
              <X size={12} /> Clear All
            </button>
          )}
        </section>

        {/* FILTERS PANEL */}
        {showFilters && (
          <section className="daily-filters-panel">
            <div className="daily-filter-group">
              <label>🚜 Vehicle</label>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
              >
                <option value="">All Vehicles</option>
                {uniqueVehicles.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="daily-filter-group">
              <label>👤 Party</label>
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
              >
                <option value="">All Parties</option>
                {uniqueParties.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* STATS */}
        <section className="daily-stats">
          <div className="daily-stat daily-stat-blue">
            <div className="daily-stat-icon"><FileText size={16} /></div>
            <div><span>Total Records</span><strong>{totalRecords}</strong></div>
          </div>
          <div className="daily-stat daily-stat-green">
            <div className="daily-stat-icon"><Truck size={16} /></div>
            <div><span>Total Trips</span><strong>{totalTrips}</strong></div>
          </div>
          <div className="daily-stat daily-stat-amber">
            <div className="daily-stat-icon"><Users size={16} /></div>
            <div><span>Unique Parties</span><strong>{new Set(filteredTrips.map(getPartyName).filter(Boolean)).size}</strong></div>
          </div>
          <div className="daily-stat daily-stat-purple">
            <div className="daily-stat-icon"><ArrowUpRight size={16} /></div>
            <div><span>Unique Vehicles</span><strong>{new Set(filteredTrips.map(getVehicleNumber).filter(Boolean)).size}</strong></div>
          </div>
        </section>

        {/* MAIN CARD */}
        <section className="daily-report-card">
          <div className="daily-report-card-header">
            <div>
              <h2>Trip Details</h2>
              <p>All trips recorded on <strong>{displayDateWithDay}</strong></p>
            </div>
            <span className="daily-record-count">{filteredTrips.length} records</span>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="daily-empty">
              <FileText size={36} strokeWidth={1.2} />
              <strong>No trips found for this date</strong>
              <p>Try selecting a different date or clear the filters.</p>
            </div>
          ) : (
            <>
              <div className="daily-table-wrap">
                <table className="daily-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Vehicle No.</th>
                      <th>Party Name</th>
                      <th>Site / Location</th>
                      <th>Product</th>
                      <th>Trip Type</th>
                      <th className="daily-col-center">Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrips.map((trip, index) => {
                      const type = getTripType(trip);
                      return (
                        <tr key={trip?.id || `trip-${index}`}>
                          <td className="daily-row-num">{index + 1}</td>
                          <td>{formatDate(trip?.date || trip?.createdAt)}</td>
                          <td><strong>{getVehicleNumber(trip) || "—"}</strong></td>
                          <td>{getPartyName(trip) || "—"}</td>
                          <td>{getSite(trip) || "—"}</td>
                          <td>{getProduct(trip) || "—"}</td>
                          <td>
                            <span className={`daily-type-badge ${getTypeBadgeClass(type)}`}>
                              {type}
                            </span>
                          </td>
                          <td className="daily-col-center">
                            <span className="daily-trip-badge">
                              {getTripCount(trip)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* BREAKDOWN */}
              <div className="daily-breakdown-section">
                <div className="daily-breakdown-grid">
                  <div className="daily-breakdown-item loading">
                    <span>Loading</span>
                    <strong>{tripTypeBreakdown.loading}</strong>
                  </div>
                  <div className="daily-breakdown-item unloading">
                    <span>Unloading</span>
                    <strong>{tripTypeBreakdown.unloading}</strong>
                  </div>
                  <div className="daily-breakdown-item site">
                    <span>Site to Site</span>
                    <strong>{tripTypeBreakdown.siteToSite}</strong>
                  </div>
                  <div className="daily-breakdown-item total">
                    <span>Total Trips</span>
                    <strong>{totalTrips}</strong>
                  </div>
                </div>
              </div>

              {/* VEHICLE SUMMARY */}
              <div className="daily-summary-section">
                <h3>Vehicle-Wise Trip Summary</h3>
                <div className="daily-vehicle-summary-grid">
                  {vehicleSummary.map(({ vehicle, total, loading, unloading, siteToSite }) => (
                    <div key={vehicle} className="daily-vehicle-summary-item">
                      <strong>{vehicle}</strong>
                      <span className="daily-vehicle-count">
                        {total} Trip{total > 1 ? "s" : ""}
                        {loading > 0 && ` · Loading: ${loading}`}
                        {unloading > 0 && ` · Unloading: ${unloading}`}
                        {siteToSite > 0 && ` · Site-Site: ${siteToSite}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="daily-total-row">
                  <span>Total Trips</span>
                  <strong>{totalTrips}</strong>
                </div>
              </div>

              {/* FOOTER */}
              <div className="daily-report-footer">
                <span className="daily-company">{business.businessName || "SAO AUTO TRACTOR"}</span>
                <span className="daily-footer-date">
                  Generated: {formatDateWithDay(new Date().toISOString())}
                </span>
              </div>
            </>
          )}
        </section>

        <footer className="daily-page-footer">
          <strong>{business.businessName || "SAO AUTO TRACTOR"}</strong> <span>•</span> Daily Trip Report
        </footer>
      </div>
    );
  }

  // ============================================================
  // RENDER: FULL VIEW (Image style)
  // ============================================================
  if (viewMode === "fullview") {
    return (
      <div className="fullview-page">

        {/* TOOLBAR */}
        <div className="fullview-toolbar">
          <button type="button" className="fullview-back-btn" onClick={closeFullView}>
            <ArrowLeft size={18} /> Back to List
          </button>
          <button type="button" className="fullview-print-btn" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
        </div>

        {/* REPORT */}
        <div className="fullview-report" id="fullview-report">

          {/* Header */}
          <div className="fullview-header">
            <h1>{business.businessName || "SAO AUTO TRACTOR"}</h1>
            <div className="fullview-meta">
              <span>DAILY TRIP REPORT</span>
              <span>{displayDateWithDay}</span>
            </div>
          </div>

          {/* Table */}
          <table className="fullview-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle No.</th>
                <th>Party Name</th>
                <th>Site / Location</th>
                <th>Product</th>
                <th className="fullview-col-center">Trips</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip, index) => {
                const isFirstRow = index === 0;
                const isNewVehicle = index === 0 || getVehicleNumber(trip) !== getVehicleNumber(filteredTrips[index - 1]);
                return (
                  <tr key={trip?.id || `trip-${index}`}>
                    <td>{isFirstRow ? displayDate : ""}</td>
                    <td>
                      <strong>{isNewVehicle ? (getVehicleNumber(trip) || "—") : ""}</strong>
                    </td>
                    <td>{getPartyName(trip) || "—"}</td>
                    <td>{getSite(trip) || "—"}</td>
                    <td>{getProduct(trip) || "—"}</td>
                    <td className="fullview-col-center">
                      <span className="fullview-trip-badge">{getTripCount(trip)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Vehicle Summary */}
          <div className="fullview-summary">
            <h3>Vehicle-Wise Trip Summary</h3>
            <div className="fullview-vehicle-summary">
              {vehicleSummary.map(({ vehicle, total }) => (
                <div key={vehicle} className="fullview-vehicle-item">
                  <span>{vehicle}:</span>
                  <strong>{total} Trips</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="fullview-total">
            <span>Total Trips</span>
            <strong>{totalTrips}</strong>
          </div>

          {/* Footer */}
          <div className="fullview-footer">
            <span>This is a computer-generated report. Thank you for your business.</span>
          </div>

        </div>
      </div>
    );
  }

  return null;
}

export default DailyReport;