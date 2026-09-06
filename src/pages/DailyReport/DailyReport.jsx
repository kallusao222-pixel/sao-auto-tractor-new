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
} from "lucide-react";
import "./DailyReport.css";   // ✅ Same folder mein

const TRIPS_KEY = "saoAutoTractorTrips";

/* ============================================================
   HELPERS
============================================================ */

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function DailyReport() {
  const [trips, setTrips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterParty, setFilterParty] = useState("");

  const loadTrips = () => {
    const data = readStorage(TRIPS_KEY);
    setTrips(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadTrips();
    const interval = setInterval(loadTrips, 2000);
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

  const dayTrips = useMemo(() => {
    if (!selectedDate) return [];
    return trips.filter((trip) => {
      const tripDate = String(trip?.date || trip?.createdAt || "").split("T")[0];
      return tripDate === selectedDate;
    });
  }, [trips, selectedDate]);

  const filteredTrips = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return dayTrips.filter((trip) => {
      const vehicle = getVehicleNumber(trip).toLowerCase();
      const party = getPartyName(trip).toLowerCase();
      const site = getSite(trip).toLowerCase();
      const product = getProduct(trip).toLowerCase();

      if (filterVehicle && vehicle !== filterVehicle.toLowerCase()) return false;
      if (filterParty && party !== filterParty.toLowerCase()) return false;

      if (query) {
        const haystack = `${vehicle} ${party} ${site} ${product}`;
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [dayTrips, searchQuery, filterVehicle, filterParty]);

  const vehicleSummary = useMemo(() => {
    const map = new Map();
    filteredTrips.forEach((trip) => {
      const vehicle = getVehicleNumber(trip) || "No Vehicle";
      const count = getTripCount(trip);
      map.set(vehicle, (map.get(vehicle) || 0) + count);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTrips]);

  const totalTrips = useMemo(() => {
    return filteredTrips.reduce((sum, trip) => sum + getTripCount(trip), 0);
  }, [filteredTrips]);

  const totalRecords = filteredTrips.length;

  const resetFilters = () => {
    setSearchQuery("");
    setFilterVehicle("");
    setFilterParty("");
  };

  const handlePrint = () => window.print();

  const exportCSV = () => {
    if (filteredTrips.length === 0) {
      alert("No records to export.");
      return;
    }

    const headers = ["Date", "Vehicle No.", "Party Name", "Site / Location", "Product", "Trips"];
    const rows = filteredTrips.map((trip) => [
      formatDate(trip?.date || trip?.createdAt),
      getVehicleNumber(trip),
      getPartyName(trip),
      getSite(trip),
      getProduct(trip),
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

  return (
    <div className="daily-report-page">
      <header className="daily-report-header">
        <div className="daily-report-title">
          <div className="daily-report-icon">
            <FileText size={20} />
          </div>
          <div>
            <span className="section-kicker">DAILY REPORT</span>
            <h1>Daily Trip Report</h1>
            <p>Complete trip summary for a single day.</p>
          </div>
        </div>

        <div className="daily-report-actions">
          <button type="button" className="daily-btn daily-btn-light" onClick={loadTrips}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="daily-btn daily-btn-light" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button type="button" className="daily-btn daily-btn-primary" onClick={handlePrint}>
            <Printer size={14} /> Print
          </button>
        </div>
      </header>

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
          <span className="daily-date-display">{displayDate}</span>
        </div>

        <div className="daily-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search vehicle, party, site..."
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

        {(filterVehicle || filterParty || searchQuery) && (
          <button
            type="button"
            className="daily-btn daily-btn-ghost daily-btn-small"
            onClick={resetFilters}
          >
            <X size={12} /> Reset
          </button>
        )}
      </section>

      {showFilters && (
        <section className="daily-filters-panel">
          <div className="daily-filter-group">
            <label>Vehicle</label>
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
            <label>Party</label>
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

      <section className="daily-stats">
        <div className="daily-stat">
          <div className="daily-stat-icon"><FileText size={16} /></div>
          <div><span>Total Records</span><strong>{totalRecords}</strong></div>
        </div>
        <div className="daily-stat">
          <div className="daily-stat-icon"><Truck size={16} /></div>
          <div><span>Total Trips</span><strong>{totalTrips}</strong></div>
        </div>
        <div className="daily-stat">
          <div className="daily-stat-icon"><Users size={16} /></div>
          <div><span>Unique Parties</span><strong>{new Set(filteredTrips.map(getPartyName).filter(Boolean)).size}</strong></div>
        </div>
        <div className="daily-stat">
          <div className="daily-stat-icon"><ArrowUpRight size={16} /></div>
          <div><span>Unique Vehicles</span><strong>{new Set(filteredTrips.map(getVehicleNumber).filter(Boolean)).size}</strong></div>
        </div>
      </section>

      <section className="daily-report-card">
        <div className="daily-report-card-header">
          <div>
            <h2>Trip Details</h2>
            <p>All trips recorded on {displayDate}</p>
          </div>
          <span className="daily-record-count">{filteredTrips.length} records</span>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="daily-empty">
            <FileText size={32} />
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
                    <th className="daily-col-center">Trips</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip, index) => (
                    <tr key={trip?.id || `trip-${index}`}>
                      <td className="daily-row-num">{index + 1}</td>
                      <td>{formatDate(trip?.date || trip?.createdAt)}</td>
                      <td><strong>{getVehicleNumber(trip) || "—"}</strong></td>
                      <td>{getPartyName(trip) || "—"}</td>
                      <td>{getSite(trip) || "—"}</td>
                      <td>{getProduct(trip) || "—"}</td>
                      <td className="daily-col-center">
                        <span className="daily-trip-badge">{getTripCount(trip)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="daily-summary-section">
              <h3>Vehicle-Wise Trip Summary</h3>
              <div className="daily-vehicle-summary-grid">
                {vehicleSummary.map(([vehicle, count]) => (
                  <div key={vehicle} className="daily-vehicle-summary-item">
                    <strong>{vehicle}</strong>
                    <span className="daily-vehicle-count">{count} Trips</span>
                  </div>
                ))}
              </div>
              <div className="daily-total-row">
                <span>Total Trips</span>
                <strong>{totalTrips}</strong>
              </div>
            </div>

            <div className="daily-report-footer">
              <span className="daily-company">SAO AUTO TRACTOR</span>
              <span className="daily-footer-date">Generated on: {formatDate(new Date().toISOString())}</span>
            </div>
          </>
        )}
      </section>

      <footer className="daily-page-footer">
        <strong>SAO AUTO TRACTOR</strong> <span>•</span> Daily Trip Report
      </footer>
    </div>
  );
}

export default DailyReport;