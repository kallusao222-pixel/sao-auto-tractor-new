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
  let configuredDecimals = decimalPlaces;
  let currencyCode = currency === "₹" ? "INR" : currency;

  try {
    const settings = JSON.parse(
      localStorage.getItem("saoAutoTractorSettings") || "{}",
    );
    if (
      settings.decimalPlaces !== null &&
      settings.decimalPlaces !== "" &&
      [0, 1, 2].includes(Number(settings.decimalPlaces))
    ) {
      configuredDecimals = Number(settings.decimalPlaces);
    }
    // This workspace is configured for Indian Rupees throughout the app.
    currencyCode = "INR";
  } catch {
    // Keep the formatter usable when browser storage is unavailable.
  }

  try {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits:
          configuredDecimals,
        maximumFractionDigits:
          configuredDecimals,
      },
    ).format(number);
  } catch (error) {
    return `₹${formatNumber(
      number,
      configuredDecimals,
    )}`;
  }
}
