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
  ArrowLeft,
} from "lucide-react";

import "./DailyReport.css";

const TRIPS_KEY = "saoAutoTractorTrips";

/* ============================================================
   STORAGE
============================================================ */

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to read localStorage key: ${key}`, error);
    return [];
  }
}


/* ============================================================
   DATE HELPERS
============================================================ */

function formatDate(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function todayISO() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* ============================================================
   DATA HELPERS
============================================================ */

function getVehicleNumber(trip) {
  return (
    trip?.vehicleNumber ??
    trip?.tractorNumber ??
    trip?.vehicleNo ??
    ""
  );
}

function getPartyName(trip) {
  return (
    trip?.partyName ??
    trip?.party ??
    ""
  );
}

function getSite(trip) {
  return (
    trip?.site ??
    trip?.location ??
    trip?.loadingAddress ??
    trip?.unloadingAddress ??
    trip?.address ??
    ""
  );
}

function getProduct(trip) {
  return (
    trip?.material ??
    trip?.materialName ??
    trip?.product ??
    ""
  );
}


/* ============================================================
   TRIP TYPE
============================================================ */

function getTripType(trip) {
  return (
    trip?.tripType ??
    trip?.workType ??
    trip?.type ??
    ""
  );
}

function normalizeTripTypeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getNormalizedTripType(trip) {
  const raw = normalizeTripTypeText(getTripType(trip));

  if (
    raw === "unloading" ||
    raw === "unload" ||
    raw.includes("unloading") ||
    raw.includes("unload")
  ) {
    return "unloading";
  }

  if (
    raw === "site to site" ||
    raw === "site-to-site" ||
    raw.includes("site to site")
  ) {
    return "siteToSite";
  }

  if (
    raw === "other" ||
    raw === "others" ||
    raw === "misc" ||
    raw === "miscellaneous"
  ) {
    return "other";
  }

  if (
    raw === "loading" ||
    raw === "load" ||
    raw.includes("loading") ||
    raw.includes("load")
  ) {
    return "loading";
  }

  return "loading";
}

function getDisplayTripType(trip) {
  const type = getNormalizedTripType(trip);

  if (type === "unloading") {
    return "Unloading";
  }

  if (type === "siteToSite") {
    return "Site to Site";
  }

  if (type === "other") {
    return "Other";
  }

  return "Loading";
}

function getDisplaySite(trip) {
  const site = String(getSite(trip) || "").trim();
  const tripType = getDisplayTripType(trip);

  if (site) {
    return `${site} (${tripType})`;
  }

  return `(${tripType})`;
}


/* ============================================================
   TRIP COUNT
============================================================ */

function getTripCount(trip) {
  const rawQuantity =
    trip?.quantity ??
    trip?.trips ??
    1;

  const quantity = Number(rawQuantity);

  return Number.isFinite(quantity) && quantity > 0
    ? quantity
    : 1;
}


/*
  IMPORTANT BUSINESS RULE:

  Loading + Unloading = ONE actual trip.

  Therefore:
  - Loading is counted
  - Site to Site is counted
  - Other is counted
  - Unloading is NOT counted again

  Unloading records still remain visible in the report.
*/

function getCountedTripQuantity(trip) {
  const tripType = getNormalizedTripType(trip);

  switch (tripType) {
    case "unloading":
      return 0;

    case "loading":
    case "siteToSite":
    case "other":
      return getTripCount(trip);

    default:
      return 0;
  }
}


/* ============================================================
   CSV HELPERS
============================================================ */

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}


/* ============================================================
   COMPONENT
============================================================ */

export default function DailyReport() {
  const [trips, setTrips] = useState([]);

  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [searchQuery, setSearchQuery] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  const [filterVehicle, setFilterVehicle] = useState("");

  const [filterParty, setFilterParty] = useState("");

  const [showFullReport, setShowFullReport] = useState(false);


  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const loadTrips = () => {
    const storedTrips = readStorage(TRIPS_KEY);

    setTrips(storedTrips);
  };

  useEffect(() => {
    loadTrips();

    const interval = window.setInterval(() => {
      loadTrips();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);


  /* ==========================================================
     FILTER OPTIONS
  ========================================================== */

  const vehicleOptions = useMemo(() => {
    const values = trips
      .map((trip) => getVehicleNumber(trip))
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return Array.from(new Set(values)).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [trips]);


  const partyOptions = useMemo(() => {
    const values = trips
      .map((trip) => getPartyName(trip))
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return Array.from(new Set(values)).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [trips]);


  /* ==========================================================
     DAY FILTER
  ========================================================== */

  const dayTrips = useMemo(() => {
    return trips.filter((trip) => {
      const tripDate =
        trip?.date ??
        trip?.createdAt ??
        "";

      const normalizedDate = String(tripDate).split("T")[0];

      return normalizedDate === selectedDate;
    });
  }, [trips, selectedDate]);


  /* ==========================================================
     SEARCH + FILTER
  ========================================================== */

  const filteredTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return dayTrips.filter((trip) => {
      const vehicle = String(getVehicleNumber(trip) || "");
      const party = String(getPartyName(trip) || "");
      const site = String(getSite(trip) || "");
      const product = String(getProduct(trip) || "");
      const tripType = getDisplayTripType(trip);
      const displaySite = getDisplaySite(trip);

      const matchesVehicle =
        !filterVehicle ||
        vehicle === filterVehicle;

      const matchesParty =
        !filterParty ||
        party === filterParty;

      if (!matchesVehicle || !matchesParty) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        vehicle,
        party,
        site,
        product,
        tripType,
        displaySite,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [
    dayTrips,
    searchQuery,
    filterVehicle,
    filterParty,
  ]);


  /* ==========================================================
     VEHICLE SUMMARY
  ========================================================== */

  const vehicleSummary = useMemo(() => {
  const map = new Map();

  filteredTrips.forEach((trip) => {
    const vehicle =
      String(getVehicleNumber(trip) || "No Vehicle").trim();

    const count = getTripCount(trip);
    const type = getNormalizedTripType(trip);

    if (!map.has(vehicle)) {
      map.set(vehicle, {
        vehicle,
        loading: 0,
        unloading: 0,
        siteToSite: 0,
        other: 0,
        total: 0,
      });
    }

    const summary = map.get(vehicle);

    switch (type) {
      case "unloading":
        // Visible record, but NOT an additional trip.
        summary.unloading += count;
        break;

      case "siteToSite":
        summary.siteToSite += count;
        summary.total += count;
        break;

      case "other":
        summary.other += count;
        summary.total += count;
        break;

      case "loading":
      default:
        summary.loading += count;
        summary.total += count;
        break;
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.vehicle.localeCompare(b.vehicle, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}, [filteredTrips]);


  /* ==========================================================
     KPI TOTALS
  ========================================================== */

  /*
    Total Trips:
    Unloading is deliberately excluded because it is already
    part of the Loading trip.
  */

  const totalTrips = useMemo(() => {
  return filteredTrips.reduce(
    (total, trip) => total + getCountedTripQuantity(trip),
    0
  );
}, [filteredTrips]);


  /*
    Vehicle-wise total should match the same business rule.
  */

  const vehicleWiseTotalTrips = useMemo(() => {
  return vehicleSummary.reduce(
    (total, summary) => total + summary.total,
    0
  );
}, [vehicleSummary]);


  /*
    Total Records counts every visible row, including unloading.
  */

  const totalRecords = filteredTrips.length;


  const uniquePartyCount = useMemo(() => {
    return new Set(
      filteredTrips
        .map(getPartyName)
        .filter(Boolean)
    ).size;
  }, [filteredTrips]);


  const uniqueVehicleCount = useMemo(() => {
    return new Set(
      filteredTrips
        .map(getVehicleNumber)
        .filter(Boolean)
    ).size;
  }, [filteredTrips]);


  /* ==========================================================
     FILTER RESET
  ========================================================== */

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(filterVehicle) ||
    Boolean(filterParty);

  const resetFilters = () => {
    setSearchQuery("");
    setFilterVehicle("");
    setFilterParty("");
  };


  /* ==========================================================
     PRINT
  ========================================================== */

  const handlePrint = () => {
    window.print();
  };


  /* ==========================================================
     CSV EXPORT
  ========================================================== */

  const handleExportCsv = () => {
    if (!filteredTrips.length) {
      window.alert("No records available to export.");
      return;
    }

    const headers = [
      "Date",
      "Vehicle No.",
      "Party Name",
      "Site / Location",
      "Product",
      "Trips",
    ];

    const rows = filteredTrips.map((trip) => {
      const tripDate =
        trip?.date ??
        trip?.createdAt ??
        selectedDate;

      return [
        formatDate(tripDate),
        getVehicleNumber(trip),
        getPartyName(trip),
        getDisplaySite(trip),
        getProduct(trip),
        getTripCount(trip),
      ];
    });

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(escapeCsvValue)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      `daily-report-${selectedDate}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };


  /* ==========================================================
     FULL REPORT
  ========================================================== */

  if (showFullReport) {
    return (
      <div className="daily-full-report-page">

        <div className="daily-full-report-toolbar">

          <button
            type="button"
            className="daily-btn daily-btn-light"
            onClick={() => setShowFullReport(false)}
          >
            <ArrowLeft size={15} />
            Back to List
          </button>

          <button
            type="button"
            className="daily-btn daily-btn-primary"
            onClick={handlePrint}
          >
            <Printer size={15} />
            Print / Save PDF
          </button>

        </div>


        <main className="daily-print-report">

          <header className="daily-print-header">

            <div className="daily-print-company">
              SAO AUTO TRACTOR
            </div>

            <div className="daily-print-kicker">
              DAILY TRIP REPORT
            </div>

            <div className="daily-print-date">
              {formatDate(selectedDate)}
            </div>

          </header>


          {!filteredTrips.length ? (
            <div className="daily-print-empty">
              No trips found for this date.
            </div>
          ) : (
            <>
              <section className="daily-print-table-section">

                <table className="daily-print-table">

                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Vehicle No.</th>
                      <th>Party Name</th>
                      <th>Site / Location</th>
                      <th>Product</th>
                      <th className="daily-print-center">
                        Trips
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredTrips.map((trip, index) => {
                      const tripDate =
                        trip?.date ??
                        trip?.createdAt ??
                        selectedDate;

                      return (
                        <tr key={trip?.id ?? `${tripDate}-${index}`}>

                          <td>
                            {formatDate(tripDate)}
                          </td>

                          <td>
                            <strong>
                              {getVehicleNumber(trip) || "-"}
                            </strong>
                          </td>

                          <td>
                            {getPartyName(trip) || "-"}
                          </td>

                          <td className="daily-print-site">
                            {getDisplaySite(trip)}
                          </td>

                          <td>
                            {getProduct(trip) || "-"}
                          </td>

                          <td className="daily-print-center">
                            {getTripCount(trip)}
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </section>


              <section className="daily-print-summary">

                <div className="daily-print-summary-heading">

                  <div>
                    <h2>
                      Vehicle-Wise Trip Summary
                    </h2>

                    <p>
                      Unloading records are shown separately
                      and excluded from vehicle-wise total trips.
                    </p>
                  </div>

                </div>


                <div className="daily-print-summary-list">

                  {vehicleSummary.map((summary) => (
                    <div
                      className="daily-print-vehicle"
                      key={summary.vehicle}
                    >

                      <div className="daily-print-vehicle-main">

                        <strong>
                          {summary.vehicle}
                        </strong>

                        <span>
                          Total: {summary.total}
                        </span>

                      </div>


                      <div className="daily-print-breakdown">

                        <span className="daily-print-chip-loading">
                          Loading
                          <b>{summary.loading}</b>
                        </span>

                        <span className="daily-print-chip-unloading">
                          Unloading
                          <b>{summary.unloading}</b>
                        </span>

                        <span className="daily-print-chip-site">
                          Site to Site
                          <b>{summary.siteToSite}</b>
                        </span>

                        <span className="daily-print-chip-other">
                          Other
                          <b>{summary.other}</b>
                        </span>

                      </div>

                    </div>
                  ))}

                </div>


                <div className="daily-print-total">

                  <span>
                    Total Trips
                  </span>

                  <strong>
                    {vehicleWiseTotalTrips}
                  </strong>

                </div>

              </section>


              <footer className="daily-print-footer">

                <span>
                  Computer-generated report
                </span>

                <span>
                  Thank you
                </span>

              </footer>

            </>
          )}

        </main>

      </div>
    );
  }


  /* ==========================================================
     NORMAL REPORT
  ========================================================== */

  return (
    <div className="daily-report-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="daily-report-header">

        <div className="daily-report-title">

          <div className="daily-report-icon">
            <FileText size={22} />
          </div>

          <div>

            <span className="section-kicker">
              Daily Report
            </span>

            <h1>
              Daily Trip Report
            </h1>

            <p>
              Complete trip summary for a single day.
            </p>

          </div>

        </div>


        <div className="daily-report-actions">

          <button
            type="button"
            className="daily-btn daily-btn-light"
            onClick={loadTrips}
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button
            type="button"
            className="daily-btn daily-btn-light"
            onClick={handleExportCsv}
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            type="button"
            className="daily-btn daily-btn-primary"
            onClick={() => setShowFullReport(true)}
          >
            <ArrowUpRight size={14} />
            View Full Report
          </button>

          <button
            type="button"
            className="daily-btn daily-btn-light"
            onClick={handlePrint}
          >
            <Printer size={14} />
            Print
          </button>

        </div>

      </header>


      {/* ======================================================
          CONTROLS
      ====================================================== */}

      <section className="daily-report-controls">

        <div className="daily-date-picker">

          <div className="daily-date-input-wrap">

            <CalendarDays size={15} />

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(event.target.value)
              }
              aria-label="Select report date"
            />

          </div>

          <div className="daily-date-display">
            {formatDate(selectedDate)}
          </div>

        </div>


        <div className="daily-search-box">

          <Search size={15} />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search vehicle, party, site, product..."
            aria-label="Search daily report"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

        </div>


        <button
          type="button"
          className={`daily-btn ${
            showFilters
              ? "daily-btn-primary"
              : "daily-btn-light"
          }`}
          onClick={() =>
            setShowFilters((current) => !current)
          }
        >
          <Filter size={14} />

          Filters

          {showFilters ? (
            <X size={13} />
          ) : null}

        </button>


        {hasActiveFilters && (
          <button
            type="button"
            className="daily-btn daily-btn-ghost"
            onClick={resetFilters}
          >
            Reset
          </button>
        )}

      </section>


      {/* ======================================================
          FILTER PANEL
      ====================================================== */}

      {showFilters && (
        <section className="daily-filters-panel">

          <div className="daily-filter-group">

            <label htmlFor="daily-filter-vehicle">
              Vehicle
            </label>

            <select
              id="daily-filter-vehicle"
              value={filterVehicle}
              onChange={(event) =>
                setFilterVehicle(event.target.value)
              }
            >
              <option value="">
                All Vehicles
              </option>

              {vehicleOptions.map((vehicle) => (
                <option
                  value={vehicle}
                  key={vehicle}
                >
                  {vehicle}
                </option>
              ))}
            </select>

          </div>


          <div className="daily-filter-group">

            <label htmlFor="daily-filter-party">
              Party
            </label>

            <select
              id="daily-filter-party"
              value={filterParty}
              onChange={(event) =>
                setFilterParty(event.target.value)
              }
            >
              <option value="">
                All Parties
              </option>

              {partyOptions.map((party) => (
                <option
                  value={party}
                  key={party}
                >
                  {party}
                </option>
              ))}
            </select>

          </div>

        </section>
      )}


      {/* ======================================================
          KPI STATS
      ====================================================== */}

      <section className="daily-stats">

        <div className="daily-stat">

          <div className="daily-stat-icon">
            <FileText size={17} />
          </div>

          <div>

            <span>
              Total Records
            </span>

            <strong>
              {totalRecords}
            </strong>

          </div>

        </div>


        <div className="daily-stat">

          <div className="daily-stat-icon">
            <Truck size={17} />
          </div>

          <div>

            <span>
              Total Trips
            </span>

            <strong>
              {totalTrips}
            </strong>

          </div>

        </div>


        <div className="daily-stat">

          <div className="daily-stat-icon">
            <Users size={17} />
          </div>

          <div>

            <span>
              Unique Parties
            </span>

            <strong>
              {uniquePartyCount}
            </strong>

          </div>

        </div>


        <div className="daily-stat">

          <div className="daily-stat-icon">
            <Truck size={17} />
          </div>

          <div>

            <span>
              Unique Vehicles
            </span>

            <strong>
              {uniqueVehicleCount}
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          MAIN REPORT CARD
      ====================================================== */}

      <section className="daily-report-card">

        <div className="daily-report-card-header">

          <div>

            <h2>
              Trip Details
            </h2>

            <p>
              Loading, unloading and site movement records
              for the selected date.
            </p>

          </div>

          <div className="daily-record-count">
            {filteredTrips.length} Records
          </div>

        </div>


        {filteredTrips.length === 0 ? (

          <div className="daily-empty">

            <FileText size={30} />

            <strong>
              No trips found
            </strong>

            <p>
              There are no trip records matching the
              selected date and filters.
            </p>

          </div>

        ) : (

          <>

            {/* ==================================================
                TRIP TABLE
            ================================================== */}

            <div className="daily-table-wrap">

              <table className="daily-table">

                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Vehicle No.
                    </th>

                    <th>
                      Party Name
                    </th>

                    <th>
                      Site / Location
                    </th>

                    <th>
                      Product
                    </th>

                    <th className="daily-col-center">
                      Trips
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredTrips.map((trip, index) => {

                    const tripDate =
                      trip?.date ??
                      trip?.createdAt ??
                      selectedDate;

                    return (
                      <tr
                        key={
                          trip?.id ??
                          `${tripDate}-${index}`
                        }
                      >

                        <td className="daily-row-num">
                          {index + 1}
                        </td>

                        <td>
                          {formatDate(tripDate)}
                        </td>

                        <td>

                          <strong>
                            {getVehicleNumber(trip) || "-"}
                          </strong>

                        </td>

                        <td>
                          {getPartyName(trip) || "-"}
                        </td>

                        <td>

                          <span className="daily-site-location">
                            {getDisplaySite(trip)}
                          </span>

                        </td>

                        <td>
                          {getProduct(trip) || "-"}
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


            {/* ==================================================
                VEHICLE SUMMARY
            ================================================== */}

            <section className="daily-summary-section">

              <h3>
                Vehicle-Wise Trip Summary
              </h3>

              <p className="daily-summary-note">
                Unloading is shown separately and excluded
                from vehicle-wise total because Loading +
                Unloading represents one actual trip.
              </p>


              <div className="daily-vehicle-summary-grid">

                {vehicleSummary.map((summary) => (
                  <div
                    className="daily-vehicle-summary-item"
                    key={summary.vehicle}
                  >

                    <div className="daily-vehicle-summary-top">

                      <strong>
                        {summary.vehicle}
                      </strong>

                      <span className="daily-vehicle-total">
                        Total: {summary.total}
                      </span>

                    </div>


                    <div className="daily-vehicle-breakdown">

                      <span className="daily-summary-chip daily-summary-chip-loading">
                        Loading
                        <strong>
                          {summary.loading}
                        </strong>
                      </span>


                      <span className="daily-summary-chip daily-summary-chip-unloading">
                        Unloading
                        <strong>
                          {summary.unloading}
                        </strong>
                      </span>


                      <span className="daily-summary-chip daily-summary-chip-site">
                        Site to Site
                        <strong>
                          {summary.siteToSite}
                        </strong>
                      </span>


                      <span className="daily-summary-chip daily-summary-chip-other">
                        Other
                        <strong>
                          {summary.other}
                        </strong>
                      </span>

                    </div>

                  </div>
                ))}

              </div>


              <div className="daily-total-row">

                <span>
                  Total Trips
                </span>

                <strong>
                  {vehicleWiseTotalTrips}
                </strong>

              </div>

            </section>


            {/* ==================================================
                CARD FOOTER
            ================================================== */}

            <footer className="daily-report-footer">

              <span>
                <span className="daily-company">
                  SAO AUTO TRACTOR
                </span>
                {" "}— Daily Trip Report
              </span>

              <span className="daily-footer-date">
                {formatDate(selectedDate)}
              </span>

            </footer>

          </>

        )}

      </section>


      {/* ======================================================
          PAGE FOOTER
      ====================================================== */}

      <div className="daily-page-footer">

        <span>
          Daily Report
        </span>

        <span>
          •
        </span>

        <strong>
          SAO AUTO TRACTOR
        </strong>

      </div>

    </div>
  );
}