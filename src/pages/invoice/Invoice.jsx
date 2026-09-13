import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Eye,
  FilePlus2,
  FileText,
  History,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import "./Invoice.css";

/* =========================================================
   STORAGE
   ========================================================= */

const TRIPS_KEY = "saoAutoTractorTrips";
const PARTIES_KEY = "saoAutoTractorParties";
const TRACTORS_KEY = "saoAutoTractorTractors";
const PAYMENTS_KEY = "saoAutoTractorPayments";
const INVOICE_HISTORY_KEY = "saoAutoTractorInvoices";
const INVOICE_NUMBER_KEY = "saoAutoTractorInvoiceNumber";
const BUSINESS_KEY = "saoAutoTractorBusinessDetails";

/* =========================================================
   DEFAULT BUSINESS
   ========================================================= */

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

/* =========================================================
   TRIP TYPES
   ========================================================= */

const TRIP_TYPES = [
  "Loading",
  "Unloading",
  "Site to Site",
];

/* =========================================================
   HELPERS
   ========================================================= */

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    return true;
  } catch (error) {
    console.error(`Unable to write ${key}:`, error);
    return false;
  }
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function todayISO() {
  const date = new Date();

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${day}/${month}/${year}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return text;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return parsed.toLocaleDateString("en-IN");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function currency(value) {
  return `₹${formatMoney(value)}`;
}

function getAmount(trip) {
  const directAmount = Number(trip?.amount);

  if (
    Number.isFinite(directAmount) &&
    directAmount > 0
  ) {
    return directAmount;
  }

  const quantity = Number(trip?.quantity) || 0;
  const rate = Number(trip?.rate) || 0;

  return quantity * rate;
}

function getPartyName(party) {
  if (typeof party === "string") {
    return party.trim();
  }

  if (!party || typeof party !== "object") {
    return "";
  }

  return String(
    party.partyName ||
      party.name ||
      party.party ||
      party.customerName ||
      party.ownerName ||
      ""
  ).trim();
}

function getPartyMobile(party) {
  if (!party || typeof party !== "object") {
    return "";
  }

  return String(
    party.mobile ||
      party.phone ||
      party.mobileNumber ||
      party.contactNumber ||
      ""
  ).trim();
}

function getPartyAddress(party) {
  if (!party || typeof party !== "object") {
    return "";
  }

  return String(
    party.address ||
      party.siteAddress ||
      party.location ||
      ""
  ).trim();
}

function getPartyGSTIN(party) {
  if (!party || typeof party !== "object") {
    return "";
  }

  return String(
    party.gstin ||
      party.gstNumber ||
      party.GSTIN ||
      ""
  ).trim();
}

function getVehicleNumber(trip) {
  return String(
    trip?.vehicleNumber ||
      trip?.tractorNumber ||
      trip?.vehicleNo ||
      ""
  ).trim();
}

function getTripTypeSafe(trip) {
  const raw = String(
    trip?.tripType ||
      trip?.type ||
      ""
  )
    .trim()
    .toLowerCase();

  if (
    raw === "loading + unloading" ||
    raw === "loading → unloading" ||
    raw === "loading to unloading" ||
    raw === "loading-unloading" ||
    raw === "loading/unloading"
  ) {
    return "Loading";
  }

  if (raw === "loading") {
    return "Loading";
  }

  if (raw === "unloading") {
    return "Unloading";
  }

  if (
    raw === "site to site" ||
    raw === "site-to-site" ||
    raw === "site_to_site"
  ) {
    return "Site to Site";
  }

  return trip?.tripType || "Loading";
}

function getTripDescription(trip) {
  return String(
    trip?.description ||
      trip?.material ||
      trip?.product ||
      trip?.work ||
      trip?.workType ||
      "Transport Service"
  ).trim();
}

function getTripSite(trip) {
  const from =
    trip?.from ||
    trip?.fromSite ||
    trip?.source ||
    trip?.loadingPoint ||
    "";

  const to =
    trip?.to ||
    trip?.toSite ||
    trip?.destination ||
    trip?.unloadingPoint ||
    "";

  if (from && to) {
    return `${from} → ${to}`;
  }

  return String(
    trip?.site ||
      trip?.siteName ||
      trip?.location ||
      from ||
      to ||
      ""
  ).trim();
}

function getQuantity(trip) {
  const value = Number(
    trip?.quantity ??
      trip?.qty ??
      trip?.trips ??
      1
  );

  return Number.isFinite(value) && value > 0
    ? value
    : 1;
}

function getRate(trip) {
  const rate = Number(trip?.rate);

  if (
    Number.isFinite(rate) &&
    rate > 0
  ) {
    return rate;
  }

  const quantity = getQuantity(trip);
  const amount = getAmount(trip);

  return quantity > 0
    ? amount / quantity
    : 0;
}

function getDateValue(value) {
  const time = new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function getISODate(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] =
      text.split("/");

    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(
    parsed.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    parsed.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   COMPONENT
   ========================================================= */

function Invoice() {
  /* =======================================================
     DATA
     ======================================================= */

  const [trips, setTrips] = useState([]);
  const [parties, setParties] = useState([]);
  const [tractors, setTractors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoiceHistory, setInvoiceHistory] =
    useState([]);

  const [business, setBusiness] =
    useState(DEFAULT_BUSINESS);

  const [businessDraft, setBusinessDraft] =
    useState(DEFAULT_BUSINESS);

  /* =======================================================
     PAGE STATE
     ======================================================= */

  const [businessOpen, setBusinessOpen] =
    useState(false);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [selectedHistoryInvoice, setSelectedHistoryInvoice] =
    useState(null);

  const [editingInvoiceId, setEditingInvoiceId] =
    useState(null);

  /* =======================================================
     INVOICE FORM
     ======================================================= */

  const [invoiceNumber, setInvoiceNumber] =
    useState("");

  const [invoiceDate, setInvoiceDate] =
    useState(todayISO());

  const [partyName, setPartyName] =
    useState("");

  const [partyMobile, setPartyMobile] =
    useState("");

  const [partyAddress, setPartyAddress] =
    useState("");

  const [partyGSTIN, setPartyGSTIN] =
    useState("");

  const [partySearchOpen, setPartySearchOpen] =
    useState(false);

  const [notes, setNotes] =
    useState("");

  /* =======================================================
     SELECTED TRIPS
     ======================================================= */

  const [selectedTripIndexes, setSelectedTripIndexes] =
    useState([]);

  /* =======================================================
     TRIP SEARCH / FILTER
     ======================================================= */

  const [tripSearchBy, setTripSearchBy] =
    useState("Party");

  const [tripSearchQuery, setTripSearchQuery] =
    useState("");

  const [tripSearchFrom, setTripSearchFrom] =
    useState("");

  const [tripSearchTo, setTripSearchTo] =
    useState("");

  // NEW: for trip search suggestions dropdown
  const [showTripSuggestions, setShowTripSuggestions] = useState(false);

  /* =======================================================
     CALCULATION
     ======================================================= */

  const [discountEnabled, setDiscountEnabled] =
    useState(false);

  const [discount, setDiscount] =
    useState("");

  const [customChargeEnabled, setCustomChargeEnabled] =
    useState(false);

  const [customChargeName, setCustomChargeName] =
    useState("Other Charges");

  const [customChargeAmount, setCustomChargeAmount] =
    useState("");

  const [gstEnabled, setGstEnabled] =
    useState(false);

  const [gstRate, setGstRate] =
    useState("18");

  const [receivedAmount, setReceivedAmount] =
    useState("");

  /* =======================================================
     HISTORY FILTER
     ======================================================= */

  const [historySearch, setHistorySearch] =
    useState("");

  const [historyStatus, setHistoryStatus] =
    useState("All");

  /* =======================================================
     MESSAGE
     ======================================================= */

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD DATA
     ======================================================= */

  const loadData = () => {
    const savedTrips =
      readStorage(TRIPS_KEY, []);

    const savedParties =
      readStorage(PARTIES_KEY, []);

    const savedTractors =
      readStorage(TRACTORS_KEY, []);

    const savedPayments =
      readStorage(PAYMENTS_KEY, []);

    const savedInvoices =
      readStorage(
        INVOICE_HISTORY_KEY,
        []
      );

    const savedBusiness =
      readStorage(
        BUSINESS_KEY,
        DEFAULT_BUSINESS
      );

    setTrips(
      Array.isArray(savedTrips)
        ? savedTrips
        : []
    );

    setParties(
      Array.isArray(savedParties)
        ? savedParties
        : []
    );

    setTractors(
      Array.isArray(savedTractors)
        ? savedTractors
        : []
    );

    setPayments(
      Array.isArray(savedPayments)
        ? savedPayments
        : []
    );

    setInvoiceHistory(
      Array.isArray(savedInvoices)
        ? savedInvoices
        : []
    );

    if (!invoiceNumber) {
      const nextNumber =
        getNextMonthlyInvoiceNumber(
          Array.isArray(savedInvoices)
            ? savedInvoices
            : []
        );

      setInvoiceNumber(nextNumber);
    }

    if (
      savedBusiness &&
      typeof savedBusiness === "object" &&
      !Array.isArray(savedBusiness)
    ) {
      const mergedBusiness = {
        ...DEFAULT_BUSINESS,
        ...savedBusiness,
      };

      setBusiness(mergedBusiness);

      if (!businessOpen) {
        setBusinessDraft(
          mergedBusiness
        );
      }
    }
  };

  useEffect(() => {
    loadData();

    const handleStorage = () => {
      loadData();
    };

    const handleAppDataChange = () => {
      loadData();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "saoAutoTractorDataChanged",
      handleAppDataChange
    );

    const interval = setInterval(
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
        handleAppDataChange
      );

      clearInterval(interval);
    };
  }, [businessOpen]);

  /* =======================================================
     INVOICE NUMBER
     
     FORMAT:
     SAT-09260000
     SAT-09260001
     SAT-09260002
     ======================================================= */

  const getNextMonthlyInvoiceNumber = (
    history = invoiceHistory
  ) => {
    const now = new Date();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const year = String(
      now.getFullYear()
    ).slice(-2);

    const prefix =
      `SAT-${month}${year}`;

    const monthlyNumbers = (
      Array.isArray(history)
        ? history
        : []
    )
      .map((invoice) =>
        String(
          invoice?.invoiceNumber || ""
        )
      )
      .map((number) => {
        const match = number.match(
          /^SAT-(\d{2})(\d{2})(\d{4})$/
        );

        if (!match) return null;

        if (
          match[1] !== month ||
          match[2] !== year
        ) {
          return null;
        }

        return Number(match[3]);
      })
      .filter(
        (number) =>
          Number.isFinite(number)
      );

    /*
      First invoice of a month = 0000
      Then 0001, 0002, 0003...
    */
    const highestSaved =
      monthlyNumbers.length > 0
        ? Math.max(
            ...monthlyNumbers
          )
        : -1;

    /*
      FIX 1: Also consider the stored sequence in
      INVOICE_NUMBER_KEY. This prevents invoice numbers
      from being reused after an invoice is deleted.
    */
    let storedSequence = -1;

    try {
      const rawStored = localStorage.getItem(
        INVOICE_NUMBER_KEY
      );

      if (rawStored !== null) {
        const parsedStored = Number(rawStored);

        if (Number.isFinite(parsedStored)) {
          storedSequence = parsedStored;
        }
      }
    } catch (error) {
      // ignore — localStorage not available
    }

    const highest = Math.max(
      highestSaved,
      storedSequence
    );

    const next = highest + 1;

    return `${prefix}${String(next).padStart(
      4,
      "0"
    )}`;
  };

  const generateNextInvoiceNumber = () => {
    return getNextMonthlyInvoiceNumber(
      invoiceHistory
    );
  };

  const reserveNextInvoiceNumber = () => {
    const nextNumber =
      getNextMonthlyInvoiceNumber(
        invoiceHistory
      );

    const match =
      nextNumber.match(
        /^SAT-\d{2}\d{2}(\d{4})$/
      );

    if (match) {
      localStorage.setItem(
        INVOICE_NUMBER_KEY,
        String(
          Number(match[1]) || 0
        )
      );
    }

    return nextNumber;
  };

  useEffect(() => {
    if (!invoiceNumber) {
      setInvoiceNumber(
        generateNextInvoiceNumber()
      );
    }
  }, [
    invoiceNumber,
    invoiceHistory,
  ]);

  /* =======================================================
     PARTY HELPERS
     ======================================================= */

  const normalizedParties = useMemo(() => {
    return parties
      .map((party) => ({
        raw: party,
        name: getPartyName(party),
        mobile: getPartyMobile(party),
        address: getPartyAddress(party),
        gstin: getPartyGSTIN(party),
      }))
      .filter(
        (party) => party.name
      );
  }, [parties]);

  const filteredPartySuggestions =
    useMemo(() => {
      const search =
        normalizeText(partyName);

      if (!search) {
        return normalizedParties.slice(
          0,
          8
        );
      }

      return normalizedParties
        .filter((party) =>
          normalizeText(
            party.name
          ).includes(search)
        )
        .slice(0, 8);
    }, [
      normalizedParties,
      partyName,
    ]);

  const exactPartyMatch =
    normalizedParties.find(
      (party) =>
        normalizeText(
          party.name
        ) ===
        normalizeText(
          partyName
        )
    );

  const selectParty = (party) => {
    setPartyName(party.name);
    setPartyMobile(party.mobile);
    setPartyAddress(party.address);
    setPartyGSTIN(party.gstin);
    setPartySearchOpen(false);
  };

  /* =======================================================
     TRACTOR MAP
     ======================================================= */

  const tractorMap = useMemo(() => {
    const map = new Map();

    tractors.forEach((tractor) => {
      const number = String(
        tractor?.vehicleNumber ||
          tractor?.tractorNumber ||
          tractor?.vehicleNo ||
          ""
      )
        .trim()
        .toLowerCase();

      if (number) {
        map.set(
          number,
          tractor
        );
      }
    });

    return map;
  }, [tractors]);

  /* =======================================================
     BILLABLE TRIPS
     ======================================================= */

  const billableTrips = useMemo(() => {
    return trips
      .map((trip, index) => ({
        trip,
        index,
        amount: getAmount(trip),
      }))
      .filter(
        ({ trip, amount }) =>
          normalizeText(
            trip?.partyName
          ) &&
          amount > 0
      )
      .sort(
        (a, b) =>
          getDateValue(
            b.trip?.createdAt ||
              b.trip?.date
          ) -
          getDateValue(
            a.trip?.createdAt ||
              a.trip?.date
          )
      );
  }, [trips]);

  const filteredTripRecords =
    useMemo(() => {
      const query =
        normalizeText(
          tripSearchQuery
        );

      const from =
        getISODate(
          tripSearchFrom
        );

      const to =
        getISODate(
          tripSearchTo
        );

      return billableTrips.filter(
        ({ trip }) => {
          if (
            tripSearchBy ===
            "Party"
          ) {
            if (
              query &&
              !normalizeText(
                trip?.partyName
              ).includes(query)
            ) {
              return false;
            }
          }

          if (
            tripSearchBy ===
            "Tractor"
          ) {
            const vehicle =
              getVehicleNumber(
                trip
              );

            if (
              query &&
              !normalizeText(
                vehicle
              ).includes(query)
            ) {
              return false;
            }
          }

          if (
            tripSearchBy ===
            "Date"
          ) {
            const date =
              getISODate(
                trip?.date ||
                  trip?.createdAt
              );

            if (
              from &&
              date < from
            ) {
              return false;
            }

            if (
              to &&
              date > to
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      billableTrips,
      tripSearchBy,
      tripSearchQuery,
      tripSearchFrom,
      tripSearchTo,
    ]);

  const filteredTripIndexes =
    useMemo(
      () =>
        filteredTripRecords.map(
          ({ index }) =>
            index
        ),
      [filteredTripRecords]
    );

  const selectedVisibleCount =
    filteredTripIndexes.filter(
      (index) =>
        selectedTripIndexes.includes(
          index
        )
    ).length;

  const selectVisibleTrips = () => {
    if (
      filteredTripRecords.length ===
      0
    ) {
      setError(
        "No matching billable trips found."
      );
      return;
    }

    setSelectedTripIndexes(
      (current) => {
        const next =
          new Set(current);

        filteredTripIndexes.forEach(
          (index) =>
            next.add(index)
        );

        return Array.from(next);
      }
    );

    setError("");
  };

  const clearTripSearch = () => {
    setTripSearchQuery("");
    setTripSearchFrom("");
    setTripSearchTo("");
    setShowTripSuggestions(false);
  };

  /* =======================================================
     SELECTED TRIPS
     ======================================================= */

  const selectedTrips = useMemo(() => {
    return selectedTripIndexes
      .map(
        (index) =>
          trips[index]
      )
      .filter(Boolean);
  }, [
    selectedTripIndexes,
    trips,
  ]);

  const selectedTripRows =
    useMemo(() => {
      return selectedTripIndexes
        .map((index) => ({
          trip: trips[index],
          index,
        }))
        .filter(
          ({ trip }) =>
            Boolean(trip)
        );
    }, [
      selectedTripIndexes,
      trips,
    ]);

  /* =======================================================
     TRIP SELECTION
     ======================================================= */

  const toggleTrip = (index) => {
    const trip = trips[index];

    if (!trip) return;

    if (
      !normalizeText(
        trip.partyName
      )
    ) {
      return;
    }

    setSelectedTripIndexes(
      (current) => {
        if (
          current.includes(index)
        ) {
          return current.filter(
            (item) =>
              item !== index
          );
        }

        return [
          ...current,
          index,
        ];
      }
    );
  };

  const selectPartyTrips = () => {
    if (!partyName.trim()) {
      setError(
        "Select or enter a party first."
      );
      return;
    }

    const matchingIndexes =
      billableTrips
        .filter(
          ({ trip }) =>
            normalizeText(
              trip?.partyName
            ) ===
            normalizeText(
              partyName
            )
        )
        .map(
          ({ index }) =>
            index
        );

    setSelectedTripIndexes(
      matchingIndexes
    );

    setError("");
  };

  const clearSelectedTrips = () => {
    setSelectedTripIndexes([]);
  };

  /* =======================================================
     AUTO PARTY WHEN TRIP SELECTED
     ======================================================= */

  useEffect(() => {
    if (
      selectedTrips.length ===
        0 ||
      editingInvoiceId
    ) {
      return;
    }

    const firstParty =
      selectedTrips.find(
        (trip) =>
          normalizeText(
            trip?.partyName
          )
      )?.partyName;

    if (
      firstParty &&
      !partyName.trim()
    ) {
      setPartyName(
        firstParty
      );

      const matched =
        normalizedParties.find(
          (party) =>
            normalizeText(
              party.name
            ) ===
            normalizeText(
              firstParty
            )
        );

      if (matched) {
        selectParty(matched);
      }
    }
  }, [
    selectedTrips,
    normalizedParties,
    editingInvoiceId,
    partyName,
  ]);

  /* =======================================================
     CALCULATION
     ======================================================= */

  const subtotal = useMemo(() => {
    return selectedTrips.reduce(
      (sum, trip) =>
        sum + getAmount(trip),
      0
    );
  }, [selectedTrips]);

  const discountAmount =
    discountEnabled
      ? Math.max(
          0,
          Number(discount) || 0
        )
      : 0;

  const afterDiscount =
    Math.max(
      0,
      subtotal -
        discountAmount
    );

  const customCharge =
    customChargeEnabled
      ? Math.max(
          0,
          Number(
            customChargeAmount
          ) || 0
        )
      : 0;

  const taxableAmount =
    afterDiscount +
    customCharge;

  const gstAmount =
    gstEnabled
      ? (
          taxableAmount *
          Math.max(
            0,
            Number(gstRate) || 0
          )
        ) / 100
      : 0;

  const grandTotal =
    taxableAmount +
    gstAmount;

  const received = Math.max(
    0,
    Number(receivedAmount) || 0
  );

  const rawDue =
    grandTotal - received;

  const due =
    rawDue > 0.005
      ? Number(
          rawDue.toFixed(2)
        )
      : 0;

  const advance = Math.max(
    0,
    received - grandTotal
  );

  const paymentStatus =
    grandTotal <= 0
      ? "Draft"
      : received >= grandTotal
      ? received > grandTotal
        ? "Advance"
        : "Paid"
      : received > 0
      ? "Partially Paid"
      : "Unpaid";

  /* =======================================================
     PAYMENT SUMMARY
     ======================================================= */

  const partyPayments =
    useMemo(() => {
      if (!partyName.trim()) {
        return [];
      }

      return payments.filter(
        (payment) =>
          normalizeText(
            getPartyName(payment)
          ) ===
          normalizeText(
            partyName
          )
      );
    }, [
      payments,
      partyName,
    ]);

  const partyReceived =
    partyPayments.reduce(
      (sum, payment) =>
        sum +
        Math.max(
          0,
          Number(
            payment?.amount
          ) || 0
        ),
      0
    );

  const partyBilled = trips
    .filter(
      (trip) =>
        normalizeText(
          trip?.partyName
        ) ===
        normalizeText(
          partyName
        )
    )
    .reduce(
      (sum, trip) =>
        sum + getAmount(trip),
      0
    );

  const rawPartyOutstanding =
    partyBilled -
    partyReceived;

  const partyOutstanding =
    rawPartyOutstanding > 0.005
      ? Number(
          rawPartyOutstanding.toFixed(
            2
          )
        )
      : 0;

  /* =======================================================
     BUSINESS EDITOR
     ======================================================= */

  const toggleBusinessEditor = () => {
    if (!businessOpen) {
      setBusinessDraft({
        ...DEFAULT_BUSINESS,
        ...business,
      });
    }

    setBusinessOpen(
      (value) => !value
    );
  };

  /* =======================================================
     SAVE BUSINESS
     ======================================================= */

  const saveBusiness = () => {
    const cleanBusiness = {
      ...DEFAULT_BUSINESS,
      ...businessDraft,
    };

    const saved = writeStorage(
      BUSINESS_KEY,
      cleanBusiness
    );

    if (!saved) {
      setError(
        "Unable to save business details."
      );
      return;
    }

    setBusiness(
      cleanBusiness
    );

    setBusinessDraft(
      cleanBusiness
    );

    setMessage(
      "Business details saved successfully."
    );

    setError("");

    setTimeout(
      () => setMessage(""),
      2500
    );
  };

  /* =======================================================
     IMAGE UPLOAD
     ======================================================= */

  const handleBusinessImage = (
    event,
    field
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Please select a PNG, JPG or WEBP image."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      setError(
        "Image size must be less than 2 MB."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = (e) => {
      setBusinessDraft(
        (current) => ({
          ...current,
          [field]:
            e.target.result,
        })
      );

      setError("");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  const removeBusinessImage = (
    field
  ) => {
    setBusinessDraft(
      (current) => ({
        ...current,
        [field]: "",
      })
    );
  };

  /* =======================================================
     NEW INVOICE
     ======================================================= */

  const resetInvoice = () => {
    setEditingInvoiceId(null);

    setSelectedHistoryInvoice(
      null
    );

    setPreviewOpen(false);

    setInvoiceNumber(
      generateNextInvoiceNumber()
    );

    setInvoiceDate(
      todayISO()
    );

    setPartyName("");
    setPartyMobile("");
    setPartyAddress("");
    setPartyGSTIN("");

    setPartySearchOpen(false);

    setSelectedTripIndexes([]);

    setTripSearchBy("Party");
    setTripSearchQuery("");
    setTripSearchFrom("");
    setTripSearchTo("");
    setShowTripSuggestions(false);

    setDiscountEnabled(false);
    setDiscount("");

    setCustomChargeEnabled(
      false
    );

    setCustomChargeName(
      "Other Charges"
    );

    setCustomChargeAmount("");

    setGstEnabled(false);
    setGstRate("18");

    setReceivedAmount("");

    setNotes("");

    setError("");
    setMessage("");
  };

  /* =======================================================
     VALIDATE INVOICE
     ======================================================= */

  const validateInvoice = () => {
    if (!invoiceNumber.trim()) {
      return "Invoice number is required.";
    }

    if (!invoiceDate) {
      return "Invoice date is required.";
    }

    if (!partyName.trim()) {
      return "Party name is required.";
    }

    if (
      selectedTrips.length ===
      0
    ) {
      return "Select at least one billable trip.";
    }

    const selectedPartyNames = [
      ...new Set(
        selectedTrips
          .map((trip) =>
            normalizeText(
              trip?.partyName
            )
          )
          .filter(Boolean)
      ),
    ];

    if (
      selectedPartyNames.length >
      1
    ) {
      return "Please select trips from one party only.";
    }

    if (
      selectedPartyNames.length ===
        1 &&
      normalizeText(
        partyName
      ) !==
        selectedPartyNames[0]
    ) {
      return "Selected trips belong to a different party.";
    }

    if (
      discountEnabled &&
      discountAmount > subtotal
    ) {
      return "Discount cannot be greater than subtotal.";
    }

    if (
      customChargeEnabled &&
      customCharge > 0 &&
      !customChargeName.trim()
    ) {
      return "Enter custom charge name.";
    }

    if (
      received > 0 &&
      grandTotal <= 0
    ) {
      return "Received amount cannot be added to a zero invoice.";
    }

    return "";
  };

  /* =======================================================
     DUPLICATE NUMBER
     ======================================================= */

  const invoiceNumberExists = (
    number,
    ignoreId = null
  ) => {
    return invoiceHistory.some(
      (invoice) =>
        normalizeText(
          invoice?.invoiceNumber
        ) ===
          normalizeText(number) &&
        invoice?.id !== ignoreId
    );
  };

  /* =======================================================
     BUILD INVOICE OBJECT
     ======================================================= */

  const buildInvoiceObject = (
    finalInvoiceNumber
  ) => {
    const rows =
      selectedTripRows.map(
        ({ trip, index }) => {
          const amount =
            getAmount(trip);

          const quantity =
            getQuantity(trip);

          const rate =
            getRate(trip);

          const vehicle =
            getVehicleNumber(
              trip
            );

          const tractor =
            tractorMap.get(
              normalizeText(
                vehicle
              )
            );

          return {
            tripIndex: index,

            tripId:
              trip?.id ||
              trip?.tripId ||
              null,

            date:
              trip?.date ||
              invoiceDate,

            vehicleNumber:
              vehicle,

            tractorName:
              tractor?.tractorName ||
              tractor?.model ||
              "",

            partyName:
              trip?.partyName ||
              partyName,

            tripType:
              getTripTypeSafe(
                trip
              ),

            description:
              getTripDescription(
                trip
              ),

            site:
              getTripSite(trip),

            quantity,
            rate,
            amount,
          };
        }
      );

    const existingInvoice =
      editingInvoiceId
        ? invoiceHistory.find(
            (invoice) =>
              invoice.id ===
              editingInvoiceId
          )
        : null;

    return {
      id:
        editingInvoiceId ||
        `INV-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      invoiceNumber:
        finalInvoiceNumber,

      invoiceDate,

      partyName:
        partyName.trim(),

      partyMobile:
        partyMobile.trim(),

      partyAddress:
        partyAddress.trim(),

      partyGSTIN:
        partyGSTIN.trim(),

      items: rows,

      subtotal,

      discountEnabled,

      discount:
        discountAmount,

      customChargeEnabled,

      customChargeName:
        customChargeName.trim(),

      customCharge,

      gstEnabled,

      gstRate:
        Number(gstRate) || 0,

      gstAmount,

      taxableAmount,

      grandTotal,

      received,

      due,

      advance,

      status:
        paymentStatus,

      notes:
        notes.trim(),

      business: {
        ...business,
      },

      createdAt:
        existingInvoice?.createdAt ||
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };
  };

  /* =======================================================
     SAVE INVOICE
     ======================================================= */

  const saveInvoice = () => {
    setError("");
    setMessage("");

    const validation =
      validateInvoice();

    if (validation) {
      setError(validation);
      return;
    }

    let finalInvoiceNumber =
      invoiceNumber.trim();

    if (!editingInvoiceId) {
      if (
        invoiceNumberExists(
          finalInvoiceNumber
        )
      ) {
        finalInvoiceNumber =
          reserveNextInvoiceNumber();

        setInvoiceNumber(
          finalInvoiceNumber
        );
      } else {
        const match =
          finalInvoiceNumber.match(
            /^SAT-\d{2}\d{2}(\d{4})$/
          );

        if (match) {
          const visibleSequence =
            Number(match[1]);

          const storedSequence =
            Number(
              localStorage.getItem(
                INVOICE_NUMBER_KEY
              )
            ) || -1;

          if (
            visibleSequence >
            storedSequence
          ) {
            localStorage.setItem(
              INVOICE_NUMBER_KEY,
              String(
                visibleSequence
              )
            );
          }
        }
      }
    } else if (
      invoiceNumberExists(
        finalInvoiceNumber,
        editingInvoiceId
      )
    ) {
      setError(
        "This invoice number is already used."
      );

      return;
    }

    const invoice =
      buildInvoiceObject(
        finalInvoiceNumber
      );

    let updatedHistory = [];

    if (editingInvoiceId) {
      updatedHistory =
        invoiceHistory.map(
          (item) =>
            item.id ===
            editingInvoiceId
              ? invoice
              : item
        );
    } else {
      updatedHistory = [
        invoice,
        ...invoiceHistory,
      ];
    }

    const saved = writeStorage(
      INVOICE_HISTORY_KEY,
      updatedHistory
    );

    if (!saved) {
      setError(
        "Unable to save invoice."
      );

      return;
    }

    setInvoiceHistory(
      updatedHistory
    );

    setSelectedHistoryInvoice(
      invoice
    );

    setPreviewOpen(true);

    setMessage(
      editingInvoiceId
        ? "Invoice updated successfully."
        : `Invoice ${finalInvoiceNumber} saved successfully.`
    );

    if (!editingInvoiceId) {
      const currentSequence =
        Number(
          localStorage.getItem(
            INVOICE_NUMBER_KEY
          )
        ) || -1;

      const match =
        finalInvoiceNumber.match(
          /^SAT-\d{2}\d{2}(\d{4})$/
        );

      if (match) {
        const sequence =
          Number(match[1]);

        if (
          sequence >
          currentSequence
        ) {
          localStorage.setItem(
            INVOICE_NUMBER_KEY,
            String(sequence)
          );
        }
      }
    }

    setEditingInvoiceId(
      invoice.id
    );

    setTimeout(
      () => setMessage(""),
      3000
    );
  };

  /* =======================================================
     EDIT HISTORY INVOICE
     ======================================================= */

  const editInvoice = (
    invoice
  ) => {
    if (!invoice) return;

    setEditingInvoiceId(
      invoice.id
    );

    setSelectedHistoryInvoice(
      null
    );

    setPreviewOpen(false);

    setInvoiceNumber(
      invoice.invoiceNumber ||
        generateNextInvoiceNumber()
    );

    setInvoiceDate(
      invoice.invoiceDate ||
        todayISO()
    );

    setPartyName(
      invoice.partyName || ""
    );

    setPartyMobile(
      invoice.partyMobile || ""
    );

    setPartyAddress(
      invoice.partyAddress || ""
    );

    setPartyGSTIN(
      invoice.partyGSTIN || ""
    );

    const indexes =
      Array.isArray(
        invoice.items
      )
        ? invoice.items
            .map((item) =>
              Number(
                item.tripIndex
              )
            )
            .filter(
              (index) =>
                Number.isInteger(
                  index
                ) &&
                trips[index]
            )
        : [];

    setSelectedTripIndexes(
      indexes
    );

    setDiscountEnabled(
      invoice.discountEnabled !==
        undefined
        ? Boolean(
            invoice.discountEnabled
          )
        : Number(
            invoice.discount
          ) > 0
    );

    setDiscount(
      invoice.discount
        ? String(
            invoice.discount
          )
        : ""
    );

    setCustomChargeEnabled(
      Boolean(
        invoice.customChargeEnabled
      )
    );

    setCustomChargeName(
      invoice.customChargeName ||
        "Other Charges"
    );

    setCustomChargeAmount(
      invoice.customCharge
        ? String(
            invoice.customCharge
          )
        : ""
    );

    setGstEnabled(
      Boolean(
        invoice.gstEnabled
      )
    );

    setGstRate(
      invoice.gstRate
        ? String(
            invoice.gstRate
          )
        : "18"
    );

    setReceivedAmount(
      invoice.received
        ? String(
            invoice.received
          )
        : ""
    );

    setNotes(
      invoice.notes || ""
    );

    setHistoryOpen(false);

    setError("");

    setMessage(
      "Invoice loaded for editing."
    );

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     DELETE HISTORY
     ======================================================= */

  const deleteInvoice = (
    invoice
  ) => {
    if (!invoice) return;

    const confirmed =
      window.confirm(
        `Delete invoice ${
          invoice.invoiceNumber || ""
        }?\n\nThis will remove the saved invoice from Invoice History. Trip and payment records will not be deleted.`
      );

    if (!confirmed) {
      return;
    }

    const updated =
      invoiceHistory.filter(
        (item) =>
          item.id !==
          invoice.id
      );

    const saved = writeStorage(
      INVOICE_HISTORY_KEY,
      updated
    );

    if (!saved) {
      setError(
        "Unable to delete invoice."
      );

      return;
    }

    setInvoiceHistory(
      updated
    );

    if (
      selectedHistoryInvoice?.id ===
      invoice.id
    ) {
      setSelectedHistoryInvoice(
        null
      );

      setPreviewOpen(false);
    }

    if (
      editingInvoiceId ===
      invoice.id
    ) {
      resetInvoice();
    }

    setMessage(
      "Invoice deleted from history."
    );

    setTimeout(
      () => setMessage(""),
      2500
    );
  };

  /* =======================================================
     PREVIEW
     ======================================================= */

  const previewCurrentInvoice =
    () => {
      const validation =
        validateInvoice();

      if (validation) {
        setError(validation);
        return;
      }

      const previewInvoice =
        buildInvoiceObject(
          invoiceNumber.trim()
        );

      setSelectedHistoryInvoice(
        previewInvoice
      );

      setPreviewOpen(true);

      setError("");
    };

  const previewHistoryInvoice = (
    invoice
  ) => {
    setSelectedHistoryInvoice(
      invoice
    );

    setPreviewOpen(true);
  };

  /* =======================================================
     PRINT
     ======================================================= */

  const printInvoice = () => {
    setTimeout(() => {
      window.print();
    }, 80);
  };

  /* =======================================================
     HISTORY
     ======================================================= */

  const filteredHistory =
    useMemo(() => {
      const search =
        normalizeText(
          historySearch
        );

      return [
        ...invoiceHistory,
      ]
        .filter((invoice) => {
          if (
            historyStatus !==
              "All" &&
            invoice.status !==
              historyStatus
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return (
            normalizeText(
              invoice.invoiceNumber
            ).includes(search) ||
            normalizeText(
              invoice.partyName
            ).includes(search)
          );
        })
        .sort(
          (a, b) =>
            getDateValue(
              b.updatedAt ||
                b.createdAt ||
                b.invoiceDate
            ) -
            getDateValue(
              a.updatedAt ||
                a.createdAt ||
                a.invoiceDate
            )
        );
    }, [
      invoiceHistory,
      historySearch,
      historyStatus,
    ]);

  /* =======================================================
     HISTORY TOTALS
     ======================================================= */

  const historyTotals =
    useMemo(() => {
      return filteredHistory.reduce(
        (summary, invoice) => {
          summary.total += 1;

          summary.billed +=
            Number(
              invoice?.grandTotal
            ) || 0;

          summary.received +=
            Number(
              invoice?.received
            ) || 0;

          const invoiceDue =
            Number(
              invoice?.due
            ) || 0;

          summary.due +=
            invoiceDue > 0.005
              ? Number(
                  invoiceDue.toFixed(
                    2
                  )
                )
              : 0;

          return summary;
        },
        {
          total: 0,
          billed: 0,
          received: 0,
          due: 0,
        }
      );
    }, [filteredHistory]);

  /* =======================================================
     EXPORT HISTORY
     ======================================================= */

  const exportHistoryCSV = () => {
    if (
      filteredHistory.length ===
      0
    ) {
      setError(
        "No invoices available to export."
      );

      return;
    }

    const headers = [
      "Invoice Number",
      "Date",
      "Party",
      "Status",
      "Subtotal",
      "Discount",
      "GST",
      "Grand Total",
      "Received",
      "Due",
      "Advance",
    ];

    const rows =
      filteredHistory.map(
        (invoice) => [
          invoice.invoiceNumber,
          invoice.invoiceDate,
          invoice.partyName,
          invoice.status,
          invoice.subtotal,
          invoice.discount,
          invoice.gstAmount,
          invoice.grandTotal,
          invoice.received,
          invoice.due,
          invoice.advance,
        ]
      );

    const escapeCSV = (
      value
    ) => {
      const text =
        String(value ?? "");

      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    };

    const csv = [
      headers
        .map(escapeCSV)
        .join(","),
      ...rows.map(
        (row) =>
          row
            .map(escapeCSV)
            .join(",")
      ),
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

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `SAO-AUTO-TRACTOR-Invoice-History-${todayISO()}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );

    setMessage(
      "Invoice history exported."
    );

    setTimeout(
      () => setMessage(""),
      2500
    );
  };

  /* =======================================================
     CURRENT INVOICE OBJECT
     ======================================================= */

  const currentPreviewInvoice =
    selectedHistoryInvoice ||
    buildInvoiceObject(
      invoiceNumber ||
        generateNextInvoiceNumber()
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="invoice-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="invoice-page-header">
        <div>
          <div className="invoice-eyebrow">
            FINANCE / INVOICE
          </div>

          <h1>Invoice</h1>

          <p>
            Create professional transport invoices,
            track payments and keep invoice history.
          </p>
        </div>

        <div className="invoice-header-actions">
          <button
            type="button"
            className="invoice-btn invoice-btn-light"
            onClick={() =>
              setHistoryOpen(true)
            }
          >
            <History size={15} />
            Invoice History
          </button>

          <button
            type="button"
            className="invoice-btn invoice-btn-light"
            onClick={resetInvoice}
          >
            <FilePlus2 size={15} />
            New Invoice
          </button>

          <button
            type="button"
            className="invoice-btn invoice-btn-primary"
            onClick={
              previewCurrentInvoice
            }
          >
            <Eye size={15} />
            Preview Invoice
          </button>
        </div>
      </header>

      {/* ===================================================
          MESSAGE
      =================================================== */}

      {message && (
        <div className="invoice-message">
          <Check size={14} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="invoice-error">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* ===================================================
          OVERVIEW
      =================================================== */}

      <section className="invoice-overview">

        <div className="invoice-overview-card">
          <div className="invoice-overview-icon">
            <IndianRupee size={17} />
          </div>

          <div>
            <span>Total</span>
            <strong>{currency(grandTotal)}</strong>
          </div>
        </div>

        <div className="invoice-overview-card">
          <div className="invoice-overview-icon">
            <Check size={17} />
          </div>

          <div>
            <span>Received</span>
            <strong>{currency(received)}</strong>
          </div>
        </div>

        <div className="invoice-overview-card">
          <div className="invoice-overview-icon">
            <ReceiptText size={17} />
          </div>

          <div>
            <span>Due</span>
            <strong>{currency(due)}</strong>
          </div>
        </div>

        <div className="invoice-overview-card">
          <div className="invoice-overview-icon">
            <UserRound size={17} />
          </div>

          <div>
            {/* FIX 2: Clearer label — this is the overall
                party balance, not this invoice's balance. */}
            <span>Party Outstanding (Overall)</span>
            <strong>
              {currency(
                partyOutstanding
              )}
            </strong>
          </div>
        </div>

      </section>

      {/* ===================================================
          BUSINESS DETAILS
      =================================================== */}

      <section className="invoice-card">

        <div className="invoice-card-title">
          <div>
            <div className="section-kicker">
              BUSINESS IDENTITY
            </div>

            <h2>Business Details</h2>

            <p>
              Manage the business information that
              appears on your invoice.
            </p>
          </div>

          <div className="business-actions">
            <button
              type="button"
              className="business-collapse-btn"
              onClick={
                toggleBusinessEditor
              }
            >
              {businessOpen ? (
                <ChevronUp size={15} />
              ) : (
                <ChevronDown size={15} />
              )}

              {businessOpen
                ? "Hide Editor"
                : "Edit Details"}
            </button>
          </div>
        </div>

        <div className="business-summary">

          {business.logo ? (
            <img
              src={business.logo}
              alt="Business Logo"
              className="business-summary-logo"
            />
          ) : (
            <div className="business-summary-logo business-summary-placeholder">
              <Building2 size={24} />
            </div>
          )}

          <div className="business-summary-content">
            <strong>
              {business.businessName ||
                "SAO AUTO TRACTOR"}
            </strong>

            {business.ownerName && (
              <span>
                Owner: {business.ownerName}
              </span>
            )}

            {business.mobile && (
              <span>
                Mobile: {business.mobile}
              </span>
            )}

            {business.gstin && (
              <span>
                GSTIN: {business.gstin}
              </span>
            )}
          </div>
        </div>

        {businessOpen && (
          <div className="business-editor">

            <div className="business-form-grid">

              <div className="invoice-field">
                <label>Business Name</label>

                <input
                  value={
                    businessDraft.businessName
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        businessName:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>Owner Name</label>

                <input
                  value={
                    businessDraft.ownerName
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        ownerName:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field business-wide">
                <label>Address</label>

                <textarea
                  rows="3"
                  value={
                    businessDraft.address
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        address:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>Mobile</label>

                <input
                  value={
                    businessDraft.mobile
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        mobile:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>Alternate Mobile</label>

                <input
                  value={
                    businessDraft.alternateMobile
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        alternateMobile:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>Email</label>

                <input
                  type="email"
                  value={
                    businessDraft.email
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        email:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>GSTIN</label>

                <input
                  value={
                    businessDraft.gstin
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        gstin:
                          e.target.value.toUpperCase(),
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>UPI ID</label>

                <input
                  value={
                    businessDraft.upiId
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        upiId:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>Bank Name</label>

                <input
                  value={
                    businessDraft.bankName
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        bankName:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>Account Number</label>

                <input
                  value={
                    businessDraft.accountNumber
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        accountNumber:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>IFSC</label>

                <input
                  value={
                    businessDraft.ifsc
                  }
                  onChange={(e) =>
                    setBusinessDraft(
                      (current) => ({
                        ...current,
                        ifsc:
                          e.target.value.toUpperCase(),
                      })
                    )
                  }
                />
              </div>

              {/* BUSINESS LOGO */}

              <div className="upload-box">
                <div className="upload-box-header">
                  <div>
                    <strong>Business Logo</strong>
                    <span>
                      PNG, JPG or WEBP · Max 2 MB
                    </span>
                  </div>

                  <Building2 size={18} />
                </div>

                {businessDraft.logo ? (
                  <div className="business-upload-preview">
                    <img
                      src={
                        businessDraft.logo
                      }
                      alt="Business Logo"
                    />

                    <button
                      type="button"
                      className="upload-remove-btn"
                      onClick={() =>
                        removeBusinessImage(
                          "logo"
                        )
                      }
                    >
                      <X size={14} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="upload-input-label">
                    <Plus size={16} />
                    Upload Logo

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        handleBusinessImage(
                          e,
                          "logo"
                        )
                      }
                    />
                  </label>
                )}
              </div>

              {/* QR CODE */}

              <div className="upload-box">
                <div className="upload-box-header">
                  <div>
                    <strong>Payment QR Code</strong>
                    <span>
                      For invoice payment section
                    </span>
                  </div>

                  <QrCode size={18} />
                </div>

                {businessDraft.qrCode ? (
                  <div className="business-upload-preview">
                    <img
                      src={
                        businessDraft.qrCode
                      }
                      alt="Payment QR Code"
                    />

                    <button
                      type="button"
                      className="upload-remove-btn"
                      onClick={() =>
                        removeBusinessImage(
                          "qrCode"
                        )
                      }
                    >
                      <X size={14} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="upload-input-label">
                    <Plus size={16} />
                    Upload QR Code

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        handleBusinessImage(
                          e,
                          "qrCode"
                        )
                      }
                    />
                  </label>
                )}
              </div>

              {/* SIGNATURE */}

              <div className="upload-box">
                <div className="upload-box-header">
                  <div>
                    <strong>Authorised Signature</strong>
                    <span>
                      Appears above the signature line
                    </span>
                  </div>

                  <Pencil size={18} />
                </div>

                {businessDraft.signature ? (
                  <div className="business-upload-preview">
                    <img
                      src={
                        businessDraft.signature
                      }
                      alt="Authorised Signature"
                    />

                    <button
                      type="button"
                      className="upload-remove-btn"
                      onClick={() =>
                        removeBusinessImage(
                          "signature"
                        )
                      }
                    >
                      <X size={14} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="upload-input-label">
                    <Plus size={16} />
                    Upload Signature

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        handleBusinessImage(
                          e,
                          "signature"
                        )
                      }
                    />
                  </label>
                )}
              </div>

            </div>

            <div className="business-editor-footer">
              <button
                type="button"
                className="invoice-btn invoice-btn-primary"
                onClick={saveBusiness}
              >
                <Check size={15} />
                Save Business Details
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================
          INVOICE BASIC DETAILS
      =================================================== */}

      <section className="invoice-card">

        <div className="invoice-card-title">
          <div>
            <div className="section-kicker">
              DOCUMENT DETAILS
            </div>

            <h2>Invoice Information</h2>

            <p>
              Set invoice number, date and party information.
            </p>
          </div>

          {editingInvoiceId && (
            <div className="editing-badge">
              <Pencil size={13} />
              Editing Invoice
            </div>
          )}
        </div>

        <div className="invoice-form-grid">

          {/* INVOICE NUMBER */}

          <div className="invoice-field">
            <label>Invoice Number</label>

            <div className="invoice-number-control">
              <input
                value={invoiceNumber}
                onChange={(e) =>
                  setInvoiceNumber(
                    e.target.value
                  )
                }
                placeholder="SAT-09260000"
              />

              <button
                type="button"
                className="generate-number-btn"
                onClick={() =>
                  setInvoiceNumber(
                    generateNextInvoiceNumber()
                  )
                }
              >
                <RefreshCw size={14} />
                Generate
              </button>
            </div>
          </div>

          {/* DATE */}

          <div className="invoice-field">
            <label>Invoice Date</label>

            <div className="invoice-input-icon">
              <CalendarDays size={15} />

              <input
                type="date"
                value={invoiceDate}
                onChange={(e) =>
                  setInvoiceDate(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* PARTY */}

          <div className="invoice-field party-field">
            <label>Party Name</label>

            <div className="party-search-field">
              <Search size={15} />

              <input
                value={partyName}
                onChange={(e) => {
                  setPartyName(
                    e.target.value
                  );

                  setPartySearchOpen(
                    true
                  );
                }}
                onFocus={() =>
                  setPartySearchOpen(
                    true
                  )
                }
                placeholder="Search or enter party"
              />
            </div>

            {partySearchOpen &&
              filteredPartySuggestions.length >
                0 && (
                <div className="party-dropdown">
                  {filteredPartySuggestions.map(
                    (party) => (
                      <button
                        type="button"
                        key={
                          party.name
                        }
                        className="party-suggestion"
                        onClick={() =>
                          selectParty(
                            party
                          )
                        }
                      >
                        <span>
                          {party.name}
                        </span>

                        {party.mobile && (
                          <small>
                            {party.mobile}
                          </small>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}

            {partyName &&
              !exactPartyMatch && (
                <div className="party-match-status party-match-new">
                  <Plus size={12} />
                  New party / manual entry
                </div>
              )}

            {exactPartyMatch && (
              <div className="party-match-status party-match-found">
                <Check size={12} />
                Party matched
              </div>
            )}
          </div>

          {/* PARTY MOBILE */}

          <div className="invoice-field">
            <label>Party Mobile</label>

            <input
              value={partyMobile}
              onChange={(e) =>
                setPartyMobile(
                  e.target.value
                )
              }
              placeholder="Mobile number"
            />
          </div>

          {/* PARTY ADDRESS */}

          <div className="invoice-field business-wide">
            <label>Party Address</label>

            <textarea
              rows="2"
              value={partyAddress}
              onChange={(e) =>
                setPartyAddress(
                  e.target.value
                )
              }
              placeholder="Party billing address"
            />
          </div>

          {/* PARTY GST */}

          <div className="invoice-field">
            <label>Party GSTIN</label>

            <input
              value={partyGSTIN}
              onChange={(e) =>
                setPartyGSTIN(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="GSTIN"
            />
          </div>

        </div>

        {/* AUTO PARTY SUMMARY */}
        {partyName && (
          <div className="invoice-auto-party">

            <div>
              <span>PARTY</span>
              <strong>
                {partyName}
              </strong>
            </div>

            <div>
              <span>MOBILE</span>
              <strong>
                {partyMobile || "-"}
              </strong>
            </div>

            <div>
              <span>ADDRESS</span>
              <strong>
                {partyAddress || "-"}
              </strong>
            </div>

            <div>
              <span>GSTIN</span>
              <strong>
                {partyGSTIN || "-"}
              </strong>
            </div>

          </div>
        )}

        {/* ===================================================
            PARTY FINANCIAL SUMMARY
        =================================================== */}
        {partyName && (
          <div className="party-financial-summary">
            <div className="party-financial-header">
              <span>PARTY FINANCIAL SUMMARY</span>
              <strong>{partyName}</strong>
            </div>
            <div className="party-financial-grid">
              <div className="party-financial-item">
                <span>Total Billed</span>
                <strong>{currency(partyBilled)}</strong>
              </div>
              <div className="party-financial-item">
                <span>Total Received</span>
                <strong>{currency(partyReceived)}</strong>
              </div>
              <div className="party-financial-item party-financial-due">
                <span>Outstanding</span>
                <strong>{currency(partyOutstanding)}</strong>
              </div>
            </div>
          </div>
        )}

      </section>

      {/* ===================================================
          TRIP SELECTION
      =================================================== */}

      <section className="invoice-card">

        <div className="invoice-card-title">
          <div>
            <div className="section-kicker">
              BILLABLE WORK
            </div>

            <h2>Select Trip Records</h2>

            <p>
              Select the transport records that should appear
              on this invoice.
            </p>
          </div>

          <div className="invoice-card-actions">
            <button
              type="button"
              className="invoice-btn invoice-btn-secondary"
              onClick={
                selectPartyTrips
              }
            >
              <ClipboardList size={14} />
              Select Party Trips
            </button>

            <button
              type="button"
              className="invoice-btn invoice-btn-light"
              onClick={
                clearSelectedTrips
              }
            >
              <X size={14} />
              Clear
            </button>
          </div>
        </div>

        {/* SEARCH PANEL */}

        <div className="invoice-trip-search-panel">

          <div className="invoice-trip-search-head">
            <div>
              <span>
                SEARCH & SELECT
              </span>

              <h3>
                Find Trip Records
              </h3>
            </div>

            <button
              type="button"
              className="trip-search-reset"
              onClick={
                clearTripSearch
              }
            >
              <RefreshCw size={13} />
              Reset Search
            </button>
          </div>

          <div className="invoice-trip-search-controls">

            <div className="invoice-field">
              <label>Search By</label>

              <select
                value={tripSearchBy}
                onChange={(e) => {
                  setTripSearchBy(
                    e.target.value
                  );
                  setTripSearchQuery("");
                  setTripSearchFrom("");
                  setTripSearchTo("");
                  setShowTripSuggestions(false);
                }}
              >
                <option value="Party">
                  Party
                </option>

                <option value="Tractor">
                  Tractor
                </option>

                <option value="Date">
                  Date
                </option>
              </select>
            </div>

            {tripSearchBy !==
            "Date" ? (
              <div className="invoice-field invoice-search-input-field">
                <label>
                  {tripSearchBy ===
                  "Party"
                    ? "Party Name"
                    : "Vehicle Number"}
                </label>

                <div className="invoice-input-icon">
                  <Search size={15} />

                  <input
                    value={
                      tripSearchQuery
                    }
                    onChange={(e) => {
                      setTripSearchQuery(
                        e.target.value
                      );
                      setShowTripSuggestions(true);
                    }}
                    onFocus={() =>
                      setShowTripSuggestions(true)
                    }
                    onBlur={() =>
                      setTimeout(
                        () =>
                          setShowTripSuggestions(
                            false
                          ),
                        200
                      )
                    }
                    placeholder={
                      tripSearchBy ===
                      "Party"
                        ? "Search party"
                        : "Search tractor"
                    }
                  />
                </div>

                {/* Trip search suggestions dropdown */}
                {showTripSuggestions &&
                  tripSearchQuery.trim() &&
                  tripSearchBy !== "Date" && (
                    <div className="party-dropdown trip-suggestions-dropdown">
                      {(() => {
                        const query =
                          normalizeText(
                            tripSearchQuery
                          );
                        let suggestions = [];
                        if (tripSearchBy === "Party") {
                          const partySet = new Set();
                          billableTrips.forEach(({ trip }) => {
                            const name = trip?.partyName || "";
                            if (name) partySet.add(name.trim());
                          });
                          suggestions = Array.from(partySet)
                            .filter((name) =>
                              normalizeText(name).includes(query)
                            )
                            .slice(0, 10)
                            .map((name) => ({ label: name, value: name }));
                        } else if (tripSearchBy === "Tractor") {
                          const tractorSet = new Set();
                          billableTrips.forEach(({ trip }) => {
                            const vehicle = getVehicleNumber(trip);
                            if (vehicle) tractorSet.add(vehicle);
                          });
                          suggestions = Array.from(tractorSet)
                            .filter((v) =>
                              normalizeText(v).includes(query)
                            )
                            .slice(0, 10)
                            .map((v) => ({ label: v, value: v }));
                        }
                        return suggestions.map((item) => (
                          <button
                            type="button"
                            key={item.value}
                            className="party-suggestion"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setTripSearchQuery(item.value);
                              setShowTripSuggestions(false);
                            }}
                          >
                            <span>{item.label}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
              </div>
            ) : (
              <>
                <div className="invoice-field">
                  <label>From Date</label>

                  <input
                    type="date"
                    value={
                      tripSearchFrom
                    }
                    onChange={(e) =>
                      setTripSearchFrom(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="invoice-field">
                  <label>To Date</label>

                  <input
                    type="date"
                    value={
                      tripSearchTo
                    }
                    onChange={(e) =>
                      setTripSearchTo(
                        e.target.value
                      )
                    }
                  />
                </div>
              </>
            )}

          </div>

          <div className="invoice-search-result-bar">

            <div>
              <strong>
                {filteredTripRecords.length}
              </strong>

              <span>
                matching records
              </span>
            </div>

            <div>
              <strong>
                {selectedVisibleCount}
              </strong>

              <span>
                selected
              </span>
            </div>

            <button
              type="button"
              className="invoice-btn invoice-btn-primary"
              onClick={
                selectVisibleTrips
              }
            >
              <Check size={14} />
              Select Matching Trips
            </button>
          </div>
        </div>

        {/* TRIP STATS */}

        <div className="invoice-filter-box">

          <div className="invoice-stat">
            <span>Billable Records</span>
            <strong>
              {billableTrips.length}
            </strong>
          </div>

          <div className="invoice-stat">
            <span>Selected</span>
            <strong>
              {selectedTrips.length}
            </strong>
          </div>

          <div className="invoice-stat">
            <span>Selected Value</span>
            <strong>
              {currency(subtotal)}
            </strong>
          </div>

          <div className="invoice-stat">
            <span>Party Bills</span>
            <strong>
              {currency(partyBilled)}
            </strong>
          </div>

          <div className="invoice-stat">
            <span>Party Received</span>
            <strong>
              {currency(partyReceived)}
            </strong>
          </div>

        </div>

        {/* TRIP TABLE */}

        {filteredTripRecords.length ===
        0 ? (
          <div className="invoice-empty">
            <ClipboardList size={22} />

            <strong>
              No billable trip records found
            </strong>

            <span>
              Add billable transport records or change
              the search filters.
            </span>
          </div>
        ) : (
          <div className="invoice-table-wrapper">

            <table className="invoice-table">

              <thead>
                <tr>
                  <th>Select</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Party</th>
                  <th>Type</th>
                  <th>Work / Site</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {filteredTripRecords.map(
                  ({
                    trip,
                    index,
                    amount,
                  }) => {
                    const selected =
                      selectedTripIndexes.includes(
                        index
                      );

                    return (
                      <tr
                        key={
                          trip?.id ||
                          trip?.tripId ||
                          index
                        }
                        className={
                          selected
                            ? "invoice-row-selected"
                            : ""
                        }
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="invoice-checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleTrip(
                                index
                              )
                            }
                          />
                        </td>

                        <td>
                          {formatDate(
                            trip?.date ||
                              trip?.createdAt
                          )}
                        </td>

                        <td>
                          <strong>
                            {getVehicleNumber(
                              trip
                            ) || "-"}
                          </strong>
                        </td>

                        <td>
                          {trip?.partyName ||
                            "-"}
                        </td>

                        <td>
                          <span
                            className={`trip-type-badge trip-type-${normalizeText(
                              getTripTypeSafe(
                                trip
                              )
                            ).replace(
                              /\s+/g,
                              "-"
                            )}`}
                          >
                            {getTripTypeSafe(
                              trip
                            )}
                          </span>
                        </td>

                        <td>
                          <div>
                            <strong>
                              {getTripDescription(
                                trip
                              )}
                            </strong>

                            {getTripSite(
                              trip
                            ) && (
                              <small className="trip-site">
                                {getTripSite(
                                  trip
                                )}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          {getQuantity(
                            trip
                          )}
                        </td>

                        <td>
                          {currency(
                            getRate(
                              trip
                            )
                          )}
                        </td>

                        <td className="table-amount">
                          {currency(
                            amount
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>

            </table>
          </div>
        )}
      </section>

      {/* ===================================================
          CALCULATION
      =================================================== */}

      <section className="invoice-card">

        <div className="invoice-card-title">
          <div>
            <div className="section-kicker">
              BILLING
            </div>

            <h2>Invoice Calculation</h2>

            <p>
              Apply discounts, charges, GST and payment
              details before saving the invoice.
            </p>
          </div>
        </div>

        <div className="invoice-calculation-layout">

          <div className="invoice-calculation-main">

            <div className="invoice-summary-row">
              <span>Subtotal</span>
              <strong>
                {currency(subtotal)}
              </strong>
            </div>

            {/* DISCOUNT */}

            <div className="invoice-option">

              <div className="invoice-option-main">
                <div>
                  <strong>Discount</strong>
                  <span>
                    Reduce the invoice subtotal
                  </span>
                </div>

                <button
                  type="button"
                  className={`invoice-toggle ${
                    discountEnabled
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => {
                    setDiscountEnabled(
                      (value) =>
                        !value
                    );

                    if (
                      discountEnabled
                    ) {
                      setDiscount("");
                    }
                  }}
                  aria-pressed={
                    discountEnabled
                  }
                >
                  <span />
                </button>
              </div>

              {discountEnabled && (
                <div className="invoice-inline-input">
                  <span>₹</span>

                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* GST */}

            <div className="invoice-option">

              <div className="invoice-option-main">
                <div>
                  <strong>GST</strong>
                  <span>
                    Apply GST to taxable amount
                  </span>
                </div>

                <button
                  type="button"
                  className={`invoice-toggle ${
                    gstEnabled
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => {
                    setGstEnabled(
                      (value) =>
                        !value
                    );
                  }}
                  aria-pressed={
                    gstEnabled
                  }
                >
                  <span />
                </button>
              </div>

              {gstEnabled && (
                <div className="gst-control">
                  <label>GST Rate</label>

                  <select
                    value={gstRate}
                    onChange={(e) =>
                      setGstRate(
                        e.target.value
                      )
                    }
                  >
                    <option value="5">
                      5%
                    </option>

                    <option value="12">
                      12%
                    </option>

                    <option value="18">
                      18%
                    </option>

                    <option value="28">
                      28%
                    </option>
                  </select>
                </div>
              )}
            </div>

            {/* CUSTOM CHARGE */}

            <div className="invoice-option">

              <div className="invoice-option-main">
                <div>
                  <strong>
                    Custom Charge
                  </strong>

                  <span>
                    Add an extra charge
                  </span>
                </div>

                <button
                  type="button"
                  className={`invoice-toggle ${
                    customChargeEnabled
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => {
                    setCustomChargeEnabled(
                      (value) =>
                        !value
                    );
                  }}
                  aria-pressed={
                    customChargeEnabled
                  }
                >
                  <span />
                </button>
              </div>

              {customChargeEnabled && (
                <div className="invoice-custom-charge-fields">

                  <input
                    value={
                      customChargeName
                    }
                    onChange={(e) =>
                      setCustomChargeName(
                        e.target.value
                      )
                    }
                    placeholder="Charge name"
                  />

                  <div className="invoice-inline-input">
                    <span>₹</span>

                    <input
                      type="number"
                      min="0"
                      value={
                        customChargeAmount
                      }
                      onChange={(e) =>
                        setCustomChargeAmount(
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>

                </div>
              )}
            </div>

            <div className="invoice-summary-row">
              <span>Discount</span>

              <strong className="negative-value">
                {discountAmount > 0
                  ? `- ${currency(
                      discountAmount
                    )}`
                  : currency(0)}
              </strong>
            </div>

            <div className="invoice-summary-row">
              <span>
                {customChargeName ||
                  "Custom Charge"}
              </span>

              <strong>
                {currency(
                  customCharge
                )}
              </strong>
            </div>

            <div className="invoice-summary-row">
              <span>
                GST
                {gstEnabled &&
                  ` (${gstRate}%)`}
              </span>

              <strong>
                {currency(
                  gstAmount
                )}
              </strong>
            </div>

            {/* PAYMENT */}

            <div className="invoice-payment-entry">

              <div>
                <strong>
                  Received Amount
                </strong>

                <span>
                  Amount received against this invoice
                </span>
              </div>

              <div className="received-input">
                <span>₹</span>

                <input
                  type="number"
                  min="0"
                  value={
                    receivedAmount
                  }
                  onChange={(e) =>
                    setReceivedAmount(
                      e.target.value
                    )
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* NOTES */}

            <div className="invoice-field invoice-notes-field">
              <label>Invoice Notes</label>

              <textarea
                rows="5"
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="Optional notes, payment terms or instructions..."
              />
            </div>

          </div>

          {/* TOTAL PANEL */}

          <aside className="invoice-total-panel">

            <div className="total-panel-label">
              GRAND TOTAL
            </div>

            <div className="total-panel-amount">
              {currency(
                grandTotal
              )}
            </div>

            <div className="total-panel-row">
              <span>Subtotal</span>
              <strong>
                {currency(
                  subtotal
                )}
              </strong>
            </div>

            <div className="total-panel-row">
              <span>Discount</span>
              <strong>
                {discountAmount > 0
                  ? `- ${currency(
                      discountAmount
                    )}`
                  : currency(0)}
              </strong>
            </div>

            <div className="total-panel-row">
              <span>Charges</span>
              <strong>
                {currency(
                  customCharge
                )}
              </strong>
            </div>

            <div className="total-panel-row">
              <span>GST</span>
              <strong>
                {currency(
                  gstAmount
                )}
              </strong>
            </div>

            <div className="total-panel-divider" />

            <div className="total-panel-row">
              <span>Received</span>
              <strong>
                {currency(
                  received
                )}
              </strong>
            </div>

            {advance > 0 ? (
              <div className="total-panel-row total-panel-due">
                <span>Advance</span>

                <strong>
                  {currency(
                    advance
                  )}
                </strong>
              </div>
            ) : (
              <div className="total-panel-row total-panel-due">
                <span>Balance Due</span>

                <strong>
                  {currency(due)}
                </strong>
              </div>
            )}

            <div
              className={`invoice-status status-${normalizeText(
                paymentStatus
              ).replace(
                /\s+/g,
                "-"
              )}`}
            >
              {paymentStatus}
            </div>

          </aside>
        </div>
      </section>

      {/* ===================================================
          BOTTOM ACTIONS
      =================================================== */}

      <div className="invoice-bottom-actions">

        <div>
          <span>
            {editingInvoiceId
              ? "Editing saved invoice"
              : "Ready to save invoice"}
          </span>

          <strong>
            {invoiceNumber}
          </strong>
        </div>

        <div className="invoice-bottom-action-buttons">

          <button
            type="button"
            className="invoice-btn invoice-btn-light"
            onClick={() =>
              setHistoryOpen(true)
            }
          >
            <History size={15} />
            History
          </button>

          <button
            type="button"
            className="invoice-btn invoice-btn-light"
            onClick={resetInvoice}
          >
            <RefreshCw size={15} />
            Reset
          </button>

          <button
            type="button"
            className="invoice-btn invoice-btn-secondary"
            onClick={
              previewCurrentInvoice
            }
          >
            <Eye size={15} />
            Preview
          </button>

          <button
            type="button"
            className="invoice-btn invoice-btn-primary invoice-btn-large"
            onClick={
              saveInvoice
            }
          >
            {editingInvoiceId ? (
              <Check size={15} />
            ) : (
              <FileText size={15} />
            )}

            {editingInvoiceId
              ? "Update Invoice"
              : "Save Invoice"}
          </button>

        </div>
      </div>

      {/* ===================================================
          HISTORY MODAL
      =================================================== */}

      {historyOpen && (
        <div className="invoice-modal">

          <div
            className="invoice-modal-overlay"
            onClick={() =>
              setHistoryOpen(false)
            }
          />

          <div className="invoice-history-modal">

            <div className="invoice-modal-header">

              <div>
                <div className="section-kicker">
                  SAVED DOCUMENTS
                </div>

                <h2>
                  Invoice History
                </h2>

                <p>
                  Search, preview, edit or export saved invoices.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() =>
                  setHistoryOpen(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* HISTORY TOOLBAR */}

            <div className="history-toolbar">

              <div className="history-search">
                <Search size={15} />

                <input
                  value={
                    historySearch
                  }
                  onChange={(e) =>
                    setHistorySearch(
                      e.target.value
                    )
                  }
                  placeholder="Search invoice or party..."
                />
              </div>

              <select
                value={
                  historyStatus
                }
                onChange={(e) =>
                  setHistoryStatus(
                    e.target.value
                  )
                }
              >
                <option value="All">
                  All Status
                </option>

                <option value="Paid">
                  Paid
                </option>

                <option value="Partially Paid">
                  Partially Paid
                </option>

                <option value="Unpaid">
                  Unpaid
                </option>

                <option value="Advance">
                  Advance
                </option>

                <option value="Draft">
                  Draft
                </option>
              </select>

              <button
                type="button"
                className="invoice-btn invoice-btn-secondary"
                onClick={
                  exportHistoryCSV
                }
              >
                <Download size={14} />
                Export CSV
              </button>

            </div>

            {/* HISTORY SUMMARY */}

            <div className="history-summary-grid">

              <div className="invoice-stat">
                <span>Invoices</span>
                <strong>
                  {historyTotals.total}
                </strong>
              </div>

              <div className="invoice-stat">
                <span>Billed</span>
                <strong>
                  {currency(
                    historyTotals.billed
                  )}
                </strong>
              </div>

              <div className="invoice-stat">
                <span>Received</span>
                <strong>
                  {currency(
                    historyTotals.received
                  )}
                </strong>
              </div>

              <div className="invoice-stat">
                <span>Due</span>
                <strong>
                  {currency(
                    historyTotals.due
                  )}
                </strong>
              </div>

            </div>

            {/* HISTORY TABLE */}

            {filteredHistory.length ===
            0 ? (
              <div className="invoice-history-empty">
                <FileText size={26} />

                <strong>
                  No invoices found
                </strong>

                <span>
                  Saved invoices will appear here.
                </span>
              </div>
            ) : (
              <div className="invoice-history-table-wrapper">

                <table className="invoice-history-table">

                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Party</th>
                      <th>Total</th>
                      <th>Received</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredHistory.map(
                      (invoice) => (
                        <tr
                          key={
                            invoice.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                invoice.invoiceNumber
                              }
                            </strong>
                          </td>

                          <td>
                            {formatDate(
                              invoice.invoiceDate
                            )}
                          </td>

                          <td>
                            {
                              invoice.partyName
                            }
                          </td>

                          <td>
                            {currency(
                              invoice.grandTotal
                            )}
                          </td>

                          <td>
                            {currency(
                              invoice.received
                            )}
                          </td>

                          <td>
                            {currency(
                              invoice.due
                            )}
                          </td>

                          <td>
                            <span
                              className={`history-status history-status-${normalizeText(
                                invoice.status
                              ).replace(
                                /\s+/g,
                                "-"
                              )}`}
                            >
                              {
                                invoice.status
                              }
                            </span>
                          </td>

                          <td>
                            <div className="history-actions">

                              <button
                                type="button"
                                title="Preview"
                                onClick={() =>
                                  previewHistoryInvoice(
                                    invoice
                                  )
                                }
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                title="Edit"
                                onClick={() =>
                                  editInvoice(
                                    invoice
                                  )
                                }
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                title="Print"
                                onClick={() => {
                                  setSelectedHistoryInvoice(
                                    invoice
                                  );

                                  setPreviewOpen(
                                    true
                                  );

                                  setTimeout(
                                    () =>
                                      window.print(),
                                    150
                                  );
                                }}
                              >
                                <Printer size={14} />
                              </button>

                              <button
                                type="button"
                                className="danger"
                                title="Delete"
                                onClick={() =>
                                  deleteInvoice(
                                    invoice
                                  )
                                }
                              >
                                <Trash2 size={14} />
                              </button>

                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ===================================================
          PREVIEW MODAL
      =================================================== */}

      {previewOpen && (
        <div className="invoice-modal">

          <div
            className="invoice-modal-overlay"
            onClick={() =>
              setPreviewOpen(false)
            }
          />

          <div className="invoice-preview">

            <div className="invoice-preview-toolbar">

              <div>
                <div className="section-kicker">
                  INVOICE PREVIEW
                </div>

                <h2>
                  {currentPreviewInvoice.invoiceNumber}
                </h2>

                <p>
                  Professional print-ready invoice
                </p>
              </div>

              <div className="invoice-preview-toolbar-actions">

                {currentPreviewInvoice.id && (
                  <button
                    type="button"
                    className="invoice-btn invoice-btn-secondary"
                    onClick={() =>
                      editInvoice(
                        currentPreviewInvoice
                      )
                    }
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}

                <button
                  type="button"
                  className="invoice-btn invoice-btn-primary"
                  onClick={
                    printInvoice
                  }
                >
                  <Printer size={14} />
                  Print
                </button>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() =>
                    setPreviewOpen(false)
                  }
                >
                  <X size={18} />
                </button>

              </div>
            </div>

            <div className="invoice-preview-scroll">

              <div className="print-invoice">

                {/* PRINT BUSINESS HEADER */}

                <div className="print-business-header">

                  <div className="print-business-left">

                    {currentPreviewInvoice.business?.logo && (
                      <img
                        src={
                          currentPreviewInvoice
                            .business
                            .logo
                        }
                        alt="Business Logo"
                        className="print-business-logo"
                      />
                    )}

                    <div>
                      <h1>
                        {currentPreviewInvoice
                          .business
                          ?.businessName ||
                          "SAO AUTO TRACTOR"}
                      </h1>

                      {currentPreviewInvoice
                        .business
                        ?.ownerName && (
                        <p>
                          {
                            currentPreviewInvoice
                              .business
                              .ownerName
                          }
                        </p>
                      )}

                      {currentPreviewInvoice
                        .business
                        ?.address && (
                        <p>
                          {
                            currentPreviewInvoice
                              .business
                              .address
                          }
                        </p>
                      )}

                      <p>
                        {currentPreviewInvoice
                          .business
                          ?.mobile &&
                          `Mob: ${currentPreviewInvoice.business.mobile}`}

                        {currentPreviewInvoice
                          .business
                          ?.alternateMobile &&
                          ` | ${currentPreviewInvoice.business.alternateMobile}`}
                      </p>

                      {currentPreviewInvoice
                        .business
                        ?.email && (
                        <p>
                          {
                            currentPreviewInvoice
                              .business
                              .email
                          }
                        </p>
                      )}

                      {currentPreviewInvoice
                        .business
                        ?.gstin && (
                        <p>
                          GSTIN:{" "}
                          {
                            currentPreviewInvoice
                              .business
                              .gstin
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="print-invoice-heading">

                    <span>
                      TAX / TRANSPORT INVOICE
                    </span>

                    <strong>
                      {
                        currentPreviewInvoice.invoiceNumber
                      }
                    </strong>

                    <small>
                      Date:{" "}
                      {formatDate(
                        currentPreviewInvoice.invoiceDate
                      )}
                    </small>

                    <em
                      className={`history-status history-status-${normalizeText(
                        currentPreviewInvoice.status
                      ).replace(
                        /\s+/g,
                        "-"
                      )}`}
                    >
                      {
                        currentPreviewInvoice.status
                      }
                    </em>
                  </div>
                </div>

                {/* BILL TO / SUMMARY */}

                <div className="print-info-grid">

                  <div className="print-info-box">

                    <span>
                      BILL TO
                    </span>

                    <strong>
                      {
                        currentPreviewInvoice.partyName
                      }
                    </strong>

                    {currentPreviewInvoice.partyMobile && (
                      <p>
                        Mobile:{" "}
                        {
                          currentPreviewInvoice.partyMobile
                        }
                      </p>
                    )}

                    {currentPreviewInvoice.partyAddress && (
                      <p>
                        {
                          currentPreviewInvoice.partyAddress
                        }
                      </p>
                    )}

                    {currentPreviewInvoice.partyGSTIN && (
                      <p>
                        GSTIN:{" "}
                        {
                          currentPreviewInvoice.partyGSTIN
                        }
                      </p>
                    )}
                  </div>

                  <div className="print-info-box">

                    <span>
                      INVOICE SUMMARY
                    </span>

                    <div>
                      <small>
                        Invoice Date
                      </small>

                      <strong>
                        {formatDate(
                          currentPreviewInvoice.invoiceDate
                        )}
                      </strong>
                    </div>

                    <div>
                      <small>
                        Records
                      </small>

                      <strong>
                        {
                          currentPreviewInvoice
                            .items
                            ?.length || 0
                        }
                      </strong>
                    </div>

                    <div>
                      <small>
                        Grand Total
                      </small>

                      <strong>
                        {currency(
                          currentPreviewInvoice.grandTotal
                        )}
                      </strong>
                    </div>
                  </div>

                </div>

                {/* TRIP TABLE */}

                <table className="print-table">

                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Work / Site</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(currentPreviewInvoice.items || []).map(
                      (item, index) => (
                        <tr
                          key={
                            item.tripId ||
                            `${item.tripIndex}-${index}`
                          }
                        >
                          <td>
                            {index + 1}
                          </td>

                          <td>
                            {formatDate(
                              item.date
                            )}
                          </td>

                          <td>
                            {
                              item.vehicleNumber
                            }
                          </td>

                          <td>
                            {
                              item.tripType
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                item.description
                              }
                            </strong>

                            {item.site && (
                              <small>
                                {
                                  item.site
                                }
                              </small>
                            )}
                          </td>

                          <td>
                            {
                              item.quantity
                            }
                          </td>

                          <td>
                            {currency(
                              item.rate
                            )}
                          </td>

                          <td>
                            {currency(
                              item.amount
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                </table>

                {/* BOTTOM GRID */}

                <div className="print-bottom-grid">

                  <div>

                    {/* NOTES */}

                    {currentPreviewInvoice.notes && (
                      <div className="print-notes-box">
                        <span>
                          NOTES
                        </span>

                        <p>
                          {
                            currentPreviewInvoice.notes
                          }
                        </p>
                      </div>
                    )}

                    {/* PAYMENT */}

                    <div className="print-payment-box">

                      <span>
                        PAYMENT DETAILS
                      </span>

                      {currentPreviewInvoice
                        .business
                        ?.upiId && (
                        <p>
                          UPI:{" "}
                          {
                            currentPreviewInvoice
                              .business
                              .upiId
                          }
                        </p>
                      )}

                      {currentPreviewInvoice
                        .business
                        ?.bankName && (
                        <p>
                          Bank:{" "}
                          {
                            currentPreviewInvoice
                              .business
                              .bankName
                          }
                        </p>
                      )}

                      {currentPreviewInvoice
                        .business
                        ?.accountNumber && (
                        <p>
                          A/C:{" "}
                          {
                            currentPreviewInvoice
                              .business
                              .accountNumber
                          }
                        </p>
                      )}

                      {currentPreviewInvoice
                        .business
                        ?.ifsc && (
                        <p>
                          IFSC:{" "}
                          {
                            currentPreviewInvoice
                              .business
                              .ifsc
                          }
                        </p>
                      )}

                      {currentPreviewInvoice
                        .business
                        ?.qrCode && (
                        <img
                          src={
                            currentPreviewInvoice
                              .business
                              .qrCode
                          }
                          alt="Payment QR"
                          className="print-qr"
                        />
                      )}
                    </div>
                  </div>

                  {/* TOTALS */}

                  <div className="print-totals-box">

                    <div>
                      <span>
                        Subtotal
                      </span>

                      <strong>
                        {currency(
                          currentPreviewInvoice.subtotal
                        )}
                      </strong>
                    </div>

                    {/* Show Discount only if enabled and > 0 */}
                    {currentPreviewInvoice.discountEnabled && currentPreviewInvoice.discount > 0 && (
                      <div>
                        <span>
                          Discount
                        </span>

                        <strong>
                          {`- ${currency(
                            currentPreviewInvoice.discount
                          )}`}
                        </strong>
                      </div>
                    )}

                    {/* Show Custom Charge only if enabled and > 0 */}
                    {currentPreviewInvoice.customChargeEnabled && currentPreviewInvoice.customCharge > 0 && (
                      <div>
                        <span>
                          {currentPreviewInvoice.customChargeName || "Custom Charge"}
                        </span>

                        <strong>
                          {currency(
                            currentPreviewInvoice.customCharge
                          )}
                        </strong>
                      </div>
                    )}

                    {/* Show GST only if enabled and > 0 */}
                    {currentPreviewInvoice.gstEnabled && currentPreviewInvoice.gstAmount > 0 && (
                      <div>
                        <span>
                          GST {currentPreviewInvoice.gstRate ? `(${currentPreviewInvoice.gstRate}%)` : ""}
                        </span>

                        <strong>
                          {currency(
                            currentPreviewInvoice.gstAmount
                          )}
                        </strong>
                      </div>
                    )}

                    <div className="print-grand-total">
                      <span>
                        GRAND TOTAL
                      </span>

                      <strong>
                        {currency(
                          currentPreviewInvoice.grandTotal
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Received
                      </span>

                      <strong>
                        {currency(
                          currentPreviewInvoice.received
                        )}
                      </strong>
                    </div>

                    {currentPreviewInvoice.advance > 0 ? (
                      <div className="print-due">
                        <span>
                          Advance
                        </span>

                        <strong>
                          {currency(
                            currentPreviewInvoice.advance
                          )}
                        </strong>
                      </div>
                    ) : (
                      <div className="print-due">
                        <span>
                          Balance Due
                        </span>

                        <strong>
                          {currency(
                            currentPreviewInvoice.due
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                </div>

                {/* SIGNATURE */}

                <div className="print-signature-area">

                  <div className="print-signature-box">

                    {currentPreviewInvoice
                      .business
                      ?.signature && (
                      <img
                        src={
                          currentPreviewInvoice
                            .business
                            .signature
                        }
                        alt="Authorised Signature"
                        className="print-signature-image"
                      />
                    )}

                    <div className="print-signature-line" />

                    <span>
                      Authorised Signature
                    </span>

                    <small>
                      {currentPreviewInvoice
                        .business
                        ?.businessName ||
                        "SAO AUTO TRACTOR"}
                    </small>

                  </div>
                </div>

                {/* FOOTER */}

                <footer>
                  This is a computer-generated invoice.
                  Thank you for your business.
                </footer>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Invoice;