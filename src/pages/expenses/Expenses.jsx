import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  Fuel,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
  Trash2,
  UserRound,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import "./Expenses.css";

const EXPENSES_KEY = "saoAutoTractorExpenses";
const TRACTORS_KEY = "saoAutoTractorTractors";
const PARTIES_KEY = "saoAutoTractorParties";
const STAFF_KEY = "saoAutoTractorStaff";

const EXPENSE_CATEGORIES = [
  "Diesel / Fuel",
  "Tractor Repair",
  "Maintenance / Servicing",
  "Driver Salary",
  "Driver Advance",
  "Tyre",
  "Spare Parts",
  "Toll / Tax",
  "Loading / Unloading Expense",
  "Office Expense",
  "Mobile / Communication",
  "Bank / Charges",
  "Other",
];

const PAYMENT_MODES = ["Cash", "UPI", "Bank", "Other"];

/* FIX 1: Local timezone date */
const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

const shiftISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

const monthStartISO = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = first.getTimezoneOffset() * 60000;
  return new Date(first.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

const weekStartISO = () => {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // treat Monday as start
  d.setDate(d.getDate() - diff);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

const EMPTY_EXPENSE = {
  date: todayISO(),
  category: "Diesel / Fuel",
  amount: "",
  tractorNumber: "",
  driverName: "",
  vendorName: "",
  paymentMode: "Cash",
  reference: "",
  description: "",
};

const clean = (value) => String(value ?? "").trim();

const normalize = (value) =>
  clean(value).toLowerCase().replace(/\s+/g, " ");

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getAmount = (item) =>
  Number(
    item?.amount ??
      item?.expenseAmount ??
      item?.total ??
      0
  ) || 0;

const getDate = (item) =>
  item?.date ??
  item?.expenseDate ??
  item?.createdAt ??
  "";

const getCategory = (item) =>
  clean(
    item?.category ??
      item?.expenseCategory ??
      "Other"
  ) || "Other";

const getTractor = (item) =>
  clean(
    item?.tractorNumber ??
      item?.vehicleNumber ??
      item?.tractor ??
      item?.vehicleNo
  );

const getDriver = (item) =>
  clean(item?.driverName ?? item?.driver ?? "");

const getVendor = (item) =>
  clean(
    item?.vendorName ??
      item?.vendor ??
      item?.supplierName ??
      item?.supplier
  );

const getMode = (item) =>
  clean(
    item?.paymentMode ??
      item?.mode ??
      item?.method ??
      "Other"
  ) || "Other";

const getReference = (item) =>
  clean(
    item?.reference ??
      item?.referenceNo ??
      item?.billNo ??
      item?.voucherNo
  );

const getDescription = (item) =>
  clean(
    item?.description ??
      item?.notes ??
      item?.note ??
      item?.remarks
  );

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

  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isSameMonth = (value) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const isLastMonth = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const lastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  return (
    date.getFullYear() === lastMonth.getFullYear() &&
    date.getMonth() === lastMonth.getMonth()
  );
};

const isDieselCategory = (category) => {
  const normalized = normalize(category);
  return (
    normalized.includes("diesel") ||
    normalized.includes("fuel")
  );
};

const getCategoryIcon = (category) => {
  if (isDieselCategory(category)) {
    return <Fuel size={16} />;
  }

  if (
    normalize(category).includes("repair") ||
    normalize(category).includes("maintenance")
  ) {
    return <Wrench size={16} />;
  }

  if (
    normalize(category).includes("salary") ||
    normalize(category).includes("advance")
  ) {
    return <UserRound size={16} />;
  }

  return <ReceiptText size={16} />;
};

function ActionButton({ icon, label, onClick, danger = false, title }) {
  return (
    <button
      type="button"
      className={`expenses-action-btn ${danger ? "danger" : ""}`}
      title={title || label}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="expenses-modal-overlay" onMouseDown={onClose}>
      <div
        className={`expenses-modal ${wide ? "wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="expenses-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="expenses-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="expenses-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* Toast with Undo */
function UndoToast({ message, onUndo, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="expenses-undo-toast" role="status" aria-live="polite">
      <span className="undo-toast-icon">
        <RotateCcw size={14} />
      </span>
      <span className="undo-toast-text">{message}</span>
      <button
        type="button"
        className="undo-toast-btn"
        onClick={onUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="undo-toast-close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [tractors, setTractors] = useState([]);
  const [parties, setParties] = useState([]);
  const [staff, setStaff] = useState([]);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tractorFilter, setTractorFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewExpense, setViewExpense] = useState(null);
  const [previewExpense, setPreviewExpense] = useState(null);

  /* Bulk selection */
  const [selectedIds, setSelectedIds] = useState([]);

  /* Undo delete */
  const [undoData, setUndoData] = useState(null);

  const [form, setForm] = useState(EMPTY_EXPENSE);

  const loadData = () => {
    try {
      const savedExpenses = JSON.parse(
        localStorage.getItem(EXPENSES_KEY) || "[]"
      );
      const savedTractors = JSON.parse(
        localStorage.getItem(TRACTORS_KEY) || "[]"
      );
      const savedParties = JSON.parse(
        localStorage.getItem(PARTIES_KEY) || "[]"
      );
      const savedStaff = JSON.parse(
        localStorage.getItem(STAFF_KEY) || "[]"
      );

      setExpenses(
        Array.isArray(savedExpenses) ? savedExpenses : []
      );
      setTractors(
        Array.isArray(savedTractors) ? savedTractors : []
      );
      setParties(
        Array.isArray(savedParties) ? savedParties : []
      );
      setStaff(Array.isArray(savedStaff) ? savedStaff : []);
    } catch (error) {
      console.error("Expenses load error:", error);
      setExpenses([]);
      setTractors([]);
      setParties([]);
      setStaff([]);
    }
  };

  useEffect(() => {
    loadData();

    const sync = () => loadData();

    window.addEventListener("storage", sync);
    window.addEventListener("saoAutoTractorDataChanged", sync);

    const timer = setInterval(loadData, 1500);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        "saoAutoTractorDataChanged",
        sync
      );
      clearInterval(timer);
    };
  }, []);

  const tractorOptions = useMemo(() => {
    const values = [
      ...tractors.map((tractor) =>
        clean(
          tractor?.vehicleNumber ??
            tractor?.tractorNumber ??
            tractor?.vehicleNo
        )
      ),
      ...expenses.map(getTractor),
    ];

    return [...new Set(values.filter(Boolean))].sort();
  }, [tractors, expenses]);

  const driverOptions = useMemo(() => {
    const values = [
      ...staff.map((item) =>
        clean(
          item?.name ??
            item?.staffName ??
            item?.employeeName
        )
      ),
      ...tractors.map((item) =>
        clean(item?.driverName ?? item?.driver)
      ),
      ...expenses.map(getDriver),
    ];

    return [...new Set(values.filter(Boolean))].sort();
  }, [staff, tractors, expenses]);

  /* Quick date filter — sets dateFrom / dateTo */
  const applyQuickFilter = (type) => {
    const today = todayISO();

    if (type === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (type === "yesterday") {
      const y = shiftISO(-1);
      setDateFrom(y);
      setDateTo(y);
    } else if (type === "tomorrow") {
      const t = shiftISO(1);
      setDateFrom(t);
      setDateTo(t);
    } else if (type === "week") {
      setDateFrom(weekStartISO());
      setDateTo(today);
    } else if (type === "month") {
      setDateFrom(monthStartISO());
      setDateTo(today);
    } else {
      setDateFrom("");
      setDateTo("");
    }

    setQuickFilter(type);
  };

  const filteredExpenses = useMemo(() => {
    const query = normalize(search);

    return [...expenses]
      .filter((expense) => {
        const category = getCategory(expense);
        const tractor = getTractor(expense);
        const driver = getDriver(expense);
        const vendor = getVendor(expense);
        const reference = getReference(expense);
        const description = getDescription(expense);
        const mode = getMode(expense);
        const date = String(getDate(expense)).slice(0, 10);

        const matchesSearch =
          !query ||
          normalize(category).includes(query) ||
          normalize(tractor).includes(query) ||
          normalize(driver).includes(query) ||
          normalize(vendor).includes(query) ||
          normalize(reference).includes(query) ||
          normalize(description).includes(query);

        return (
          matchesSearch &&
          (!dateFrom || date >= dateFrom) &&
          (!dateTo || date <= dateTo) &&
          (categoryFilter === "All" ||
            category === categoryFilter) &&
          (tractorFilter === "All" ||
            tractor === tractorFilter) &&
          (modeFilter === "All" || mode === modeFilter)
        );
      })
      .sort(
        (a, b) =>
          (new Date(getDate(b)).getTime() || 0) -
          (new Date(getDate(a)).getTime() || 0)
      );
  }, [
    expenses,
    search,
    dateFrom,
    dateTo,
    categoryFilter,
    tractorFilter,
    modeFilter,
  ]);

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + getAmount(expense),
        0
      ),
    [expenses]
  );

  const todayExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => isSameDay(getDate(expense)))
        .reduce(
          (sum, expense) => sum + getAmount(expense),
          0
        ),
    [expenses]
  );

  const monthExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => isSameMonth(getDate(expense)))
        .reduce(
          (sum, expense) => sum + getAmount(expense),
          0
        ),
    [expenses]
  );

  const lastMonthExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => isLastMonth(getDate(expense)))
        .reduce(
          (sum, expense) => sum + getAmount(expense),
          0
        ),
    [expenses]
  );

  const monthDelta = useMemo(() => {
    if (lastMonthExpenses <= 0) return null;
    const diff = monthExpenses - lastMonthExpenses;
    const percent = (diff / lastMonthExpenses) * 100;
    return { diff, percent };
  }, [monthExpenses, lastMonthExpenses]);

  const filteredTotal = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, expense) => sum + getAmount(expense),
        0
      ),
    [filteredExpenses]
  );

  const categorySummary = useMemo(() => {
    const map = {};

    expenses.forEach((expense) => {
      const category = getCategory(expense);
      map[category] =
        (map[category] || 0) + getAmount(expense);
    });

    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const tractorSummary = useMemo(() => {
    const map = {};

    expenses.forEach((expense) => {
      const tractor = getTractor(expense);
      if (!tractor) return;
      map[tractor] =
        (map[tractor] || 0) + getAmount(expense);
    });

    return Object.entries(map)
      .map(([tractor, amount]) => ({ tractor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses]);

  const vendorSummary = useMemo(() => {
    const map = {};

    expenses.forEach((expense) => {
      const vendor = getVendor(expense);
      if (!vendor) return;
      map[vendor] =
        (map[vendor] || 0) + getAmount(expense);
    });

    return Object.entries(map)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses]);

  const fuelSplit = useMemo(() => {
    let diesel = 0;
    let nonDiesel = 0;

    expenses.forEach((expense) => {
      const amount = getAmount(expense);
      if (isDieselCategory(getCategory(expense))) {
        diesel += amount;
      } else {
        nonDiesel += amount;
      }
    });

    const total = diesel + nonDiesel;
    const dieselPercent =
      total > 0 ? (diesel / total) * 100 : 0;

    return { diesel, nonDiesel, total, dieselPercent };
  }, [expenses]);

  const activeFilters =
    Boolean(search) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    categoryFilter !== "All" ||
    tractorFilter !== "All" ||
    modeFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setQuickFilter("all");
    setCategoryFilter("All");
    setTractorFilter("All");
    setModeFilter("All");
  };

  const openAdd = () => {
    setEditing(null);

    setForm({
      ...EMPTY_EXPENSE,
      date: todayISO(),
      tractorNumber: tractorOptions[0] || "",
      driverName: driverOptions[0] || "",
    });

    setFormOpen(true);
  };

  const openEdit = (expense, index) => {
    setEditing({ index, expense });

    setForm({
      date:
        String(getDate(expense)).slice(0, 10) ||
        todayISO(),
      category: getCategory(expense),
      amount: String(getAmount(expense)),
      tractorNumber: getTractor(expense),
      driverName: getDriver(expense),
      vendorName: getVendor(expense),
      paymentMode: getMode(expense),
      reference: getReference(expense),
      description: getDescription(expense),
    });

    setFormOpen(true);
  };

  const cloneExpense = (expense) => {
    setEditing(null);

    setForm({
      date: todayISO(),
      category: getCategory(expense),
      amount: String(getAmount(expense)),
      tractorNumber: getTractor(expense),
      driverName: getDriver(expense),
      vendorName: getVendor(expense),
      paymentMode: getMode(expense),
      reference: getReference(expense),
      description: getDescription(expense),
    });

    setFormOpen(true);
  };

  const saveExpense = (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    if (!form.category) {
      alert("Please select an expense category.");
      return;
    }

    const expense = {
      id:
        editing?.expense?.id ||
        `EXP-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      date: form.date || todayISO(),
      expenseDate: form.date || todayISO(),

      category: form.category,
      expenseCategory: form.category,

      amount,
      expenseAmount: amount,

      tractorNumber: clean(form.tractorNumber),
      vehicleNumber: clean(form.tractorNumber),

      driverName: clean(form.driverName),
      vendorName: clean(form.vendorName),

      paymentMode: form.paymentMode || "Cash",
      reference: clean(form.reference),

      description: clean(form.description),
      notes: clean(form.description),

      createdAt:
        editing?.expense?.createdAt ||
        new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };

    const next = [...expenses];

    if (editing) {
      next[editing.index] = expense;
    } else {
      next.push(expense);
    }

    localStorage.setItem(
      EXPENSES_KEY,
      JSON.stringify(next)
    );

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_EXPENSE);

    loadData();
  };

  const deleteExpense = (expense, index) => {
    const confirmed = window.confirm(
      `Delete ${money(getAmount(expense))} expense${
        getCategory(expense)
          ? ` (${getCategory(expense)})`
          : ""
      }?`
    );

    if (!confirmed) return;

    /* Save for undo */
    const deleted = expenses[index];

    const next = expenses.filter(
      (_, itemIndex) => itemIndex !== index
    );

    localStorage.setItem(
      EXPENSES_KEY,
      JSON.stringify(next)
    );

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    setViewExpense(null);

    /* Show undo toast */
    setUndoData({
      type: "single",
      items: [deleted],
      message: `Expense ${money(getAmount(deleted))} deleted`,
    });

    loadData();
  };

  const undoDelete = () => {
    if (!undoData) return;

    const restored = [...expenses, ...undoData.items];

    localStorage.setItem(
      EXPENSES_KEY,
      JSON.stringify(restored)
    );

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    setUndoData(null);
    loadData();
  };

  const bulkDeleteSelected = () => {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected expense${
        selectedIds.length === 1 ? "" : "s"
      }?`
    );

    if (!confirmed) return;

    const deletedItems = expenses.filter((e) =>
      selectedIds.includes(e.id)
    );

    const next = expenses.filter(
      (e) => !selectedIds.includes(e.id)
    );

    localStorage.setItem(
      EXPENSES_KEY,
      JSON.stringify(next)
    );

    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );

    setUndoData({
      type: "bulk",
      items: deletedItems,
      message: `${deletedItems.length} expense${
        deletedItems.length === 1 ? "" : "s"
      } deleted`,
    });

    setSelectedIds([]);
    loadData();
  };

  const toggleSelect = (id) => {
    if (!id) return;
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredExpenses
      .map((e) => e.id)
      .filter(Boolean);

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...visibleIds]),
      ]);
    }
  };

  const exportCSV = () => {
    if (!filteredExpenses.length) {
      alert("No expenses available to export.");
      return;
    }

    const escapeCSV = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const rows = [
      [
        "Date",
        "Category",
        "Amount",
        "Tractor",
        "Driver",
        "Vendor",
        "Payment Mode",
        "Reference",
        "Description",
      ],

      ...filteredExpenses.map((expense) => [
        formatDate(getDate(expense)),
        getCategory(expense),
        getAmount(expense),
        getTractor(expense),
        getDriver(expense),
        getVendor(expense),
        getMode(expense),
        getReference(expense),
        getDescription(expense),
      ]),
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `SAO-Expenses-${todayISO()}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const openPreview = (expense) => {
    setPreviewExpense(expense);
  };

  const printPreview = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const printExpense = (expense) => {
    setPreviewExpense(expense);
    setTimeout(() => {
      window.print();
    }, 350);
  };

  return (
    <div className="expenses-page">
      <header className="expenses-page-header">
        <div>
          <div className="expenses-eyebrow">
            FINANCE • BUSINESS COSTS
          </div>

          <h1>Expenses</h1>

          <p>
            Track diesel, repairs, maintenance, salaries
            and every other business expense from one
            place.
          </p>
        </div>

        <div className="expenses-header-actions">
          <button
            type="button"
            className="expenses-btn expenses-btn-secondary"
            onClick={loadData}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="expenses-btn expenses-btn-secondary"
            onClick={exportCSV}
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            className="expenses-btn expenses-btn-primary"
            onClick={openAdd}
          >
            <Plus size={17} />
            Add Expense
          </button>
        </div>
      </header>

      <section className="expenses-overview">
        <div className="expenses-overview-card featured">
          <div className="expenses-overview-icon">
            <CircleDollarSign size={20} />
          </div>

          <div>
            <span>Total Expenses</span>
            <strong>{money(totalExpenses)}</strong>
            <small>All recorded expenses</small>
          </div>
        </div>

        <div className="expenses-overview-card">
          <div className="expenses-overview-icon">
            <CalendarDays size={20} />
          </div>

          <div>
            <span>Today</span>
            <strong>{money(todayExpenses)}</strong>
            <small>Today's business cost</small>
          </div>
        </div>

        <div className="expenses-overview-card">
          <div className="expenses-overview-icon">
            <Banknote size={20} />
          </div>

          <div>
            <span>This Month</span>
            <strong>{money(monthExpenses)}</strong>

            {monthDelta ? (
              <small
                className={
                  monthDelta.diff > 0 ? "delta-up" : "delta-down"
                }
              >
                {monthDelta.diff > 0 ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                {monthDelta.diff > 0 ? "+" : ""}
                {monthDelta.percent.toFixed(0)}% vs last month
              </small>
            ) : (
              <small>Current month expenses</small>
            )}
          </div>
        </div>

        <div className="expenses-overview-card">
          <div className="expenses-overview-icon">
            <Fuel size={20} />
          </div>

          <div>
            <span>Diesel Share</span>
            <strong>{fuelSplit.dieselPercent.toFixed(0)}%</strong>
            <small>
              {money(fuelSplit.diesel)} of {money(fuelSplit.total)}
            </small>
          </div>
        </div>
      </section>

      <section className="expenses-card">
        <div className="expenses-toolbar">
          <div className="expenses-search">
            <Search size={17} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search category, tractor, vendor..."
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="expenses-toolbar-actions">
            <button
              type="button"
              className={`expenses-filter-btn ${
                showFilters || activeFilters ? "active" : ""
              }`}
              onClick={() =>
                setShowFilters((value) => !value)
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
                className="expenses-clear-btn"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick date chips — always visible */}
        <div className="expenses-quick-dates">
          <button
            type="button"
            className={`quick-date-chip ${
              quickFilter === "all" ? "active" : ""
            }`}
            onClick={() => applyQuickFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`quick-date-chip ${
              quickFilter === "today" ? "active" : ""
            }`}
            onClick={() => applyQuickFilter("today")}
          >
            Today
          </button>
          <button
            type="button"
            className={`quick-date-chip ${
              quickFilter === "yesterday" ? "active" : ""
            }`}
            onClick={() => applyQuickFilter("yesterday")}
          >
            Yesterday
          </button>
          <button
            type="button"
            className={`quick-date-chip ${
              quickFilter === "tomorrow" ? "active" : ""
            }`}
            onClick={() => applyQuickFilter("tomorrow")}
          >
            Tomorrow
          </button>
          <button
            type="button"
            className={`quick-date-chip ${
              quickFilter === "week" ? "active" : ""
            }`}
            onClick={() => applyQuickFilter("week")}
          >
            This Week
          </button>
          <button
            type="button"
            className={`quick-date-chip ${
              quickFilter === "month" ? "active" : ""
            }`}
            onClick={() => applyQuickFilter("month")}
          >
            This Month
          </button>
        </div>

        {showFilters && (
          <div className="expenses-filter-panel">
            <label>
              <span>From Date</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setQuickFilter("custom");
                }}
              />
            </label>

            <label>
              <span>To Date</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setQuickFilter("custom");
                }}
              />
            </label>

            <label>
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="All">All Categories</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                <option value="All">All Tractors</option>
                {tractorOptions.map((tractor) => (
                  <option key={tractor} value={tractor}>
                    {tractor}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Payment Mode</span>
              <select
                value={modeFilter}
                onChange={(event) =>
                  setModeFilter(event.target.value)
                }
              >
                <option value="All">All Modes</option>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <div className="expenses-filter-result">
              <span>Filtered Expense</span>
              <strong>{money(filteredTotal)}</strong>
            </div>
          </div>
        )}

        <div className="expenses-card-heading">
          <div>
            <h2>Expense Ledger</h2>
            <p>
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : "Complete record of business expenses."}
            </p>
          </div>

          <div className="expenses-heading-actions">
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="expenses-btn expenses-btn-danger"
                onClick={bulkDeleteSelected}
              >
                <Trash2 size={15} />
                Delete ({selectedIds.length})
              </button>
            )}

            <span className="expenses-count-badge">
              {filteredExpenses.length} entries
            </span>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="expenses-empty">
            <div className="expenses-empty-icon">
              <WalletCards size={24} />
            </div>

            <h3>No expenses found</h3>

            <p>
              {activeFilters
                ? "Try changing or clearing your filters."
                : "Start by recording your first business expense."}
            </p>

            {!activeFilters && (
              <button
                type="button"
                className="expenses-btn expenses-btn-primary"
                onClick={openAdd}
              >
                <Plus size={16} />
                Add First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={
                        filteredExpenses.length > 0 &&
                        filteredExpenses.every((e) =>
                          selectedIds.includes(e.id)
                        )
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Tractor</th>
                  <th>Vendor / Driver</th>
                  <th>Mode</th>
                  <th className="amount-column">Amount</th>
                  <th className="action-column">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => {
                  const originalIndex =
                    expenses.indexOf(expense);

                  return (
                    <tr
                      key={
                        expense.id ||
                        `${getDate(expense)}-${originalIndex}`
                      }
                      className={
                        selectedIds.includes(expense.id)
                          ? "row-selected"
                          : ""
                      }
                    >
                      <td className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(expense.id)}
                          onChange={() => toggleSelect(expense.id)}
                          aria-label="Select expense"
                        />
                      </td>

                      <td>
                        <span className="expense-date">
                          {formatDate(getDate(expense))}
                        </span>
                      </td>

                      <td>
                        <div className="expense-category">
                          <div className="expense-category-icon">
                            {getCategoryIcon(
                              getCategory(expense)
                            )}
                          </div>
                          <strong>
                            {getCategory(expense)}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {getTractor(expense) ? (
                          <div className="expense-tractor">
                            <Car size={13} />
                            <span>
                              {getTractor(expense)}
                            </span>
                          </div>
                        ) : (
                          <span className="muted">Business</span>
                        )}
                      </td>

                      <td>
                        <div className="expense-person">
                          <strong>
                            {getVendor(expense) ||
                              getDriver(expense) ||
                              "—"}
                          </strong>

                          {getVendor(expense) &&
                            getDriver(expense) && (
                              <small>
                                Driver: {getDriver(expense)}
                              </small>
                            )}
                        </div>
                      </td>

                      <td>
                        <span className="expense-mode">
                          {getMode(expense)}
                        </span>
                      </td>

                      <td className="amount-column">
                        <strong className="expense-amount">
                          {money(getAmount(expense))}
                        </strong>
                      </td>

                      <td className="action-column">
                        <div className="expenses-row-actions">
                          <ActionButton
                            icon={<Eye size={14} />}
                            label="View"
                            onClick={() =>
                              setViewExpense(expense)
                            }
                          />

                          <ActionButton
                            icon={<FileText size={14} />}
                            label="Preview"
                            onClick={() => openPreview(expense)}
                            title="Preview voucher"
                          />

                          <ActionButton
                            icon={<Pencil size={14} />}
                            label="Edit"
                            onClick={() =>
                              openEdit(expense, originalIndex)
                            }
                          />

                          <ActionButton
                            icon={<Copy size={14} />}
                            label="Clone"
                            onClick={() => cloneExpense(expense)}
                            title="Clone as new expense"
                          />

                          <ActionButton
                            icon={<Printer size={14} />}
                            label="Print"
                            onClick={() => printExpense(expense)}
                          />

                          <ActionButton
                            icon={<Trash2 size={14} />}
                            label="Delete"
                            danger
                            onClick={() =>
                              deleteExpense(
                                expense,
                                originalIndex
                              )
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="expenses-analysis-grid">
        <div className="expenses-card">
          <div className="expenses-card-heading compact">
            <div>
              <h2>Expense by Category</h2>
              <p>Where your money is going.</p>
            </div>
          </div>

          <div className="expenses-analysis-list">
            {categorySummary.length ? (
              categorySummary.slice(0, 7).map((item) => (
                <div
                  className="expenses-analysis-row"
                  key={item.category}
                >
                  <div>
                    <span className="analysis-icon">
                      {getCategoryIcon(item.category)}
                    </span>
                    <strong>{item.category}</strong>
                  </div>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))
            ) : (
              <div className="analysis-empty">
                No category data yet.
              </div>
            )}
          </div>
        </div>

        <div className="expenses-card">
          <div className="expenses-card-heading compact">
            <div>
              <h2>Tractor-wise Expense</h2>
              <p>Highest expense by tractor.</p>
            </div>
          </div>

          <div className="expenses-analysis-list">
            {tractorSummary.length ? (
              tractorSummary.map((item) => (
                <div
                  className="expenses-analysis-row"
                  key={item.tractor}
                >
                  <div>
                    <span className="analysis-icon">
                      <Car size={15} />
                    </span>
                    <strong>{item.tractor}</strong>
                  </div>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))
            ) : (
              <div className="analysis-empty">
                No tractor-wise expense data yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="expenses-vendor-card">
        <div className="expenses-card">
          <div className="expenses-card-heading compact">
            <div>
              <h2>Top Vendors by Expense</h2>
              <p>Where the biggest payments went.</p>
            </div>
          </div>

          <div className="expenses-vendor-list">
            {vendorSummary.length ? (
              vendorSummary.map((item, index) => (
                <div
                  className="expenses-vendor-row"
                  key={item.vendor}
                >
                  <span className="vendor-rank">
                    #{index + 1}
                  </span>

                  <div className="vendor-info">
                    <Store size={14} />
                    <strong>{item.vendor}</strong>
                  </div>

                  <strong className="vendor-amount">
                    {money(item.amount)}
                  </strong>
                </div>
              ))
            ) : (
              <div className="analysis-empty">
                No vendor data yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {formOpen && (
        <Modal
          title={editing ? "Edit Expense" : "Add Expense"}
          subtitle={
            editing
              ? "Update the existing expense entry."
              : "Record a new business expense."
          }
          onClose={() => setFormOpen(false)}
        >
          <form className="expenses-form" onSubmit={saveExpense}>
            <div className="expenses-form-grid">
              <label className="expenses-field">
                <span>Expense Date *</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="expenses-field">
                <span>Category *</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                  required
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="expenses-field">
                <span>Amount *</span>
                <div className="expenses-input-prefix">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        amount: event.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </label>

              <label className="expenses-field">
                <span>Tractor</span>
                <select
                  value={form.tractorNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tractorNumber: event.target.value,
                    })
                  }
                >
                  <option value="">General / Business</option>
                  {tractorOptions.map((tractor) => (
                    <option key={tractor} value={tractor}>
                      {tractor}
                    </option>
                  ))}
                </select>
              </label>

              <label className="expenses-field">
                <span>Driver</span>
                <input
                  list="expense-driver-options"
                  value={form.driverName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      driverName: event.target.value,
                    })
                  }
                  placeholder="Driver name"
                />
                <datalist id="expense-driver-options">
                  {driverOptions.map((driver) => (
                    <option key={driver} value={driver} />
                  ))}
                </datalist>
              </label>

              <label className="expenses-field">
                <span>Vendor / Supplier</span>
                <input
                  value={form.vendorName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vendorName: event.target.value,
                    })
                  }
                  placeholder="Petrol pump, garage, supplier..."
                />
              </label>

              <label className="expenses-field">
                <span>Payment Mode</span>
                <select
                  value={form.paymentMode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentMode: event.target.value,
                    })
                  }
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="expenses-field">
                <span>Bill / Reference No.</span>
                <input
                  value={form.reference}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reference: event.target.value,
                    })
                  }
                  placeholder="Bill / voucher / UTR"
                />
              </label>

              <label className="expenses-field full">
                <span>Description / Notes</span>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Enter expense details..."
                />
              </label>
            </div>

            <div className="expenses-form-actions">
              <button
                type="button"
                className="expenses-btn expenses-btn-secondary"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="expenses-btn expenses-btn-primary"
              >
                <Check size={16} />
                {editing ? "Update Expense" : "Save Expense"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewExpense && (
        <Modal
          title="Expense Details"
          subtitle="Business expense information"
          onClose={() => setViewExpense(null)}
        >
          <div className="expense-detail-card">
            <div className="expense-detail-hero">
              <div className="expense-detail-icon">
                {getCategoryIcon(
                  getCategory(viewExpense)
                )}
              </div>

              <div>
                <span>Expense Amount</span>
                <strong>
                  {money(getAmount(viewExpense))}
                </strong>
              </div>
            </div>

            <div className="expense-detail-grid">
              <div>
                <span>Category</span>
                <strong>{getCategory(viewExpense)}</strong>
              </div>

              <div>
                <span>Date</span>
                <strong>
                  {formatDate(getDate(viewExpense))}
                </strong>
              </div>

              <div>
                <span>Tractor</span>
                <strong>
                  {getTractor(viewExpense) || "Business"}
                </strong>
              </div>

              <div>
                <span>Driver</span>
                <strong>
                  {getDriver(viewExpense) || "—"}
                </strong>
              </div>

              <div>
                <span>Vendor</span>
                <strong>
                  {getVendor(viewExpense) || "—"}
                </strong>
              </div>

              <div>
                <span>Payment Mode</span>
                <strong>{getMode(viewExpense)}</strong>
              </div>

              <div>
                <span>Reference</span>
                <strong>
                  {getReference(viewExpense) || "—"}
                </strong>
              </div>

              <div className="full">
                <span>Description</span>
                <strong>
                  {getDescription(viewExpense) || "—"}
                </strong>
              </div>
            </div>

            <div className="expenses-form-actions">
              <button
                type="button"
                className="expenses-btn expenses-btn-secondary"
                onClick={() => {
                  setViewExpense(null);
                  openPreview(viewExpense);
                }}
              >
                <FileText size={16} />
                Preview
              </button>

              <button
                type="button"
                className="expenses-btn expenses-btn-secondary"
                onClick={() => printExpense(viewExpense)}
              >
                <Printer size={16} />
                Print / Save PDF
              </button>

              <button
                type="button"
                className="expenses-btn expenses-btn-primary"
                onClick={() => setViewExpense(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview modal — print-friendly paper view */}
      {previewExpense && (
        <Modal
          title="Expense Voucher Preview"
          subtitle="Print-ready voucher"
          onClose={() => setPreviewExpense(null)}
          wide
        >
          <div className="expenses-preview-card">
            <div className="expenses-preview-paper">
              <div className="print-voucher-inner">
                <div className="print-voucher-header">
                  <div>
                    <div className="print-voucher-eyebrow">
                      EXPENSE VOUCHER
                    </div>
                    <h1>SAO AUTO TRACTOR</h1>
                    <p>Business Expense Record</p>
                  </div>

                  <ReceiptText size={38} />
                </div>

                <div className="print-voucher-meta">
                  Date: {formatDate(getDate(previewExpense))}
                </div>

                <div className="print-voucher-grid">
                  <div>
                    <span>Category</span>
                    <strong>{getCategory(previewExpense)}</strong>
                  </div>

                  <div>
                    <span>Amount</span>
                    <strong>
                      {money(getAmount(previewExpense))}
                    </strong>
                  </div>

                  <div>
                    <span>Tractor</span>
                    <strong>
                      {getTractor(previewExpense) || "Business"}
                    </strong>
                  </div>

                  <div>
                    <span>Payment Mode</span>
                    <strong>{getMode(previewExpense)}</strong>
                  </div>

                  <div>
                    <span>Vendor</span>
                    <strong>
                      {getVendor(previewExpense) || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Reference</span>
                    <strong>
                      {getReference(previewExpense) || "—"}
                    </strong>
                  </div>
                </div>

                <div className="print-voucher-total">
                  <span>Total Expense</span>
                  <strong>
                    {money(getAmount(previewExpense))}
                  </strong>
                </div>

                {getDescription(previewExpense) && (
                  <div className="print-voucher-notes">
                    <span>Description</span>
                    <p>{getDescription(previewExpense)}</p>
                  </div>
                )}

                <div className="print-voucher-footer">
                  <span>SAO AUTO TRACTOR</span>
                  <span>Authorized Signature</span>
                </div>
              </div>
            </div>

            <div className="expenses-preview-actions">
              <button
                type="button"
                className="expenses-btn expenses-btn-secondary"
                onClick={() => setPreviewExpense(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="expenses-btn expenses-btn-primary"
                onClick={printPreview}
              >
                <Printer size={16} />
                Print / Save PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Print-only voucher block */}
      {previewExpense && (
        <div className="expenses-print-voucher">
          <div className="print-voucher-inner">
            <div className="print-voucher-header">
              <div>
                <div className="print-voucher-eyebrow">
                  EXPENSE VOUCHER
                </div>

                <h1>SAO AUTO TRACTOR</h1>

                <p>Business Expense Record</p>
              </div>

              <ReceiptText size={38} />
            </div>

            <div className="print-voucher-meta">
              Date: {formatDate(getDate(previewExpense))}
            </div>

            <div className="print-voucher-grid">
              <div>
                <span>Category</span>
                <strong>{getCategory(previewExpense)}</strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>
                  {money(getAmount(previewExpense))}
                </strong>
              </div>

              <div>
                <span>Tractor</span>
                <strong>
                  {getTractor(previewExpense) || "Business"}
                </strong>
              </div>

              <div>
                <span>Payment Mode</span>
                <strong>{getMode(previewExpense)}</strong>
              </div>

              <div>
                <span>Vendor</span>
                <strong>
                  {getVendor(previewExpense) || "—"}
                </strong>
              </div>

              <div>
                <span>Reference</span>
                <strong>
                  {getReference(previewExpense) || "—"}
                </strong>
              </div>
            </div>

            <div className="print-voucher-total">
              <span>Total Expense</span>
              <strong>
                {money(getAmount(previewExpense))}
              </strong>
            </div>

            {getDescription(previewExpense) && (
              <div className="print-voucher-notes">
                <span>Description</span>
                <p>{getDescription(previewExpense)}</p>
              </div>
            )}

            <div className="print-voucher-footer">
              <span>SAO AUTO TRACTOR</span>
              <span>Authorized Signature</span>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {undoData && (
        <UndoToast
          message={undoData.message}
          onUndo={undoDelete}
          onClose={() => setUndoData(null)}
        />
      )}
    </div>
  );
}