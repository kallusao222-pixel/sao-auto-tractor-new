import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Edit3,
  IndianRupee,
  MoreVertical,
  Package,
  Plus,
  Search,
  Trash2,
  X,
  CalendarDays,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileBarChart,
} from "lucide-react";

import { useAppData } from "../../context/AppDataContext";
import { STORAGE_KEYS } from "../../data/storageKeys";
import { readStorage, writeStorage } from "../../data/storage";
import { calculateTripAmount } from "../../utils/calculations";
import { formatCurrency, toNumber } from "../../utils/currency";
import { formatDate, getTodayISO } from "../../utils/date";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import "./MaterialManagement.css";

const EMPTY_FORM = {
  materialName: "",
  unit: "Trip",
  defaultRate: "",
  status: "active",
};

const UNIT_OPTIONS = [
  "Trip",
  "Ton",
  "CFT",
  "KG",
  "Bag",
  "Piece",
];

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createId() {
  return `MAT-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getMaterialName(trip) {
  return String(
    trip?.material ??
      trip?.materialName ??
      trip?.product ??
      trip?.productName ??
      "",
  ).trim();
}

function getTripQuantity(trip) {
  const quantity = Number(
    trip?.quantity ??
      trip?.qty ??
      trip?.quantityValue ??
      0,
  );

  return Number.isFinite(quantity) && quantity > 0
    ? quantity
    : 0;
}

function getTripAmount(trip) {
  const directAmount = Number(
    trip?.amount ??
      trip?.totalAmount ??
      trip?.billingAmount ??
      trip?.total ??
      0,
  );

  if (
    Number.isFinite(directAmount) &&
    directAmount > 0
  ) {
    return directAmount;
  }

  return calculateTripAmount(
    getTripQuantity(trip),
    Number(trip?.rate ?? trip?.price ?? 0),
  );
}

function getTripType(trip) {
  const value = normalize(
    trip?.tripType ?? trip?.type ?? "",
  );

  if (value === "loading") return "Loading";
  if (value === "unloading") return "Unloading";
  if (
    value === "site to site" ||
    value === "site-to-site" ||
    value === "site_to_site"
  ) {
    return "Site to Site";
  }

  return "";
}

function getInitials(name) {
  const value = String(name || "").trim();

  if (!value) return "MT";

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getMaterialStats(material, trips) {
  const materialName = normalize(
    material?.materialName,
  );

  const materialTrips = trips.filter(
    (trip) =>
      normalize(getMaterialName(trip)) ===
      materialName,
  );

  const validTrips = materialTrips.filter(
    (trip) => Boolean(getTripType(trip)),
  );

  const quantity = validTrips.reduce(
    (sum, trip) =>
      sum + getTripQuantity(trip),
    0,
  );

  const billing = validTrips.reduce(
    (sum, trip) =>
      sum + getTripAmount(trip),
    0,
  );

  const loading = validTrips.filter(
    (trip) => getTripType(trip) === "Loading",
  ).length;

  const unloading = validTrips.filter(
    (trip) => getTripType(trip) === "Unloading",
  ).length;

  const siteToSite = validTrips.filter(
    (trip) => getTripType(trip) === "Site to Site",
  ).length;

  return {
    trips: validTrips.length,
    quantity,
    billing,
    loading,
    unloading,
    siteToSite,
  };
}

function getMaterialDailyStats(material, trips, date) {
  const materialName = normalize(
    material?.materialName,
  );

  const dayTrips = trips.filter(
    (trip) => {
      const tripDate = trip?.date || trip?.createdAt?.split('T')[0] || "";
      return normalize(getMaterialName(trip)) === materialName &&
             tripDate === date &&
             Boolean(getTripType(trip));
    }
  );

  const quantity = dayTrips.reduce(
    (sum, trip) => sum + getTripQuantity(trip),
    0,
  );

  const billing = dayTrips.reduce(
    (sum, trip) => sum + getTripAmount(trip),
    0,
  );

  const materials = new Map();

  dayTrips.forEach((trip) => {
    const name = getMaterialName(trip);
    const qty = getTripQuantity(trip);
    if (name) {
      materials.set(name, (materials.get(name) || 0) + qty);
    }
  });

  return {
    trips: dayTrips.length,
    quantity,
    billing,
    materials: Array.from(materials.entries()).map(([name, qty]) => ({ name, qty })),
    tripList: dayTrips,
  };
}

function MaterialForm({
  initialValue,
  onCancel,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initialValue || {}),
    defaultRate:
      initialValue?.defaultRate ??
      initialValue?.rate ??
      "",
  }));

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const materialName =
      form.materialName.trim();

    if (!materialName) {
      setError(
        "Material name is required.",
      );
      return;
    }

    const rate = toNumber(
      form.defaultRate,
    );

    if (
      form.defaultRate !== "" &&
      rate < 0
    ) {
      setError(
        "Default rate cannot be negative.",
      );
      return;
    }

    onSave({
      ...form,
      materialName,
      unit:
        form.unit || "Trip",
      defaultRate:
        form.defaultRate === ""
          ? 0
          : rate,
      status:
        form.status || "active",
    });
  };

  return (
    <div className="material-form-wrap">
      <div className="material-form-header">
        <div>
          <span className="material-form-eyebrow">
            {initialValue
              ? "EDIT MATERIAL"
              : "NEW MATERIAL"}
          </span>

          <h3>
            {initialValue
              ? "Update Material"
              : "Add Material"}
          </h3>

          <p>
            Manage materials and their default
            transport rates.
          </p>
        </div>

        <button
          type="button"
          className="material-form-close"
          onClick={onCancel}
          aria-label="Close form"
        >
          <X
            size={18}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <form
        className="material-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <div
            className="material-form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="material-form-grid">
          <label className="material-field">
            <span>
              Material Name *
            </span>

            <input
              name="materialName"
              value={form.materialName}
              onChange={handleChange}
              placeholder="e.g. Sand, Stone, Soil"
              autoComplete="off"
            />
          </label>

          <label className="material-field">
            <span>Unit</span>

            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
            >
              {UNIT_OPTIONS.map(
                (unit) => (
                  <option
                    key={unit}
                    value={unit}
                  >
                    {unit}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="material-field">
            <span>
              Default Rate
            </span>

            <div className="material-rate-input">
              <span>₹</span>

              <input
                name="defaultRate"
                value={form.defaultRate}
                onChange={handleChange}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </label>

          <label className="material-field">
            <span>Status</span>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </label>
        </div>

        <div className="material-form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button type="submit">
            {initialValue
              ? "Update Material"
              : "Save Material"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MaterialDetails({
  material,
  trips,
  onClose,
  onEdit,
}) {
  const today = getTodayISO();
  const [selectedDate, setSelectedDate] = useState(today);

  const stats = useMemo(
    () =>
      getMaterialStats(
        material,
        trips,
      ),
    [material, trips],
  );

  const dailyStats = useMemo(
    () => getMaterialDailyStats(material, trips, selectedDate),
    [material, trips, selectedDate],
  );

  const recentTrips = useMemo(() => {
    const materialName =
      normalize(
        material?.materialName,
      );

    return trips
      .filter(
        (trip) =>
          normalize(
            getMaterialName(trip),
          ) === materialName &&
          Boolean(
            getTripType(trip),
          ),
      )
      .sort(
        (a, b) =>
          new Date(
            b?.date || 0,
          ).getTime() -
          new Date(
            a?.date || 0,
          ).getTime(),
      )
      .slice(0, 10);
  }, [material, trips]);

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
    <div className="material-details-overlay">
      <div
        className="material-details-backdrop"
        onClick={onClose}
      />

      <aside
        className="material-details-drawer"
        aria-label="Material details"
      >
        <div className="material-details-header">
          <div>
            <span className="material-details-eyebrow">
              MATERIAL ACCOUNT
            </span>

            <h2>
              {material?.materialName ||
                "Material Details"}
            </h2>
          </div>

          <button
            type="button"
            className="material-details-close"
            onClick={onClose}
            aria-label="Close material details"
          >
            <X
              size={19}
              strokeWidth={1.8}
            />
          </button>
        </div>

        <div className="material-details-body">
          <div className="material-profile">
            <div className="material-profile-avatar">
              {getInitials(
                material?.materialName,
              )}
            </div>

            <div className="material-profile-info">
              <strong>
                {material?.materialName ||
                  "Unnamed Material"}
              </strong>

              <span>
                {material?.unit ||
                  "Trip"}
              </span>

              <small>
                Default rate:{" "}
                {formatCurrency(
                  Number(
                    material?.defaultRate ??
                      material?.rate ??
                      0,
                  ),
                )}
              </small>
            </div>

            <StatusBadge
              status={
                material?.status ||
                "active"
              }
              label={
                normalize(
                  material?.status,
                ) === "inactive"
                  ? "Inactive"
                  : "Active"
              }
            />
          </div>

          {/* ===================================================
              DAILY ACTIVITY SECTION
              =================================================== */}

          <div className="material-daily-activity">
            <div className="material-daily-header">
              <div className="material-daily-title">
                <CalendarDays size={17} />
                <span>Daily Activity</span>
              </div>

              <div className="material-daily-date-controls">
                <button
                  type="button"
                  className={`material-date-btn ${selectedDate === today ? 'active' : ''}`}
                  onClick={setToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="material-date-btn"
                  onClick={setYesterday}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="material-date-input"
                  aria-label="Select date"
                />
              </div>
            </div>

            <div className="material-daily-summary">
              <div className="material-daily-stat">
                <span>Trips</span>
                <strong>{dailyStats.trips}</strong>
              </div>
              <div className="material-daily-stat">
                <span>Total Qty</span>
                <strong>{dailyStats.quantity}</strong>
              </div>
              <div className="material-daily-stat material-daily-finance">
                <span>Billing</span>
                <strong>{formatCurrency(dailyStats.billing)}</strong>
              </div>
            </div>

            {dailyStats.trips === 0 ? (
              <div className="material-daily-empty">
                <Activity size={18} />
                <span>No trips on {formatDate(selectedDate)}</span>
              </div>
            ) : (
              <>
                {dailyStats.materials.length > 0 && (
                  <div className="material-daily-items">
                    <span className="material-daily-items-label">
                      Items Transported
                    </span>
                    <div className="material-daily-item-tags">
                      {dailyStats.materials.map(({ name, qty }) => (
                        <span key={name} className="material-daily-item-tag">
                          {name} <small>{qty} qty</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="material-daily-trip-list">
                  <div className="material-daily-trip-header">
                    <span>Time</span>
                    <span>Party</span>
                    <span>Qty</span>
                    <span>Amount</span>
                  </div>
                  {dailyStats.tripList.map((trip, idx) => {
                    const type = getTripType(trip);
                    const party = trip?.partyName || trip?.party || "—";
                    const qty = getTripQuantity(trip);
                    const amount = getTripAmount(trip);
                    const time = trip?.time || trip?.createdAt || "";

                    return (
                      <div key={trip?.id || idx} className="material-daily-trip-row">
                        <span className="material-daily-trip-time">
                          {formatDate(time, { timeOnly: true }) || "N/A"}
                        </span>
                        <span className="material-daily-trip-party">
                          {party}
                          <StatusBadge status={type} label={type} size="small" />
                        </span>
                        <span className="material-daily-trip-qty">{qty}</span>
                        <span className="material-daily-trip-amount">
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

          <div className="material-detail-stats">
            <div>
              <span>Total Trips</span>
              <strong>
                {stats.trips}
              </strong>
            </div>

            <div>
              <span>Total Quantity</span>
              <strong>
                {stats.quantity}
              </strong>
            </div>

            <div>
              <span>Total Billing</span>
              <strong>
                {formatCurrency(
                  stats.billing,
                )}
              </strong>
            </div>

            <div>
              <span>Loading</span>
              <strong>
                {stats.loading}
              </strong>
            </div>

            <div>
              <span>Unloading</span>
              <strong>
                {stats.unloading}
              </strong>
            </div>

            <div>
              <span>Site to Site</span>
              <strong>
                {stats.siteToSite}
              </strong>
            </div>
          </div>

          <div className="material-history-section">
            <div className="material-history-title">
              <div>
                <span>
                  RECENT ACTIVITY
                </span>

                <strong>
                  Material History
                </strong>
              </div>

              <span>
                {recentTrips.length} records
              </span>
            </div>

            {recentTrips.length === 0 ? (
              <div className="material-history-empty">
                <Activity
                  size={18}
                  strokeWidth={1.8}
                />

                <span>
                  No material history
                  available.
                </span>
              </div>
            ) : (
              <div className="material-history-list">
                {recentTrips.map(
                  (trip, index) => {
                    const type =
                      getTripType(trip);

                    return (
                      <div
                        className="material-history-item"
                        key={
                          trip?.id ||
                          `material-trip-${index}`
                        }
                      >
                        <div className="material-history-date">
                          <strong>
                            {formatDate(
                              trip?.date,
                            )}
                          </strong>

                          <span>
                            {trip?.site ||
                              trip?.location ||
                              "Transport trip"}
                          </span>
                        </div>

                        <StatusBadge
                          status={type}
                          label={type}
                        />

                        <div className="material-history-amount">
                          {formatCurrency(
                            getTripAmount(
                              trip,
                            ),
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>

        <div className="material-details-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={() =>
              onEdit(material)
            }
          >
            <Edit3
              size={16}
              strokeWidth={1.8}
            />
            Edit Material
          </Button>
        </div>
      </aside>
    </div>
  );
}

function MaterialManagement() {
  const {
    materials = [],
    trips = [],
    refreshData,
  } = useAppData();

  const safeMaterials =
    Array.isArray(materials)
      ? materials
      : [];

  const safeTrips =
    Array.isArray(trips)
      ? trips
      : [];

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("name");

  const [showForm, setShowForm] =
    useState(false);

  const [editingMaterial, setEditingMaterial] =
    useState(null);

  const [selectedMaterial, setSelectedMaterial] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const summary = useMemo(() => {
    const active =
      safeMaterials.filter(
        (material) =>
          normalize(
            material?.status,
          ) !== "inactive",
      ).length;

    const inactive =
      safeMaterials.filter(
        (material) =>
          normalize(
            material?.status,
          ) === "inactive",
      ).length;

    const validTrips =
      safeTrips.filter(
        (trip) =>
          Boolean(
            getMaterialName(trip),
          ) &&
          Boolean(
            getTripType(trip),
          ),
      );

    const quantity =
      validTrips.reduce(
        (sum, trip) =>
          sum +
          getTripQuantity(trip),
        0,
      );

    const billing =
      validTrips.reduce(
        (sum, trip) =>
          sum +
          getTripAmount(trip),
        0,
      );

    return {
      total: safeMaterials.length,
      active,
      inactive,
      trips: validTrips.length,
      quantity,
      billing,
    };
  }, [safeMaterials, safeTrips]);

  const filteredMaterials =
    useMemo(() => {
      const query =
        normalize(search);

      const result =
        safeMaterials.filter(
          (material) => {
            const matchesSearch =
              !query ||
              normalize(
                material?.materialName,
              ).includes(query) ||
              normalize(
                material?.unit,
              ).includes(query);

            const materialStatus =
              normalize(
                material?.status,
              ) === "inactive"
                ? "inactive"
                : "active";

            const matchesStatus =
              statusFilter === "all" ||
              materialStatus ===
                statusFilter;

            return (
              matchesSearch &&
              matchesStatus
            );
          },
        );

      return [...result].sort(
        (a, b) => {
          const statsA =
            getMaterialStats(
              a,
              safeTrips,
            );

          const statsB =
            getMaterialStats(
              b,
              safeTrips,
            );

          if (
            sortBy === "trips"
          ) {
            return (
              statsB.trips -
              statsA.trips
            );
          }

          if (
            sortBy === "quantity"
          ) {
            return (
              statsB.quantity -
              statsA.quantity
            );
          }

          if (
            sortBy === "billing"
          ) {
            return (
              statsB.billing -
              statsA.billing
            );
          }

          return String(
            a?.materialName ||
              "",
          ).localeCompare(
            String(
              b?.materialName ||
                "",
            ),
            undefined,
            {
              numeric: true,
              sensitivity:
                "base",
            },
          );
        },
      );
    }, [
      safeMaterials,
      safeTrips,
      search,
      statusFilter,
      sortBy,
    ]);

  // EXPORT CSV
  const handleExportCSV = () => {
    if (!filteredMaterials.length) return;

    const headers = [
      'Material Name',
      'Unit',
      'Default Rate',
      'Total Trips',
      'Total Quantity',
      'Total Billing',
      'Status'
    ];

    const rows = filteredMaterials.map((material) => {
      const stats = getMaterialStats(material, safeTrips);
      return [
        material?.materialName || '',
        material?.unit || 'Trip',
        material?.defaultRate || 0,
        stats.trips,
        stats.quantity,
        stats.billing.toFixed(2),
        normalize(material?.status) === 'inactive' ? 'Inactive' : 'Active'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `materials-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const saveMaterial = (
    formData,
  ) => {
    const existingMaterials =
      readStorage(
        STORAGE_KEYS.materials,
        [],
      );

    const list =
      Array.isArray(
        existingMaterials,
      )
        ? existingMaterials
        : [];

    const normalizedName =
      normalize(
        formData.materialName,
      );

    const duplicate =
      list.find(
        (material) =>
          normalize(
            material?.materialName,
          ) === normalizedName &&
          material?.id !==
            formData?.id,
      );

    if (duplicate) {
      window.alert(
        "This material is already registered.",
      );
      return;
    }

    const now =
      new Date().toISOString();

    if (editingMaterial) {
      const updatedList =
        list.map(
          (material) =>
            material?.id ===
            editingMaterial?.id
              ? {
                  ...material,
                  ...formData,
                  id: material.id,
                  updatedAt: now,
                }
              : material,
        );

      writeStorage(
        STORAGE_KEYS.materials,
        updatedList,
      );
    } else {
      const newMaterial = {
        ...formData,
        id: createId(),
        createdAt: now,
        updatedAt: now,
      };

      writeStorage(
        STORAGE_KEYS.materials,
        [
          ...list,
          newMaterial,
        ],
      );
    }

    refreshData?.();

    setShowForm(false);
    setEditingMaterial(null);
  };

  const handleEdit = (
    material,
  ) => {
    setSelectedMaterial(
      null,
    );

    setEditingMaterial(
      material,
    );

    setShowForm(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    const existingMaterials =
      readStorage(
        STORAGE_KEYS.materials,
        [],
      );

    const list =
      Array.isArray(
        existingMaterials,
      )
        ? existingMaterials
        : [];

    const updatedList =
      list.filter(
        (material) =>
          material?.id !==
          deleteTarget?.id,
      );

    writeStorage(
      STORAGE_KEYS.materials,
      updatedList,
    );

    refreshData?.();

    if (
      selectedMaterial?.id ===
      deleteTarget?.id
    ) {
      setSelectedMaterial(
        null,
      );
    }

    setDeleteTarget(null);
  };

  const openAddForm = () => {
    setEditingMaterial(
      null,
    );

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingMaterial(null);
  };

  const openDetails = (
    material,
  ) => {
    setSelectedMaterial(
      material,
    );
  };

  return (
    <div className="material-management-page">
      <div className="material-page-header">
        <div>
          <span className="material-page-eyebrow">
            MATERIAL MANAGEMENT
          </span>

          <h2>
            Material Management
          </h2>

          <p>
            Manage transport materials,
            units, default rates and
            material-wise activity.
          </p>
        </div>

        <div className="material-page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportCSV}
            disabled={!filteredMaterials.length}
            icon={<FileBarChart size={16} />}
          >
            Export CSV
          </Button>

          <Button
            type="button"
            onClick={openAddForm}
          >
            <Plus
              size={17}
              strokeWidth={1.9}
            />
            Add Material
          </Button>
        </div>
      </div>

      <section
        className="material-summary-grid"
        aria-label="Material summary"
      >
        <Card className="material-summary-card">
          <div className="material-summary-icon">
            <Package
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>
              Total Materials
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>
        </Card>

        <Card className="material-summary-card">
          <div className="material-summary-icon">
            <CheckCircle2
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Active</span>

            <strong>
              {summary.active}
            </strong>
          </div>
        </Card>

        <Card className="material-summary-card">
          <div className="material-summary-icon">
            <Package
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Inactive</span>

            <strong>
              {summary.inactive}
            </strong>
          </div>
        </Card>

        <Card className="material-summary-card">
          <div className="material-summary-icon">
            <Activity
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>Total Trips</span>

            <strong>
              {summary.trips}
            </strong>
          </div>
        </Card>

        <Card className="material-summary-card">
          <div className="material-summary-icon">
            <Package
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>
              Total Quantity
            </span>

            <strong>
              {summary.quantity}
            </strong>
          </div>
        </Card>

        <Card className="material-summary-card material-summary-billing">
          <div className="material-summary-icon">
            <IndianRupee
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <span>
              Total Billing
            </span>

            <strong>
              {formatCurrency(
                summary.billing,
              )}
            </strong>
          </div>
        </Card>
      </section>

      {showForm && (
        <Card className="material-form-card">
          <MaterialForm
            initialValue={
              editingMaterial
            }
            onCancel={
              closeForm
            }
            onSave={
              saveMaterial
            }
          />
        </Card>
      )}

      <Card className="material-toolbar-card">
        <div className="material-toolbar">
          <div className="material-search">
            <Search
              size={17}
              strokeWidth={1.8}
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search material or unit..."
              aria-label="Search materials"
            />
          </div>

          <div className="material-filter-tabs">
            <button
              type="button"
              className={
                statusFilter ===
                "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "all",
                )
              }
            >
              All
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "active"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "active",
                )
              }
            >
              Active
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "inactive"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "inactive",
                )
              }
            >
              Inactive
            </button>
          </div>

          <label className="material-sort">
            <span>Sort</span>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value,
                )
              }
            >
              <option value="name">
                Material Name
              </option>

              <option value="trips">
                Most Trips
              </option>

              <option value="quantity">
                Highest Quantity
              </option>

              <option value="billing">
                Highest Billing
              </option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="material-table-card">
        <div className="material-table-header">
          <div>
            <span>
              MATERIAL REGISTER
            </span>

            <strong>
              All Materials
            </strong>
          </div>

          <small>
            {filteredMaterials.length}{" "}
            of {safeMaterials.length}
          </small>
        </div>

        {filteredMaterials.length ===
        0 ? (
          <div className="material-empty-state">
            <div className="material-empty-icon">
              <Package
                size={22}
                strokeWidth={1.7}
              />
            </div>

            <h3>
              {safeMaterials.length ===
              0
                ? "No materials added yet"
                : "No materials found"}
            </h3>

            <p>
              {safeMaterials.length ===
              0
                ? "Add your first material to start tracking material-wise transport activity."
                : "Try changing the search or status filter."}
            </p>

            {safeMaterials.length ===
              0 && (
              <Button
                type="button"
                onClick={
                  openAddForm
                }
              >
                <Plus
                  size={16}
                  strokeWidth={1.9}
                />
                Add First Material
              </Button>
            )}
          </div>
        ) : (
          <div className="material-table-wrap">
            <table className="material-table">
              <thead>
                <tr>
                  <th>
                    MATERIAL
                  </th>

                  <th>UNIT</th>

                  <th>
                    DEFAULT RATE
                  </th>

                  <th>TRIPS</th>

                  <th>QUANTITY</th>

                  <th>BILLING</th>

                  <th>
                    ACTIVITY
                  </th>

                  <th>STATUS</th>

                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredMaterials.map(
                  (material) => {
                    const stats =
                      getMaterialStats(
                        material,
                        safeTrips,
                      );

                    return (
                      <tr
                        key={
                          material?.id
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className="material-identity"
                            onClick={() =>
                              openDetails(
                                material,
                              )
                            }
                          >
                            <span className="material-avatar">
                              {getInitials(
                                material?.materialName,
                              )}
                            </span>

                            <span>
                              <strong>
                                {material?.materialName ||
                                  "Unnamed Material"}
                              </strong>

                              <small>
                                {material?.id ||
                                  "No material ID"}
                              </small>
                            </span>
                          </button>
                        </td>

                        <td>
                          <span className="material-unit">
                            {material?.unit ||
                              "Trip"}
                          </span>
                        </td>

                        <td>
                          <strong className="material-money">
                            {formatCurrency(
                              Number(
                                material?.defaultRate ??
                                  material?.rate ??
                                  0,
                              ),
                            )}
                          </strong>
                        </td>

                        <td>
                          <strong className="material-number">
                            {stats.trips}
                          </strong>
                        </td>

                        <td>
                          <strong className="material-number">
                            {stats.quantity}
                          </strong>
                        </td>

                        <td>
                          <strong className="material-money">
                            {formatCurrency(
                              stats.billing,
                            )}
                          </strong>
                        </td>

                        <td>
                          <div className="material-activity">
                            <span
                              title="Loading"
                            >
                              L{" "}
                              {
                                stats.loading
                              }
                            </span>

                            <span
                              title="Unloading"
                            >
                              U{" "}
                              {
                                stats.unloading
                              }
                            </span>

                            <span
                              title="Site to Site"
                            >
                              S{" "}
                              {
                                stats.siteToSite
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              material?.status ||
                              "active"
                            }
                            label={
                              normalize(
                                material?.status,
                              ) ===
                              "inactive"
                                ? "Inactive"
                                : "Active"
                            }
                          />
                        </td>

                        <td>
                          <div className="material-row-actions">
                            <button
                              type="button"
                              title="View details"
                              aria-label={`View ${material?.materialName || "material"} details`}
                              onClick={() =>
                                openDetails(
                                  material,
                                )
                              }
                            >
                              <MoreVertical
                                size={17}
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>

                            <button
                              type="button"
                              title="Edit material"
                              aria-label={`Edit ${material?.materialName || "material"}`}
                              onClick={() =>
                                handleEdit(
                                  material,
                                )
                              }
                            >
                              <Edit3
                                size={16}
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>

                            <button
                              type="button"
                              title="Delete material"
                              aria-label={`Delete ${material?.materialName || "material"}`}
                              onClick={() =>
                                setDeleteTarget(
                                  material,
                                )
                              }
                            >
                              <Trash2
                                size={16}
                                strokeWidth={
                                  1.8
                                }
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedMaterial && (
        <MaterialDetails
          material={
            selectedMaterial
          }
          trips={safeTrips}
          onClose={() =>
            setSelectedMaterial(
              null,
            )
          }
          onEdit={
            handleEdit
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(
          deleteTarget,
        )}
        title="Delete material?"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.materialName || "this material"}? Existing trip records will not be deleted.`
            : ""
        }
        confirmLabel="Delete Material"
        cancelLabel="Cancel"
        danger
        onConfirm={
          handleDelete
        }
        onCancel={() =>
          setDeleteTarget(null)
        }
      />
    </div>
  );
}

export default MaterialManagement;