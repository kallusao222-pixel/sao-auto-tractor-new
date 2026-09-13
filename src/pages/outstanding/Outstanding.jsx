import { useEffect, useMemo, useState, Fragment } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  FileText,
  Filter,
  History,
  IndianRupee,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  Send,
  WalletCards,
  X,
} from "lucide-react";
import "./Outstanding.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const PARTIES_KEY = "saoAutoTractorParties";
const PAYMENTS_KEY = "saoAutoTractorPayments";
const BUSINESS_KEY = "saoAutoTractorBusinessDetails";

const cleanText = (value) => String(value ?? "").trim();

const normalizeText = (value) =>
  cleanText(value).replace(/\s+/g, " ").toLowerCase();

const getPartyName = (item) =>
  cleanText(
    item?.partyName ??
      item?.party ??
      item?.customerName ??
      item?.customer ??
      item?.name
  );

const getAmount = (item) => {
  const candidates = [
    item?.amount,
    item?.totalAmount,
    item?.total,
    item?.billAmount,
    item?.netAmount,
    item?.grandTotal,
  ];

  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }

  const quantity = Number(item?.quantity ?? item?.qty ?? 0);
  const rate = Number(item?.rate ?? item?.price ?? item?.amountPerTrip ?? 0);

  if (Number.isFinite(quantity) && Number.isFinite(rate)) {
    return quantity * rate;
  }

  return 0;
};

const getTripDate = (trip) =>
  cleanText(
    trip?.date ??
      trip?.tripDate ??
      trip?.createdAt ??
      trip?.recordDate
  );

const getPaymentDate = (payment) =>
  cleanText(
    payment?.date ??
      payment?.paymentDate ??
      payment?.receivedDate ??
      payment?.createdAt
  );

const getPaymentAmount = (payment) => {
  const candidates = [
    payment?.amount,
    payment?.receivedAmount,
    payment?.paidAmount,
    payment?.paymentAmount,
  ];

  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }

  return 0;
};

const getPaymentMode = (payment) =>
  cleanText(
    payment?.paymentMode ??
      payment?.mode ??
      payment?.method ??
      "Other"
  );

