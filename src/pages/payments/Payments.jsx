import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
  AlertCircle,
} from "lucide-react";
import "./Payments.css";

const PAYMENTS_KEY = "saoAutoTractorPayments";
const PARTIES_KEY = "saoAutoTractorParties";
const TRIPS_KEY = "saoAutoTractorTrips";

const PAYMENT_MODES = ["Cash", "UPI", "Bank", "Other"];

const EMPTY_PAYMENT = {
  partyName: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
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

const todayISO = () => new Date().toISOString().slice(0, 10);

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
}) {
  return (
    <button
      type="button"
      className={`payments-action-btn ${danger ? "danger" : ""}`}
      title={label}
      onClick={onClick}
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

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewPayment, setViewPayment] = useState(null);
  const [statementParty, setStatementParty] = useState("");

  const [form, setForm] = useState(EMPTY_PAYMENT);

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
    } catch (error) {
      console.error("Payments load error:", error);

      setPayments([]);
      setParties([]);
      setTrips([]);
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

    const timer = setInterval(
      loadData,
      1500
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

      clearInterval(timer);
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
        (sum, payment) => sum + getAmount(payment),
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
          sum + getAmount(payment),
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
            sum + getAmount(payment),
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
            sum + getAmount(payment),
          0
        ),
    [payments]
  );

  const filteredTotal = useMemo(
    () =>
      filteredPayments.reduce(
        (sum, payment) =>
          sum + getAmount(payment),
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
              sum + getAmount(payment),
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
      ...EMPTY_PAYMENT,
      date: todayISO(),
      partyName: "",
    });

    setFormOpen(true);
  };

  const openEdit = (
    payment,
    index
  ) => {
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

    const payment = {
      id:
        editing?.payment?.id ||
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
        clean(form.reference),

      notes:
        clean(form.notes),

      createdAt:
        editing?.payment?.createdAt ||
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    const next = [...payments];

    if (editing) {
      next[editing.index] =
        payment;
    } else {
      next.push(payment);
    }

    localStorage.setItem(
      PAYMENTS_KEY,
      JSON.stringify(next)
    );

    window.dispatchEvent(
      new Event(
        "saoAutoTractorDataChanged"
      )
    );

    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_PAYMENT);

    loadData();
  };

  const deletePayment = (
    payment,
    index
  ) => {
    const amount =
      getAmount(payment);

    const party =
      getPartyName(payment);

    const confirmed =
      window.confirm(
        `Delete ${money(amount)} payment from ${
          party || "this party"
        }?`
      );

    if (!confirmed) return;

    const next =
      payments.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

    localStorage.setItem(
      PAYMENTS_KEY,
      JSON.stringify(next)
    );

    window.dispatchEvent(
      new Event(
        "saoAutoTractorDataChanged"
      )
    );

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

    const csvEscape = (value) =>
      `"${String(
        value ?? ""
      ).replaceAll(
        '"',
        '""'
      )}"`;

    const rows = [
      [
        "Date",
        "Party",
        "Amount",
        "Payment Mode",
        "Reference",
        "Notes",
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
        ]
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(csvEscape)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
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
    setViewPayment(payment);

    setTimeout(() => {
      window.print();
    }, 350);
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
            <CircleDollarSign size={20} />
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

                            <ActionButton
                              icon={
                                <Pencil
                                  size={14}
                                />
                              }
                              label="Edit"
                              onClick={() =>
                                openEdit(
                                  payment,
                                  originalIndex
                                )
                              }
                            />

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
                              icon={
                                <Trash2
                                  size={14}
                                />
                              }
                              label="Delete"
                              danger
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

            <button
              type="button"
              className="payments-btn payments-btn-secondary"
              disabled={
                !statementParty
              }
              onClick={() =>
                setStatementParty(
                  statementParty
                )
              }
            >
              <FileText size={16} />
              View Statement
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          ADD / EDIT PAYMENT MODAL (UPDATED)
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
                <CircleDollarSign
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
                    Total Received
                  </span>

                  <strong>
                    {money(
                      statementPayments.reduce(
                        (sum, payment) =>
                          sum +
                          getAmount(
                            payment
                          ),
                        0
                      )
                    )}
                  </strong>
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

                          <td>
                            {getNotes(
                              payment
                            ) || "—"}
                          </td>

                          <td>
                            {money(
                              getAmount(
                                payment
                              )
                            )}
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
    </div>
  );
}