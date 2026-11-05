import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  CheckCircle2,
  Eye,
  FileDown,
  FileText,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  Save,
  Tractor,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { useAppData } from "../../context/AppDataContext";
import { STORAGE_KEYS } from "../../data/storageKeys";
import {
  readStorage,
  writeStorage,
} from "../../data/storage";
import { generateId } from "../../utils/id";
import {
  getTodayISO,
  formatDate,
} from "../../utils/date";
import { calculateTripAmount } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import { emitDataChange } from "../../data/dataEvents";

import "./AddTrip.css";

const DEFAULT_UNIT = "Trip";
const RETAIN_FIELDS_KEY = "saoAutoTractorTripEntryPreferences";
const PREFERRED_TRACTOR_KEY = "saoAutoTractorPreferredTripTractor";
const PREFERRED_JCB_RATE_KEY = "saoAutoTractorPreferredJcbHourlyRate";
const JCB_WORK_TYPES = [
  { value: "", label: "Select work type (optional)" },
  { value: "Excavation", label: "Excavation" },
  { value: "Earth moving", label: "Earth moving" },
  { value: "Site preparation", label: "Site preparation" },
  { value: "Land levelling", label: "Land levelling" },
  { value: "Demolition", label: "Demolition" },
  { value: "Other", label: "Other" },
];
const DEFAULT_RETAIN_FIELDS = {
  tractor: true,
  party: false,
  material: false,
  tripType: false,
  site: false,
  unit: false,
  jcbWorkType: false,
  jcbMachine: false,
  jcbOperator: false,
};
const RETAIN_FIELD_OPTIONS = [
  { key: "tractor", label: "Tractor" },
  { key: "party", label: "Party" },
  { key: "material", label: "Material" },
  { key: "tripType", label: "Trip type" },
  { key: "site", label: "Site" },
  { key: "unit", label: "Unit" },
  { key: "jcbWorkType", label: "JCB work" },
  { key: "jcbMachine", label: "JCB machine" },
  { key: "jcbOperator", label: "Operator" },
];

const TRIP_TYPES = [
  {
    value: "Loading",
    label: "Loading",
    icon: ArrowUpFromLine,
  },
  {
    value: "Unloading",
    label: "Unloading",
    icon: ArrowDownToLine,
  },
  {
    value: "Site to Site",
    label: "Site to Site",
    icon: Truck,
  },
];

const EMPTY_FORM = {
  date: getTodayISO(),
  tractorId: "",
  vehicleNumber: "",
  tractorName: "",
  driverName: "",
  driverMobile: "",
  partyId: "",
  partyName: "",
  materialId: "",
  materialName: "",
  tripType: "Loading",
  jcbWorkType: "",
  jcbMachineNumber: "",
  jcbOperatorName: "",
  jcbOperatorMobile: "",
  jcbHours: "",
  jcbMinutes: "0",
  site: "",
  quantity: "",
  unit: DEFAULT_UNIT,
  rate: "",
  notes: "",
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getId(item) {
  return item?.id || item?._id || "";
}

function getVehicle(item) {
  return (
    item?.vehicleNumber ||
    item?.vehicleNo ||
    item?.tractorNumber ||
    item?.registrationNumber ||
    ""
  );
}

function getMaterialName(item) {
  return (
    item?.name ||
    item?.materialName ||
    item?.material ||
    ""
  );
}

function getPartyName(item) {
  return (
    item?.partyName ||
    item?.name ||
    item?.customerName ||
    ""
  );
}

function isActive(item) {
  if (item?.active === false) return false;
  if (item?.isActive === false) return false;

  if (
    String(item?.status || "")
      .trim()
      .toLowerCase() === "inactive"
  ) {
    return false;
  }

  return true;
}

function loadRetainFields() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(RETAIN_FIELDS_KEY) || "{}",
    );

    return Object.fromEntries(
      Object.keys(DEFAULT_RETAIN_FIELDS).map((key) => [
        key,
        typeof saved?.[key] === "boolean"
          ? saved[key]
          : DEFAULT_RETAIN_FIELDS[key],
      ]),
    );
  } catch {
    return { ...DEFAULT_RETAIN_FIELDS };
  }
}

function readPreferredTractorId() {
  try {
    const stored = localStorage.getItem(PREFERRED_TRACTOR_KEY);
    if (!stored) return "";
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  } catch {
    return "";
  }
}

/* =========================================================
   SEARCH BOX
========================================================= */

