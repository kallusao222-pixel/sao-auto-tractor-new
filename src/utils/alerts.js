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
  staff = [],
} = {}) {
  const alerts = [];
  const today = getTodayISO();

  const safeTrips = Array.isArray(trips) ? trips : [];
  const safeParties = Array.isArray(parties) ? parties : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeTractors = Array.isArray(tractors) ? tractors : [];
  const safeStaff = Array.isArray(staff) ? staff : [];
  let preferences = {};
  try { preferences = JSON.parse(localStorage.getItem("saoAutoTractorSettings") || "{}"); } catch { preferences = {}; }
  if (preferences.notifications === false) return alerts;

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

  (preferences.dueAlerts === false ? [] : outstandingParties.slice(0, MAX_OUTSTANDING_ALERTS)).forEach((party) => {
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

  (preferences.tripAlerts === false ? [] : idleTractors.slice(0, MAX_IDLE_ALERTS)).forEach((tractor) => {
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

  if (preferences.maintenanceAlerts !== false) {
    const dateFields = [["insuranceExpiryDate", "Insurance"], ["registrationExpiryDate", "Registration"], ["fitnessExpiryDate", "Fitness certificate"], ["pucExpiryDate", "PUC"], ["nextServiceDate", "Service"]];
    const daysLeft = (value) => {
      if (!value) return null;
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return null;
      const current = new Date(); current.setHours(0, 0, 0, 0);
      const days = Math.ceil((date - current) / 86400000);
      return days <= 30 ? days : null;
    };
    safeTractors.forEach((tractor) => dateFields.forEach(([field, label]) => {
      const days = daysLeft(tractor?.[field]);
      if (days === null) return;
      const vehicle = getVehicleNumber(tractor);
      alerts.push({ id: `fleet-date-${vehicle}-${field}`, title: `${vehicle} · ${label}`, message: days < 0 ? `Overdue by ${Math.abs(days)} days — update fleet record.` : days === 0 ? "Due today — review fleet record." : `Due in ${days} days — review fleet record.`, severity: days <= 7 ? "high" : "medium", action: "tractors", label: `${label} reminder` });
    }));
    safeStaff.filter((person) => person?.driverLicenseNumber).forEach((person) => {
      const days = daysLeft(person?.licenseExpiryDate);
      if (days === null) return;
      alerts.push({ id: `license-${person.id}`, title: `${person.name} · Driver licence`, message: days < 0 ? `Expired ${Math.abs(days)} days ago — update staff details.` : days === 0 ? "Expires today — review staff details." : `Expires in ${days} days — review staff details.`, severity: days <= 7 ? "high" : "medium", action: "staff", label: "Driver licence" });
    });
  }

  /* =========================================================
     3. LOW — Backup reminder
     ========================================================= */

  const backupAlert = preferences.backupReminder === false ? null : getBackupReminder();
  if (backupAlert) alerts.push(backupAlert);

  return alerts;
}
