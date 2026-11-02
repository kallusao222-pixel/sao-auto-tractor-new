export function getTodayISO() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isValidDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(
    date.getTime(),
  );
}

function readDatePreferences() {
  try {
    const preferences = JSON.parse(
      localStorage.getItem("saoAutoTractorSettings") || "{}",
    );
    return preferences && typeof preferences === "object"
      ? preferences
      : {};
  } catch {
    return {};
  }
}

function parseLocalDate(value) {
  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      );
    }
  }
  return new Date(value);
}

export function formatDate(
  value,
  options = {},
) {
  if (!value) {
    return "—";
  }

  const date = parseLocalDate(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  const preferences = readDatePreferences();
  const dateFormat = preferences.dateFormat || "DD-MM-YYYY";
  const {
    day = "2-digit",
    month = "2-digit",
    year = "numeric",
  } = options;

  if (day === "2-digit" && month === "2-digit" && year === "numeric") {
    const parts = {
      day: String(date.getDate()).padStart(2, "0"),
      month: String(date.getMonth() + 1).padStart(2, "0"),
      year: String(date.getFullYear()),
    };
    const formats = {
      "DD-MM-YYYY": `${parts.day}-${parts.month}-${parts.year}`,
      "DD/MM/YYYY": `${parts.day}/${parts.month}/${parts.year}`,
      "YYYY-MM-DD": `${parts.year}-${parts.month}-${parts.day}`,
      "MM-DD-YYYY": `${parts.month}-${parts.day}-${parts.year}`,
    };
    return formats[dateFormat] || formats["DD-MM-YYYY"];
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day,
      month,
      year,
    },
  ).format(date);
}

export function formatDateTime(
  value,
) {
  if (!value) {
    return "—";
  }

  const date = parseLocalDate(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  const timeFormat = readDatePreferences().timeFormat || "12 Hour";
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat !== "24 Hour",
    },
  ).format(date);
}
