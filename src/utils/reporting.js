export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeReportDate(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const dayFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return getLocalDateKey(parsed);
}

export function getReportTripDate(trip) {
  return normalizeReportDate(
    trip?.date ?? trip?.tripDate ?? trip?.createdAt ?? trip?.createdDate ?? "",
  );
}

export function getReportQuantity(trip) {
  const value = Number(
    trip?.quantity ?? trip?.qty ?? trip?.loadQuantity ?? trip?.tripQuantity ?? trip?.quantityValue ?? 0,
  );
  return Number.isFinite(value) ? value : 0;
}

export function getReportRate(trip) {
  const value = Number(
    trip?.rate ?? trip?.price ?? trip?.tripRate ?? trip?.amountPerTrip ?? 0,
  );
  return Number.isFinite(value) ? value : 0;
}

export function getReportAmount(trip) {
  const direct = trip?.amount ?? trip?.totalAmount ?? trip?.billingAmount ?? trip?.total;
  if (direct !== undefined && direct !== null && direct !== "" && Number.isFinite(Number(direct))) {
    return Number(direct);
  }
  return getReportQuantity(trip) * getReportRate(trip);
}

export function isReportDateInRange(value, fromDate = "", toDate = "") {
  const date = normalizeReportDate(value);
  if ((fromDate || toDate) && !date) return false;
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
}

export function getReportDateRange(preset, referenceDate = new Date()) {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const end = getLocalDateKey(today);

  if (preset === "today") return [end, end];
  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const value = getLocalDateKey(yesterday);
    return [value, value];
  }
  if (preset === "week" || preset === "thisWeek") {
    const start = new Date(today);
    const dayFromMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayFromMonday);
    return [getLocalDateKey(start), end];
  }
  if (preset === "month" || preset === "thisMonth") {
    return [`${end.slice(0, 7)}-01`, end];
  }
  return ["", ""];
}

export const REPORT_PRESETS_KEY = "saoAutoTractorReportPresets";

export function readReportPresets(scope) {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_PRESETS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((preset) => preset?.scope === scope) : [];
  } catch {
    return [];
  }
}

export function writeReportPreset(preset) {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_PRESETS_KEY) || "[]");
    const presets = Array.isArray(parsed) ? parsed : [];
    localStorage.setItem(REPORT_PRESETS_KEY, JSON.stringify([...presets, preset]));
    return true;
  } catch {
    return false;
  }
}

export function removeReportPreset(id) {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_PRESETS_KEY) || "[]");
    const presets = Array.isArray(parsed) ? parsed : [];
    localStorage.setItem(REPORT_PRESETS_KEY, JSON.stringify(presets.filter((preset) => preset?.id !== id)));
    return true;
  } catch {
    return false;
  }
}
