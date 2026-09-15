/* =========================================================
   BACKUP / RESTORE
   Pure logic — no React, no UI
   Safe for existing data. Never touches unknown keys.
   ========================================================= */

import { STORAGE_KEYS } from "../data/storageKeys";
import { readStorage, writeStorage } from "../data/storage";
import { emitDataChange } from "../data/dataEvents";

export const BACKUP_APP_ID = "sao-auto-tractor";
export const BACKUP_VERSION = 1;
export const BACKUP_META_KEY = "saoAutoTractorLastBackupAt";

/* ---------- Build ---------- */

export function buildBackup() {
  const data = {};

  Object.values(STORAGE_KEYS).forEach((key) => {
    const value = readStorage(key, null);
    // null = key hi nahi thi (missing) — restore mein skip karenge
    data[key] = value;
  });

  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: getBackupCounts(data),
    data,
  };
}

function getBackupCounts(data) {
  const counts = {};
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) counts[key] = value.length;
    else if (value && typeof value === "object") counts[key] = "object";
  });
  return counts;
}

/* ---------- Download ---------- */

export function downloadBackup() {
  const backup = buildBackup();

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-");

  a.href = url;
  a.download = `sao-auto-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  try {
    localStorage.setItem(BACKUP_META_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }

  return backup;
}

/* ---------- Validate ---------- */

export function validateBackup(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("File padhi nahi ja saki. JSON format check karein.");
  }
  if (raw.app !== BACKUP_APP_ID) {
    throw new Error("Ye SAO Auto Tractor ka backup file nahi hai.");
  }
  if (!raw.data || typeof raw.data !== "object") {
    throw new Error("Backup file mein data missing hai.");
  }

  // Sirf known keys accept karo — kuch bhi unknown skip
  const clean = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key in raw.data && raw.data[key] !== null) {
      clean[key] = raw.data[key];
    }
  });

  if (Object.keys(clean).length === 0) {
    throw new Error("Backup file khali hai ya corrupt hai.");
  }

  return {
    clean,
    meta: {
      version: raw.version || 0,
      exportedAt: raw.exportedAt || null,
    },
  };
}

/* ---------- Restore ---------- */

export function restoreBackup(cleanData) {
  // Safety: current data ka snapshot (undo ke liye)
  const snapshot = buildBackup();

  // Snapshot bhi download kar lo — worst case ke liye
  downloadSnapshotFile(snapshot);

  // Write karo
  const results = [];
  Object.entries(cleanData).forEach(([key, value]) => {
    const ok = writeStorage(key, value);
    results.push({ key, ok });
  });

  // Sab pages ko refresh karo
  emitDataChange({ source: "backup-restore", keys: Object.keys(cleanData) });

  const failed = results.filter((r) => !r.ok);
  return { snapshot, failed };
}

export function restoreFromSnapshot(snapshot) {
  if (!snapshot?.data) {
    throw new Error("Snapshot invalid hai.");
  }

  Object.entries(snapshot.data).forEach(([key, value]) => {
    if (value === null) return;
    writeStorage(key, value);
  });

  emitDataChange({ source: "backup-undo" });
}

function downloadSnapshotFile(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-");
  a.href = url;
  a.download = `sao-auto-PRE-RESTORE-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Helpers ---------- */

export function getLastBackupAt() {
  try {
    return localStorage.getItem(BACKUP_META_KEY);
  } catch {
    return null;
  }
}

export function summarizeBackup(backup) {
  // { trips: 45, parties: 12, ... } — UI preview ke liye
  const summary = {};
  Object.entries(backup?.counts || {}).forEach(([key, count]) => {
    const short = key.replace("saoAutoTractor", "");
    summary[short] = count;
  });
  return summary;
}