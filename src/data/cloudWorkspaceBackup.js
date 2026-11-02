import { STORAGE_KEYS } from "./storageKeys";
import { emitDataChange } from "./dataEvents";

export const CLOUD_WORKSPACE_SCHEMA_VERSION = 1;

export const CLOUD_WORKSPACE_KEYS = Object.freeze([
  STORAGE_KEYS.tractors,
  STORAGE_KEYS.parties,
  STORAGE_KEYS.materials,
  STORAGE_KEYS.trips,
  STORAGE_KEYS.payments,
  STORAGE_KEYS.staff,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.expenses,
  STORAGE_KEYS.invoices,
  STORAGE_KEYS.invoiceNumber,
  STORAGE_KEYS.businessDetails,
  STORAGE_KEYS.staffAttendance,
  STORAGE_KEYS.staffSalaryPayments,
  STORAGE_KEYS.tripTemplates,
  STORAGE_KEYS.tripEntryPreferences,
  STORAGE_KEYS.preferredTripTractor,
  STORAGE_KEYS.tractorMaintenance,
]);

const ARRAY_KEYS = new Set([
  STORAGE_KEYS.tractors,
  STORAGE_KEYS.parties,
  STORAGE_KEYS.materials,
  STORAGE_KEYS.trips,
  STORAGE_KEYS.payments,
  STORAGE_KEYS.staff,
  STORAGE_KEYS.expenses,
  STORAGE_KEYS.invoices,
  STORAGE_KEYS.tripTemplates,
  STORAGE_KEYS.tractorMaintenance,
]);

const OBJECT_KEYS = new Set([
  STORAGE_KEYS.settings,
  STORAGE_KEYS.businessDetails,
  STORAGE_KEYS.staffAttendance,
  STORAGE_KEYS.staffSalaryPayments,
  STORAGE_KEYS.tripEntryPreferences,
]);

function readJson(key) {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function buildCloudWorkspaceSnapshot() {
  const payload = {};
  for (const key of CLOUD_WORKSPACE_KEYS) payload[key] = readJson(key);
  return {
    application: "sao-auto-tractor",
    schemaVersion: CLOUD_WORKSPACE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    payload,
  };
}

export function getCloudWorkspaceCounts(payload) {
  return CLOUD_WORKSPACE_KEYS.reduce((counts, key) => {
    const value = payload?.[key];
    counts[key] = Array.isArray(value)
      ? value.length
      : isPlainObject(value) || typeof value === "string" || typeof value === "number"
        ? 1
        : 0;
    return counts;
  }, {});
}

export function validateCloudWorkspaceSnapshot(snapshot) {
  if (!isPlainObject(snapshot) || snapshot.application !== "sao-auto-tractor") {
    throw new Error("This cloud backup does not belong to SAO Auto Tractor.");
  }
  if (snapshot.schemaVersion !== CLOUD_WORKSPACE_SCHEMA_VERSION) {
    throw new Error("This cloud backup uses an unsupported version.");
  }
  if (!isPlainObject(snapshot.payload)) throw new Error("Cloud backup data is invalid.");

  const clean = {};
  for (const key of CLOUD_WORKSPACE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(snapshot.payload, key)) continue;
    const value = snapshot.payload[key];
    if (value === null) {
      clean[key] = null;
    } else if (ARRAY_KEYS.has(key) && Array.isArray(value)) {
      clean[key] = value;
    } else if (
      OBJECT_KEYS.has(key) &&
      (isPlainObject(value) || (key === STORAGE_KEYS.staffSalaryPayments && Array.isArray(value)))
    ) {
      clean[key] = value;
    } else if (key === STORAGE_KEYS.invoiceNumber && ["string", "number"].includes(typeof value)) {
      clean[key] = value;
    } else if (key === STORAGE_KEYS.preferredTripTractor && typeof value === "string") {
      clean[key] = value;
    } else {
      throw new Error(`Cloud backup contains invalid data for ${key}.`);
    }
  }
  if (Object.keys(clean).length === 0) throw new Error("Cloud backup has no supported data.");
  return { ...snapshot, payload: clean };
}

function downloadSafetySnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `SAO-AUTO-TRACTOR-PRE-CLOUD-RESTORE-${new Date()
    .toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function restoreCloudWorkspaceSnapshot(snapshot) {
  const clean = validateCloudWorkspaceSnapshot(snapshot);
  const safetySnapshot = buildCloudWorkspaceSnapshot();
  downloadSafetySnapshot(safetySnapshot);

  const entries = Object.entries(clean.payload).map(([key, value]) => [
    key,
    value === null
      ? null
      : key === STORAGE_KEYS.invoiceNumber
        ? String(value)
        : JSON.stringify(value),
  ]);
  const previousValues = entries.map(([key]) => [key, localStorage.getItem(key)]);

  try {
    for (const [key, value] of entries) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  } catch (cause) {
    let rollbackError = null;
    try {
      for (const [key] of previousValues) localStorage.removeItem(key);
      for (const [key, value] of previousValues) {
        if (value !== null) localStorage.setItem(key, value);
      }
    } catch (error) {
      rollbackError = error;
    }
    if (rollbackError) {
      throw new Error(`Cloud restore failed and browser rollback was incomplete. Keep the pre-restore recovery file. ${cause.message}`);
    }
    throw new Error(`Cloud restore failed. Previous browser data was restored. ${cause.message}`);
  }
  emitDataChange({ source: "cloud-backup-restore", keys: Object.keys(clean.payload) });
  return safetySnapshot;
}
