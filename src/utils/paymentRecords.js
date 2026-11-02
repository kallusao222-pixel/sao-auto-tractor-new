export function isPaymentReversed(payment) {
  const status = String(payment?.status || "").trim().toLowerCase();
  return status === "reversed" || Boolean(payment?.reversedAt || payment?.voidedAt);
}

export function getActivePaymentAmount(payment) {
  if (isPaymentReversed(payment)) return 0;
  const amount = Number(
    payment?.amount ??
      payment?.paymentAmount ??
      payment?.receivedAmount ??
      payment?.paidAmount ??
      0,
  );
  return Number.isFinite(amount) ? amount : 0;
}

export function hasDuplicatePaymentReference(payments, partyName, reference, excludeId = null) {
  const targetReference = String(reference || "").trim().toLowerCase();
  const targetParty = String(partyName || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!targetReference || !targetParty || !Array.isArray(payments)) return false;

  return payments.some((payment) => {
    if (isPaymentReversed(payment) || payment?.id === excludeId) return false;
    const currentReference = String(
      payment?.reference ?? payment?.referenceNo ?? payment?.transactionId ?? payment?.utr ?? payment?.transactionReference ?? "",
    ).trim().toLowerCase();
    const currentParty = String(
      payment?.partyName ?? payment?.party ?? payment?.customerName ?? payment?.customer ?? "",
    ).trim().replace(/\s+/g, " ").toLowerCase();
    return currentReference === targetReference && currentParty === targetParty;
  });
}
