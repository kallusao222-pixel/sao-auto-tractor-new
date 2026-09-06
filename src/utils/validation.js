export function isRequired(value) {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
}

export function isValidMobile(
  value,
) {
  const mobile = String(
    value || "",
  )
    .replace(/\s+/g, "")
    .trim();

  return /^[6-9]\d{9}$/.test(
    mobile,
  );
}

export function isValidNumber(
  value,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  const number = Number(value);

  return Number.isFinite(number);
}

export function isPositiveNumber(
  value,
) {
  if (!isValidNumber(value)) {
    return false;
  }

  return Number(value) > 0;
}

export function normalizeText(
  value,
) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeMobile(
  value,
) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export function normalizeNumber(
  value,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(
    String(value).replace(/,/g, ""),
  );

  return Number.isFinite(number)
    ? number
    : 0;
}