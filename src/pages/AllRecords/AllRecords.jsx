import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Package,
  Pencil,
  Printer,
  RotateCcw,
  Save,
  Search,
  Tractor,
  Trash2,
  Truck,
  X,
  Download,
  Copy,
  CheckSquare,
  Square,
} from "lucide-react";

import "./AllRecords.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const SAVED_VIEWS_KEY = "saoAutoTractorSavedRecordViews";
const ITEMS_PER_PAGE = 15;
const BULK_UNDO_MS = 10000;

function readSavedViews() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((view) => view?.id && view?.name && view?.filters) : [];
  } catch {
    return [];
  }
}

function readTrips() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read trips:", error);
    return [];
  }
}

function writeTrips(trips) {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    return true;
  } catch (error) {
    console.error("Unable to save trips:", error);
    return false;
  }
}

function getTripId(trip, index) {
  return (
    trip?.id ||
    trip?._id ||
    trip?.tripId ||
    `${trip?.date || "trip"}-${trip?.vehicleNumber || ""}-${index}`
  );
}

function getVehicleNumber(trip) {
  if (trip?.jcbWork && trip?.jcbMachineNumber) return trip.jcbMachineNumber;
  return (
    trip?.vehicleNumber ||
    trip?.tractorNumber ||
    trip?.vehicleNo ||
    trip?.vehicle ||
    "—"
  );
}

function getPartyName(trip) {
  return trip?.partyName || trip?.party || trip?.customerName || "—";
}

function getMaterialName(trip) {
  if (trip?.quickBill) return trip?.description || "Manual invoice";
  return (
    trip?.materialName ||
    trip?.material ||
    trip?.productName ||
    trip?.product ||
    (trip?.jcbWork ? trip?.jcbWorkType : "") ||
    "—"
  );
}

function getDriverName(trip) {
  if (trip?.jcbWork && trip?.jcbOperatorName) return trip.jcbOperatorName;
  return trip?.driverName || trip?.driver || "—";
}

function getTripType(trip) {
  const type =
    trip?.tripType ||
    trip?.workType ||
    trip?.type ||
    trip?.trip_type ||
    "";

  const value = String(type).trim().toLowerCase();

  if (value.includes("unload")) return "Unloading";
  if (value.includes("site")) return "Site to Site";
  if (value.includes("load")) return "Loading";

  if (trip?.jcbWork) return "JCB Work";
  if (trip?.jcbWorkBill) return trip?.tripType === "JCB + Transport" ? "JCB + Transport Bill" : "JCB Work · JCB Hours Bill";
  if (trip?.quickBill) return type ? `${type} · Quick Bill` : "Quick Bill";
  return type || "—";
}

function getQuantity(trip) {
  const value = Number(trip?.quantity);
  return Number.isFinite(value) ? value : 0;
}

function getRate(trip) {
  const value = Number(trip?.rate);
  return Number.isFinite(value) ? value : 0;
}

function getAmount(trip) {
  const directAmount = Number(trip?.amount);

  if (Number.isFinite(directAmount) && directAmount >= 0) {
    return directAmount;
  }

  return getQuantity(trip) * getRate(trip);
}

