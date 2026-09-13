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
  ClipboardList,
  BarChart3,
  Layers3,
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

const readTrips = () => {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTrips = (trips) => {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
};

const normalizeDate = (value) => {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) return "";

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const getToday = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatDate = (value) => {
  const normalized = normalizeDate(value);

  if (!normalized) return "—";

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
};

const formatLongDate = (value) => {
  const normalized = normalizeDate(value);

  if (!normalized) return "—";

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  const number = Number(value) || 0;

  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const formatNumber = (value) => {
  const number = Number(value) || 0;

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getTripType = (trip) => {
  const raw = String(
    trip?.tripType ?? trip?.type ?? trip?.workType ?? ""
  )
    .trim()
    .toLowerCase();

  return TRIP_TYPE_LABELS[raw] || trip?.tripType || "Other";
};

const getVehicle = (trip) =>
  String(
    trip?.vehicleNumber ??
      trip?.tractorNumber ??
      trip?.vehicleNo ??
      ""
  ).trim();

const getParty = (trip) =>
  String(trip?.partyName ?? trip?.party ?? "").trim();

const getMaterial = (trip) =>
  String(trip?.materialName ?? trip?.material ?? "").trim();

const getSite = (trip) =>
  String(trip?.site ?? trip?.location ?? "").trim();

const getQuantity = (trip) => Number(trip?.quantity) || 0;

const getRate = (trip) => Number(trip?.rate) || 0;

const getAmount = (trip) => {
  if (trip?.amount !== undefined && trip?.amount !== null) {
    const amount = Number(trip.amount);

    if (Number.isFinite(amount)) return amount;
  }

  return getQuantity(trip) * getRate(trip);
};

const getUnit = (trip) =>
  String(trip?.unit ?? trip?.quantityUnit ?? "Trip").trim() || "Trip";

const getDateRange = (type) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const format = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

  if (type === "today") {
    const value = format(today);
    return [value, value];
  }

  if (type === "yesterday") {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);

    const value = format(date);
    return [value, value];
  }

  if (type === "week") {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    start.setDate(start.getDate() + diff);

    return [format(start), format(today)];
  }

  if (type === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);

    return [format(start), format(today)];
  }

  return ["", ""];
};

const escapeCSV = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const getPercentChange = (current, previous) => {
  if (!previous) {
    if (!current) return 0;
    return 100;
  }

  return ((current - previous) / previous) * 100;
};

