export function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number =
    typeof value === "number"
      ? value
      : Number(
          String(value)
            .replace(/,/g, "")
            .replace(/[₹$€£]/g, "")
            .trim(),
        );

  return Number.isFinite(number)
    ? number
    : 0;
}

export function formatNumber(
  value,
  decimalPlaces = 2,
) {
  const number = toNumber(value);

  return number.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        decimalPlaces,
      maximumFractionDigits:
        decimalPlaces,
    },
  );
}

export function formatCurrency(
  value,
  currency = "INR",
  decimalPlaces = 2,
) {
  const number = toNumber(value);

  try {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency,
        minimumFractionDigits:
          decimalPlaces,
        maximumFractionDigits:
          decimalPlaces,
      },
    ).format(number);
  } catch (error) {
    return `₹${formatNumber(
      number,
      decimalPlaces,
    )}`;
  }
}