function SearchBox({
  inputId,
  icon: Icon,
  placeholder,
  value,
  onChange,
  items,
  onSelect,
  getLabel,
  emptyText,
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = normalize(value);

    if (!query) {
      return items.slice(0, 8);
    }

    return items
      .filter((item) =>
        normalize(getLabel(item)).includes(query)
      )
      .slice(0, 8);
  }, [items, value, getLabel]);

  return (
    <div className="add-trip-search">
      <div className="add-trip-input-wrap">
        <Icon
          size={18}
          aria-hidden="true"
        />

        <input
          id={inputId}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setOpen(true);
            onChange(event.target.value);
          }}
        />

        {value && (
          <button
            type="button"
            className="add-trip-clear"
            aria-label={`Clear ${placeholder}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <X
              size={15}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {open && (
        <>
          <button
            type="button"
            className="add-trip-search-overlay"
            aria-label="Close search"
            onClick={() => setOpen(false)}
          />

          <div
            className="add-trip-search-menu"
            role="listbox"
          >
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <button
                  type="button"
                  key={
                    getId(item) ||
                    getLabel(item)
                  }
                  className="add-trip-search-option"
                  role="option"
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <div className="add-trip-option-icon">
                    <Icon
                      size={16}
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <strong>
                      {getLabel(item)}
                    </strong>

                    {item?.driverName && (
                      <small>
                        {item.driverName}
                      </small>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="add-trip-search-empty">
                {emptyText}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   PREVIEW FIELD
========================================================= */

function PreviewField({
  label,
  value,
  mono = false,
}) {
  return (
    <div
      className={`trip-preview-field${
        mono ? " mono" : ""
      }`}
    >
      <span>{label}</span>

      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}

/* =========================================================
   TRIP PREVIEW
========================================================= */

function TripPreview({
  trip,
  onClose,
  onPrint,
  onPdf,
  title = "Trip Preview",
}) {
  if (!trip) return null;

  const quantity =
    Number(trip.quantity) || 0;

  const rate =
    Number(trip.rate) || 0;

  const amount =
    Number(trip.amount) ||
    calculateTripAmount({
      quantity,
      rate,
    }) ||
    0;

  const vehicle =
    trip.vehicleNumber ||
    trip.vehicleNo ||
    trip.tractorNumber ||
    "—";

  const material =
    trip.materialName ||
    (trip.jcbWork ? trip.jcbWorkType : "") ||
    trip.material ||
    (trip.jcbWork ? "JCB Working Hours" : "Transport Trip");

  const site =
    trip.site ||
    trip.location ||
    "—";

  return (
    <div
      className="trip-preview-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="trip-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-preview-title"
      >
        <header className="trip-preview-header">
          <div>
            <span className="trip-preview-eyebrow">
              TRANSPORT MANAGEMENT
            </span>

            <h2 id="trip-preview-title">
              {title}
            </h2>

            <p>
              Review the trip before printing
              or saving it as PDF.
            </p>
          </div>

          <button
            type="button"
            className="trip-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X
              size={18}
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="trip-preview-body">
          <div className="trip-preview-document">
            <div className="trip-preview-document-top">
              <div>
                <span>TRIP RECORD</span>

                <strong>
                  {trip.jcbWork ? "JCB Work" : trip.tripType ||
                    "Transport Trip"}
                </strong>
              </div>

              <div className="trip-preview-amount">
                <span>Total Amount</span>

                <strong>
                  {formatCurrency(amount)}
                </strong>
              </div>
            </div>

            <div className="trip-preview-grid trip-preview-grid-four">
              <PreviewField
                label="Trip Date"
                value={
                  trip.date
                    ? formatDate(trip.date)
                    : "—"
                }
              />

              <PreviewField
                label={trip.jcbWork ? "JCB Work" : "Trip Type"}
                value={trip.jcbWork ? trip.jcbWorkType || "JCB Working Hours" : trip.tripType}
              />

              <PreviewField
                label={trip.jcbWork ? "JCB Machine" : "Vehicle"}
                value={trip.jcbWork ? trip.jcbMachineNumber || "Not specified" : vehicle}
                mono
              />

              <PreviewField
                label={trip.jcbWork ? "Operator" : "Driver"}
                value={trip.jcbWork ? trip.jcbOperatorName : trip.driverName}
              />
            </div>

            <div className="trip-preview-section">
              <div className="trip-preview-section-title">
                Party & Material
              </div>

              <div className="trip-preview-grid">
                <PreviewField
                  label="Party / Customer"
                  value={trip.partyName}
                />

                <PreviewField
                  label={trip.jcbWork ? "Work / Material" : "Material"}
                  value={trip.jcbWork ? trip.materialName || trip.jcbWorkType || "—" : material}
                />

                <PreviewField
                  label="Site / Location"
                  value={site}
                />

                <PreviewField
                  label={trip.jcbWork ? "Operator Mobile" : "Driver Mobile"}
                  value={trip.jcbWork ? trip.jcbOperatorMobile : trip.driverMobile}
                  mono
                />
              </div>
            </div>

            <div className="trip-preview-section">
              <div className="trip-preview-section-title">
                Quantity & Billing
              </div>

              <div className="trip-preview-billing">
                <div>
                  <span>{trip.jcbWork ? "Working time" : "Quantity"}</span>

                  <strong>
                    {trip.jcbWork ? `${trip.jcbHours || 0} hr ${trip.jcbMinutes || 0} min` : quantity}
                  </strong>
                </div>

                <div>
                  <span>Unit</span>

                  <strong>
                    {trip.unit ||
                      DEFAULT_UNIT}
                  </strong>
                </div>

                <div>
                  <span>{trip.jcbWork ? "Rate / hour" : "Rate"}</span>

                  <strong>
                    {formatCurrency(rate)}
                  </strong>
                </div>

                <div className="total">
                  <span>Total</span>

                  <strong>
                    {formatCurrency(amount)}
                  </strong>
                </div>
              </div>
            </div>

            {trip.notes && (
              <div className="trip-preview-section">
                <div className="trip-preview-section-title">
                  Notes
                </div>

                <div className="trip-preview-notes">
                  {trip.notes}
                </div>
              </div>
            )}

            <div className="trip-preview-signatures">
              <div>
                <span />
                <small>
                  Driver Signature
                </small>
              </div>

              <div>
                <span />
                <small>
                  Authorized Signature
                </small>
              </div>
            </div>
          </div>
        </div>

        <footer className="trip-preview-footer">
          <button
            type="button"
            className="trip-preview-secondary"
            onClick={onClose}
          >
            <X
              size={16}
              aria-hidden="true"
            />
            Close
          </button>

          <div className="trip-preview-footer-actions">
            <button
              type="button"
              className="trip-preview-secondary"
              onClick={onPrint}
            >
              <Printer
                size={16}
                aria-hidden="true"
              />
              Print
            </button>

            <button
              type="button"
              className="trip-preview-primary"
              onClick={onPdf}
            >
              <FileDown
                size={16}
                aria-hidden="true"
              />
              Save PDF
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

/* =========================================================
   ADD TRIP
========================================================= */

export default function AddTrip({ initialTractor = null, initialMaterial = null, onNavigate = () => {} }) {
  const {
    tractors = [],
    parties = [],
    materials = [],
    trips = [],
    settings = {},
    refreshData,
  } = useAppData();

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: getTodayISO(),
    unit:
      settings?.defaultUnit ||
      DEFAULT_UNIT,
    tripType:
      settings?.defaultTripType ||
      "Loading",
  });

  const [editingId, setEditingId] =
    useState("");

  const [errors, setErrors] =
    useState({});

  const [saving, setSaving] =
    useState(false);

  const [retainFields, setRetainFields] =
    useState(loadRetainFields);

  const [duplicateTrip, setDuplicateTrip] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [previewTrip, setPreviewTrip] =
    useState(null);

  const [previewTitle, setPreviewTitle] =
    useState("Trip Preview");

  const [tractorPickerOpen, setTractorPickerOpen] =
    useState(false);
  const [lastSavedTripId, setLastSavedTripId] = useState("");

  const appliedInitialTractorRef = useRef("");
  const appliedInitialMaterialRef = useRef("");

  const [templates, setTemplates] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            "saoAutoTractorTripTemplates"
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

  /* =======================================================
     TEMPLATES
  ======================================================= */

  const saveTemplates = (
    newTemplates
  ) => {
    setTemplates(newTemplates);

    localStorage.setItem(
      "saoAutoTractorTripTemplates",
      JSON.stringify(newTemplates)
    );
  };

  const saveCurrentAsTemplate =
    () => {
      const partyName =
        form.partyName.trim();

      const materialName =
        form.materialName.trim();

      const quantity =
        form.quantity;

      const rate =
        form.rate;

      const unit =
        form.unit;

      const tripType =
        form.tripType;

      if (
        !partyName &&
        !materialName &&
        !quantity &&
        !rate
      ) {
        setMessage(
          "Please fill at least Party, Material, Quantity or Rate to save as template."
        );

        return;
      }

      const templateName =
        prompt(
          "Enter template name (e.g., Sand Delivery):",
          `${materialName || "Trip"} - ${
            partyName || "Party"
          }`
        );

      if (
        !templateName ||
        templateName.trim() === ""
      ) {
        return;
      }

      const newTemplate = {
        id: Date.now().toString(),
        name: templateName.trim(),
        partyName,
        materialName,
        quantity,
        rate,
        unit,
        tripType,
        jcbWorkType: form.jcbWorkType,
        jcbMachineNumber: form.jcbMachineNumber,
        jcbOperatorName: form.jcbOperatorName,
        jcbOperatorMobile: form.jcbOperatorMobile,
        jcbHours: form.jcbHours,
        jcbMinutes: form.jcbMinutes,
        notes: form.notes,
      };

      saveTemplates([
        newTemplate,
        ...templates,
      ]);

      setMessage(
        `Template "${newTemplate.name}" saved successfully!`
      );
    };

  const applyTemplate = (
    template
  ) => {
    setForm((previous) => ({
      ...previous,

      partyName:
        template.partyName || "",

      materialName:
        template.materialName || "",

      quantity:
        template.quantity || "",

      rate:
        template.rate || "",

      unit:
        template.unit ||
        previous.unit,

      tripType:
        template.tripType ||
        previous.tripType,

      jcbWorkType: template.jcbWorkType || "",
      jcbMachineNumber: template.jcbMachineNumber || "",
      jcbOperatorName: template.jcbOperatorName || "",
      jcbOperatorMobile: template.jcbOperatorMobile || "",
      jcbHours: template.jcbHours || "",
      jcbMinutes: template.jcbMinutes ?? "0",

      notes:
        template.notes || "",
    }));

    setMessage(
      `Template "${template.name}" applied.`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const applyRecentTrip = (trip) => {
    const savedVehicle =
      trip?.vehicleNumber ||
      trip?.vehicleNo ||
      trip?.tractorNumber ||
      "";
    const savedPartyName =
      trip?.partyName || trip?.party || "";
    const savedMaterialName =
      trip?.materialName || trip?.material || "";
    const savedQuantity = trip?.quantity ?? trip?.qty ?? "";
    const savedRate = trip?.rate ?? trip?.price ?? "";

    const tractor = activeTractors.find(
      (item) =>
        (trip?.tractorId && getId(item) === trip.tractorId) ||
        normalize(getVehicle(item)) === normalize(savedVehicle),
    );
    const party = activeParties.find(
      (item) =>
        (trip?.partyId && getId(item) === trip.partyId) ||
        normalize(getPartyName(item)) === normalize(savedPartyName),
    );
    const material = activeMaterials.find(
      (item) =>
        (trip?.materialId && getId(item) === trip.materialId) ||
        normalize(getMaterialName(item)) === normalize(savedMaterialName),
    );

    setForm((previous) => ({
      ...previous,
      date: getTodayISO(),
      tractorId: tractor ? getId(tractor) : "",
      vehicleNumber: tractor ? getVehicle(tractor) : "",
      tractorName:
        tractor?.tractorName || tractor?.name || "",
      driverName: tractor?.driverName || "",
      driverMobile: tractor?.driverMobile || "",
      partyId: party ? getId(party) : "",
      partyName: party ? getPartyName(party) : savedPartyName,
      materialId: material ? getId(material) : "",
      materialName: material ? getMaterialName(material) : savedMaterialName,
      tripType: trip?.tripType || previous.tripType,
      jcbWorkType: trip?.jcbWorkType || "",
      jcbMachineNumber: trip?.jcbMachineNumber || "",
      jcbOperatorName: trip?.jcbOperatorName || "",
      jcbOperatorMobile: trip?.jcbOperatorMobile || "",
      jcbHours: trip?.jcbHours == null ? "" : String(trip.jcbHours),
      jcbMinutes: trip?.jcbMinutes == null ? "0" : String(trip.jcbMinutes),
      site: trip?.site || trip?.location || "",
      quantity: String(savedQuantity),
      unit: trip?.unit || previous.unit,
      rate: String(savedRate),
      notes: trip?.notes || "",
    }));

    setEditingId("");
    setErrors({});
    setMessage(
      `Entry copied. Date is set to today; review the work time and rate before saving${!tractor && savedVehicle ? ". The old tractor is unavailable; choose an active tractor" : ""}.`,
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteTemplate = (
    id
  ) => {
    saveTemplates(
      templates.filter(
        (template) =>
          template.id !== id
      )
    );
  };

  /* =======================================================
     ACTIVE DATA
  ======================================================= */

  const activeTractors =
    useMemo(
      () =>
        Array.isArray(tractors)
          ? tractors.filter(isActive)
          : [],
      [tractors]
    );

  const activeParties =
    useMemo(
      () =>
        Array.isArray(parties)
          ? parties.filter(isActive)
          : [],
      [parties]
    );

  const activeMaterials =
    useMemo(
      () =>
        Array.isArray(materials)
          ? materials.filter(isActive)
          : [],
      [materials]
    );

  const isJcbWork = form.tripType === "JCB Work";
  const preferredJcbRate = (() => {
    try {
      return localStorage.getItem(PREFERRED_JCB_RATE_KEY) || "";
    } catch {
      return "";
    }
  })();

  const amount = useMemo(
    () =>
      calculateTripAmount({
        quantity: isJcbWork
          ? (Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) / 60
          : form.quantity,
        rate: form.rate,
      }),
    [
      form.quantity,
      form.rate,
      form.jcbHours,
      form.jcbMinutes,
      isJcbWork,
    ]
  );

  const recentTrips =
    useMemo(() => {
      const safeTrips =
        Array.isArray(trips)
          ? [...trips]
          : [];

      return safeTrips
        .sort((a, b) => {
          const dateA =
            new Date(
              a?.createdAt ||
                a?.date ||
                0
            ).getTime();

          const dateB =
            new Date(
              b?.createdAt ||
                b?.date ||
                0
            ).getTime();

          return dateB - dateA;
        })
        .slice(0, 6);
    }, [trips]);

  /* =======================================================
     EDIT EVENT
  ======================================================= */

  useEffect(() => {
    const handleEdit = (
      event
    ) => {
      const record =
        event?.detail;

      if (!record) return;

      setEditingId(
        record.id || ""
      );

      setForm({
        date:
          record.date ||
          getTodayISO(),

        tractorId:
          record.tractorId ||
          "",

        vehicleNumber:
          record.vehicleNumber ||
          record.vehicleNo ||
          record.tractorNumber ||
          "",

        tractorName:
          record.tractorName ||
          "",

        driverName:
          record.driverName ||
          "",

        driverMobile:
          record.driverMobile ||
          "",

        partyId:
          record.partyId ||
          "",

        partyName:
          record.partyName ||
          "",

        materialId:
          record.materialId ||
          "",

        materialName:
          record.materialName ||
          record.material ||
          "",

        tripType:
          record.tripType ||
          "Loading",

        jcbWorkType: record.jcbWorkType || "",
        jcbMachineNumber: record.jcbMachineNumber || "",
        jcbOperatorName: record.jcbOperatorName || "",
        jcbOperatorMobile: record.jcbOperatorMobile || "",
        jcbHours: record.jcbHours == null ? "" : String(record.jcbHours),
        jcbMinutes: record.jcbMinutes == null ? "0" : String(record.jcbMinutes),

        site:
          record.site ||
          record.location ||
          "",

        quantity:
          record.quantity ===
            undefined ||
          record.quantity === null
            ? ""
            : String(
                record.quantity
              ),

        unit:
          record.unit ||
          DEFAULT_UNIT,

        rate:
          record.rate ===
            undefined ||
          record.rate === null
            ? ""
            : String(record.rate),

        notes:
          record.notes || "",
      });

      setErrors({});
      setTractorPickerOpen(false);
      setMessage(
        "Trip loaded for editing."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

    window.addEventListener(
      "saoAutoTractorEditTrip",
      handleEdit
    );

    return () => {
      window.removeEventListener(
        "saoAutoTractorEditTrip",
        handleEdit
      );
    };
  }, []);

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  const update = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next[field];

      return next;
    });

    setMessage("");
    setLastSavedTripId("");
  };

  const updateRetainField = (field, checked) => {
    const next = {
      ...retainFields,
      [field]: checked,
    };

    setRetainFields(next);

    try {
      localStorage.setItem(
        RETAIN_FIELDS_KEY,
        JSON.stringify(next),
      );
      setMessage("");
    } catch {
      setMessage("This preference could not be saved in this browser.");
    }
  };

  const initialTractorId = getId(initialTractor);
  const initialMaterialId = getId(initialMaterial);

  const selectTractor = (
    tractor
  ) => {
    try {
      localStorage.setItem(PREFERRED_TRACTOR_KEY, JSON.stringify(getId(tractor)));
    } catch {}

    setForm((previous) => ({
      ...previous,

      tractorId:
        getId(tractor),

      vehicleNumber:
        getVehicle(tractor),

      tractorName:
        tractor?.tractorName ||
        tractor?.name ||
        "",

      driverName:
        tractor?.driverName ||
        "",

      driverMobile:
        tractor?.driverMobile ||
        "",
    }));

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next.vehicleNumber;
      delete next.tractor;
      delete next.driver;

      return next;
    });

    setMessage("");
    setTractorPickerOpen(false);
  };

  const changeTripMode = (nextMode) => {
    setLastSavedTripId("");
    setErrors({});
    setMessage("");

    if (nextMode === "jcb") {
      const lastJcbRate = preferredJcbRate || String(
        trips.find((trip) => trip?.jcbWork || trip?.tripType === "JCB Work")?.rate || "",
      );
      setForm((previous) => ({
        ...previous,
        tripType: "JCB Work",
        tractorId: "",
        vehicleNumber: "",
        tractorName: "",
        driverName: "",
        driverMobile: "",
        quantity: "",
        unit: "hour",
        rate: previous.tripType === "JCB Work" ? previous.rate : lastJcbRate,
        jcbHours: previous.tripType === "JCB Work" ? previous.jcbHours : "",
        jcbMinutes: previous.tripType === "JCB Work" ? previous.jcbMinutes : "0",
      }));
      setTractorPickerOpen(false);
      return;
    }

    const preferredId = readPreferredTractorId();
    const preferredTractor = activeTractors.find((tractor) => getId(tractor) === preferredId) || null;
    setForm((previous) => ({
      ...previous,
      tripType: settings?.defaultTripType && settings.defaultTripType !== "JCB Work" ? settings.defaultTripType : "Loading",
      tractorId: preferredTractor ? getId(preferredTractor) : "",
      vehicleNumber: preferredTractor ? getVehicle(preferredTractor) : "",
      tractorName: preferredTractor?.tractorName || preferredTractor?.name || "",
      driverName: preferredTractor?.driverName || "",
      driverMobile: preferredTractor?.driverMobile || "",
      quantity: "",
      unit: settings?.defaultUnit || DEFAULT_UNIT,
      rate: "",
      jcbHours: "",
      jcbMinutes: "0",
    }));
    setTractorPickerOpen(!preferredTractor);
  };

  useEffect(() => {
    if (
      !activeTractors.length ||
      initialTractorId ||
      form.tractorId ||
      form.tripType === "JCB Work" ||
      editingId
    ) {
      return;
    }

    const preferredId = readPreferredTractorId();

    if (!preferredId) {
      setTractorPickerOpen(true);
      return;
    }

    const preferredTractor = activeTractors.find(
      (tractor) => getId(tractor) === preferredId,
    );
    if (!preferredTractor) {
      try { localStorage.removeItem(PREFERRED_TRACTOR_KEY); } catch {}
      setTractorPickerOpen(true);
      setMessage("Your previously selected tractor is no longer active. Choose a tractor to continue.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      tractorId: getId(preferredTractor),
      vehicleNumber: getVehicle(preferredTractor),
      tractorName: preferredTractor?.tractorName || preferredTractor?.name || "",
      driverName: preferredTractor?.driverName || "",
      driverMobile: preferredTractor?.driverMobile || "",
    }));
    setTractorPickerOpen(false);
  }, [activeTractors, editingId, form.tractorId, initialTractorId]);

  const changeTractor = () => {
    const hasUnsavedTripDetails = Boolean(
      form.partyName.trim() || form.materialName.trim() || form.site.trim() ||
      form.quantity !== "" || form.rate !== "" || form.notes.trim() ||
      form.date !== getTodayISO()
    );
    if (hasUnsavedTripDetails && !window.confirm("Change tractor for this trip? Your other entered trip details will stay in the form.")) {
      return;
    }
    try {
      localStorage.removeItem(PREFERRED_TRACTOR_KEY);
    } catch {
      // The selection can still be changed for the current form.
    }
    setForm((previous) => ({
      ...previous,
      tractorId: "",
      vehicleNumber: "",
      tractorName: "",
      driverName: "",
      driverMobile: "",
    }));
    setTractorPickerOpen(true);
    setMessage("Choose the tractor for this and your next trips.");
  };

  useEffect(() => {
    if (
      !initialTractorId ||
      appliedInitialTractorRef.current === initialTractorId
    ) {
      return;
    }

    appliedInitialTractorRef.current = initialTractorId;

    const availableTractor = activeTractors.find(
      (tractor) => getId(tractor) === initialTractorId,
    );

    if (!availableTractor) {
      setMessage("That tractor is no longer active. Choose an active tractor.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      tractorId: getId(availableTractor),
      vehicleNumber: getVehicle(availableTractor),
      tractorName: availableTractor?.tractorName || availableTractor?.name || "",
      driverName: availableTractor?.driverName || "",
      driverMobile: availableTractor?.driverMobile || "",
    }));
    try {
      localStorage.setItem(PREFERRED_TRACTOR_KEY, JSON.stringify(getId(availableTractor)));
    } catch {}
    setTractorPickerOpen(false);
  }, [initialTractorId, activeTractors]);

  const selectParty = (
    party
  ) => {
    setForm((previous) => ({
      ...previous,

      partyId:
        getId(party),

      partyName:
        getPartyName(party),
    }));

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next.party;
      delete next.partyName;

      return next;
    });

    setMessage("");
  };

  const selectMaterial = (
    material
  ) => {
    const defaultRate = material?.defaultRate ?? material?.rate;

    setForm((previous) => ({
      ...previous,

      materialId:
        getId(material),

      materialName:
        getMaterialName(material),

      unit:
        material?.unit ||
        previous.unit,

      rate:
        defaultRate !== undefined && defaultRate !== null
          ? String(defaultRate)
          : previous.rate,
    }));

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next.material;
      delete next.materialName;
      delete next.rate;

      return next;
    });

    setMessage("");
  };

  useEffect(() => {
    if (!initialMaterialId || editingId || appliedInitialMaterialRef.current === initialMaterialId) {
      return;
    }

    appliedInitialMaterialRef.current = initialMaterialId;
    const availableMaterial = activeMaterials.find(
      (material) => getId(material) === initialMaterialId,
    );

    if (availableMaterial) {
      selectMaterial(availableMaterial);
      return;
    }

    setMessage("That material is no longer active. Choose an active material to continue.");
  }, [activeMaterials, editingId, initialMaterialId]);

  const validate = () => {
    const nextErrors = {};

    if (!form.date) {
      nextErrors.date =
        "Date is required.";
    }

    if (
      !isJcbWork &&
      !form.vehicleNumber?.trim()
    ) {
      nextErrors.vehicleNumber =
        "Vehicle is required.";
    }

    if (!form.tripType) {
      nextErrors.tripType =
        "Trip type is required.";
    }

    const quantity = isJcbWork
      ? (Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) / 60
      : Number(form.quantity);

    if (
      (!isJcbWork && form.quantity === "") ||
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0
    ) {
      nextErrors.quantity = isJcbWork
        ? "Enter JCB working time above 0."
        : "Quantity must be greater than 0.";
    }

    if (isJcbWork && (!Number.isInteger(Number(form.jcbHours) || 0) || (form.jcbHours === "" && (Number(form.jcbMinutes) || 0) === 0))) {
      nextErrors.jcbHours = "Enter the JCB hours and minutes.";
    }
    if (isJcbWork && (!Number.isInteger(Number(form.jcbMinutes) || 0) || Number(form.jcbMinutes) < 0 || Number(form.jcbMinutes) > 59)) {
      nextErrors.jcbMinutes = "Minutes must be a whole number from 0 to 59.";
    }

    const rate =
      Number(form.rate);

    if (
      form.rate === "" ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      (isJcbWork && rate <= 0)
    ) {
      nextErrors.rate = form.rate === "" || (isJcbWork && rate <= 0)
        ? (isJcbWork ? "Enter an hourly rate above ₹0." : "Rate is required.")
        : "Rate cannot be negative.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors)
        .length === 0
    );
  };

  const resetForm = () => {
    const preferredId = readPreferredTractorId();
    const preferredTractor = activeTractors.find(
      (tractor) => getId(tractor) === preferredId,
    ) || activeTractors.find(
      (tractor) => getId(tractor) === form.tractorId,
    ) || null;
    setForm({
      ...EMPTY_FORM,

      date: getTodayISO(),
      tractorId: preferredTractor ? getId(preferredTractor) : "",
      vehicleNumber: preferredTractor ? getVehicle(preferredTractor) : "",
      tractorName: preferredTractor?.tractorName || preferredTractor?.name || "",
      driverName: preferredTractor?.driverName || "",
      driverMobile: preferredTractor?.driverMobile || "",

      unit:
        settings?.defaultUnit ||
        DEFAULT_UNIT,

      tripType:
        settings?.defaultTripType ||
        "Loading",
    });

    setEditingId("");
    setLastSavedTripId("");
    setTractorPickerOpen(!preferredTractor);
    setErrors({});
    setMessage("");
  };

  /* =======================================================
     PREVIEW
  ======================================================= */

  const buildFormPreviewTrip =
    () => ({
      id: editingId || "",

      date: form.date,

      tractorId:
        form.tractorId,

      vehicleNumber:
        form.vehicleNumber.trim(),

      tractorNumber:
        form.vehicleNumber.trim(),

      tractorName:
        form.tractorName.trim(),

      driverName:
        form.driverName.trim(),

      driverMobile:
        form.driverMobile.trim(),

      partyId:
        form.partyId,

      partyName:
        form.partyName.trim(),

      materialId:
        form.materialId,

      materialName:
        form.materialName.trim(),

      material:
        form.materialName.trim(),

      tripType:
        form.tripType,

      jcbWork: isJcbWork,
      jcbWorkType: form.jcbWorkType,
      jcbMachineNumber: isJcbWork ? form.jcbMachineNumber.trim() : "",
      jcbOperatorName: isJcbWork ? form.jcbOperatorName.trim() : "",
      jcbOperatorMobile: isJcbWork ? form.jcbOperatorMobile.trim() : "",
      jcbHours: isJcbWork ? Number(form.jcbHours) || 0 : undefined,
      jcbMinutes: isJcbWork ? Number(form.jcbMinutes) || 0 : undefined,
      description: isJcbWork
        ? form.materialName.trim() || form.jcbWorkType || "JCB Working Hours"
        : form.materialName.trim(),

      site:
        form.site.trim(),

      location:
        form.site.trim(),

      quantity: isJcbWork
        ? Number(((Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) / 60).toFixed(4))
        : Number(form.quantity) || 0,

      unit:
        (isJcbWork ? "hour" : form.unit.trim()) ||
        DEFAULT_UNIT,

      rate:
        Number(form.rate) || 0,

      amount:
        Number(amount) || 0,

      notes:
        form.notes.trim(),
    });

  const openCurrentPreview =
    () => {
      setPreviewTitle(
        editingId
          ? "Edit Trip Preview"
          : "Trip Preview"
      );

      setPreviewTrip(
        buildFormPreviewTrip()
      );
    };

  const openRecentPreview =
    (trip) => {
      setPreviewTitle(
        "Trip Preview"
      );

      setPreviewTrip(trip);
    };

  const closePreview = () => {
    setPreviewTrip(null);
  };

  /* =======================================================
     SAVE TRIP
  ======================================================= */

  const saveTrip = async (
    event,
    forceSave = false,
  ) => {
    event?.preventDefault?.();

    if (saving) return;

    setLastSavedTripId("");

    if (!validate()) {
      setMessage(
        "Please fill all required fields."
      );

      return;
    }

    if (
      !forceSave &&
      !editingId &&
      settings?.duplicateWarning !== false
    ) {
      const storedTrips = readStorage(
        STORAGE_KEYS.trips,
        [],
      );
      const duplicate = Array.isArray(storedTrips)
        ? storedTrips.find((existing) => {
            const existingDate = existing?.date || "";
            const existingVehicle =
              existing?.vehicleNumber ||
              existing?.vehicleNo ||
              existing?.tractorNumber ||
              "";
            const existingParty =
              existing?.partyName || existing?.party || "";
            const existingMaterial =
              existing?.materialName || existing?.material || "";
            const existingRate = existing?.rate ?? existing?.price;

            return (
              normalize(existingDate) === normalize(form.date) &&
              normalize(existingVehicle) === normalize(form.vehicleNumber) &&
              normalize(existingParty) === normalize(form.partyName) &&
              normalize(existingMaterial) === normalize(form.materialName) &&
              normalize(existing?.tripType || existing?.type) === normalize(form.tripType) &&
              Number(existing?.quantity ?? existing?.qty) === Number(form.quantity) &&
              existingRate != null &&
              Number(existingRate) === Number(form.rate)
            );
          })
        : null;

      if (duplicate) {
        setDuplicateTrip(duplicate);
        return;
      }
    }

    setSaving(true);
    setMessage("");

    try {
      const now =
        new Date().toISOString();

      const storedTrips =
        readStorage(
          STORAGE_KEYS.trips,
          []
        );

      const currentTrips =
        Array.isArray(
          storedTrips
        )
          ? [...storedTrips]
          : [];

      const existingIndex =
        editingId
          ? currentTrips.findIndex(
              (item) =>
                item?.id ===
                editingId
            )
          : -1;

      const existingTrip =
        existingIndex >= 0
          ? currentTrips[
              existingIndex
            ]
          : null;

      const quantity = isJcbWork
        ? Number(((Number(form.jcbHours) || 0) + (Number(form.jcbMinutes) || 0) / 60).toFixed(4))
        : Number(form.quantity);

      const rate =
        Number(form.rate);

      const calculatedAmount =
        calculateTripAmount({
          quantity,
          rate,
        });

      const trip = {
        id:
          editingId ||
          generateId(),

        date: form.date,

        tractorId:
          isJcbWork ? "" : form.tractorId || "",

        vehicleNumber:
          isJcbWork ? "" : form.vehicleNumber.trim(),

        tractorNumber:
          isJcbWork ? "" : form.vehicleNumber.trim(),

        tractorName:
          isJcbWork ? "" : form.tractorName.trim(),

        driverName:
          isJcbWork ? "" : form.driverName.trim(),

        driverMobile:
          isJcbWork ? "" : form.driverMobile.trim(),

        partyId:
          form.partyId || "",

        partyName:
          form.partyName.trim(),

        materialId:
          form.materialId || "",

        materialName:
          form.materialName.trim(),

        material:
          form.materialName.trim(),

        /*
         * IMPORTANT:
         * Existing trip schema preserved.
         */
        tripType:
          form.tripType,

        jcbWork: isJcbWork,
        jcbWorkType: isJcbWork ? form.jcbWorkType : "",
        jcbMachineNumber: isJcbWork ? form.jcbMachineNumber.trim() : "",
        jcbOperatorName: isJcbWork ? form.jcbOperatorName.trim() : "",
        jcbOperatorMobile: isJcbWork ? form.jcbOperatorMobile.trim() : "",
        jcbHours: isJcbWork ? Number(form.jcbHours) || 0 : undefined,
        jcbMinutes: isJcbWork ? Number(form.jcbMinutes) || 0 : undefined,
        description: isJcbWork
          ? form.materialName.trim() || form.jcbWorkType || "JCB Working Hours"
          : form.materialName.trim(),

        site:
          form.site.trim(),

        location:
          form.site.trim(),

        quantity,

        unit:
          isJcbWork ? "hour" : form.unit.trim(),

        rate,

        amount:
          Number(
            calculatedAmount
          ) || 0,

        notes:
          form.notes.trim(),

        completeTrip: 1,

        createdAt:
          existingTrip?.createdAt ||
          now,

        updatedAt: now,
      };

      let updatedTrips;

      if (existingIndex >= 0) {
        updatedTrips = [
          ...currentTrips,
        ];

        updatedTrips[
          existingIndex
        ] = trip;
      } else {
        updatedTrips = [
          trip,
          ...currentTrips,
        ];
      }

      const saved =
        writeStorage(
          STORAGE_KEYS.trips,
          updatedTrips
        );

      if (!saved) {
        throw new Error(
          "Unable to save trips to localStorage."
        );
      }

      const verifyRaw =
        localStorage.getItem(
          STORAGE_KEYS.trips
        );

      if (!verifyRaw) {
        throw new Error(
          "Trip data was not found after saving."
        );
      }

      let verifyTrips;

      try {
        verifyTrips =
          JSON.parse(
            verifyRaw
          );
      } catch {
        throw new Error(
          "Saved trip data could not be verified."
        );
      }

      if (
        !Array.isArray(
          verifyTrips
        )
      ) {
        throw new Error(
          "Saved trip data is invalid."
        );
      }

      const savedTrip =
        verifyTrips.find(
          (item) =>
            item?.id ===
            trip.id
        );

      if (!savedTrip) {
        throw new Error(
          "Trip was not found after saving."
        );
      }

      emitDataChange({
        type: "trip",

        action:
          existingIndex >= 0
            ? "update"
            : "create",

        id: trip.id,
      });

      if (
        typeof refreshData ===
        "function"
      ) {
        refreshData();
      }

      setLastSavedTripId(trip.id);
      if (isJcbWork) {
        try { localStorage.setItem(PREFERRED_JCB_RATE_KEY, String(rate)); } catch {}
      }

      const wasEditing =
        Boolean(editingId);

      const preferredTractorId = isJcbWork ? readPreferredTractorId() : form.tractorId;
      const selectedTractor = activeTractors.find(
        (tractor) => getId(tractor) === preferredTractorId,
      ) || null;
      let tractorForNextTrip = selectedTractor;
      if (wasEditing) {
        const preferredId = readPreferredTractorId();
        tractorForNextTrip = activeTractors.find(
          (tractor) => getId(tractor) === preferredId,
        ) || selectedTractor;
      }
      if (tractorForNextTrip && !readPreferredTractorId()) {
        try {
          localStorage.setItem(PREFERRED_TRACTOR_KEY, JSON.stringify(getId(tractorForNextTrip)));
        } catch {}
      }

      const selectedParty =
        retainFields.party
          ? activeParties.find(
              (party) =>
                getId(party) === form.partyId,
            )
          : null;

      const selectedMaterial =
        retainFields.material
          ? activeMaterials.find(
              (material) =>
                getId(material) === form.materialId,
            )
          : null;

      setMessage(
        isJcbWork
          ? wasEditing ? "JCB work entry updated." : "JCB work saved. You can add another entry or create its invoice."
          : (selectedTractor || !form.tractorId || !retainFields.tractor)
            ? wasEditing
              ? "Trip updated successfully."
              : `Trip saved. Ready for another trip${selectedTractor ? ` with ${getVehicle(selectedTractor)}` : ""}.`
            : "Trip saved, but the selected tractor is no longer active. Choose another tractor."
      );

      setForm({
        ...EMPTY_FORM,

        date: form.date,

        tractorId: tractorForNextTrip ? getId(tractorForNextTrip) : "",

        vehicleNumber: tractorForNextTrip ? getVehicle(tractorForNextTrip) : "",

        tractorName:
          tractorForNextTrip?.tractorName ||
          tractorForNextTrip?.name ||
          "",

        driverName:
          tractorForNextTrip?.driverName ||
          "",

        driverMobile:
          tractorForNextTrip?.driverMobile ||
          "",

        partyId: selectedParty ? getId(selectedParty) : "",

        partyName:
          selectedParty?.partyName ||
          selectedParty?.name ||
          (retainFields.party && !form.partyId ? form.partyName : ""),

        materialId:
          selectedMaterial ? getId(selectedMaterial) : "",

        materialName:
          selectedMaterial?.materialName ||
          selectedMaterial?.name ||
          (retainFields.material && !form.materialId
            ? form.materialName
            : ""),

        tripType:
          isJcbWork
            ? "JCB Work"
            : retainFields.tripType
            ? form.tripType
            : settings?.defaultTripType || "Loading",

        jcbWorkType: retainFields.jcbWorkType ? form.jcbWorkType : "",
        jcbMachineNumber: retainFields.jcbMachine ? form.jcbMachineNumber : "",
        jcbOperatorName: retainFields.jcbOperator ? form.jcbOperatorName : "",
        jcbOperatorMobile: retainFields.jcbOperator ? form.jcbOperatorMobile : "",
        jcbHours: "",
        jcbMinutes: "0",

        site: retainFields.site ? form.site : "",

        unit:
          isJcbWork
            ? "hour"
            : retainFields.unit
            ? form.unit
            : settings?.defaultUnit || form.unit || DEFAULT_UNIT,
        rate: isJcbWork ? form.rate : "",
      });

      setTractorPickerOpen(!isJcbWork && !tractorForNextTrip);

      setEditingId("");
      setErrors({});
    } catch (error) {
      console.error(
        "Save trip error:",
        error
      );

      setMessage(
        error?.message ||
          "Trip save nahi ho paya. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RECENT TRIP ACTIONS
  ======================================================= */

  const handleEditRecentTrip =
    (trip) => {
      if (!trip?.id) return;

      window.dispatchEvent(
        new CustomEvent(
          "saoAutoTractorEditTrip",
          {
            detail: trip,
          }
        )
      );
    };

  const handleDeleteRecentTrip =
    (trip) => {
      if (!trip?.id) return;

      const vehicle =
        trip?.vehicleNumber ||
        trip?.vehicleNo ||
        trip?.tractorNumber ||
        "—";

      const party =
        trip?.partyName ||
        "—";

      const date =
        trip?.date || "—";

      const confirmed =
        window.confirm(
          `Delete this trip record?\n\nVehicle: ${vehicle}\nParty: ${party}\nDate: ${date}\n\nThis action cannot be undone.`
        );

      if (!confirmed) return;

      try {
        const storedTrips =
          readStorage(
            STORAGE_KEYS.trips,
            []
          );

        const currentTrips =
          Array.isArray(
            storedTrips
          )
            ? [...storedTrips]
            : [];

        const updatedTrips =
          currentTrips.filter(
            (item) =>
              item?.id !==
              trip.id
          );

        const saved =
          writeStorage(
            STORAGE_KEYS.trips,
            updatedTrips
          );

        if (!saved) {
          throw new Error(
            "Unable to delete trip."
          );
        }

        emitDataChange({
          type: "trip",
          action: "delete",
          id: trip.id,
        });

        if (
          typeof refreshData ===
          "function"
        ) {
          refreshData();
        }

        if (
          editingId ===
          trip.id
        ) {
          resetForm();
        }

        if (
          previewTrip?.id ===
          trip.id
        ) {
          closePreview();
        }

        setMessage(
          "Trip deleted successfully."
        );
      } catch (error) {
        console.error(
          "Delete trip error:",
          error
        );

        setMessage(
          error?.message ||
            "Trip delete nahi ho paya. Please try again."
        );
      }
    };

  /* =======================================================
     PRINT WINDOW
  ======================================================= */

  const createPrintWindow =
    (trip) => {
      if (!trip) return null;

      const printWindow =
        window.open(
          "",
          "_blank",
          "width=900,height=700"
        );

      if (!printWindow) {
        setMessage(
          "Print window open nahi ho paya. Please allow pop-ups."
        );

        return null;
      }

      const companyName =
        settings?.companyName ||
        "SAO AUTO TRACTOR";

      const footerText =
        settings?.footerText ||
        "Transport Management System";

      const quantity =
        Number(trip?.quantity) ||
        0;
      const isJcbRecord = Boolean(trip?.jcbWork || String(trip?.tripType || "").toLowerCase() === "jcb work");
      const workingTime = `${Number(trip?.jcbHours) || 0} hr ${Number(trip?.jcbMinutes) || 0} min`;

      const rate =
        Number(trip?.rate) ||
        0;

      const tripAmount =
        Number(trip?.amount) ||
        calculateTripAmount({
          quantity,
          rate,
        }) ||
        0;

      const safe = (
        value
      ) =>
        String(value ?? "—")
          .replace(
            /&/g,
            "&amp;"
          )
          .replace(
            /</g,
            "&lt;"
          )
          .replace(
            />/g,
            "&gt;"
          )
          .replace(
            /"/g,
            "&quot;"
          )
          .replace(
            /'/g,
            "&#039;"
          );

      const displayDate =
        trip?.date
          ? formatDate(
              trip.date
            )
          : "—";

      const vehicle =
        (isJcbRecord ? trip?.jcbMachineNumber : trip?.vehicleNumber) ||
        trip?.vehicleNo ||
        trip?.tractorNumber ||
        "—";

      const material =
        trip?.materialName ||
        trip?.material ||
        trip?.jcbWorkType ||
        (isJcbRecord ? "JCB Working Hours" : "Transport Trip");

      const site =
        trip?.site ||
        trip?.location ||
        "—";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />

            <title>
              Trip Record - ${safe(vehicle)}
            </title>

            <style>
              @page {
                size: A4;
                margin: 14mm;
              }

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                padding: 0;
                background: #fff;
                color: #152033;
                font-family: Arial, Helvetica, sans-serif;
              }

              .document {
                width: 100%;
              }

              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 20px;
              }

              .company {
                font-family: Georgia, "Times New Roman", serif;
                font-size: 24px;
                font-weight: 700;
                color: #152033;
              }

              .subtitle {
                margin-top: 5px;
                color: #6d675e;
                font-size: 9px;
              }

              .title {
                text-align: right;
              }

              .title small {
                display: block;
                margin-bottom: 5px;
                color: #6d675e;
                font-size: 8px;
                font-weight: 700;
                letter-spacing: .12em;
              }

              .title strong {
                color: #1b4b73;
                font-size: 13px;
                letter-spacing: .05em;
              }

              .line {
                height: 2px;
                margin: 13px 0 17px;
                background: #1b4b73;
              }

              .meta {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                border: 1px solid #d8d3c9;
              }

              .meta-item {
                padding: 10px;
                border-right: 1px solid #d8d3c9;
              }

              .meta-item:last-child {
                border-right: 0;
              }

              .label {
                display: block;
                margin-bottom: 5px;
                color: #6d675e;
                font-size: 8px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .04em;
              }

              .value {
                display: block;
                font-size: 10px;
                font-weight: 700;
                word-break: break-word;
              }

              .section {
                margin-top: 20px;
              }

              .section-title {
                margin-bottom: 8px;
                padding-bottom: 6px;
                border-bottom: 1px solid #d8d3c9;
                color: #1b4b73;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .08em;
              }

              .details {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                border: 1px solid #d8d3c9;
              }

              .detail {
                min-height: 50px;
                padding: 10px;
                border-right: 1px solid #d8d3c9;
                border-bottom: 1px solid #d8d3c9;
              }

              .detail:nth-child(2n) {
                border-right: 0;
              }

              .detail:nth-last-child(-n + 2) {
                border-bottom: 0;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              th,
              td {
                padding: 9px 10px;
                border: 1px solid #d8d3c9;
                font-size: 9px;
                text-align: left;
              }

              th {
                background: #f3efe6;
                font-size: 8px;
                font-weight: 700;
                text-transform: uppercase;
              }

              td:nth-child(n + 2),
              th:nth-child(n + 2) {
                text-align: right;
              }

              tfoot td {
                background: #f7f4ed;
                font-weight: 700;
              }

              tfoot td:last-child {
                color: #1b4b73;
                font-size: 11px;
              }

              .notes {
                min-height: 50px;
                padding: 10px;
                border: 1px solid #d8d3c9;
                background: #faf9f5;
                font-size: 9px;
                line-height: 1.5;
                white-space: pre-wrap;
              }

              .signatures {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 70px;
                margin-top: 65px;
              }

              .signature {
                padding-top: 28px;
                border-top: 1px solid #777;
                text-align: center;
                color: #6d675e;
                font-size: 8px;
              }

              .footer {
                display: flex;
                justify-content: space-between;
                margin-top: 35px;
                padding-top: 8px;
                border-top: 1px solid #d8d3c9;
                color: #8a847a;
                font-size: 7px;
              }

              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>

          <body>
            <div class="document">

              <div class="header">
                <div>
                  <div class="company">
                    ${safe(companyName)}
                  </div>

                  <div class="subtitle">
                    ${safe(footerText)}
                  </div>
                </div>

                <div class="title">
                  <small>
                    ${isJcbRecord ? "JCB WORK" : "TRANSPORT MANAGEMENT"}
                  </small>

                  <strong>
                    ${isJcbRecord ? "JCB WORK RECORD" : "TRIP RECORD"}
                  </strong>
                </div>
              </div>

              <div class="line"></div>

              <div class="meta">
                <div class="meta-item">
                  <span class="label">
                    Trip Date
                  </span>

                  <span class="value">
                    ${safe(displayDate)}
                  </span>
                </div>

                <div class="meta-item">
                  <span class="label">
                    ${isJcbRecord ? "JCB Work Type" : "Trip Type"}
                  </span>

                  <span class="value">
                    ${safe(
                      (isJcbRecord ? trip?.jcbWorkType || "General / not specified" : trip?.tripType) ||
                        "—"
                    )}
                  </span>
                </div>

                <div class="meta-item">
                  <span class="label">
                    ${isJcbRecord ? "JCB / Machine" : "Vehicle Number"}
                  </span>

                  <span class="value">
                    ${safe(vehicle)}
                  </span>
                </div>

                <div class="meta-item">
                  <span class="label">
                    ${isJcbRecord ? "Operator" : "Driver"}
                  </span>

                  <span class="value">
                    ${safe(
                      (isJcbRecord ? trip?.jcbOperatorName : trip?.driverName) ||
                        "—"
                    )}
                  </span>
                </div>
              </div>

              <div class="section">
                <div class="section-title">
                  ${isJcbRecord ? "Party & JCB Work" : "Party & Material"}
                </div>

                <div class="details">
                  <div class="detail">
                    <span class="label">
                      Party / Customer
                    </span>

                    <span class="value">
                      ${safe(
                        trip?.partyName ||
                          "—"
                      )}
                    </span>
                  </div>

                  <div class="detail">
                    <span class="label">
                      ${isJcbRecord ? "Work / Material" : "Material"}
                    </span>

                    <span class="value">
                      ${safe(material)}
                    </span>
                  </div>

                  <div class="detail">
                    <span class="label">
                      Site / Location
                    </span>

                    <span class="value">
                      ${safe(site)}
                    </span>
                  </div>

                  <div class="detail">
                    <span class="label">
                      ${isJcbRecord ? "Operator Mobile" : "Driver Mobile"}
                    </span>

                    <span class="value">
                      ${safe(
                        (isJcbRecord ? trip?.jcbOperatorMobile : trip?.driverMobile) ||
                          "—"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">
                  ${isJcbRecord ? "Working Time & Billing" : "Quantity & Billing"}
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>${isJcbRecord ? "Working Time" : "Quantity"}</th>
                      <th>Unit</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>
                        ${safe(material)}
                      </td>

                      <td>
                        ${safe(isJcbRecord ? workingTime : quantity)}
                      </td>

                      <td>
                        ${safe(
                          (isJcbRecord ? "hour" : trip?.unit) ||
                            DEFAULT_UNIT
                        )}
                      </td>

                      <td>
                        ${safe(
                          formatCurrency(
                            rate
                          )
                        )}
                      </td>

                      <td>
                        ${safe(
                          formatCurrency(
                            tripAmount
                          )
                        )}
                      </td>
                    </tr>
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colspan="4">
                        Total Trip Amount
                      </td>

                      <td>
                        ${safe(
                          formatCurrency(
                            tripAmount
                          )
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              ${
                trip?.notes
                  ? `
                    <div class="section">
                      <div class="section-title">
                        Notes
                      </div>

                      <div class="notes">
                        ${safe(trip.notes)}
                      </div>
                    </div>
                  `
                  : ""
              }

              <div class="signatures">
                <div class="signature">
                  Driver Signature
                </div>

                <div class="signature">
                  Authorized Signature
                </div>
              </div>

              <div class="footer">
                <span>
                  ${safe(companyName)}
                </span>

                <span>
                  Transport Management System
                </span>
              </div>

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

      return printWindow;
    };

  const handlePrintTrip = (
    trip
  ) => {
    createPrintWindow(trip);
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePdfTrip = (
    trip
  ) => {
    createPrintWindow(trip);
  };

  const handlePdfCurrent = () => {
    handlePrint();
  };

  /* =======================================================
     PRINT DATA
  ======================================================= */

  const companyName =
    settings?.companyName ||
    "SAO AUTO TRACTOR";

  const footerText =
    settings?.footerText ||
    "Transport Management System";

  const printableAmount =
    Number(amount) || 0;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="add-trip-page">
      <div className="page-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="add-trip-header">
          <div>
            <div className="add-trip-eyebrow">
              TRANSPORT MANAGEMENT
            </div>

            <h1>
              {!editingId && (
                <Plus
                  size={22}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              )}

              {editingId
                ? "Edit Trip"
                : "Add Trip"}
            </h1>

            <p>
              {isJcbWork
                ? "Record JCB working hours with party, site and hourly billing."
                : "Record a tractor transport trip with billing and site details."}
            </p>
          </div>

          <div className="add-trip-header-actions">
            <Button
              type="button"
              variant="secondary"
              icon={
                <Eye
                  size={16}
                  aria-hidden="true"
                />
              }
              onClick={
                openCurrentPreview
              }
            >
              Preview
            </Button>

            <Button
              type="button"
              variant="secondary"
              icon={
                <Printer
                  size={16}
                  aria-hidden="true"
                />
              }
              onClick={handlePrint}
            >
              Print
            </Button>

            <Button
              type="button"
              variant="secondary"
              icon={
                <FileDown
                  size={16}
                  aria-hidden="true"
                />
              }
              onClick={
                handlePdfCurrent
              }
            >
              PDF
            </Button>

            {editingId && (
              <Button
                type="button"
                variant="secondary"
                icon={
                  <X
                    size={16}
                    aria-hidden="true"
                  />
                }
                onClick={resetForm}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </header>

        <section className={`trip-tractor-first${isJcbWork ? " is-jcb-mode" : ""}`} aria-label="Choose transport or JCB work">
          <div className="trip-entry-mode-select" role="group" aria-label="Choose work type">
            <button type="button" className={!isJcbWork ? "selected" : ""} aria-pressed={!isJcbWork} onClick={() => changeTripMode("transport")}>
              <Tractor size={17} aria-hidden="true" /> Transport trip
            </button>
            <button type="button" className={isJcbWork ? "selected" : ""} aria-pressed={isJcbWork} onClick={() => changeTripMode("jcb")}>
              <Building2 size={17} aria-hidden="true" /> JCB work
            </button>
          </div>
          <div className="trip-tractor-first__intro">
            <span className="trip-tractor-first__step">STEP 01 · {isJcbWork ? "JCB WORK" : "TRACTOR"}</span>
            <h2>{isJcbWork ? "JCB work entry" : form.tractorId && !tractorPickerOpen ? "Tractor selected" : "Choose a tractor to start"}</h2>
            <p>
              {isJcbWork
                ? "No tractor trip type is needed. Your saved tractor selection stays ready for the next transport entry."
                : form.tractorId && !tractorPickerOpen
                  ? "This tractor will stay selected for every new trip until you change it."
                  : `Select one of your ${activeTractors.length} active tractors before entering trip details.`}
            </p>
          </div>
          {!isJcbWork && <div className="trip-tractor-first__picker">
            {form.tractorId && !tractorPickerOpen ? (
              <div className="selected-tractor-control">
                <div className="selected-tractor-copy">
                  <Tractor size={18} aria-hidden="true" />
                  <span>
                    <strong>{form.vehicleNumber}</strong>
                    <small>{form.driverName || "No driver assigned"}</small>
                  </span>
                </div>
                <button type="button" className="change-tractor-button" onClick={changeTractor}>
                  Change tractor
                </button>
              </div>
            ) : (
              <div className="field tractor-picker-field">
                <label htmlFor="first-tractor-picker">Active tractor <b>*</b></label>
                <SearchBox
                  inputId="first-tractor-picker"
                  icon={Tractor}
                  placeholder="Tap to choose a tractor..."
                  value={form.vehicleNumber}
                  onChange={(value) => update("vehicleNumber", value)}
                  items={activeTractors}
                  getLabel={getVehicle}
                  onSelect={selectTractor}
                  emptyText="No active tractor found. Add or activate one in Tractor Management."
                />
                {errors.vehicleNumber && <small className="field-error">{errors.vehicleNumber}</small>}
              </div>
            )}
          </div>}
        </section>

        <div className="trip-entry-workspace" hidden={!isJcbWork && !form.tractorId && !editingId}>

        {/* =================================================
            TRIP TEMPLATES
        ================================================= */}

        <section className="trip-templates-section" hidden={!templates.length && !recentTrips.length}>
          <div className="trip-templates-header">
            <div className="trip-templates-title">
              <FileText
                size={17}
                aria-hidden="true"
              />

              <span>Quick Start</span>

              <small>Templates and recent trips</small>
            </div>

            <button
              type="button"
              className="trip-template-save-btn"
              onClick={
                saveCurrentAsTemplate
              }
            >
              <Plus
                size={15}
                aria-hidden="true"
              />

              Save as Template
            </button>
          </div>

          {templates.length > 0 ? (
            <div className="trip-templates-list">
              {templates.map(
                (template) => (
                  <div
                    key={template.id}
                    className="trip-template-item"
                  >
                    <button
                      type="button"
                      className="trip-template-apply"
                      onClick={() =>
                        applyTemplate(
                          template
                        )
                      }
                    >
                      <strong>
                        {template.name}
                      </strong>

                      <span>
                        {template.partyName ||
                          "No party"}{" "}
                        •{" "}
                        {template.materialName ||
                          "No material"}
                      </span>

                      <small>
                        {template.tripType ||
                          "Trip"}{" "}
                        • Qty:{" "}
                        {template.quantity ||
                          0}{" "}
                        • Rate:{" "}
                        {formatCurrency(
                          template.rate ||
                            0
                        )}
                      </small>
                    </button>

                    <button
                      type="button"
                      className="trip-template-delete"
                      onClick={() =>
                        deleteTemplate(
                          template.id
                        )
                      }
                      aria-label={`Delete template ${template.name}`}
                    >
                      <X
                        size={14}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="trip-templates-empty">
              <FileText
                size={18}
                aria-hidden="true"
              />

              <span>
                No templates saved. Fill the
                form and click "Save as
                Template".
              </span>
            </div>
          )}

          {recentTrips.length > 0 && (
            <div className="trip-quick-recent">
              <div className="trip-quick-recent__heading">
                <strong>Copy a recent trip</strong>
                <span>New copy uses today’s date. Review quantity and rate.</span>
              </div>
              <div className="trip-quick-recent__list">
                {recentTrips.slice(0, 3).map((trip, index) => (
                  <article
                    className="trip-quick-recent__item"
                    key={getId(trip) || `${trip?.date}-${index}`}
                  >
                    <div className="trip-quick-recent__top">
                      <strong>{trip?.vehicleNumber || trip?.tractorNumber || "No tractor"}</strong>
                      <span>{trip?.partyName || trip?.party || "No party"}</span>
                    </div>
                    <small>
                      {trip?.date || trip?.createdAt?.slice(0, 10) || "Date unavailable"}
                      {trip?.tripType ? ` · ${trip.tripType}` : ""}
                    </small>
                    <div className="trip-quick-recent__figures">
                      <span>Qty <b>{trip?.quantity ?? trip?.qty ?? "—"} {trip?.unit || ""}</b></span>
                      <span>Rate <b>{trip?.rate != null || trip?.price != null ? formatCurrency(trip?.rate ?? trip?.price) : "Not recorded"}</b></span>
                    </div>
                    <button
                      type="button"
                      className="trip-quick-recent__use"
                      onClick={() => applyRecentTrip(trip)}
                    >
                      Use trip details
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

      <fieldset className="trip-retain-fields">
          <legend>Keep for next trip</legend>
        <p>Tractor stays selected until you change it. Choose which other details carry forward after saving.</p>
          <div className="trip-retain-fields__options">
            {RETAIN_FIELD_OPTIONS.map(({ key, label }) => (
            key === "tractor" ? null :
              <label className="trip-retain-fields__option" key={key}>
                <input
                  type="checkbox"
                  checked={retainFields[key]}
                  onChange={(event) =>
                    updateRetainField(key, event.target.checked)
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section
          className="add-trip-summary"
          aria-label="Trip summary"
        >
          <div className="add-trip-summary-card">
            <div className="summary-icon">
              <Tractor
                size={20}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>Tractors</span>

              <strong>
                {activeTractors.length}
              </strong>
            </div>
          </div>

          <div className="add-trip-summary-card">
            <div className="summary-icon">
              <UserRound
                size={20}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>Parties</span>

              <strong>
                {activeParties.length}
              </strong>
            </div>
          </div>

          <div className="add-trip-summary-card">
            <div className="summary-icon">
              <Package
                size={20}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>Materials</span>

              <strong>
                {activeMaterials.length}
              </strong>
            </div>
          </div>

          <div className="add-trip-summary-card amount">
            <div className="summary-icon">
              <Truck
                size={20}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>Trip Amount</span>

              <strong>
                {formatCurrency(
                  amount || 0
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div
            className="add-trip-message"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={18}
              aria-hidden="true"
            />

            <span>
              {message}
            </span>
            {lastSavedTripId && !editingId && (
              <button type="button" className="add-trip-invoice-link" onClick={() => onNavigate("invoice", { action: "prefill-invoice-trip", payload: { tripId: lastSavedTripId } })}>
                <FileText size={15} aria-hidden="true" /> Create invoice
              </button>
            )}
          </div>
        )}

        {/* =================================================
            MAIN FORM
        ================================================= */}

        <form
          className="add-trip-form"
          onSubmit={saveTrip}
          noValidate
        >

          {/* =================================================
              01 DATE & TRIP TYPE
          ================================================= */}

          <Card className="add-trip-card add-trip-card--date">
            <div className="add-trip-card-header">
              <div>
                <span className="section-number">
                  01
                </span>

                <h2>
                  {isJcbWork ? "Date & JCB Work" : "Date & Trip Type"}
                </h2>

                <p>
                  {isJcbWork ? "Choose the work date and an optional work category." : "Choose the trip date and transport type."}
                </p>
              </div>
            </div>

            <div className="add-trip-grid two">
              <div className="field">
                <label htmlFor="trip-date">
                  Trip Date <b>*</b>
                </label>

                <input
                  id="trip-date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    update(
                      "date",
                      event.target.value
                    )
                  }
                />

                {errors.date && (
                  <small className="field-error">
                    {errors.date}
                  </small>
                )}
              </div>

              <div className="field">
                {isJcbWork ? <>
                  <label htmlFor="jcb-work-type">JCB Work Type</label>
                  <select id="jcb-work-type" value={form.jcbWorkType} onChange={(event) => update("jcbWorkType", event.target.value)}>
                    {JCB_WORK_TYPES.map((type) => <option key={type.value || "blank"} value={type.value}>{type.label}</option>)}
                  </select>
                </> : <>
                <label>
                  Trip Type <b>*</b>
                </label>

                <div
                  className="trip-type-grid"
                  role="group"
                  aria-label="Trip type"
                >
                  {TRIP_TYPES.map(
                    (tripType) => {
                      const Icon =
                        tripType.icon;

                      const selected =
                        form.tripType ===
                        tripType.value;

                      return (
                        <button
                          type="button"
                          key={
                            tripType.value
                          }
                          className={`trip-type${
                            selected
                              ? " selected"
                              : ""
                          }`}
                          aria-pressed={
                            selected
                          }
                          onClick={() =>
                            update(
                              "tripType",
                              tripType.value
                            )
                          }
                        >
                          <Icon
                            size={19}
                            aria-hidden="true"
                          />

                          <span>
                            {
                              tripType.label
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                {errors.tripType && (
                  <small className="field-error">
                    {errors.tripType}
                  </small>
                )}
                </>}
              </div>
            </div>
          </Card>

          {/* =================================================
              02 TRANSPORT & DRIVER
          ================================================= */}

          {!isJcbWork && <Card className="add-trip-card add-trip-card--transport">
            <div className="add-trip-card-header">
              <div>
                <span className="section-number">
                  02
                </span>

                <h2>
                  Transport & Driver
                </h2>

                <p>
                  Select the tractor and
                  confirm driver details.
                </p>
              </div>
            </div>

            <div className="add-trip-grid two">
              <div className="field">
                <label htmlFor="tractor-name">
                  Tractor Name
                </label>

                <input
                  id="tractor-name"
                  value={
                    form.tractorName
                  }
                  onChange={(event) =>
                    update(
                      "tractorName",
                      event.target.value
                    )
                  }
                  placeholder="Tractor name"
                />
              </div>

              <div className="field">
                <label htmlFor="driver-name">
                  Driver Name
                </label>

                <div className="input-icon">
                  <UserRound
                    size={17}
                    aria-hidden="true"
                  />

                  <input
                    id="driver-name"
                    value={
                      form.driverName
                    }
                    onChange={(event) =>
                      update(
                        "driverName",
                        event.target.value
                      )
                    }
                    placeholder="Driver name"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="driver-mobile">
                  Driver Mobile
                </label>

                <input
                  id="driver-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={
                    form.driverMobile
                  }
                  onChange={(event) =>
                    update(
                      "driverMobile",
                      event.target.value
                    )
                  }
                  placeholder="Mobile number"
                />
              </div>
            </div>
          </Card>}

          {isJcbWork && <Card className="add-trip-card add-trip-card--transport add-trip-card--jcb">
            <div className="add-trip-card-header"><div><span className="section-number">02</span><h2>JCB & Operator</h2><p>Machine and operator details are optional; add them only when you want them on the record and invoice.</p></div></div>
            <div className="add-trip-grid two">
              <div className="field"><label htmlFor="jcb-machine-number">JCB / Machine Number <span>(optional)</span></label><input id="jcb-machine-number" value={form.jcbMachineNumber} onChange={(event) => update("jcbMachineNumber", event.target.value)} placeholder="e.g. JCB-01" /></div>
              <div className="field"><label htmlFor="jcb-operator-name">Operator Name <span>(optional)</span></label><input id="jcb-operator-name" value={form.jcbOperatorName} onChange={(event) => update("jcbOperatorName", event.target.value)} placeholder="Operator name" /></div>
              <div className="field"><label htmlFor="jcb-operator-mobile">Operator Mobile <span>(optional)</span></label><input id="jcb-operator-mobile" type="tel" inputMode="numeric" value={form.jcbOperatorMobile} onChange={(event) => update("jcbOperatorMobile", event.target.value)} placeholder="Mobile number" /></div>
            </div>
          </Card>}

          {/* =================================================
              03 PARTY & MATERIAL
          ================================================= */}

          <Card className="add-trip-card add-trip-card--party">
            <div className="add-trip-card-header">
              <div>
                <span className="section-number">
                  03
                </span>

                <h2>
                  {isJcbWork ? "Party & Work Details" : "Party & Material"}
                </h2>

                <p>
                  {isJcbWork ? "Party and site are optional; add a work note if you know it." : "Connect this trip with the correct customer and material."}
                </p>
              </div>
            </div>

            <div className="add-trip-grid three">
              <div className="field">
                <label>
                  Party / Customer (optional)
                </label>

                <SearchBox
                  icon={UserRound}
                  placeholder="Search party..."
                  value={
                    form.partyName
                  }
                  onChange={(value) =>
                    update(
                      "partyName",
                      value
                    )
                  }
                  items={
                    activeParties
                  }
                  getLabel={
                    getPartyName
                  }
                  onSelect={
                    selectParty
                  }
                  emptyText="No party found."
                />
              </div>

              <div className="field">
                <label htmlFor={isJcbWork ? "jcb-work-description" : undefined}>
                  {isJcbWork ? "Material / Work Description (optional)" : "Material (optional)"}
                </label>

                {isJcbWork ? <input id="jcb-work-description" value={form.materialName} onChange={(event) => update("materialName", event.target.value)} placeholder="Leave blank if unknown" /> : <SearchBox
                  icon={Package}
                  placeholder="Search material..."
                  value={form.materialName}
                  onChange={(value) => update("materialName", value)}
                  items={activeMaterials}
                  getLabel={getMaterialName}
                  onSelect={selectMaterial}
                  emptyText="No material found."
                />}
              </div>

              <div className="field trip-site-field">
                <label htmlFor="trip-site">
                  Site / Location
                </label>

                <div className="input-icon">
                  <MapPin
                    size={17}
                    aria-hidden="true"
                  />

                  <input
                    id="trip-site"
                    value={form.site}
                    onChange={(event) =>
                      update("site", event.target.value)
                    }
                    placeholder="Enter site or destination"
                  />
                </div>
              </div>
            </div>

            {activeParties.length ===
              0 && (
              <div className="setup-note">
                <UserRound
                  size={17}
                  aria-hidden="true"
                />

                <span>
                  No active parties found.
                  Add a party from Party
                  Management first.
                </span>
              </div>
            )}

            {!isJcbWork && activeMaterials.length === 0 && (
              <div className="setup-note">
                <Package
                  size={17}
                  aria-hidden="true"
                />

                <span>
                  No active materials found.
                  Add material from Material
                  Management first.
                </span>
              </div>
            )}
          </Card>

          {/* =================================================
              04 QUANTITY & BILLING
          ================================================= */}

          <Card className="add-trip-card add-trip-card--billing">
            <div className="add-trip-card-header">
              <div>
                <span className="section-number">
                  04
                </span>

                <h2>
                  {isJcbWork ? "Working Time & Billing" : "Quantity & Billing"}
                </h2>

                <p>
                  {isJcbWork ? "Enter machine hours and hourly rate; the total is calculated automatically." : "Enter quantity and rate for this trip."}
                </p>
              </div>
            </div>

            <div className={`add-trip-grid three${isJcbWork ? " jcb-billing-fields" : ""}`}>
              {isJcbWork ? <>
                <div className="field">
                  <label htmlFor="jcb-hours">Hours <b>*</b></label>
                  <input id="jcb-hours" type="number" min="0" step="1" inputMode="numeric" value={form.jcbHours} onChange={(event) => {
                    const hours = event.target.value;
                    const total = (Number(hours) || 0) + (Number(form.jcbMinutes) || 0) / 60;
                    update("jcbHours", hours);
                    update("quantity", total.toFixed(4));
                  }} placeholder="0" />
                  {errors.jcbHours && <small className="field-error">{errors.jcbHours}</small>}
                </div>
                <div className="field">
                  <label htmlFor="jcb-minutes">Minutes <span>(optional)</span></label>
                  <input id="jcb-minutes" type="number" min="0" max="59" step="1" inputMode="numeric" value={form.jcbMinutes} onChange={(event) => {
                    const minutes = event.target.value;
                    const total = (Number(form.jcbHours) || 0) + (Number(minutes) || 0) / 60;
                    update("jcbMinutes", minutes);
                    update("quantity", total.toFixed(4));
                  }} placeholder="0" />
                  {errors.jcbMinutes && <small className="field-error">{errors.jcbMinutes}</small>}
                </div>
              </> : <div className="field">
                <label htmlFor="trip-quantity">Quantity <b>*</b></label>
                <input id="trip-quantity" type="number" min="0" step="any" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} placeholder="0" />
                {errors.quantity && <small className="field-error">{errors.quantity}</small>}
              </div>}

              {!isJcbWork && <div className="field">
                <label htmlFor="trip-unit">Unit</label>
                <input id="trip-unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} placeholder="Trip" />
              </div>}

              <div className="field">
                <label htmlFor="trip-rate">
                  {isJcbWork ? "Hourly Rate (₹)" : "Rate"} <b>*</b>
                </label>

                <input
                  id="trip-rate"
                  type="number"
                  min="0"
                  step="any"
                  value={form.rate}
                  onChange={(event) =>
                    update(
                      "rate",
                      event.target.value
                    )
                  }
                  placeholder={isJcbWork ? "Rate per hour" : "0"}
                />

                {errors.rate && (
                  <small className="field-error">
                    {errors.rate}
                  </small>
                )}
              </div>
            </div>

            <div className="amount-preview">
              <div>
                <span>
                  {isJcbWork ? "Calculated JCB Amount" : "Calculated Trip Amount"}
                </span>

                <small>
                  {isJcbWork ? "Hours × hourly rate" : "Quantity × Rate"}
                </small>
              </div>

              <strong>
                {formatCurrency(
                  amount || 0
                )}
              </strong>
            </div>
          </Card>

          {/* =================================================
              05 NOTES
          ================================================= */}

          <Card className="add-trip-card add-trip-card--notes">
            <div className="add-trip-card-header">
              <div>
                <span className="section-number">
                  05
                </span>

                <h2>
                  Notes
                </h2>

                <p>
                  Optional notes for this
                  transport record.
                </p>
              </div>
            </div>

            <div className="field">
              <label
                htmlFor="trip-notes"
                className="sr-only"
              >
                Trip Notes
              </label>

              <textarea
                id="trip-notes"
                value={form.notes}
                onChange={(event) =>
                  update(
                    "notes",
                    event.target.value
                  )
                }
                placeholder="Add any additional notes..."
                rows={4}
              />
            </div>
          </Card>

          {/* =================================================
              SUBMIT AREA
          ================================================= */}

          <div className="add-trip-submit">
            <div>
              <span>
                {editingId
                  ? "Editing existing trip"
                  : "Ready to save?"}
              </span>

              <strong>
                {form.vehicleNumber ||
                  "No tractor"}
                {" • "}
                {form.partyName ||
                  "No party"}
              </strong>
            </div>

            <div className="submit-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Reset
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={
                  openCurrentPreview
                }
                disabled={saving}
              >
                <Eye
                  size={16}
                  aria-hidden="true"
                />

                Preview
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={
                  saveCurrentAsTemplate
                }
                disabled={saving}
              >
                <FileText
                  size={16}
                  aria-hidden="true"
                />

                Save Template
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save
                      size={17}
                      aria-hidden="true"
                    />

                    {editingId
                      ? "Update Trip"
                      : "Save & Add Another"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
        </div>

        <ConfirmDialog
          open={Boolean(duplicateTrip)}
          title="Possible duplicate trip"
          message={duplicateTrip
            ? `A matching trip is already saved: ${formatDate(duplicateTrip.date)} · ${duplicateTrip.vehicleNumber || duplicateTrip.vehicleNo || duplicateTrip.tractorNumber || "No tractor"} · ${duplicateTrip.partyName || duplicateTrip.party || "No party"} · ${duplicateTrip.materialName || duplicateTrip.material || "No material"} · ${duplicateTrip.tripType || duplicateTrip.type || "Trip"} · Qty ${duplicateTrip.quantity ?? duplicateTrip.qty ?? "—"} · ${formatCurrency(duplicateTrip.rate ?? duplicateTrip.price ?? 0)} per unit. Save anyway only if this is a separate trip.`
            : "A matching trip already exists. Save anyway only if this is a separate trip."}
          confirmLabel="Save anyway"
          cancelLabel="Review trip"
          variant="primary"
          onConfirm={() => {
            setDuplicateTrip(null);
            void saveTrip(null, true);
          }}
          onCancel={() => setDuplicateTrip(null)}
        />

        {/* =================================================
            RECENT TRIPS
        ================================================= */}

        {recentTrips.length > 0 && (
          <Card className="add-trip-recent">
            <div className="add-trip-card-header">
              <div>
                <span className="section-number">
                  RECENT
                </span>

                <h2>
                  Recent Trips
                </h2>

                <p>
                  Your latest transport
                  records.
                </p>
              </div>
            </div>

            <div className="recent-list">
              {recentTrips.map(
                (trip) => (
                  <div
                    className="recent-item"
                    key={trip.id}
                  >
                    <div className="recent-main">
                      <strong>
                        {trip.vehicleNumber ||
                          trip.tractorNumber ||
                          "—"}
                      </strong>

                      <span>
                        {trip.partyName ||
                          "—"}
                      </span>
                    </div>

                    <div className="recent-middle">
                      <span>
                        {trip.tripType ||
                          "Trip"}
                      </span>

                      <small>
                        {trip.site ||
                          trip.location ||
                          "—"}
                      </small>
                    </div>

                    <div className="recent-amount">
                      {formatCurrency(
                        Number(
                          trip.amount
                        ) || 0
                      )}
                    </div>

                    <div className="recent-actions">
                      <button
                        type="button"
                        className="recent-action view"
                        title="View trip"
                        aria-label="View trip"
                        onClick={() =>
                          openRecentPreview(
                            trip
                          )
                        }
                      >
                        <Eye
                          size={14}
                          aria-hidden="true"
                        />

                        <span>
                          View
                        </span>
                      </button>

                      <button
                        type="button"
                        className="recent-action edit"
                        title="Edit trip"
                        aria-label="Edit trip"
                        onClick={() =>
                          handleEditRecentTrip(
                            trip
                          )
                        }
                      >
                        <Pencil
                          size={14}
                          aria-hidden="true"
                        />

                        <span>
                          Edit
                        </span>
                      </button>

                      <button
                        type="button"
                        className="recent-action print"
                        title="Print trip"
                        aria-label="Print trip"
                        onClick={() =>
                          handlePrintTrip(
                            trip
                          )
                        }
                      >
                        <Printer
                          size={14}
                          aria-hidden="true"
                        />

                        <span>
                          Print
                        </span>
                      </button>

                      <button
                        type="button"
                        className="recent-action pdf"
                        title="Save as PDF"
                        aria-label="Save as PDF"
                        onClick={() =>
                          handlePdfTrip(
                            trip
                          )
                        }
                      >
                        <FileDown
                          size={14}
                          aria-hidden="true"
                        />

                        <span>
                          PDF
                        </span>
                      </button>

                      <button
                        type="button"
                        className="recent-action delete"
                        title="Delete trip"
                        aria-label="Delete trip"
                        onClick={() =>
                          handleDeleteRecentTrip(
                            trip
                          )
                        }
                      >
                        <Trash2
                          size={14}
                          aria-hidden="true"
                        />

                        <span>
                          Delete
                        </span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </Card>
        )}

        {/* =================================================
            PRINT DOCUMENT
        ================================================= */}

        <section
          className="add-trip-print-document"
          aria-hidden="true"
        >
          <div className="print-document-header">
            <div>
              <div className="print-company-name">
                {companyName}
              </div>

              <div className="print-company-subtitle">
                {footerText}
              </div>
            </div>

            <div className="print-document-title">
              <span>
                TRANSPORT RECORD
              </span>

              <strong>
                {editingId
                  ? "EDIT PREVIEW"
                  : "TRIP RECORD"}
              </strong>
            </div>
          </div>

          <div className="print-document-line" />

          <div className="print-meta-grid">
            <div>
              <span>
                Trip Date
              </span>

              <strong>
                {form.date
                  ? formatDate(
                      form.date
                    )
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                Trip Type
              </span>

              <strong>
                {form.tripType ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Vehicle Number
              </span>

              <strong>
                {form.vehicleNumber ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Driver
              </span>

              <strong>
                {form.driverName ||
                  "—"}
              </strong>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">
              Party & Material
            </div>

            <div className="print-detail-grid">
              <div>
                <span>
                  Party / Customer
                </span>

                <strong>
                  {form.partyName ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Material
                </span>

                <strong>
                  {form.materialName ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Site / Location
                </span>

                <strong>
                  {form.site ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Driver Mobile
                </span>

                <strong>
                  {form.driverMobile ||
                    "—"}
                </strong>
              </div>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">
              Quantity & Billing
            </div>

            <table className="print-billing-table">
              <thead>
                <tr>
                  <th>
                    Description
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Unit
                  </th>

                  <th>
                    Rate
                  </th>

                  <th>
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    {form.materialName ||
                      "Transport Trip"}
                  </td>

                  <td>
                    {form.quantity ||
                      "0"}
                  </td>

                  <td>
                    {form.unit ||
                      DEFAULT_UNIT}
                  </td>

                  <td>
                    {formatCurrency(
                      Number(
                        form.rate
                      ) || 0
                    )}
                  </td>

                  <td>
                    {formatCurrency(
                      printableAmount
                    )}
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan="4">
                    Total Trip Amount
                  </td>

                  <td>
                    {formatCurrency(
                      printableAmount
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {form.notes && (
            <div className="print-section">
              <div className="print-section-title">
                Notes
              </div>

              <div className="print-notes">
                {form.notes}
              </div>
            </div>
          )}

          <div className="print-signature-area">
            <div>
              <span>
                Driver Signature
              </span>
            </div>

            <div>
              <span>
                Authorized Signature
              </span>
            </div>
          </div>

          <div className="print-document-footer">
            <span>
              Generated from{" "}
              {companyName}
            </span>

            <span>
              Transport Management System
            </span>
          </div>
        </section>
      </div>

      {/* ===================================================
          PREVIEW MODAL
      =================================================== */}

      {previewTrip && (
        <TripPreview
          trip={previewTrip}
          title={previewTitle}
          onClose={closePreview}
          onPrint={() => {
            if (
              previewTrip.id &&
              trips.some(
                (item) =>
                  item?.id ===
                  previewTrip.id
              )
            ) {
              handlePrintTrip(
                previewTrip
              );
            } else {
              handlePrint();
            }
          }}
          onPdf={() => {
            if (
              previewTrip.id &&
              trips.some(
                (item) =>
                  item?.id ===
                  previewTrip.id
              )
            ) {
              handlePdfTrip(
                previewTrip
              );
            } else {
              handlePdfCurrent();
            }
          }}
        />
      )}
    </div>
  );
}
