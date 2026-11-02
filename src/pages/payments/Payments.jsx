import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  IndianRupee,
  Download,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  WalletCards,
  X,
  AlertCircle,
} from "lucide-react";
import "./Payments.css";
import { getTodayISO } from "../../utils/date";
import { getActivePaymentAmount, hasDuplicatePaymentReference, isPaymentReversed } from "../../utils/paymentRecords";
import { getInvoiceFinance, getPaymentAllocations, getPaymentUnallocatedAmount, validateInvoiceAllocation } from "../../utils/financeReconciliation";
import { buildCsv } from "../../utils/csv";

const PAYMENTS_KEY = "saoAutoTractorPayments";
const PARTIES_KEY = "saoAutoTractorParties";
const TRIPS_KEY = "saoAutoTractorTrips";
const INVOICES_KEY = "saoAutoTractorInvoices";

function writePayments(nextPayments) {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(nextPayments));
    window.dispatchEvent(new Event("saoAutoTractorDataChanged"));
    return true;
  } catch (error) {
    console.error("Payment save error:", error);
    return false;
  }
}

const PAYMENT_MODES = ["Cash", "UPI", "Bank", "Other"];

function createEmptyPayment() {
  let paymentMode = "Cash";
  try {
    const settings = JSON.parse(
      localStorage.getItem("saoAutoTractorSettings") || "{}",
    );
    if (PAYMENT_MODES.includes(settings.paymentMode)) {
      paymentMode = settings.paymentMode;
    }
  } catch {
    // Keep the safe Cash default if browser storage cannot be read.
  }
  return { ...EMPTY_PAYMENT, paymentMode };
}

const EMPTY_PAYMENT = {
  partyName: "",
  amount: "",
  date: getTodayISO(),
  paymentMode: "Cash",
  reference: "",
  notes: "",
};

const clean = (value) => String(value ?? "").trim();

const normalize = (value) =>
  clean(value).toLowerCase().replace(/\s+/g, " ");

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const todayISO = getTodayISO;

const getPartyName = (item) =>
  clean(
    item?.partyName ??
      item?.party ??
      item?.customerName ??
      item?.customer ??
      item?.name
  );

const getAmount = (item) =>
  Number(
    item?.amount ??
      item?.paymentAmount ??
      item?.receivedAmount ??
      item?.paidAmount ??
      0
  ) || 0;

