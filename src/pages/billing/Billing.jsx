import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Eye,
  FileDown,
  FileText,
  Filter,
  IndianRupee,
  LayoutList,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  Users,
  WalletCards,
  X,
  Copy,
  MessageCircle,
  Pencil,
  Save,
  CalendarDays,
} from "lucide-react";

import "./Billing.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const PARTIES_KEY = "saoAutoTractorParties";
const PAYMENTS_KEY = "saoAutoTractorPayments";

const TRIP_TYPES = [
  "Loading",
  "Unloading",
  "Site to Site",
];

/* ============================================================
   MAIN COMPONENT
============================================================ */

function Billing() {
  const [trips, setTrips] = useState([]);
  const [partiesData, setPartiesData] = useState([]);
  const [payments, setPayments] = useState([]);

  const [search, setSearch] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [viewMode, setViewMode] = useState("party");

  const [showFilters, setShowFilters] = useState(true);
  const [showPaymentEntry, setShowPaymentEntry] = useState(false);

  const [filterParty, setFilterParty] = useState("");
  const [filterTractor, setFilterTractor] = useState("");
  const [filterTripType, setFilterTripType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentParty, setPaymentParty] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [detailModal, setDetailModal] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editPaymentModal, setEditPaymentModal] = useState(null);

  const [selectedBills, setSelectedBills] = useState([]);
  const [deleteBillsModal, setDeleteBillsModal] = useState(null);

  // NEW: For search suggestions
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showPartySearchSuggestions, setShowPartySearchSuggestions] = useState(false);
  // NEW: For quick payment from detail modal
  const [quickPayData, setQuickPayData] = useState(null);

  /* ----------------------------------------------------------
     DATA LOAD
  ---------------------------------------------------------- */

  const loadData = () => {
    try {
      const savedTrips = localStorage.getItem(TRIPS_KEY);
      const parsedTrips = savedTrips ? JSON.parse(savedTrips) : [];
      setTrips(Array.isArray(parsedTrips) ? parsedTrips : []);
    } catch (error) {
      console.error("Error loading trips:", error);
      setTrips([]);
    }

    try {
      const savedParties = localStorage.getItem(PARTIES_KEY);
      const parsedParties = savedParties ? JSON.parse(savedParties) : [];
      setPartiesData(Array.isArray(parsedParties) ? parsedParties : []);
    } catch (error) {
      console.error("Error loading parties:", error);
      setPartiesData([]);
    }

    try {
      const savedPayments = localStorage.getItem(PAYMENTS_KEY);
      const parsedPayments = savedPayments ? JSON.parse(savedPayments) : [];
      setPayments(Array.isArray(parsedPayments) ? parsedPayments : []);
    } catch (error) {
      console.error("Error loading payments:", error);
      setPayments([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorage = () => loadData();
    const handleAppDataChange = () => loadData();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("saoAutoTractorDataChanged", handleAppDataChange);

    const interval = setInterval(loadData, 1500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("saoAutoTractorDataChanged", handleAppDataChange);
      clearInterval(interval);
    };
  }, []);

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */

  const normalizeName = (name) =>
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const formatDate = (date) => {
    if (!date) return "—";
    const value = String(date).split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}-${m}-${y}`;
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return String(date);
    return parsed.toLocaleDateString("en-IN");
  };

  const getPartyName = (party) => {
    if (typeof party === "string") return party.trim();
    return String(
      party?.partyName ||
        party?.name ||
        party?.party ||
        party?.customerName ||
        party?.ownerName ||
        ""
    ).trim();
  };

  const getTractorNumber = (trip) =>
    String(
      trip?.tractorNumber ||
        trip?.vehicleNumber ||
        trip?.vehicleNo ||
        ""
    ).trim();

  const getAmount = (trip) => {
    const directAmount = Number(trip?.amount);
    if (Number.isFinite(directAmount) && directAmount > 0) {
      return directAmount;
    }
    const quantity = Number(trip?.quantity) || 0;
    const rate = Number(trip?.rate) || 0;
    return quantity * rate;
  };

  const getTripDate = (trip) =>
    String(
      trip?.date || trip?.tripDate || trip?.createdAt || ""
    ).trim();

  const getPaymentDate = (payment) =>
    String(
      payment?.date || payment?.paymentDate || payment?.createdAt || ""
    ).trim();

  const getTripType = (trip) => {
    const rawType = String(trip?.tripType || "")
      .trim()
      .toLowerCase();

    if (
      [
        "loading + unloading",
        "loading → unloading",
        "loading to unloading",
        "loading-unloading",
        "loading/unloading",
      ].includes(rawType)
    ) {
      return "Loading → Unloading";
    }
    if (rawType === "loading" || rawType === "loading only") return "Loading";
    if (rawType === "unloading" || rawType === "unloading only") return "Unloading";
    if (["site to site", "site-to-site", "site-to-site trip"].includes(rawType)) {
      return "Site to Site";
    }
    return String(trip?.tripType || "").trim() || "—";
  };

  const getTripMetrics = (trip) => {
    const type = getTripType(trip);
    return {
      trips: 1,
      loading: type === "Loading" ? 1 : 0,
      loadingUnloading: type === "Loading → Unloading" ? 1 : 0,
      unloading: type === "Unloading" ? 1 : 0,
      siteToSite: type === "Site to Site" ? 1 : 0,
      amount: getAmount(trip),
    };
  };

  // =========================================================
  // WHATSAPP SHARE
  // =========================================================

  const shareWhatsApp = (data) => {
    let message = "";

    if (data.type === "party") {
      const account = data.account || {};
      message =
        `🏢 *Party Account Statement*%0A%0A` +
        `👤 *${data.partyName}*%0A%0A` +
        `📊 *Summary*%0A` +
        `💰 Total Bill: ₹${formatMoney(account.totalBill)}%0A` +
        `📥 Received: ₹${formatMoney(account.received)}%0A` +
        `📤 Due: ₹${formatMoney(account.due)}%0A` +
        `📈 Advance: ₹${formatMoney(account.advance)}%0A` +
        `📋 Records: ${account.records}%0A%0A` +
        `---%0A` +
        `SAO AUTO TRACTOR`;
    } else if (data.type === "bill") {
      const trip = data.trip;
      message =
        `🚜 *Trip Bill Details*%0A%0A` +
        `📅 Date: ${formatDate(getTripDate(trip))}%0A` +
        `👤 Party: ${trip?.partyName || "—"}%0A` +
        `📋 Type: ${getTripType(trip)}%0A` +
        `🚜 Vehicle: ${getTractorNumber(trip) || "—"}%0A` +
        `👨‍✈️ Driver: ${trip?.driverName || "—"}%0A` +
        `📦 Material: ${trip?.material || "—"}%0A` +
        `📊 Qty: ${trip?.quantity || "—"}%0A` +
        `💰 Rate: ₹${formatMoney(trip?.rate)}%0A` +
        `💵 Amount: ₹${formatMoney(getAmount(trip))}%0A%0A` +
        `---%0A` +
        `SAO AUTO TRACTOR`;
    } else if (data.type === "payment") {
      const payment = data.payment;
      message =
        `💳 *Payment Receipt*%0A%0A` +
        `👤 Party: ${payment?.partyName || "—"}%0A` +
        `📅 Date: ${formatDate(getPaymentDate(payment))}%0A` +
        `💰 Amount: ₹${formatMoney(payment?.amount)}%0A` +
        `💳 Mode: ${payment?.paymentMode || "—"}%0A` +
        `📋 Ref: ${payment?.reference || "—"}%0A` +
        `📝 Notes: ${payment?.notes || "—"}%0A%0A` +
        `---%0A` +
        `SAO AUTO TRACTOR`;
    }

    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  // =========================================================
  // CLONE TRIP
  // =========================================================

  const cloneTrip = (trip) => {
    const currentTrips = readTripData();
    const newTrip = {
      ...trip,
      id: undefined,
      _id: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
    };
    const updatedTrips = [newTrip, ...currentTrips];
    writeTripData(updatedTrips);
    loadData();
    if (detailModal) setDetailModal(null);
  };

  const readTripData = () => {
    try {
      const raw = localStorage.getItem(TRIPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeTripData = (data) => {
    try {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    } catch {
      // ignore
    }
  };

  // =========================================================
  // CLONE PAYMENT
  // =========================================================

  const clonePayment = (payment) => {
    const currentPayments = readPaymentData();
    const newPayment = {
      ...payment,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
    };
    const updatedPayments = [newPayment, ...currentPayments];
    writePaymentData(updatedPayments);
    loadData();
    if (detailModal) setDetailModal(null);
  };

  const readPaymentData = () => {
    try {
      const raw = localStorage.getItem(PAYMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writePaymentData = (data) => {
    try {
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    } catch {
      // ignore
    }
  };

  // =========================================================
  // EDIT TRIP
  // =========================================================

  const openEditTrip = (trip) => {
    setEditModal({
      type: "trip",
      trip: trip,
    });
    if (detailModal) setDetailModal(null);
  };

  const saveEditedTrip = (editedTrip) => {
    const currentTrips = readTripData();
    const index = currentTrips.findIndex((t) => t?.id === editedTrip?.id);
    if (index === -1) {
      alert("Trip not found. Please refresh.");
      setEditModal(null);
      return;
    }
    const updatedTrips = [...currentTrips];
    updatedTrips[index] = {
      ...updatedTrips[index],
      ...editedTrip,
      updatedAt: new Date().toISOString(),
    };
    writeTripData(updatedTrips);
    loadData();
    setEditModal(null);
  };

  // =========================================================
  // EDIT PAYMENT
  // =========================================================

  const openEditPayment = (payment) => {
    setEditPaymentModal({
      payment: payment,
    });
    if (detailModal) setDetailModal(null);
  };

  const saveEditedPayment = (editedPayment) => {
    const currentPayments = readPaymentData();
    const index = currentPayments.findIndex((p) => p?.id === editedPayment?.id);
    if (index === -1) {
      alert("Payment not found. Please refresh.");
      setEditPaymentModal(null);
      return;
    }
    const updatedPayments = [...currentPayments];
    updatedPayments[index] = {
      ...updatedPayments[index],
      ...editedPayment,
      updatedAt: new Date().toISOString(),
    };
    writePaymentData(updatedPayments);
    loadData();
    setEditPaymentModal(null);
  };

  /* ----------------------------------------------------------
     BILLABLE TRIPS
  ---------------------------------------------------------- */

  const billableTrips = useMemo(() => {
    return trips.filter((trip) => {
      const partyName = String(trip?.partyName || "").trim();
      return partyName !== "" && getAmount(trip) > 0;
    });
  }, [trips]);

  /* ----------------------------------------------------------
     FILTER OPTIONS
  ---------------------------------------------------------- */

  const parties = useMemo(() => {
    const names = [
      ...partiesData.map(getPartyName),
      ...billableTrips.map((trip) => String(trip?.partyName || "").trim()),
      ...payments.map((payment) => String(payment?.partyName || "").trim()),
    ];
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [partiesData, billableTrips, payments]);

  const tractors = useMemo(() => {
    return [...new Set(billableTrips.map(getTractorNumber).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [billableTrips]);

  /* ----------------------------------------------------------
     SEARCH SUGGESTIONS (NEW)
  ---------------------------------------------------------- */

  const searchSuggestions = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return [];

    const suggestions = [];

    // Party suggestions
    parties.forEach((party) => {
      if (party.toLowerCase().includes(query)) {
        suggestions.push({ type: "party", label: party, value: party });
      }
    });

    // Tractor suggestions
    tractors.forEach((tractor) => {
      if (tractor.toLowerCase().includes(query)) {
        suggestions.push({ type: "tractor", label: tractor, value: tractor });
      }
    });

    return suggestions.slice(0, 12);
  }, [search, parties, tractors]);

  const partySearchSuggestions = useMemo(() => {
    const query = partySearch.toLowerCase().trim();
    if (!query) return [];

    return parties
      .filter((party) => party.toLowerCase().includes(query))
      .slice(0, 10)
      .map((party) => ({ label: party, value: party }));
  }, [partySearch, parties]);

  /* ----------------------------------------------------------
     FILTERED BILLING RECORDS
  ---------------------------------------------------------- */

  const filteredBillableTrips = useMemo(() => {
    const text = search.toLowerCase().trim();

    return billableTrips.filter((trip) => {
      const tripDate = getTripDate(trip).split("T")[0];

      if (filterParty && normalizeName(trip?.partyName) !== normalizeName(filterParty)) {
        return false;
      }
      if (filterTractor && normalizeName(getTractorNumber(trip)) !== normalizeName(filterTractor)) {
        return false;
      }
      if (filterTripType && getTripType(trip) !== filterTripType) {
        return false;
      }
      if (dateFrom && tripDate && tripDate < dateFrom) {
        return false;
      }
      if (dateTo && tripDate && tripDate > dateTo) {
        return false;
      }
      if (!text) return true;

      const haystack = [
        trip?.partyName,
        getTractorNumber(trip),
        getTripType(trip),
        trip?.material,
        trip?.driverName,
        trip?.loadingAddress,
        trip?.unloadingAddress,
        trip?.address,
        trip?.notes,
        trip?.date,
        trip?.quantity,
        trip?.rate,
        getAmount(trip),
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(text);
    });
  }, [
    billableTrips,
    search,
    filterParty,
    filterTractor,
    filterTripType,
    dateFrom,
    dateTo,
  ]);

  /* ----------------------------------------------------------
     BILLING SUMMARY
  ---------------------------------------------------------- */

  const billingSummary = useMemo(() => {
    const summary = {
      records: 0,
      trips: 0,
      loading: 0,
      loadingUnloading: 0,
      unloading: 0,
      siteToSite: 0,
      amount: 0,
    };

    filteredBillableTrips.forEach((trip) => {
      const metrics = getTripMetrics(trip);
      summary.records += 1;
      summary.trips += metrics.trips;
      summary.loading += metrics.loading;
      summary.loadingUnloading += metrics.loadingUnloading;
      summary.unloading += metrics.unloading;
      summary.siteToSite += metrics.siteToSite;
      summary.amount += metrics.amount;
    });

    return summary;
  }, [filteredBillableTrips]);

  const totalBilling = billingSummary.amount;

  /* ----------------------------------------------------------
     PAYMENT SUMMARY
  ---------------------------------------------------------- */

  const paymentSummary = useMemo(() => {
    const summary = { total: 0, cash: 0, upi: 0, bank: 0, other: 0 };
    payments.forEach((payment) => {
      const amount = Number(payment?.amount) || 0;
      summary.total += amount;
      const mode = String(payment?.paymentMode || "").trim().toLowerCase();
      if (mode === "cash") summary.cash += amount;
      else if (mode === "upi") summary.upi += amount;
      else if (mode === "bank" || mode === "bank transfer") summary.bank += amount;
      else summary.other += amount;
    });
    return summary;
  }, [payments]);

  const totalReceived = paymentSummary.total;
  const totalDue = Math.max(0, totalBilling - totalReceived);

  /* ----------------------------------------------------------
     PARTY ACCOUNTS
  ---------------------------------------------------------- */

  const allPartyAccounts = useMemo(() => {
    const map = {};

    const createAccount = (partyName) => ({
      partyName,
      records: 0,
      trips: 0,
      loading: 0,
      loadingUnloading: 0,
      unloading: 0,
      siteToSite: 0,
      totalBill: 0,
      received: 0,
      due: 0,
      advance: 0,
      payments: 0,
    });

    parties.forEach((partyName) => {
      map[normalizeName(partyName)] = createAccount(partyName);
    });

    billableTrips.forEach((trip) => {
      const partyName = String(trip?.partyName || "").trim();
      if (!partyName) return;
      const key = normalizeName(partyName);
      if (!map[key]) map[key] = createAccount(partyName);
      const metrics = getTripMetrics(trip);
      map[key].records += 1;
      map[key].trips += metrics.trips;
      map[key].loading += metrics.loading;
      map[key].loadingUnloading += metrics.loadingUnloading;
      map[key].unloading += metrics.unloading;
      map[key].siteToSite += metrics.siteToSite;
      map[key].totalBill += metrics.amount;
    });

    payments.forEach((payment) => {
      const partyName = String(payment?.partyName || "").trim();
      if (!partyName) return;
      const key = normalizeName(partyName);
      if (!map[key]) map[key] = createAccount(partyName);
      map[key].received += Number(payment?.amount) || 0;
      map[key].payments += 1;
    });

    Object.values(map).forEach((account) => {
      const balance = account.totalBill - account.received;
      account.due = Math.max(0, balance);
      account.advance = Math.max(0, -balance);
    });

    return map;
  }, [parties, billableTrips, payments]);

  /* ----------------------------------------------------------
     DUE PARTIES FOR PAYMENT ENTRY
  ---------------------------------------------------------- */

  const dueParties = useMemo(() => {
    return Object.values(allPartyAccounts)
      .filter((account) => Number(account?.due) > 0)
      .sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [allPartyAccounts]);

  /* ----------------------------------------------------------
     SELECTED PAYMENT PARTY ACCOUNT
  ---------------------------------------------------------- */

  const selectedPaymentPartyAccount = useMemo(() => {
    if (!paymentParty) return null;
    return allPartyAccounts[normalizeName(paymentParty)] || null;
  }, [paymentParty, allPartyAccounts]);

  const selectedPaymentDue = Number(selectedPaymentPartyAccount?.due) || 0;
  const enteredPaymentAmount = Number(paymentAmount) || 0;
  const paymentRemainingDue = Math.max(0, selectedPaymentDue - enteredPaymentAmount);

  // NEW: Auto-fill payment amount when party changes
  useEffect(() => {
    if (paymentParty && selectedPaymentDue > 0) {
      setPaymentAmount(String(selectedPaymentDue));
    } else if (paymentParty && selectedPaymentDue === 0) {
      setPaymentAmount("");
    }
  }, [paymentParty, selectedPaymentDue]);

  /* ----------------------------------------------------------
     PARTY SUMMARY
  ---------------------------------------------------------- */

  const partySummary = useMemo(() => {
    const values = Object.values(allPartyAccounts);
    const text = partySearch.toLowerCase().trim();
    if (!text) return values.sort((a, b) => a.partyName.localeCompare(b.partyName));
    return values
      .filter((party) => party.partyName.toLowerCase().includes(text))
      .sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [allPartyAccounts, partySearch]);

  const duePartyCount = Object.values(allPartyAccounts).filter(
    (account) => account.due > 0
  ).length;

  const paidPartyCount = Object.values(allPartyAccounts).filter(
    (account) => account.totalBill > 0 && account.due <= 0
  ).length;

  const collectionPercentage =
    totalBilling > 0 ? Math.min(100, (totalReceived / totalBilling) * 100) : 0;

  /* ----------------------------------------------------------
     SORTED HISTORY
  ---------------------------------------------------------- */

  const sortedBills = useMemo(() => {
    return filteredBillableTrips
      .slice()
      .sort(
        (a, b) =>
          new Date(getTripDate(b) || 0).getTime() -
          new Date(getTripDate(a) || 0).getTime()
      );
  }, [filteredBillableTrips]);

  const sortedPayments = useMemo(() => {
    return payments
      .filter((payment) => {
        const text = search.toLowerCase().trim();
        if (!text) return true;
        const haystack = [
          payment?.partyName,
          payment?.paymentMode,
          payment?.reference,
          payment?.notes,
          getPaymentDate(payment),
          payment?.amount,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return haystack.includes(text);
      })
      .sort((a, b) => {
        const dateA = new Date(getPaymentDate(a) || 0).getTime();
        const dateB = new Date(getPaymentDate(b) || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return Number(b?.id || 0) - Number(a?.id || 0);
      });
  }, [payments, search]);

  /* ----------------------------------------------------------
     BILL SELECTION / DELETE
  ---------------------------------------------------------- */

  const getTripSourceIndex = (trip) => {
    return trips.indexOf(trip);
  };

  const toggleBillSelection = (trip) => {
    const sourceIndex = getTripSourceIndex(trip);
    if (sourceIndex < 0) return;
    setSelectedBills((current) => {
      if (current.includes(sourceIndex)) {
        return current.filter((index) => index !== sourceIndex);
      }
      return [...current, sourceIndex];
    });
  };

  const visibleBillIndexes = sortedBills.map(getTripSourceIndex).filter((index) => index >= 0);

  const allVisibleBillsSelected =
    visibleBillIndexes.length > 0 &&
    visibleBillIndexes.every((index) => selectedBills.includes(index));

  const toggleSelectAllBills = () => {
    if (!visibleBillIndexes.length) return;
    if (allVisibleBillsSelected) {
      setSelectedBills((current) =>
        current.filter((index) => !visibleBillIndexes.includes(index))
      );
    } else {
      setSelectedBills((current) => [
        ...new Set([...current, ...visibleBillIndexes]),
      ]);
    }
  };

  const selectedBillTrips = selectedBills.map((index) => trips[index]).filter(Boolean);
  const selectedBillTotal = selectedBillTrips.reduce(
    (total, trip) => total + getAmount(trip),
    0
  );

  const requestDeleteBill = (trip) => {
    const sourceIndex = getTripSourceIndex(trip);
    if (sourceIndex < 0) return;
    setDeleteBillsModal({
      type: "single",
      indexes: [sourceIndex],
      trips: [trip],
      total: getAmount(trip),
    });
  };

  const requestDeleteSelectedBills = () => {
    if (!selectedBills.length) return;
    const validIndexes = selectedBills.filter(
      (index) => trips[index] && billableTrips.includes(trips[index])
    );
    if (!validIndexes.length) {
      setSelectedBills([]);
      return;
    }
    const selectedTrips = validIndexes.map((index) => trips[index]);
    const total = selectedTrips.reduce((sum, trip) => sum + getAmount(trip), 0);
    setDeleteBillsModal({
      type: "bulk",
      indexes: validIndexes,
      trips: selectedTrips,
      total,
    });
  };

  const confirmDeleteBills = () => {
    if (!deleteBillsModal?.indexes?.length) return;
    const indexesToDelete = new Set(deleteBillsModal.indexes);
    const updatedTrips = trips.filter((_, index) => !indexesToDelete.has(index));

    try {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(updatedTrips));
      setTrips(updatedTrips);
      setSelectedBills([]);
      setDeleteBillsModal(null);
      setDetailModal(null);
      window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    } catch (error) {
      console.error("Error deleting billing records:", error);
    }
  };

  /* ----------------------------------------------------------
     ACCOUNT STATUS
  ---------------------------------------------------------- */

  const getAccountStatus = (account) => {
    const bill = Number(account?.totalBill) || 0;
    const received = Number(account?.received) || 0;
    const due = Math.max(0, bill - received);
    const advance = Math.max(0, received - bill);

    if (advance > 0) return { type: "advance", label: "Advance" };
    if (bill > 0 && due <= 0) return { type: "paid", label: "Paid" };
    if (received > 0 && due > 0) return { type: "partial", label: "Partial" };
    return { type: "due", label: "Due" };
  };

  /* ----------------------------------------------------------
     PARTY DETAILS
  ---------------------------------------------------------- */

  const getPartyBills = (partyName) =>
    billableTrips
      .filter((trip) => normalizeName(trip?.partyName) === normalizeName(partyName))
      .sort(
        (a, b) =>
          new Date(getTripDate(b) || 0).getTime() -
          new Date(getTripDate(a) || 0).getTime()
      );

  const getPartyPayments = (partyName) =>
    payments
      .filter((payment) => normalizeName(payment?.partyName) === normalizeName(partyName))
      .sort(
        (a, b) =>
          new Date(getPaymentDate(b) || 0).getTime() -
          new Date(getPaymentDate(a) || 0).getTime()
      );

  /* ----------------------------------------------------------
     VIEW / PREVIEW / PRINT
  ---------------------------------------------------------- */

  const openPartyView = (partyName) => {
    const account = allPartyAccounts[normalizeName(partyName)];
    setDetailModal({
      type: "party",
      partyName,
      account,
      bills: getPartyBills(partyName),
      payments: getPartyPayments(partyName),
    });
  };

  const openBillView = (trip) => {
    setDetailModal({
      type: "bill",
      trip,
    });
  };

  const openPaymentView = (payment) => {
    const account = allPartyAccounts[normalizeName(payment?.partyName)];
    setDetailModal({
      type: "payment",
      payment,
      account,
    });
  };

  const openPartyPreview = (partyName) => {
    const account = allPartyAccounts[normalizeName(partyName)];
    setPreviewModal({
      type: "party",
      partyName,
      account,
      bills: getPartyBills(partyName),
      payments: getPartyPayments(partyName),
    });
  };

  const openBillPreview = (trip) => {
    setPreviewModal({
      type: "bill",
      trip,
    });
  };

  const openPaymentPreview = (payment) => {
    const account = allPartyAccounts[normalizeName(payment?.partyName)];
    setPreviewModal({
      type: "payment",
      payment,
      account,
    });
  };

  // NEW: Quick Pay from Party Detail
  const openQuickPay = (partyName) => {
    const account = allPartyAccounts[normalizeName(partyName)];
    if (!account || account.due <= 0) {
      alert("This party has no outstanding due.");
      return;
    }
    setQuickPayData({
      partyName,
      due: account.due,
    });
    setDetailModal(null);
    setShowPaymentEntry(true);
    setPaymentParty(partyName);
    setPaymentAmount(String(account.due));
    setPaymentError("");
  };

  const printPreview = () => {
    window.print();
  };

  const printParty = (partyName) => {
    openPartyPreview(partyName);
    setTimeout(() => window.print(), 350);
  };

  const printBill = (trip) => {
    openBillPreview(trip);
    setTimeout(() => window.print(), 350);
  };

  const printPayment = (payment) => {
    openPaymentPreview(payment);
    setTimeout(() => window.print(), 350);
  };

  /* ----------------------------------------------------------
     EXPORT
  ---------------------------------------------------------- */

  const exportCurrentData = () => {
    let rows = [];

    if (viewMode === "party") {
      rows = partySummary.map((party, index) => ({
        "#": index + 1,
        Party: party.partyName,
        Records: party.records,
        Trips: party.trips,
        Loading: party.loading,
        "Loading → Unloading": party.loadingUnloading,
        Unloading: party.unloading,
        "Site to Site": party.siteToSite,
        "Total Bill": party.totalBill,
        Received: party.received,
        Due: party.due,
        Advance: party.advance,
        Status: getAccountStatus(party).label,
      }));
    }

    if (viewMode === "history") {
      rows = sortedBills.map((trip, index) => ({
        "#": index + 1,
        Date: getTripDate(trip),
        Party: trip?.partyName || "",
        "Trip Type": getTripType(trip),
        Tractor: getTractorNumber(trip),
        Driver: trip?.driverName || "",
        Material: trip?.material || "",
        Quantity: trip?.quantity ?? "",
        Rate: trip?.rate ?? "",
        Amount: getAmount(trip),
      }));
    }

    if (viewMode === "payments") {
      rows = sortedPayments.map((payment, index) => ({
        "#": index + 1,
        Date: getPaymentDate(payment),
        Party: payment?.partyName || "",
        Amount: Number(payment?.amount) || 0,
        Mode: payment?.paymentMode || "",
        Reference: payment?.reference || "",
        Notes: payment?.notes || "",
      }));
    }

    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billing-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ----------------------------------------------------------
     RESET FILTERS
  ---------------------------------------------------------- */

  const resetFilters = () => {
    setSearch("");
    setPartySearch("");
    setFilterParty("");
    setFilterTractor("");
    setFilterTripType("");
    setDateFrom("");
    setDateTo("");
    setShowSearchSuggestions(false);
    setShowPartySearchSuggestions(false);
  };

  /* ----------------------------------------------------------
     PAYMENT ENTRY
  ---------------------------------------------------------- */

  const resetPaymentForm = () => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentParty("");
    setPaymentAmount("");
    setPaymentMode("Cash");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentError("");
    setQuickPayData(null);
  };

  const handlePaymentPartyChange = (value) => {
    setPaymentParty(value);
    setPaymentAmount("");
    setPaymentError("");
  };

  const addPayment = () => {
    setPaymentError("");

    const party = paymentParty.trim();
    const amount = Number(paymentAmount);

    if (!party) {
      setPaymentError("Please select a due party.");
      return;
    }
    if (!paymentDate) {
      setPaymentError("Please select payment date.");
      return;
    }
    if (!paymentAmount || !Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Please enter a valid payment amount.");
      return;
    }

    const partyData = Object.values(allPartyAccounts).find(
      (item) => normalizeName(item.partyName) === normalizeName(party)
    );

    if (!partyData) {
      setPaymentError("Selected party account was not found.");
      return;
    }

    const currentDue = Number(partyData.due) || 0;

    if (currentDue <= 0) {
      setPaymentError("This party has no outstanding due.");
      return;
    }

    if (amount > currentDue) {
      setPaymentError(
        `Payment cannot be more than the current due of ₹${formatMoney(currentDue)}.`
      );
      return;
    }

    const newPayment = {
      id: Date.now(),
      date: paymentDate,
      partyName: party,
      amount,
      paymentMode,
      reference: paymentReference.trim(),
      notes: paymentNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [...payments, newPayment];

    try {
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(updatedPayments));
      setPayments(updatedPayments);
      resetPaymentForm();
      setShowPaymentEntry(false);
      setViewMode("payments");
      setQuickPayData(null);
      window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    } catch (error) {
      console.error("Error saving payment:", error);
      setPaymentError("Payment could not be saved. Please try again.");
    }
  };

  const deletePayment = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this payment?"
    );
    if (!confirmDelete) return;

    const updatedPayments = payments.filter((payment) => payment.id !== id);

    try {
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(updatedPayments));
      setPayments(updatedPayments);
      window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  /* ----------------------------------------------------------
     RETURN
  ---------------------------------------------------------- */

  return (
    <div className="billing-page">
      {/* HEADER */}
      <header className="billing-header">
        <div className="billing-title-wrap">
          <div className="billing-title-icon">
            <IndianRupee size={20} />
          </div>
          <div>
            <span className="section-kicker">FINANCE</span>
            <h1>Billing</h1>
            <p>Party accounts, billing, payments and outstanding balances.</p>
          </div>
        </div>
        <div className="billing-header-actions">
          <button type="button" className="billing-btn billing-btn-secondary" onClick={loadData}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" className="billing-btn billing-btn-secondary" onClick={exportCurrentData}>
            <FileDown size={15} /> Export
          </button>
          <button type="button" className="billing-btn billing-btn-secondary" onClick={printPreview}>
            <Printer size={15} /> Print
          </button>
          <button
            type="button"
            className="billing-btn billing-btn-primary"
            onClick={() => {
              setShowPaymentEntry(!showPaymentEntry);
              setPaymentError("");
              if (!showPaymentEntry) {
                resetPaymentForm();
              }
            }}
          >
            <Plus size={15} />
            {showPaymentEntry ? "Close Entry" : "Payment Entry"}
          </button>
        </div>
      </header>

      {/* PAYMENT ENTRY - INLINE */}
      {showPaymentEntry && (
        <section className="billing-card payment-entry-card">
          <div className="billing-card-heading">
            <div>
              <span className="section-kicker">MONEY RECEIVED</span>
              <h2><CreditCard size={18} /> Add Payment</h2>
              <p>Record a payment received from a party with an outstanding due.</p>
              {quickPayData && (
                <span className="quick-pay-badge">
                  Quick Pay: <strong>{quickPayData.partyName}</strong> — Due ₹{formatMoney(quickPayData.due)}
                </span>
              )}
            </div>
          </div>

          {dueParties.length === 0 ? (
            <div className="payment-error">
              <AlertCircle size={15} />
              <span>No party currently has any outstanding due.</span>
            </div>
          ) : (
            <>
              <div className="payment-form-grid">
                <BillingField label="Payment Date">
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </BillingField>
                <BillingField label="Party">
                  <select value={paymentParty} onChange={(e) => handlePaymentPartyChange(e.target.value)}>
                    <option value="">Select due party</option>
                    {dueParties.map((party) => (
                      <option key={normalizeName(party.partyName)} value={party.partyName}>
                        {party.partyName} — ₹{formatMoney(party.due)} Due
                      </option>
                    ))}
                  </select>
                </BillingField>
                <BillingField label="Amount">
                  <div className="amount-input" style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
                    <IndianRupee size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", zIndex: 2, color: "#6d675e", pointerEvents: "none", flexShrink: 0 }} />
                    <input
                      type="number"
                      min="0"
                      max={selectedPaymentDue || undefined}
                      step="0.01"
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      style={{ width: "100%", paddingLeft: "38px", position: "relative", zIndex: 1 }}
                    />
                  </div>
                  {selectedPaymentDue > 0 && (
                    <small className="payment-helper">
                      Due: ₹{formatMoney(selectedPaymentDue)} · Auto-filled
                    </small>
                  )}
                </BillingField>
                <BillingField label="Payment Mode">
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank</option>
                    <option value="Other">Other</option>
                  </select>
                </BillingField>
                <BillingField label="Reference">
                  <input type="text" placeholder="Transaction / receipt no." value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                </BillingField>
                <BillingField label="Notes">
                  <input type="text" placeholder="Optional notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
                </BillingField>
              </div>

              {selectedPaymentPartyAccount && (
                <div className="payment-account-summary">
                  <div className="payment-account-summary-header">
                    <div>
                      <span className="section-kicker">PARTY ACCOUNT</span>
                      <strong>{selectedPaymentPartyAccount.partyName}</strong>
                    </div>
                    <div className="payment-due-highlight">
                      <span>Total Due</span>
                      <strong>₹{formatMoney(selectedPaymentDue)}</strong>
                    </div>
                  </div>
                  <div className="payment-account-summary-grid">
                    <div><span>Total Billing</span><strong>₹{formatMoney(selectedPaymentPartyAccount.totalBill)}</strong></div>
                    <div><span>Already Received</span><strong>₹{formatMoney(selectedPaymentPartyAccount.received)}</strong></div>
                    <div><span>Current Due</span><strong className="danger-text">₹{formatMoney(selectedPaymentDue)}</strong></div>
                    <div><span>Remaining Due</span><strong className={paymentRemainingDue > 0 ? "danger-text" : "success-text"}>₹{formatMoney(paymentRemainingDue)}</strong></div>
                  </div>
                  {enteredPaymentAmount > selectedPaymentDue && selectedPaymentDue > 0 && (
                    <div className="payment-error">
                      <AlertCircle size={15} /> Payment amount cannot be greater than the current due.
                    </div>
                  )}
                </div>
              )}

              {paymentError && (
                <div className="payment-error">
                  <AlertCircle size={15} /> {paymentError}
                </div>
              )}

              <div className="payment-form-actions">
                <button
                  type="button"
                  className="billing-btn billing-btn-secondary"
                  onClick={() => {
                    setShowPaymentEntry(false);
                    resetPaymentForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="billing-btn billing-btn-primary"
                  onClick={addPayment}
                  disabled={
                    !paymentParty ||
                    !paymentAmount ||
                    selectedPaymentDue <= 0 ||
                    enteredPaymentAmount <= 0 ||
                    enteredPaymentAmount > selectedPaymentDue
                  }
                >
                  <CheckCircle2 size={15} /> Save Payment
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* STAT GRID */}
      <section className="billing-stat-grid">
        <BillingStat icon={<LayoutList size={18} />} label="Total Records" value={billingSummary.records} />
        <BillingStat icon={<Truck size={18} />} label="Total Trips" value={billingSummary.trips} />
        <BillingStat icon={<CircleDollarSign size={18} />} label="Total Billing" value={`₹${formatMoney(totalBilling)}`} tone="primary" />
        <BillingStat icon={<WalletCards size={18} />} label="Total Received" value={`₹${formatMoney(totalReceived)}`} tone="success" />
        <BillingStat icon={<AlertCircle size={18} />} label="Total Due" value={`₹${formatMoney(totalDue)}`} tone="danger" />
        <BillingStat icon={<ArrowUpRight size={18} />} label="Collection" value={`${collectionPercentage.toFixed(0)}%`} tone="accent" />
      </section>

      {/* FILTER CARD */}
      <section className="billing-card billing-filter-card">
        <div className="billing-filter-header">
          <div>
            <span className="section-kicker">SEARCH & FILTER</span>
            <h2><Filter size={17} /> Billing Filters</h2>
          </div>
          <div className="filter-header-actions">
            <button type="button" className="billing-text-button" onClick={resetFilters}>Reset</button>
            <button type="button" className="billing-btn billing-btn-secondary billing-btn-small" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="billing-filter-grid">
            <div className="billing-search-box" style={{ position: "relative" }}>
              <Search size={15} />
              <input
                type="text"
                placeholder="Search party, tractor, material, driver..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              />
              {search && <button type="button" onClick={() => { setSearch(""); setShowSearchSuggestions(false); }} aria-label="Clear search"><X size={14} /></button>}

              {/* NEW: Search Suggestions Dropdown */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="search-suggestions-dropdown">
                  {searchSuggestions.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.type}-${index}`}
                      className="search-suggestion-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (item.type === "party") {
                          setSearch(item.value);
                          setFilterParty(item.value);
                        } else if (item.type === "tractor") {
                          setSearch(item.value);
                          setFilterTractor(item.value);
                        }
                        setShowSearchSuggestions(false);
                      }}
                    >
                      <span className="suggestion-type">{item.type === "party" ? "👤" : "🚜"}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)}>
              <option value="">All Parties</option>
              {parties.map((party) => <option key={party} value={party}>{party}</option>)}
            </select>
            <select value={filterTractor} onChange={(e) => setFilterTractor(e.target.value)}>
              <option value="">All Tractors</option>
              {tractors.map((tractor) => <option key={tractor} value={tractor}>{tractor}</option>)}
            </select>
            <select value={filterTripType} onChange={(e) => setFilterTripType(e.target.value)}>
              <option value="">All Trip Types</option>
              {TRIP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
          </div>
        )}
      </section>

      {/* MAIN BILLING CARD */}
      <section className="billing-card billing-main-card">
        <div className="billing-main-header">
          <div>
            <span className="section-kicker">ACCOUNTS LEDGER</span>
            <h2><LayoutList size={19} /> Billing Overview</h2>
            <p>Manage party accounts, bills and payment ledger.</p>
          </div>
          <div className="billing-tabs">
            <button type="button" className={viewMode === "party" ? "active" : ""} onClick={() => setViewMode("party")}>
              <Users size={15} /> Party Accounts
            </button>
            <button type="button" className={viewMode === "history" ? "active" : ""} onClick={() => setViewMode("history")}>
              <FileText size={15} /> Bill History
            </button>
            <button type="button" className={viewMode === "payments" ? "active" : ""} onClick={() => setViewMode("payments")}>
              <CreditCard size={15} /> Payments
            </button>
          </div>
        </div>

        {/* PARTY ACCOUNTS */}
        {viewMode === "party" && (
          <>
            <div className="party-toolbar">
              <div className="party-status-counts">
                <span className="status-count success"><CheckCircle2 size={13} /> {paidPartyCount} Paid</span>
                <span className="status-count danger"><AlertCircle size={13} /> {duePartyCount} Due</span>
              </div>
              <div className="billing-input-icon party-search" style={{ position: "relative" }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search party..."
                  value={partySearch}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    setShowPartySearchSuggestions(true);
                  }}
                  onFocus={() => setShowPartySearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPartySearchSuggestions(false), 200)}
                />
                {partySearch && <button type="button" onClick={() => { setPartySearch(""); setShowPartySearchSuggestions(false); }}><X size={13} /></button>}

                {/* NEW: Party Search Suggestions Dropdown */}
                {showPartySearchSuggestions && partySearchSuggestions.length > 0 && (
                  <div className="search-suggestions-dropdown party-search-suggestions">
                    {partySearchSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion.value}
                        className="search-suggestion-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPartySearch(suggestion.value);
                          setShowPartySearchSuggestions(false);
                        }}
                      >
                        <span>👤</span>
                        <span>{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {partySummary.length === 0 ? (
              <BillingEmpty icon={<CircleDollarSign size={34} />} title="No Billing Data" text="No party billing records match the current filters." />
            ) : (
              <div className="billing-table-wrap">
                <table className="billing-table party-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Party</th>
                      <th>Trips</th>
                      <th>Loading</th>
                      <th>Load → Unload</th>
                      <th>Unloading</th>
                      <th>Site → Site</th>
                      <th>Total Bill</th>
                      <th>Received</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="action-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partySummary.map((party, index) => {
                      const status = getAccountStatus(party);
                      return (
                        <tr key={normalizeName(party.partyName)}>
                          <td className="row-number">{index + 1}</td>
                          <td className="party-name-cell">
                            <strong>{party.partyName}</strong>
                            <small>{party.records} records</small>
                          </td>
                          <td><strong>{party.trips}</strong></td>
                          <td>{party.loading}</td>
                          <td>{party.loadingUnloading}</td>
                          <td>{party.unloading}</td>
                          <td>{party.siteToSite}</td>
                          <td className="money-cell">₹{formatMoney(party.totalBill)}</td>
                          <td className="money-cell success-text">₹{formatMoney(party.received)}</td>
                          <td>
                            {party.due > 0 ? (
                              <span className="money-cell danger-text">₹{formatMoney(party.due)}</span>
                            ) : party.advance > 0 ? (
                              <span className="money-cell accent-text">+₹{formatMoney(party.advance)}</span>
                            ) : (
                              <span className="money-cell success-text">₹0</span>
                            )}
                          </td>
                          <td><StatusBadge status={status} /></td>
                          <td className="action-column-cell">
                            <ActionButtons>
                              <ActionButton icon={<Eye size={14} />} label="View" title="View party account" onClick={() => openPartyView(party.partyName)} />
                              <ActionButton icon={<ReceiptText size={14} />} label="Preview" title="Preview statement" onClick={() => openPartyPreview(party.partyName)} />
                              <ActionButton icon={<Printer size={14} />} label="Print" title="Print statement" onClick={() => printParty(party.partyName)} />
                              <ActionButton icon={<MessageCircle size={14} />} label="WhatsApp" title="Share on WhatsApp" onClick={() => shareWhatsApp({ type: "party", partyName: party.partyName, account: party })} color="#25D366" />
                              {/* NEW: Quick Pay button */}
                              {party.due > 0 && (
                                <ActionButton icon={<Plus size={14} />} label="Pay" title="Quick Pay" onClick={() => openQuickPay(party.partyName)} color="#1A5F7A" />
                              )}
                            </ActionButtons>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* BILL HISTORY */}
        {viewMode === "history" && (
          <>
            <div className="history-toolbar">
              <div className="history-toolbar-left">
                <div>Showing <strong>{sortedBills.length}</strong> bill records</div>
                {selectedBills.length > 0 && <span className="billing-selection-count">{selectedBills.length} selected</span>}
              </div>
              <div className="history-toolbar-actions">
                {selectedBills.length > 0 && (
                  <button type="button" className="billing-btn billing-btn-danger" onClick={requestDeleteSelectedBills}>
                    <Trash2 size={15} /> Delete Selected ({selectedBills.length})
                  </button>
                )}
                <button type="button" className="billing-btn billing-btn-secondary" onClick={exportCurrentData}>
                  <FileDown size={15} /> Export Bills
                </button>
              </div>
            </div>

            {sortedBills.length === 0 ? (
              <BillingEmpty icon={<FileText size={34} />} title="No Bills Found" text="No billable trip records match your filters." />
            ) : (
              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th className="billing-checkbox-column">
                        <input type="checkbox" checked={allVisibleBillsSelected} onChange={toggleSelectAllBills} aria-label="Select all bills" />
                      </th>
                      <th>#</th>
                      <th>Date</th>
                      <th>Party</th>
                      <th>Trip Type</th>
                      <th>Tractor</th>
                      <th>Driver</th>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Bill Amount</th>
                      <th>Trip</th>
                      <th className="action-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBills.map((trip, index) => (
                      <tr key={trip?.id || `${getTripDate(trip)}-${index}`}>
                        <td className="billing-checkbox-column">
                          <input
                            type="checkbox"
                            checked={selectedBills.includes(getTripSourceIndex(trip))}
                            onChange={() => toggleBillSelection(trip)}
                            aria-label={`Select bill ${index + 1}`}
                          />
                        </td>
                        <td className="row-number">{index + 1}</td>
                        <td>{formatDate(getTripDate(trip))}</td>
                        <td><strong>{trip?.partyName || "—"}</strong></td>
                        <td><span className="trip-type-badge">{getTripType(trip)}</span></td>
                        <td>{getTractorNumber(trip) || "—"}</td>
                        <td>{trip?.driverName || "—"}</td>
                        <td>{trip?.material || "—"}</td>
                        <td>{trip?.quantity ?? "—"}</td>
                        <td className="money-cell">₹{formatMoney(trip?.rate)}</td>
                        <td className="money-cell">₹{formatMoney(getAmount(trip))}</td>
                        <td><span className="trip-count-badge">1 Trip</span></td>
                        <td className="action-column-cell">
                          <ActionButtons>
                            <ActionButton icon={<Eye size={14} />} label="View" title="View bill" onClick={() => openBillView(trip)} />
                            <ActionButton icon={<ReceiptText size={14} />} label="Preview" title="Preview bill" onClick={() => openBillPreview(trip)} />
                            <ActionButton icon={<Printer size={14} />} label="Print" title="Print bill" onClick={() => printBill(trip)} />
                            <ActionButton icon={<Copy size={14} />} label="Clone" title="Clone bill" onClick={() => cloneTrip(trip)} color="#1A5F7A" />
                            <ActionButton icon={<MessageCircle size={14} />} label="WhatsApp" title="Share on WhatsApp" onClick={() => shareWhatsApp({ type: "bill", trip })} color="#25D366" />
                            <ActionButton icon={<Pencil size={14} />} label="Edit" title="Edit bill" onClick={() => openEditTrip(trip)} color="#F39C12" />
                            <ActionButton danger icon={<Trash2 size={14} />} label="Delete" title="Delete bill" onClick={() => requestDeleteBill(trip)} />
                          </ActionButtons>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* PAYMENTS */}
        {viewMode === "payments" && (
          <>
            <div className="payment-toolbar">
              <div>Showing <strong>{sortedPayments.length}</strong> payment entries</div>
              <div className="payment-toolbar-actions">
                <button type="button" className="billing-btn billing-btn-secondary" onClick={exportCurrentData}>
                  <FileDown size={15} /> Export
                </button>
                <button type="button" className="billing-btn billing-btn-primary" onClick={() => { setPaymentError(""); setShowPaymentEntry(true); }} disabled={dueParties.length === 0}>
                  <Plus size={15} /> Add Payment
                </button>
              </div>
            </div>

            {sortedPayments.length === 0 ? (
              <BillingEmpty icon={<CreditCard size={34} />} title="No Payments Found" text="No payment entries match your current filters." action={
                <button type="button" className="billing-btn billing-btn-primary" onClick={() => { setPaymentError(""); setShowPaymentEntry(true); }} disabled={dueParties.length === 0}>
                  <Plus size={15} /> Add Payment
                </button>
              } />
            ) : (
              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Party</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th>Notes</th>
                      <th className="action-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayments.map((payment, index) => {
                      const mode = payment?.paymentMode || "—";
                      return (
                        <tr key={payment?.id || index}>
                          <td className="row-number">{index + 1}</td>
                          <td>{formatDate(getPaymentDate(payment))}</td>
                          <td><strong>{payment?.partyName || "—"}</strong></td>
                          <td className="money-cell success-text">₹{formatMoney(payment?.amount)}</td>
                          <td><PaymentModeBadge mode={mode} /></td>
                          <td>{payment?.reference || "—"}</td>
                          <td className="notes-cell">{payment?.notes || "—"}</td>
                          <td className="action-column-cell">
                            <ActionButtons>
                              <ActionButton icon={<Eye size={14} />} label="View" title="View payment" onClick={() => openPaymentView(payment)} />
                              <ActionButton icon={<ReceiptText size={14} />} label="Receipt" title="Preview receipt" onClick={() => openPaymentPreview(payment)} />
                              <ActionButton icon={<Printer size={14} />} label="Print" title="Print receipt" onClick={() => printPayment(payment)} />
                              <ActionButton icon={<Copy size={14} />} label="Clone" title="Clone payment" onClick={() => clonePayment(payment)} color="#1A5F7A" />
                              <ActionButton icon={<MessageCircle size={14} />} label="WhatsApp" title="Share on WhatsApp" onClick={() => shareWhatsApp({ type: "payment", payment })} color="#25D366" />
                              <ActionButton icon={<Pencil size={14} />} label="Edit" title="Edit payment" onClick={() => openEditPayment(payment)} color="#F39C12" />
                              <ActionButton danger icon={<Trash2 size={14} />} label="Delete" title="Delete payment" onClick={() => deletePayment(payment.id)} />
                            </ActionButtons>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* QUICK SUMMARY */}
      <section className="quick-summary">
        <SummaryCard title="Trip Breakdown">
          <SummaryItem value={billingSummary.loading} label="Loading" />
          <SummaryItem value={billingSummary.unloading} label="Unloading" />
          <SummaryItem value={billingSummary.siteToSite} label="Site to Site" />
        </SummaryCard>
        <SummaryCard title="Payment Modes">
          <SummaryItem value={`₹${formatMoney(paymentSummary.cash)}`} label="Cash" />
          <SummaryItem value={`₹${formatMoney(paymentSummary.upi)}`} label="UPI" />
          <SummaryItem value={`₹${formatMoney(paymentSummary.bank)}`} label="Bank" />
          <SummaryItem value={`₹${formatMoney(paymentSummary.other)}`} label="Other" />
        </SummaryCard>
        <SummaryCard title="Account Status">
          <div className="account-status-summary">
            <div><strong>{duePartyCount}</strong><span>Parties with due</span></div>
            <div><strong className="success-text">{paidPartyCount}</strong><span>Fully paid</span></div>
          </div>
        </SummaryCard>
      </section>

      {/* RULES */}
      <section className="billing-card billing-rules">
        <div className="rules-header">
          <div className="rules-icon"><CircleDollarSign size={17} /></div>
          <div>
            <h2>Billing & Account Rules</h2>
            <p>How figures shown on this page are calculated.</p>
          </div>
        </div>
        <div className="rules-grid">
          <Rule title="Total Billing" text="Sum of valid billable trip amounts." />
          <Rule title="Total Trips" text="Every valid billable record counts as 1 trip." />
          <Rule title="Received" text="Recorded payments from the payment ledger." />
          <Rule title="Due" text="Bill minus received amount." />
          <Rule title="Advance" text="Payment received above the bill amount." />
          <Rule title="Payment Modes" text="Cash, UPI, Bank and Other." />
          <Rule title="Party Data" text="Parties from Party Management, Trips and Payments are included." />
          <Rule title="Storage" text="Existing localStorage structure remains compatible." />
        </div>
      </section>

      <footer className="billing-footer">
        <strong>SAO AUTO TRACTOR</strong> <span>•</span> Billing & Accounts Management
      </footer>

      {/* DETAIL MODAL */}
      {detailModal && (
        <DetailModal
          data={detailModal}
          formatMoney={formatMoney}
          formatDate={formatDate}
          getTripType={getTripType}
          getTractorNumber={getTractorNumber}
          getAmount={getAmount}
          getAccountStatus={getAccountStatus}
          onClose={() => setDetailModal(null)}
          onPreview={() => { setPreviewModal(detailModal); setDetailModal(null); }}
          onClone={(data) => {
            if (data.type === "bill") cloneTrip(data.trip);
            else if (data.type === "payment") clonePayment(data.payment);
            setDetailModal(null);
          }}
          onWhatsApp={(data) => {
            shareWhatsApp(data);
            setDetailModal(null);
          }}
          onEdit={(data) => {
            if (data.type === "bill") { setDetailModal(null); openEditTrip(data.trip); }
            else if (data.type === "payment") { setDetailModal(null); openEditPayment(data.payment); }
          }}
          onDelete={(data) => {
            if (data.type === "bill") { setDetailModal(null); requestDeleteBill(data.trip); }
            else if (data.type === "payment") { setDetailModal(null); deletePayment(data.payment.id); }
          }}
          onQuickPay={(data) => {
            if (data.type === "party") {
              openQuickPay(data.partyName);
            }
          }}
        />
      )}

      {/* PREVIEW MODAL */}
      {previewModal && (
        <PreviewModal
          data={previewModal}
          formatMoney={formatMoney}
          formatDate={formatDate}
          getTripType={getTripType}
          getTractorNumber={getTractorNumber}
          getAmount={getAmount}
          getAccountStatus={getAccountStatus}
          onClose={() => setPreviewModal(null)}
          onPrint={printPreview}
        />
      )}

      {/* EDIT TRIP MODAL */}
      {editModal && (
        <EditTripModal
          trip={editModal.trip}
          formatMoney={formatMoney}
          formatDate={formatDate}
          getTripType={getTripType}
          getTractorNumber={getTractorNumber}
          getAmount={getAmount}
          onClose={() => setEditModal(null)}
          onSave={saveEditedTrip}
        />
      )}

      {/* EDIT PAYMENT MODAL */}
      {editPaymentModal && (
        <EditPaymentModal
          payment={editPaymentModal.payment}
          formatMoney={formatMoney}
          formatDate={formatDate}
          onClose={() => setEditPaymentModal(null)}
          onSave={saveEditedPayment}
        />
      )}

      {/* DELETE BILL CONFIRMATION */}
      {deleteBillsModal && (
        <DeleteBillsModal
          data={deleteBillsModal}
          formatMoney={formatMoney}
          formatDate={formatDate}
          getTripType={getTripType}
          getTractorNumber={getTractorNumber}
          getAmount={getAmount}
          onClose={() => setDeleteBillsModal(null)}
          onConfirm={confirmDeleteBills}
        />
      )}
    </div>
  );
}

// ============================================================
// SMALL COMPONENTS
// ============================================================

function BillingStat({ icon, label, value, tone = "primary" }) {
  return (
    <div className={`billing-stat ${tone}`}>
      <div className="billing-stat-icon">{icon}</div>
      <div className="billing-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function BillingField({ label, children }) {
  return (
    <div className="billing-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`account-status-badge ${status.type}`}>
      {status.type === "paid" && <CheckCircle2 size={12} />}
      {status.type === "due" && <AlertCircle size={12} />}
      {status.type === "advance" && <ArrowUpRight size={12} />}
      {status.type === "partial" && <ChevronRight size={12} />}
      {status.label}
    </span>
  );
}

function PaymentModeBadge({ mode }) {
  const lower = String(mode).toLowerCase();
  let type = "other";
  if (lower === "cash") type = "cash";
  else if (lower === "upi") type = "upi";
  else if (lower.includes("bank")) type = "bank";

  return (
    <span className={`payment-mode-badge ${type}`}>
      {type === "cash" && <Banknote size={12} />}
      {type === "upi" && <CreditCard size={12} />}
      {type === "bank" && <WalletCards size={12} />}
      {type === "other" && <WalletCards size={12} />}
      {mode}
    </span>
  );
}

function ActionButtons({ children }) {
  return <div className="billing-row-actions">{children}</div>;
}

function ActionButton({ icon, label, title, onClick, danger = false, color }) {
  return (
    <button
      type="button"
      className={`billing-action-btn ${danger ? "danger" : ""}`}
      title={title}
      onClick={onClick}
      style={color ? { color: color } : {}}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BillingEmpty({ icon, title, text, action }) {
  return (
    <div className="billing-empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="billing-card quick-summary-card">
      <span className="section-kicker">{title}</span>
      <div className="summary-grid">{children}</div>
    </div>
  );
}

function SummaryItem({ value, label }) {
  return (
    <div className="summary-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Rule({ title, text }) {
  return (
    <div className="billing-rule">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

// ============================================================
// DETAIL MODAL
// ============================================================

function DetailModal({
  data,
  formatMoney,
  formatDate,
  getTripType,
  getTractorNumber,
  getAmount,
  getAccountStatus,
  onClose,
  onPreview,
  onClone,
  onWhatsApp,
  onEdit,
  onDelete,
  onQuickPay,
}) {
  const title =
    data.type === "party"
      ? data.partyName
      : data.type === "bill"
      ? "Bill Details"
      : "Payment Details";

  return (
    <div className="billing-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="billing-modal detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="billing-modal-header">
          <div>
            <span className="section-kicker">
              {data.type === "party" ? "PARTY ACCOUNT" : data.type === "bill" ? "BILL DETAILS" : "PAYMENT DETAILS"}
            </span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="billing-icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="billing-modal-body">
          {data.type === "party" && (
            <PartyDetail
              data={data}
              formatMoney={formatMoney}
              formatDate={formatDate}
              getTripType={getTripType}
              getTractorNumber={getTractorNumber}
              getAmount={getAmount}
              getAccountStatus={getAccountStatus}
            />
          )}
          {data.type === "bill" && (
            <BillDetail
              trip={data.trip}
              formatMoney={formatMoney}
              formatDate={formatDate}
              getTripType={getTripType}
              getTractorNumber={getTractorNumber}
              getAmount={getAmount}
            />
          )}
          {data.type === "payment" && (
            <PaymentDetail
              payment={data.payment}
              account={data.account}
              formatMoney={formatMoney}
              formatDate={formatDate}
            />
          )}
        </div>

        <div className="billing-modal-footer">
          <div className="billing-modal-footer-actions">
            {data.type === "party" && (
              <>
                <ActionButton icon={<MessageCircle size={14} />} label="WhatsApp" title="Share on WhatsApp" onClick={() => onWhatsApp({ type: "party", partyName: data.partyName, account: data.account })} color="#25D366" />
                {/* NEW: Quick Pay from detail modal */}
                {data.account?.due > 0 && (
                  <ActionButton icon={<Plus size={14} />} label="Quick Pay" title="Quick Pay" onClick={() => onQuickPay({ type: "party", partyName: data.partyName })} color="#1A5F7A" />
                )}
              </>
            )}
            {data.type === "bill" && (
              <>
                <ActionButton icon={<Copy size={14} />} label="Clone" title="Clone bill" onClick={() => onClone({ type: "bill", trip: data.trip })} color="#1A5F7A" />
                <ActionButton icon={<MessageCircle size={14} />} label="WhatsApp" title="Share on WhatsApp" onClick={() => onWhatsApp({ type: "bill", trip: data.trip })} color="#25D366" />
                <ActionButton icon={<Pencil size={14} />} label="Edit" title="Edit bill" onClick={() => onEdit({ type: "bill", trip: data.trip })} color="#F39C12" />
                <ActionButton danger icon={<Trash2 size={14} />} label="Delete" title="Delete bill" onClick={() => onDelete({ type: "bill", trip: data.trip })} />
              </>
            )}
            {data.type === "payment" && (
              <>
                <ActionButton icon={<Copy size={14} />} label="Clone" title="Clone payment" onClick={() => onClone({ type: "payment", payment: data.payment })} color="#1A5F7A" />
                <ActionButton icon={<MessageCircle size={14} />} label="WhatsApp" title="Share on WhatsApp" onClick={() => onWhatsApp({ type: "payment", payment: data.payment })} color="#25D366" />
                <ActionButton icon={<Pencil size={14} />} label="Edit" title="Edit payment" onClick={() => onEdit({ type: "payment", payment: data.payment })} color="#F39C12" />
                <ActionButton danger icon={<Trash2 size={14} />} label="Delete" title="Delete payment" onClick={() => onDelete({ type: "payment", payment: data.payment })} />
              </>
            )}
          </div>
          <button type="button" className="billing-btn billing-btn-secondary" onClick={onPreview}>
            <ReceiptText size={15} /> Preview
          </button>
          <button type="button" className="billing-btn billing-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREVIEW MODAL
// ============================================================

function PreviewModal({
  data,
  formatMoney,
  formatDate,
  getTripType,
  getTractorNumber,
  getAmount,
  getAccountStatus,
  onClose,
  onPrint,
}) {
  return (
    <div className="billing-modal-backdrop preview-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="billing-modal preview-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="billing-modal-header preview-header">
          <div>
            <span className="section-kicker">PRINT PREVIEW</span>
            <h2>{data.type === "party" ? "Party Account Statement" : data.type === "bill" ? "Bill Preview" : "Payment Receipt"}</h2>
          </div>
          <div className="preview-header-actions">
            <button type="button" className="billing-btn billing-btn-primary" onClick={onPrint}><Printer size={15} /> Print</button>
            <button type="button" className="billing-icon-button" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="billing-preview-paper">
          <div className="print-company-header">
            <div>
              <h1>SAO AUTO TRACTOR</h1>
              <p>Transport & Billing Management</p>
            </div>
            <div className="print-document-label">
              {data.type === "party" ? "ACCOUNT STATEMENT" : data.type === "bill" ? "BILL" : "PAYMENT RECEIPT"}
            </div>
          </div>

          {data.type === "party" && (
            <PartyPrint
              data={data}
              formatMoney={formatMoney}
              formatDate={formatDate}
              getTripType={getTripType}
              getTractorNumber={getTractorNumber}
              getAmount={getAmount}
              getAccountStatus={getAccountStatus}
            />
          )}
          {data.type === "bill" && (
            <BillPrint
              trip={data.trip}
              formatMoney={formatMoney}
              formatDate={formatDate}
              getTripType={getTripType}
              getTractorNumber={getTractorNumber}
              getAmount={getAmount}
            />
          )}
          {data.type === "payment" && (
            <PaymentPrint
              payment={data.payment}
              account={data.account}
              formatMoney={formatMoney}
              formatDate={formatDate}
            />
          )}

          <div className="print-footer">
            <span>SAO AUTO TRACTOR</span>
            <span>Computer generated document</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT TRIP MODAL
// ============================================================

function EditTripModal({ trip, formatMoney, formatDate, getTripType, getTractorNumber, getAmount, onClose, onSave }) {
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
      date: trip?.date || "",
      vehicleNumber: trip?.vehicleNumber || trip?.tractorNumber || trip?.vehicleNo || "",
      partyName: trip?.partyName || "",
      materialName: trip?.materialName || trip?.material || "",
      driverName: trip?.driverName || "",
      tripType: getTripType(trip) === "—" ? "Loading" : getTripType(trip),
      site: trip?.site || trip?.location || "",
      quantity: trip?.quantity !== undefined && trip?.quantity !== null ? String(trip.quantity) : "",
      unit: trip?.unit || "",
      rate: trip?.rate !== undefined && trip?.rate !== null ? String(trip.rate) : "",
      amount: trip?.amount !== undefined && trip?.amount !== null ? String(trip.amount) : "",
      notes: trip?.notes || "",
    });
  }, [trip, getTripType]);

  if (!trip) return null;

  const quantity = Number(form.quantity) || 0;
  const rate = Number(form.rate) || 0;
  const calculatedAmount = quantity * rate;

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleQuantityOrRateChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      const nextQty = Number(next.quantity) || 0;
      const nextRate = Number(next.rate) || 0;
      next.amount = String(nextQty * nextRate);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
    <div className="billing-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="billing-modal edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="billing-modal-header">
          <div>
            <span className="section-kicker">EDIT TRIP</span>
            <h2>Edit Trip Record</h2>
            <p>Update this transport record.</p>
          </div>
          <button type="button" className="billing-icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="edit-modal-body">
            <div className="edit-grid">
              <label><span>Date *</span>
                <div className="edit-input-wrap"><CalendarDays size={15} /><input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required /></div>
              </label>
              <label><span>Vehicle / Tractor *</span>
                <div className="edit-input-wrap"><Truck size={15} /><input type="text" value={form.vehicleNumber} onChange={(e) => handleChange("vehicleNumber", e.target.value)} placeholder="Vehicle number" required /></div>
              </label>
              <label><span>Party *</span><input type="text" value={form.partyName} onChange={(e) => handleChange("partyName", e.target.value)} placeholder="Party name" required /></label>
              <label><span>Material *</span><input type="text" value={form.materialName} onChange={(e) => handleChange("materialName", e.target.value)} placeholder="Material" required /></label>
              <label><span>Driver</span><input type="text" value={form.driverName} onChange={(e) => handleChange("driverName", e.target.value)} placeholder="Driver name" /></label>
              <label><span>Trip Type</span>
                <select value={form.tripType} onChange={(e) => handleChange("tripType", e.target.value)}>
                  <option value="Loading">Loading</option><option value="Unloading">Unloading</option><option value="Site to Site">Site to Site</option>
                </select>
              </label>
              <label className="edit-full"><span>Site / Location</span><input type="text" value={form.site} onChange={(e) => handleChange("site", e.target.value)} placeholder="Site or location" /></label>
              <label><span>Quantity</span><input type="number" min="0" step="any" value={form.quantity} onChange={(e) => handleQuantityOrRateChange("quantity", e.target.value)} placeholder="0" /></label>
              <label><span>Unit</span><input type="text" value={form.unit} onChange={(e) => handleChange("unit", e.target.value)} placeholder="Trip / Ton / CFT..." /></label>
              <label><span>Rate</span>
                <div className="edit-input-wrap"><IndianRupee size={15} /><input type="number" min="0" step="any" value={form.rate} onChange={(e) => handleQuantityOrRateChange("rate", e.target.value)} placeholder="0" /></div>
              </label>
              <label><span>Amount</span>
                <div className="edit-input-wrap"><IndianRupee size={15} /><input type="number" min="0" step="any" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} placeholder="0" /></div>
                <small className="edit-helper">Quantity × Rate = ₹{formatMoney(calculatedAmount)}</small>
              </label>
              <label className="edit-full"><span>Notes</span><textarea rows="2" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Optional notes..." /></label>
            </div>
          </div>
          <div className="billing-modal-footer">
            <button type="button" className="billing-btn billing-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="billing-btn billing-btn-primary"><Save size={16} /> Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// EDIT PAYMENT MODAL
// ============================================================

function EditPaymentModal({ payment, formatMoney, formatDate, onClose, onSave }) {
  const [form, setForm] = useState({
    date: "",
    partyName: "",
    amount: "",
    paymentMode: "Cash",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    if (!payment) return;
    setForm({
      date: payment?.date || "",
      partyName: payment?.partyName || "",
      amount: payment?.amount !== undefined && payment?.amount !== null ? String(payment.amount) : "",
      paymentMode: payment?.paymentMode || "Cash",
      reference: payment?.reference || "",
      notes: payment?.notes || "",
    });
  }, [payment]);

  if (!payment) return null;

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date) { alert("Please select a date."); return; }
    if (!form.partyName.trim()) { alert("Please enter party name."); return; }
    const amount = Number(form.amount) || 0;
    if (amount <= 0) { alert("Please enter a valid amount."); return; }
    onSave({
      id: payment.id,
      date: form.date,
      partyName: form.partyName.trim(),
      amount: amount,
      paymentMode: form.paymentMode,
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    });
  };

  return (
    <div className="billing-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="billing-modal edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="billing-modal-header">
          <div>
            <span className="section-kicker">EDIT PAYMENT</span>
            <h2>Edit Payment Record</h2>
            <p>Update this payment entry.</p>
          </div>
          <button type="button" className="billing-icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="edit-modal-body">
            <div className="edit-grid">
              <label><span>Date *</span>
                <div className="edit-input-wrap"><CalendarDays size={15} /><input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required /></div>
              </label>
              <label><span>Party *</span><input type="text" value={form.partyName} onChange={(e) => handleChange("partyName", e.target.value)} placeholder="Party name" required /></label>
              <label><span>Amount *</span>
                <div className="edit-input-wrap"><IndianRupee size={15} /><input type="number" min="0" step="any" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} placeholder="0" required /></div>
              </label>
              <label><span>Payment Mode</span>
                <select value={form.paymentMode} onChange={(e) => handleChange("paymentMode", e.target.value)}>
                  <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank">Bank</option><option value="Other">Other</option>
                </select>
              </label>
              <label><span>Reference</span><input type="text" value={form.reference} onChange={(e) => handleChange("reference", e.target.value)} placeholder="Transaction / receipt no." /></label>
              <label className="edit-full"><span>Notes</span><textarea rows="2" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Optional notes..." /></label>
            </div>
          </div>
          <div className="billing-modal-footer">
            <button type="button" className="billing-btn billing-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="billing-btn billing-btn-primary"><Save size={16} /> Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// DELETE BILLS MODAL
// ============================================================

function DeleteBillsModal({
  data,
  formatMoney,
  formatDate,
  getTripType,
  getTractorNumber,
  getAmount,
  onClose,
  onConfirm,
}) {
  const isBulk = data.type === "bulk";
  const count = data.trips?.length || 0;

  return (
    <div className="billing-modal-backdrop billing-delete-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="billing-modal billing-delete-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="billing-modal-header">
          <div>
            <span className="section-kicker">DELETE BILL</span>
            <h2>{isBulk ? `Delete ${count} Bills?` : "Delete This Bill?"}</h2>
          </div>
          <button type="button" className="billing-icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="billing-modal-body">
          <div className="billing-delete-icon"><Trash2 size={22} /></div>
          <div className="billing-delete-content">
            <h3>{isBulk ? "Selected billing records will be permanently deleted." : "This billing record will be permanently deleted."}</h3>
            <p>This action removes the selected trip records from the billing source data.</p>

            <div className="billing-delete-summary">
              <div><span>Records</span><strong>{count}</strong></div>
              <div><span>Total Bill</span><strong>₹{formatMoney(data.total)}</strong></div>
            </div>

            {isBulk && data.trips?.length > 0 && (
              <div className="billing-delete-list">
                {data.trips.slice(0, 5).map((trip, index) => (
                  <div key={trip?.id || index} className="billing-delete-list-item">
                    <div>
                      <strong>{trip?.partyName || "—"}</strong>
                      <span>
                        {formatDate(String(trip?.date || trip?.tripDate || trip?.createdAt || "").split("T")[0])}
                        {" • "}
                        {getTractorNumber(trip) || "No tractor"}
                        {" • "}
                        {getTripType(trip)}
                      </span>
                    </div>
                    <strong>₹{formatMoney(getAmount(trip))}</strong>
                  </div>
                ))}
                {data.trips.length > 5 && (
                  <div className="billing-delete-more">+{data.trips.length - 5} more records</div>
                )}
              </div>
            )}

            <div className="billing-delete-warning">
              <AlertCircle size={15} />
              <span>This action cannot be undone. Payment records will not be deleted.</span>
            </div>
          </div>
        </div>

        <div className="billing-modal-footer billing-delete-footer">
          <button type="button" className="billing-btn billing-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="billing-btn billing-btn-danger" onClick={onConfirm}>
            <Trash2 size={15} /> {isBulk ? `Delete ${count} Bills` : "Delete Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARTY DETAIL
// ============================================================

function PartyDetail({ data, formatMoney, formatDate, getTripType, getTractorNumber, getAmount, getAccountStatus }) {
  const account = data.account || {};

  return (
    <div className="detail-content">
      <div className="detail-summary-grid">
        <DetailMetric label="Total Bill" value={`₹${formatMoney(account.totalBill)}`} />
        <DetailMetric label="Received" value={`₹${formatMoney(account.received)}`} tone="success" />
        <DetailMetric label="Due" value={`₹${formatMoney(account.due)}`} tone="danger" />
        <DetailMetric label="Advance" value={`₹${formatMoney(account.advance)}`} tone="accent" />
      </div>

      <div className="detail-status-row">
        <span>Account Status</span>
        <StatusBadge status={getAccountStatus(account)} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title"><Truck size={15} /> Billing Records ({data.bills.length})</div>
        {data.bills.length === 0 ? (
          <div className="detail-empty">No billing records.</div>
        ) : (
          <div className="detail-mini-table-wrap">
            <table className="detail-mini-table">
              <thead><tr><th>Date</th><th>Trip</th><th>Tractor</th><th>Material</th><th>Amount</th></tr></thead>
              <tbody>
                {data.bills.map((trip, index) => (
                  <tr key={trip?.id || index}>
                    <td>{formatDate(getTripDateLocal(trip))}</td>
                    <td>{getTripType(trip)}</td>
                    <td>{getTractorNumber(trip) || "—"}</td>
                    <td>{trip?.material || "—"}</td>
                    <td>₹{formatMoney(getAmount(trip))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-title"><CreditCard size={15} /> Payments ({data.payments.length})</div>
        {data.payments.length === 0 ? (
          <div className="detail-empty">No payment records.</div>
        ) : (
          <div className="detail-mini-table-wrap">
            <table className="detail-mini-table">
              <thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th>Amount</th></tr></thead>
              <tbody>
                {data.payments.map((payment, index) => (
                  <tr key={payment?.id || index}>
                    <td>{formatDate(getPaymentDateLocal(payment))}</td>
                    <td>{payment?.paymentMode || "—"}</td>
                    <td>{payment?.reference || "—"}</td>
                    <td className="success-text">₹{formatMoney(payment?.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// BILL DETAIL
// ============================================================

function BillDetail({ trip, formatMoney, formatDate, getTripType, getTractorNumber, getAmount }) {
  return (
    <div className="detail-content">
      <div className="detail-identity">
        <div><span>Party</span><strong>{trip?.partyName || "—"}</strong></div>
        <div><span>Date</span><strong>{formatDate(getTripDateLocal(trip))}</strong></div>
        <div><span>Trip Type</span><strong>{getTripType(trip)}</strong></div>
      </div>

      <div className="detail-fields-grid">
        <DetailField label="Tractor" value={getTractorNumber(trip) || "—"} />
        <DetailField label="Driver" value={trip?.driverName || "—"} />
        <DetailField label="Material" value={trip?.material || "—"} />
        <DetailField label="Quantity" value={trip?.quantity ?? "—"} />
        <DetailField label="Rate" value={`₹${formatMoney(trip?.rate)}`} />
        <DetailField label="Bill Amount" value={`₹${formatMoney(getAmount(trip))}`} highlight />
        <DetailField label="Loading Address" value={trip?.loadingAddress || "—"} />
        <DetailField label="Unloading Address" value={trip?.unloadingAddress || "—"} />
        <DetailField label="Address" value={trip?.address || "—"} />
        <DetailField label="Notes" value={trip?.notes || "—"} />
      </div>
    </div>
  );
}

// ============================================================
// PAYMENT DETAIL
// ============================================================

function PaymentDetail({ payment, account, formatMoney, formatDate }) {
  return (
    <div className="detail-content">
      <div className="payment-receipt-amount">
        <span>Amount Received</span>
        <strong>₹{formatMoney(payment?.amount)}</strong>
      </div>

      <div className="detail-fields-grid">
        <DetailField label="Party" value={payment?.partyName || "—"} />
        <DetailField label="Payment Date" value={formatDate(getPaymentDateLocal(payment))} />
        <DetailField label="Payment Mode" value={payment?.paymentMode || "—"} />
        <DetailField label="Reference" value={payment?.reference || "—"} />
        <DetailField label="Notes" value={payment?.notes || "—"} />
        <DetailField label="Current Party Due" value={`₹${formatMoney(account?.due)}`} highlight={account?.due > 0} />
      </div>
    </div>
  );
}

// ============================================================
// PRINT COMPONENTS
// ============================================================

function PartyPrint({ data, formatMoney, formatDate, getTripType, getTractorNumber, getAmount, getAccountStatus }) {
  const account = data.account || {};

  return (
    <>
      <div className="print-party-heading">
        <div><span>Party</span><strong>{data.partyName}</strong></div>
        <div><span>Statement Date</span><strong>{formatDate(new Date().toISOString().split("T")[0])}</strong></div>
      </div>

      <div className="print-summary-grid">
        <PrintMetric label="Total Bill" value={`₹${formatMoney(account.totalBill)}`} />
        <PrintMetric label="Received" value={`₹${formatMoney(account.received)}`} />
        <PrintMetric label="Due" value={`₹${formatMoney(account.due)}`} />
        <PrintMetric label="Advance" value={`₹${formatMoney(account.advance)}`} />
      </div>

      <div className="print-status">Status: <strong>{getAccountStatus(account).label}</strong></div>

      <h3 className="print-section-title">Billing Records</h3>
      <table className="print-table">
        <thead><tr><th>Date</th><th>Trip Type</th><th>Tractor</th><th>Material</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          {data.bills.map((trip, index) => (
            <tr key={trip?.id || index}>
              <td>{formatDate(getTripDateLocal(trip))}</td>
              <td>{getTripType(trip)}</td>
              <td>{getTractorNumber(trip) || "—"}</td>
              <td>{trip?.material || "—"}</td>
              <td>{trip?.quantity ?? "—"}</td>
              <td>₹{formatMoney(trip?.rate)}</td>
              <td>₹{formatMoney(getAmount(trip))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="print-section-title">Payment Records</h3>
      <table className="print-table">
        <thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th>Notes</th><th>Amount</th></tr></thead>
        <tbody>
          {data.payments.map((payment, index) => (
            <tr key={payment?.id || index}>
              <td>{formatDate(getPaymentDateLocal(payment))}</td>
              <td>{payment?.paymentMode || "—"}</td>
              <td>{payment?.reference || "—"}</td>
              <td>{payment?.notes || "—"}</td>
              <td>₹{formatMoney(payment?.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function BillPrint({ trip, formatMoney, formatDate, getTripType, getTractorNumber, getAmount }) {
  return (
    <>
      <div className="print-bill-meta">
        <div><span>Bill Date</span><strong>{formatDate(getTripDateLocal(trip))}</strong></div>
        <div><span>Party</span><strong>{trip?.partyName || "—"}</strong></div>
        <div><span>Trip Type</span><strong>{getTripType(trip)}</strong></div>
      </div>

      <table className="print-table">
        <thead><tr><th>Particular</th><th>Details</th></tr></thead>
        <tbody>
          <tr><td>Tractor</td><td>{getTractorNumber(trip) || "—"}</td></tr>
          <tr><td>Driver</td><td>{trip?.driverName || "—"}</td></tr>
          <tr><td>Material</td><td>{trip?.material || "—"}</td></tr>
          <tr><td>Quantity</td><td>{trip?.quantity ?? "—"}</td></tr>
          <tr><td>Rate</td><td>₹{formatMoney(trip?.rate)}</td></tr>
          <tr><td>Loading Address</td><td>{trip?.loadingAddress || "—"}</td></tr>
          <tr><td>Unloading Address</td><td>{trip?.unloadingAddress || "—"}</td></tr>
          <tr><td>Notes</td><td>{trip?.notes || "—"}</td></tr>
        </tbody>
      </table>

      <div className="print-total-box">
        <span>Total Bill Amount</span>
        <strong>₹{formatMoney(getAmount(trip))}</strong>
      </div>
    </>
  );
}

function PaymentPrint({ payment, account, formatMoney, formatDate }) {
  return (
    <>
      <div className="payment-print-hero">
        <span>Amount Received</span>
        <strong>₹{formatMoney(payment?.amount)}</strong>
      </div>

      <table className="print-table">
        <tbody>
          <tr><td>Party</td><td>{payment?.partyName || "—"}</td></tr>
          <tr><td>Date</td><td>{formatDate(getPaymentDateLocal(payment))}</td></tr>
          <tr><td>Payment Mode</td><td>{payment?.paymentMode || "—"}</td></tr>
          <tr><td>Reference</td><td>{payment?.reference || "—"}</td></tr>
          <tr><td>Notes</td><td>{payment?.notes || "—"}</td></tr>
          <tr><td>Party Current Due</td><td>₹{formatMoney(account?.due)}</td></tr>
        </tbody>
      </table>

      <div className="receipt-signature"><span>Authorized Signature</span></div>
    </>
  );
}

// ============================================================
// DETAIL HELPERS
// ============================================================

function DetailMetric({ label, value, tone = "" }) {
  return (
    <div className="detail-metric">
      <span>{label}</span>
      <strong className={tone ? `${tone}-text` : ""}>{value}</strong>
    </div>
  );
}

function DetailField({ label, value, highlight = false }) {
  return (
    <div className={`detail-field ${highlight ? "highlight" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintMetric({ label, value }) {
  return (
    <div className="print-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getTripDateLocal(trip) {
  return String(trip?.date || trip?.tripDate || trip?.createdAt || "").trim();
}

function getPaymentDateLocal(payment) {
  return String(payment?.date || payment?.paymentDate || payment?.createdAt || "").trim();
}

export default Billing;