function normalizeDate(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const normalized = normalizeDate(value);

  if (!normalized) return "—";

  const [year, month, day] = normalized.split("-");

  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  const amount = Number(value) || 0;

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function getTimestamp(trip) {
  const created = trip?.createdAt || trip?.updatedAt;

  if (created) {
    const timestamp = new Date(created).getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  const date = normalizeDate(trip?.date);

  if (date) {
    const timestamp = new Date(`${date}T00:00:00`).getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

function getToday() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function getFirstDate() {
  return "";
}

function getLastDate() {
  return "";
}

function StatusPill({ type }) {
  const normalized = String(type).toLowerCase();

  let className = "all-records-status";

  if (normalized.includes("loading")) {
    className += " is-loading";
  } else if (normalized.includes("unloading")) {
    className += " is-unloading";
  } else if (normalized.includes("site")) {
    className += " is-site";
  }

  return <span className={className}>{type}</span>;
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function DetailModal({ trip, onClose, onDelete, onEdit, onClone }) {
  if (!trip) return null;

  const amount = getAmount(trip);

  return (
    <div
      className="all-records-modal-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="all-records-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-records-detail-title"
      >
        <div className="all-records-modal-header">
          <div className="all-records-modal-heading">
            <div className="all-records-modal-heading-icon">
              <FileText size={18} />
            </div>

            <div>
              <span className="all-records-eyebrow">{trip.jcbWorkBill ? (trip.tripType === "JCB + Transport" ? "JCB + TRANSPORT BILL" : "JCB HOURS BILL") : trip.quickBill ? "QUICK BILL" : "TRIP DETAILS"}</span>
              <h2 id="all-records-detail-title">{trip.jcbWorkBill ? (trip.tripType === "JCB + Transport" ? "JCB + Transport Bill Record" : "JCB Work Bill Record") : trip.quickBill ? "Quick Bill Record" : "Transport Record"}</h2>
            </div>
          </div>

          <button
            type="button"
            className="all-records-icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="all-records-detail-topline">
          <div>
            <span>Record date</span>
            <strong>{formatDate(trip.date)}</strong>
          </div>

          <StatusPill type={getTripType(trip)} />
        </div>

        <div className="all-records-detail-grid">
          <DetailItem
            label={trip?.jcbWork ? "JCB / Machine" : "Vehicle"}
            value={trip?.jcbWork ? trip?.jcbMachineNumber || "Not specified" : getVehicleNumber(trip)}
            icon={<Tractor size={14} />}
          />

          <DetailItem
            label={trip?.jcbWork ? "Operator" : "Driver"}
            value={trip?.jcbWork ? trip?.jcbOperatorName || "Not specified" : getDriverName(trip)}
          />

          <DetailItem
            label="Party"
            value={getPartyName(trip)}
          />

          <DetailItem
            label={trip?.jcbWork ? "Work / Material" : "Material"}
            value={trip?.jcbWork ? trip?.materialName || trip?.jcbWorkType || "Not specified" : getMaterialName(trip)}
            icon={<Package size={14} />}
          />

          <DetailItem
            label="Site"
            value={trip?.site || trip?.location || "—"}
          />

          <DetailItem
            label={trip?.jcbWork ? "Working time" : "Quantity"}
            value={trip?.jcbWork ? `${trip?.jcbHours || 0} hr ${trip?.jcbMinutes || 0} min` : `${getQuantity(trip)} ${trip?.unit || "Trip"}`}
          />

          <DetailItem
            label={trip?.jcbWork ? "Hourly rate" : "Rate"}
            value={formatCurrency(getRate(trip))}
          />

          <DetailItem
            label="Amount"
            value={formatCurrency(amount)}
            highlight
          />
        </div>

        {trip?.notes && (
          <div className="all-records-notes">
            <div className="all-records-notes-heading">
              <span>Notes</span>
            </div>

            <p>{trip.notes}</p>
          </div>
        )}

        <div className="all-records-modal-footer">
          <button
            type="button"
            className="all-records-danger-button"
            onClick={() => onDelete(trip)}
          >
            <Trash2 size={16} />
            Delete Record
          </button>

          <div className="all-records-modal-footer-right">
            <button
              type="button"
              className="all-records-secondary-button"
              onClick={() => onClone(trip)}
            >
              <Copy size={16} />
              Clone
            </button>

            <button
              type="button"
              className="all-records-secondary-button"
              onClick={() => onEdit(trip)}
            >
              <Pencil size={16} />
              Edit
            </button>

            <button
              type="button"
              className="all-records-secondary-button"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print
            </button>

            <button
              type="button"
              className="all-records-primary-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon, highlight = false }) {
  return (
    <div className={`all-records-detail-item ${highlight ? "is-highlight" : ""}`}>
      <div className="all-records-detail-label">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>

      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   EDIT MODAL
========================================================= */

function EditModal({ trip, onClose, onSave }) {
  const isJcbWork = Boolean(trip?.jcbWork || trip?.tripType === "JCB Work");
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
    jcbWorkType: "",
    jcbMachineNumber: "",
    jcbOperatorName: "",
    jcbOperatorMobile: "",
    jcbHours: "",
    jcbMinutes: "0",
  });

  useEffect(() => {
    if (!trip) return;

    setForm({
      date: normalizeDate(trip?.date),

      vehicleNumber:
        trip?.vehicleNumber ||
        trip?.tractorNumber ||
        trip?.vehicleNo ||
        trip?.vehicle ||
        "",

      partyName:
        trip?.partyName ||
        trip?.party ||
        trip?.customerName ||
        "",

      materialName:
        trip?.materialName ||
        trip?.material ||
        trip?.productName ||
        trip?.product ||
        "",

      driverName: trip?.driverName || trip?.driver || "",

      tripType:
        getTripType(trip) === "—"
          ? "Loading"
          : getTripType(trip),

      site: trip?.site || trip?.location || "",

      quantity:
        trip?.quantity !== undefined &&
        trip?.quantity !== null
          ? String(trip.quantity)
          : "",

      unit: trip?.unit || "",

      rate:
        trip?.rate !== undefined &&
        trip?.rate !== null
          ? String(trip.rate)
          : "",

      amount:
        trip?.amount !== undefined &&
        trip?.amount !== null
          ? String(trip.amount)
          : "",

      notes: trip?.notes || "",
      jcbWorkType: trip?.jcbWorkType || "",
      jcbMachineNumber: trip?.jcbMachineNumber || "",
      jcbOperatorName: trip?.jcbOperatorName || "",
      jcbOperatorMobile: trip?.jcbOperatorMobile || "",
      jcbHours: String(trip?.jcbHours ?? Math.floor(Number(trip?.quantity) || 0)),
      jcbMinutes: String(trip?.jcbMinutes ?? Math.round(((Number(trip?.quantity) || 0) % 1) * 60)),
    });
  }, [trip]);

  if (!trip) return null;

  const quantity = Number(form.quantity) || 0;
  const rate = Number(form.rate) || 0;
  const calculatedAmount = quantity * rate;

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleQuantityOrRateChange = (field, value) => {
    setForm((previous) => {
      const next = {
        ...previous,
        [field]: value,
      };

      const nextQuantity = Number(next.quantity) || 0;
      const nextRate = Number(next.rate) || 0;

      next.amount = String(nextQuantity * nextRate);

      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.date) {
      alert("Please select a date.");
      return;
    }

    if (isJcbWork && ((Number(form.jcbHours) || 0) < 0 || !Number.isInteger(Number(form.jcbHours) || 0) || !Number.isInteger(Number(form.jcbMinutes) || 0) || ((Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) <= 0) || Number(form.jcbMinutes) < 0 || Number(form.jcbMinutes) > 59)) {
      alert("Enter valid JCB hours and minutes (minutes must be 0–59). ");
      return;
    }

    if (isJcbWork && (!Number.isFinite(Number(form.rate)) || Number(form.rate) <= 0)) {
      alert("Enter an hourly rate above ₹0.");
      return;
    }

    if (!isJcbWork && !form.vehicleNumber.trim()) {
      alert("Please enter vehicle number.");
      return;
    }

    if (!isJcbWork && !form.partyName.trim()) {
      alert("Please enter party name.");
      return;
    }

    if (!isJcbWork && !form.materialName.trim()) {
      alert("Please enter material.");
      return;
    }

    const jcbQuantity = Number(((Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) / 60).toFixed(4));
    const finalAmount = isJcbWork
      ? Math.round(jcbQuantity * (Number(form.rate) || 0) * 100) / 100
      : form.amount === ""
        ? calculatedAmount
        : Number(form.amount) || 0;

    onSave({
      date: form.date,
      vehicleNumber: isJcbWork ? "" : form.vehicleNumber.trim(),
      partyName: form.partyName.trim(),
      materialName: form.materialName.trim(),
      driverName: isJcbWork ? "" : form.driverName.trim(),
      tripType: isJcbWork ? "JCB Work" : form.tripType,
      site: form.site.trim(),
      quantity: isJcbWork
        ? jcbQuantity
        : Number(form.quantity) || 0,
      unit: isJcbWork ? "hour" : form.unit.trim(),
      rate: Number(form.rate) || 0,
      amount: finalAmount,
      notes: form.notes.trim(),
      jcbWork: isJcbWork,
      jcbWorkType: form.jcbWorkType.trim(),
      jcbMachineNumber: isJcbWork ? form.jcbMachineNumber.trim() : "",
      jcbOperatorName: isJcbWork ? form.jcbOperatorName.trim() : "",
      jcbOperatorMobile: form.jcbOperatorMobile.trim(),
      jcbHours: isJcbWork ? Number(form.jcbHours) || 0 : undefined,
      jcbMinutes: isJcbWork ? Number(form.jcbMinutes) || 0 : undefined,
    });
  };

  return (
    <div
      className="all-records-edit-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="all-records-edit-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-records-edit-title"
      >
        <div className="all-records-edit-header">
          <div className="all-records-modal-heading">
            <div className="all-records-modal-heading-icon">
              <Pencil size={18} />
            </div>

            <div>
              <span className="all-records-eyebrow">
                EDIT TRANSPORT RECORD
              </span>

              <h2 id="all-records-edit-title">Edit Record</h2>

              <p>
                Update this record without creating a new trip entry.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="all-records-icon-button"
            onClick={onClose}
            aria-label="Close edit form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="all-records-edit-grid">
            <label>
              <span>Date *</span>

              <div className="all-records-input-wrap">
                <CalendarDays size={15} />

                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    handleChange("date", event.target.value)
                  }
                  required
                />
              </div>
            </label>

            <label>
              <span>{isJcbWork ? "JCB / Machine Number (optional)" : "Vehicle / Tractor *"}</span>

              <div className="all-records-input-wrap">
                <Tractor size={15} />

                <input
                  type="text"
                  value={isJcbWork ? form.jcbMachineNumber : form.vehicleNumber}
                  onChange={(event) =>
                    handleChange(
                      isJcbWork ? "jcbMachineNumber" : "vehicleNumber",
                      event.target.value,
                    )
                  }
                  placeholder={isJcbWork ? "Optional machine number" : "Vehicle number"}
                  required={!isJcbWork}
                />
              </div>
            </label>

            <label>
              <span>Party{isJcbWork ? " (optional)" : " *"}</span>

              <input
                type="text"
                value={form.partyName}
                onChange={(event) =>
                  handleChange(
                    "partyName",
                    event.target.value,
                  )
                }
                placeholder="Party name"
                required={!isJcbWork}
              />
            </label>

            <label>
              <span>{isJcbWork ? "Work / Material (optional)" : "Material *"}</span>

              <input
                type="text"
                value={form.materialName}
                onChange={(event) =>
                  handleChange(
                    "materialName",
                    event.target.value,
                  )
                }
                placeholder="Material"
                required={!isJcbWork}
              />
            </label>

            <label>
              <span>{isJcbWork ? "Operator (optional)" : "Driver"}</span>

              <input
                type="text"
                value={isJcbWork ? form.jcbOperatorName : form.driverName}
                onChange={(event) =>
                  handleChange(
                    isJcbWork ? "jcbOperatorName" : "driverName",
                    event.target.value,
                  )
                }
                  placeholder={isJcbWork ? "Operator name" : "Driver name"}
              />
            </label>

            <label>
              <span>{isJcbWork ? "JCB Work Type (optional)" : "Trip Type"}</span>

              <select
                value={isJcbWork ? form.jcbWorkType : form.tripType}
                onChange={(event) =>
                  handleChange(isJcbWork ? "jcbWorkType" : "tripType", event.target.value)
                }
              >
                {isJcbWork ? <><option value="">General / blank</option><option value="Excavation">Excavation</option><option value="Earth moving">Earth moving</option><option value="Site preparation">Site preparation</option><option value="Land levelling">Land levelling</option><option value="Demolition">Demolition</option><option value="Other">Other</option></> : <><option value="Loading">Loading</option><option value="Unloading">
                  Unloading
                </option><option value="Site to Site">
                  Site to Site
                </option></>}
              </select>
            </label>

            {isJcbWork && <>
              <label>
                <span>Operator Mobile (optional)</span>
                <input type="tel" value={form.jcbOperatorMobile} onChange={(event) => handleChange("jcbOperatorMobile", event.target.value)} placeholder="Operator mobile" />
              </label>
              <label>
                <span>Hours *</span>
                <input type="number" min="0" step="1" value={form.jcbHours} onChange={(event) => handleChange("jcbHours", event.target.value)} />
              </label>
              <label>
                <span>Minutes *</span>
                <input type="number" min="0" max="59" step="1" value={form.jcbMinutes} onChange={(event) => handleChange("jcbMinutes", event.target.value)} />
              </label>
            </>}

            <label className="all-records-edit-full">
              <span>Site / Location</span>

              <input
                type="text"
                value={form.site}
                onChange={(event) =>
                  handleChange(
                    "site",
                    event.target.value,
                  )
                }
                placeholder="Site or location"
              />
            </label>

            <label>
              <span>{isJcbWork ? "Working time" : "Quantity"}</span>

              <input
                type="number"
                min="0"
                step="any"
                value={isJcbWork ? ((Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) / 60) : form.quantity}
                onChange={(event) =>
                  handleQuantityOrRateChange(
                    "quantity",
                    event.target.value,
                  )
                }
                placeholder={isJcbWork ? "Calculated from hours and minutes" : "0"}
                disabled={isJcbWork}
              />
            </label>

            <label>
              <span>{isJcbWork ? "Unit" : "Unit"}</span>

              <input
                type="text"
                value={isJcbWork ? "hour" : form.unit}
                onChange={(event) =>
                  handleChange(
                    "unit",
                    event.target.value,
                  )
                }
                placeholder="Trip / Ton / CFT..."
                disabled={isJcbWork}
              />
            </label>

            <label>
              <span>{isJcbWork ? "Hourly Rate" : "Rate"}</span>

              <div className="all-records-input-wrap">
                <IndianRupee size={15} />

                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.rate}
                  onChange={(event) =>
                    handleQuantityOrRateChange(
                      "rate",
                      event.target.value,
                    )
                  }
                  placeholder="0"
                />
              </div>
            </label>

            <label>
              <span>Amount</span>

              <div className="all-records-input-wrap">
                <IndianRupee size={15} />

                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.amount}
                  onChange={(event) =>
                    handleChange(
                      "amount",
                      event.target.value,
                    )
                  }
                  placeholder="0"
                />
              </div>

              <small className="all-records-edit-helper">
                Quantity × Rate ={" "}
                {formatCurrency(calculatedAmount)}
              </small>
            </label>

            <label className="all-records-edit-full">
              <span>Notes</span>

              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) =>
                  handleChange(
                    "notes",
                    event.target.value,
                  )
                }
                placeholder="Optional notes..."
              />
            </label>
          </div>

          <div className="all-records-edit-footer">
            <button
              type="button"
              className="all-records-secondary-button"
              onClick={onClose}
            >
              <X size={16} />
              Cancel
            </button>

            <button
              type="submit"
              className="all-records-primary-button"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   DELETE CONFIRMATION
========================================================= */

function DeleteConfirmModal({ trip, onCancel, onConfirm }) {
  if (!trip) return null;

  return (
    <div
      className="all-records-delete-backdrop"
      onMouseDown={onCancel}
      role="presentation"
    >
      <div
        className="all-records-delete-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-records-delete-title"
      >
        <div className="all-records-delete-icon">
          <Trash2 size={22} />
        </div>

        <div className="all-records-delete-content">
          <span className="all-records-eyebrow">
            DELETE RECORD
          </span>

          <h2 id="all-records-delete-title">
            Delete this transport record?
          </h2>

          <p>
            This record will be permanently removed from the
            transport records.
          </p>
        </div>

        <div className="all-records-delete-summary">
          <div>
            <span>Date</span>
            <strong>{formatDate(trip.date)}</strong>
          </div>

          <div>
            <span>Vehicle</span>
            <strong>{getVehicleNumber(trip)}</strong>
          </div>

          <div>
            <span>Party</span>
            <strong>{getPartyName(trip)}</strong>
          </div>

          <div>
            <span>Trip Type</span>
            <strong>{getTripType(trip)}</strong>
          </div>

          <div>
            <span>Amount</span>
            <strong>{formatCurrency(getAmount(trip))}</strong>
          </div>
        </div>

        <div className="all-records-delete-warning">
          <strong>This action cannot be undone.</strong>

          <span>
            Billing, reports and other calculations based on this
            trip may also change after deletion.
          </span>
        </div>

        <div className="all-records-delete-actions">
          <button
            type="button"
            className="all-records-secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="all-records-delete-confirm-button"
            onClick={onConfirm}
          >
            <Trash2 size={16} />
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BULK DELETE CONFIRMATION
========================================================= */

function BulkDeleteConfirmModal({ count, onCancel, onConfirm }) {
  return (
    <div
      className="all-records-delete-backdrop"
      onMouseDown={onCancel}
      role="presentation"
    >
      <div
        className="all-records-delete-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-records-bulk-delete-title"
      >
        <div className="all-records-delete-icon">
          <Trash2 size={22} />
        </div>

        <div className="all-records-delete-content">
          <span className="all-records-eyebrow">
            BULK DELETE
          </span>

          <h2 id="all-records-bulk-delete-title">
            Delete {count} records?
          </h2>

          <p>
            {count} selected trips will be removed from the ledger. You can undo this action for 10 seconds.
          </p>
        </div>

        <div className="all-records-delete-warning">
          <strong>Undo is available for 10 seconds after confirmation.</strong>

          <span>
            Billing, reports and other calculations based on these
            trips may also change after deletion.
          </span>
        </div>

        <div className="all-records-delete-actions">
          <button
            type="button"
            className="all-records-secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="all-records-delete-confirm-button"
            onClick={onConfirm}
          >
            <Trash2 size={16} />
            Delete {count} Records
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function AllRecords() {
  const [trips, setTrips] = useState(readTrips);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(getFirstDate);
  const [dateTo, setDateTo] = useState(getLastDate);
  const [partyFilter, setPartyFilter] = useState("");
  const [tractorFilter, setTractorFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [deleteTrip, setDeleteTrip] = useState(null);
  const [bulkDeleteTrips, setBulkDeleteTrips] = useState(null);
  const [selectedTripIds, setSelectedTripIds] = useState(new Set());

  const [quickPreset, setQuickPreset] = useState("");
  const [savedViews, setSavedViews] = useState(readSavedViews);
  const [activeSavedViewId, setActiveSavedViewId] = useState("");
  const [lastBulkDelete, setLastBulkDelete] = useState(null);
  const applyingSavedViewRef = useRef(false);

  useEffect(() => {
    if (!lastBulkDelete) return undefined;
    const timer = window.setTimeout(() => setLastBulkDelete(null), BULK_UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastBulkDelete]);

  useEffect(() => {
    const refresh = () => {
      setTrips(readTrips());
    };

    window.addEventListener("storage", refresh);
    window.addEventListener(
      "saoAutoTractorDataChanged",
      refresh,
    );

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(
        "saoAutoTractorDataChanged",
        refresh,
      );
    };
  }, []);

  const normalizedTrips = useMemo(() => {
    return trips.map((trip, index) => ({
      ...trip,
      __index: index,
      __id: getTripId(trip, index),
      __date: normalizeDate(trip?.date),
      __vehicle: getVehicleNumber(trip),
      __party: getPartyName(trip),
      __material: getMaterialName(trip),
      __driver: getDriverName(trip),
      __tripType: getTripType(trip),
      __quantity: getQuantity(trip),
      __rate: getRate(trip),
      __amount: getAmount(trip),
    }));
  }, [trips]);

  const filterOptions = useMemo(() => {
    const parties = new Set();
    const tractors = new Set();
    const materials = new Set();
    const tripTypes = new Set();

    normalizedTrips.forEach((trip) => {
      if (trip.__party !== "—") parties.add(trip.__party);
      if (trip.__vehicle !== "—") tractors.add(trip.__vehicle);
      if (trip.__material !== "—") materials.add(trip.__material);

      if (trip.__tripType !== "—") {
        tripTypes.add(trip.__tripType);
      }
    });

    return {
      parties: [...parties].sort((a, b) =>
        a.localeCompare(b),
      ),

      tractors: [...tractors].sort((a, b) =>
        a.localeCompare(b),
      ),

      materials: [...materials].sort((a, b) =>
        a.localeCompare(b),
      ),

      tripTypes: [...tripTypes].sort((a, b) =>
        a.localeCompare(b),
      ),
    };
  }, [normalizedTrips]);

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...normalizedTrips]
      .filter((trip) => {
        if (
          dateFrom &&
          trip.__date &&
          trip.__date < dateFrom
        ) {
          return false;
        }

        if (
          dateTo &&
          trip.__date &&
          trip.__date > dateTo
        ) {
          return false;
        }

        if (
          partyFilter &&
          trip.__party !== partyFilter
        ) {
          return false;
        }

        if (
          tractorFilter &&
          trip.__vehicle !== tractorFilter
        ) {
          return false;
        }

        if (
          materialFilter &&
          trip.__material !== materialFilter
        ) {
          return false;
        }

        if (
          tripTypeFilter &&
          trip.__tripType !== tripTypeFilter
        ) {
          return false;
        }

        if (!query) return true;

        const searchable = [
          trip.__vehicle,
          trip.__party,
          trip.__material,
          trip.__driver,
          trip.__tripType,
          trip?.site,
          trip?.location,
          trip?.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const dateDifference =
          new Date(
            `${b.__date || "1900-01-01"}T00:00:00`,
          ).getTime() -
          new Date(
            `${a.__date || "1900-01-01"}T00:00:00`,
          ).getTime();

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return getTimestamp(b) - getTimestamp(a);
      });
  }, [
    normalizedTrips,
    search,
    dateFrom,
    dateTo,
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
  ]);

  const summary = useMemo(() => {
    return filteredTrips.reduce(
      (result, trip) => {
        result.trips += 1;
        result.quantity += trip.__quantity;
        result.amount += trip.__amount;

        const type = trip.__tripType.toLowerCase();

        if (type.includes("loading")) {
          result.loading += 1;
        } else if (type.includes("unloading")) {
          result.unloading += 1;
        } else if (type.includes("site")) {
          result.siteToSite += 1;
        }

        return result;
      },
      {
        trips: 0,
        loading: 0,
        unloading: 0,
        siteToSite: 0,
        quantity: 0,
        amount: 0,
      },
    );
  }, [filteredTrips]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrips.length / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage((page) =>
      Math.min(page, totalPages),
    );
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTripIds(new Set());
  }, [
    search,
    dateFrom,
    dateTo,
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
  ]);

  const paginatedTrips = useMemo(() => {
    const start =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredTrips.slice(
      start,
      start + ITEMS_PER_PAGE,
    );
  }, [filteredTrips, currentPage]);

  const hasFilters =
    search ||
    dateFrom ||
    dateTo ||
    partyFilter ||
    tractorFilter ||
    materialFilter ||
    tripTypeFilter;

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPartyFilter("");
    setTractorFilter("");
    setMaterialFilter("");
    setTripTypeFilter("");
    setQuickPreset("");
    setActiveSavedViewId("");
    setCurrentPage(1);
  };

  const getCurrentFilters = () => ({
    search,
    dateFrom,
    dateTo,
    partyFilter,
    tractorFilter,
    materialFilter,
    tripTypeFilter,
  });

  const saveCurrentView = () => {
    const name = window.prompt("Name this record view:", "My record view")?.trim();
    if (!name) return;

    const view = {
      id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.slice(0, 48),
      filters: getCurrentFilters(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...savedViews, view];
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
      setSavedViews(next);
      setActiveSavedViewId(view.id);
    } catch {
      window.alert("Unable to save this view in browser storage.");
    }
  };

  const applySavedView = (id) => {
    const view = savedViews.find((item) => item.id === id);
    if (!view) {
      setActiveSavedViewId("");
      return;
    }

    applyingSavedViewRef.current = true;
    setSearch(view.filters.search || "");
    setDateFrom(view.filters.dateFrom || "");
    setDateTo(view.filters.dateTo || "");
    setPartyFilter(view.filters.partyFilter || "");
    setTractorFilter(view.filters.tractorFilter || "");
    setMaterialFilter(view.filters.materialFilter || "");
    setTripTypeFilter(view.filters.tripTypeFilter || "");
    setQuickPreset("");
    setActiveSavedViewId(view.id);
  };

  const deleteActiveSavedView = () => {
    const view = savedViews.find((item) => item.id === activeSavedViewId);
    if (!view || !window.confirm(`Delete saved view “${view.name}”? Trip records will not be affected.`)) return;

    const next = savedViews.filter((item) => item.id !== view.id);
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
      setSavedViews(next);
      setActiveSavedViewId("");
    } catch {
      window.alert("Unable to update saved views in browser storage.");
    }
  };

  useEffect(() => {
    if (applyingSavedViewRef.current) {
      applyingSavedViewRef.current = false;
      return;
    }
    setActiveSavedViewId("");
  }, [search, dateFrom, dateTo, partyFilter, tractorFilter, materialFilter, tripTypeFilter]);

  const refreshRecords = () => {
    setTrips(readTrips());
  };

  const printRecords = () => {
    window.print();
  };

  const todayCount = useMemo(() => {
    const today = getToday();

    return normalizedTrips.filter(
      (trip) => trip.__date === today,
    ).length;
  }, [normalizedTrips]);

  /* =========================================================
     EXPORT CSV
  ========================================================= */

  const exportCSV = (sourceTrips = filteredTrips, filePrefix = "records") => {
    if (!sourceTrips.length) return;

    const headers = [
      "Date",
      "Vehicle",
      "Party",
      "Material",
      "Driver",
      "Trip Type",
      "Site",
      "Quantity",
      "Unit",
      "Rate",
      "Amount",
    ];

    const rows = sourceTrips.map((trip) => [
      formatDate(trip.__date),
      trip.__vehicle,
      trip.__party,
      trip.__material,
      trip.__driver,
      trip.__tripType,
      trip?.site || trip?.location || "",
      trip.__quantity,
      trip?.unit || "Trip",
      trip.__rate,
      trip.__amount,
    ]);

    const escapeCell = (value) => {
      let text = String(value ?? "");
      if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csvContent = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) =>
        row.map(escapeCell).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filePrefix}-${getToday()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* =========================================================
     QUICK PRESETS
  ========================================================= */

  const applyQuickPreset = (preset) => {
    const today = getToday();
    const now = new Date();

    if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
      setQuickPreset("today");
    } else if (preset === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);

      setDateFrom(normalizeDate(start));
      setDateTo(today);
      setQuickPreset("week");
    } else if (preset === "month") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      setDateFrom(normalizeDate(start));
      setDateTo(today);
      setQuickPreset("month");
    } else if (preset === "clear") {
      setDateFrom("");
      setDateTo("");
      setQuickPreset("");
    }
  };

  /* =========================================================
     CLONE
  ========================================================= */

  const cloneTrip = (trip) => {
    const currentTrips = readTrips();

    const newTrip = {
      ...trip,
      id: undefined,
      __id: undefined,
      __index: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: getToday(),
    };

    const updatedTrips = [newTrip, ...currentTrips];

    if (!writeTrips(updatedTrips)) {
      window.alert("Trip could not be saved in this browser. No change was made.");
      return;
    }
    setTrips(readTrips());
    setSelectedTrip(null);
  };

  /* =========================================================
     BULK DELETE
  ========================================================= */

  const toggleSelectAll = () => {
    if (
      selectedTripIds.size === paginatedTrips.length &&
      paginatedTrips.length > 0
    ) {
      setSelectedTripIds(new Set());
    } else {
      const ids = paginatedTrips.map(
        (trip) => trip.__id,
      );

      setSelectedTripIds(new Set(ids));
    }
  };

  const toggleSelectTrip = (id) => {
    const newSet = new Set(selectedTripIds);

    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    setSelectedTripIds(newSet);
  };

  const requestBulkDelete = () => {
    if (selectedTripIds.size === 0) return;

    setBulkDeleteTrips(new Set(selectedTripIds));
  };

  const confirmBulkDelete = () => {
    if (
      !bulkDeleteTrips ||
      bulkDeleteTrips.size === 0
    ) {
      return;
    }

    const currentTrips = readTrips();
    const deletedEntries = currentTrips.flatMap((trip, index) =>
      bulkDeleteTrips.has(getTripId(trip, index)) ? [{ trip, index }] : [],
    );
    const updatedTrips = currentTrips.filter(
      (trip, index) => !bulkDeleteTrips.has(getTripId(trip, index)),
    );

    if (!deletedEntries.length) return;
    if (!writeTrips(updatedTrips)) {
      window.alert("Records could not be deleted because browser storage is unavailable. No change was made.");
      return;
    }
    setTrips(readTrips());
    setSelectedTripIds(new Set());
    setBulkDeleteTrips(null);
    setLastBulkDelete({ entries: deletedEntries, count: deletedEntries.length });
  };

  const undoBulkDelete = () => {
    if (!lastBulkDelete?.entries?.length) return;

    const restoredTrips = readTrips();
    const existingIds = new Set(
      restoredTrips
        .map((trip) => trip?.id || trip?._id || trip?.tripId)
        .filter(Boolean)
        .map(String),
    );
    const entriesToRestore = lastBulkDelete.entries
      .filter(({ trip }) => {
        const id = trip?.id || trip?._id || trip?.tripId;
        return !id || !existingIds.has(String(id));
      })
      .sort((a, b) => a.index - b.index);

    entriesToRestore.forEach(({ trip, index }) => {
      restoredTrips.splice(Math.min(index, restoredTrips.length), 0, trip);
    });

    if (!writeTrips(restoredTrips)) {
      window.alert("Records could not be restored because browser storage is unavailable. Please retry.");
      return;
    }
    setTrips(readTrips());
    setSelectedTripIds(new Set());
    setLastBulkDelete(null);
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const requestDelete = (trip) => {
    setSelectedTrip(null);
    setEditTrip(null);
    setDeleteTrip(trip);
  };

  const confirmDelete = () => {
    if (!deleteTrip) return;

    const currentTrips = readTrips();
    const targetId = deleteTrip.__id;

    const targetIndex = currentTrips.findIndex(
      (trip, index) =>
        getTripId(trip, index) === targetId,
    );

    if (targetIndex === -1) {
      setDeleteTrip(null);
      setTrips(currentTrips);
      return;
    }

    const updatedTrips = currentTrips.filter(
      (_, index) => index !== targetIndex,
    );

    if (!writeTrips(updatedTrips)) {
      window.alert("Trip could not be deleted because browser storage is unavailable. No change was made.");
      return;
    }

    setTrips(updatedTrips);
    setDeleteTrip(null);

    setCurrentPage((page) => {
      const nextTotalPages = Math.max(
        1,
        Math.ceil(
          updatedTrips.length / ITEMS_PER_PAGE,
        ),
      );

      return Math.min(page, nextTotalPages);
    });
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const requestEdit = (trip) => {
    setSelectedTrip(null);
    setDeleteTrip(null);
    setEditTrip(trip);
  };

  const saveEditedTrip = (changes) => {
    if (!editTrip) return;

    const currentTrips = readTrips();
    const targetId = editTrip.__id;

    const targetIndex = currentTrips.findIndex(
      (trip, index) =>
        getTripId(trip, index) === targetId,
    );

    if (targetIndex === -1) {
      alert(
        "This record could not be found. Please refresh the page.",
      );

      setEditTrip(null);
      setTrips(currentTrips);
      return;
    }

    const originalTrip = currentTrips[targetIndex];

    const updatedTrip = {
      ...originalTrip,

      date: changes.date,
      vehicleNumber: changes.jcbWork ? "" : changes.vehicleNumber,
      tractorNumber: changes.jcbWork ? "" : changes.vehicleNumber,
      partyName: changes.partyName,
      materialName: changes.materialName,
      driverName: changes.jcbWork ? "" : changes.driverName,
      tripType: changes.jcbWork ? "JCB Work" : changes.tripType,
      jcbWork: changes.jcbWork,
      jcbWorkType: changes.jcbWorkType,
      jcbMachineNumber: changes.jcbMachineNumber,
      jcbOperatorName: changes.jcbOperatorName,
      jcbOperatorMobile: changes.jcbOperatorMobile,
      jcbHours: changes.jcbHours,
      jcbMinutes: changes.jcbMinutes,
      site: changes.site,
      quantity: changes.quantity,
      unit: changes.unit,
      rate: changes.rate,
      amount: changes.amount,
      notes: changes.notes,

      updatedAt: new Date().toISOString(),
    };

    const updatedTrips = [...currentTrips];

    updatedTrips[targetIndex] = updatedTrip;

    if (!writeTrips(updatedTrips)) {
      window.alert("Trip could not be saved in this browser. Your edit is still open.");
      return;
    }

    setTrips(updatedTrips);
    setEditTrip(null);
  };

  const pageStart =
    filteredTrips.length === 0
      ? 0
      : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const pageEnd = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredTrips.length,
  );

  return (
    <div className="all-records-page">
      <div className="all-records-print-header">
        <span>SAO AUTO TRACTOR</span>
        <strong>ALL TRANSPORT RECORDS</strong>
        <small>
          Generated {formatDate(getToday())}
        </small>
      </div>

      {/* =====================================================
          HERO / HEADER
      ===================================================== */}

      <header className="all-records-page-header">
        <div className="all-records-header-copy">
          <div className="all-records-title-row">
            <div className="all-records-title-icon">
              <FileText
                size={21}
                strokeWidth={2}
              />
            </div>

            <div>
              <span className="all-records-eyebrow">
                TRANSPORT / RECORDS
              </span>

              <h1>All Records</h1>
            </div>
          </div>

          <p>
            View, search, edit and manage every transport
            trip recorded in the system.
          </p>

          <div className="all-records-header-meta">
            <span>
              <Truck size={13} />
              {filteredTrips.length} matching records
            </span>

            <span>
              <CalendarDays size={13} />
              {todayCount} today
            </span>
          </div>
        </div>

        <div className="all-records-header-actions">
          <button
            type="button"
            className="all-records-secondary-button"
            onClick={refreshRecords}
          >
            <RotateCcw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="all-records-secondary-button"
            onClick={exportCSV}
            disabled={!filteredTrips.length}
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            className="all-records-primary-button"
            onClick={printRecords}
          >
            <Printer size={16} />
            Print / PDF
          </button>
        </div>
      </header>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="all-records-summary">
        <div className="all-records-summary-card">
          <div className="all-records-summary-icon">
            <Truck size={18} />
          </div>

          <div className="all-records-summary-content">
            <span>Total Records</span>
            <strong>{summary.trips}</strong>
            <small>Current filtered view</small>
          </div>
        </div>

        <div className="all-records-summary-card">
          <div className="all-records-summary-icon">
            <CalendarDays size={18} />
          </div>

          <div className="all-records-summary-content">
            <span>Today</span>
            <strong>{todayCount}</strong>
            <small>Trips recorded today</small>
          </div>
        </div>

        <div className="all-records-summary-card">
          <div className="all-records-summary-icon">
            <Package size={18} />
          </div>

          <div className="all-records-summary-content">
            <span>Total Quantity</span>

            <strong>
              {summary.quantity.toLocaleString("en-IN")}
            </strong>

            <small>Across filtered records</small>
          </div>
        </div>

        <div className="all-records-summary-card is-billing">
          <div className="all-records-summary-icon">
            <IndianRupee size={18} />
          </div>

          <div className="all-records-summary-content">
            <span>Total Billing</span>

            <strong>
              {formatCurrency(summary.amount)}
            </strong>

            <small>Current filtered billing</small>
          </div>
        </div>
      </section>

      {/* =====================================================
          FILTER WORKSPACE
      ===================================================== */}

      <section className="all-records-workspace">
        <div className="all-records-toolbar">
          <div className="all-records-toolbar-title">
            <div className="all-records-toolbar-icon">
              <Filter size={17} />
            </div>

            <div>
              <strong>Record Filters</strong>

              <span>
                Narrow your transport ledger by date,
                party, tractor or type.
              </span>
            </div>
          </div>

          <div className="all-records-toolbar-actions">
            <div className="all-records-quick-presets">
              <button
                type="button"
                className={
                  quickPreset === "today"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  applyQuickPreset("today")
                }
              >
                Today
              </button>

              <button
                type="button"
                className={
                  quickPreset === "week"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  applyQuickPreset("week")
                }
              >
                7 Days
              </button>

              <button
                type="button"
                className={
                  quickPreset === "month"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  applyQuickPreset("month")
                }
              >
                This Month
              </button>

              {quickPreset && (
                <button
                  type="button"
                  className="all-records-preset-clear"
                  onClick={() =>
                    applyQuickPreset("clear")
                  }
                  aria-label="Clear date preset"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="all-records-saved-views">
              <select
                aria-label="Saved record views"
                value={activeSavedViewId}
                onChange={(event) => applySavedView(event.target.value)}
              >
                <option value="">Saved views ({savedViews.length})</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>{view.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="all-records-secondary-button"
                onClick={saveCurrentView}
                title="Save the current filters as a named view"
              >
                <Save size={14} />
                Save view
              </button>
              {activeSavedViewId && (
                <button
                  type="button"
                  className="all-records-saved-view-delete"
                  onClick={deleteActiveSavedView}
                  aria-label="Delete selected saved view"
                  title="Delete this saved view"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {hasFilters && (
              <button
                type="button"
                className="all-records-clear-button"
                onClick={clearFilters}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="all-records-filter-grid">
          <label className="all-records-search-field">
            <span>Search records</span>

            <div className="all-records-input-wrap">
              <Search size={16} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Vehicle, party, material, driver..."
              />

              {search && (
                <button
                  type="button"
                  className="all-records-input-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </label>

          <label>
            <span>From Date</span>

            <div className="all-records-input-wrap">
              <CalendarDays size={15} />

              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
              />
            </div>
          </label>

          <label>
            <span>To Date</span>

            <div className="all-records-input-wrap">
              <CalendarDays size={15} />

              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
              />
            </div>
          </label>

          <label>
            <span>Party</span>

            <select
              value={partyFilter}
              onChange={(event) =>
                setPartyFilter(event.target.value)
              }
            >
              <option value="">All Parties</option>

              {filterOptions.parties.map((party) => (
                <option
                  key={party}
                  value={party}
                >
                  {party}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Tractor</span>

            <select
              value={tractorFilter}
              onChange={(event) =>
                setTractorFilter(event.target.value)
              }
            >
              <option value="">All Tractors</option>

              {filterOptions.tractors.map((tractor) => (
                <option
                  key={tractor}
                  value={tractor}
                >
                  {tractor}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Material</span>

            <select
              value={materialFilter}
              onChange={(event) =>
                setMaterialFilter(event.target.value)
              }
            >
              <option value="">All Materials</option>

              {filterOptions.materials.map((material) => (
                <option
                  key={material}
                  value={material}
                >
                  {material}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Trip Type</span>

            <select
              value={tripTypeFilter}
              onChange={(event) =>
                setTripTypeFilter(event.target.value)
              }
            >
              <option value="">All Types</option>

              {filterOptions.tripTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>
        {dateFrom && dateTo && dateFrom > dateTo && (
          <p className="all-records-date-range-error" role="alert">
            From date must be on or before the To date.
          </p>
        )}
      </section>

      {/* =====================================================
          BREAKDOWN
      ===================================================== */}

      <section className="all-records-breakdown">
        <div className="all-records-breakdown-item is-loading">
          <div className="all-records-breakdown-icon">
            <Truck size={15} />
          </div>

          <div>
            <span>Loading</span>
            <strong>{summary.loading}</strong>
          </div>
        </div>

        <div className="all-records-breakdown-item is-unloading">
          <div className="all-records-breakdown-icon">
            <Truck size={15} />
          </div>

          <div>
            <span>Unloading</span>
            <strong>{summary.unloading}</strong>
          </div>
        </div>

        <div className="all-records-breakdown-item is-site">
          <div className="all-records-breakdown-icon">
            <Truck size={15} />
          </div>

          <div>
            <span>Site to Site</span>
            <strong>{summary.siteToSite}</strong>
          </div>
        </div>

        <div className="all-records-breakdown-item is-billing">
          <div className="all-records-breakdown-icon">
            <IndianRupee size={15} />
          </div>

          <div>
            <span>Billing</span>

            <strong>
              {formatCurrency(summary.amount)}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <section className="all-records-table-card">
        <div className="all-records-table-header">
          <div className="all-records-table-heading">
            <span className="all-records-eyebrow">
              TRANSACTION LEDGER
            </span>

            <h2>Transport Records</h2>

            <p>
              Complete trip history with quick actions.
            </p>
          </div>

          <div className="all-records-table-header-right">
            {selectedTripIds.size > 0 && (
              <>
                <button
                  type="button"
                  className="all-records-secondary-button"
                  onClick={() => {
                    const selected = filteredTrips.filter((trip) => selectedTripIds.has(trip.__id));
                    exportCSV(selected, "selected-records");
                  }}
                >
                  <Download size={15} />
                  Export selected ({selectedTripIds.size})
                </button>
                <button
                  type="button"
                  className="all-records-bulk-delete-btn"
                  onClick={requestBulkDelete}
                >
                  <Trash2 size={15} />
                  Delete ({selectedTripIds.size})
                </button>
              </>
            )}

            <span className="all-records-result-count">
              {filteredTrips.length} records
            </span>
          </div>
        </div>

        {paginatedTrips.length === 0 ? (
          <div className="all-records-empty">
            <div className="all-records-empty-icon">
              <FileText size={24} />
            </div>

            <span className="all-records-eyebrow">
              NO MATCHES
            </span>

            <h3>No records found</h3>

            <p>
              {normalizedTrips.length === 0
                ? "No transport trips have been recorded yet."
                : "Try changing your search or filters to find matching records."}
            </p>

            {hasFilters && (
              <button
                type="button"
                className="all-records-secondary-button"
                onClick={clearFilters}
              >
                <RotateCcw size={15} />
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="all-records-table-scroll">
              <table className="all-records-table">
                <thead>
                  <tr>
                    <th className="all-records-checkbox-col">
                      <button
                        type="button"
                        className="all-records-checkbox-toggle"
                        onClick={toggleSelectAll}
                        aria-label="Toggle select all"
                      >
                        {selectedTripIds.size ===
                          paginatedTrips.length &&
                        paginatedTrips.length > 0 ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>

                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Party</th>
                    <th>Material</th>
                    <th>Trip Type</th>
                    <th>Site</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>

                    <th className="all-records-action-column">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTrips.map((trip) => (
                    <tr
                      key={`${trip.__id}-${trip.__index}`}
                      className={
                        selectedTripIds.has(trip.__id)
                          ? "selected"
                          : ""
                      }
                    >
                      <td className="all-records-checkbox-col">
                        <button
                          type="button"
                          className="all-records-checkbox-btn"
                          onClick={() =>
                            toggleSelectTrip(
                              trip.__id,
                            )
                          }
                          aria-label="Select record"
                        >
                          {selectedTripIds.has(
                            trip.__id,
                          ) ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      <td>
                        <span className="all-records-date">
                          {formatDate(trip.__date)}
                        </span>
                      </td>

                      <td>
                        <div className="all-records-vehicle">
                          <span className="all-records-vehicle-icon">
                            <Tractor size={15} />
                          </span>

                          <strong>
                            {trip.__vehicle}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <strong className="all-records-main-text">
                          {trip.__party}
                        </strong>
                      </td>

                      <td>
                        <span className="all-records-muted-text">
                          {trip.__material}
                        </span>
                      </td>

                      <td>
                        <StatusPill
                          type={trip.__tripType}
                        />
                      </td>

                      <td>
                        <span className="all-records-muted-text all-records-site">
                          {trip?.site ||
                            trip?.location ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        <span className="all-records-number">
                          {trip.__quantity}
                        </span>
                      </td>

                      <td>
                        <span className="all-records-number">
                          {formatCurrency(
                            trip.__rate,
                          )}
                        </span>
                      </td>

                      <td>
                        <strong className="all-records-amount">
                          {formatCurrency(
                            trip.__amount,
                          )}
                        </strong>
                      </td>

                      <td className="all-records-action-column">
                        <div className="all-records-row-actions">
                          <button
                            type="button"
                            className="all-records-view-button"
                            onClick={() =>
                              setSelectedTrip(trip)
                            }
                            title="View details"
                          >
                            <Eye size={15} />
                            View
                          </button>

                          <button
                            type="button"
                            className="all-records-clone-button"
                            onClick={() =>
                              cloneTrip(trip)
                            }
                            title="Clone trip"
                            aria-label="Clone trip"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            type="button"
                            className="all-records-edit-button"
                            onClick={() =>
                              requestEdit(trip)
                            }
                            title="Edit record"
                            aria-label="Edit record"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="all-records-delete-button"
                            onClick={() =>
                              requestDelete(trip)
                            }
                            title="Delete record"
                            aria-label="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* =================================================
                MOBILE
            ================================================= */}

            <div className="all-records-mobile-list">
              {paginatedTrips.map((trip) => (
                <article
                  className={`all-records-mobile-card ${
                    selectedTripIds.has(
                      trip.__id,
                    )
                      ? "selected"
                      : ""
                  }`}
                  key={`${trip.__id}-${trip.__index}`}
                >
                  <div className="all-records-mobile-top">
                    <div className="all-records-mobile-select">
                      <button
                        type="button"
                        className="all-records-checkbox-btn"
                        onClick={() =>
                          toggleSelectTrip(
                            trip.__id,
                          )
                        }
                        aria-label="Select record"
                      >
                        {selectedTripIds.has(
                          trip.__id,
                        ) ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <div>
                        <span>
                          {formatDate(trip.__date)}
                        </span>

                        <strong>
                          {trip.__vehicle}
                        </strong>
                      </div>
                    </div>

                    <StatusPill
                      type={trip.__tripType}
                    />
                  </div>

                  <div className="all-records-mobile-main">
                    <strong>{trip.__party}</strong>

                    <span>
                      {trip.__material}
                    </span>
                  </div>

                  <div className="all-records-mobile-meta">
                    <div>
                      <span>Site</span>

                      <strong>
                        {trip?.site ||
                          trip?.location ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Qty</span>

                      <strong>
                        {trip.__quantity}
                      </strong>
                    </div>

                    <div>
                      <span>Amount</span>

                      <strong>
                        {formatCurrency(
                          trip.__amount,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="all-records-mobile-actions">
                    <button
                      type="button"
                      className="all-records-mobile-view"
                      onClick={() =>
                        setSelectedTrip(trip)
                      }
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      className="all-records-mobile-edit"
                      onClick={() =>
                        requestEdit(trip)
                      }
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="all-records-mobile-delete"
                      onClick={() =>
                        requestDelete(trip)
                      }
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            <div className="all-records-pagination">
              <span>
                Showing{" "}
                <strong>{pageStart}</strong>
                {" – "}
                <strong>{pageEnd}</strong>
                {" of "}
                <strong>{filteredTrips.length}</strong>
              </span>

              <div className="all-records-pagination-controls">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage(
                      (page) => page - 1,
                    )
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                <strong>
                  {currentPage} / {totalPages}
                </strong>

                <button
                  type="button"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) => page + 1,
                    )
                  }
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* =====================================================
          MODALS
      ===================================================== */}

      {selectedTrip && (
        <DetailModal
          trip={selectedTrip}
          onClose={() =>
            setSelectedTrip(null)
          }
          onDelete={requestDelete}
          onEdit={requestEdit}
          onClone={cloneTrip}
        />
      )}

      {editTrip && (
        <EditModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={saveEditedTrip}
        />
      )}

      {deleteTrip && (
        <DeleteConfirmModal
          trip={deleteTrip}
          onCancel={() =>
            setDeleteTrip(null)
          }
          onConfirm={confirmDelete}
        />
      )}

      {bulkDeleteTrips &&
        bulkDeleteTrips.size > 0 && (
          <BulkDeleteConfirmModal
            count={bulkDeleteTrips.size}
            onCancel={() =>
              setBulkDeleteTrips(null)
            }
            onConfirm={confirmBulkDelete}
          />
        )}

      {lastBulkDelete && (
        <div className="all-records-undo-toast" role="status" aria-live="polite">
          <span>{lastBulkDelete.count} trip{lastBulkDelete.count === 1 ? "" : "s"} removed.</span>
          <button type="button" onClick={undoBulkDelete}>Undo</button>
        </div>
      )}
    </div>
  );
}

export default AllRecords;