const parseDate = (value) => {
  if (!value) return null;

  const text = cleanText(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [dd, mm, yyyy] = text.split("/");
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    const [dd, mm, yyyy] = text.split("-");
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatMoney = (value) => {
  const number = Number(value) || 0;

  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  const date = parseDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* FIX 3: Local timezone date (was UTC before) */
const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

const getMonthStart = () => {
  const d = new Date();
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = firstOfMonth.getTimezoneOffset() * 60000;
  return new Date(firstOfMonth.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

/* FIX 6: Aging bucket helper */
const getAgeInDays = (dateValue) => {
  const date = parseDate(dateValue);
  if (!date) return null;

  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diff >= 0 ? diff : 0;
};

/* FIX: Business details for print header */
const getBusinessDetails = () => {
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

function StatCard({ icon, label, value, helper, tone = "" }) {
  return (
    <div className={`outstanding-stat-card ${tone}`}>
      <div className="outstanding-stat-icon">{icon}</div>

      <div className="outstanding-stat-content">
        <span className="outstanding-stat-label">{label}</span>
        <strong>{value}</strong>
        {helper && <small>{helper}</small>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Paid: { className: "paid", label: "Paid" },
    Due: { className: "due", label: "Due" },
    Partial: { className: "partial", label: "Partial" },
    Advance: { className: "advance", label: "Advance" },
  };

  const item = config[status] || config.Due;

  return (
    <span className={`outstanding-status ${item.className}`}>
      <span className="status-dot" />
      {item.label}
    </span>
  );
}

/* FIX 5: WhatsApp message helpers */
const buildWhatsAppMessage = (account, businessName) => {
  const dueAmount =
    account.balance > 0 ? account.balance : 0;

  const message =
    `🙏 *${businessName || "SAO AUTO TRACTOR"}*%0A%0A` +
    `Dear *${account.partyName}*,%0A%0A` +
    `Your account summary:%0A` +
    `• Total Billed: ${formatMoney(account.billed)}%0A` +
    `• Total Paid: ${formatMoney(account.received)}%0A` +
    `• *Outstanding: ${formatMoney(dueAmount)}*%0A%0A` +
    `Kindly clear the pending balance at your earliest.%0A%0A` +
    `Thank you for your business.`;

  return message;
};

const openWhatsApp = (account, businessName) => {
  const message = buildWhatsAppMessage(account, businessName);

  /* Try to use party contact number if available */
  window.open(
    `https://wa.me/?text=${message}`,
    "_blank"
  );
};

function AccountModal({
  account,
  businessName,
  onClose,
  onReceivePayment,
  onPrint,
  onWhatsApp,
}) {
  /* FIX 1: Esc key closes modal */
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!account) return null;

  return (
    <div className="outstanding-modal-overlay" onMouseDown={onClose}>
      <div
        className="outstanding-account-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="outstanding-modal-header">
          <div>
            <span className="outstanding-eyebrow">PARTY ACCOUNT</span>
            <h2>{account.partyName}</h2>
            <p>Complete billing and payment statement</p>
          </div>

          <button
            type="button"
            className="outstanding-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="account-summary-grid">
          <div>
            <span>Total Billing</span>
            <strong>{formatMoney(account.billed)}</strong>
          </div>

          <div>
            <span>Total Received</span>
            <strong>{formatMoney(account.received)}</strong>
          </div>

          <div
            className={
              account.balance > 0 ? "balance-positive" : ""
            }
          >
            <span>Outstanding</span>
            <strong>
              {account.balance > 0
                ? formatMoney(account.balance)
                : account.balance < 0
                  ? formatMoney(Math.abs(account.balance))
                  : formatMoney(0)}
            </strong>
          </div>
        </div>

        <div className="account-modal-actions">
          <button
            type="button"
            className="outstanding-btn primary"
            onClick={() => onReceivePayment(account.partyName)}
          >
            <Banknote size={16} />
            Receive Payment
          </button>

          {account.balance > 0.01 && (
            <button
              type="button"
              className="outstanding-btn whatsapp"
              onClick={() => onWhatsApp(account)}
              title="Send WhatsApp reminder"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          )}

          <button
            type="button"
            className="outstanding-btn secondary"
            onClick={() => onPrint(account)}
          >
            <Printer size={16} />
            Print Statement
          </button>
        </div>

        <div className="account-history-section">
          <div className="account-section-title">
            <div>
              <h3>Account Activity</h3>
              <span>
                {account.transactions.length} transaction
                {account.transactions.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {account.transactions.length === 0 ? (
            <div className="account-empty">
              <History size={22} />
              <span>No account activity found.</span>
            </div>
          ) : (
            <div className="account-history-table-wrap">
              <table className="account-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th className="amount-column">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {account.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.date)}</td>

                      <td>
                        <span
                          className={`account-type ${transaction.type.toLowerCase()}`}
                        >
                          {transaction.type}
                        </span>
                      </td>

                      <td>
                        <div className="transaction-detail">
                          <strong>{transaction.details}</strong>
                          {transaction.meta && (
                            <span>{transaction.meta}</span>
                          )}
                        </div>
                      </td>

                      <td className="amount-column">
                        <strong
                          className={
                            transaction.type === "Payment"
                              ? "payment-amount"
                              : "billing-amount"
                          }
                        >
                          {transaction.type === "Payment" ? "-" : "+"}
                          {formatMoney(transaction.amount)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Outstanding() {
  const [trips, setTrips] = useState([]);
  const [parties, setParties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [business, setBusiness] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [expandedParty, setExpandedParty] = useState(null);

  const [paymentParty, setPaymentParty] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getToday());
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  /* FIX 7: bulk reminder state */
  const [showBulkModal, setShowBulkModal] = useState(false);

  const loadData = () => {
    try {
      const storedTrips = JSON.parse(
        localStorage.getItem(TRIPS_KEY) || "[]"
      );

      const storedParties = JSON.parse(
        localStorage.getItem(PARTIES_KEY) || "[]"
      );

      const storedPayments = JSON.parse(
        localStorage.getItem(PAYMENTS_KEY) || "[]"
      );

      setTrips(Array.isArray(storedTrips) ? storedTrips : []);
      setParties(Array.isArray(storedParties) ? storedParties : []);
      setPayments(Array.isArray(storedPayments) ? storedPayments : []);
      setBusiness(getBusinessDetails());
    } catch (error) {
      console.error("Outstanding data load error:", error);
      setTrips([]);
      setParties([]);
      setPayments([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorage = () => loadData();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("saoAutoTractorDataChanged", handleStorage);

    const interval = setInterval(loadData, 1500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "saoAutoTractorDataChanged",
        handleStorage
      );
      clearInterval(interval);
    };
  }, []);

  /* FIX 1: Esc key for payment modal */
  useEffect(() => {
    if (!showPaymentModal && !showBulkModal) return;

    const handleKey = (event) => {
      if (event.key === "Escape") {
        setShowPaymentModal(false);
        setShowBulkModal(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showPaymentModal, showBulkModal]);

  const accounts = useMemo(() => {
    const map = new Map();

    const ensureParty = (partyName) => {
      const normalized = normalizeText(partyName);

      if (!normalized) return null;

      if (!map.has(normalized)) {
        map.set(normalized, {
          partyName: cleanText(partyName),
          billed: 0,
          received: 0,
          transactions: [],
          oldestDueDate: null,
        });
      }

      return map.get(normalized);
    };

    trips.forEach((trip, index) => {
      const partyName = getPartyName(trip);
      const amount = getAmount(trip);

      if (!partyName || amount <= 0) return;

      const account = ensureParty(partyName);

      account.billed += amount;

      account.transactions.push({
        id: `bill-${index}-${partyName}-${getTripDate(trip)}`,
        type: "Billing",
        date: getTripDate(trip),
        amount,
        details:
          cleanText(
            trip?.material ??
              trip?.product ??
              trip?.description ??
              trip?.site ??
              "Transport service"
          ) || "Transport service",
        meta: cleanText(
          trip?.vehicleNumber ??
            trip?.tractorNumber ??
            trip?.tractor ??
            trip?.tripType ??
            ""
        ),
      });
    });

    payments.forEach((payment, index) => {
      const partyName = getPartyName(payment);
      const amount = getPaymentAmount(payment);

      if (!partyName || amount <= 0) return;

      const account = ensureParty(partyName);

      account.received += amount;

      account.transactions.push({
        id: `payment-${index}-${partyName}-${getPaymentDate(payment)}`,
        type: "Payment",
        date: getPaymentDate(payment),
        amount,
        details: `${getPaymentMode(payment)} payment`,
        meta: cleanText(
          payment?.reference ??
            payment?.transactionId ??
            payment?.remarks ??
            payment?.notes ??
            ""
        ),
      });
    });

    parties.forEach((party) => {
      const partyName = getPartyName(party);

      if (partyName) ensureParty(partyName);
    });

    return Array.from(map.values())
      .map((account) => {
        const balance = account.billed - account.received;

        let status = "Paid";

        if (balance > 0.01) {
          status =
            account.received > 0 ? "Partial" : "Due";
        } else if (balance < -0.01) {
          status = "Advance";
        }

        const collectionPercentage =
          account.billed > 0
            ? Math.min(
                100,
                Math.max(0, (account.received / account.billed) * 100)
              )
            : 0;

        account.transactions.sort((a, b) => {
          const dateA = parseDate(a.date)?.getTime() || 0;
          const dateB = parseDate(b.date)?.getTime() || 0;
          return dateB - dateA;
        });

        /* FIX 6: Compute oldest due date (oldest billing if due > 0) */
        let oldestDueDate = null;
        if (balance > 0.01) {
          const billingDates = account.transactions
            .filter((t) => t.type === "Billing")
            .map((t) => parseDate(t.date))
            .filter(Boolean)
            .sort((a, b) => a.getTime() - b.getTime());

          if (billingDates.length > 0) {
            oldestDueDate = billingDates[0].toISOString().slice(0, 10);
          }
        }

        return {
          ...account,
          balance,
          status,
          collectionPercentage,
          oldestDueDate,
          dueAge: oldestDueDate ? getAgeInDays(oldestDueDate) : null,
        };
      })
      .sort((a, b) => {
        const balanceDifference =
          Math.abs(b.balance) - Math.abs(a.balance);

        if (balanceDifference !== 0) return balanceDifference;

        return a.partyName.localeCompare(b.partyName);
      });
  }, [trips, payments, parties]);

  const filteredAccounts = useMemo(() => {
    const query = normalizeText(search);

    return accounts.filter((account) => {
      const matchesSearch =
        !query ||
        normalizeText(account.partyName).includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        account.status.toLowerCase() === statusFilter;

      const accountDates = account.transactions
        .map((item) => parseDate(item.date))
        .filter(Boolean);

      const fromDate = dateFrom ? parseDate(dateFrom) : null;
      const toDate = dateTo ? parseDate(dateTo) : null;

      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      const matchesDate =
        !fromDate && !toDate
          ? true
          : accountDates.some((date) => {
              if (fromDate && date < fromDate) return false;
              if (toDate && date > toDate) return false;
              return true;
            });

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [accounts, search, statusFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totalBilled = filteredAccounts.reduce(
      (sum, account) => sum + account.billed,
      0
    );

    const totalReceived = filteredAccounts.reduce(
      (sum, account) => sum + account.received,
      0
    );

    const positiveDue = filteredAccounts.reduce(
      (sum, account) => sum + Math.max(0, account.balance),
      0
    );

    const totalAdvance = filteredAccounts.reduce(
      (sum, account) => sum + Math.max(0, -account.balance),
      0
    );

    const partiesDue = filteredAccounts.filter(
      (account) => account.balance > 0.01
    ).length;

    const collection =
      totalBilled > 0
        ? Math.min(100, (totalReceived / totalBilled) * 100)
        : 0;

    /* FIX 6: Aging buckets */
    const aging = {
      d0_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90plus: 0,
    };

    filteredAccounts.forEach((account) => {
      if (account.balance <= 0.01) return;

      const age = account.dueAge;

      if (age === null) {
        aging.d0_30 += account.balance;
        return;
      }

      if (age <= 30) aging.d0_30 += account.balance;
      else if (age <= 60) aging.d31_60 += account.balance;
      else if (age <= 90) aging.d61_90 += account.balance;
      else aging.d90plus += account.balance;
    });

    return {
      totalBilled,
      totalReceived,
      positiveDue,
      totalAdvance,
      partiesDue,
      collection,
      aging,
    };
  }, [filteredAccounts]);

  /* FIX 7: Top 5 overdue parties for bulk reminder */
  const topOverdueParties = useMemo(() => {
    return [...accounts]
      .filter((account) => account.balance > 0.01)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [accounts]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    search || statusFilter !== "all" || dateFrom || dateTo;

  const openAccount = (account) => {
    setSelectedAccount(account);
  };

  const openPayment = (partyName = "") => {
    setPaymentParty(partyName);
    setPaymentAmount("");
    setPaymentDate(getToday());
    setPaymentMode("Cash");
    setPaymentReference("");
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const addPayment = () => {
    const partyName = cleanText(paymentParty);
    const amount = Number(paymentAmount);

    if (!partyName) {
      alert("Please select a party.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const payment = {
      id: `payment-${Date.now()}`,
      partyName,
      amount,
      date: paymentDate || getToday(),
      paymentMode,
      reference: cleanText(paymentReference),
      notes: cleanText(paymentNotes),
      createdAt: new Date().toISOString(),
    };

    const existing = JSON.parse(
      localStorage.getItem(PAYMENTS_KEY) || "[]"
    );

    const nextPayments = Array.isArray(existing)
      ? [...existing, payment]
      : [payment];

    localStorage.setItem(
      PAYMENTS_KEY,
      JSON.stringify(nextPayments)
    );

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    setShowPaymentModal(false);
    loadData();
  };

  const exportCSV = () => {
    if (!filteredAccounts.length) {
      alert("No outstanding data available to export.");
      return;
    }

    const headers = [
      "Party",
      "Total Billing",
      "Total Received",
      "Outstanding",
      "Advance",
      "Status",
      "Due Age (days)",
    ];

    const rows = filteredAccounts.map((account) => [
      account.partyName,
      account.billed.toFixed(2),
      account.received.toFixed(2),
      Math.max(0, account.balance).toFixed(2),
      Math.max(0, -account.balance).toFixed(2),
      account.status,
      account.dueAge !== null ? account.dueAge : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `outstanding-${getToday()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  /* FIX 8: Print statement with full business header */
  const printStatement = (account) => {
    if (!account) return;

    const rows = account.transactions
      .map(
        (transaction) => `
          <tr>
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.type}</td>
            <td>${transaction.details}</td>
            <td>${transaction.type === "Payment" ? "-" : "+"}${formatMoney(
              transaction.amount
            )}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!printWindow) {
      alert("Please allow pop-ups to print the statement.");
      return;
    }

    const biz = business || {};
    const bizName = biz.businessName || "SAO AUTO TRACTOR";
    const bizOwner = biz.ownerName || "";
    const bizAddress = biz.address || "";
    const bizMobile = biz.mobile || "";
    const bizAltMobile = biz.alternateMobile || "";
    const bizEmail = biz.email || "";
    const bizGstin = biz.gstin || "";
    const bizLogo = biz.logo || "";

    const contactLine = [
      bizMobile && `Mob: ${bizMobile}`,
      bizAltMobile && `${bizAltMobile}`,
      bizEmail,
    ]
      .filter(Boolean)
      .join(" | ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${account.partyName} - Account Statement</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              color: #152033;
              background: #fff;
            }
            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 2px solid #1b4b73;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .header-left {
              display: flex;
              align-items: flex-start;
              gap: 14px;
            }
            .logo {
              width: 62px;
              height: 62px;
              object-fit: contain;
              border: 1px solid #ddd5c8;
              border-radius: 5px;
              padding: 4px;
              background: #fff;
            }
            .biz-name {
              margin: 0 0 4px;
              font-size: 24px;
              color: #1b4b73;
            }
            .biz-line {
              margin: 2px 0;
              color: #5f5b55;
              font-size: 11px;
              line-height: 1.4;
            }
            .header-right {
              text-align: right;
              min-width: 150px;
            }
            .eyebrow {
              color: #9c7349;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1.5px;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0 0 4px;
              font-size: 20px;
              color: #152033;
            }
            h2 {
              margin: 0;
              font-size: 15px;
              color: #1b4b73;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .summary-box {
              border: 1px solid #ddd5c8;
              padding: 14px 16px;
              border-radius: 6px;
              background: #faf8f4;
            }
            .summary-box span {
              display: block;
              color: #6d675e;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              margin-bottom: 5px;
            }
            .summary-box strong {
              font-size: 18px;
              color: #152033;
            }
            .summary-box.due {
              border-color: #1b4b73;
              background: #eaf1f6;
            }
            .summary-box.due strong {
              color: #1b4b73;
            }
            h3 {
              margin: 0 0 8px;
              font-size: 15px;
              color: #152033;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            th, td {
              padding: 9px 10px;
              border-bottom: 1px solid #ddd5c8;
              text-align: left;
              font-size: 11px;
              vertical-align: top;
            }
            th {
              background: #f3efe6;
              color: #1b4b73;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            th:last-child, td:last-child {
              text-align: right;
            }
            .footer {
              margin-top: 32px;
              padding-top: 14px;
              border-top: 1px solid #ddd5c8;
              font-size: 10px;
              color: #6d675e;
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              ${bizLogo ? `<img src="${bizLogo}" alt="Logo" class="logo" />` : ""}
              <div>
                <h1 class="biz-name">${bizName}</h1>
                ${bizOwner ? `<p class="biz-line">${bizOwner}</p>` : ""}
                ${bizAddress ? `<p class="biz-line">${bizAddress}</p>` : ""}
                ${contactLine ? `<p class="biz-line">${contactLine}</p>` : ""}
                ${bizGstin ? `<p class="biz-line">GSTIN: ${bizGstin}</p>` : ""}
              </div>
            </div>
            <div class="header-right">
              <div class="eyebrow">ACCOUNT STATEMENT</div>
              <h1>Party Ledger</h1>
              <h2>${account.partyName}</h2>
            </div>
          </div>

          <div class="summary">
            <div class="summary-box">
              <span>Total Billing</span>
              <strong>${formatMoney(account.billed)}</strong>
            </div>
            <div class="summary-box">
              <span>Total Received</span>
              <strong>${formatMoney(account.received)}</strong>
            </div>
            <div class="summary-box ${account.balance > 0.01 ? "due" : ""}">
              <span>Outstanding</span>
              <strong>${formatMoney(Math.max(0, account.balance))}</strong>
            </div>
          </div>

          <h3>Account Activity</h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Details</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="footer">
            <span>Generated on ${formatDate(getToday())}</span>
            <span>${bizName}</span>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const businessName =
    business?.businessName || "SAO AUTO TRACTOR";

  return (
    <div className="outstanding-page">
      <div className="outstanding-page-header">
        <div>
          <span className="outstanding-eyebrow">
            FINANCE &amp; RECEIVABLES
          </span>

          <h1>Outstanding</h1>

          <p>
            Track party-wise billing, payments and pending balances
            from one place.
          </p>
        </div>

        <div className="outstanding-header-actions">
          <button
            type="button"
            className="outstanding-btn secondary"
            onClick={loadData}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="outstanding-btn secondary"
            onClick={exportCSV}
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            className="outstanding-btn primary"
            onClick={() => openPayment()}
          >
            <Banknote size={16} />
            Receive Payment
          </button>
        </div>
      </div>

      <div className="outstanding-stat-grid">
        <StatCard
          icon={<FileText size={19} />}
          label="Total Billed"
          value={formatMoney(summary.totalBilled)}
          helper="Selected period / filters"
        />

        <StatCard
          icon={<ArrowDownToLine size={19} />}
          label="Total Received"
          value={formatMoney(summary.totalReceived)}
          helper={`${summary.collection.toFixed(0)}% collection`}
          tone="received"
        />

        <StatCard
          icon={<CircleDollarSign size={19} />}
          label="Outstanding"
          value={formatMoney(summary.positiveDue)}
          helper={`${summary.partiesDue} ${summary.partiesDue === 1 ? "party" : "parties"} with due`}
          tone="due"
        />

        <StatCard
          icon={<ArrowUpRight size={19} />}
          label="Advance"
          value={formatMoney(summary.totalAdvance)}
          helper="Customer advance balance"
          tone="advance"
        />
      </div>

      <div className="outstanding-collection-card">
        <div className="collection-heading">
          <div>
            <span>COLLECTION PROGRESS</span>
            <strong>{summary.collection.toFixed(1)}%</strong>
          </div>

          <div className="collection-numbers">
            <span>
              Received{" "}
              <strong>{formatMoney(summary.totalReceived)}</strong>
            </span>
            <span>
              Billed{" "}
              <strong>{formatMoney(summary.totalBilled)}</strong>
            </span>
          </div>
        </div>

        <div className="collection-track">
          <div
            className="collection-fill"
            style={{
              width: `${Math.min(100, summary.collection)}%`,
            }}
          />
        </div>
      </div>

      {/* FIX 6: Aging buckets */}
      {summary.positiveDue > 0.01 && (
        <div className="outstanding-aging-card">
          <div className="aging-heading">
            <div>
              <span className="outstanding-section-label">
                DUE AGING
              </span>
              <h3>Outstanding by Age</h3>
            </div>
          </div>

          <div className="aging-grid">
            <div className="aging-bucket bucket-fresh">
              <span>0 – 30 days</span>
              <strong>{formatMoney(summary.aging.d0_30)}</strong>
            </div>

            <div className="aging-bucket bucket-warm">
              <span>31 – 60 days</span>
              <strong>{formatMoney(summary.aging.d31_60)}</strong>
            </div>

            <div className="aging-bucket bucket-hot">
              <span>61 – 90 days</span>
              <strong>{formatMoney(summary.aging.d61_90)}</strong>
            </div>

            <div className="aging-bucket bucket-critical">
              <span>90+ days</span>
              <strong>{formatMoney(summary.aging.d90plus)}</strong>
            </div>
          </div>
        </div>
      )}

      <section className="outstanding-card">
        <div className="outstanding-card-header">
          <div>
            <span className="outstanding-section-label">
              PARTY ACCOUNTS
            </span>
            <h2>Outstanding by Party</h2>
          </div>

          <div className="outstanding-card-header-actions">
            {/* FIX 7: Bulk reminder button */}
            {topOverdueParties.length > 0 && (
              <button
                type="button"
                className="outstanding-bulk-btn"
                onClick={() => setShowBulkModal(true)}
                title="Send bulk WhatsApp reminders"
              >
                <Send size={14} />
                Bulk Reminder
              </button>
            )}

            <button
              type="button"
              className={`outstanding-filter-button ${
                showFilters ? "active" : ""
              }`}
              onClick={() => setShowFilters((value) => !value)}
            >
              <Filter size={15} />
              Filters
              {showFilters ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="outstanding-filter-panel">
            <div className="outstanding-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search party..."
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            <label className="outstanding-filter-field">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">All Status</option>
                <option value="due">Due</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="advance">Advance</option>
              </select>
            </label>

            <label className="outstanding-filter-field">
              <span>From Date</span>
              <div className="date-input-wrap">
                <CalendarDays size={15} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(event.target.value)
                  }
                />
              </div>
            </label>

            <label className="outstanding-filter-field">
              <span>To Date</span>
              <div className="date-input-wrap">
                <CalendarDays size={15} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(event.target.value)
                  }
                />
              </div>
            </label>

            {hasFilters && (
              <button
                type="button"
                className="clear-filter-btn"
                onClick={clearFilters}
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        )}

        <div className="outstanding-table-meta">
          <span>
            Showing <strong>{filteredAccounts.length}</strong>{" "}
            {filteredAccounts.length === 1 ? "party" : "parties"}
          </span>

          {!showFilters && (
            <button
              type="button"
              className="quick-search-button"
              onClick={() => setShowFilters(true)}
            >
              <Search size={14} />
              Search &amp; filter
            </button>
          )}
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="outstanding-empty">
            <div className="outstanding-empty-icon">
              <WalletCards size={23} />
            </div>

            <h3>No outstanding accounts</h3>

            <p>No party account matches the current filters.</p>

            {hasFilters && (
              <button
                type="button"
                className="outstanding-btn secondary"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="outstanding-table-wrapper">
            <table className="outstanding-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Total Billed</th>
                  <th>Received</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Collection</th>
                  <th className="action-column">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAccounts.map((account) => {
                  const isExpanded =
                    expandedParty === account.partyName;

                  return (
                    /* FIX 4: Fragment key to remove React warning */
                    <Fragment key={account.partyName}>
                      <tr
                        className={
                          isExpanded ? "account-row expanded" : ""
                        }
                      >
                        <td>
                          <div className="party-cell">
                            <div className="party-avatar">
                              {account.partyName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>{account.partyName}</strong>
                              <span>
                                {account.transactions.length}{" "}
                                transaction
                                {account.transactions.length === 1
                                  ? ""
                                  : "s"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="money-value">
                            {formatMoney(account.billed)}
                          </span>
                        </td>

                        <td>
                          <span className="money-value received-text">
                            {formatMoney(account.received)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`money-value ${
                              account.balance > 0.01
                                ? "due-text"
                                : account.balance < -0.01
                                  ? "advance-text"
                                  : "paid-text"
                            }`}
                          >
                            {account.balance < -0.01
                              ? formatMoney(
                                  Math.abs(account.balance)
                                )
                              : formatMoney(
                                  Math.max(0, account.balance)
                                )}
                          </span>
                        </td>

                        <td>
                          <StatusBadge status={account.status} />
                        </td>

                        <td>
                          <div className="collection-cell">
                            <div className="mini-progress">
                              <span
                                style={{
                                  width: `${account.collectionPercentage}%`,
                                }}
                              />
                            </div>

                            <span>
                              {account.collectionPercentage.toFixed(0)}
                              %
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="outstanding-row-actions">
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => openAccount(account)}
                              title="View account"
                            >
                              <FileText size={14} />
                              View
                            </button>

                            <button
                              type="button"
                              className="row-action primary-action"
                              onClick={() =>
                                openPayment(account.partyName)
                              }
                              title="Receive payment"
                            >
                              <Banknote size={14} />
                              Pay
                            </button>

                            {/* FIX 5: WhatsApp quick reminder per row */}
                            {account.balance > 0.01 && (
                              <button
                                type="button"
                                className="row-action whatsapp-action"
                                onClick={() =>
                                  openWhatsApp(
                                    account,
                                    businessName
                                  )
                                }
                                title="WhatsApp reminder"
                              >
                                <MessageCircle size={14} />
                                WA
                              </button>
                            )}

                            <button
                              type="button"
                              className={`row-action icon-only ${
                                isExpanded ? "active" : ""
                              }`}
                              onClick={() =>
                                setExpandedParty(
                                  isExpanded
                                    ? null
                                    : account.partyName
                                )
                              }
                              title="Quick activity"
                            >
                              {isExpanded ? (
                                <ChevronUp size={15} />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="expanded-detail-row">
                          <td colSpan="7">
                            <div className="quick-account-panel">
                              <div className="quick-account-stat">
                                <span>Billing</span>
                                <strong>
                                  {formatMoney(account.billed)}
                                </strong>
                              </div>

                              <div className="quick-account-stat">
                                <span>Received</span>
                                <strong>
                                  {formatMoney(account.received)}
                                </strong>
                              </div>

                              <div className="quick-account-stat highlight">
                                <span>
                                  {account.balance < 0
                                    ? "Advance"
                                    : "Balance"}
                                </span>
                                <strong>
                                  {formatMoney(
                                    Math.abs(account.balance)
                                  )}
                                </strong>
                              </div>

                              {account.dueAge !== null &&
                                account.balance > 0.01 && (
                                  <div className="quick-account-stat age">
                                    <span>Due Age</span>
                                    <strong>
                                      {account.dueAge} days
                                    </strong>
                                  </div>
                                )}

                              <button
                                type="button"
                                className="quick-view-btn"
                                onClick={() => openAccount(account)}
                              >
                                Open Full Account
                                <ArrowUpRight size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="outstanding-bottom-grid">
        <div className="outstanding-info-card">
          <div className="info-card-icon">
            <IndianRupee size={18} />
          </div>

          <div>
            <span className="outstanding-section-label">
              RECEIVABLE CONTROL
            </span>

            <h3>Keep your party balances clean</h3>

            <p>
              Outstanding is calculated from your existing bills
              and recorded payments. Adding or deleting a payment
              automatically updates the balance.
            </p>
          </div>
        </div>

        <div className="outstanding-info-card compact">
          <div className="info-card-icon">
            <History size={18} />
          </div>

          <div>
            <span className="outstanding-section-label">
              ACCOUNTING FLOW
            </span>

            <h3>Billing → Payments → Outstanding</h3>

            <p>No duplicate billing data is maintained here.</p>
          </div>
        </div>
      </section>

      {selectedAccount && (
        <AccountModal
          account={selectedAccount}
          businessName={businessName}
          onClose={() => setSelectedAccount(null)}
          onReceivePayment={(partyName) => openPayment(partyName)}
          onPrint={printStatement}
          onWhatsApp={(account) =>
            openWhatsApp(account, businessName)
          }
        />
      )}

      {showPaymentModal && (
        <div
          className="outstanding-modal-overlay"
          onMouseDown={() => setShowPaymentModal(false)}
        >
          <div
            className="outstanding-payment-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="outstanding-modal-header">
              <div>
                <span className="outstanding-eyebrow">
                  PAYMENT ENTRY
                </span>
                <h2>Receive Payment</h2>
                <p>Record a payment against a party account.</p>
              </div>

              <button
                type="button"
                className="outstanding-modal-close"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="payment-form-grid">
              <label>
                <span>Party *</span>
                <select
                  value={paymentParty}
                  onChange={(event) =>
                    setPaymentParty(event.target.value)
                  }
                >
                  <option value="">Select party</option>

                  {accounts
                    .map((account) => account.partyName)
                    .sort((a, b) => a.localeCompare(b))
                    .map((partyName) => (
                      <option key={partyName} value={partyName}>
                        {partyName}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                <span>Amount *</span>
                <div className="payment-amount-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </label>

              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(event) =>
                    setPaymentDate(event.target.value)
                  }
                />
              </label>

              <label>
                <span>Payment Mode</span>
                <select
                  value={paymentMode}
                  onChange={(event) =>
                    setPaymentMode(event.target.value)
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                <span>Reference / Transaction No.</span>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
                  }
                  placeholder="Optional"
                />
              </label>

              <label className="full-width">
                <span>Notes</span>
                <textarea
                  rows="3"
                  value={paymentNotes}
                  onChange={(event) =>
                    setPaymentNotes(event.target.value)
                  }
                  placeholder="Optional payment note..."
                />
              </label>
            </div>

            {/* FIX 2: Live balance — recalculated via useMemo below */}
            {paymentParty && (
              <div className="payment-party-balance">
                <span>Current Balance</span>

                <strong>
                  {(() => {
                    const account = accounts.find(
                      (item) =>
                        normalizeText(item.partyName) ===
                        normalizeText(paymentParty)
                    );

                    if (!account) return formatMoney(0);

                    if (account.balance < 0) {
                      return `${formatMoney(
                        Math.abs(account.balance)
                      )} Advance`;
                    }

                    return formatMoney(
                      Math.max(0, account.balance)
                    );
                  })()}
                </strong>
              </div>
            )}

            <div className="payment-modal-actions">
              <button
                type="button"
                className="outstanding-btn secondary"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="outstanding-btn primary"
                onClick={addPayment}
              >
                <Banknote size={16} />
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIX 7: Bulk reminder modal */}
      {showBulkModal && (
        <div
          className="outstanding-modal-overlay"
          onMouseDown={() => setShowBulkModal(false)}
        >
          <div
            className="outstanding-bulk-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="outstanding-modal-header">
              <div>
                <span className="outstanding-eyebrow">
                  BULK REMINDER
                </span>
                <h2>Top Overdue Parties</h2>
                <p>
                  Send WhatsApp reminders one by one. Each opens
                  in a new tab.
                </p>
              </div>

              <button
                type="button"
                className="outstanding-modal-close"
                onClick={() => setShowBulkModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="bulk-list">
              {topOverdueParties.map((account) => (
                <div className="bulk-row" key={account.partyName}>
                  <div className="bulk-party">
                    <strong>{account.partyName}</strong>
                    <span>
                      Due {formatMoney(account.balance)}
                      {account.dueAge !== null &&
                        ` · ${account.dueAge} days`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="outstanding-btn whatsapp"
                    onClick={() =>
                      openWhatsApp(account, businessName)
                    }
                  >
                    <MessageCircle size={15} />
                    Send
                  </button>
                </div>
              ))}
            </div>

            <div className="payment-modal-actions">
              <button
                type="button"
                className="outstanding-btn secondary"
                onClick={() => setShowBulkModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}