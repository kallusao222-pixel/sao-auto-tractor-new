export function matchesSearch(
  item,
  searchTerm,
  fields = [],
) {
  const search = String(
    searchTerm || "",
  )
    .trim()
    .toLowerCase();

  if (!search) {
    return true;
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    return Object.values(item || {}).some(
      (value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
    );
  }

  return fields.some((field) =>
    String(item?.[field] || "")
      .toLowerCase()
      .includes(search),
  );
}

export function matchesValue(
  item,
  field,
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  return String(item?.[field] || "")
    .trim()
    .toLowerCase() ===
    String(value)
      .trim()
      .toLowerCase();
}

export function matchesDateRange(
  item,
  field,
  startDate,
  endDate,
) {
  const itemDate = String(
    item?.[field] || "",
  ).slice(0, 10);

  if (!itemDate) {
    return false;
  }

  if (
    startDate &&
    itemDate < startDate
  ) {
    return false;
  }

  if (
    endDate &&
    itemDate > endDate
  ) {
    return false;
  }

  return true;
}

export function filterItems(
  items = [],
  {
    search = "",
    searchFields = [],
    filters = {},
    dateField = "",
    startDate = "",
    endDate = "",
  } = {},
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => {
    if (
      !matchesSearch(
        item,
        search,
        searchFields,
      )
    ) {
      return false;
    }

    for (const [
      field,
      value,
    ] of Object.entries(filters)) {
      if (
        !matchesValue(
          item,
          field,
          value,
        )
      ) {
        return false;
      }
    }

    if (dateField) {
      if (
        !matchesDateRange(
          item,
          dateField,
          startDate,
          endDate,
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

export function sortItems(
  items = [],
  field,
  direction = "asc",
) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (!field) {
    return [...items];
  }

  const multiplier =
    direction === "desc"
      ? -1
      : 1;

  return [...items].sort(
    (a, b) => {
      const first = a?.[field];
      const second = b?.[field];

      if (
        first === null ||
        first === undefined
      ) {
        return 1;
      }

      if (
        second === null ||
        second === undefined
      ) {
        return -1;
      }

      const firstNumber =
        Number(first);
      const secondNumber =
        Number(second);

      if (
        Number.isFinite(firstNumber) &&
        Number.isFinite(secondNumber)
      ) {
        return (
          (firstNumber -
            secondNumber) *
          multiplier
        );
      }

      return String(first)
        .localeCompare(
          String(second),
          "en",
          {
            numeric: true,
            sensitivity: "base",
          },
        ) * multiplier;
    },
  );
}