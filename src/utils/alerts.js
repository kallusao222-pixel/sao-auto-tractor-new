/* =========================================================
   SAO AUTO TRACTOR — BUSINESS ALERTS
   Feeds the notification bell with real, useful reminders.
   Read-only. Never writes. Never touches storage keys.
   ========================================================= */

import { calculatePartySummary } from "./calculations";

/* ---------------------------------------------------------
   CONFIG
   --------------------------------------------------------- */

const OUTSTANDING_THRESHOLD = 50000;  // ₹50,000
const MAX_OUTSTANDING_ALERTS = 5;
const MAX_IDLE_ALERTS = 3;
const BACKUP_REMINDER_DAYS = 7;
const BACKUP_META_KEY = "saoAutoTractorLastBackup";

/* ---------------------------------------------------------
   HELPERS (same behaviour as Dashboard.jsx)
   --------------------------------------------------------- */

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function getVehicleNumber(tractor) {
  return (
    tractor?.vehicleNumber ||
    tractor?.tractorNumber ||
    tractor?.vehicleNo ||
    tractor?.number ||
    "Unknown"
  );
}

function getTripVehicleNumber(trip) {
  return trip?.vehicleNumber || trip?.tractorNumber || trip?.vehicleNo || "";
}

function isActive(item) {
  const status = String(item?.status || "").toLowerCase();
  return status !== "inactive";
}

function getTodayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   BACKUP REMINDER
   --------------------------------------------------------- */

function getBackupReminder() {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);

    if (!raw) {
      return {
        id: "backup-never",
        title: "Backup reminder",
        message:
          "Aapne abhi tak koi backup nahi liya. Settings → Backup & Data se backup banayein.",
        severity: "low",
        action: "settings",
        label: "Data safety",
      };
    }

    const parsed = JSON.parse(raw);
    const createdAt = parsed?.createdAt;
    if (!createdAt) return null;

    const diffMs = Date.now() - new Date(createdAt).getTime();
    if (!Number.isFinite(diffMs)) return null;

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= BACKUP_REMINDER_DAYS) {
      return {
        id: "backup-old",
        title: "Backup reminder",
        message: `Last backup ${diffDays} din pehle liya tha. Naya backup banayein.`,
        severity: "low",
        action: "settings",
        label: "Data safety",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------
   MAIN BUILDER
   --------------------------------------------------------- */

export function buildAlerts({
  trips = [],
  parties = [],
  payments = [],
  tractors = [],
} = {}) {
  const alerts = [];
  const today = getTodayISO();

  const safeTrips = Array.isArray(trips) ? trips : [];
  const safeParties = Array.isArray(parties) ? parties : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeTractors = Array.isArray(tractors) ? tractors : [];

  /* =========================================================
     1. HIGH — Outstanding parties ( > ₹50,000 )
     ========================================================= */

  const outstandingParties = safeParties
    .map((party) =>
      calculatePartySummary(
        party?.partyName || party?.name || "",
        safeTrips,
        safePayments
      )
    )
    .filter(
      (party) => Number(party?.outstanding || 0) > OUTSTANDING_THRESHOLD
    )
    .sort(
      (a, b) => Number(b?.outstanding || 0) - Number(a?.outstanding || 0)
    );

  outstandingParties.slice(0, MAX_OUTSTANDING_ALERTS).forEach((party) => {
    const amount = Number(party.outstanding || 0);

    alerts.push({
      id: `due-${party.partyName}`,
      title: party.partyName,
      message: `₹${amount.toLocaleString("en-IN")} outstanding hai — payment follow-up karein.`,
      severity: "high",
      action: "outstanding",
      label: "Payment due",
    });
  });

  /* =========================================================
     2. MEDIUM — Idle tractors (no trip today)
     ========================================================= */

  const todayTrips = safeTrips.filter((trip) => trip?.date === today);

  const todayVehicleNames = new Set(
    todayTrips
      .map(getTripVehicleNumber)
      .map(normalizeName)
      .filter(Boolean)
  );

  const activeTractors = safeTractors.filter(isActive);

  const idleTractors = activeTractors.filter((tractor) => {
    const vehicle = normalizeName(getVehicleNumber(tractor));
    return vehicle && !todayVehicleNames.has(vehicle);
  });

  idleTractors.slice(0, MAX_IDLE_ALERTS).forEach((tractor) => {
    const vehicle = getVehicleNumber(tractor);

    alerts.push({
      id: `idle-${vehicle}`,
      title: vehicle,
      message: "Aaj koi trip nahi hai — fleet availability check karein.",
      severity: "medium",
      action: "tractors",
      label: "Idle fleet",
    });
  });

  /* =========================================================
     3. LOW — Backup reminder
     ========================================================= */

  const backupAlert = getBackupReminder();
  if (backupAlert) alerts.push(backupAlert);

  return alerts;
}