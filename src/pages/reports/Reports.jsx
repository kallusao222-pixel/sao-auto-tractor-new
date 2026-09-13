import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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

/* =======================================================
   CONSTANTS
======================================================= */

const TRIPS_KEY = "saoAutoTractorTrips";
const PARTIES_KEY = "saoAutoTractorParties";
const TRACTORS_KEY = "saoAutoTractorTractors";

const PAGE_SIZE = 10;

/* =======================================================
   STORAGE
======================================================= */

const readStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const writeTrips = (trips) => {
  localStorage.setItem(
    TRIPS_KEY,
    JSON.stringify(trips)
  );

  window.dispatchEvent(
    new Event(
      "saoAutoTractorDataChanged"
    )
  );
};

/* =======================================================
   ID / IDENTITY HELPERS
======================================================= */

const getTripId = (
  trip,
  index = 0
) => {
  if (!trip) {
    return `trip-${index}`;
  }

  return (
    trip.id ??
    trip._id ??
    trip.tripId ??
    trip.__id ??
    `trip-${index}`
  );
};

const getTripIdentity = (
  trip,
  index = 0
) => {
  if (!trip) {
    return `trip-${index}`;
  }

  const explicitId =
    trip.id ??
    trip._id ??
    trip.tripId ??
    trip.__id;

  if (explicitId) {
    return `id:${explicitId}`;
  }

  const fingerprint = [
    trip.date ??
      trip.tripDate ??
      trip.createdAt ??
      trip.createdDate ??
      "",
    trip.vehicleNumber ??
      trip.tractorNumber ??
      trip.tractorNo ??
      trip.vehicleNo ??
      trip.vehicle ??
      "",
    trip.partyName ??
      trip.party ??
      trip.customerName ??
      trip.customer ??
      "",
    trip.materialName ??
      trip.material ??
      trip.productName ??
      trip.product ??
      "",
    trip.siteName ??
      trip.site ??
      trip.location ??
      trip.destination ??
      "",
    trip.tripType ??
      trip.type ??
      trip.workType ??
      trip.jobType ??
      "",
    trip.quantity ??
      trip.qty ??
      trip.loadQuantity ??
      trip.tripQuantity ??
      "",
    trip.unit ??
      trip.quantityUnit ??
      trip.measurementUnit ??
      "",
    trip.rate ??
      trip.price ??
      trip.tripRate ??
      trip.amountPerTrip ??
      "",
    trip.amount ??
      trip.totalAmount ??
      trip.billingAmount ??
      trip.total ??
      "",
    trip.driverName ??
      trip.driver ??
      "",
    trip.notes ??
      trip.description ??
      "",
  ];

  return `fingerprint:${fingerprint.join(
    "|"
  )}`;
};

const createTripId = () => {
  return `trip-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
};

/* =======================================================
   DATE HELPERS
======================================================= */

const normalizeDate = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const dateKey = (value) => {
  return normalizeDate(value);
};

const formatDate = (
  value
) => {
  const normalized =
    normalizeDate(value);

  if (!normalized) {
    return "—";
  }

  const [
    year,
    month,
    day,
  ] = normalized.split("-");

  return `${day}/${month}/${year}`;
};

const formatLongDate = (
  value
) => {
  const normalized =
    normalizeDate(value);

  if (!normalized) {
    return "—";
  }

  const date = new Date(
    `${normalized}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
};