function getTripBillingAmount(trip) {
  const direct = Number(
    trip?.amount ?? trip?.totalAmount ?? trip?.billingAmount ?? trip?.total ?? 0,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;
  const quantity = Number(trip?.quantity ?? trip?.qty ?? 0);
  const rate = Number(trip?.rate ?? trip?.price ?? 0);
  return Number.isFinite(quantity * rate) ? Math.max(0, quantity * rate) : 0;
}

const getDate = (item) =>
  item?.date ??
  item?.paymentDate ??
  item?.receivedDate ??
  item?.createdAt ??
  "";

const getMode = (item) =>
  clean(item?.paymentMode ?? item?.mode ?? item?.method ?? "Other") || "Other";

const getReference = (item) =>
  clean(
    item?.reference ??
      item?.referenceNo ??
      item?.transactionId ??
      item?.utr ??
      item?.transactionReference
  );

const getNotes = (item) =>
  clean(item?.notes ?? item?.note ?? item?.remarks ?? item?.description);

const getAllocationLabel = (payment) =>
  getPaymentAllocations(payment)
    .map((allocation) => `${allocation.invoiceNumber || "Invoice"}: ${money(allocation.amount)}`)
    .join("; ");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isSameDay = (value) => {
  if (!value) return false;

  const d = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const isSameMonth = (value) => {
  if (!value) return false;

  const d = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
};

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`payments-action-btn ${danger ? "danger" : ""}`}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}) {
  // UPDATED: Esc key close support
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="payments-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className={`payments-modal ${wide ? "wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="payments-modal-header">
          <div>
            <h2>{title}</h2>

            {subtitle && (
              <p>{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            className="payments-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="payments-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [parties, setParties] = useState([]);
  const [trips, setTrips] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewPayment, setViewPayment] = useState(null);
  const [statementParty, setStatementParty] = useState("");
  const [allocationPayment, setAllocationPayment] = useState(null);
  const [allocationPaymentIndex, setAllocationPaymentIndex] = useState(-1);
  const [allocationInvoiceId, setAllocationInvoiceId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [allocationError, setAllocationError] = useState("");

  const [form, setForm] = useState(createEmptyPayment);

  const loadData = () => {
    try {
      const savedPayments = JSON.parse(
        localStorage.getItem(PAYMENTS_KEY) || "[]"
      );

      const savedParties = JSON.parse(
        localStorage.getItem(PARTIES_KEY) || "[]"
      );

      const savedTrips = JSON.parse(
        localStorage.getItem(TRIPS_KEY) || "[]"
      );
      const savedInvoices = JSON.parse(localStorage.getItem(INVOICES_KEY) || "[]");

      setPayments(
        Array.isArray(savedPayments)
          ? savedPayments
          : []
      );

      setParties(
        Array.isArray(savedParties)
          ? savedParties
          : []
      );

      setTrips(
        Array.isArray(savedTrips)
          ? savedTrips
          : []
      );
      setInvoices(Array.isArray(savedInvoices) ? savedInvoices : []);
    } catch (error) {
      console.error("Payments load error:", error);

      setPayments([]);
      setParties([]);
      setTrips([]);
      setInvoices([]);
    }
  };

  useEffect(() => {
    loadData();

    const sync = () => {
      loadData();
    };

    window.addEventListener(
      "storage",
      sync
    );

    window.addEventListener(
      "saoAutoTractorDataChanged",
      sync
    );

    return () => {
      window.removeEventListener(
        "storage",
        sync
      );

      window.removeEventListener(
        "saoAutoTractorDataChanged",
        sync
      );

    };
  }, []);

  // ============================================================
  // 🆕 PARTY DUE CALCULATION
  // ============================================================

  const partyDueMap = useMemo(() => {
    const map = new Map();

    // Gather all unique party names from parties, trips, payments
    const allParties = [
      ...parties.map(getPartyName),
      ...trips.map(getPartyName),
      ...payments.map(getPartyName),
    ].filter(Boolean);

    const uniqueParties = [...new Set(allParties)];

    uniqueParties.forEach((party) => {
      // Total billing from trips
      const partyTrips = trips.filter(
        (trip) => normalize(getPartyName(trip)) === normalize(party)
      );
      const totalBilling = partyTrips.reduce(
        (sum, trip) => sum + getAmount(trip),
        0
      );

      // Total received from payments
      const partyPayments = payments.filter(
        (payment) => normalize(getPartyName(payment)) === normalize(party)
      );
      const totalReceived = partyPayments.reduce(
        (sum, payment) => sum + getActivePaymentAmount(payment),
        0
      );

      const due = Math.max(0, totalBilling - totalReceived);

      map.set(party, {
        totalBilling,
        totalReceived,
        due,
      });
    });

    return map;
  }, [parties, trips, payments]);

  // ============================================================
  // 🆕 ONLY DUE PARTIES (sorted by name)
  // ============================================================

  const dueParties = useMemo(() => {
    return [...partyDueMap.entries()]
      .filter(([_, data]) => data.due > 0)
      .map(([party]) => party)
      .sort((a, b) => a.localeCompare(b));
  }, [partyDueMap]);

  // ============================================================
  // All party options (for statement select)
  // ============================================================

  const partyOptions = useMemo(() => {
    const names = [
      ...parties.map(getPartyName),
      ...trips.map(getPartyName),
      ...payments.map(getPartyName),
    ];

    return [
      ...new Set(names.filter(Boolean)),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [
    parties,
    trips,
    payments,
  ]);

  const filteredPayments = useMemo(() => {
    const query = normalize(search);

    return [...payments]
      .filter((payment) => {
        const party =
          getPartyName(payment);

        const reference =
          getReference(payment);

        const notes =
          getNotes(payment);

        const mode =
          getMode(payment);

        const date = String(
          getDate(payment)
        ).slice(0, 10);

        const matchesSearch =
          !query ||
          normalize(party).includes(query) ||
          normalize(reference).includes(query) ||
          normalize(notes).includes(query) ||
          normalize(mode).includes(query);

        const matchesFrom =
          !dateFrom ||
          date >= dateFrom;

        const matchesTo =
          !dateTo ||
          date <= dateTo;

        const matchesMode =
          modeFilter === "All" ||
          mode === modeFilter;

        return (
          matchesSearch &&
          matchesFrom &&
          matchesTo &&
          matchesMode
        );
      })
      .sort(
        (a, b) =>
          (new Date(
            getDate(b)
          ).getTime() || 0) -
          (new Date(
            getDate(a)
          ).getTime() || 0)
      );
  }, [
    payments,
    search,
    dateFrom,
    dateTo,
    modeFilter,
  ]);

  const totalReceived = useMemo(
    () =>
      payments.reduce(
        (sum, payment) =>
          sum + getActivePaymentAmount(payment),
        0
      ),
    [payments]
  );

  const todayReceived = useMemo(
    () =>
      payments
        .filter((payment) =>
          isSameDay(
            getDate(payment)
          )
        )
        .reduce(
          (sum, payment) =>
            sum + getActivePaymentAmount(payment),
          0
        ),
    [payments]
  );

  const monthReceived = useMemo(
    () =>
      payments
        .filter((payment) =>
          isSameMonth(
            getDate(payment)
          )
        )
        .reduce(
          (sum, payment) =>
            sum + getActivePaymentAmount(payment),
          0
        ),
    [payments]
  );

  const filteredTotal = useMemo(
    () =>
      filteredPayments.reduce(
        (sum, payment) =>
          sum + getActivePaymentAmount(payment),
        0
      ),
    [filteredPayments]
  );

  const modeSummary = useMemo(
    () =>
      PAYMENT_MODES.map((mode) => ({
        mode,

        amount: payments
          .filter(
            (payment) =>
              getMode(payment) === mode
          )
          .reduce(
            (sum, payment) =>
              sum + getActivePaymentAmount(payment),
            0
          ),
      })),
    [payments]
  );

  const activeFilters =
    Boolean(search) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    modeFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setModeFilter("All");
  };

  const openAdd = () => {
    setEditing(null);

    setForm({
      ...createEmptyPayment(),
      date: todayISO(),
      partyName: "",
    });

    setFormOpen(true);
  };

  useEffect(() => {
    const handleQuickAction = (event) => {
      if (event.detail?.action !== "add-payment") return;
      setEditing(null);
      setForm({
        ...createEmptyPayment(),
        date: todayISO(),
        partyName: String(event.detail?.payload?.partyName || ""),
      });
      setFormOpen(true);
    };

    window.addEventListener("saoAutoTractorQuickAction", handleQuickAction);
    return () =>
      window.removeEventListener("saoAutoTractorQuickAction", handleQuickAction);
  }, []);

  const openEdit = (
    payment,
    index
  ) => {
    if (isPaymentReversed(payment)) {
      alert("Reversed receipts are kept as history and cannot be edited.");
      return;
    }
    setEditing({
      index,
      payment,
    });

    setForm({
      partyName:
        getPartyName(payment),

      amount: String(
        getAmount(payment)
      ),

      date:
        String(
          getDate(payment)
        ).slice(0, 10) ||
        todayISO(),

      paymentMode:
        getMode(payment),

      reference:
        getReference(payment),

      notes:
        getNotes(payment),
    });

    setFormOpen(true);
  };

  const savePayment = (event) => {
    event.preventDefault();

    const partyName =
      clean(form.partyName);

    const amount =
      Number(form.amount);

    if (!partyName) {
      alert(
        "Please select or enter a party."
      );
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert(
        "Please enter a valid payment amount."
      );
      return;
    }

    const reference = clean(form.reference);
    if (hasDuplicatePaymentReference(payments, partyName, reference, editing?.payment?.id)) {
      alert(`Receipt reference “${reference}” is already recorded for ${partyName}. Check the existing receipt before saving.`);
      return;
    }

    let billingRules = {};
    try {
      billingRules = JSON.parse(localStorage.getItem("saoAutoTractorSettings") || "{}") || {};
    } catch {
      billingRules = {};
    }
    const partyTrips = trips.filter((trip) =>
      normalize(trip?.partyName ?? trip?.party ?? trip?.customerName) === normalize(partyName),
    );
    const tripBilling = partyTrips.reduce(
      (sum, trip) => sum + getTripBillingAmount(trip),
      0,
    );
    const invoiceBilling = invoices
      .filter((invoice) =>
        normalize(
          invoice?.partyName ??
            invoice?.party ??
            invoice?.customerName ??
            invoice?.clientName ??
            invoice?.billTo?.name,
        ) === normalize(partyName),
      )
      .reduce(
        (sum, invoice) =>
          sum + Math.max(0, Number(invoice?.grandTotal ?? invoice?.totalAmount ?? invoice?.total ?? invoice?.amount) || 0),
        0,
      );
    const partyBilling = Math.max(tripBilling, invoiceBilling);
    const partyReceived = payments.reduce((sum, payment) => {
      if (
        editing?.payment?.id &&
        String(payment?.id) === String(editing.payment.id)
      ) return sum;
      return normalize(getPartyName(payment)) === normalize(partyName)
        ? sum + getActivePaymentAmount(payment)
        : sum;
    }, 0);
    const partyDue = Math.max(0, partyBilling - partyReceived);

    if (billingRules.allowAdvance === false && partyBilling <= 0) {
      alert("Advance payments are disabled. Record a trip for this party before adding a receipt.");
      return;
    }
    if (billingRules.allowExtraPayment === false && amount > partyDue + 0.005) {
      alert(`This receipt is above the party's current due of ${money(partyDue)}. Reduce the amount or enable extra payments in Settings → Finance → Billing.`);
      return;
    }

    const previousPayment = editing?.payment;
    const allocatedAmount = Math.min(
      getAmount(previousPayment),
      getPaymentAllocations(previousPayment).reduce(
        (sum, allocation) => sum + Math.max(0, Number(allocation?.amount) || 0),
        0,
      ),
    );
    if (previousPayment && allocatedAmount > 0 && normalize(getPartyName(previousPayment)) !== normalize(partyName)) {
      alert("This receipt is allocated to invoices. Keep its party unchanged, or reverse it and record a new receipt.");
      return;
    }
    if (previousPayment && amount + 0.005 < allocatedAmount) {
      alert(`This receipt already has ₹${allocatedAmount.toLocaleString("en-IN")} allocated. Its amount cannot be reduced below that value.`);
      return;
    }

    const changed = previousPayment && [
      [getPartyName(previousPayment), partyName],
      [getAmount(previousPayment), amount],
      [String(getDate(previousPayment)).slice(0, 10), form.date || todayISO()],
      [getMode(previousPayment), form.paymentMode || "Cash"],
      [getReference(previousPayment), reference],
      [getNotes(previousPayment), clean(form.notes)],
    ].some(([before, after]) => String(before) !== String(after));
    let correctionReason = "";
    if (changed) {
      correctionReason = window.prompt("Reason for correcting this receipt:")?.trim() || "";
      if (correctionReason.length < 3) {
        alert("Enter a short reason (at least 3 characters) to keep a correction history.");
        return;
      }
    }

    const payment = {
      ...(previousPayment || {}),
      id:
        previousPayment?.id ||
        `PAY-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      partyName,

      amount,

      date:
        form.date || todayISO(),

      paymentDate:
        form.date || todayISO(),

      paymentMode:
        form.paymentMode || "Cash",

      reference:
        reference,

      notes:
        clean(form.notes),

      createdAt:
        previousPayment?.createdAt ||
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
      corrections: changed
        ? [
            ...(Array.isArray(previousPayment?.corrections) ? previousPayment.corrections : []),
            {
              correctedAt: new Date().toISOString(),
              reason: correctionReason,
              previous: {
                partyName: getPartyName(previousPayment),
                amount: getAmount(previousPayment),
                date: getDate(previousPayment),
                paymentMode: getMode(previousPayment),
                reference: getReference(previousPayment),
                notes: getNotes(previousPayment),
              },
            },
          ]
        : Array.isArray(previousPayment?.corrections) ? previousPayment.corrections : [],
    };

    const next = [...payments];

    if (editing) {
      next[editing.index] =
        payment;
    } else {
      next.push(payment);
    }

    if (!writePayments(next)) {
      alert("Receipt could not be saved. Your form is still open; no change was made.");
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setForm(createEmptyPayment());

    loadData();
  };

  const deletePayment = (
    payment,
    index
  ) => {
    if (isPaymentReversed(payment)) return;
    const amount =
      getAmount(payment);

    const party =
      getPartyName(payment);

    const reason = window.prompt(
      `Reason for reversing ${money(amount)} received from ${party || "this party"}:`,
    )?.trim() || "";
    if (reason.length < 3) {
      alert("Enter a short reason (at least 3 characters). The receipt will remain in history as reversed.");
      return;
    }

    const reversedAt = new Date().toISOString();
    const next = payments.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, status: "Reversed", reversedAt, reversalReason: reason, updatedAt: reversedAt }
        : item,
    );

    if (!writePayments(next)) {
      alert("Receipt could not be reversed because browser storage is unavailable. No change was made.");
      return;
    }

    setViewPayment(null);

    loadData();
  };

  const exportCSV = () => {
    if (!filteredPayments.length) {
      alert(
        "No payments available to export."
      );
      return;
    }

    const rows = [
      [
        "Date",
        "Party",
        "Amount",
        "Payment Mode",
        "Reference",
        "Notes",
        "Status",
        "Reversal Reason",
        "Correction Count",
        "Invoice Allocations",
      ],

      ...filteredPayments.map(
        (payment) => [
          formatDate(
            getDate(payment)
          ),
          getPartyName(payment),
          getAmount(payment),
          getMode(payment),
          getReference(payment),
          getNotes(payment),
          isPaymentReversed(payment) ? "Reversed" : "Recorded",
          payment?.reversalReason || "",
          Array.isArray(payment?.corrections) ? payment.corrections.length : 0,
          getAllocationLabel(payment),
        ]
      ),
    ];

    const blob = new Blob(
      [buildCsv(rows)],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download =
      `SAO-Payments-${todayISO()}.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  const printReceipt = (
    payment
  ) => {
    if (isPaymentReversed(payment)) {
      alert("This receipt has been reversed and cannot be reprinted as valid proof of payment.");
      return;
    }
    setViewPayment(payment);

    setTimeout(() => {
      window.print();
    }, 350);
  };

  const openAllocation = (payment) => {
    setAllocationPayment(payment);
    setAllocationPaymentIndex(payments.indexOf(payment));
    setAllocationInvoiceId("");
    setAllocationAmount("");
    setAllocationError("");
  };

  const allocationCandidates = useMemo(() => {
    if (!allocationPayment || isPaymentReversed(allocationPayment)) return [];
    return invoices.filter((invoice) =>
      normalize(getPartyName(invoice)) === normalize(getPartyName(allocationPayment)) &&
      getInvoiceFinance(invoice, payments).due > 0.005,
    );
  }, [allocationPayment, invoices, payments]);

  const allocateReceipt = () => {
    setAllocationError("");
    let storedPayments;
    let storedInvoices;
    try {
      storedPayments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]");
      storedInvoices = JSON.parse(localStorage.getItem(INVOICES_KEY) || "[]");
    } catch {
      setAllocationError("Saved payment or invoice data could not be read.");
      return;
    }

    const paymentId = String(allocationPayment?.id ?? allocationPayment?._id ?? "");
    const freshPayment = paymentId
      ? (Array.isArray(storedPayments) ? storedPayments : []).find((payment) => String(payment?.id ?? payment?._id ?? "") === paymentId)
      : storedPayments?.[allocationPaymentIndex];
    const invoice = (Array.isArray(storedInvoices) ? storedInvoices : []).find((item) =>
      String(item?.id ?? item?._id ?? "") === String(allocationInvoiceId),
    );
    const validation = validateInvoiceAllocation(
      freshPayment,
      invoice,
      allocationAmount,
      storedPayments,
      storedInvoices,
    );
    if (!validation.valid) {
      setAllocationError(validation.error);
      return;
    }

    const amount = Math.round(Number(allocationAmount) * 100) / 100;
    const updatedPayments = storedPayments.map((payment) =>
      payment === freshPayment
        ? {
            ...payment,
            allocations: [
              ...getPaymentAllocations(payment),
              {
                invoiceId: String(invoice.id ?? invoice._id),
                invoiceNumber: invoice.invoiceNumber || "",
                amount,
                allocatedAt: new Date().toISOString(),
              },
            ],
          }
        : payment,
    );

    try {
      if (!writePayments(updatedPayments)) {
        setAllocationError("Allocation could not be saved. Check browser storage and try again.");
        return;
      }
      setAllocationPayment(null);
      setViewPayment(null);
    } catch (error) {
      console.error("Receipt allocation save error:", error);
      setAllocationError("Allocation could not be saved. Check available browser storage and try again.");
    }
  };

  // ============================================================
  // UPDATED: Print full party statement
  // ============================================================

  const printStatement = () => {
    if (!statementParty) return;

    setTimeout(() => {
      window.print();
    }, 120);
  };

  const statementPayments =
    useMemo(() => {
      if (!statementParty) {
        return [];
      }

      return payments
        .filter(
          (payment) =>
            normalize(
              getPartyName(payment)
            ) ===
            normalize(statementParty)
        )
        .sort(
          (a, b) =>
            (new Date(
              getDate(b)
            ).getTime() || 0) -
            (new Date(
              getDate(a)
            ).getTime() || 0)
        );
    }, [
      payments,
      statementParty,
    ]);

  const statementAccount = statementParty
    ? partyDueMap.get(statementParty)
    : null;

  // ============================================================
  // 🆕 SELECTED PARTY DUE FOR DISPLAY
  // ============================================================

  const selectedPartyDue = useMemo(() => {
    if (!form.partyName) return null;
    const data = partyDueMap.get(form.partyName);
    return data ? data.due : 0;
  }, [form.partyName, partyDueMap]);

  return (
    <div className="payments-page">
      <header className="payments-page-header">
        <div>
          <div className="payments-eyebrow">
            FINANCE • COLLECTIONS
          </div>

          <h1>Payments</h1>

          <p>
            Record received payments,
            track collection history,
            and manage party-wise
            receipts from one place.
          </p>
        </div>

        <div className="payments-header-actions">
          <button
            type="button"
            className="payments-btn payments-btn-secondary"
            onClick={loadData}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="payments-btn payments-btn-secondary"
            onClick={exportCSV}
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            className="payments-btn payments-btn-primary"
            onClick={openAdd}
          >
            <Plus size={17} />
            Add Payment
          </button>
        </div>
      </header>

      <section className="payments-overview">
        <div className="payments-overview-card featured">
          <div className="payments-overview-icon">
            <IndianRupee size={20} />
          </div>

          <div>
            <span>Total Received</span>
            <strong>
              {money(totalReceived)}
            </strong>
            <small>
              All recorded payments
            </small>
          </div>
        </div>

        <div className="payments-overview-card">
          <div className="payments-overview-icon">
            <CalendarDays size={20} />
          </div>

          <div>
            <span>Today</span>
            <strong>
              {money(todayReceived)}
            </strong>
            <small>
              Received today
            </small>
          </div>
        </div>

        <div className="payments-overview-card">
          <div className="payments-overview-icon">
            <Banknote size={20} />
          </div>

          <div>
            <span>This Month</span>
            <strong>
              {money(monthReceived)}
            </strong>
            <small>
              Current month collection
            </small>
          </div>
        </div>

        <div className="payments-overview-card">
          <div className="payments-overview-icon">
            <ReceiptText size={20} />
          </div>

          <div>
            <span>Entries</span>
            <strong>
              {payments.length}
            </strong>
            <small>
              {filteredPayments.length} shown
            </small>
          </div>
        </div>
      </section>

      <section className="payments-card">
        <div className="payments-toolbar">
          <div className="payments-search">
            <Search size={17} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search party, reference, notes..."
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="payments-toolbar-actions">
            <button
              type="button"
              className={`payments-filter-btn ${
                showFilters ||
                activeFilters
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setShowFilters(
                  (value) => !value
                )
              }
            >
              <Filter size={16} />
              Filters

              {activeFilters && (
                <span className="filter-dot" />
              )}

              <ChevronDown size={14} />
            </button>

            {activeFilters && (
              <button
                type="button"
                className="payments-clear-btn"
                onClick={
                  clearFilters
                }
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="payments-filter-panel">
            <label>
              <span>From Date</span>

              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) =>
                  setDateFrom(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>To Date</span>

              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) =>
                  setDateTo(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>Payment Mode</span>

              <select
                value={modeFilter}
                onChange={(event) =>
                  setModeFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All Modes
                </option>

                {PAYMENT_MODES.map(
                  (mode) => (
                    <option
                      key={mode}
                      value={mode}
                    >
                      {mode}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="payments-filter-result">
              <span>
                Filtered Collection
              </span>

              <strong>
                {money(filteredTotal)}
              </strong>
            </div>
          </div>
        )}

        {dateFrom && dateTo && dateFrom > dateTo && (
          <p className="finance-range-error" role="alert">From date must be on or before the To date.</p>
        )}

        <div className="payments-card-heading">
          <div>
            <h2>
              Payment Ledger
            </h2>

            <p>
              Every receipt recorded
              in the system.
            </p>
          </div>

          <span className="payments-count-badge">
            {filteredPayments.length}{" "}
            entries
          </span>
        </div>

        {filteredPayments.length ===
        0 ? (
          <div className="payments-empty">
            <div className="payments-empty-icon">
              <WalletCards size={24} />
            </div>

            <h3>
              No payments found
            </h3>

            <p>
              {activeFilters
                ? "Try changing or clearing your filters."
                : "Start by recording your first party payment."}
            </p>

            {!activeFilters && (
              <button
                type="button"
                className="payments-btn payments-btn-primary"
                onClick={openAdd}
              >
                <Plus size={16} />
                Add First Payment
              </button>
            )}
          </div>
        ) : (
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Payment Mode</th>
                  <th>Reference</th>
                  <th className="amount-column">
                    Amount
                  </th>
                  <th className="action-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map(
                  (payment) => {
                    const originalIndex =
                      payments.indexOf(
                        payment
                      );

                    return (
                      <tr
                        key={
                          payment.id ||
                          `${getDate(
                            payment
                          )}-${getPartyName(
                            payment
                          )}-${originalIndex}`
                        }
                      >
                        <td>
                          <span className="payment-date">
                            {formatDate(
                              getDate(
                                payment
                              )
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="payment-party">
                            <div className="payment-party-icon">
                              <UserRound
                                size={15}
                              />
                            </div>

                            <div>
                              <strong>
                                {getPartyName(
                                  payment
                                ) ||
                                  "Unknown Party"}
                              </strong>

                              {getNotes(
                                payment
                              ) && (
                                <small>
                                  {getNotes(
                                    payment
                                  )}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`payment-mode mode-${normalize(
                              getMode(
                                payment
                              )
                            ).replace(
                              /\s+/g,
                              "-"
                            )}`}
                          >
                            {getMode(
                              payment
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="payment-reference">
                            {getReference(
                              payment
                            ) || "—"}
                          </span>
                          {isPaymentReversed(payment) && <small className="payment-reversed-label">Reversed · {payment.reversalReason || "Reason not recorded"}</small>}
                          {payment.corrections?.length > 0 && <small className="payment-correction-label">{payment.corrections.length} correction{payment.corrections.length === 1 ? "" : "s"} recorded</small>}
                        </td>

                        <td className="amount-column">
                          <strong className="payment-amount">
                            {money(
                              getAmount(
                                payment
                              )
                            )}
                          </strong>
                        </td>

                        <td className="action-column">
                          <div className="payments-row-actions">
                            <ActionButton
                              icon={
                                <Eye
                                  size={14}
                                />
                              }
                              label="View"
                              onClick={() =>
                                setViewPayment(
                                  payment
                                )
                              }
                            />

                            {!isPaymentReversed(payment) && <ActionButton
                              icon={<Pencil size={14} />}
                              label="Edit"
                              onClick={() => openEdit(payment, originalIndex)}
                            />}

                            <ActionButton
                              icon={
                                <Printer
                                  size={14}
                                />
                              }
                              label="Print"
                              onClick={() =>
                                printReceipt(
                                  payment
                                )
                              }
                            />

                            <ActionButton
                              icon={<RotateCcw size={14} />}
                              label={isPaymentReversed(payment) ? "Reversed" : "Reverse"}
                              danger
                              disabled={isPaymentReversed(payment)}
                              onClick={() =>
                                deletePayment(
                                  payment,
                                  originalIndex
                                )
                              }
                            />
                          </div>
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

      <section className="payments-lower-grid">
        <div className="payments-card">
          <div className="payments-card-heading compact">
            <div>
              <h2>
                Collection by Mode
              </h2>

              <p>
                How payments have been
                received.
              </p>
            </div>
          </div>

          <div className="payments-mode-list">
            {modeSummary.map(
              (item) => (
                <div
                  className="payments-mode-row"
                  key={item.mode}
                >
                  <div>
                    <span
                      className={`mode-mini-dot mode-${normalize(
                        item.mode
                      )}`}
                    />

                    <strong>
                      {item.mode}
                    </strong>
                  </div>

                  <strong>
                    {money(item.amount)}
                  </strong>
                </div>
              )
            )}
          </div>
        </div>

        <div className="payments-card">
          <div className="payments-card-heading compact">
            <div>
              <h2>
                Party Statements
              </h2>

              <p>
                Open a party-wise receipt
                history.
              </p>
            </div>
          </div>

          <div className="payments-party-statement">
            <select
              value={statementParty}
              onChange={(event) =>
                setStatementParty(
                  event.target.value
                )
              }
            >
              <option value="">
                Select Party
              </option>

              {partyOptions.map(
                (party) => (
                  <option
                    key={party}
                    value={party}
                  >
                    {party}
                  </option>
                )
              )}
            </select>

            {/* UPDATED: View Statement → Print Statement */}
            <button
              type="button"
              className="payments-btn payments-btn-secondary"
              disabled={
                !statementParty
              }
              onClick={printStatement}
              title="Print party payment statement"
            >
              <Printer size={16} />
              Print Statement
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          ADD / EDIT PAYMENT MODAL
      ============================================================ */}

      {formOpen && (
        <Modal
          title={
            editing
              ? "Edit Payment"
              : "Add Payment"
          }
          subtitle={
            editing
              ? "Update the existing receipt details."
              : "Record a new amount received from a party."
          }
          onClose={() =>
            setFormOpen(false)
          }
        >
          <form
            className="payments-form"
            onSubmit={savePayment}
          >
            <div className="payments-form-grid">
              <label className="payments-field full">
                <span>
                  Party *
                </span>

                <div className="payments-party-select-wrap">
                  <input
                    list="payment-party-options"
                    value={
                      form.partyName
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        partyName:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Select or type party name"
                    required
                  />

                  <datalist id="payment-party-options">
                    {/* 🔥 ONLY DUE PARTIES */}
                    {dueParties.map(
                      (party) => (
                        <option
                          key={party}
                          value={party}
                        />
                      )
                    )}
                  </datalist>

                  {/* 🔥 DUE BALANCE DISPLAY */}
                  {form.partyName && selectedPartyDue !== null && selectedPartyDue > 0 && (
                    <div className="payment-due-display">
                      <AlertCircle size={14} />
                      <span>Due Balance:</span>
                      <strong className="due-amount">
                        {money(selectedPartyDue)}
                      </strong>
                    </div>
                  )}

                  {form.partyName && selectedPartyDue !== null && selectedPartyDue === 0 && (
                    <div className="payment-due-display zero-due">
                      <Check size={14} />
                      <span>No outstanding due</span>
                    </div>
                  )}
                </div>
              </label>

              <label className="payments-field">
                <span>
                  Amount *
                </span>

                <div className="payments-input-prefix">
                  <span>₹</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.amount
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        amount:
                          event.target
                            .value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </label>

              <label className="payments-field">
                <span>
                  Payment Date *
                </span>

                <input
                  type="date"
                  value={
                    form.date
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date:
                        event.target
                          .value,
                    })
                  }
                  required
                />
              </label>

              <label className="payments-field">
                <span>
                  Payment Mode
                </span>

                <select
                  value={
                    form.paymentMode
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentMode:
                        event.target
                          .value,
                    })
                  }
                >
                  {PAYMENT_MODES.map(
                    (mode) => (
                      <option
                        key={mode}
                        value={mode}
                      >
                        {mode}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="payments-field">
                <span>
                  Reference / UTR
                </span>

                <input
                  value={
                    form.reference
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reference:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Transaction / receipt reference"
                />
              </label>

              <label className="payments-field full">
                <span>
                  Notes
                </span>

                <textarea
                  rows="3"
                  value={
                    form.notes
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Optional payment notes..."
                />
              </label>
            </div>

            <div className="payments-form-actions">
              <button
                type="button"
                className="payments-btn payments-btn-secondary"
                onClick={() =>
                  setFormOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="payments-btn payments-btn-primary"
              >
                <Check size={16} />

                {editing
                  ? "Update Payment"
                  : "Save Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewPayment && (
        <Modal
          title="Payment Details"
          subtitle="Receipt information"
          onClose={() =>
            setViewPayment(null)
          }
        >
          <div className="payment-detail-card">
            <div className="payment-detail-hero">
              <div className="payment-detail-icon">
                <IndianRupee
                  size={25}
                />
              </div>

              <div>
                <span>
                  Amount Received
                </span>

                <strong>
                  {money(
                    getAmount(
                      viewPayment
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="payment-detail-grid">
              <div>
                <span>
                  Party
                </span>

                <strong>
                  {getPartyName(
                    viewPayment
                  ) || "—"}
                </strong>
              </div>

              <div>
                <span>
                  Date
                </span>

                <strong>
                  {formatDate(
                    getDate(
                      viewPayment
                    )
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Payment Mode
                </span>

                <strong>
                  {getMode(
                    viewPayment
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Reference
                </span>

                <strong>
                  {getReference(
                    viewPayment
                  ) || "—"}
                </strong>
              </div>

              <div className="full">
                <span>Status</span>
                <strong>{isPaymentReversed(viewPayment) ? `Reversed · ${viewPayment.reversalReason || "Reason not recorded"}` : "Recorded"}</strong>
              </div>

              {viewPayment.corrections?.length > 0 && (
                <div className="full">
                  <span>Correction History</span>
                  <strong>{viewPayment.corrections.map((correction, index) => `${index + 1}. ${correction.reason} (${formatDate(correction.correctedAt)})`).join(" · ")}</strong>
                </div>
              )}

              <div className="full">
                <span>Invoice Allocations</span>
                <strong>{getAllocationLabel(viewPayment) || "No invoice allocation"}</strong>
                {!isPaymentReversed(viewPayment) && (
                  <small>Unallocated receipt balance: {money(getPaymentUnallocatedAmount(viewPayment))}</small>
                )}
              </div>

              <div className="full">
                <span>
                  Notes
                </span>

                <strong>
                  {getNotes(
                    viewPayment
                  ) || "—"}
                </strong>
              </div>
            </div>

            <div className="payments-form-actions">
              {!isPaymentReversed(viewPayment) && getPaymentUnallocatedAmount(viewPayment) > 0.005 && (
                <button
                  type="button"
                  className="payments-btn payments-btn-secondary"
                  onClick={() => openAllocation(viewPayment)}
                >
                  <FileText size={16} /> Allocate to Invoice
                </button>
              )}
              <button
                type="button"
                className="payments-btn payments-btn-secondary"
                onClick={() =>
                  printReceipt(
                    viewPayment
                  )
                }
              >
                <Printer size={16} />
                Print Receipt
              </button>

              <button
                type="button"
                className="payments-btn payments-btn-primary"
                onClick={() =>
                  setViewPayment(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {allocationPayment && (
        <Modal
          title="Allocate Receipt to Invoice"
          subtitle={`${getPartyName(allocationPayment)} · ${money(getPaymentUnallocatedAmount(allocationPayment))} unallocated`}
          onClose={() => setAllocationPayment(null)}
        >
          <div className="payment-allocation-form">
            <label>
              <span>Invoice *</span>
              <select
                value={allocationInvoiceId}
                onChange={(event) => {
                  const invoiceId = event.target.value;
                  setAllocationInvoiceId(invoiceId);
                  const invoice = allocationCandidates.find((item) => String(item?.id ?? item?._id ?? "") === invoiceId);
                  const invoiceDue = invoice ? getInvoiceFinance(invoice, payments).due : 0;
                  const cap = Math.min(getPaymentUnallocatedAmount(allocationPayment), invoiceDue);
                  setAllocationAmount(cap > 0 ? cap.toFixed(2) : "");
                  setAllocationError("");
                }}
              >
                <option value="">Choose invoice</option>
                {allocationCandidates.map((invoice) => {
                  const finance = getInvoiceFinance(invoice, payments);
                  return (
                    <option key={invoice.id ?? invoice._id} value={String(invoice.id ?? invoice._id)}>
                      {invoice.invoiceNumber || "Invoice"} · {formatDate(invoice.invoiceDate)} · Due {money(finance.due)}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              <span>Amount to allocate *</span>
              <div className="payments-input-wrap">
                <span>₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={allocationAmount}
                  onChange={(event) => setAllocationAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </label>

            {allocationError && <p className="payment-allocation-error" role="alert">{allocationError}</p>}
            {!allocationCandidates.length && <p className="payment-allocation-empty">There are no saved invoices with a balance due for this party.</p>}

            <div className="payments-form-actions">
              <button type="button" className="payments-btn payments-btn-secondary" onClick={() => setAllocationPayment(null)}>Cancel</button>
              <button
                type="button"
                className="payments-btn payments-btn-primary"
                disabled={!allocationInvoiceId || !allocationAmount || !allocationCandidates.length}
                onClick={allocateReceipt}
              >
                <Check size={16} /> Save Allocation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {statementParty && (
        <Modal
          title={`${statementParty} — Payment Statement`}
          subtitle={`${statementPayments.length} payment entries`}
          onClose={() =>
            setStatementParty("")
          }
          wide
        >
          {statementPayments.length ? (
            <>
              <div className="statement-summary">
                <div>
                  <span>
                    Total Billed
                  </span>

                  <strong>
                    {money(statementAccount?.totalBilling || 0)}
                  </strong>
                </div>

                <div>
                  <span>Total Received</span>
                  <strong>{money(statementPayments.reduce((sum, payment) => sum + getActivePaymentAmount(payment), 0))}</strong>
                </div>

                <div>
                  <span>Balance Due</span>
                  <strong>{money(statementAccount?.due || 0)}</strong>
                </div>

                <div>
                  <span>
                    Entries
                  </span>

                  <strong>
                    {
                      statementPayments.length
                    }
                  </strong>
                </div>
              </div>

              <div className="statement-table-wrapper">
                <table className="statement-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th>Invoice Allocation</th>
                      <th>Notes</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {statementPayments.map(
                      (
                        payment,
                        index
                      ) => (
                        <tr
                          key={
                            payment.id ||
                            index
                          }
                        >
                          <td>
                            {formatDate(
                              getDate(
                                payment
                              )
                            )}
                          </td>

                          <td>
                            {getMode(
                              payment
                            )}
                          </td>

                          <td>
                            {getReference(
                              payment
                            ) || "—"}
                          </td>

                          <td>{getAllocationLabel(payment) || "Unallocated"}</td>

                          <td>
                            {getNotes(
                              payment
                            ) || "—"}
                          </td>

                          <td className={isPaymentReversed(payment) ? "payment-reversed-cell" : ""}>
                            {money(
                              getAmount(
                                payment
                              )
                            )}
                            {isPaymentReversed(payment) && <small>Reversed · {payment.reversalReason || "Reason not recorded"}</small>}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="payments-empty small">
              <div className="payments-empty-icon">
                <FileText size={21} />
              </div>

              <h3>
                No payment history
              </h3>

              <p>
                No payments are recorded
                for this party.
              </p>
            </div>
          )}
        </Modal>
      )}

      {viewPayment && (
        <div className="payments-print-receipt">
          <div className="print-receipt-inner">
            <div className="print-receipt-header">
              <div>
                <div className="print-receipt-eyebrow">
                  PAYMENT RECEIPT
                </div>

                <h1>
                  SAO AUTO TRACTOR
                </h1>

                <p>
                  Payment Collection
                  Receipt
                </p>
              </div>

              <ReceiptText size={38} />
            </div>

            <div className="print-receipt-number">
              Receipt Date:{" "}
              {formatDate(
                getDate(
                  viewPayment
                )
              )}
            </div>

            <div className="print-receipt-grid">
              <div>
                <span>
                  Received From
                </span>

                <strong>
                  {getPartyName(
                    viewPayment
                  ) || "—"}
                </strong>
              </div>

              <div>
                <span>
                  Payment Mode
                </span>

                <strong>
                  {getMode(
                    viewPayment
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Reference
                </span>

                <strong>
                  {getReference(
                    viewPayment
                  ) || "—"}
                </strong>
              </div>

              <div>
                <span>
                  Amount
                </span>

                <strong>
                  {money(
                    getAmount(
                      viewPayment
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="print-receipt-total">
              <span>
                Amount Received
              </span>

              <strong>
                {money(
                  getAmount(
                    viewPayment
                  )
                )}
              </strong>
            </div>

            {getNotes(
              viewPayment
            ) && (
              <div className="print-receipt-notes">
                <span>
                  Notes
                </span>

                <p>
                  {getNotes(
                    viewPayment
                  )}
                </p>
              </div>
            )}

            <div className="print-receipt-footer">
              <span>
                Thank you for your payment.
              </span>

              <span>
                Authorized Signature
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PRINT STATEMENT (only visible during print of a statement)
      ============================================================ */}

      {statementParty && (
        <div className="payments-print-statement">
          <div className="print-statement-inner">
            <div className="print-statement-header">
              <div>
                <div className="print-statement-eyebrow">
                  PAYMENT STATEMENT
                </div>

                <h1>SAO AUTO TRACTOR</h1>

                <p>Party-wise Payment History</p>
              </div>

              <ReceiptText size={38} />
            </div>

            <div className="print-statement-party">
              <span>Party</span>
              <strong>{statementParty}</strong>
            </div>

            <div className="print-statement-grid">
              <div>
                <span>Total Received</span>
                <strong>
                  {money(
                    statementPayments.reduce(
                      (sum, payment) =>
                        sum + getActivePaymentAmount(payment),
                      0
                    )
                  )}
                </strong>
              </div>

              <div>
                <span>Total Billed</span>
                <strong>{money(statementAccount?.totalBilling || 0)}</strong>
              </div>

              <div>
                <span>Balance Due</span>
                <strong>{money(statementAccount?.due || 0)}</strong>
              </div>

              <div>
                <span>Entries</span>
                <strong>{statementPayments.length}</strong>
              </div>

              <div>
                <span>Generated</span>
                <strong>{formatDate(todayISO())}</strong>
              </div>
            </div>

            <table className="print-statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Invoice Allocation</th>
                  <th>Notes</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {statementPayments.map((payment, index) => (
                  <tr key={payment.id || index}>
                    <td>{formatDate(getDate(payment))}</td>
                    <td>{getMode(payment)}</td>
                    <td>{getReference(payment) || "—"}</td>
                    <td>{getAllocationLabel(payment) || "Unallocated"}</td>
                    <td>{getNotes(payment) || "—"}</td>
                    <td className="align-right">
                      {money(getAmount(payment))}
                      {isPaymentReversed(payment) && <small>Reversed: {payment.reversalReason || "Reason not recorded"}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="print-statement-footer">
              <span>Computer generated statement.</span>
              <span>Authorized Signature</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
