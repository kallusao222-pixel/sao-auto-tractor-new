export const SAO_UPI_VPA = "kallusao218@okaxis";
export const SAO_UPI_PAYEE = "SAO AUTO TRACTOR";

export function buildUpiQrUrl(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "";

  const upiUri = [
    `pa=${encodeURIComponent(SAO_UPI_VPA)}`,
    `pn=${encodeURIComponent(SAO_UPI_PAYEE)}`,
    `am=${value.toFixed(2)}`,
    "cu=INR",
  ].join("&");

  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`upi://pay?${upiUri}`)}&size=400x400&margin=10`;
}