const getToday = () => {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getStartOfWeek = () => {
  const today =
    new Date();

  const day =
    today.getDay();

  const diff =
    day === 0
      ? 6
      : day - 1;

  today.setDate(
    today.getDate() - diff
  );

  return normalizeDate(
    today
  );
};

const getStartOfMonth = () => {
  const today =
    new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-01`;
};

/* =======================================================
   FORMATTERS
======================================================= */

const formatCurrency = (
  value
) => {
  const number =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(number);
};

const formatNumber = (
  value
) => {
  const number =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(number);
};

const escapeHTML = (
  value
) => {
  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
};

/* =======================================================
   TRIP HELPERS
======================================================= */

const getTripDate = (
  trip
) => {
  return (
    trip?.date ??
    trip?.tripDate ??
    trip?.createdAt ??
    trip?.createdDate ??
    ""
  );
};

const getTripType = (
  trip
) => {
  const raw = String(
    trip?.tripType ??
      trip?.type ??
      trip?.workType ??
      trip?.jobType ??
      ""
  )
    .trim()
    .toLowerCase();

  if (
    raw.includes("load") ||
    raw === "loading"
  ) {
    return "Loading";
  }

  if (
    raw.includes("unload") ||
    raw === "unloading"
  ) {
    return "Unloading";
  }

  if (
    raw.includes("site") &&
    raw.includes("site")
  ) {
    return "Site-to-Site";
  }

  if (
    raw.includes("site to site") ||
    raw.includes("site-to-site") ||
    raw.includes("site2site")
  ) {
    return "Site-to-Site";
  }

  return (
    trip?.tripType ??
      trip?.type ??
      trip?.workType ??
      "Other"
  );
};

const getVehicle = (
  trip
) => {
  return String(
    trip?.vehicleNumber ??
      trip?.tractorNumber ??
      trip?.tractorNo ??
      trip?.vehicleNo ??
      trip?.vehicle ??
      ""
  ).trim();
};

const getParty = (
  trip
) => {
  return String(
    trip?.partyName ??
      trip?.party ??
      trip?.customerName ??
      trip?.customer ??
      ""
  ).trim();
};

const getMaterial = (
  trip
) => {
  return String(
    trip?.materialName ??
      trip?.material ??
      trip?.productName ??
      trip?.product ??
      ""
  ).trim();
};

const getSite = (
  trip
) => {
  return String(
    trip?.siteName ??
      trip?.site ??
      trip?.location ??
      trip?.destination ??
      ""
  ).trim();
};

const getQuantity = (
  trip
) => {
  const value =
    trip?.quantity ??
    trip?.qty ??
    trip?.loadQuantity ??
    trip?.tripQuantity;

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const getRate = (
  trip
) => {
  const value =
    trip?.rate ??
    trip?.price ??
    trip?.tripRate ??
    trip?.amountPerTrip;

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const getAmount = (
  trip
) => {
  const direct =
    trip?.amount ??
    trip?.totalAmount ??
    trip?.billingAmount ??
    trip?.total;

  if (
    direct !== undefined &&
    direct !== null &&
    direct !== "" &&
    Number.isFinite(
      Number(direct)
    )
  ) {
    return Number(direct);
  }

  return (
    getQuantity(trip) *
    getRate(trip)
  );
};

const getUnit = (
  trip
) => {
  return String(
    trip?.unit ??
      trip?.quantityUnit ??
      trip?.measurementUnit ??
      ""
  ).trim();
};

/* =======================================================
   STAT CARD
======================================================= */

const StatCard = ({
  icon: Icon,
  label,
  value,
  detail,
  type = "default",
}) => {
  return (
    <div
      className={`report-stat-card report-stat-${type}`}
    >
      <div className="report-stat-icon">
        <Icon size={18} />
      </div>

      <div className="report-stat-content">
        <span className="report-stat-label">
          {label}
        </span>

        <strong>
          {value}
        </strong>

        {detail && (
          <small>
            {detail}
          </small>
        )}
      </div>
    </div>
  );
};

/* =======================================================
   BREAKDOWN BAR
======================================================= */

const BreakdownBar = ({
  label,
  value,
  total,
  amount,
}) => {
  const percentage =
    total > 0
      ? Math.min(
          100,
          (value / total) * 100
        )
      : 0;

  return (
    <div className="breakdown-item">
      <div className="breakdown-top">
        <strong>
          {label}
        </strong>

        <span>
          {value}{" "}
          {value === 1
            ? "record"
            : "records"}
        </span>
      </div>

      <div className="breakdown-track">
        <div
          className="breakdown-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="breakdown-bottom">
        <span>
          {percentage.toFixed(
            1
          )}
          %
        </span>

        <strong>
          {formatCurrency(
            amount
          )}
        </strong>
      </div>
    </div>
  );
};

/* =======================================================
   DETAIL MODAL
======================================================= */

const DetailModal = ({
  trip,
  onClose,
  onClone,
  onEdit,
  onDelete,
  onWhatsAppShare,
}) => {
  if (!trip) {
    return null;
  }

  return (
    <div
      className="report-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Trip details"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="report-modal">
        <div className="report-modal-header">
          <div>
            <span className="report-modal-eyebrow">
              RECORD DETAIL
            </span>

            <h2>
              Trip Details
            </h2>
          </div>

          <button
            type="button"
            className="report-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="report-modal-summary">
          <strong>
            {formatCurrency(
              getAmount(trip)
            )}
          </strong>

          <span>
            {getTripType(trip)}
          </span>
        </div>

        <div className="report-modal-grid">
          <div>
            <span>Date</span>
            <strong>
              {formatLongDate(
                getTripDate(trip)
              )}
            </strong>
          </div>

          <div>
            <span>Vehicle</span>
            <strong>
              {getVehicle(trip) ||
                "—"}
            </strong>
          </div>

          <div>
            <span>Party</span>
            <strong>
              {getParty(trip) ||
                "—"}
            </strong>
          </div>

          <div>
            <span>Material</span>
            <strong>
              {getMaterial(trip) ||
                "—"}
            </strong>
          </div>

          <div>
            <span>Site</span>
            <strong>
              {getSite(trip) ||
                "—"}
            </strong>
          </div>

          <div>
            <span>Quantity</span>
            <strong>
              {formatNumber(
                getQuantity(trip)
              )}{" "}
              {getUnit(trip)}
            </strong>
          </div>

          <div>
            <span>Rate</span>
            <strong>
              {formatCurrency(
                getRate(trip)
              )}
            </strong>
          </div>

          <div>
            <span>Driver</span>
            <strong>
              {trip?.driverName ??
                trip?.driver ??
                "—"}
            </strong>
          </div>
        </div>

        {(trip?.notes ||
          trip?.description) && (
          <div className="report-modal-notes">
            <span>
              Notes
            </span>

            <p>
              {trip.notes ??
                trip.description}
            </p>
          </div>
        )}

        <div className="report-modal-footer">
          <button
            type="button"
            className="report-action secondary"
            onClick={() =>
              onWhatsAppShare(
                trip
              )
            }
          >
            <MessageCircle
              size={16}
            />
            WhatsApp
          </button>

          <button
            type="button"
            className="report-action secondary"
            onClick={() =>
              onClone(trip)
            }
          >
            <Copy size={16} />
            Clone
          </button>

          <button
            type="button"
            className="report-action secondary"
            onClick={() =>
              onEdit(trip)
            }
          >
            <Pencil size={16} />
            Edit
          </button>

          <button
            type="button"
            className="report-action danger"
            onClick={() =>
              onDelete(trip)
            }
          >
            <Trash2 size={16} />
            Delete
          </button>

          <button
            type="button"
            className="report-action primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* =======================================================
   EDIT MODAL
======================================================= */

const EditModal = ({
  trip,
  onClose,
  onSave,
}) => {
  const createForm = (
    source
  ) => ({
    date: normalizeDate(
      getTripDate(source)
    ),
    vehicleNumber:
      getVehicle(source),
    partyName:
      getParty(source),
    materialName:
      getMaterial(source),
    driverName:
      source?.driverName ??
      source?.driver ??
      "",
    tripType:
      getTripType(source),
    site: getSite(source),
    quantity:
      getQuantity(source),
    unit:
      getUnit(source),
    rate:
      getRate(source),
    amount:
      getAmount(source),
    notes:
      source?.notes ??
      source?.description ??
      "",
  });

  const [
    form,
    setForm,
  ] = useState(() =>
    createForm(trip)
  );

  useEffect(() => {
    setForm(
      createForm(trip)
    );
  }, [trip]);

  const updateField = (
    field,
    value
  ) => {
    setForm(
      (current) => {
        const next = {
          ...current,
          [field]: value,
        };

        if (
          field === "quantity" ||
          field === "rate"
        ) {
          const quantity =
            Number(
              field ===
                "quantity"
                ? value
                : current.quantity
            ) || 0;

          const rate =
            Number(
              field === "rate"
                ? value
                : current.rate
            ) || 0;

          next.amount =
            quantity * rate;
        }

        return next;
      }
    );
  };

  const submit = (
    event
  ) => {
    event.preventDefault();

    if (
      form.date &&
      form.date >
        getToday()
    ) {
      alert(
        "Future date is not allowed."
      );

      return;
    }

    if (
      !form.vehicleNumber.trim()
    ) {
      alert(
        "Please enter vehicle number."
      );

      return;
    }

    onSave({
      ...form,
      quantity:
        Number(
          form.quantity
        ) || 0,
      rate:
        Number(
          form.rate
        ) || 0,
      amount:
        Number(
          form.amount
        ) || 0,
    });
  };

  return (
    <div
      className="report-edit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Edit trip"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <form
        className="report-edit-modal"
        onSubmit={submit}
      >
        <div className="report-edit-header">
          <div>
            <span className="report-edit-eyebrow">
              RECORD UPDATE
            </span>

            <h2>
              Edit Trip
            </h2>
          </div>

          <button
            type="button"
            className="report-edit-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="report-edit-grid">
          <label className="report-input-wrap">
            <span>Date</span>

            <input
              type="date"
              value={form.date}
              onChange={(event) =>
                updateField(
                  "date",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Vehicle Number</span>

            <input
              type="text"
              value={
                form.vehicleNumber
              }
              onChange={(event) =>
                updateField(
                  "vehicleNumber",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Party</span>

            <input
              type="text"
              value={
                form.partyName
              }
              onChange={(event) =>
                updateField(
                  "partyName",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Material</span>

            <input
              type="text"
              value={
                form.materialName
              }
              onChange={(event) =>
                updateField(
                  "materialName",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Driver</span>

            <input
              type="text"
              value={
                form.driverName
              }
              onChange={(event) =>
                updateField(
                  "driverName",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Trip Type</span>

            <select
              value={
                form.tripType
              }
              onChange={(event) =>
                updateField(
                  "tripType",
                  event.target.value
                )
              }
            >
              <option value="Loading">
                Loading
              </option>

              <option value="Unloading">
                Unloading
              </option>

              <option value="Site-to-Site">
                Site-to-Site
              </option>
            </select>
          </label>

          <label className="report-input-wrap">
            <span>Site</span>

            <input
              type="text"
              value={form.site}
              onChange={(event) =>
                updateField(
                  "site",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Quantity</span>

            <input
              type="number"
              step="any"
              value={
                form.quantity
              }
              onChange={(event) =>
                updateField(
                  "quantity",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Unit</span>

            <input
              type="text"
              value={form.unit}
              onChange={(event) =>
                updateField(
                  "unit",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Rate</span>

            <input
              type="number"
              step="any"
              value={form.rate}
              onChange={(event) =>
                updateField(
                  "rate",
                  event.target.value
                )
              }
            />
          </label>

          <label className="report-input-wrap">
            <span>Amount</span>

            <input
              type="number"
              step="any"
              value={form.amount}
              onChange={(event) =>
                updateField(
                  "amount",
                  event.target.value
                )
              }
            />

            <small className="report-edit-helper">
              Auto-calculated from
              quantity × rate.
            </small>
          </label>

          <label className="report-input-wrap report-edit-full">
            <span>Notes</span>

            <textarea
              rows="3"
              value={form.notes}
              onChange={(event) =>
                updateField(
                  "notes",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="report-edit-footer">
          <button
            type="button"
            className="report-action secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="report-action primary"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

/* =======================================================
   DELETE CONFIRM MODAL
======================================================= */

const DeleteConfirmModal = ({
  trip,
  onCancel,
  onConfirm,
}) => {
  return (
    <div
      className="report-delete-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Delete confirmation"
    >
      <div className="report-delete-modal">
        <div className="report-delete-icon">
          <Trash2 size={21} />
        </div>

        <div className="report-delete-content">
          <span className="report-delete-eyebrow">
            DELETE RECORD
          </span>

          <h2>
            Delete this trip?
          </h2>

          <p className="report-delete-summary">
            {formatDate(
              getTripDate(trip)
            )}{" "}
            ·{" "}
            {getVehicle(trip) ||
              "No vehicle"}{" "}
            ·{" "}
            {getParty(trip) ||
              "No party"}
          </p>

          <p className="report-delete-warning">
            This action permanently
            removes the selected
            transport record from
            local storage.
          </p>
        </div>

        <div className="report-delete-actions">
          <button
            type="button"
            className="report-action secondary"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="report-action danger"
            onClick={onConfirm}
          >
            <Trash2 size={16} />
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
};

/* =======================================================
   REPORTS
======================================================= */

const Reports = () => {
  const [
    trips,
    setTrips,
  ] = useState([]);

  const [
    parties,
    setParties,
  ] = useState([]);

  const [
    tractors,
    setTractors,
  ] = useState([]);

  const [
    fromDate,
    setFromDate,
  ] = useState(
    getStartOfMonth()
  );

  const [
    toDate,
    setToDate,
  ] = useState(
    getToday()
  );

  const [
    partyFilter,
    setPartyFilter,
  ] = useState("");

  const [
    tractorFilter,
    setTractorFilter,
  ] = useState("");

  const [
    materialFilter,
    setMaterialFilter,
  ] = useState("");

  const [
    tripTypeFilter,
    setTripTypeFilter,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const [
    activePreset,
    setActivePreset,
  ] = useState(
    "This Month"
  );

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    selectedTrip,
    setSelectedTrip,
  ] = useState(null);

  const [
    editTrip,
    setEditTrip,
  ] = useState(null);

  const [
    deleteTrip,
    setDeleteTrip,
  ] = useState(null);

  const [
    trendMode,
    setTrendMode,
  ] = useState("billing");

  const [
    showPrintPreview,
    setShowPrintPreview,
  ] = useState(false);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData = () => {
    setTrips(
      readStorage(
        TRIPS_KEY
      )
    );

    setParties(
      readStorage(
        PARTIES_KEY
      )
    );

    setTractors(
      readStorage(
        TRACTORS_KEY
      )
    );
  };

  useEffect(() => {
    loadData();

    const handleStorage =
      () => loadData();

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "saoAutoTractorDataChanged",
      handleStorage
    );

    const interval =
      window.setInterval(
        loadData,
        1500
      );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "saoAutoTractorDataChanged",
        handleStorage
      );

      window.clearInterval(
        interval
      );
    };
  }, []);

  /* =====================================================
     ESCAPE KEY
  ===================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      if (
        showPrintPreview
      ) {
        setShowPrintPreview(
          false
        );
        return;
      }

      if (deleteTrip) {
        setDeleteTrip(null);
        return;
      }

      if (editTrip) {
        setEditTrip(null);
        return;
      }

      if (selectedTrip) {
        setSelectedTrip(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    showPrintPreview,
    deleteTrip,
    editTrip,
    selectedTrip,
  ]);

  /* =====================================================
     FILTER OPTIONS
  ===================================================== */

  const materialOptions =
    useMemo(() => {
      const values =
        trips
          .map(
            (trip) =>
              getMaterial(trip)
          )
          .filter(Boolean);

      return [
        ...new Set(values),
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [trips]);

  const partyOptions =
    useMemo(() => {
      const values = [
        ...parties.map(
          (party) =>
            party?.name ??
            party?.partyName ??
            party?.party ??
            ""
        ),
        ...trips.map(
          (trip) =>
            getParty(trip)
        ),
      ].filter(Boolean);

      return [
        ...new Set(values),
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [
      parties,
      trips,
    ]);

  const tractorOptions =
    useMemo(() => {
      const values = [
        ...tractors.map(
          (tractor) =>
            tractor?.vehicleNumber ??
            tractor?.tractorNumber ??
            tractor?.vehicleNo ??
            tractor?.vehicle ??
            ""
        ),
        ...trips.map(
          (trip) =>
            getVehicle(trip)
        ),
      ].filter(Boolean);

      return [
        ...new Set(values),
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [
      tractors,
      trips,
    ]);

  /* =====================================================
     DATE VALIDATION
  ===================================================== */

  const invalidDateRange =
    Boolean(
      fromDate &&
        toDate &&
        fromDate > toDate
    );

  /* =====================================================
     FILTERED TRIPS
  ===================================================== */

  const filteredTrips =
    useMemo(() => {
      if (
        invalidDateRange
      ) {
        return [];
      }

      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return trips
        .map(
          (
            trip,
            originalIndex
          ) => ({
            trip,
            originalIndex,
          })
        )
        .filter(
          ({
            trip,
          }) => {
            const tripDate =
              normalizeDate(
                getTripDate(trip)
              );

            if (
              fromDate &&
              tripDate &&
              tripDate <
                fromDate
            ) {
              return false;
            }

            if (
              toDate &&
              tripDate &&
              tripDate >
                toDate
            ) {
              return false;
            }

            if (
              partyFilter &&
              getParty(trip) !==
                partyFilter
            ) {
              return false;
            }

            if (
              tractorFilter &&
              getVehicle(
                trip
              ) !==
                tractorFilter
            ) {
              return false;
            }

            if (
              materialFilter &&
              getMaterial(
                trip
              ) !==
                materialFilter
            ) {
              return false;
            }

            if (
              tripTypeFilter &&
              getTripType(
                trip
              ) !==
                tripTypeFilter
            ) {
              return false;
            }

            if (
              normalizedSearch
            ) {
              const haystack =
                [
                  getParty(
                    trip
                  ),
                  getVehicle(
                    trip
                  ),
                  getMaterial(
                    trip
                  ),
                  getSite(
                    trip
                  ),
                  getTripType(
                    trip
                  ),
                  trip?.driverName ??
                    trip?.driver ??
                    "",
                  trip?.notes ??
                    trip?.description ??
                    "",
                ]
                  .join(" ")
                  .toLowerCase();

              if (
                !haystack.includes(
                  normalizedSearch
                )
              ) {
                return false;
              }
            }

            return true;
          }
        )
        .sort(
          (
            a,
            b
          ) => {
            const dateA =
              normalizeDate(
                getTripDate(
                  a.trip
                )
              );

            const dateB =
              normalizeDate(
                getTripDate(
                  b.trip
                )
              );

            if (
              dateA !==
              dateB
            ) {
              return dateB.localeCompare(
                dateA
              );
            }

            const updatedA =
              new Date(
                a.trip
                  ?.updatedAt ??
                  a.trip
                    ?.createdAt ??
                  0
              ).getTime();

            const updatedB =
              new Date(
                b.trip
                  ?.updatedAt ??
                  b.trip
                    ?.createdAt ??
                  0
              ).getTime();

            if (
              updatedA !==
              updatedB
            ) {
              return (
                updatedB -
                updatedA
              );
            }

            return (
              a.originalIndex -
              b.originalIndex
            );
          }
        )
        .map(
          ({
            trip,
          }) => trip
        );
    }, [
      trips,
      fromDate,
      toDate,
      partyFilter,
      tractorFilter,
      materialFilter,
      tripTypeFilter,
      search,
      invalidDateRange,
    ]);

  /* =====================================================
     PAGE
  ===================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredTrips.length /
          PAGE_SIZE
      )
    );

  const paginatedTrips =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredTrips.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      filteredTrips,
      page,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    fromDate,
    toDate,
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
    search,
  ]);

  useEffect(() => {
    if (
      page > totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    page,
    totalPages,
  ]);

  /* =====================================================
     FILTER STATE
  ===================================================== */

  const hasActiveFilters =
    Boolean(
      partyFilter ||
        tractorFilter ||
        materialFilter ||
        tripTypeFilter ||
        search
    );

  const activeFilterLabels =
    useMemo(() => {
      const filters = [];

      if (partyFilter) {
        filters.push(
          `Party: ${partyFilter}`
        );
      }

      if (tractorFilter) {
        filters.push(
          `Tractor: ${tractorFilter}`
        );
      }

      if (materialFilter) {
        filters.push(
          `Material: ${materialFilter}`
        );
      }

      if (tripTypeFilter) {
        filters.push(
          `Type: ${tripTypeFilter}`
        );
      }

      if (search) {
        filters.push(
          `Search: "${search}"`
        );
      }

      return filters;
    }, [
      partyFilter,
      tractorFilter,
      materialFilter,
      tripTypeFilter,
      search,
    ]);

  /* =====================================================
     PRESETS
  ===================================================== */

  const applyPreset = (
    preset
  ) => {
    const today =
      getToday();

    if (
      preset ===
      "Today"
    ) {
      setFromDate(today);
      setToDate(today);
    }

    if (
      preset ===
      "This Week"
    ) {
      setFromDate(
        getStartOfWeek()
      );
      setToDate(today);
    }

    if (
      preset ===
      "This Month"
    ) {
      setFromDate(
        getStartOfMonth()
      );
      setToDate(today);
    }

    if (
      preset ===
      "All Time"
    ) {
      setFromDate("");
      setToDate("");
    }

    setActivePreset(
      preset
    );
  };

  const clearFilters =
    () => {
      setPartyFilter("");
      setTractorFilter("");
      setMaterialFilter("");
      setTripTypeFilter("");
      setSearch("");
      setFromDate(
        getStartOfMonth()
      );
      setToDate(
        getToday()
      );
      setActivePreset(
        "This Month"
      );
      setPage(1);
    };

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary =
    useMemo(() => {
      const records =
        filteredTrips.length;

      const loading =
        filteredTrips.filter(
          (trip) =>
            getTripType(
              trip
            ) ===
            "Loading"
        ).length;

      const unloading =
        filteredTrips.filter(
          (trip) =>
            getTripType(
              trip
            ) ===
            "Unloading"
        ).length;

      const siteToSite =
        filteredTrips.filter(
          (trip) =>
            getTripType(
              trip
            ) ===
            "Site-to-Site"
        ).length;

      const quantity =
        filteredTrips.reduce(
          (
            sum,
            trip
          ) =>
            sum +
            getQuantity(
              trip
            ),
          0
        );

      const billing =
        filteredTrips.reduce(
          (
            sum,
            trip
          ) =>
            sum +
            getAmount(
              trip
            ),
          0
        );

      const tripsCount =
        filteredTrips.length;

      return {
        records,
        trips:
          tripsCount,
        loading,
        unloading,
        siteToSite,
        quantity,
        billing,
        averageTripValue:
          tripsCount > 0
            ? billing /
              tripsCount
            : 0,
      };
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     QUICK STATS
  ===================================================== */

  const quickStats =
    useMemo(() => {
      const days =
        new Set(
          filteredTrips
            .map(
              (trip) =>
                dateKey(
                  getTripDate(
                    trip
                  )
                )
            )
            .filter(Boolean)
        );

      const totalDays =
        days.size;

      const avgPerDay =
        totalDays > 0
          ? summary.billing /
            totalDays
          : 0;

      const byDay =
        {};

      filteredTrips.forEach(
        (trip) => {
          const date =
            dateKey(
              getTripDate(
                trip
              )
            );

          if (!date) {
            return;
          }

          if (!byDay[date]) {
            byDay[date] = {
              date,
              trips: 0,
              billing: 0,
            };
          }

          byDay[date].trips += 1;

          byDay[date].billing +=
            getAmount(trip);
        }
      );

      const busiestDay =
        Object.values(
          byDay
        ).sort(
          (a, b) =>
            b.billing -
            a.billing
        )[0] ?? null;

      return {
        totalDays,
        avgPerDay,
        busiestDay,
      };
    }, [
      filteredTrips,
      summary.billing,
    ]);

  /* =====================================================
     DAY COMPARISON
  ===================================================== */

  const dayComparison =
    useMemo(() => {
      const today =
        getToday();

      const yesterdayDate =
        new Date();

      yesterdayDate.setDate(
        yesterdayDate.getDate() -
          1
      );

      const yesterday =
        normalizeDate(
          yesterdayDate
        );

      const todayTrips =
        filteredTrips.filter(
          (trip) =>
            dateKey(
              getTripDate(
                trip
              )
            ) === today
        );

      const yesterdayTrips =
        filteredTrips.filter(
          (trip) =>
            dateKey(
              getTripDate(
                trip
              )
            ) ===
            yesterday
        );

      const todayBilling =
        todayTrips.reduce(
          (
            sum,
            trip
          ) =>
            sum +
            getAmount(
              trip
            ),
          0
        );

      const yesterdayBilling =
        yesterdayTrips.reduce(
          (
            sum,
            trip
          ) =>
            sum +
            getAmount(
              trip
            ),
          0
        );

      const billingChange =
        yesterdayBilling ===
        0
          ? todayBilling > 0
            ? 100
            : 0
          : ((todayBilling -
              yesterdayBilling) /
              yesterdayBilling) *
            100;

      return {
        todayBilling,
        yesterdayBilling,
        todayTrips:
          todayTrips.length,
        yesterdayTrips:
          yesterdayTrips.length,
        billingChange,
      };
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     TREND
  ===================================================== */

  const trendData =
    useMemo(() => {
      const grouped =
        {};

      filteredTrips.forEach(
        (trip) => {
          const date =
            dateKey(
              getTripDate(
                trip
              )
            );

          if (!date) {
            return;
          }

          if (!grouped[date]) {
            grouped[date] = {
              date,
              trips: 0,
              billing: 0,
            };
          }

          grouped[date].trips += 1;

          grouped[date].billing +=
            getAmount(trip);
        }
      );

      const data =
        Object.values(
          grouped
        ).sort(
          (a, b) =>
            a.date.localeCompare(
              b.date
            )
        );

      const max =
        data.length
          ? Math.max(
              ...data.map(
                (item) =>
                  trendMode ===
                  "billing"
                    ? item.billing
                    : item.trips
              )
            )
          : 0;

      return {
        data,
        max,
      };
    }, [
      filteredTrips,
      trendMode,
    ]);

  /* =====================================================
     TOP PERFORMERS
  ===================================================== */

  const topPerformers =
    useMemo(() => {
      const groupBy =
        (
          getter
        ) => {
          const map =
            {};

          filteredTrips.forEach(
            (trip) => {
              const name =
                getter(
                  trip
                );

              if (!name) {
                return;
              }

              if (!map[name]) {
                map[name] = {
                  name,
                  trips: 0,
                  billing: 0,
                };
              }

              map[name].trips += 1;

              map[name].billing +=
                getAmount(
                  trip
                );
            }
          );

          return Object.values(
            map
          )
            .sort(
              (a, b) =>
                b.billing -
                a.billing
            )
            .slice(0, 5);
        };

      return {
        parties:
          groupBy(
            getParty
          ),
        tractors:
          groupBy(
            getVehicle
          ),
        materials:
          groupBy(
            getMaterial
          ),
      };
    }, [
      filteredTrips,
    ]);

  const topParties =
    topPerformers.parties;

  const topTractors =
    topPerformers.tractors;

  const topMaterials =
    topPerformers.materials;

  /* =====================================================
     PARTY REPORT
  ===================================================== */

  const partyReport =
    useMemo(() => {
      const map =
        {};

      filteredTrips.forEach(
        (trip) => {
          const name =
            getParty(trip) ||
            "Unknown";

          if (!map[name]) {
            map[name] = {
              name,
              trips: 0,
              quantity: 0,
              billing: 0,
            };
          }

          map[name].trips += 1;

          map[name].quantity +=
            getQuantity(
              trip
            );

          map[name].billing +=
            getAmount(
              trip
            );
        }
      );

      return Object.values(
        map
      ).sort(
        (a, b) =>
          b.billing -
          a.billing
      );
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     TRACTOR REPORT
  ===================================================== */

  const tractorReport =
    useMemo(() => {
      const map =
        {};

      filteredTrips.forEach(
        (trip) => {
          const name =
            getVehicle(trip) ||
            "Unknown";

          if (!map[name]) {
            map[name] = {
              name,
              trips: 0,
              quantity: 0,
              billing: 0,
            };
          }

          map[name].trips += 1;

          map[name].quantity +=
            getQuantity(
              trip
            );

          map[name].billing +=
            getAmount(
              trip
            );
        }
      );

      return Object.values(
        map
      ).sort(
        (a, b) =>
          b.trips -
          a.trips
      );
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     MATERIAL REPORT
  ===================================================== */

  const materialReport =
    useMemo(() => {
      const map =
        {};

      filteredTrips.forEach(
        (trip) => {
          const name =
            getMaterial(trip) ||
            "Unknown";

          if (!map[name]) {
            map[name] = {
              name,
              trips: 0,
              quantity: 0,
              billing: 0,
              unit:
                getUnit(trip),
            };
          }

          map[name].trips += 1;

          map[name].quantity +=
            getQuantity(
              trip
            );

          map[name].billing +=
            getAmount(
              trip
            );

          if (
            !map[name].unit &&
            getUnit(trip)
          ) {
            map[name].unit =
              getUnit(trip);
          }
        }
      );

      return Object.values(
        map
      ).sort(
        (a, b) =>
          b.quantity -
          a.quantity
      );
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     TRIP TYPE REPORT
  ===================================================== */

  const tripTypeReport =
    useMemo(() => {
      const order = [
        "Loading",
        "Unloading",
        "Site-to-Site",
        "Other",
      ];

      const map =
        {};

      order.forEach(
        (type) => {
          map[type] = {
            type,
            trips: 0,
            quantity: 0,
            billing: 0,
          };
        }
      );

      filteredTrips.forEach(
        (trip) => {
          const type =
            getTripType(trip);

          const key =
            order.includes(type)
              ? type
              : "Other";

          map[key].trips += 1;

          map[key].quantity +=
            getQuantity(
              trip
            );

          map[key].billing +=
            getAmount(
              trip
            );
        }
      );

      return order
        .map(
          (type) =>
            map[type]
        )
        .filter(
          (item) =>
            item.trips > 0
        );
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     DAILY REPORT
  ===================================================== */

  const dailyReport =
    useMemo(() => {
      const map =
        {};

      filteredTrips.forEach(
        (trip) => {
          const date =
            dateKey(
              getTripDate(
                trip
              )
            );

          if (!date) {
            return;
          }

          if (!map[date]) {
            map[date] = {
              date,
              trips: 0,
              quantity: 0,
              billing: 0,
            };
          }

          map[date].trips += 1;

          map[date].quantity +=
            getQuantity(
              trip
            );

          map[date].billing +=
            getAmount(
              trip
            );
        }
      );

      return Object.values(
        map
      )
        .sort(
          (a, b) =>
            b.date.localeCompare(
              a.date
            )
        )
        .slice(0, 10);
    }, [
      filteredTrips,
    ]);

  /* =====================================================
     CSV EXPORT
  ===================================================== */

  const exportCSV = () => {
    if (
      !filteredTrips.length
    ) {
      return;
    }

    const headers = [
      "Date",
      "Party",
      "Vehicle",
      "Material",
      "Site",
      "Trip Type",
      "Quantity",
      "Unit",
      "Rate",
      "Amount",
    ];

    const escapeCSV = (
      value
    ) => {
      const text =
        String(
          value ?? ""
        );

      if (
        /[",\n]/.test(
          text
        )
      ) {
        return `"${text.replaceAll(
          '"',
          '""'
        )}"`;
      }

      return text;
    };

    const rows =
      filteredTrips.map(
        (trip) =>
          [
            formatDate(
              getTripDate(
                trip
              )
            ),
            getParty(trip),
            getVehicle(trip),
            getMaterial(trip),
            getSite(trip),
            getTripType(trip),
            formatNumber(
              getQuantity(
                trip
              )
            ),
            getUnit(trip),
            formatCurrency(
              getRate(trip)
            ),
            formatCurrency(
              getAmount(trip)
            ),
          ]
            .map(
              escapeCSV
            )
            .join(",")
      );

    const csv = [
      headers.join(","),
      ...rows,
    ].join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download = `sao-auto-tractor-report-${getToday()}.csv`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url
    );
  };

  /* =======================================================
     PDF EXPORT
  ======================================================= */

  const handleExportPDF = () => {
    if (
      !filteredTrips.length
    ) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800"
      );

    if (!printWindow) {
      alert(
        "Please allow pop-ups to export PDF."
      );

      return;
    }

    const companyName =
      "SAO AUTO TRACTOR";

    const currentDate =
      new Date().toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );

    const from = fromDate
      ? formatDate(fromDate)
      : "All";

    const to = toDate
      ? formatDate(toDate)
      : "All";

    const filterText =
      activeFilterLabels.length
        ? activeFilterLabels.join(
            " · "
          )
        : "All records";

    const tableRows =
      filteredTrips
        .map(
          (trip) => `
            <tr>
              <td>${escapeHTML(
                formatDate(
                  getTripDate(
                    trip
                  )
                )
              )}</td>
              <td>${escapeHTML(
                getParty(trip)
              )}</td>
              <td>${escapeHTML(
                getVehicle(trip)
              )}</td>
              <td>${escapeHTML(
                getMaterial(trip)
              )}</td>
              <td>${escapeHTML(
                getTripType(trip)
              )}</td>
              <td>${escapeHTML(
                formatNumber(
                  getQuantity(
                    trip
                  )
                )
              )}</td>
              <td>${escapeHTML(
                formatCurrency(
                  getAmount(trip)
                )
              )}</td>
            </tr>
          `
        )
        .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <title>
            SAO AUTO TRACTOR - Report
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              padding: 20px;

              color: #152033;

              background: #fff;
            }

            .report-header {
              display: flex;

              justify-content:
                space-between;

              align-items:
                center;

              gap: 20px;

              border-bottom:
                2px solid #1b4b73;

              padding-bottom:
                10px;

              margin-bottom:
                20px;
            }

            .report-header h1 {
              font-size: 24px;

              margin: 0;

              color: #1b4b73;
            }

            .report-header .meta {
              font-size: 12px;

              color: #6d675e;

              text-align: right;

              line-height: 1.6;
            }

            .report-filters {
              margin-top: 5px;

              color: #6d675e;

              font-size: 10px;
            }

            .report-summary {
              display: grid;

              grid-template-columns:
                repeat(4, 1fr);

              gap: 12px;

              margin-bottom: 24px;
            }

            .report-summary .stat {
              padding: 12px;

              border:
                1px solid #d8d3c9;

              border-radius: 8px;

              background: #faf9f5;
            }

            .report-summary .stat span {
              display: block;

              font-size: 10px;

              color: #6d675e;

              text-transform:
                uppercase;

              letter-spacing:
                .05em;
            }

            .report-summary .stat strong {
              display: block;

              font-size: 20px;

              margin-top: 4px;
            }

            table {
              width: 100%;

              border-collapse:
                collapse;

              font-size: 11px;
            }

            thead {
              display:
                table-header-group;
            }

            tr {
              page-break-inside:
                avoid;
            }

            th {
              background:
                #f3efe6;

              padding:
                10px 8px;

              border:
                1px solid #d8d3c9;

              text-align:
                left;

              font-size: 9px;

              text-transform:
                uppercase;

              letter-spacing:
                .05em;
            }

            td {
              padding: 8px;

              border:
                1px solid #d8d3c9;

              vertical-align:
                top;
            }

            .footer {
              margin-top:
                24px;

              padding-top:
                12px;

              border-top:
                1px solid #d8d3c9;

              font-size: 10px;

              color: #6d675e;

              display: flex;

              justify-content:
                space-between;
            }

            @media print {
              body {
                padding: 10px;
              }

              .report-header,
              .report-summary {
                break-inside:
                  avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="report-header">
            <h1>
              ${escapeHTML(
                companyName
              )}
            </h1>

            <div class="meta">
              <strong>
                Transport Report
              </strong>

              <br />

              Period:
              ${escapeHTML(from)}
              -
              ${escapeHTML(to)}

              <br />

              Generated:
              ${escapeHTML(
                currentDate
              )}

              <div class="report-filters">
                ${escapeHTML(
                  filterText
                )}
              </div>
            </div>
          </div>

          <div class="report-summary">
            <div class="stat">
              <span>
                Total Records
              </span>

              <strong>
                ${escapeHTML(
                  formatNumber(
                    summary.records
                  )
                )}
              </strong>
            </div>

            <div class="stat">
              <span>
                Total Trips
              </span>

              <strong>
                ${escapeHTML(
                  formatNumber(
                    summary.trips
                  )
                )}
              </strong>
            </div>

            <div class="stat">
              <span>
                Total Quantity
              </span>

              <strong>
                ${escapeHTML(
                  formatNumber(
                    summary.quantity
                  )
                )}
              </strong>
            </div>

            <div class="stat">
              <span>
                Total Billing
              </span>

              <strong>
                ${escapeHTML(
                  formatCurrency(
                    summary.billing
                  )
                )}
              </strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Party</th>
                <th>Vehicle</th>
                <th>Material</th>
                <th>Trip Type</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <span>
              ${escapeHTML(
                companyName
              )}
              -
              Transport Management System
            </span>

            <span>
              ${filteredTrips.length}
              records
            </span>
          </div>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  /* =======================================================
     PRINT PREVIEW
  ======================================================= */

  const handlePrintPreview = () => {
    if (
      !filteredTrips.length
    ) {
      return;
    }

    setShowPrintPreview(
      true
    );
  };

  /* =======================================================
     CLONE TRIP
  ======================================================= */

  const cloneTrip = (
    trip
  ) => {
    if (!trip) {
      return;
    }

    const currentTrips =
      readStorage(
        TRIPS_KEY
      );

    const newId =
      createTripId();

    const now =
      new Date().toISOString();

    const newTrip = {
      ...trip,

      id: newId,
      _id: newId,
      tripId: newId,

      createdAt: now,
      updatedAt: now,

      date: getToday(),
    };

    delete newTrip.__id;

    const updatedTrips = [
      newTrip,
      ...currentTrips,
    ];

    writeTrips(
      updatedTrips
    );

    loadData();

    setSelectedTrip(null);
    setEditTrip(null);
    setDeleteTrip(null);
  };

  /* =======================================================
     WHATSAPP SHARE
  ======================================================= */

  const shareWhatsApp = (
    trip
  ) => {
    if (!trip) {
      return;
    }

    const message = [
      "🚜 *Trip Details*",

      `📅 Date: ${formatLongDate(
        getTripDate(trip)
      )}`,

      `🚜 Vehicle: ${getVehicle(
        trip
      )}`,

      `👤 Party: ${getParty(
        trip
      )}`,

      `📦 Material: ${getMaterial(
        trip
      )}`,

      `📋 Type: ${getTripType(
        trip
      )}`,

      `📍 Site: ${getSite(
        trip
      )}`,

      `📊 Qty: ${formatNumber(
        getQuantity(trip)
      )} ${getUnit(trip)}`,

      `💰 Amount: ${formatCurrency(
        getAmount(trip)
      )}`,

      "",

      "---",

      "SAO AUTO TRACTOR",
    ].join("\n");

    const encodedMessage =
      encodeURIComponent(
        message
      );

    window.open(
      `https://wa.me/?text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =======================================================
     EDIT
  ======================================================= */

  const openEdit = (
    trip
  ) => {
    setEditTrip(trip);

    if (selectedTrip) {
      setSelectedTrip(null);
    }

    if (deleteTrip) {
      setDeleteTrip(null);
    }
  };

  const saveEdit = (
    updatedTrip
  ) => {
    if (!editTrip) {
      return;
    }

    const currentTrips =
      readStorage(
        TRIPS_KEY
      );

    const targetIdentity =
      getTripIdentity(
        editTrip
      );

    const index =
      currentTrips.findIndex(
        (
          trip,
          tripIndex
        ) =>
          getTripIdentity(
            trip,
            tripIndex
          ) ===
          targetIdentity
      );

    if (index === -1) {
      alert(
        "Trip not found. Please refresh."
      );

      setEditTrip(null);

      return;
    }

    const existingTrip =
      currentTrips[index];

    const newTrip = {
      ...existingTrip,
      ...updatedTrip,

      updatedAt:
        new Date().toISOString(),
    };

    if (
      existingTrip?.id
    ) {
      newTrip.id =
        existingTrip.id;
    }

    if (
      existingTrip?._id
    ) {
      newTrip._id =
        existingTrip._id;
    }

    if (
      existingTrip?.tripId
    ) {
      newTrip.tripId =
        existingTrip.tripId;
    }

    if (
      existingTrip?.__id
    ) {
      newTrip.__id =
        existingTrip.__id;
    }

    const newTrips = [
      ...currentTrips,
    ];

    newTrips[index] =
      newTrip;

    writeTrips(
      newTrips
    );

    loadData();

    setEditTrip(null);
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const requestDelete = (
    trip
  ) => {
    setDeleteTrip(trip);

    if (selectedTrip) {
      setSelectedTrip(null);
    }

    if (editTrip) {
      setEditTrip(null);
    }
  };

  const confirmDelete =
    () => {
      if (!deleteTrip) {
        return;
      }

      const currentTrips =
        readStorage(
          TRIPS_KEY
        );

      const targetIdentity =
        getTripIdentity(
          deleteTrip
        );

      let removed = false;

      const updatedTrips =
        currentTrips.filter(
          (
            trip,
            tripIndex
          ) => {
            if (removed) {
              return true;
            }

            const identity =
              getTripIdentity(
                trip,
                tripIndex
              );

            if (
              identity ===
              targetIdentity
            ) {
              removed = true;

              return false;
            }

            return true;
          }
        );

      if (!removed) {
        alert(
          "Trip not found. Please refresh."
        );

        setDeleteTrip(null);

        return;
      }

      writeTrips(
        updatedTrips
      );

      loadData();

      setDeleteTrip(null);
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="reports-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="reports-header">
        <div className="reports-header-copy">
          <div className="reports-eyebrow">
            <FileBarChart size={15} />
            BUSINESS REPORTS
          </div>

          <h1>
            Reports
          </h1>

          <p>
            Analyse transport activity,
            billing, tractors, parties
            and materials from one
            place.
          </p>
        </div>

        <div className="reports-header-actions">

          <button
            type="button"
            className="report-action secondary"
            onClick={loadData}
            title="Refresh reports"
          >
            <RefreshCw
              size={17}
            />

            <span>
              Refresh
            </span>
          </button>

          <button
            type="button"
            className="report-action secondary"
            onClick={
              handlePrintPreview
            }
            disabled={
              !filteredTrips.length ||
              invalidDateRange
            }
            title="Preview report before printing"
          >
            <Eye size={17} />

            <span>
              Print Preview
            </span>
          </button>

          <button
            type="button"
            className="report-action secondary"
            onClick={
              handleExportPDF
            }
            disabled={
              !filteredTrips.length ||
              invalidDateRange
            }
          >
            <Printer
              size={17}
            />

            <span>
              PDF
            </span>
          </button>

          <button
            type="button"
            className="report-action primary"
            onClick={
              exportCSV
            }
            disabled={
              !filteredTrips.length ||
              invalidDateRange
            }
          >
            <Download
              size={17}
            />

            <span>
              Export CSV
            </span>
          </button>
        </div>
      </header>

      {/* ===================================================
          DATE ERROR
      =================================================== */}

      {invalidDateRange && (
        <div className="report-date-error">
          <CalendarDays
            size={17}
          />

          <div>
            <strong>
              Invalid report period
            </strong>

            <span>
              The From date cannot be
              later than the To date.
            </span>
          </div>
        </div>
      )}

      {/* ===================================================
          QUICK STATS
      =================================================== */}

      <section className="report-quick-stats">

        <div className="report-quick-stat">
          <span>
            Total Records
          </span>

          <strong>
            {formatNumber(
              summary.records
            )}
          </strong>

          <small>
            {quickStats.totalDays}{" "}
            days
          </small>
        </div>

        <div className="report-quick-stat">
          <span>
            Total Billing
          </span>

          <strong>
            {formatCurrency(
              summary.billing
            )}
          </strong>

          <small>
            Avg.{" "}
            {formatCurrency(
              quickStats.avgPerDay
            )}{" "}
            / day
          </small>
        </div>

        <div className="report-quick-stat">
          <span>
            Busiest Day
          </span>

          <strong>
            {quickStats.busiestDay
              ? formatCurrency(
                  quickStats
                    .busiestDay
                    .billing
                )
              : "—"}
          </strong>

          <small>
            {quickStats.busiestDay
              ? formatLongDate(
                  quickStats
                    .busiestDay
                    .date
                )
              : "No data"}
          </small>
        </div>

        <div className="report-quick-stat report-compare">
          <span>
            Today vs Yesterday
          </span>

          <div className="report-compare-values">

            <div>
              <span>
                Today
              </span>

              <strong>
                {formatCurrency(
                  dayComparison.todayBilling
                )}
              </strong>
            </div>

            <div className="report-compare-arrow">
              {dayComparison.billingChange >
              0 ? (
                <TrendingUp
                  size={16}
                  className="trend-up"
                />
              ) : dayComparison.billingChange <
                0 ? (
                <TrendingDown
                  size={16}
                  className="trend-down"
                />
              ) : (
                <span className="trend-flat">
                  —
                </span>
              )}

              <span
                className={
                  dayComparison.billingChange >=
                  0
                    ? "trend-up"
                    : "trend-down"
                }
              >
                {Math.abs(
                  dayComparison.billingChange
                ).toFixed(
                  1
                )}
                %
              </span>
            </div>

            <div>
              <span>
                Yesterday
              </span>

              <strong>
                {formatCurrency(
                  dayComparison.yesterdayBilling
                )}
              </strong>
            </div>

          </div>
        </div>
      </section>

      {/* ===================================================
          TREND
      =================================================== */}

      <section className="report-trend-section">

        <div className="report-trend-header">
          <div>
            <span>
              TREND
            </span>

            <h2>
              Activity Trend
            </h2>
          </div>

          <div className="report-trend-controls">

            <button
              type="button"
              className={
                trendMode ===
                "billing"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTrendMode(
                  "billing"
                )
              }
            >
              Billing
            </button>

            <button
              type="button"
              className={
                trendMode ===
                "trips"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTrendMode(
                  "trips"
                )
              }
            >
              Trips
            </button>

          </div>
        </div>

        <div className="report-trend-chart">

          {trendData.data
            .length === 0 ? (
            <div className="report-trend-empty">
              No data for the selected
              period
            </div>
          ) : (
            <div className="report-trend-bars">

              {trendData.data.map(
                (item) => {
                  const value =
                    trendMode ===
                    "billing"
                      ? item.billing
                      : item.trips;

                  const height =
                    trendData.max >
                    0
                      ? (value /
                          trendData.max) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        item.date
                      }
                      className="report-trend-bar-wrapper"
                    >
                      <div className="report-trend-bar-value">
                        {trendMode ===
                        "billing"
                          ? formatCurrency(
                              value
                            )
                          : value}
                      </div>

                      <div className="report-trend-bar-track">
                        <div
                          className="report-trend-bar"
                          style={{
                            height: `${Math.max(
                              height,
                              4
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="report-trend-bar-label">
                        {formatDate(
                          item.date
                        )}
                      </div>
                    </div>
                  );
                }
              )}

            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          TOP PERFORMERS
      =================================================== */}

      <section className="report-top-performers">

        {[
          {
            title:
              "Top Parties",
            icon: Users,
            data:
              topParties,
          },
          {
            title:
              "Top Tractors",
            icon: Truck,
            data:
              topTractors,
          },
          {
            title:
              "Top Materials",
            icon: Package,
            data:
              topMaterials,
          },
        ].map(
          ({
            title,
            icon: Icon,
            data,
          }) => (
            <div
              className="report-top-card"
              key={title}
            >
              <div className="report-top-header">
                <Icon size={17} />
                {title}
              </div>

              {data.length ===
              0 ? (
                <div className="report-top-empty">
                  No data
                </div>
              ) : (
                data.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={
                        item.name
                      }
                      className="report-top-row"
                    >
                      <span className="report-top-rank">
                        {index ===
                        0
                          ? "🥇"
                          : index ===
                            1
                          ? "🥈"
                          : index ===
                            2
                          ? "🥉"
                          : `#${
                              index +
                              1
                            }`}
                      </span>

                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.trips}{" "}
                        trips
                      </span>

                      <strong className="report-top-amount">
                        {formatCurrency(
                          item.billing
                        )}
                      </strong>
                    </div>
                  )
                )
              )}
            </div>
          )
        )}

      </section>

      {/* ===================================================
          FILTERS
      =================================================== */}

      <section className="report-filter-panel">

        <div className="report-date-controls">

          <div className="report-filter-label">
            <CalendarDays
              size={15}
            />
            REPORT PERIOD
          </div>

          <div className="report-presets">
            {[
              "Today",
              "This Week",
              "This Month",
              "All Time",
            ].map(
              (preset) => (
                <button
                  type="button"
                  key={
                    preset
                  }
                  className={
                    activePreset ===
                    preset
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    applyPreset(
                      preset
                    )
                  }
                >
                  {preset}
                </button>
              )
            )}
          </div>

          <div className="report-date-inputs">

            <label>
              <span>
                From
              </span>

              <input
                type="date"
                value={
                  fromDate
                }
                onChange={(
                  event
                ) => {
                  setFromDate(
                    event
                      .target
                      .value
                  );

                  setActivePreset(
                    ""
                  );
                }}
              />
            </label>

            <span className="date-arrow">
              →
            </span>

            <label>
              <span>
                To
              </span>

              <input
                type="date"
                value={
                  toDate
                }
                onChange={(
                  event
                ) => {
                  setToDate(
                    event
                      .target
                      .value
                  );

                  setActivePreset(
                    ""
                  );
                }}
              />
            </label>

          </div>
        </div>

        <div className="report-filter-bottom">

          <div className="report-search">
            <Search
              size={17}
            />

            <input
              type="text"
              placeholder="Search party, tractor, material, site..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
            />

            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() =>
                  setSearch(
                    ""
                  )
                }
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`filter-toggle ${
              showFilters ||
              hasActiveFilters
                ? "active"
                : ""
            }`}
            onClick={() =>
              setShowFilters(
                (value) =>
                  !value
              )
            }
          >
            <Filter size={16} />

            Filters

            {hasActiveFilters && (
              <span className="filter-dot" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filter-btn"
              onClick={
                clearFilters
              }
            >
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="advanced-filters">

            <label>
              <span>
                Party
              </span>

              <select
                value={
                  partyFilter
                }
                onChange={(
                  event
                ) =>
                  setPartyFilter(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  All parties
                </option>

                {partyOptions.map(
                  (party) => (
                    <option
                      key={
                        party
                      }
                      value={
                        party
                      }
                    >
                      {party}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Tractor
              </span>

              <select
                value={
                  tractorFilter
                }
                onChange={(
                  event
                ) =>
                  setTractorFilter(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  All tractors
                </option>

                {tractorOptions.map(
                  (
                    tractor
                  ) => (
                    <option
                      key={
                        tractor
                      }
                      value={
                        tractor
                      }
                    >
                      {
                        tractor
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Material
              </span>

              <select
                value={
                  materialFilter
                }
                onChange={(
                  event
                ) =>
                  setMaterialFilter(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  All materials
                </option>

                {materialOptions.map(
                  (
                    material
                  ) => (
                    <option
                      key={
                        material
                      }
                      value={
                        material
                      }
                    >
                      {
                        material
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Trip Type
              </span>

              <select
                value={
                  tripTypeFilter
                }
                onChange={(
                  event
                ) =>
                  setTripTypeFilter(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  All trip types
                </option>

                <option value="Loading">
                  Loading
                </option>

                <option value="Unloading">
                  Unloading
                </option>

                <option value="Site-to-Site">
                  Site-to-Site
                </option>
              </select>
            </label>

          </div>
        )}

        {hasActiveFilters && (
          <div className="report-active-filters">
            <span>
              Active filters
            </span>

            {activeFilterLabels.map(
              (label) => (
                <span
                  className="report-filter-chip"
                  key={
                    label
                  }
                >
                  {label}
                </span>
              )
            )}

            <strong>
              {filteredTrips.length}{" "}
              matching records
            </strong>
          </div>
        )}

      </section>

      {/* ===================================================
          STATS
      =================================================== */}

      <section className="report-stats-grid">

        <StatCard
          icon={BarChart3}
          label="Total Records"
          value={formatNumber(
            summary.records
          )}
          detail={`${summary.trips} transport entries`}
        />

        <StatCard
          icon={Truck}
          label="Total Trips"
          value={formatNumber(
            summary.trips
          )}
          detail={`${summary.loading} loading · ${summary.unloading} unloading`}
          type="blue"
        />

        <StatCard
          icon={Package}
          label="Total Quantity"
          value={formatNumber(
            summary.quantity
          )}
          detail="Across selected period"
          type="brown"
        />

        <StatCard
          icon={IndianRupee}
          label="Total Billing"
          value={formatCurrency(
            summary.billing
          )}
          detail={`Avg. ${formatCurrency(
            summary.averageTripValue
          )} / trip`}
          type="dark"
        />

      </section>

      {/* ===================================================
          BREAKDOWN
      =================================================== */}

      <section className="report-analysis-grid">

        <div className="report-panel">

          <div className="report-panel-header">
            <div>
              <span className="panel-kicker">
                ACTIVITY
              </span>

              <h2>
                Trip Type Breakdown
              </h2>
            </div>
          </div>

          <div className="breakdown-list">

            <BreakdownBar
              label="Loading"
              value={
                summary.loading
              }
              total={
                summary.records
              }
              amount={filteredTrips
                .filter(
                  (
                    trip
                  ) =>
                    getTripType(
                      trip
                    ) ===
                    "Loading"
                )
                .reduce(
                  (
                    sum,
                    trip
                  ) =>
                    sum +
                    getAmount(
                      trip
                    ),
                  0
                )}
            />

            <BreakdownBar
              label="Unloading"
              value={
                summary.unloading
              }
              total={
                summary.records
              }
              amount={filteredTrips
                .filter(
                  (
                    trip
                  ) =>
                    getTripType(
                      trip
                    ) ===
                    "Unloading"
                )
                .reduce(
                  (
                    sum,
                    trip
                  ) =>
                    sum +
                    getAmount(
                      trip
                    ),
                  0
                )}
            />

            <BreakdownBar
              label="Site-to-Site"
              value={
                summary.siteToSite
              }
              total={
                summary.records
              }
              amount={filteredTrips
                .filter(
                  (
                    trip
                  ) =>
                    getTripType(
                      trip
                    ) ===
                    "Site-to-Site"
                )
                .reduce(
                  (
                    sum,
                    trip
                  ) =>
                    sum +
                    getAmount(
                      trip
                    ),
                  0
                )}
            />

          </div>
        </div>

        <div className="report-panel">

          <div className="report-panel-header">
            <div>
              <span className="panel-kicker">
                DAILY ACTIVITY
              </span>

              <h2>
                Recent Daily Summary
              </h2>
            </div>
          </div>

          <div className="daily-summary-list">

            {dailyReport.length ? (
              dailyReport.map(
                (item) => (
                  <div
                    className="daily-summary-row"
                    key={dateKey(
                      item.date
                    )}
                  >
                    <div className="daily-date">
                      <strong>
                        {formatDate(
                          item.date
                        )}
                      </strong>

                      <span>
                        {item.trips}{" "}
                        trips
                      </span>
                    </div>

                    <div className="daily-metrics">
                      <span>
                        {formatNumber(
                          item.quantity
                        )}{" "}
                        qty
                      </span>

                      <strong>
                        {formatCurrency(
                          item.billing
                        )}
                      </strong>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="report-empty-small">
                No daily records for the
                selected period.
              </div>
            )}

          </div>
        </div>

      </section>

      {/* ===================================================
          PARTY REPORT
      =================================================== */}

      <section className="report-panel report-table-panel">

        <div className="report-panel-header report-table-header">

          <div>
            <span className="panel-kicker">
              PARTY PERFORMANCE
            </span>

            <h2>
              Party-wise Report
            </h2>

            <p>
              Billing and transport
              activity grouped by party.
            </p>
          </div>

          <span className="panel-count">
            {partyReport.length}{" "}
            parties
          </span>

        </div>

        {partyReport.length ? (
          <div className="report-table-wrap">

            <table className="report-table">

              <thead>
                <tr>
                  <th>
                    Party
                  </th>

                  <th>
                    Trips
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Billing
                  </th>
                </tr>
              </thead>

              <tbody>
                {partyReport.map(
                  (item) => (
                    <tr
                      key={
                        item.name
                      }
                    >
                      <td>
                        <div className="entity-cell">
                          <span className="entity-icon">
                            <Users
                              size={16}
                            />
                          </span>

                          <strong>
                            {item.name}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {formatNumber(
                          item.trips
                        )}
                      </td>

                      <td>
                        {formatNumber(
                          item.quantity
                        )}
                      </td>

                      <td className="amount-cell">
                        {formatCurrency(
                          item.billing
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>

            </table>
          </div>
        ) : (
          <div className="report-empty">
            <Users size={30} />

            <strong>
              No party data
            </strong>

            <span>
              Try changing the selected
              filters or date range.
            </span>
          </div>
        )}

      </section>

      {/* ===================================================
          TRACTOR + MATERIAL
      =================================================== */}

      <section className="report-two-column">

        <div className="report-panel">

          <div className="report-panel-header">
            <div>
              <span className="panel-kicker">
                FLEET
              </span>

              <h2>
                Tractor-wise Report
              </h2>
            </div>

            <span className="panel-count">
              {tractorReport.length}
            </span>
          </div>

          {tractorReport.length ? (
            <div className="compact-report-list">

              {tractorReport
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="compact-report-row"
                      key={
                        item.name
                      }
                    >
                      <div className="rank">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="compact-main">
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          {formatNumber(
                            item.quantity
                          )}{" "}
                          quantity
                        </span>
                      </div>

                      <div className="compact-value">
                        <strong>
                          {
                            item.trips
                          }
                        </strong>

                        <span>
                          trips
                        </span>
                      </div>
                    </div>
                  )
                )}

            </div>
          ) : (
            <div className="report-empty-small">
              No tractor data available.
            </div>
          )}

        </div>

        <div className="report-panel">

          <div className="report-panel-header">
            <div>
              <span className="panel-kicker">
                MATERIAL
              </span>

              <h2>
                Material-wise Report
              </h2>
            </div>

            <span className="panel-count">
              {materialReport.length}
            </span>
          </div>

          {materialReport.length ? (
            <div className="compact-report-list">

              {materialReport
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="compact-report-row"
                      key={
                        item.name
                      }
                    >
                      <div className="rank">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="compact-main">
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          {
                            item.trips
                          }{" "}
                          trips
                        </span>
                      </div>

                      <div className="compact-value">
                        <strong>
                          {formatNumber(
                            item.quantity
                          )}
                        </strong>

                        <span>
                          {item.unit ||
                            "qty"}
                        </span>
                      </div>
                    </div>
                  )
                )}

            </div>
          ) : (
            <div className="report-empty-small">
              No material data available.
            </div>
          )}

        </div>

      </section>

      {/* ===================================================
          TRIP TYPE REPORT
      =================================================== */}

      <section className="report-panel report-table-panel">

        <div className="report-panel-header">
          <div>
            <span className="panel-kicker">
              TRANSPORT MIX
            </span>

            <h2>
              Trip Type Report
            </h2>
          </div>
        </div>

        <div className="trip-type-cards">

          {tripTypeReport.map(
            (item) => (
              <div
                className="trip-type-card"
                key={
                  item.type
                }
              >
                <span>
                  {item.type}
                </span>

                <strong>
                  {item.trips}
                </strong>

                <small>
                  {formatNumber(
                    item.quantity
                  )}{" "}
                  qty ·{" "}
                  {formatCurrency(
                    item.billing
                  )}
                </small>
              </div>
            )
          )}

        </div>
      </section>

      {/* ===================================================
          RECORDS TABLE
      =================================================== */}

      <section className="report-panel report-records-panel">

        <div className="report-panel-header report-table-header">

          <div>
            <span className="panel-kicker">
              RECORD DETAIL
            </span>

            <h2>
              Report Records
            </h2>

            <p>
              Detailed transport entries
              for the selected period.
            </p>
          </div>

          <span className="panel-count">
            {filteredTrips.length}{" "}
            records
          </span>

        </div>

        {paginatedTrips.length ? (
          <>

            <div className="report-table-wrap">

              <table className="report-table">

                <thead>
                  <tr>
                    <th>
                      Date
                    </th>

                    <th>
                      Party
                    </th>

                    <th>
                      Vehicle
                    </th>

                    <th>
                      Material
                    </th>

                    <th>
                      Trip Type
                    </th>

                    <th>
                      Qty
                    </th>

                    <th>
                      Amount
                    </th>

                    <th className="report-actions-col">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTrips.map(
                    (
                      trip,
                      index
                    ) => (
                      <tr
                        key={getTripId(
                          trip,
                          index
                        )}
                      >
                        <td>
                          {formatDate(
                            getTripDate(
                              trip
                            )
                          )}
                        </td>

                        <td>
                          <strong>
                            {getParty(
                              trip
                            ) ||
                              "—"}
                          </strong>
                        </td>

                        <td>
                          <span className="vehicle-badge">
                            {getVehicle(
                              trip
                            ) ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <div className="material-cell">
                            <strong>
                              {getMaterial(
                                trip
                              ) ||
                                "—"}
                            </strong>

                            <span>
                              {getSite(
                                trip
                              ) ||
                                "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`trip-badge trip-${getTripType(
                              trip
                            )
                              .toLowerCase()
                              .replace(
                                /[^a-z]+/g,
                                "-"
                              )}`}
                          >
                            {getTripType(
                              trip
                            )}
                          </span>
                        </td>

                        <td>
                          {formatNumber(
                            getQuantity(
                              trip
                            )
                          )}{" "}
                          <small>
                            {getUnit(
                              trip
                            )}
                          </small>
                        </td>

                        <td className="amount-cell">
                          {formatCurrency(
                            getAmount(
                              trip
                            )
                          )}
                        </td>

                        <td className="report-actions-col">

                          <div className="report-row-actions">

                            <button
                              type="button"
                              className="report-action-btn icon"
                              onClick={() =>
                                setSelectedTrip(
                                  trip
                                )
                              }
                              title="View"
                              aria-label="View record"
                            >
                              <Eye
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              className="report-action-btn icon clone"
                              onClick={() =>
                                cloneTrip(
                                  trip
                                )
                              }
                              title="Clone"
                              aria-label="Clone record"
                            >
                              <Copy
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              className="report-action-btn icon whatsapp"
                              onClick={() =>
                                shareWhatsApp(
                                  trip
                                )
                              }
                              title="WhatsApp"
                              aria-label="Share on WhatsApp"
                            >
                              <MessageCircle
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              className="report-action-btn icon edit"
                              onClick={() =>
                                openEdit(
                                  trip
                                )
                              }
                              title="Edit"
                              aria-label="Edit record"
                            >
                              <Pencil
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              className="report-action-btn icon delete"
                              onClick={() =>
                                requestDelete(
                                  trip
                                )
                              }
                              title="Delete"
                              aria-label="Delete record"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>

                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

              </table>
            </div>

            <div className="report-pagination">

              <span>
                Showing{" "}
                <strong>
                  {(page - 1) *
                    PAGE_SIZE +
                    1}
                </strong>{" "}
                –{" "}
                <strong>
                  {Math.min(
                    page *
                      PAGE_SIZE,
                    filteredTrips.length
                  )}
                </strong>{" "}
                of{" "}
                <strong>
                  {filteredTrips.length}
                </strong>
              </span>

              <div className="pagination-buttons">

                <button
                  type="button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    setPage(
                      (value) =>
                        Math.max(
                          1,
                          value - 1
                        )
                    )
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft
                    size={16}
                  />
                </button>

                <span>
                  {page} /{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (value) =>
                        Math.min(
                          totalPages,
                          value + 1
                        )
                    )
                  }
                  aria-label="Next page"
                >
                  <ChevronRight
                    size={16}
                  />
                </button>

              </div>
            </div>

          </>
        ) : (
          <div className="report-empty">

            <FileBarChart
              size={34}
            />

            <strong>
              No records found
            </strong>

            <span>
              {invalidDateRange
                ? "Please select a valid date range."
                : "There are no transport records matching the current filters."}
            </span>

          </div>
        )}

      </section>

      {/* ===================================================
          DETAIL MODAL
      =================================================== */}

      {selectedTrip && (
        <DetailModal
          trip={
            selectedTrip
          }
          onClose={() =>
            setSelectedTrip(
              null
            )
          }
          onClone={
            cloneTrip
          }
          onEdit={
            openEdit
          }
          onDelete={
            requestDelete
          }
          onWhatsAppShare={
            shareWhatsApp
          }
        />
      )}

      {/* ===================================================
          EDIT MODAL
      =================================================== */}

      {editTrip && (
        <EditModal
          trip={
            editTrip
          }
          onClose={() =>
            setEditTrip(
              null
            )
          }
          onSave={
            saveEdit
          }
        />
      )}

      {/* ===================================================
          DELETE MODAL
      =================================================== */}

      {deleteTrip && (
        <DeleteConfirmModal
          trip={
            deleteTrip
          }
          onCancel={() =>
            setDeleteTrip(
              null
            )
          }
          onConfirm={
            confirmDelete
          }
        />
      )}

      {/* ===================================================
          PRINT PREVIEW
      =================================================== */}

      {showPrintPreview && (
        <div
          className="report-print-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Print preview"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowPrintPreview(
                false
              );
            }
          }}
        >
          <div className="report-print-preview">

            {/* PREVIEW TOOLBAR */}

            <div className="report-print-preview-toolbar">

              <div>
                <span className="report-print-preview-kicker">
                  PRINT PREVIEW
                </span>

                <h2>
                  Transport Report
                </h2>

                <p>
                  Review the complete
                  filtered report before
                  printing.
                </p>
              </div>

              <div className="report-print-preview-actions">

                <button
                  type="button"
                  className="report-action secondary"
                  onClick={() =>
                    setShowPrintPreview(
                      false
                    )
                  }
                >
                  <X size={17} />

                  <span>
                    Close
                  </span>
                </button>

                <button
                  type="button"
                  className="report-action primary"
                  onClick={() =>
                    window.print()
                  }
                >
                  <Printer
                    size={17}
                  />

                  <span>
                    Print Report
                  </span>
                </button>

              </div>
            </div>

            {/* PREVIEW SCROLL */}

            <div className="report-print-preview-scroll">

              <div className="report-print-page">

                {/* PRINT HEADER */}

                <div className="print-report-header">

                  <div>
                    <span className="print-report-eyebrow">
                      SAO AUTO TRACTOR
                    </span>

                    <h1>
                      Transport Report
                    </h1>

                    <p>
                      Detailed transport
                      activity report
                    </p>
                  </div>

                  <div className="print-report-meta">

                    <strong>
                      Report Period
                    </strong>

                    <span>
                      {fromDate
                        ? formatDate(
                            fromDate
                          )
                        : "All"}
                      {" — "}
                      {toDate
                        ? formatDate(
                            toDate
                          )
                        : "All"}
                    </span>

                    <small>
                      Generated{" "}
                      {new Date().toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month:
                            "long",
                          year:
                            "numeric",
                        }
                      )}
                    </small>

                  </div>

                </div>

                {/* ACTIVE FILTERS */}

                <div className="print-report-filters">

                  <span>
                    REPORT SCOPE
                  </span>

                  <strong>
                    {activeFilterLabels.length
                      ? activeFilterLabels.join(
                          " · "
                        )
                      : "All records"}
                  </strong>

                </div>

                {/* SUMMARY */}

                <div className="print-report-summary">

                  <div className="print-summary-card">
                    <span>
                      Total Records
                    </span>

                    <strong>
                      {formatNumber(
                        summary.records
                      )}
                    </strong>
                  </div>

                  <div className="print-summary-card">
                    <span>
                      Total Trips
                    </span>

                    <strong>
                      {formatNumber(
                        summary.trips
                      )}
                    </strong>
                  </div>

                  <div className="print-summary-card">
                    <span>
                      Total Quantity
                    </span>

                    <strong>
                      {formatNumber(
                        summary.quantity
                      )}
                    </strong>
                  </div>

                  <div className="print-summary-card">
                    <span>
                      Total Billing
                    </span>

                    <strong>
                      {formatCurrency(
                        summary.billing
                      )}
                    </strong>
                  </div>

                </div>

                {/* RECORDS */}

                <div className="print-report-section">

                  <div className="print-section-heading">

                    <div>
                      <span>
                        RECORD DETAIL
                      </span>

                      <h2>
                        Transport Records
                      </h2>
                    </div>

                    <strong>
                      {
                        filteredTrips.length
                      }{" "}
                      records
                    </strong>

                  </div>

                  <div className="print-report-table-wrap">

                    <table className="print-report-table">

                      <thead>
                        <tr>
                          <th>
                            Date
                          </th>

                          <th>
                            Party
                          </th>

                          <th>
                            Vehicle
                          </th>

                          <th>
                            Material
                          </th>

                          <th>
                            Site
                          </th>

                          <th>
                            Type
                          </th>

                          <th>
                            Qty
                          </th>

                          <th>
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredTrips.map(
                          (
                            trip,
                            index
                          ) => (
                            <tr
                              key={getTripId(
                                trip,
                                index
                              )}
                            >
                              <td>
                                {formatDate(
                                  getTripDate(
                                    trip
                                  )
                                )}
                              </td>

                              <td>
                                <strong>
                                  {getParty(
                                    trip
                                  ) ||
                                    "—"}
                                </strong>
                              </td>

                              <td>
                                {getVehicle(
                                  trip
                                ) ||
                                  "—"}
                              </td>

                              <td>
                                {getMaterial(
                                  trip
                                ) ||
                                  "—"}
                              </td>

                              <td>
                                {getSite(
                                  trip
                                ) ||
                                  "—"}
                              </td>

                              <td>
                                {getTripType(
                                  trip
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  getQuantity(
                                    trip
                                  )
                                )}{" "}
                                {getUnit(
                                  trip
                                )}
                              </td>

                              <td>
                                {formatCurrency(
                                  getAmount(
                                    trip
                                  )
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>

                    </table>
                  </div>
                </div>

                {/* PRINT FOOTER */}

                <div className="print-report-footer">

                  <span>
                    SAO AUTO TRACTOR —
                    Transport Management
                    System
                  </span>

                  <span>
                    {
                      filteredTrips.length
                    }{" "}
                    records
                  </span>

                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;