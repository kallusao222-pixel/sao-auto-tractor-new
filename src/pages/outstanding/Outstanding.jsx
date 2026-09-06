import { useEffect, useMemo, useState } from "react";
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
  Printer,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import "./Outstanding.css";

const TRIPS_KEY = "saoAutoTractorTrips";
const PARTIES_KEY = "saoAutoTractorParties";
const PAYMENTS_KEY = "saoAutoTractorPayments";

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

const getToday = () => {
  const date = new Date();
  return date.toISOString().slice(0, 10);
};

const getMonthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
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
    Paid: {
      className: "paid",
      label: "Paid",
    },
    Due: {
      className: "due",
      label: "Due",
    },
    Partial: {
      className: "partial",
      label: "Partial",
    },
    Advance: {
      className: "advance",
      label: "Advance",
    },
  };

  const item = config[status] || config.Due;

  return (
    <span className={`outstanding-status ${item.className}`}>
      <span className="status-dot" />
      {item.label}
    </span>
  );
}

function AccountModal({ account, onClose, onReceivePayment, onPrint }) {
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

          <div className={account.balance > 0 ? "balance-positive" : ""}>
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

        return {
          ...account,
          balance,
          status,
          collectionPercentage,
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
        !fromDate &&
        !toDate
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
      (sum, account) =>
        sum + Math.max(0, account.balance),
      0
    );

    const totalAdvance = filteredAccounts.reduce(
      (sum, account) =>
        sum + Math.max(0, -account.balance),
      0
    );

    const partiesDue = filteredAccounts.filter(
      (account) => account.balance > 0.01
    ).length;

    const collection =
      totalBilled > 0
        ? Math.min(100, (totalReceived / totalBilled) * 100)
        : 0;

    return {
      totalBilled,
      totalReceived,
      positiveDue,
      totalAdvance,
      partiesDue,
      collection,
    };
  }, [filteredAccounts]);

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
    ];

    const rows = filteredAccounts.map((account) => [
      account.partyName,
      account.billed.toFixed(2),
      account.received.toFixed(2),
      Math.max(0, account.balance).toFixed(2),
      Math.max(0, -account.balance).toFixed(2),
      account.status,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
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
              border-bottom: 2px solid #1b4b73;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .eyebrow {
              color: #9c7349;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1.5px;
            }
            h1 {
              margin: 6px 0;
              font-size: 28px;
              color: #1b4b73;
            }
            h2 {
              margin: 0;
              font-size: 20px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 28px;
            }
            .summary-box {
              border: 1px solid #ddd5c8;
              padding: 16px;
              border-radius: 8px;
            }
            .summary-box span {
              display: block;
              color: #6d675e;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .summary-box strong {
              font-size: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              padding: 10px;
              border-bottom: 1px solid #ddd5c8;
              text-align: left;
              font-size: 12px;
            }
            th {
              background: #f3efe6;
              color: #1b4b73;
            }
            th:last-child, td:last-child {
              text-align: right;
            }
            .footer {
              margin-top: 36px;
              padding-top: 14px;
              border-top: 1px solid #ddd5c8;
              font-size: 11px;
              color: #6d675e;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="eyebrow">SAO AUTO TRACTOR</div>
            <h1>Account Statement</h1>
            <h2>${account.partyName}</h2>
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
            <div class="summary-box">
              <span>Outstanding</span>
              <strong>${formatMoney(
                Math.max(0, account.balance)
              )}</strong>
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
            Generated on ${formatDate(getToday())} · SAO AUTO TRACTOR
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
            <strong>
              {summary.collection.toFixed(1)}%
            </strong>
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

      <section className="outstanding-card">
        <div className="outstanding-card-header">
          <div>
            <span className="outstanding-section-label">
              PARTY ACCOUNTS
            </span>
            <h2>Outstanding by Party</h2>
          </div>

          <div className="outstanding-card-header-actions">
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search party..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                >
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

            <p>
              No party account matches the current filters.
            </p>

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
                    <>
                      <tr
                        key={account.partyName}
                        className={
                          isExpanded
                            ? "account-row expanded"
                            : ""
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
                              {account.collectionPercentage.toFixed(
                                0
                              )}
                              %
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="outstanding-row-actions">
                            <button
                              type="button"
                              className="row-action"
                              onClick={() =>
                                openAccount(account)
                              }
                              title="View account"
                            >
                              <FileText size={14} />
                              View
                            </button>

                            <button
                              type="button"
                              className="row-action primary-action"
                              onClick={() =>
                                openPayment(
                                  account.partyName
                                )
                              }
                              title="Receive payment"
                            >
                              <Banknote size={14} />
                              Pay
                            </button>

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
                        <tr
                          key={`${account.partyName}-details`}
                          className="expanded-detail-row"
                        >
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

                              <button
                                type="button"
                                className="quick-view-btn"
                                onClick={() =>
                                  openAccount(account)
                                }
                              >
                                Open Full Account
                                <ArrowUpRight size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

            <p>
              No duplicate billing data is maintained here.
            </p>
          </div>
        </div>
      </section>

      {selectedAccount && (
        <AccountModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onReceivePayment={(partyName) =>
            openPayment(partyName)
          }
          onPrint={printStatement}
        />
      )}

      {showPaymentModal && (
        <div
          className="outstanding-modal-overlay"
          onMouseDown={() => setShowPaymentModal(false)}
        >
          <div
            className="outstanding-payment-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="outstanding-modal-header">
              <div>
                <span className="outstanding-eyebrow">
                  PAYMENT ENTRY
                </span>
                <h2>Receive Payment</h2>
                <p>
                  Record a payment against a party account.
                </p>
              </div>

              <button
                type="button"
                className="outstanding-modal-close"
                onClick={() =>
                  setShowPaymentModal(false)
                }
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
                    .sort((a, b) =>
                      a.localeCompare(b)
                    )
                    .map((partyName) => (
                      <option
                        key={partyName}
                        value={partyName}
                      >
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
                    setPaymentReference(
                      event.target.value
                    )
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
                onClick={() =>
                  setShowPaymentModal(false)
                }
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
    </div>
  );
}