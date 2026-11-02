import { STORAGE_KEYS } from "./storageKeys";

export const LOCAL_BACKUP_SCHEMA_VERSION = 1;

const ARRAY_FIELDS = [
  ["trips", STORAGE_KEYS.trips],
  ["payments", STORAGE_KEYS.payments],
  ["parties", STORAGE_KEYS.parties],
  ["tractors", STORAGE_KEYS.tractors],
  ["materials", STORAGE_KEYS.materials],
  ["expenses", STORAGE_KEYS.expenses],
  ["staff", STORAGE_KEYS.staff],
  ["invoices", STORAGE_KEYS.invoices],
  ["tripTemplates", STORAGE_KEYS.tripTemplates],
  ["tractorMaintenance", STORAGE_KEYS.tractorMaintenance],
];

const OBJECT_FIELDS = [
  ["staffAttendance", STORAGE_KEYS.staffAttendance],
  ["staffSalaryPayments", STORAGE_KEYS.staffSalaryPayments],
  ["businessDetails", STORAGE_KEYS.businessDetails],
  ["tripEntryPreferences", STORAGE_KEYS.tripEntryPreferences],
];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validateLocalWorkspaceBackup(backup) {
  if (!isPlainObject(backup) || backup.application !== "SAO AUTO TRACTOR") {
    throw new Error("This file is not a SAO AUTO TRACTOR backup.");
  }

  const schemaVersion = backup.schemaVersion ?? 1;
  if (schemaVersion !== LOCAL_BACKUP_SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version: ${schemaVersion}.`);
  }
  if (!isPlainObject(backup.data)) {
    throw new Error("Backup data is missing or invalid.");
  }
  if (backup.createdAt && Number.isNaN(Date.parse(backup.createdAt))) {
    throw new Error("Backup creation date is invalid.");
  }
  if (backup.settings !== undefined && !isPlainObject(backup.settings)) {
    throw new Error("Backup settings must be a valid object.");
  }

  const hasSupportedData =
    backup.settings !== undefined ||
    ARRAY_FIELDS.some(([field]) => Object.hasOwn(backup.data, field)) ||
    OBJECT_FIELDS.some(([field]) => Object.hasOwn(backup.data, field)) ||
    Object.hasOwn(backup.data, "invoiceNumber") ||
    Object.hasOwn(backup.data, "preferredTripTractor");
  if (!hasSupportedData) throw new Error("Backup contains no supported data.");

  for (const [field] of ARRAY_FIELDS) {
    if (Object.hasOwn(backup.data, field) && !Array.isArray(backup.data[field])) {
      throw new Error(`Backup section “${field}” must be an array.`);
    }
  }

  for (const [field] of OBJECT_FIELDS) {
    const allowLegacySalaryArray = field === "staffSalaryPayments" && Array.isArray(backup.data[field]);
    if (Object.hasOwn(backup.data, field) && !isPlainObject(backup.data[field]) && !allowLegacySalaryArray) {
      throw new Error(`Backup section “${field}” must be an object.`);
    }
  }

  if (
    Object.hasOwn(backup.data, "invoiceNumber") &&
    backup.data.invoiceNumber !== null &&
    !["string", "number"].includes(typeof backup.data.invoiceNumber)
  ) {
    throw new Error("Backup invoice number must be text, a number, or empty.");
  }
  if (
    Object.hasOwn(backup.data, "preferredTripTractor") &&
    backup.data.preferredTripTractor !== null &&
    typeof backup.data.preferredTripTractor !== "string"
  ) {
    throw new Error("Backup preferred tractor must be text or empty.");
  }

  return { ...backup, schemaVersion };
}

export function getLocalWorkspaceBackupCounts(backup) {
  const data = backup?.data || {};
  const counts = {};

  for (const [field] of ARRAY_FIELDS) {
    if (Object.hasOwn(data, field)) counts[field] = data[field].length;
  }
  if (Object.hasOwn(data, "staffAttendance")) {
    const attendance = data.staffAttendance;
    counts.staffAttendance = Object.values(attendance).reduce((sum, week) =>
      sum + Object.values(week || {}).reduce((weekSum, staffDays) =>
        weekSum + Object.values(staffDays || {}).filter(Boolean).length, 0), 0);
  }
  if (Object.hasOwn(data, "staffSalaryPayments")) {
    const salary = data.staffSalaryPayments;
    counts.staffSalaryPayments = Array.isArray(salary)
      ? salary.length
      : Object.values(salary).reduce((sum, week) => sum + Object.keys(week || {}).length, 0);
  }
  if (Object.hasOwn(data, "businessDetails")) counts.businessDetails = Object.keys(data.businessDetails).length;
  if (Object.hasOwn(data, "tripEntryPreferences")) counts.tripEntryPreferences = Object.keys(data.tripEntryPreferences).length;
  if (Object.hasOwn(data, "invoiceNumber")) counts.invoiceNumber = data.invoiceNumber ? "Included" : "Not set";
  if (Object.hasOwn(data, "preferredTripTractor")) counts.preferredTripTractor = data.preferredTripTractor ? "Included" : "Not set";
  if (backup?.settings !== undefined) counts.settings = "Included";

  return counts;
}

export function restoreLocalWorkspaceBackup(backup, { defaultSettings, beforeRestore } = {}) {
  const validated = validateLocalWorkspaceBackup(backup);
  if (typeof beforeRestore !== "function") {
    throw new Error("Create a recovery copy before restoring a backup.");
  }
  beforeRestore();

  const entries = [];
  if (validated.settings !== undefined) {
    entries.push([
      STORAGE_KEYS.settings,
      JSON.stringify({ ...defaultSettings, ...validated.settings }),
    ]);
  }

  for (const [field, storageKey] of ARRAY_FIELDS) {
    if (Object.hasOwn(validated.data, field)) {
      entries.push([storageKey, JSON.stringify(validated.data[field])]);
    }
  }
  for (const [field, storageKey] of OBJECT_FIELDS) {
    if (Object.hasOwn(validated.data, field)) {
      entries.push([storageKey, JSON.stringify(validated.data[field])]);
    }
  }
  if (Object.hasOwn(validated.data, "invoiceNumber")) {
    entries.push([
      STORAGE_KEYS.invoiceNumber,
      validated.data.invoiceNumber === null ? null : String(validated.data.invoiceNumber),
    ]);
  }
  if (Object.hasOwn(validated.data, "preferredTripTractor")) {
    entries.push([
      STORAGE_KEYS.preferredTripTractor,
      validated.data.preferredTripTractor || null,
    ]);
  }

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
      throw new Error(`Restore failed and browser rollback was incomplete. Keep the pre-restore recovery file. ${cause.message}`);
    }
    throw new Error(`Restore failed. Previous browser data was restored. ${cause.message}`);
  }

  return entries.map(([key]) => key);
}
