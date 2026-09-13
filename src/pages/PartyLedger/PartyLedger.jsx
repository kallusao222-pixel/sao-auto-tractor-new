import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Users,
  Receipt,
  Wallet,
  AlertCircle,
  ChevronRight,
  Phone,
  MapPin,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
  CalendarDays,
  CreditCard,
  Eye,
  Printer,
  Trash2,
  ArrowLeft,
  Filter,
  Plus,
  MessageCircle,
  Copy,
  FileDown,
  Bell,
  Download,
  TrendingUp,
  TrendingDown,
  Save,
} from "lucide-react";

import { useAppData } from "../../context/AppDataContext";
import { calculateTripAmount } from "../../utils/calculations";
import { toNumber } from "../../utils/currency";
import { getTodayISO } from "../../utils/date";
import "./PartyLedger.css";

/* =========================================================
   HELPERS
   ========================================================= */

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatMoney = (value) =>
  `₹${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

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

const getTimestamp = (value) => {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getPartyName = (party) =>
  String(
    party?.partyName ||
      party?.name ||
      party?.customerName ||
      "",
  ).trim();

const getTripPartyName = (trip) =>
  String(
    trip?.partyName ||
      trip?.party ||
      trip?.customerName ||
      "",
  ).trim();

const getPaymentPartyName = (payment) =>
  String(
    payment?.partyName ||
      payment?.party ||
      payment?.customerName ||
      "",
  ).trim();

const getTripDate = (trip) =>
  trip?.date ||
  trip?.tripDate ||
  trip?.createdAt ||
  "";

const getPaymentDate = (payment) =>
  payment?.date ||
  payment?.paymentDate ||
  payment?.createdAt ||
  "";

const getTripType = (trip) =>
  String(
    trip?.tripType ||
      trip?.type ||
      "Site to Site",
  ).trim();

const getRecordId = (record, fallback) =>
  String(
    record?.id ||
      record?._id ||
      record?.tripId ||
      record?.paymentId ||
      fallback,
  );

const todayISO = () => new Date().toISOString().split("T")[0];

/* =========================================================
   PARTY LEDGER
   ========================================================= */

function PartyLedger() {
  const {
    parties = [],
    trips = [],
    payments = [],
  } = useAppData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");

  const [selectedParty, setSelectedParty] =
    useState(null);

  const [fullLedger, setFullLedger] =
    useState(false);

  const [ledgerType, setLedgerType] =
    useState("all");

  const [ledgerSearch, setLedgerSearch] =
    useState("");

  const [ledgerLimit, setLedgerLimit] =
    useState(20);

  const [previewRecord, setPreviewRecord] =
    useState(null);

  // Quick Date Filters
  const [quickFilter, setQuickFilter] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Toast notification
  const [toast, setToast] = useState(null);

  // NEW: Inline Payment Modal state
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    date: todayISO(),
    amount: "",
    paymentMode: "Cash",
    reference: "",
    notes: "",
  });
  const [paymentFormError, setPaymentFormError] = useState("");

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  /* =======================================================
     BUILD PARTY ACCOUNTS
     ======================================================= */

  const partyAccounts = useMemo(() => {
    const map = new Map();

    const ensureParty = (
      name,
      partyData = null,
    ) => {
      const cleanName = String(
        name || "",
      ).trim();

      if (!cleanName) return null;

      const key = normalize(cleanName);

      if (!map.has(key)) {
        map.set(key, {
          name: cleanName,
          party: partyData,
          bills: [],
          payments: [],
        });
      }

      const account = map.get(key);

      if (partyData) {
        account.party = partyData;
      }

      return account;
    };

    parties.forEach((party) => {
      const name = getPartyName(party);

      if (name) {
        ensureParty(name, party);
      }
    });

    trips.forEach((trip, index) => {
      const partyName =
        getTripPartyName(trip);

      if (!partyName) return;

      const account =
        ensureParty(partyName);

      if (!account) return;

      const amount = toNumber(
        calculateTripAmount(trip),
      );

      account.bills.push({
        ...trip,
        _amount: amount,
        _ledgerId: getRecordId(
          trip,
          `trip-${index}`,
        ),
      });
    });

    payments.forEach((payment, index) => {
      const partyName =
        getPaymentPartyName(payment);

      if (!partyName) return;

      const account =
        ensureParty(partyName);

      if (!account) return;

      const amount = toNumber(
        payment?.amount,
      );

      account.payments.push({
        ...payment,
        _amount: amount,
        _ledgerId: getRecordId(
          payment,
          `payment-${index}`,
        ),
      });
    });

    return Array.from(map.values()).map(
      (account) => {
        const totalBilling =
          account.bills.reduce(
            (sum, bill) =>
              sum + toNumber(bill._amount),
            0,
          );

        const totalReceived =
          account.payments.reduce(
            (sum, payment) =>
              sum +
              toNumber(payment._amount),
            0,
          );

        const balance =
          totalBilling - totalReceived;

        const due = Math.max(
          0,
          balance,
        );

        const advance = Math.max(
          0,
          -balance,
        );

        const billDates =
          account.bills
            .map((bill) =>
              getTimestamp(
                getTripDate(bill),
              ),
            )
            .filter(Boolean);

        const paymentDates =
          account.payments
            .map((payment) =>
              getTimestamp(
                getPaymentDate(payment),
              ),
            )
            .filter(Boolean);

        const latestActivity = Math.max(
          0,
          ...billDates,
          ...paymentDates,
        );

        const hasEntries =
          account.bills.length > 0 ||
          account.payments.length > 0;

        // Due aging
        let dueAge = null;
        if (due > 0) {
          const oldestBill = account.bills.reduce(
            (oldest, bill) => {
              const date = new Date(getTripDate(bill));
              return !oldest || date < oldest ? date : oldest;
            },
            null
          );
          if (oldestBill) {
            const daysDiff = Math.floor((Date.now() - oldestBill.getTime()) / (1000 * 60 * 60 * 24));
            dueAge = daysDiff > 0 ? daysDiff : 0;
          }
        }

        return {
          ...account,

          totalBilling,
          totalReceived,
          balance,
          due,
          advance,

          billCount:
            account.bills.length,

          paymentCount:
            account.payments.length,

          tripCount:
            account.bills.length,

          latestActivity,
          latestActivityDate:
            latestActivity || null,

          hasEntries,

          isDue: due > 0,

          isClear:
            due === 0 &&
            advance === 0,

          hasAdvance:
            advance > 0,

          dueAge,
        };
      },
    );
  }, [parties, trips, payments]);

  /* =======================================================
     SUMMARY
     ======================================================= */

  const summary = useMemo(() => {
    return partyAccounts.reduce(
      (result, account) => {
        result.totalParties += 1;

        result.totalBilling +=
          account.totalBilling;

        result.totalReceived +=
          account.totalReceived;

        result.totalDue +=
          account.due;

        result.totalAdvance +=
          account.advance;

        result.totalBills +=
          account.billCount;

        if (account.isDue) {
          result.dueParties += 1;
        }

        if (account.isClear) {
          result.clearParties += 1;
        }

        if (account.hasAdvance) {
          result.advanceParties += 1;
        }

        if (account.hasEntries) {
          result.activeParties += 1;
        }

        if (account.dueAge !== null && account.dueAge > 30) {
          result.overdueParties += 1;
        }

        return result;
      },
      {
        totalParties: 0,
        totalBilling: 0,
        totalReceived: 0,
        totalDue: 0,
        totalAdvance: 0,
        totalBills: 0,
        dueParties: 0,
        clearParties: 0,
        advanceParties: 0,
        activeParties: 0,
        overdueParties: 0,
      },
    );
  }, [partyAccounts]);

  /* =======================================================
     FILTER + PRIORITY SORT
     ======================================================= */

  const filteredAccounts = useMemo(() => {
    const query = normalize(search);

    const result =
      partyAccounts.filter((account) => {
        const matchesSearch =
          !query ||
          normalize(
            account.name,
          ).includes(query) ||
          normalize(
            account.party?.contact,
          ).includes(query) ||
          normalize(
            account.party?.partyCode,
          ).includes(query);

        if (!matchesSearch) {
          return false;
        }

        if (
          statusFilter === "due" &&
          !account.isDue
        ) {
          return false;
        }

        if (
          statusFilter === "clear" &&
          !account.isClear
        ) {
          return false;
        }

        if (
          statusFilter === "advance" &&
          !account.hasAdvance
        ) {
          return false;
        }

        if (
          statusFilter === "overdue" &&
          (account.dueAge === null || account.dueAge <= 30)
        ) {
          return false;
        }

        return true;
      });

    return result.sort((a, b) => {
      if (sortBy === "priority") {
        const priorityA =
          a.isDue
            ? 0
            : a.hasEntries
              ? 1
              : 2;

        const priorityB =
          b.isDue
            ? 0
            : b.hasEntries
              ? 1
              : 2;

        if (
          priorityA !==
          priorityB
        ) {
          return (
            priorityA -
            priorityB
          );
        }

        if (
          priorityA === 0 &&
          b.due !== a.due
        ) {
          return (
            b.due -
            a.due
          );
        }

        if (
          b.latestActivity !==
          a.latestActivity
        ) {
          return (
            b.latestActivity -
            a.latestActivity
          );
        }

        if (
          b.totalBilling !==
          a.totalBilling
        ) {
          return (
            b.totalBilling -
            a.totalBilling
          );
        }

        return a.name.localeCompare(
          b.name,
        );
      }

      if (sortBy === "billing") {
        if (
          b.totalBilling !==
          a.totalBilling
        ) {
          return (
            b.totalBilling -
            a.totalBilling
          );
        }

        return a.name.localeCompare(
          b.name,
        );
      }

      if (sortBy === "received") {
        if (
          b.totalReceived !==
          a.totalReceived
        ) {
          return (
            b.totalReceived -
            a.totalReceived
          );
        }

        return a.name.localeCompare(
          b.name,
        );
      }

      if (sortBy === "activity") {
        if (
          b.latestActivity !==
          a.latestActivity
        ) {
          return (
            b.latestActivity -
            a.latestActivity
          );
        }

        return a.name.localeCompare(
          b.name,
        );
      }

      if (sortBy === "name") {
        return a.name.localeCompare(
          b.name,
        );
      }

      return 0;
    });
  }, [
    partyAccounts,
    search,
    statusFilter,
    sortBy,
  ]);

  /* =======================================================
     SELECTED ACCOUNT
     ======================================================= */

  const selectedAccount = useMemo(() => {
    if (!selectedParty) {
      return null;
    }

    return (
      partyAccounts.find(
        (account) =>
          normalize(account.name) ===
          normalize(selectedParty),
      ) || null
    );
  }, [
    selectedParty,
    partyAccounts,
  ]);

  /* =======================================================
     ACCOUNT ACTIVITY
     ======================================================= */

  const getAccountActivity = (
    account,
    dateFrom = "",
    dateTo = "",
  ) => {
    if (!account) return [];

    const bills =
      account.bills.map((bill) => ({
        id: `bill-${bill._ledgerId}`,
        type: "bill",
        date: getTripDate(bill),
        amount: toNumber(
          bill._amount,
        ),
        description:
          bill?.description ||
          bill?.material ||
          bill?.product ||
          bill?.workType ||
          getTripType(bill),
        reference: bill,
      }));

    const received =
      account.payments.map(
        (payment) => ({
          id: `payment-${payment._ledgerId}`,
          type: "payment",
          date:
            getPaymentDate(payment),
          amount: toNumber(
            payment._amount,
          ),
          description:
            payment?.note ||
            payment?.remarks ||
            payment?.paymentMode ||
            "Payment Received",
          reference: payment,
        }),
      );

    let all = [...bills, ...received];

    // Date filter
    if (dateFrom) {
      all = all.filter((item) => {
        const itemDate = String(item.date || "").split("T")[0];
        return itemDate >= dateFrom;
      });
    }
    if (dateTo) {
      all = all.filter((item) => {
        const itemDate = String(item.date || "").split("T")[0];
        return itemDate <= dateTo;
      });
    }

    return all.sort(
      (a, b) =>
        getTimestamp(b.date) -
        getTimestamp(a.date),
    );
  };

  /* =======================================================
     RECENT ACTIVITY
     ======================================================= */

  const recentActivity = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    return getAccountActivity(
      selectedAccount,
      filterDateFrom,
      filterDateTo,
    ).slice(0, 10);
  }, [selectedAccount, filterDateFrom, filterDateTo]);

  /* =======================================================
     FULL LEDGER TRANSACTIONS
     ======================================================= */

  const fullTransactions = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    let records =
      getAccountActivity(
        selectedAccount,
        filterDateFrom,
        filterDateTo,
      );

    if (ledgerType !== "all") {
      records = records.filter(
        (record) =>
          record.type ===
          ledgerType,
      );
    }

    const query =
      normalize(ledgerSearch);

    if (query) {
      records = records.filter(
        (record) =>
          normalize(
            record.description,
          ).includes(query) ||
          normalize(
            formatDate(record.date),
          ).includes(query),
      );
    }

    return records;
  }, [
    selectedAccount,
    ledgerType,
    ledgerSearch,
    filterDateFrom,
    filterDateTo,
  ]);

  const visibleTransactions =
    fullTransactions.slice(
      0,
      ledgerLimit,
    );

  /* =======================================================
     DUE PRIORITY
     ======================================================= */

  const dueAccounts = useMemo(() => {
    return partyAccounts
      .filter(
        (account) =>
          account.due > 0,
      )
      .sort((a, b) => {
        if (b.due !== a.due) {
          return b.due - a.due;
        }

        return (
          b.latestActivity -
          a.latestActivity
        );
      })
      .slice(0, 5);
  }, [partyAccounts]);

  /* =======================================================
     OVERDUE PARTIES (30+ days)
     ======================================================= */

  const overdueAccounts = useMemo(() => {
    return partyAccounts
      .filter(
        (account) =>
          account.dueAge !== null && account.dueAge > 30
      )
      .sort((a, b) => {
        if (b.dueAge !== a.dueAge) {
          return (b.dueAge || 0) - (a.dueAge || 0);
        }
        return b.due - a.due;
      })
      .slice(0, 5);
  }, [partyAccounts]);

  /* =======================================================
     OPEN ACCOUNT
     ======================================================= */

  const openAccount = (name) => {
    setSelectedParty(name);
    setFullLedger(false);
    setLedgerType("all");
    setLedgerSearch("");
    setLedgerLimit(20);
    setQuickFilter("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  /* =======================================================
     OPEN FULL LEDGER
     ======================================================= */

  const openFullLedger = () => {
    setFullLedger(true);
    setLedgerType("all");
    setLedgerSearch("");
    setLedgerLimit(20);
  };

  /* =======================================================
     CLOSE ACCOUNT
     ======================================================= */

  const closeAccount = () => {
    setSelectedParty(null);
    setFullLedger(false);
    setPreviewRecord(null);
  };

  /* =======================================================
     QUICK DATE FILTERS
     ======================================================= */

  const applyQuickFilter = (type) => {
    const today = new Date();
    const todayStr = todayISO();

    if (type === "today") {
      setFilterDateFrom(todayStr);
      setFilterDateTo(todayStr);
    } else if (type === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      setFilterDateFrom(start.toISOString().split("T")[0]);
      setFilterDateTo(todayStr);
    } else if (type === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilterDateFrom(start.toISOString().split("T")[0]);
      setFilterDateTo(todayStr);
    } else {
      setFilterDateFrom("");
      setFilterDateTo("");
    }
    setQuickFilter(type);
  };

  /* =======================================================
     WHATSAPP SHARE
     ======================================================= */

  const shareWhatsApp = (account) => {
    const message =
      `🏢 *Party Account Statement*%0A%0A` +
      `👤 *${account.name}*%0A%0A` +
      `📊 *Summary*%0A` +
      `💰 Total Bill: ${formatMoney(account.totalBilling)}%0A` +
      `📥 Received: ${formatMoney(account.totalReceived)}%0A` +
      `📤 Due: ${formatMoney(account.due)}%0A` +
      `📈 Advance: ${formatMoney(account.advance)}%0A` +
      `📋 Trips: ${account.billCount}%0A` +
      `💳 Payments: ${account.paymentCount}%0A%0A` +
      `---%0A` +
      `SAO AUTO TRACTOR`;

    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  /* =======================================================
     CLONE PARTY
     ======================================================= */

  const cloneParty = (account) => {
    const newName = prompt(
      "Enter new party name for cloned party:",
      `${account.name} (Clone)`
    );

    if (!newName || newName.trim() === "") {
      return;
    }

    const currentParties = JSON.parse(
      localStorage.getItem("saoAutoTractorParties") || "[]"
    );

    const existingParty = account.party || {};
    const newParty = {
      ...existingParty,
      id: undefined,
      _id: undefined,
      partyName: newName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedParties = [newParty, ...currentParties];
    localStorage.setItem("saoAutoTractorParties", JSON.stringify(updatedParties));
    window.dispatchEvent(new Event("saoAutoTractorDataChanged"));

    setToast({
      message: `Party "${newName}" cloned successfully!`,
      type: "success",
    });

    // NOTE: Reload removed — AppDataContext auto-updates via
    // saoAutoTractorDataChanged event.
  };

  /* =======================================================
     NEW: OPEN INLINE PAYMENT MODAL
     ======================================================= */

  const openPaymentModal = (account) => {
    if (!account) return;

    const due = toNumber(account.due);
    if (due <= 0) {
      setToast({
        message: "This party has no outstanding due.",
        type: "warning",
      });
      return;
    }

    setPaymentForm({
      date: todayISO(),
      amount: String(due),
      paymentMode: "Cash",
      reference: "",
      notes: "",
    });
    setPaymentFormError("");
    setPaymentModal({
      partyName: account.name,
      due: due,
    });
  };

  /* =======================================================
     NEW: SAVE INLINE PAYMENT
     ======================================================= */

  const saveInlinePayment = () => {
    if (!paymentModal) return;

    setPaymentFormError("");

    const amount = Number(paymentForm.amount);
    const due = Number(paymentModal.due) || 0;

    if (!paymentForm.date) {
      setPaymentFormError("Please select a payment date.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentFormError("Please enter a valid amount.");
      return;
    }
    if (amount > due) {
      setPaymentFormError(
        `Amount cannot be more than the current due of ₹${formatMoney(due)}.`
      );
      return;
    }

    const newPayment = {
      id: Date.now(),
      date: paymentForm.date,
      partyName: paymentModal.partyName,
      amount: amount,
      paymentMode: paymentForm.paymentMode,
      reference: paymentForm.reference.trim(),
      notes: paymentForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem("saoAutoTractorPayments") || "[]"
      );
      const updated = [...existing, newPayment];
      localStorage.setItem(
        "saoAutoTractorPayments",
        JSON.stringify(updated)
      );

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(
        new CustomEvent("saoAutoTractorDataChanged")
      );

      setToast({
        message: `Payment of ₹${formatMoney(amount)} recorded for ${paymentModal.partyName}.`,
        type: "success",
      });

      setPaymentModal(null);
      setPaymentForm({
        date: todayISO(),
        amount: "",
        paymentMode: "Cash",
        reference: "",
        notes: "",
      });
      setPaymentFormError("");
    } catch (error) {
      console.error("Inline payment save error:", error);
      setPaymentFormError("Payment could not be saved. Please try again.");
    }
  };

  /* =======================================================
     EXPORT LEDGER CSV
     ======================================================= */

  const exportLedgerCSV = () => {
    if (!selectedAccount) return;

    const transactions = getAccountActivity(
      selectedAccount,
      filterDateFrom,
      filterDateTo,
    );

    if (!transactions.length) {
      setToast({
        message: "No transactions to export.",
        type: "warning",
      });
      return;
    }

    const headers = ["Date", "Type", "Description", "Amount"];
    const rows = transactions.map((t) => [
      formatDate(t.date),
      t.type === "bill" ? "Billing" : "Payment",
      t.description,
      t.amount,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedAccount.name}-ledger-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Ledger exported successfully!`,
      type: "success",
    });
  };

  /* =======================================================
     EXPORT PARTY LIST
     ======================================================= */

  const exportPartyList = () => {
    if (!filteredAccounts.length) {
      setToast({
        message: "No parties to export.",
        type: "warning",
      });
      return;
    }

    const headers = ["Party", "Contact", "Bills", "Total Billing", "Received", "Due", "Status"];
    const rows = filteredAccounts.map((a) => [
      a.name,
      a.party?.contact || "",
      a.billCount,
      a.totalBilling,
      a.totalReceived,
      a.due,
      a.isDue ? "Due" : a.hasAdvance ? "Advance" : a.hasEntries ? "Clear" : "No Entry",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `party-ledger-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Party list exported successfully!`,
      type: "success",
    });
  };

  /* =======================================================
     DELETE RECORD
     ======================================================= */

  const handleDeleteRecord = (
    record,
  ) => {
    if (!record?.reference) {
      return;
    }

    const isBill =
      record.type === "bill";

    const storageKey = isBill
      ? "saoAutoTractorTrips"
      : "saoAutoTractorPayments";

    const recordId =
      record.reference?.id ||
      record.reference?._id ||
      record.reference?.tripId ||
      record.reference?.paymentId;

    if (!recordId) {
      window.alert(
        "Is record ka permanent ID nahi mila, isliye delete nahi kiya gaya.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Kya aap "${record.description}" ko delete karna chahte hain?\n\nYe action undo nahi kiya ja sakta.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const existing =
        JSON.parse(
          localStorage.getItem(
            storageKey,
          ) || "[]",
        );

      const updated =
        existing.filter(
          (item) =>
            String(
              item?.id ||
                item?._id ||
                item?.tripId ||
                item?.paymentId,
            ) !== String(recordId),
        );

      localStorage.setItem(
        storageKey,
        JSON.stringify(updated),
      );

      window.dispatchEvent(
        new Event("storage"),
      );

      window.dispatchEvent(
        new CustomEvent(
          "saoAutoTractorDataChanged",
        ),
      );

      setPreviewRecord(null);

      setToast({
        message: "Record deleted successfully!",
        type: "success",
      });
    } catch (error) {
      console.error(
        "Party Ledger delete error:",
        error,
      );

      window.alert(
        "Record delete nahi ho paya.",
      );
    }
  };

  /* =======================================================
     PRINT RECORD
     ======================================================= */

  const printRecord = (record) => {
    if (!record) return;

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=800,height=700",
      );

    if (!printWindow) {
      window.alert(
        "Print window open nahi ho paya. Browser popup allow karein.",
      );
      return;
    }

    const isBill =
      record.type === "bill";

    const title = isBill
      ? "Billing Record"
      : "Payment Receipt";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #152033;
          }

          .header {
            border-bottom: 2px solid #152033;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }

          h1 {
            margin: 0 0 6px;
          }

          .muted {
            color: #666;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 12px 0;
            border-bottom: 1px solid #ddd;
          }

          .amount {
            font-size: 22px;
            font-weight: bold;
          }

          .footer {
            margin-top: 35px;
            color: #777;
            font-size: 12px;
          }

          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="muted">
            ${selectedAccount?.name || ""}
          </div>
        </div>

        <div class="row">
          <strong>Date</strong>
          <span>${formatDate(
            record.date,
          )}</span>
        </div>

        <div class="row">
          <strong>Description</strong>
          <span>${record.description || "—"}</span>
        </div>

        <div class="row">
          <strong>Type</strong>
          <span>${isBill ? "Billing" : "Payment Received"}</span>
        </div>

        ${
          record.reference?.vehicleNumber
            ? `
            <div class="row">
              <strong>Vehicle</strong>
              <span>${record.reference.vehicleNumber}</span>
            </div>
          `
            : ""
        }

        ${
          record.reference?.paymentMode
            ? `
            <div class="row">
              <strong>Payment Mode</strong>
              <span>${record.reference.paymentMode}</span>
            </div>
          `
            : ""
        }

        <div class="row">
          <strong>Amount</strong>
          <span class="amount">
            ${formatMoney(
              record.amount,
            )}
          </span>
        </div>

        <div class="footer">
          Printed from SAO AUTO TRACTOR Party Ledger
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  /* =======================================================
     PRINT PARTY LEDGER
     ======================================================= */

  const printPartyLedger = () => {
    if (!selectedAccount) {
      return;
    }

    const transactions =
      getAccountActivity(
        selectedAccount,
        filterDateFrom,
        filterDateTo,
      );

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800",
      );

    if (!printWindow) {
      window.alert(
        "Print window open nahi ho paya.",
      );
      return;
    }

    const rows =
      transactions
        .map(
          (record) => `
            <tr>
              <td>${formatDate(
                record.date,
              )}</td>
              <td>${record.type === "bill" ? "Billing" : "Payment"}</td>
              <td>${record.description || "—"}</td>
              <td style="text-align:right">
                ${formatMoney(
                  record.amount,
                )}
              </td>
            </tr>
          `,
        )
        .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Party Ledger - ${selectedAccount.name}</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #152033;
          }

          h1 {
            margin-bottom: 4px;
          }

          .meta {
            color: #666;
            margin-bottom: 25px;
          }

          .summary {
            display: flex;
            gap: 30px;
            margin-bottom: 25px;
          }

          .summary div {
            padding: 12px 16px;
            border: 1px solid #ddd;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            border-bottom: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }

          th {
            background: #f4f4f4;
          }

          .due {
            font-weight: bold;
          }

          @media print {
            body {
              padding: 15px;
            }
          }
        </style>
      </head>

      <body>

        <h1>${selectedAccount.name}</h1>

        <div class="meta">
          Party Ledger
          ${
            selectedAccount.party
              ?.contact
              ? ` • ${selectedAccount.party.contact}`
              : ""
          }
        </div>

        <div class="summary">
          <div>
            <strong>Total Billing</strong><br/>
            ${formatMoney(
              selectedAccount.totalBilling,
            )}
          </div>

          <div>
            <strong>Total Received</strong><br/>
            ${formatMoney(
              selectedAccount.totalReceived,
            )}
          </div>

          <div>
            <strong>Current Due</strong><br/>
            ${formatMoney(
              selectedAccount.due,
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

      </body>
      </html>
    `);

    printWindow.document.close();
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="party-ledger-page">

      {/* ===================================================
          TOAST NOTIFICATION
      =================================================== */}

      {toast && (
        <div className={`ledger-toast ${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* HEADER */}

      <div className="party-ledger-header">
        <div>
          <div className="party-ledger-eyebrow">
            PARTY ACCOUNTS
          </div>

          <h1>Party Ledger</h1>

          <p>
            Har party ka billing, payment
            aur outstanding ek hi jagah
            manage karein.
          </p>
        </div>

        <div className="party-ledger-header-actions">
          <button
            type="button"
            className="ledger-action-btn"
            onClick={exportPartyList}
            title="Export Party List"
          >
            <FileDown size={16} />
            Export List
          </button>
        </div>
      </div>

      {/* OVERDUE REMINDER BANNER */}

      {summary.overdueParties > 0 && (
        <div className="ledger-reminder-banner">
          <Bell size={18} />
          <div>
            <strong>Payment Reminder</strong>
            <span>
              {summary.overdueParties} party(s) have outstanding due for 30+ days.
              Total overdue: {formatMoney(summary.totalDue)}
            </span>
          </div>
        </div>
      )}

      {/* SUMMARY */}

      <section className="party-ledger-summary">

        <div className="ledger-summary-card">
          <div className="ledger-summary-icon">
            <Users size={20} />
          </div>

          <div>
            <span>Total Parties</span>
            <strong>
              {summary.totalParties}
            </strong>
          </div>
        </div>

        <div className="ledger-summary-card">
          <div className="ledger-summary-icon billing">
            <Receipt size={20} />
          </div>

          <div>
            <span>Total Billing</span>
            <strong>
              {formatMoney(
                summary.totalBilling,
              )}
            </strong>
          </div>
        </div>

        <div className="ledger-summary-card">
          <div className="ledger-summary-icon received">
            <Wallet size={20} />
          </div>

          <div>
            <span>Total Received</span>
            <strong>
              {formatMoney(
                summary.totalReceived,
              )}
            </strong>
          </div>
        </div>

        <div className="ledger-summary-card due">
          <div className="ledger-summary-icon due">
            <AlertCircle size={20} />
          </div>

          <div>
            <span>Total Outstanding</span>
            <strong>
              {formatMoney(
                summary.totalDue,
              )}
            </strong>
          </div>
        </div>

      </section>

      {/* SEARCH */}

      <section className="party-ledger-toolbar">

        <div className="party-ledger-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search party, contact or party code..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />

          {search && (
            <button
              type="button"
              className="ledger-search-clear"
              onClick={() =>
                setSearch("")
              }
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="ledger-party-count">
          {filteredAccounts.length}{" "}
          {filteredAccounts.length === 1
            ? "Party"
            : "Parties"}
        </div>

      </section>

      {/* FILTERS */}

      <section className="ledger-filter-bar">

        <div className="ledger-status-filters">

          <button
            type="button"
            className={
              statusFilter === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setStatusFilter("all")
            }
          >
            All
            <span>
              {summary.totalParties}
            </span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "due"
                ? "active due"
                : ""
            }
            onClick={() =>
              setStatusFilter("due")
            }
          >
            <Clock3 size={14} />
            Due
            <span>
              {summary.dueParties}
            </span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "overdue"
                ? "active due"
                : ""
            }
            onClick={() =>
              setStatusFilter("overdue")
            }
          >
            <AlertCircle size={14} />
            Overdue
            <span>
              {summary.overdueParties}
            </span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "clear"
                ? "active clear"
                : ""
            }
            onClick={() =>
              setStatusFilter("clear")
            }
          >
            <CheckCircle2 size={14} />
            Clear
            <span>
              {summary.clearParties}
            </span>
          </button>

          {summary.advanceParties >
            0 && (
            <button
              type="button"
              className={
                statusFilter ===
                "advance"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "advance",
                )
              }
            >
              <CreditCard size={14} />
              Advance
              <span>
                {
                  summary.advanceParties
                }
              </span>
            </button>
          )}

        </div>

        <div className="ledger-sort-control">
          <SlidersHorizontal
            size={15}
          />

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value,
              )
            }
          >
            <option value="priority">
              Smart Priority
            </option>

            <option value="billing">
              Highest Billing
            </option>

            <option value="received">
              Highest Received
            </option>

            <option value="activity">
              Latest Activity
            </option>

            <option value="name">
              Party Name
            </option>
          </select>
        </div>

      </section>

      {/* DUE PRIORITY */}

      {dueAccounts.length > 0 && (
        <section className="ledger-due-section">

          <div className="ledger-section-heading">
            <div>
              <span>
                PAYMENT PRIORITY
              </span>

              <h2>
                Payment Due Parties
              </h2>
            </div>

            <div className="ledger-due-count">
              {summary.dueParties} Due
            </div>
          </div>

          <div className="ledger-due-list">

            {dueAccounts.map(
              (account) => (
                <button
                  type="button"
                  className="ledger-due-card"
                  key={account.name}
                  onClick={() =>
                    openAccount(
                      account.name,
                    )
                  }
                >
                  <div className="ledger-party-avatar">
                    {account.name
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="ledger-due-party-info">
                    <strong>
                      {account.name}
                    </strong>

                    <span>
                      {account.billCount}{" "}
                      bill
                      {account.billCount !==
                      1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  <div className="ledger-due-amount">
                    <span>Due</span>

                    <strong>
                      {formatMoney(
                        account.due,
                      )}
                    </strong>
                  </div>

                  <ChevronRight
                    size={18}
                  />
                </button>
              ),
            )}

          </div>
        </section>
      )}

      {/* PARTY REGISTER */}

      <section className="party-register-section">

        <div className="ledger-section-heading">
          <div>
            <span>
              PARTY REGISTER
            </span>

            <h2>
              {statusFilter ===
              "due"
                ? "Due Party Accounts"
                : statusFilter ===
                    "overdue"
                  ? "Overdue Party Accounts (30+ days)"
                  : statusFilter ===
                      "clear"
                    ? "Clear Party Accounts"
                    : statusFilter ===
                        "advance"
                      ? "Advance Party Accounts"
                      : "All Party Accounts"}
            </h2>
          </div>
        </div>

        {filteredAccounts.length ===
        0 ? (
          <div className="ledger-empty">
            <Users size={32} />

            <h3>
              No party accounts found
            </h3>

            <p>
              Search ya selected filter
              ke according koi party
              nahi mili.
            </p>

            {(search ||
              statusFilter !==
                "all") && (
              <button
                type="button"
                className="ledger-reset-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all",
                  );
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="party-register-table-wrap">

            <table className="party-register-table">

              <thead>
                <tr>
                  <th>Party</th>
                  <th>Contact</th>
                  <th>Bills</th>
                  <th>Total Billing</th>
                  <th>Received</th>
                  <th>Balance</th>
                  <th>Due Age</th>
                  <th>Last Activity</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredAccounts.map(
                  (account) => (
                    <tr
                      key={
                        account.name
                      }
                    >
                      <td>
                        <div className="ledger-party-cell">

                          <div className="ledger-party-avatar small">
                            {account.name
                              .slice(
                                0,
                                2,
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {
                                account.name
                              }
                            </strong>

                            {account
                              .party
                              ?.partyCode && (
                              <span>
                                {
                                  account
                                    .party
                                    .partyCode
                                }
                              </span>
                            )}

                            {!account.hasEntries && (
                              <small className="ledger-inactive-label">
                                No entries
                              </small>
                            )}
                          </div>

                        </div>
                      </td>

                      <td>
                        {account
                          .party
                          ?.contact ? (
                          <div className="ledger-contact">
                            <Phone
                              size={14}
                            />

                            {
                              account
                                .party
                                .contact
                            }
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <span className="ledger-number">
                          {
                            account.billCount
                          }
                        </span>
                      </td>

                      <td>
                        <strong className="ledger-money">
                          {formatMoney(
                            account.totalBilling,
                          )}
                        </strong>
                      </td>

                      <td>
                        <strong className="ledger-money received">
                          {formatMoney(
                            account.totalReceived,
                          )}
                        </strong>
                      </td>

                      <td>
                        {account.hasAdvance ? (
                          <span className="ledger-due-badge clear">
                            Advance
                          </span>
                        ) : account.due > 0 ? (
                          <span className={`ledger-due-badge has-due ${account.dueAge !== null && account.dueAge > 30 ? 'overdue' : ''}`}>
                            {formatMoney(
                              account.due,
                            )}
                          </span>
                        ) : account.hasEntries ? (
                          <span className="ledger-due-badge clear">
                            Clear
                          </span>
                        ) : (
                          <span className="ledger-due-badge">
                            No Entry
                          </span>
                        )}
                      </td>

                      <td>
                        {account.dueAge !== null && account.due > 0 ? (
                          <span className={`ledger-due-age ${account.dueAge > 30 ? 'overdue' : ''}`}>
                            {account.dueAge} days
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <div className="ledger-last-activity">
                          <CalendarDays
                            size={13}
                          />

                          {formatDate(
                            account.latestActivityDate,
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="ledger-row-actions">
                          <button
                            type="button"
                            className="ledger-action-icon"
                            onClick={() => shareWhatsApp(account)}
                            title="Share on WhatsApp"
                          >
                            <MessageCircle size={15} color="#25D366" />
                          </button>

                          <button
                            type="button"
                            className="ledger-action-icon"
                            onClick={() => openAccount(account.name)}
                            title="View Account"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>

            </table>
          </div>
        )}
      </section>

      {/* ===================================================
          ACCOUNT MODAL
          =================================================== */}

      {selectedAccount &&
        !fullLedger && (
          <div
            className="party-ledger-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeAccount();
              }
            }}
          >
            <div className="party-ledger-modal">

              {/* HEADER */}

              <div className="party-ledger-modal-header">

                <div>
                  <span>
                    PARTY ACCOUNT
                  </span>

                  <h2>
                    {
                      selectedAccount.name
                    }
                  </h2>

                  {selectedAccount
                    .party
                    ?.contact && (
                    <p>
                      <Phone
                        size={14}
                      />
                      {
                        selectedAccount
                          .party
                          .contact
                      }
                    </p>
                  )}
                </div>

                <div className="ledger-modal-actions">
                  {selectedAccount.isDue && selectedAccount.due > 0 && (
                    <button
                      type="button"
                      className="ledger-action-icon reminder"
                      onClick={() => shareWhatsApp(selectedAccount)}
                      title="Send Reminder"
                    >
                      <Bell size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="ledger-action-icon"
                    onClick={() => shareWhatsApp(selectedAccount)}
                    title="Share on WhatsApp"
                  >
                    <MessageCircle size={16} color="#25D366" />
                  </button>

                  <button
                    type="button"
                    className="ledger-action-icon"
                    onClick={() => cloneParty(selectedAccount)}
                    title="Clone Party"
                  >
                    <Copy size={16} color="#1A5F7A" />
                  </button>

                  <button
                    type="button"
                    className="ledger-modal-close"
                    onClick={
                      closeAccount
                    }
                  >
                    <X size={20} />
                  </button>
                </div>

              </div>

              {/* SMART REMINDER BANNER */}

              {selectedAccount.isDue && selectedAccount.due > 0 && (
                <div className="ledger-account-reminder">
                  <Bell size={16} />
                  <span>
                    <strong>Payment Due:</strong>
                    {formatMoney(selectedAccount.due)} outstanding.
                    {selectedAccount.dueAge !== null && selectedAccount.dueAge > 30 && (
                      <span className="overdue-text"> Overdue by {selectedAccount.dueAge} days</span>
                    )}
                  </span>
                </div>
              )}

              {/* PARTY INFO */}

              {selectedAccount.party && (
                <div className="ledger-party-info-box">

                  {selectedAccount
                    .party
                    .address && (
                    <div>
                      <MapPin
                        size={15}
                      />

                      <span>
                        {
                          selectedAccount
                            .party
                            .address
                        }
                      </span>
                    </div>
                  )}

                  {selectedAccount
                    .party
                    .siteInfo && (
                    <div>
                      <span className="info-label">
                        Site
                      </span>

                      <span>
                        {
                          selectedAccount
                            .party
                            .siteInfo
                        }
                      </span>
                    </div>
                  )}

                  {selectedAccount
                    .party
                    .partyCode && (
                    <div>
                      <span className="info-label">
                        Code
                      </span>

                      <span>
                        {
                          selectedAccount
                            .party
                            .partyCode
                        }
                      </span>
                    </div>
                  )}

                </div>
              )}

              {/* STATUS */}

              <div className={`ledger-account-status ${selectedAccount.isDue ? 'due' : selectedAccount.hasAdvance ? 'advance' : 'clear'}`}>

                {selectedAccount.isDue ? (
                  <>
                    <Clock3
                      size={15}
                    />

                    <span>
                      Payment
                      Outstanding
                    </span>

                    <strong>
                      {formatMoney(
                        selectedAccount.due,
                      )}
                    </strong>

                    {selectedAccount.dueAge !== null && (
                      <span className="due-age-badge">
                        {selectedAccount.dueAge} days
                      </span>
                    )}
                  </>
                ) : selectedAccount.hasAdvance ? (
                  <>
                    <CreditCard
                      size={15}
                    />

                    <span>
                      Advance /
                      Credit
                    </span>

                    <strong>
                      {formatMoney(
                        selectedAccount.advance,
                      )}
                    </strong>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={15}
                    />

                    <span>
                      Account Clear
                    </span>

                    <strong>
                      ₹0
                    </strong>
                  </>
                )}

              </div>

              {/* TOTALS */}

              <div className="ledger-detail-summary">

                <div>
                  <span>
                    Total Billing
                  </span>

                  <strong>
                    {formatMoney(
                      selectedAccount.totalBilling,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Total Received
                  </span>

                  <strong className="received">
                    {formatMoney(
                      selectedAccount.totalReceived,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Current Due
                  </span>

                  <strong
                    className={
                      selectedAccount.due >
                      0
                        ? "due"
                        : "clear"
                    }
                  >
                    {formatMoney(
                      selectedAccount.due,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Total Bills
                  </span>

                  <strong>
                    {
                      selectedAccount.billCount
                    }
                  </strong>
                </div>

              </div>

              {/* QUICK ACTIONS */}

              <div className="ledger-account-actions">

                <button
                  type="button"
                  onClick={
                    openFullLedger
                  }
                >
                  <Receipt
                    size={16}
                  />
                  Full Ledger
                </button>

                <button
                  type="button"
                  onClick={
                    printPartyLedger
                  }
                >
                  <Printer
                    size={16}
                  />
                  Print Ledger
                </button>

                {/* UPDATED: Add Payment — opens inline modal */}
                <button
                  type="button"
                  onClick={() =>
                    openPaymentModal(selectedAccount)
                  }
                >
                  <Plus size={16} />
                  Add Payment
                </button>

              </div>

              {/* RECENT ACTIVITY */}

              <div className="ledger-history-section">

                <div className="ledger-history-title">

                  <div>
                    <span>
                      RECENT ACTIVITY
                    </span>

                    <h3>
                      Latest 10 Records
                    </h3>
                  </div>

                  <strong>
                    {
                      getAccountActivity(
                        selectedAccount,
                      ).length
                    }{" "}
                    Records
                  </strong>

                </div>

                {recentActivity.length ===
                0 ? (
                  <div className="ledger-small-empty">
                    No transactions found.
                  </div>
                ) : (
                  <div className="ledger-history-list">

                    {recentActivity.map(
                      (record) => (
                        <div
                          className="ledger-history-row"
                          key={
                            record.id
                          }
                        >

                          <div
                            className={`ledger-history-icon ${
                              record.type ===
                              "bill"
                                ? "bill"
                                : "payment"
                            }`}
                          >
                            {record.type ===
                            "bill" ? (
                              <ArrowUpRight
                                size={16}
                              />
                            ) : (
                              <ArrowDownLeft
                                size={16}
                              />
                            )}
                          </div>

                          <div className="ledger-history-main">

                            <strong>
                              {
                                record.description
                              }
                            </strong>

                            <span>
                              {formatDate(
                                record.date,
                              )}

                              {record
                                .reference
                                ?.vehicleNumber
                                ? ` • ${record.reference.vehicleNumber}`
                                : ""}
                            </span>

                          </div>

                          <strong
                            className={`ledger-history-amount ${
                              record.type
                            }`}
                          >
                            {formatMoney(
                              record.amount,
                            )}
                          </strong>

                          <div className="ledger-row-actions">

                            <button
                              type="button"
                              title="Preview"
                              onClick={() =>
                                setPreviewRecord(
                                  record,
                                )
                              }
                            >
                              <Eye
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              title="Print"
                              onClick={() =>
                                printRecord(
                                  record,
                                )
                              }
                            >
                              <Printer
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              title="Delete"
                              onClick={() =>
                                handleDeleteRecord(
                                  record,
                                )
                              }
                            >
                              <Trash2
                                size={15}
                              />
                            </button>

                          </div>

                        </div>
                      ),
                    )}

                  </div>
                )}

              </div>

              {/* FULL LEDGER CTA */}

              {getAccountActivity(
                selectedAccount,
              ).length > 10 && (
                <button
                  type="button"
                  className="ledger-full-history-button"
                  onClick={
                    openFullLedger
                  }
                >
                  View Full Ledger
                  <ChevronRight
                    size={16}
                  />
                </button>
              )}

              {/* BALANCE */}

              <div className="ledger-balance-box">

                <div>
                  <span>
                    ACCOUNT BALANCE
                  </span>

                  <strong>
                    {selectedAccount.isDue
                      ? "Payment Outstanding"
                      : selectedAccount.hasAdvance
                        ? "Advance / Credit"
                        : "Account Clear"}
                  </strong>
                </div>

                <strong
                  className={
                    selectedAccount.isDue
                      ? "due"
                      : "clear"
                  }
                >
                  {selectedAccount.isDue
                    ? formatMoney(
                        selectedAccount.due,
                      )
                    : selectedAccount.hasAdvance
                      ? formatMoney(
                          selectedAccount.advance,
                        )
                      : "₹0"}
                </strong>

              </div>

            </div>
          </div>
        )}

      {/* ===================================================
          FULL LEDGER
          =================================================== */}

      {selectedAccount &&
        fullLedger && (
          <div
            className="party-ledger-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeAccount();
              }
            }}
          >

            <div className="party-ledger-modal party-ledger-full-modal">

              <div className="party-ledger-modal-header">

                <div>

                  <button
                    type="button"
                    className="ledger-back-button"
                    onClick={() =>
                      setFullLedger(
                        false,
                      )
                    }
                  >
                    <ArrowLeft
                      size={16}
                    />
                    Account Overview
                  </button>

                  <span>
                    FULL PARTY LEDGER
                  </span>

                  <h2>
                    {
                      selectedAccount.name
                    }
                  </h2>

                </div>

                <div className="ledger-header-actions">

                  <button
                    type="button"
                    className="ledger-print-button"
                    onClick={
                      printPartyLedger
                    }
                  >
                    <Printer
                      size={16}
                    />
                    Print
                  </button>

                  <button
                    type="button"
                    className="ledger-print-button"
                    onClick={exportLedgerCSV}
                  >
                    <FileDown size={16} />
                    Export CSV
                  </button>

                  <button
                    type="button"
                    className="ledger-modal-close"
                    onClick={
                      closeAccount
                    }
                  >
                    <X size={20} />
                  </button>

                </div>

              </div>

              {/* LEDGER SUMMARY */}

              <div className="ledger-detail-summary">

                <div>
                  <span>
                    Billing
                  </span>

                  <strong>
                    {formatMoney(
                      selectedAccount.totalBilling,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Received
                  </span>

                  <strong className="received">
                    {formatMoney(
                      selectedAccount.totalReceived,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Due
                  </span>

                  <strong
                    className={
                      selectedAccount.due >
                      0
                        ? "due"
                        : "clear"
                    }
                  >
                    {formatMoney(
                      selectedAccount.due,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Transactions
                  </span>

                  <strong>
                    {
                      getAccountActivity(
                        selectedAccount,
                        filterDateFrom,
                        filterDateTo,
                      ).length
                    }
                  </strong>
                </div>

              </div>

              {/* LEDGER TOOLBAR */}

              <div className="ledger-full-toolbar">

                <div className="ledger-full-search">
                  <Search
                    size={16}
                  />

                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={
                      ledgerSearch
                    }
                    onChange={(event) => {
                      setLedgerSearch(
                        event.target
                          .value,
                      );
                      setLedgerLimit(
                        20,
                      );
                    }}
                  />

                  {ledgerSearch && (
                    <button
                      type="button"
                      onClick={() =>
                        setLedgerSearch(
                          "",
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="ledger-type-filters">

                  <button
                    type="button"
                    className={
                      ledgerType ===
                      "all"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setLedgerType(
                        "all",
                      );
                      setLedgerLimit(
                        20,
                      );
                    }}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    className={
                      ledgerType ===
                      "bill"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setLedgerType(
                        "bill",
                      );
                      setLedgerLimit(
                        20,
                      );
                    }}
                  >
                    Bills
                  </button>

                  <button
                    type="button"
                    className={
                      ledgerType ===
                      "payment"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setLedgerType(
                        "payment",
                      );
                      setLedgerLimit(
                        20,
                      );
                    }}
                  >
                    Payments
                  </button>

                </div>

              </div>

              {/* QUICK DATE FILTERS */}

              <div className="ledger-quick-filters">
                <button
                  type="button"
                  className={`ledger-quick-btn ${quickFilter === 'today' ? 'active' : ''}`}
                  onClick={() => applyQuickFilter('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`ledger-quick-btn ${quickFilter === 'week' ? 'active' : ''}`}
                  onClick={() => applyQuickFilter('week')}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  className={`ledger-quick-btn ${quickFilter === 'month' ? 'active' : ''}`}
                  onClick={() => applyQuickFilter('month')}
                >
                  This Month
                </button>
                {quickFilter !== 'all' && (
                  <button
                    type="button"
                    className="ledger-quick-btn clear"
                    onClick={() => applyQuickFilter('all')}
                  >
                    <X size={14} /> Clear
                  </button>
                )}
                <div className="ledger-quick-date-range">
                  <span>From:</span>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => {
                      setFilterDateFrom(e.target.value);
                      setQuickFilter('custom');
                    }}
                  />
                  <span>To:</span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => {
                      setFilterDateTo(e.target.value);
                      setQuickFilter('custom');
                    }}
                  />
                </div>
              </div>

              {/* RECORD COUNT */}

              <div className="ledger-result-info">

                <span>
                  <Filter
                    size={14}
                  />

                  Showing{" "}
                  {Math.min(
                    ledgerLimit,
                    fullTransactions.length,
                  )}{" "}
                  of{" "}
                  {
                    fullTransactions.length
                  }{" "}
                  records
                </span>

              </div>

              {/* TRANSACTIONS */}

              <div className="ledger-full-list">

                {visibleTransactions
                  .length === 0 ? (
                  <div className="ledger-small-empty">
                    No matching records
                    found.
                  </div>
                ) : (
                  visibleTransactions.map(
                    (record) => (
                      <div
                        className="ledger-full-row"
                        key={
                          record.id
                        }
                      >

                        <div
                          className={`ledger-history-icon ${
                            record.type ===
                            "bill"
                              ? "bill"
                              : "payment"
                          }`}
                        >
                          {record.type ===
                          "bill" ? (
                            <ArrowUpRight
                              size={16}
                            />
                          ) : (
                            <ArrowDownLeft
                              size={16}
                            />
                          )}
                        </div>

                        <div className="ledger-full-date">
                          <strong>
                            {formatDate(
                              record.date,
                            )}
                          </strong>

                          <span>
                            {record.type ===
                            "bill"
                              ? "Billing"
                              : "Payment"}
                          </span>
                        </div>

                        <div className="ledger-history-main">

                          <strong>
                            {
                              record.description
                            }
                          </strong>

                          <span>
                            {record
                              .reference
                              ?.vehicleNumber
                              ? `Vehicle: ${record.reference.vehicleNumber}`
                              : ""}

                            {record
                              .reference
                              ?.paymentMode
                              ? ` • ${record.reference.paymentMode}`
                              : ""}
                          </span>

                        </div>

                        <strong
                          className={`ledger-history-amount ${
                            record.type
                          }`}
                        >
                          {record.type ===
                          "bill"
                            ? "+"
                            : "−"}

                          {formatMoney(
                            record.amount,
                          )}
                        </strong>

                        <div className="ledger-row-actions">

                          <button
                            type="button"
                            title="Preview"
                            onClick={() =>
                              setPreviewRecord(
                                record,
                              )
                            }
                          >
                            <Eye
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            title="Print"
                            onClick={() =>
                              printRecord(
                                record,
                              )
                            }
                          >
                            <Printer
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete"
                            onClick={() =>
                              handleDeleteRecord(
                                record,
                              )
                            }
                          >
                            <Trash2
                              size={15}
                            />
                          </button>

                        </div>

                      </div>
                    ),
                  )
                )}

              </div>

              {/* LOAD MORE */}

              {ledgerLimit <
                fullTransactions.length && (
                <button
                  type="button"
                  className="ledger-load-more"
                  onClick={() =>
                    setLedgerLimit(
                      (current) =>
                        current + 20,
                    )
                  }
                >
                  Load 20 More
                </button>
              )}

              {ledgerLimit >=
                fullTransactions.length &&
                fullTransactions.length >
                  20 && (
                  <div className="ledger-all-loaded">
                    All{" "}
                    {
                      fullTransactions.length
                    }{" "}
                    records loaded
                  </div>
                )}

              {/* BALANCE */}

              <div className="ledger-balance-box">

                <div>
                  <span>
                    CURRENT ACCOUNT
                  </span>

                  <strong>
                    {selectedAccount.isDue
                      ? "Payment Outstanding"
                      : selectedAccount.hasAdvance
                        ? "Advance / Credit"
                        : "Account Clear"}
                  </strong>
                </div>

                <strong
                  className={
                    selectedAccount.isDue
                      ? "due"
                      : "clear"
                  }
                >
                  {selectedAccount.isDue
                    ? formatMoney(
                        selectedAccount.due,
                      )
                    : selectedAccount.hasAdvance
                      ? formatMoney(
                          selectedAccount.advance,
                        )
                      : "₹0"}
                </strong>

              </div>

            </div>
          </div>
        )}

      {/* ===================================================
          RECORD PREVIEW
          =================================================== */}

      {previewRecord && (
        <div
          className="party-ledger-preview-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPreviewRecord(
                null,
              );
            }
          }}
        >
          <div className="party-ledger-preview">

            <div className="party-ledger-preview-header">

              <div>
                <span>
                  {previewRecord.type ===
                  "bill"
                    ? "BILL RECORD"
                    : "PAYMENT RECORD"}
                </span>

                <h3>
                  {
                    previewRecord.description
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewRecord(
                    null,
                  )
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="ledger-preview-body">

              <div>
                <span>Party</span>
                <strong>
                  {
                    selectedAccount?.name
                  }
                </strong>
              </div>

              <div>
                <span>Date</span>
                <strong>
                  {formatDate(
                    previewRecord.date,
                  )}
                </strong>
              </div>

              <div>
                <span>Type</span>
                <strong>
                  {previewRecord.type ===
                  "bill"
                    ? "Billing"
                    : "Payment Received"}
                </strong>
              </div>

              <div>
                <span>Description</span>
                <strong>
                  {
                    previewRecord.description
                  }
                </strong>
              </div>

              {previewRecord.reference
                ?.vehicleNumber && (
                <div>
                  <span>
                    Vehicle
                  </span>

                  <strong>
                    {
                      previewRecord
                        .reference
                        .vehicleNumber
                    }
                  </strong>
                </div>
              )}

              {previewRecord.reference
                ?.paymentMode && (
                <div>
                  <span>
                    Payment Mode
                  </span>

                  <strong>
                    {
                      previewRecord
                        .reference
                        .paymentMode
                    }
                  </strong>
                </div>
              )}

              <div className="ledger-preview-amount">
                <span>Amount</span>

                <strong>
                  {formatMoney(
                    previewRecord.amount,
                  )}
                </strong>
              </div>

            </div>

            <div className="ledger-preview-actions">

              <button
                type="button"
                onClick={() =>
                  printRecord(
                    previewRecord,
                  )
                }
              >
                <Printer
                  size={16}
                />
                Print
              </button>

              <button
                type="button"
                className="danger"
                onClick={() =>
                  handleDeleteRecord(
                    previewRecord,
                  )
                }
              >
                <Trash2
                  size={16}
                />
                Delete
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ===================================================
          NEW: INLINE PAYMENT MODAL
          =================================================== */}

      {paymentModal && (
        <div
          className="party-ledger-payment-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPaymentModal(null);
              setPaymentFormError("");
            }
          }}
        >
          <div className="party-ledger-payment-modal">

            <div className="party-ledger-payment-header">
              <div>
                <span>QUICK PAYMENT ENTRY</span>
                <h3>{paymentModal.partyName}</h3>
                <p>
                  Outstanding due:{" "}
                  <strong>{formatMoney(paymentModal.due)}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaymentModal(null);
                  setPaymentFormError("");
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="party-ledger-payment-body">

              <label className="ledger-payment-field">
                <span>Payment Date *</span>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="ledger-payment-field">
                <span>Amount *</span>
                <input
                  type="number"
                  min="0"
                  max={paymentModal.due}
                  step="0.01"
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="ledger-payment-field">
                <span>Payment Mode</span>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentMode: e.target.value,
                    }))
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="ledger-payment-field">
                <span>Reference</span>
                <input
                  type="text"
                  placeholder="Transaction / receipt no."
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="ledger-payment-field ledger-payment-full">
                <span>Notes</span>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                />
              </label>

              {paymentFormError && (
                <div className="ledger-payment-error" role="status" aria-live="polite">
                  <AlertCircle size={15} />
                  <span>{paymentFormError}</span>
                </div>
              )}

            </div>

            <div className="party-ledger-payment-footer">
              <button
                type="button"
                className="ledger-payment-btn secondary"
                onClick={() => {
                  setPaymentModal(null);
                  setPaymentFormError("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ledger-payment-btn primary"
                onClick={saveInlinePayment}
              >
                <Save size={15} />
                Save Payment
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default PartyLedger;