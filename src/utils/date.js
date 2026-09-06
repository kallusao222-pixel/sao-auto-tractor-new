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

export function formatDate(
  value,
  options = {},
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  const {
    day = "2-digit",
    month = "2-digit",
    year = "numeric",
  } = options;

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

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}