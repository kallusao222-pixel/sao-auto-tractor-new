import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Edit3,
  IndianRupee,
  MapPin,
  Phone,
  ReceiptText,
  X,
  Printer,
  MessageCircle,
  Copy,
  FileDown,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Bell,
} from "lucide-react";

import {
  calculateTripAmount,
} from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";
import { formatDate, getTodayISO } from "../../utils/date";

import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";

import "./PartyDetails.css";

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getPartyName(trip) {
  return String(
    trip?.partyName ??
      trip?.party ??
      trip?.party_name ??
      "",
  ).trim();
}

function getTripAmount(trip) {
  const directAmount = Number(
    trip?.amount ??
      trip?.totalAmount ??
      trip?.billingAmount ??
      trip?.total ??
      0,
  );

  if (
    Number.isFinite(directAmount) &&
    directAmount > 0
  ) {
    return directAmount;
  }

  const quantity = Number(
    trip?.quantity ??
      trip?.qty ??
      0,
  );

  const rate = Number(
    trip?.rate ??
      trip?.price ??
      0,
  );

  return calculateTripAmount({
    quantity,
    rate,
  });
}

function getPaymentPartyName(
  payment,
) {
  return String(
    payment?.partyName ??
      payment?.party ??
      payment?.party_name ??
      "",
  ).trim();
}

function getPaymentAmount(
  payment,
) {
  const amount = Number(
    payment?.amount ??
      payment?.received ??
      payment?.paymentAmount ??
      0,
  );

  return Number.isFinite(amount) &&
    amount > 0
    ? amount
    : 0;
}