function DateWisePrintDocument({
  periodText,
  fromDate,
  toDate,
  summary,
  filteredTrips,
  dailySummary,
}) {
  return (
    <article className="dw-print-report">
      <header className="dw-print-report-header">
        <div>
          <span className="dw-print-kicker">SAO AUTO TRACTOR / TRANSPORT REPORT</span>
          <h1>Date Wise Report</h1>
          <p>Trip activity, billing and daily movement report.</p>
        </div>

        <div className="dw-print-period">
          <span>REPORTING PERIOD</span>
          <strong>{periodText}</strong>
          {(fromDate || toDate) && (
            <small>
              {fromDate ? formatDate(fromDate) : "All"} — {toDate ? formatDate(toDate) : "All"}
            </small>
          )}
        </div>
      </header>

      <section className="dw-print-summary">
        <div>
          <span>Total Records</span>
          <strong>{summary.records}</strong>
        </div>
        <div>
          <span>Loading</span>
          <strong>{summary.loading}</strong>
        </div>
        <div>
          <span>Unloading</span>
          <strong>{summary.unloading}</strong>
        </div>
        <div>
          <span>Site to Site</span>
          <strong>{summary.siteToSite}</strong>
        </div>
        <div>
          <span>Quantity</span>
          <strong>{formatNumber(summary.quantity)}</strong>
        </div>
        <div>
          <span>Total Billing</span>
          <strong>{formatCurrency(summary.billing)}</strong>
        </div>
      </section>

      <section className="dw-print-section">
        <div className="dw-print-section-heading">
          <div>
            <span>RECORDS</span>
            <h2>Trip Activity</h2>
          </div>
          <strong>{filteredTrips.length} records</strong>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="dw-print-empty">No records found for the selected period.</div>
        ) : (
          <div className="dw-print-table-wrap">
            <table className="dw-print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Party</th>
                  <th>Material</th>
                  <th>Trip Type</th>
                  <th>Site</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip, index) => (
                  <tr
                    key={
                      trip?.id ??
                      trip?._id ??
                      `${normalizeDate(trip?.date)}-${getVehicle(trip)}-${index}`
                    }
                  >
                    <td>{formatDate(trip?.date)}</td>
                    <td>{getVehicle(trip) || "—"}</td>
                    <td>{getParty(trip) || "—"}</td>
                    <td>{getMaterial(trip) || "—"}</td>
                    <td>{getTripType(trip)}</td>
                    <td>{getSite(trip) || "—"}</td>
                    <td>{formatNumber(getQuantity(trip))}</td>
                    <td>{getUnit(trip)}</td>
                    <td>{formatCurrency(getRate(trip))}</td>
                    <td>{formatCurrency(getAmount(trip))}</td>
                    <td>{trip?.driverName || "—"}</td>
                  </tr>
                ))}
              </tbody>
              {filteredTrips.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="6">TOTAL</td>
                    <td>{formatNumber(summary.quantity)}</td>
                    <td></td>
                    <td></td>
                    <td>{formatCurrency(summary.billing)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>

      <section className="dw-print-section dw-print-daily-section">
        <div className="dw-print-section-heading">
          <div>
            <span>DAILY ACTIVITY</span>
            <h2>Daily Summary</h2>
          </div>
          <strong>{dailySummary.length} days</strong>
        </div>

        {dailySummary.length === 0 ? (
          <div className="dw-print-empty">No daily activity found.</div>
        ) : (
          <div className="dw-print-daily-list">
            {dailySummary.map((day) => (
              <div className="dw-print-daily-card" key={day.date}>
                <div className="dw-print-daily-head">
                  <div>
                    <strong>{formatLongDate(day.date)}</strong>
                    <span>{formatDate(day.date)}</span>
                  </div>
                  <strong>{formatCurrency(day.billing)}</strong>
                </div>

                <div className="dw-print-daily-stats">
                  <span>Trips <strong>{day.trips}</strong></span>
                  <span>Vehicles <strong>{day.vehicles.length}</strong></span>
                  <span>Parties <strong>{day.parties.length}</strong></span>
                  <span>Materials <strong>{day.materials.length}</strong></span>
                  <span>Quantity <strong>{formatNumber(day.quantity)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="dw-print-footer">
        <span>SAO AUTO TRACTOR</span>
        <span>Generated from Date Wise report</span>
      </footer>
    </article>
  );
}

function DateWise() {
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
  const [trendMode, setTrendMode] = useState("billing");
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const loadTrips = useCallback(() => {
    setTrips(readTrips());
  }, []);

  useEffect(() => {
    loadTrips();

    const handleStorage = () => loadTrips();
    const handleDataChange = () => loadTrips();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      "saoAutoTractorDataChanged",
      handleDataChange
    );

    const interval = window.setInterval(loadTrips, 1500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "saoAutoTractorDataChanged",
        handleDataChange
      );
      window.clearInterval(interval);
    };
  }, [loadTrips]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (editTrip) {
        setEditTrip(null);
        return;
      }

      if (selectedTrip) {
        setSelectedTrip(null);
        return;
      }

      if (showPrintPreview) {
        setShowPrintPreview(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [editTrip, selectedTrip, showPrintPreview]);

  const parties = useMemo(() => {
    return [...new Set(trips.map(getParty).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [trips]);

  const tractors = useMemo(() => {
    return [...new Set(trips.map(getVehicle).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [trips]);

  const materials = useMemo(() => {
    return [...new Set(trips.map(getMaterial).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return trips
      .filter((trip) => {
        const tripDate = normalizeDate(trip?.date);

        if (fromDate && (!tripDate || tripDate < fromDate)) {
          return false;
        }

        if (toDate && (!tripDate || tripDate > toDate)) {
          return false;
        }

        if (partyFilter && getParty(trip) !== partyFilter) {
          return false;
        }

        if (tractorFilter && getVehicle(trip) !== tractorFilter) {
          return false;
        }

        if (materialFilter && getMaterial(trip) !== materialFilter) {
          return false;
        }

        if (tripTypeFilter && getTripType(trip) !== tripTypeFilter) {
          return false;
        }

        if (normalizedSearch) {
          const searchable = [
            getParty(trip),
            getVehicle(trip),
            getMaterial(trip),
            getSite(trip),
            getTripType(trip),
            trip?.driverName,
            trip?.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!searchable.includes(normalizedSearch)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = normalizeDate(a?.date);
        const dateB = normalizeDate(b?.date);

        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }

        return (
          Number(b?.createdAt || b?.updatedAt || 0) -
          Number(a?.createdAt || a?.updatedAt || 0)
        );
      });
  }, [
    trips,
    fromDate,
    toDate,
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
    search,
  ]);

  const trendData = useMemo(() => {
    const map = new Map();

    filteredTrips.forEach((trip) => {
      const date = normalizeDate(trip?.date);
      if (!date) return;

      if (!map.has(date)) {
        map.set(date, {
          date,
          trips: 0,
          billing: 0,
        });
      }

      const item = map.get(date);

      item.trips += 1;
      item.billing += getAmount(trip);
    });

    const values = [...map.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const max = Math.max(
      ...values.map((item) =>
        trendMode === "billing" ? item.billing : item.trips
      ),
      0
    );

    return values.map((item) => ({
      ...item,
      value: trendMode === "billing" ? item.billing : item.trips,
      height: max ? Math.max((item.value / max) * 100, 4) : 4,
    }));
  }, [filteredTrips, trendMode]);

  const topParties = useMemo(() => {
    const map = new Map();

    filteredTrips.forEach((trip) => {
      const name = getParty(trip);
      if (!name) return;

      if (!map.has(name)) {
        map.set(name, {
          name,
          billing: 0,
          trips: 0,
        });
      }

      const item = map.get(name);
      item.billing += getAmount(trip);
      item.trips += 1;
    });

    return [...map.values()]
      .sort((a, b) => b.billing - a.billing)
      .slice(0, 5);
  }, [filteredTrips]);

  const topTractors = useMemo(() => {
    const map = new Map();

    filteredTrips.forEach((trip) => {
      const name = getVehicle(trip);
      if (!name) return;

      if (!map.has(name)) {
        map.set(name, {
          name,
          billing: 0,
          trips: 0,
        });
      }

      const item = map.get(name);
      item.billing += getAmount(trip);
      item.trips += 1;
    });

    return [...map.values()]
      .sort((a, b) => b.billing - a.billing)
      .slice(0, 5);
  }, [filteredTrips]);

  const topMaterials = useMemo(() => {
    const map = new Map();

    filteredTrips.forEach((trip) => {
      const name = getMaterial(trip);
      if (!name) return;

      if (!map.has(name)) {
        map.set(name, {
          name,
          billing: 0,
          trips: 0,
        });
      }

      const item = map.get(name);
      item.billing += getAmount(trip);
      item.trips += 1;
    });

    return [...map.values()]
      .sort((a, b) => b.billing - a.billing)
      .slice(0, 5);
  }, [filteredTrips]);

  const dayComparison = useMemo(() => {
    const today = getToday();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const yesterday = `${yesterdayDate.getFullYear()}-${String(
      yesterdayDate.getMonth() + 1
    ).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(
      2,
      "0"
    )}`;

    const todayTrips = filteredTrips.filter(
      (trip) => normalizeDate(trip?.date) === today
    );

    const yesterdayTrips = filteredTrips.filter(
      (trip) => normalizeDate(trip?.date) === yesterday
    );

    const todayBilling = todayTrips.reduce(
      (sum, trip) => sum + getAmount(trip),
      0
    );

    const yesterdayBilling = yesterdayTrips.reduce(
      (sum, trip) => sum + getAmount(trip),
      0
    );

    return {
      todayTrips: todayTrips.length,
      yesterdayTrips: yesterdayTrips.length,
      todayBilling,
      yesterdayBilling,
      billingChange: getPercentChange(
        todayBilling,
        yesterdayBilling
      ),
      tripChange: getPercentChange(
        todayTrips.length,
        yesterdayTrips.length
      ),
    };
  }, [filteredTrips]);

  const quickStats = useMemo(() => {
    const days = new Set(
      filteredTrips
        .map((trip) => normalizeDate(trip?.date))
        .filter(Boolean)
    );

    const totalBilling = filteredTrips.reduce(
      (sum, trip) => sum + getAmount(trip),
      0
    );

    const totalTrips = filteredTrips.length;
    const totalDays = days.size || 1;
    const avgPerDay = totalBilling / totalDays;

    const dailyBilling = new Map();

    filteredTrips.forEach((trip) => {
      const date = normalizeDate(trip?.date);
      if (!date) return;

      dailyBilling.set(
        date,
        (dailyBilling.get(date) || 0) + getAmount(trip)
      );
    });

    const busiestDay = [...dailyBilling.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      totalDays,
      avgPerDay,
      busiestDay: busiestDay
        ? formatDate(busiestDay[0])
        : "—",
      busiestDayAmount: busiestDay ? busiestDay[1] : 0,
      totalBilling,
      totalTrips,
    };
  }, [filteredTrips]);

  const summary = useMemo(() => {
    const loading = filteredTrips.filter(
      (trip) => getTripType(trip) === "Loading"
    ).length;

    const unloading = filteredTrips.filter(
      (trip) => getTripType(trip) === "Unloading"
    ).length;

    const siteToSite = filteredTrips.filter(
      (trip) => getTripType(trip) === "Site to Site"
    ).length;

    const quantity = filteredTrips.reduce(
      (sum, trip) => sum + getQuantity(trip),
      0
    );

    const billing = filteredTrips.reduce(
      (sum, trip) => sum + getAmount(trip),
      0
    );

    return {
      records: filteredTrips.length,
      trips: filteredTrips.length,
      loading,
      unloading,
      siteToSite,
      quantity,
      billing,
    };
  }, [filteredTrips]);

  const dailySummary = useMemo(() => {
    const map = new Map();

    filteredTrips.forEach((trip) => {
      const date = normalizeDate(trip?.date);
      if (!date) return;

      if (!map.has(date)) {
        map.set(date, {
          date,
          trips: 0,
          quantity: 0,
          billing: 0,
          vehicles: new Set(),
          parties: new Set(),
          materials: new Set(),
          tractorWise: new Map(),
          partyWise: new Map(),
          materialWise: new Map(),
        });
      }

      const day = map.get(date);
      const amount = getAmount(trip);
      const quantity = getQuantity(trip);

      day.trips += 1;
      day.quantity += quantity;
      day.billing += amount;

      const vehicle = getVehicle(trip);
      const party = getParty(trip);
      const material = getMaterial(trip);

      if (vehicle) day.vehicles.add(vehicle);
      if (party) day.parties.add(party);
      if (material) day.materials.add(material);

      if (vehicle) {
        if (!day.tractorWise.has(vehicle)) {
          day.tractorWise.set(vehicle, {
            name: vehicle,
            trips: 0,
            quantity: 0,
            amount: 0,
          });
        }

        const item = day.tractorWise.get(vehicle);
        item.trips += 1;
        item.quantity += quantity;
        item.amount += amount;
      }

      if (party) {
        if (!day.partyWise.has(party)) {
          day.partyWise.set(party, {
            name: party,
            trips: 0,
            quantity: 0,
            amount: 0,
          });
        }

        const item = day.partyWise.get(party);
        item.trips += 1;
        item.quantity += quantity;
        item.amount += amount;
      }

      if (material) {
        if (!day.materialWise.has(material)) {
          day.materialWise.set(material, {
            name: material,
            trips: 0,
            quantity: 0,
            amount: 0,
          });
        }

        const item = day.materialWise.get(material);
        item.trips += 1;
        item.quantity += quantity;
        item.amount += amount;
      }
    });

    return [...map.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((day) => ({
        ...day,
        vehicles: [...day.vehicles],
        parties: [...day.parties],
        materials: [...day.materials],
        tractorWise: [...day.tractorWise.values()].sort(
          (a, b) => b.amount - a.amount
        ),
        partyWise: [...day.partyWise.values()].sort(
          (a, b) => b.amount - a.amount
        ),
        materialWise: [...day.materialWise.values()].sort(
          (a, b) => b.amount - a.amount
        ),
      }));
  }, [filteredTrips]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrips.length / PAGE_SIZE)
  );

  const paginatedTrips = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTrips.slice(start, start + PAGE_SIZE);
  }, [filteredTrips, page]);

  useEffect(() => {
    setPage(1);
  }, [
    fromDate,
    toDate,
    search,
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeFilterCount = [
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
  ].filter(Boolean).length;

  const applyPreset = (preset) => {
    const [from, to] = getDateRange(preset);

    setFromDate(from);
    setToDate(to);
    setActivePreset(preset);
  };

  const clearFilters = () => {
    const today = getToday();

    setSearch("");
    setPartyFilter("");
    setTractorFilter("");
    setMaterialFilter("");
    setTripTypeFilter("");
    setFromDate(today);
    setToDate(today);
    setActivePreset("today");
    setPage(1);
  };

  const hasAdvancedFilters = Boolean(
    partyFilter ||
      tractorFilter ||
      materialFilter ||
      tripTypeFilter
  );

  const openPrintPreview = () => {
    setShowPrintPreview(true);
  };

  const printReport = () => {
    setShowPrintPreview(false);

    window.setTimeout(() => {
      window.print();
    }, 80);
  };

  const exportCSV = () => {
    const headers = [
      "Date",
      "Vehicle",
      "Party",
      "Material",
      "Trip Type",
      "Site",
      "Quantity",
      "Unit",
      "Rate",
      "Amount",
      "Driver",
    ];

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

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob([`\ufeff${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `SAO-Date-Wise-${fromDate || "all"}-${
      toDate || "all"
    }.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const exportDailyCSV = () => {
    const headers = [
      "Date",
      "Trips",
      "Vehicles",
      "Parties",
      "Materials",
      "Quantity",
      "Billing",
    ];

    const rows = dailySummary.map((day) => [
      formatDate(day.date),
      day.trips,
      day.vehicles.length,
      day.parties.length,
      day.materials.length,
      day.quantity,
      day.billing,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob([`\ufeff${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `SAO-Daily-Summary-${fromDate || "all"}-${
      toDate || "all"
    }.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const cloneTrip = (trip) => {
    const currentTrips = readTrips();

    const clonedTrip = {
      ...trip,
      id: undefined,
      _id: undefined,
      date: getToday(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    delete clonedTrip.__id;

    writeTrips([clonedTrip, ...currentTrips]);
    loadTrips();
    setSelectedTrip(null);
  };

  const shareWhatsApp = (trip) => {
    const message = [
      "Trip Details",
      `Date: ${formatDate(trip?.date)}`,
      `Vehicle: ${getVehicle(trip) || "—"}`,
      `Party: ${getParty(trip) || "—"}`,
      `Material: ${getMaterial(trip) || "—"}`,
      `Trip Type: ${getTripType(trip)}`,
      `Site: ${getSite(trip) || "—"}`,
      `Quantity: ${formatNumber(getQuantity(trip))} ${getUnit(
        trip
      )}`,
      `Rate: ${formatCurrency(getRate(trip))}`,
      `Amount: ${formatCurrency(getAmount(trip))}`,
      `Driver: ${trip?.driverName || "—"}`,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openEditModal = (trip) => {
    setSelectedTrip(null);
    setEditTrip(trip);
  };

  const saveEdit = (updatedTrip) => {
    const currentTrips = readTrips();

    const index = currentTrips.findIndex(
      (trip) => trip?.id === updatedTrip?.id
    );

    if (index === -1) {
      alert("Unable to update this record.");
      return;
    }

    currentTrips[index] = {
      ...currentTrips[index],
      ...updatedTrip,
      updatedAt: Date.now(),
    };

    writeTrips(currentTrips);
    loadTrips();
    setEditTrip(null);
  };

  const periodText = useMemo(() => {
    if (!fromDate && !toDate) return "All available dates";

    if (fromDate && toDate && fromDate === toDate) {
      return formatLongDate(fromDate);
    }

    if (fromDate && toDate) {
      return `${formatDate(fromDate)} — ${formatDate(toDate)}`;
    }

    if (fromDate) return `From ${formatDate(fromDate)}`;
    if (toDate) return `Up to ${formatDate(toDate)}`;

    return "Selected period";
  }, [fromDate, toDate]);

  const renderTripBadgeClass = (type) => {
    const normalized = String(type)
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (normalized === "loading") return "loading";
    if (normalized === "unloading") return "unloading";
    if (normalized === "site-to-site") return "site-to-site";

    return "other";
  };

  return (
    <div className="date-wise-page">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <header className="date-wise-header">
        <div className="date-wise-header-copy">
          <span className="date-wise-eyebrow">
            TRANSPORT INTELLIGENCE / DATE WISE
          </span>

          <h1>Date Wise</h1>

          <p>
            Review trip activity, billing performance and daily
            movement across your selected period.
          </p>
        </div>

        <div className="date-wise-header-actions">
          <button
            type="button"
            className="dw-button dw-button-secondary"
            onClick={loadTrips}
            title="Refresh records"
          >
            <RotateCcw size={15} />
            Refresh
          </button>

          <button
            type="button"
            className="dw-button dw-button-secondary"
            onClick={exportCSV}
            title="Export filtered records as CSV"
          >
            <FileDown size={15} />
            Export CSV
          </button>

          <button
            type="button"
            className="dw-button dw-button-secondary"
            onClick={openPrintPreview}
            title="Preview print-ready report"
          >
            <Eye size={15} />
            Preview
          </button>

          <button
            type="button"
            className="dw-button dw-button-primary"
            onClick={printReport}
            title="Print report or save as PDF"
          >
            <Printer size={15} />
            Print / PDF
          </button>
        </div>
      </header>

      {/* =====================================================
          DATE CONTROL
      ====================================================== */}
      <section className="dw-date-panel">
        <div className="dw-date-panel-top">
          <div className="dw-date-title">
            <div className="dw-date-icon">
              <CalendarDays size={19} />
            </div>

            <div>
              <strong>Reporting Period</strong>
              <span>
                Choose a date range or use one of the quick
                presets.
              </span>
            </div>
          </div>

          <div className="dw-preset-list">
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["week", "This Week"],
              ["month", "This Month"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={activePreset === key ? "active" : ""}
                onClick={() => applyPreset(key)}
                aria-pressed={activePreset === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="dw-date-inputs">
          <label>
            <span>From Date</span>

            <div className="dw-input-wrap">
              <CalendarDays size={14} />

              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setActivePreset("");
                }}
              />
            </div>
          </label>

          <div className="dw-date-arrow" aria-hidden="true">
            <ChevronRight size={16} />
          </div>

          <label>
            <span>To Date</span>

            <div className="dw-input-wrap">
              <CalendarDays size={14} />

              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setActivePreset("");
                }}
              />
            </div>
          </label>

          <div className="dw-selected-period">
            <span>SELECTED PERIOD</span>
            <strong>{periodText}</strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK STATS
      ====================================================== */}
      <section className="dw-quick-stats">
        <article className="dw-quick-stat-card">
          <div className="dw-quick-stat-top">
            <span>Reporting Days</span>

            <div className="dw-quick-stat-icon">
              <CalendarDays size={15} />
            </div>
          </div>

          <strong>{quickStats.totalDays}</strong>

          <small>
            Days represented in the selected period
          </small>
        </article>

        <article className="dw-quick-stat-card">
          <div className="dw-quick-stat-top">
            <span>Average / Day</span>

            <div className="dw-quick-stat-icon">
              <IndianRupee size={15} />
            </div>
          </div>

          <strong>{formatCurrency(quickStats.avgPerDay)}</strong>

          <small>Average billing per reporting day</small>
        </article>

        <article className="dw-quick-stat-card">
          <div className="dw-quick-stat-top">
            <span>Busiest Day</span>

            <div className="dw-quick-stat-icon">
              <TrendingUp size={15} />
            </div>
          </div>

          <strong>{quickStats.busiestDay}</strong>

          <small>
            {quickStats.busiestDayAmount
              ? formatCurrency(quickStats.busiestDayAmount)
              : "No billing"}
          </small>
        </article>

        <article className="dw-quick-stat-card dw-compare-card">
          <div className="dw-quick-stat-top">
            <span>Today vs Yesterday</span>

            <div className="dw-quick-stat-icon">
              {dayComparison.billingChange >= 0 ? (
                <TrendingUp size={15} />
              ) : (
                <TrendingDown size={15} />
              )}
            </div>
          </div>

          <div className="dw-compare-values">
            <div>
              <span>Today</span>
              <strong>
                {formatCurrency(dayComparison.todayBilling)}
              </strong>
            </div>

            <div
              className={`dw-compare-arrow ${
                dayComparison.billingChange > 0
                  ? "dw-trend-up"
                  : dayComparison.billingChange < 0
                  ? "dw-trend-down"
                  : "dw-trend-flat"
              }`}
            >
              {dayComparison.billingChange > 0 ? (
                <TrendingUp size={13} />
              ) : dayComparison.billingChange < 0 ? (
                <TrendingDown size={13} />
              ) : (
                <span>•</span>
              )}

              {Math.abs(dayComparison.billingChange).toFixed(0)}%
            </div>

            <div>
              <span>Yesterday</span>
              <strong>
                {formatCurrency(
                  dayComparison.yesterdayBilling
                )}
              </strong>
            </div>
          </div>
        </article>
      </section>

      {/* =====================================================
          ACTIVITY TREND
      ====================================================== */}
      <section className="dw-trend-section">
        <div className="dw-trend-header">
          <div>
            <span>ACTIVITY TREND</span>

            <h2>Daily performance</h2>

            <p>
              Visual view of activity across the selected
              period.
            </p>
          </div>

          <div className="dw-trend-controls">
            <button
              type="button"
              className={trendMode === "billing" ? "active" : ""}
              onClick={() => setTrendMode("billing")}
              aria-pressed={trendMode === "billing"}
            >
              Billing
            </button>

            <button
              type="button"
              className={trendMode === "trips" ? "active" : ""}
              onClick={() => setTrendMode("trips")}
              aria-pressed={trendMode === "trips"}
            >
              Trips
            </button>
          </div>
        </div>

        <div className="dw-trend-chart">
          {trendData.length === 0 ? (
            <div className="dw-trend-empty">
              <BarChart3 size={18} />
              <span>No activity available for this period.</span>
            </div>
          ) : (
            <div className="dw-trend-bars">
              {trendData.map((item) => (
                <div
                  className="dw-trend-bar-wrapper"
                  key={item.date}
                  title={`${formatDate(item.date)} — ${
                    trendMode === "billing"
                      ? formatCurrency(item.value)
                      : `${item.value} trips`
                  }`}
                >
                  <span className="dw-trend-bar-value">
                    {trendMode === "billing"
                      ? formatCurrency(item.value)
                      : item.value}
                  </span>

                  <div className="dw-trend-bar-track">
                    <div
                      className="dw-trend-bar"
                      style={{
                        height: `${item.height}%`,
                      }}
                    />
                  </div>

                  <span className="dw-trend-bar-label">
                    {formatDate(item.date).slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          TOP PERFORMERS
      ====================================================== */}
      <section className="dw-top-performers">
        {[
          {
            title: "Top Parties",
            subtitle: "Highest billing",
            icon: Users,
            data: topParties,
          },
          {
            title: "Top Tractors",
            subtitle: "Highest billing",
            icon: Truck,
            data: topTractors,
          },
          {
            title: "Top Materials",
            subtitle: "Highest billing",
            icon: Package,
            data: topMaterials,
          },
        ].map((group) => {
          const Icon = group.icon;

          return (
            <article
              className="dw-top-performer-card"
              key={group.title}
            >
              <div className="dw-top-performer-header">
                <div className="dw-top-performer-heading">
                  <div className="dw-top-performer-icon">
                    <Icon size={15} />
                  </div>

                  <div>
                    <strong>{group.title}</strong>
                    <span>{group.subtitle}</span>
                  </div>
                </div>

                <Award size={16} />
              </div>

              {group.data.length === 0 ? (
                <div className="dw-top-empty">
                  No data available.
                </div>
              ) : (
                group.data.map((item, index) => (
                  <div
                    className="dw-top-performer-row"
                    key={item.name}
                  >
                    <span className="dw-top-rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <strong title={item.name}>
                      {item.name}
                    </strong>

                    <span>{item.trips} trips</span>

                    <span className="dw-top-amount">
                      {formatCurrency(item.billing)}
                    </span>
                  </div>
                ))
              )}
            </article>
          );
        })}
      </section>

      {/* =====================================================
          SUMMARY
      ====================================================== */}
      <section className="dw-summary-grid">
        <article className="dw-summary-card">
          <div className="dw-summary-icon">
            <ClipboardList size={18} />
          </div>

          <div>
            <span>Records</span>
            <strong>{summary.records}</strong>
          </div>
        </article>

        <article className="dw-summary-card">
          <div className="dw-summary-icon">
            <Truck size={18} />
          </div>

          <div>
            <span>Total Trips</span>
            <strong>{summary.trips}</strong>
          </div>
        </article>

        <article className="dw-summary-card">
          <div className="dw-summary-icon">
            <Package size={18} />
          </div>

          <div>
            <span>Quantity</span>
            <strong>{formatNumber(summary.quantity)}</strong>
          </div>
        </article>

        <article className="dw-summary-card dw-summary-money">
          <div className="dw-summary-icon">
            <IndianRupee size={18} />
          </div>

          <div>
            <span>Total Billing</span>
            <strong>{formatCurrency(summary.billing)}</strong>
          </div>
        </article>
      </section>

      {/* =====================================================
          BREAKDOWN
      ====================================================== */}
      <section className="dw-breakdown">
        <div className="dw-breakdown-heading">
          <div>
            <span>WORK TYPE BREAKDOWN</span>
            <h2>Activity mix</h2>
          </div>

          <span className="dw-record-count">
            {summary.records} records
          </span>
        </div>

        <div className="dw-breakdown-grid">
          <div className="dw-breakdown-item">
            <span className="dw-breakdown-dot loading" />

            <div>
              <strong>{summary.loading}</strong>
              <span>Loading</span>
            </div>
          </div>

          <div className="dw-breakdown-item">
            <span className="dw-breakdown-dot unloading" />

            <div>
              <strong>{summary.unloading}</strong>
              <span>Unloading</span>
            </div>
          </div>

          <div className="dw-breakdown-item">
            <span className="dw-breakdown-dot site" />

            <div>
              <strong>{summary.siteToSite}</strong>
              <span>Site to Site</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          RECORDS
      ====================================================== */}
      <section className="dw-record-section">
        <div className="dw-toolbar">
          <div className="dw-toolbar-copy">
            <div className="dw-toolbar-title">
              <Layers3 size={16} />
              <strong>Trip Records</strong>
            </div>

            <span>
              Showing {filteredTrips.length} matching records
            </span>
          </div>

          <div className="dw-toolbar-actions">
            <div className="dw-search">
              <Search size={15} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search party, vehicle, material..."
                aria-label="Search records"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={`dw-filter-button ${
                showFilters || hasAdvancedFilters ? "active" : ""
              }`}
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
            >
              <Filter size={14} />
              Filters

              {activeFilterCount > 0 && (
                <span className="dw-filter-count">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="dw-filter-panel">
            <div className="dw-filter-field">
              <label>Party</label>

              <select
                value={partyFilter}
                onChange={(event) =>
                  setPartyFilter(event.target.value)
                }
              >
                <option value="">All Parties</option>

                {parties.map((party) => (
                  <option key={party} value={party}>
                    {party}
                  </option>
                ))}
              </select>
            </div>

            <div className="dw-filter-field">
              <label>Vehicle</label>

              <select
                value={tractorFilter}
                onChange={(event) =>
                  setTractorFilter(event.target.value)
                }
              >
                <option value="">All Vehicles</option>

                {tractors.map((vehicle) => (
                  <option key={vehicle} value={vehicle}>
                    {vehicle}
                  </option>
                ))}
              </select>
            </div>

            <div className="dw-filter-field">
              <label>Material</label>

              <select
                value={materialFilter}
                onChange={(event) =>
                  setMaterialFilter(event.target.value)
                }
              >
                <option value="">All Materials</option>

                {materials.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>

            <div className="dw-filter-field">
              <label>Trip Type</label>

              <select
                value={tripTypeFilter}
                onChange={(event) =>
                  setTripTypeFilter(event.target.value)
                }
              >
                <option value="">All Types</option>
                <option value="Loading">Loading</option>
                <option value="Unloading">Unloading</option>
                <option value="Site to Site">
                  Site to Site
                </option>
              </select>
            </div>

            <button
              type="button"
              className="dw-clear-button"
              onClick={clearFilters}
            >
              <RotateCcw size={13} />
              Clear
            </button>
          </div>
        )}

        {filteredTrips.length === 0 ? (
          <div className="dw-empty">
            <div className="dw-empty-icon">
              <Search size={21} />
            </div>

            <h3>No records found</h3>

            <p>
              There are no trip records matching the selected
              dates or filters.
            </p>

            <button type="button" onClick={clearFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className="dw-table-wrap">
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
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTrips.map((trip, index) => {
                    const type = getTripType(trip);

                    return (
                      <tr
                        key={
                          trip?.id ??
                          trip?._id ??
                          `${normalizeDate(trip?.date)}-${getVehicle(
                            trip
                          )}-${index}`
                        }
                      >
                        <td>
                          <div className="dw-date-cell">
                            <strong>
                              {formatDate(trip?.date)}
                            </strong>

                            <span>
                              {formatLongDate(trip?.date)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="dw-vehicle-cell">
                            <span className="dw-mini-icon">
                              <Truck size={13} />
                            </span>

                            <strong>
                              {getVehicle(trip) || "—"}
                            </strong>
                          </div>
                        </td>

                        <td>
                          <span
                            className="dw-primary-text"
                            title={getParty(trip)}
                          >
                            {getParty(trip) || "—"}
                          </span>

                          {trip?.driverName && (
                            <span className="dw-secondary-text">
                              {trip.driverName}
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className="dw-primary-text"
                            title={getMaterial(trip)}
                          >
                            {getMaterial(trip) || "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`dw-trip-badge ${renderTripBadgeClass(
                              type
                            )}`}
                          >
                            {type}
                          </span>
                        </td>

                        <td>
                          <span
                            className="dw-secondary-text dw-site-text"
                            title={getSite(trip)}
                          >
                            {getSite(trip) || "—"}
                          </span>
                        </td>

                        <td className="align-right">
                          <span className="dw-number">
                            {formatNumber(getQuantity(trip))}
                          </span>

                          <span className="dw-unit">
                            {getUnit(trip)}
                          </span>
                        </td>

                        <td className="align-right">
                          <span className="dw-number">
                            {formatCurrency(getRate(trip))}
                          </span>
                        </td>

                        <td className="align-right">
                          <span className="dw-amount">
                            {formatCurrency(getAmount(trip))}
                          </span>
                        </td>

                        <td>
                          <div className="dw-row-actions">
                            <button
                              type="button"
                              className="dw-view-button"
                              onClick={() =>
                                setSelectedTrip(trip)
                              }
                              title="View details"
                              aria-label="View trip details"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              className="dw-clone-btn"
                              onClick={() => cloneTrip(trip)}
                              title="Clone trip"
                              aria-label="Clone trip"
                            >
                              <Copy size={14} />
                            </button>

                            <button
                              type="button"
                              className="dw-whatsapp-btn"
                              onClick={() =>
                                shareWhatsApp(trip)
                              }
                              title="Share on WhatsApp"
                              aria-label="Share on WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="dw-mobile-list">
              {paginatedTrips.map((trip, index) => {
                const type = getTripType(trip);

                return (
                  <article
                    className="dw-mobile-card"
                    key={
                      trip?.id ??
                      trip?._id ??
                      `${normalizeDate(trip?.date)}-${getVehicle(
                        trip
                      )}-${index}`
                    }
                  >
                    <div className="dw-mobile-card-top">
                      <div>
                        <span>Date</span>
                        <strong>
                          {formatDate(trip?.date)}
                        </strong>
                      </div>

                      <span
                        className={`dw-trip-badge ${renderTripBadgeClass(
                          type
                        )}`}
                      >
                        {type}
                      </span>
                    </div>

                    <div className="dw-mobile-party">
                      <Truck size={14} />

                      <strong>
                        {getVehicle(trip) || "Vehicle not specified"}
                      </strong>
                    </div>

                    <div className="dw-mobile-details">
                      <div>
                        <span>Party</span>
                        <strong>
                          {getParty(trip) || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Material</span>
                        <strong>
                          {getMaterial(trip) || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Quantity</span>
                        <strong>
                          {formatNumber(getQuantity(trip))}{" "}
                          {getUnit(trip)}
                        </strong>
                      </div>

                      <div>
                        <span>Amount</span>
                        <strong>
                          {formatCurrency(getAmount(trip))}
                        </strong>
                      </div>

                      <div>
                        <span>Site</span>
                        <strong>
                          {getSite(trip) || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Driver</span>
                        <strong>
                          {trip?.driverName || "—"}
                        </strong>
                      </div>
                    </div>

                    <div className="dw-mobile-actions">
                      <button
                        type="button"
                        className="dw-mobile-view"
                        onClick={() =>
                          setSelectedTrip(trip)
                        }
                      >
                        <Eye size={13} />
                        View
                      </button>

                      <button
                        type="button"
                        className="dw-mobile-clone"
                        onClick={() => cloneTrip(trip)}
                      >
                        <Copy size={13} />
                        Clone
                      </button>

                      <button
                        type="button"
                        className="dw-mobile-whatsapp"
                        onClick={() =>
                          shareWhatsApp(trip)
                        }
                        aria-label="Share on WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="dw-pagination">
              <span>
                Showing{" "}
                <strong>
                  {Math.min(
                    (page - 1) * PAGE_SIZE + 1,
                    filteredTrips.length
                  )}
                </strong>{" "}
                —{" "}
                <strong>
                  {Math.min(
                    page * PAGE_SIZE,
                    filteredTrips.length
                  )}
                </strong>{" "}
                of <strong>{filteredTrips.length}</strong>
              </span>

              <div className="dw-pagination-buttons">
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.max(1, value - 1))
                  }
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="dw-page-number">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) =>
                      Math.min(totalPages, value + 1)
                    )
                  }
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* =====================================================
          DAILY ACTIVITY SUMMARY
      ====================================================== */}
      <section className="dw-daily-summary">
        <div className="dw-daily-summary-heading">
          <div>
            <span>DAILY ACTIVITY</span>

            <h2>Daily summary</h2>

            <p>
              Day-by-day movement, billing and detailed
              breakdown.
            </p>
          </div>

          <div className="dw-daily-summary-actions">
            <span className="dw-daily-summary-count">
              {dailySummary.length} days
            </span>

            <button
              type="button"
              className="dw-button dw-button-secondary"
              onClick={exportDailyCSV}
              disabled={!dailySummary.length}
            >
              <FileDown size={14} />
              Export Daily CSV
            </button>
          </div>
        </div>

        {dailySummary.length === 0 ? (
          <div className="dw-daily-summary-empty">
            <CalendarDays size={18} />

            <div>
              <strong>No daily activity</strong>
              <span>
                Daily summaries will appear when matching
                records are available.
              </span>
            </div>
          </div>
        ) : (
          <div className="dw-daily-summary-list">
            {dailySummary.map((day) => (
              <article
                className="dw-daily-summary-card"
                key={day.date}
              >
                <div className="dw-daily-summary-card-header">
                  <div className="dw-daily-summary-date">
                    <div className="dw-daily-summary-date-icon">
                      <CalendarDays size={16} />
                    </div>

                    <div>
                      <strong>
                        {formatLongDate(day.date)}
                      </strong>

                      <span>{formatDate(day.date)}</span>
                    </div>
                  </div>

                  <div className="dw-daily-summary-total">
                    <span>Daily Billing</span>
                    <strong>
                      {formatCurrency(day.billing)}
                    </strong>
                  </div>
                </div>

                <div className="dw-daily-summary-stats">
                  <div>
                    <Truck size={15} />
                    <span>Trips</span>
                    <strong>{day.trips}</strong>
                  </div>

                  <div>
                    <Truck size={15} />
                    <span>Vehicles</span>
                    <strong>{day.vehicles.length}</strong>
                  </div>

                  <div>
                    <Users size={15} />
                    <span>Parties</span>
                    <strong>{day.parties.length}</strong>
                  </div>

                  <div>
                    <Package size={15} />
                    <span>Materials</span>
                    <strong>{day.materials.length}</strong>
                  </div>

                  <div>
                    <Layers3 size={15} />
                    <span>Quantity</span>
                    <strong>
                      {formatNumber(day.quantity)}
                    </strong>
                  </div>
                </div>

                <div className="dw-daily-summary-breakdown">
                  <span>
                    Loading{" "}
                    <strong>
                      {
                        filteredTrips.filter(
                          (trip) =>
                            normalizeDate(trip?.date) ===
                              day.date &&
                            getTripType(trip) === "Loading"
                        ).length
                      }
                    </strong>
                  </span>

                  <span>
                    Unloading{" "}
                    <strong>
                      {
                        filteredTrips.filter(
                          (trip) =>
                            normalizeDate(trip?.date) ===
                              day.date &&
                            getTripType(trip) === "Unloading"
                        ).length
                      }
                    </strong>
                  </span>

                  <span>
                    Site to Site{" "}
                    <strong>
                      {
                        filteredTrips.filter(
                          (trip) =>
                            normalizeDate(trip?.date) ===
                              day.date &&
                            getTripType(trip) ===
                              "Site to Site"
                        ).length
                      }
                    </strong>
                  </span>
                </div>

                <div className="dw-daily-detail-grid">
                  {[
                    {
                      title: "Tractors",
                      subtitle: "Vehicle activity",
                      icon: Truck,
                      data: day.tractorWise,
                    },
                    {
                      title: "Parties",
                      subtitle: "Party billing",
                      icon: Users,
                      data: day.partyWise,
                    },
                    {
                      title: "Materials",
                      subtitle: "Material billing",
                      icon: Package,
                      data: day.materialWise,
                    },
                  ].map((group) => {
                    const Icon = group.icon;

                    return (
                      <div
                        className="dw-daily-detail-card"
                        key={group.title}
                      >
                        <div className="dw-daily-detail-header">
                          <div>
                            <span>{group.subtitle}</span>
                            <h3>{group.title}</h3>
                          </div>

                          <Icon size={15} />
                        </div>

                        <div className="dw-daily-detail-table">
                          <div className="dw-daily-detail-row dw-daily-detail-row-head">
                            <span>Name</span>
                            <span>Trips</span>
                            <span>Qty</span>
                            <span>Amount</span>
                          </div>

                          {group.data.length === 0 ? (
                            <div className="dw-daily-detail-empty">
                              No data
                            </div>
                          ) : (
                            group.data.slice(0, 5).map((item) => (
                              <div
                                className="dw-daily-detail-row"
                                key={item.name}
                              >
                                <strong title={item.name}>
                                  {item.name}
                                </strong>

                                <span>{item.trips}</span>

                                <span>
                                  {formatNumber(
                                    item.quantity
                                  )}
                                </span>

                                <span className="dw-daily-detail-amount">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          PRINT DOCUMENT
          Hidden on screen, used for clean full-report printing
          and browser Save as PDF.
      ====================================================== */}
      <div className="dw-print-only">
        <DateWisePrintDocument
          periodText={periodText}
          fromDate={fromDate}
          toDate={toDate}
          summary={summary}
          filteredTrips={filteredTrips}
          dailySummary={dailySummary}
        />
      </div>

      {/* =====================================================
          PRINT PREVIEW
      ====================================================== */}
      {showPrintPreview && (
        <div
          className="dw-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPrintPreview(false);
            }
          }}
        >
          <div
            className="dw-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dw-preview-title"
          >
            <div className="dw-preview-header">
              <div>
                <span>PRINT PREVIEW</span>
                <h2 id="dw-preview-title">Date Wise Report</h2>
                <p>
                  Review the final report before printing or saving it as PDF.
                </p>
              </div>

              <button
                type="button"
                className="dw-edit-close"
                onClick={() => setShowPrintPreview(false)}
                aria-label="Close print preview"
                title="Close preview"
              >
                <X size={17} />
              </button>
            </div>

            <div className="dw-preview-toolbar">
              <div>
                <span>Selected period</span>
                <strong>{periodText}</strong>
              </div>

              <span className="dw-preview-record-count">
                {filteredTrips.length} records
              </span>
            </div>

            <div className="dw-preview-scroll">
              <DateWisePrintDocument
                periodText={periodText}
                fromDate={fromDate}
                toDate={toDate}
                summary={summary}
                filteredTrips={filteredTrips}
                dailySummary={dailySummary}
              />
            </div>

            <div className="dw-preview-footer">
              <button
                type="button"
                className="dw-button dw-button-secondary"
                onClick={() => setShowPrintPreview(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="dw-button dw-button-primary"
                onClick={printReport}
              >
                <Printer size={14} />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW MODAL
      ====================================================== */}
      {selectedTrip && (
        <div
          className="dw-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTrip(null);
            }
          }}
        >
          <div className="dw-modal" role="dialog" aria-modal="true">
            <div className="dw-modal-header">
              <div>
                <span>TRIP RECORD</span>

                <h2>
                  {getParty(selectedTrip) || "Trip Details"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                aria-label="Close details"
              >
                <X size={16} />
              </button>
            </div>

            <div className="dw-modal-summary">
              <div>
                <span>Date</span>
                <strong>
                  {formatDate(selectedTrip?.date)}
                </strong>
              </div>

              <div>
                <span>Vehicle</span>
                <strong>
                  {getVehicle(selectedTrip) || "—"}
                </strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>
                  {formatCurrency(getAmount(selectedTrip))}
                </strong>
              </div>
            </div>

            <div className="dw-modal-grid">
              <div>
                <span>Party</span>
                <strong>
                  {getParty(selectedTrip) || "—"}
                </strong>
              </div>

              <div>
                <span>Material</span>
                <strong>
                  {getMaterial(selectedTrip) || "—"}
                </strong>
              </div>

              <div>
                <span>Trip Type</span>
                <strong>
                  {getTripType(selectedTrip)}
                </strong>
              </div>

              <div>
                <span>Site</span>
                <strong>
                  {getSite(selectedTrip) || "—"}
                </strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>
                  {formatNumber(getQuantity(selectedTrip))}{" "}
                  {getUnit(selectedTrip)}
                </strong>
              </div>

              <div>
                <span>Rate</span>
                <strong>
                  {formatCurrency(getRate(selectedTrip))}
                </strong>
              </div>

              <div>
                <span>Driver</span>
                <strong>
                  {selectedTrip?.driverName || "—"}
                </strong>
              </div>

              <div>
                <span>Created</span>
                <strong>
                  {selectedTrip?.createdAt
                    ? new Date(
                        selectedTrip.createdAt
                      ).toLocaleString("en-IN")
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Updated</span>
                <strong>
                  {selectedTrip?.updatedAt
                    ? new Date(
                        selectedTrip.updatedAt
                      ).toLocaleString("en-IN")
                    : "—"}
                </strong>
              </div>
            </div>

            {selectedTrip?.notes && (
              <div className="dw-modal-notes">
                <span>Notes</span>
                <p>{selectedTrip.notes}</p>
              </div>
            )}

            <div className="dw-modal-footer">
              <button
                type="button"
                className="dw-button dw-button-secondary"
                onClick={() => cloneTrip(selectedTrip)}
              >
                <Copy size={14} />
                Clone
              </button>

              <button
                type="button"
                className="dw-button dw-button-secondary"
                onClick={() =>
                  shareWhatsApp(selectedTrip)
                }
              >
                <MessageCircle size={14} />
                WhatsApp
              </button>

              <button
                type="button"
                className="dw-button dw-button-secondary"
                onClick={() =>
                  openEditModal(selectedTrip)
                }
              >
                <Pencil size={14} />
                Edit
              </button>

              <button
                type="button"
                className="dw-button dw-button-primary"
                onClick={() => setSelectedTrip(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          EDIT MODAL
      ====================================================== */}
      {editTrip && (
        <DateWiseEditModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function DateWiseEditModal({ trip, onClose, onSave }) {
  const [form, setForm] = useState({
    id: trip?.id,
    date: normalizeDate(trip?.date),
    vehicleNumber: getVehicle(trip),
    partyName: getParty(trip),
    materialName: getMaterial(trip),
    driverName: trip?.driverName || "",
    tripType: getTripType(trip),
    site: getSite(trip),
    quantity: getQuantity(trip),
    unit: getUnit(trip),
    rate: getRate(trip),
    amount: getAmount(trip),
    notes: trip?.notes || "",
  });

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleQuantityChange = (value) => {
    setForm((current) => {
      const quantity = Number(value) || 0;
      const rate = Number(current.rate) || 0;

      return {
        ...current,
        quantity: value,
        amount: quantity * rate,
      };
    });
  };

  const handleRateChange = (value) => {
    setForm((current) => {
      const rate = Number(value) || 0;
      const quantity = Number(current.quantity) || 0;

      return {
        ...current,
        rate: value,
        amount: quantity * rate,
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.date) {
      alert("Date is required.");
      return;
    }

    if (!form.vehicleNumber.trim()) {
      alert("Vehicle number is required.");
      return;
    }

    if (!form.partyName.trim()) {
      alert("Party name is required.");
      return;
    }

    if (!form.materialName.trim()) {
      alert("Material is required.");
      return;
    }

    onSave({
      ...form,
      vehicleNumber: form.vehicleNumber.trim(),
      partyName: form.partyName.trim(),
      materialName: form.materialName.trim(),
      driverName: form.driverName.trim(),
      site: form.site.trim(),
      notes: form.notes.trim(),
      quantity: Number(form.quantity) || 0,
      rate: Number(form.rate) || 0,
      amount: Number(form.amount) || 0,
    });
  };

  return (
    <div
      className="dw-edit-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="dw-edit-modal" role="dialog" aria-modal="true">
        <div className="dw-edit-header">
          <div>
            <span className="dw-edit-eyebrow">
              QUICK EDIT
            </span>

            <h2>Edit Trip Record</h2>

            <p>
              Update the selected trip without changing the
              existing record structure.
            </p>
          </div>

          <button
            type="button"
            className="dw-edit-close"
            onClick={onClose}
            aria-label="Close edit"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dw-edit-grid">
            <label>
              <span>Date *</span>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  updateField("date", event.target.value)
                }
                required
              />
            </label>

            <label>
              <span>Vehicle Number *</span>

              <input
                type="text"
                value={form.vehicleNumber}
                onChange={(event) =>
                  updateField(
                    "vehicleNumber",
                    event.target.value
                  )
                }
                placeholder="Vehicle number"
                required
              />
            </label>

            <label>
              <span>Party Name *</span>

              <input
                type="text"
                value={form.partyName}
                onChange={(event) =>
                  updateField("partyName", event.target.value)
                }
                placeholder="Party name"
                required
              />
            </label>

            <label>
              <span>Material *</span>

              <input
                type="text"
                value={form.materialName}
                onChange={(event) =>
                  updateField(
                    "materialName",
                    event.target.value
                  )
                }
                placeholder="Material"
                required
              />
            </label>

            <label>
              <span>Driver</span>

              <input
                type="text"
                value={form.driverName}
                onChange={(event) =>
                  updateField(
                    "driverName",
                    event.target.value
                  )
                }
                placeholder="Driver name"
              />
            </label>

            <label>
              <span>Trip Type</span>

              <select
                value={form.tripType}
                onChange={(event) =>
                  updateField(
                    "tripType",
                    event.target.value
                  )
                }
              >
                <option value="Loading">Loading</option>
                <option value="Unloading">
                  Unloading
                </option>
                <option value="Site to Site">
                  Site to Site
                </option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="dw-edit-full">
              <span>Site / Location</span>

              <input
                type="text"
                value={form.site}
                onChange={(event) =>
                  updateField("site", event.target.value)
                }
                placeholder="Site or location"
              />
            </label>

            <label>
              <span>Quantity</span>

              <div className="dw-input-wrap">
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(event) =>
                    handleQuantityChange(
                      event.target.value
                    )
                  }
                />
              </div>

              <small className="dw-edit-helper">
                Enter quantity used for billing.
              </small>
            </label>

            <label>
              <span>Unit</span>

              <input
                type="text"
                value={form.unit}
                onChange={(event) =>
                  updateField("unit", event.target.value)
                }
                placeholder="Trip / Ton / Load"
              />
            </label>

            <label>
              <span>Rate</span>

              <div className="dw-input-wrap">
                <span>₹</span>

                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={form.rate}
                  onChange={(event) =>
                    handleRateChange(event.target.value)
                  }
                />
              </div>
            </label>

            <label>
              <span>Amount</span>

              <div className="dw-input-wrap">
                <span>₹</span>

                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) =>
                    updateField(
                      "amount",
                      event.target.value
                    )
                  }
                />
              </div>

              <small className="dw-edit-helper">
                Auto-calculated from quantity × rate.
              </small>
            </label>

            <label className="dw-edit-full">
              <span>Notes</span>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                placeholder="Optional notes..."
                rows={4}
              />
            </label>
          </div>

          <div className="dw-edit-footer">
            <button
              type="button"
              className="dw-button dw-button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="dw-button dw-button-primary"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DateWise;