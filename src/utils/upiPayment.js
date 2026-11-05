export const SAO_UPI_VPA = "kallusao218@okaxis";
export const SAO_UPI_PAYEE = "Kallu Sao";

export function buildUpiPaymentUri(amount, payeeName = SAO_UPI_PAYEE) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "";

  const upiUri = [
    `pa=${encodeURIComponent(SAO_UPI_VPA)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${value.toFixed(2)}`,
    "cu=INR",
  ].join("&");

  return `upi://pay?${upiUri}`;
}

export function buildUpiQrUrl(amount, payeeName = SAO_UPI_PAYEE) {
  const paymentUri = buildUpiPaymentUri(amount, payeeName);
  if (!paymentUri) return "";

  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentUri)}&size=400x400&margin=10`;
}