function getInitials(name) {
  const value = String(
    name || "",
  ).trim();

  if (!value) return "PT";

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getTripType(trip) {
  const value = normalize(
    trip?.tripType ??
      trip?.type ??
      "",
  );

  if (
    value ===
      "loading + unloading" ||
    value ===
      "loading and unloading" ||
    value ===
      "loading/unloading"
  ) {
    return "Loading + Unloading";
  }

  if (
    value === "loading" ||
    value === "loading only"
  ) {
    return "Loading";
  }

  if (
    value === "unloading" ||
    value === "unloading only"
  ) {
    return "Unloading";
  }

  if (
    value === "site to site" ||
    value === "site-to-site"
  ) {
    return "Site to Site";
  }

  return (
    trip?.tripType ||
    trip?.type ||
    "Trip"
  );
}

function DetailMetric({
  icon,
  label,
  value,
  className = "",
}) {
  return (
    <div
      className={`pd-metric ${className}`}
    >
      <div className="pd-metric-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PartyDetails({
  party,
  trips = [],
  payments = [],
  onClose,
  onEdit,
  onDelete,
  onRefresh,
  onViewTrip,
}) {
  const today = getTodayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTripForView, setSelectedTripForView] = useState(null);

  const safeTrips = Array.isArray(
    trips,
  )
    ? trips
    : [];

  const safePayments =
    Array.isArray(payments)
      ? payments
      : [];

  // =========================================================
  // ACCOUNT CALCULATIONS
  // =========================================================

  const account = useMemo(() => {
    const partyName =
      normalize(
        party?.partyName,
      );

    const partyTrips =
      safeTrips.filter(
        (trip) =>
          normalize(
            getPartyName(trip),
          ) === partyName,
      );

    const partyPayments =
      safePayments.filter(
        (payment) =>
          normalize(
            getPaymentPartyName(
              payment,
            ),
          ) === partyName,
      );

    const billing =
      partyTrips.reduce(
        (sum, trip) =>
          sum +
          getTripAmount(trip),
        0,
      );

    const received =
      partyPayments.reduce(
        (sum, payment) =>
          sum +
          getPaymentAmount(
            payment,
          ),
        0,
      );

    const due = Math.max(
      0,
      billing - received,
    );

    const advance =
      Math.max(
        0,
        received - billing,
      );

    const loading =
      partyTrips.filter(
        (trip) =>
          getTripType(trip) ===
          "Loading",
      ).length;

    const unloading =
      partyTrips.filter(
        (trip) =>
          getTripType(trip) ===
          "Unloading",
      ).length;

    const combined =
      partyTrips.filter(
        (trip) =>
          getTripType(trip) ===
          "Loading + Unloading",
      ).length;

    const siteToSite =
      partyTrips.filter(
        (trip) =>
          getTripType(trip) ===
          "Site to Site",
      ).length;

    // =========================================================
    // SMART REMINDER — Check if due > 30 days old
    // =========================================================

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldDueTrips = partyTrips.filter((trip) => {
      const tripDate = new Date(trip?.date || 0);
      return getAmount(trip) > 0 && tripDate < thirtyDaysAgo;
    });

    const hasOldDue = oldDueTrips.length > 0 && due > 0;

    const activity =
      [
        ...partyTrips.map(
          (trip, index) => ({
            id:
              trip?.id ||
              `trip-${index}`,
            date: trip?.date,
            kind: "trip",
            title:
              getTripType(trip),
            description:
              trip?.material ||
              trip?.product ||
              trip?.site ||
              trip?.location ||
              "Transport trip",
            amount:
              getTripAmount(trip),
            vehicle:
              trip?.vehicleNumber ||
              trip?.tractorNumber ||
              "—",
            quantity:
              trip?.quantity || 0,
            rate:
              trip?.rate || 0,
            tripData: trip,
          }),
        ),

        ...partyPayments.map(
          (payment, index) => ({
            id:
              payment?.id ||
              payment?._id ||
              `payment-${index}`,
            date: payment?.date,
            kind: "payment",
            title:
              "Payment Received",
            description:
              payment?.paymentMode ||
              payment?.mode ||
              payment?.reference ||
              "Payment received",
            amount:
              getPaymentAmount(
                payment,
              ),
            mode:
              payment?.paymentMode ||
              "—",
            reference:
              payment?.reference ||
              "—",
          }),
        ),
      ].sort((a, b) => {
        const dateA =
          new Date(
            a?.date || 0,
          ).getTime();

        const dateB =
          new Date(
            b?.date || 0,
          ).getTime();

        return dateB - dateA;
      });

    return {
      partyTrips,
      partyPayments,
      billing,
      received,
      due,
      advance,
      loading,
      unloading,
      combined,
      siteToSite,
      activity,
      hasOldDue,
      oldDueTrips,
    };
  }, [
    party,
    safeTrips,
    safePayments,
  ]);

  // =========================================================
  // DAILY ACTIVITY (Date-wise Filter)
  // =========================================================

  const dailyActivity = useMemo(() => {
    const partyName = normalize(party?.partyName);

    const dayTrips = safeTrips.filter(
      (trip) => {
        const tripDate = trip?.date || trip?.createdAt?.split('T')[0] || "";
        return normalize(getPartyName(trip)) === partyName &&
               tripDate === selectedDate;
      }
    );

    const dayPayments = safePayments.filter(
      (payment) => {
        const paymentDate = payment?.date || payment?.createdAt?.split('T')[0] || "";
        return normalize(getPaymentPartyName(payment)) === partyName &&
               paymentDate === selectedDate;
      }
    );

    const dayActivity = [
      ...dayTrips.map((trip, index) => ({
        id: trip?.id || `trip-${index}`,
        date: trip?.date,
        kind: "trip",
        title: getTripType(trip),
        description: trip?.material || trip?.product || trip?.site || "Transport trip",
        amount: getTripAmount(trip),
        vehicle: trip?.vehicleNumber || "—",
        quantity: trip?.quantity || 0,
        rate: trip?.rate || 0,
        tripData: trip,
      })),
      ...dayPayments.map((payment, index) => ({
        id: payment?.id || `payment-${index}`,
        date: payment?.date,
        kind: "payment",
        title: "Payment Received",
        description: payment?.paymentMode || payment?.mode || "Payment",
        amount: getPaymentAmount(payment),
        mode: payment?.paymentMode || "—",
        reference: payment?.reference || "—",
      })),
    ].sort((a, b) => {
      const dateA = new Date(a?.date || 0).getTime();
      const dateB = new Date(b?.date || 0).getTime();
      return dateB - dateA;
    });

    const totalTrips = dayTrips.length;
    const totalPayments = dayPayments.length;
    const totalBilling = dayTrips.reduce((s, t) => s + getTripAmount(t), 0);
    const totalReceived = dayPayments.reduce((s, p) => s + getPaymentAmount(p), 0);

    return { dayActivity, totalTrips, totalPayments, totalBilling, totalReceived };
  }, [party, safeTrips, safePayments, selectedDate]);

  // =========================================================
  // WHATSAPP SHARE
  // =========================================================

  const shareWhatsApp = () => {
    const message =
      `🏢 *Party Account Statement*%0A%0A` +
      `👤 *${party?.partyName || "Party"}*%0A%0A` +
      `📊 *Summary*%0A` +
      `💰 Total Bill: ${formatCurrency(account.billing)}%0A` +
      `📥 Received: ${formatCurrency(account.received)}%0A` +
      `📤 Due: ${formatCurrency(account.due)}%0A` +
      `📈 Advance: ${formatCurrency(account.advance)}%0A` +
      `📋 Trips: ${account.partyTrips.length}%0A` +
      `💳 Payments: ${account.partyPayments.length}%0A%0A` +
      `---%0A` +
      `SAO AUTO TRACTOR`;

    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  // =========================================================
  // PRINT STATEMENT
  // =========================================================

  const printStatement = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Please allow pop-ups to print.");
      return;
    }

    const companyName = "SAO AUTO TRACTOR";
    const currentDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    let tableRows = account.activity.slice(0, 20).map((item) => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${item.title}</td>
        <td>${item.description}</td>
        <td style="text-align:right;">${formatCurrency(item.amount)}</td>
      </tr>
    `).join("");

    if (tableRows === "") {
      tableRows = `<tr><td colspan="4" style="text-align:center;padding:20px;">No activity recorded.</td></tr>`;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${companyName} - Party Statement</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 20px;
              color: #152033;
              background: #fff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1A5F7A;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #1A5F7A;
            }
            .header p {
              margin: 4px 0 0;
              color: #6d675e;
              font-size: 12px;
            }
            .header .meta {
              text-align: right;
              font-size: 12px;
              color: #6d675e;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .summary .stat {
              padding: 12px;
              border: 1px solid #ddd6ca;
              border-radius: 8px;
              background: #faf8f3;
            }
            .summary .stat span {
              display: block;
              font-size: 10px;
              color: #6d675e;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .summary .stat strong {
              display: block;
              font-size: 18px;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background: #f3efe6;
              padding: 10px 8px;
              border: 1px solid #d8d3c9;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            td {
              padding: 8px;
              border: 1px solid #d8d3c9;
            }
            .footer {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #d8d3c9;
              font-size: 10px;
              color: #6d675e;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${companyName}</h1>
              <p>Transport Management System</p>
            </div>
            <div class="meta">
              <strong>Party Statement</strong><br />
              ${party?.partyName || "Party"}<br />
              Generated: ${currentDate}
            </div>
          </div>

          <div class="summary">
            <div class="stat"><span>Total Bill</span><strong>${formatCurrency(account.billing)}</strong></div>
            <div class="stat"><span>Received</span><strong>${formatCurrency(account.received)}</strong></div>
            <div class="stat"><span>Due</span><strong>${formatCurrency(account.due)}</strong></div>
            <div class="stat"><span>Advance</span><strong>${formatCurrency(account.advance)}</strong></div>
          </div>

          <table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Description</th><th style="text-align:right;">Amount</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="footer">
            <span>${companyName} - Transport Management System</span>
            <span>Page 1 of 1</span>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // =========================================================
  // CLONE PARTY
  // =========================================================

  const cloneParty = () => {
    const newPartyName = prompt(
      "Enter new party name for cloned party:",
      `${party?.partyName} (Clone)`
    );

    if (!newPartyName || newPartyName.trim() === "") {
      return;
    }

    const currentParties = JSON.parse(
      localStorage.getItem("saoAutoTractorParties") || "[]"
    );

    const newParty = {
      ...party,
      id: undefined,
      _id: undefined,
      partyName: newPartyName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    delete newParty.__id;

    const updatedParties = [newParty, ...currentParties];
    localStorage.setItem("saoAutoTractorParties", JSON.stringify(updatedParties));
    window.dispatchEvent(new Event("saoAutoTractorDataChanged"));

    alert(`Party "${newParty.partyName}" cloned successfully!`);
    onRefresh?.();
    onClose();
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const exportCSV = () => {
    if (!account.activity.length) {
      alert("No activity to export.");
      return;
    }

    const headers = ["Date", "Type", "Description", "Amount"];
    const rows = account.activity.map((item) => [
      formatDate(item.date),
      item.title,
      item.description,
      item.amount,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${party?.partyName || "party"}-statement-${getTodayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // =========================================================
  // DELETE PARTY
  // =========================================================

  const confirmDelete = () => {
    const currentParties = JSON.parse(
      localStorage.getItem("saoAutoTractorParties") || "[]"
    );

    const updatedParties = currentParties.filter(
      (p) => p?.id !== party?.id
    );

    localStorage.setItem("saoAutoTractorParties", JSON.stringify(updatedParties));
    window.dispatchEvent(new Event("saoAutoTractorDataChanged"));

    setShowDeleteConfirm(false);
    onDelete?.();
    onClose();
    onRefresh?.();
  };

  // =========================================================
  // QUICK TRIP VIEW
  // =========================================================

  const openTripView = (item) => {
    if (item.kind === "trip" && item.tripData) {
      onViewTrip?.(item.tripData);
    }
  };

  // =========================================================
  // DATE FILTER HANDLERS
  // =========================================================

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const setToday = () => {
    setSelectedDate(getTodayISO());
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday.toISOString().split('T')[0]);
  };

  const balanceStatus =
    account.due > 0
      ? "due"
      : account.advance > 0
      ? "advance"
      : "paid";

  return (
    <div className="party-details-overlay">
      <button
        type="button"
        className="party-details-backdrop"
        onClick={onClose}
        aria-label="Close party details"
      />

      <aside
        className="party-details-drawer"
        aria-label="Party account details"
      >
        <header className="pd-header">
          <div>
            <span className="pd-eyebrow">
              PARTY ACCOUNT
            </span>

            <h2>
              {party?.partyName ||
                "Party Details"}
            </h2>

            <p>
              Complete account summary,
              activity and payment history.
            </p>
          </div>

          <div className="pd-header-actions">
            {/* =================================================
                SMART REMINDER BADGE
            ================================================= */}

            {account.hasOldDue && (
              <div className="pd-reminder-badge" title="Payment overdue for 30+ days">
                <Bell size={15} />
                <span>Reminder</span>
              </div>
            )}

            <button
              type="button"
              className="pd-action-btn"
              onClick={shareWhatsApp}
              title="Share on WhatsApp"
            >
              <MessageCircle size={17} color="#25D366" />
            </button>

            <button
              type="button"
              className="pd-action-btn"
              onClick={printStatement}
              title="Print Statement"
            >
              <Printer size={17} />
            </button>

            <button
              type="button"
              className="pd-action-btn"
              onClick={cloneParty}
              title="Clone Party"
            >
              <Copy size={17} color="#1A5F7A" />
            </button>

            <button
              type="button"
              className="pd-action-btn"
              onClick={exportCSV}
              title="Export CSV"
            >
              <FileDown size={17} />
            </button>

            <button
              type="button"
              className="pd-action-btn pd-danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Party"
            >
              <Trash2 size={17} />
            </button>

            <button
              type="button"
              className="pd-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="party-details-body">

          {/* ===================================================
              SMART REMINDER BANNER
          =================================================== */}

          {account.hasOldDue && (
            <div className="pd-reminder-banner">
              <Bell size={18} />
              <div>
                <strong>Payment Reminder</strong>
                <span>
                  {account.oldDueTrips.length} trip(s) are overdue for 30+ days. 
                  Total due: {formatCurrency(account.due)}
                </span>
              </div>
            </div>
          )}

          {/* ===================================================
              DELETE CONFIRMATION
          =================================================== */}

          {showDeleteConfirm && (
            <div className="pd-delete-overlay">
              <div className="pd-delete-modal">
                <div className="pd-delete-icon">
                  <Trash2 size={24} />
                </div>
                <h3>Delete Party?</h3>
                <p>
                  Are you sure you want to delete <strong>"{party?.partyName}"</strong>?
                  This action cannot be undone.
                </p>
                <div className="pd-delete-actions">
                  <button
                    type="button"
                    className="pd-delete-cancel"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pd-delete-confirm"
                    onClick={confirmDelete}
                  >
                    <Trash2 size={16} /> Delete Party
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================
              PROFILE CARD
          =================================================== */}

          <section className="pd-profile-card">
            <div className="pd-profile-main">
              <div className="pd-avatar">
                {getInitials(
                  party?.partyName,
                )}
              </div>

              <div className="pd-profile-info">
                <strong>
                  {party?.partyName ||
                    "Unnamed Party"}
                </strong>

                <span>
                  {party?.partyCode ||
                    "No party code"}
                </span>

                <small>
                  {party?.contact ||
                    "No contact number"}
                </small>
              </div>
            </div>

            <StatusBadge
              status={
                party?.status ||
                "active"
              }
              label={
                normalize(
                  party?.status,
                ) === "inactive"
                  ? "Inactive"
                  : "Active"
              }
            />
          </section>

          {/* ===================================================
              BALANCE BANNER
          =================================================== */}

          <section className="pd-balance-banner">
            <div>
              <span>
                CURRENT BALANCE
              </span>

              <strong>
                {formatCurrency(
                  account.due || 0,
                )}
              </strong>
            </div>

            <div
              className={`pd-balance-status ${balanceStatus}`}
            >
              {balanceStatus ===
              "due"
                ? "Outstanding"
                : balanceStatus ===
                  "advance"
                ? "Advance"
                : "Fully Paid"}
            </div>
          </section>

          {/* ===================================================
              METRICS GRID
          =================================================== */}

          <section className="pd-metrics-grid">
            <DetailMetric
              icon={
                <ReceiptText size={17} />
              }
              label="Total Billing"
              value={formatCurrency(
                account.billing,
              )}
            />

            <DetailMetric
              icon={
                <ArrowDownLeft
                  size={17}
                />
              }
              label="Received"
              value={formatCurrency(
                account.received,
              )}
            />

            <DetailMetric
              icon={
                <IndianRupee size={17} />
              }
              label="Outstanding"
              value={formatCurrency(
                account.due,
              )}
              className={
                account.due > 0
                  ? "is-due"
                  : ""
              }
            />

            <DetailMetric
              icon={
                <Activity size={17} />
              }
              label="Total Trips"
              value={
                account.partyTrips
                  .length
              }
            />
          </section>

          {/* ===================================================
              TRIP BREAKDOWN
          =================================================== */}

          <section className="pd-section">
            <div className="pd-section-heading">
              <div>
                <span>
                  TRIP BREAKDOWN
                </span>

                <h3>
                  Transport Activity
                </h3>
              </div>
            </div>

            <div className="pd-trip-grid">
              <div>
                <span>Loading</span>
                <strong>
                  {account.loading}
                </strong>
              </div>

              <div>
                <span>
                  Load + Unload
                </span>
                <strong>
                  {account.combined}
                </strong>
              </div>

              <div>
                <span>Unloading</span>
                <strong>
                  {account.unloading}
                </strong>
              </div>

              <div>
                <span>
                  Site to Site
                </span>
                <strong>
                  {account.siteToSite}
                </strong>
              </div>
            </div>
          </section>

          {/* ===================================================
              PARTY INFORMATION
          =================================================== */}

          <section className="pd-section">
            <div className="pd-section-heading">
              <div>
                <span>
                  PARTY INFORMATION
                </span>

                <h3>
                  Contact & Location
                </h3>
              </div>
            </div>

            <div className="pd-info-grid">
              <div className="pd-info-item">
                <Phone size={16} />

                <div>
                  <span>
                    Contact
                  </span>

                  <strong>
                    {party?.contact ||
                      "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="pd-info-item">
                <MapPin size={16} />

                <div>
                  <span>
                    Site
                  </span>

                  <strong>
                    {party?.siteInfo ||
                      "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="pd-info-item pd-info-full">
                <MapPin size={16} />

                <div>
                  <span>
                    Address
                  </span>

                  <strong>
                    {party?.address ||
                      "Not specified"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================
              PAYMENT INFORMATION
          =================================================== */}

          <section className="pd-section">
            <div className="pd-section-heading">
              <div>
                <span>
                  PAYMENT INFORMATION
                </span>

                <h3>
                  Payment Details
                </h3>
              </div>
            </div>

            <div className="pd-payment-card">
              <IndianRupee size={17} />

              <div>
                <span>
                  UPI / Payment Information
                </span>

                <strong>
                  {party?.paymentQr ||
                    "No payment information added"}
                </strong>
              </div>
            </div>

            {account.advance >
              0 && (
              <div className="pd-advance-note">
                <ArrowUpRight
                  size={16}
                />

                <span>
                  This account has an
                  advance of{" "}
                  <strong>
                    {formatCurrency(
                      account.advance,
                    )}
                  </strong>
                  .
                </span>
              </div>
            )}
          </section>

          {/* ===================================================
              DAILY ACTIVITY (Date-wise Filter)
          =================================================== */}

          <section className="pd-section pd-daily-section">
            <div className="pd-section-heading">
              <div>
                <span>
                  DAILY ACTIVITY
                </span>

                <h3>
                  Date Wise Activity
                </h3>
              </div>
            </div>

            <div className="pd-daily-controls">
              <button
                type="button"
                className={`pd-date-btn ${selectedDate === today ? 'active' : ''}`}
                onClick={setToday}
              >
                Today
              </button>
              <button
                type="button"
                className="pd-date-btn"
                onClick={setYesterday}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="pd-date-input"
                aria-label="Select date"
              />
            </div>

            <div className="pd-daily-summary">
              <div className="pd-daily-stat">
                <span>Trips</span>
                <strong>{dailyActivity.totalTrips}</strong>
              </div>
              <div className="pd-daily-stat">
                <span>Payments</span>
                <strong>{dailyActivity.totalPayments}</strong>
              </div>
              <div className="pd-daily-stat">
                <span>Billing</span>
                <strong>{formatCurrency(dailyActivity.totalBilling)}</strong>
              </div>
              <div className="pd-daily-stat pd-daily-received">
                <span>Received</span>
                <strong>{formatCurrency(dailyActivity.totalReceived)}</strong>
              </div>
            </div>

            {dailyActivity.dayActivity.length === 0 ? (
              <div className="pd-daily-empty">
                <Activity size={18} />
                <span>No activity on {formatDate(selectedDate)}</span>
              </div>
            ) : (
              <div className="pd-daily-list">
                {dailyActivity.dayActivity.map((item) => (
                  <div key={item.id} className="pd-daily-item">
                    <div className={`pd-daily-icon ${item.kind}`}>
                      {item.kind === "payment" ? (
                        <ArrowDownLeft size={14} />
                      ) : (
                        <ReceiptText size={14} />
                      )}
                    </div>
                    <div className="pd-daily-content">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                    <div className="pd-daily-actions">
                      {item.kind === "trip" && item.tripData && (
                        <button
                          type="button"
                          className="pd-daily-view-btn"
                          onClick={() => openTripView(item)}
                          title="View trip details"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <strong className={`pd-daily-amount ${item.kind === "payment" ? "received" : ""}`}>
                        {formatCurrency(item.amount)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===================================================
              ACCOUNT HISTORY
          =================================================== */}

          <section className="pd-section pd-history-section">
            <div className="pd-section-heading">
              <div>
                <span>
                  ACCOUNT ACTIVITY
                </span>

                <h3>
                  Recent History
                </h3>
              </div>

              <small>
                {account.activity.length}{" "}
                records
              </small>
            </div>

            {account.activity.length ===
            0 ? (
              <div className="pd-history-empty">
                <Activity size={19} />

                <span>
                  No trip or payment
                  history available.
                </span>
              </div>
            ) : (
              <div className="pd-history-list">
                {account.activity.slice(0, 15).map(
                  (item) => (
                    <div
                      className="pd-history-item"
                      key={item.id}
                    >
                      <div
                        className={`pd-history-icon ${item.kind}`}
                      >
                        {item.kind ===
                        "payment" ? (
                          <ArrowDownLeft
                            size={15}
                          />
                        ) : (
                          <ReceiptText
                            size={15}
                          />
                        )}
                      </div>

                      <div className="pd-history-content">
                        <strong>
                          {item.title}
                        </strong>

                        <span>
                          {item.description}
                        </span>

                        <small>
                          <CalendarDays
                            size={12}
                          />

                          {formatDate(
                            item.date,
                          )}
                        </small>
                      </div>

                      <div className="pd-history-actions">
                        {item.kind === "trip" && item.tripData && (
                          <button
                            type="button"
                            className="pd-history-view-btn"
                            onClick={() => openTripView(item)}
                            title="View trip details"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <strong
                          className={
                            item.kind ===
                            "payment"
                              ? "pd-history-amount received"
                              : "pd-history-amount"
                          }
                        >
                          {formatCurrency(
                            item.amount,
                          )}
                        </strong>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="pd-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={() =>
              onEdit?.(party)
            }
          >
            <Edit3 size={16} />
            Edit Party
          </Button>
        </footer>
      </aside>
    </div>
  );
}

export default PartyDetails;