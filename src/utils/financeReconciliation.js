import { getActivePaymentAmount, isPaymentReversed } from "./paymentRecords";

const normalizeName = (value) =>
  String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const getId = (record) => String(record?.id ?? record?._id ?? "").trim();

export function getPaymentAllocations(payment) {
  return Array.isArray(payment?.allocations)
    ? payment.allocations.filter((allocation) => allocation && typeof allocation === "object")
    : [];
}

export function getPaymentUnallocatedAmount(payment) {
  if (isPaymentReversed(payment)) return 0;
  const allocated = getPaymentAllocations(payment).reduce(
    (sum, allocation) => sum + Math.max(0, Number(allocation?.amount) || 0),
    0,
  );
  return Math.max(0, Math.round((getActivePaymentAmount(payment) - allocated) * 100) / 100);
}

export function getInvoiceAllocatedAmount(invoice, payments = []) {
  const invoiceId = getId(invoice);
  const invoiceNumber = String(invoice?.invoiceNumber || "").trim().toLowerCase();
  if (!invoiceId && !invoiceNumber) return 0;

  const partyKey = normalizeName(invoice?.partyName);
  const total = (Array.isArray(payments) ? payments : []).reduce((sum, payment) => {
    if (isPaymentReversed(payment) || normalizeName(payment?.partyName ?? payment?.party) !== partyKey) {
      return sum;
    }

    const allocationTotal = getPaymentAllocations(payment).reduce((allocationSum, allocation) => {
      const matchesInvoice = invoiceId
        ? String(allocation?.invoiceId || "") === invoiceId
        : String(allocation?.invoiceNumber || "").trim().toLowerCase() === invoiceNumber;
      if (!matchesInvoice) return allocationSum;

      const amount = Math.max(0, Number(allocation?.amount) || 0);
      const activeReceiptAmount = getActivePaymentAmount(payment);
      const priorAllocatedAmount = allocationSum;
      const remainingActiveReceiptAmount = Math.max(0, activeReceiptAmount - priorAllocatedAmount);
      return allocationSum + Math.min(amount, remainingActiveReceiptAmount);
    }, 0);
    return sum + allocationTotal;
  }, 0);

  return Math.round(total * 100) / 100;
}

export function getInvoiceFinance(invoice, payments = []) {
  const grandTotal = Math.max(0, Number(invoice?.grandTotal) || 0);
  const legacyReceived = Math.max(0, Number(invoice?.received) || 0);
  const allocatedReceived = getInvoiceAllocatedAmount(invoice, payments);
  const received = Math.round((legacyReceived + allocatedReceived) * 100) / 100;
  const due = Math.max(0, Math.round((grandTotal - received) * 100) / 100);
  const advance = Math.max(0, Math.round((received - grandTotal) * 100) / 100);
  const status = grandTotal <= 0
    ? "Draft"
    : due > 0
      ? received > 0 ? "Partially Paid" : "Unpaid"
      : advance > 0 ? "Advance" : "Paid";

  return { grandTotal, legacyReceived, allocatedReceived, received, due, advance, status };
}

export function validateInvoiceAllocation(payment, invoice, amount, payments = [], invoices = []) {
  const value = Number(amount);
  if (!payment || !invoice) return { valid: false, error: "Choose a receipt and invoice." };
  if (isPaymentReversed(payment)) return { valid: false, error: "A reversed receipt cannot be allocated." };
  if (!Number.isFinite(value) || value <= 0) return { valid: false, error: "Enter an allocation amount greater than zero." };

  const paymentParty = normalizeName(payment?.partyName ?? payment?.party);
  const invoiceParty = normalizeName(invoice?.partyName);
  if (!paymentParty || paymentParty !== invoiceParty) {
    return { valid: false, error: "The receipt and invoice must belong to the same party." };
  }

  const samePayment = (candidate) =>
    candidate === payment || (getId(payment) && getId(candidate) === getId(payment));
  const receiptRoom = getPaymentUnallocatedAmount(payment);
  const currentReceiptRoom = Math.max(0, receiptRoom - 0.005);
  if (value > currentReceiptRoom) {
    return { valid: false, error: `This receipt has only ₹${receiptRoom.toLocaleString("en-IN")} unallocated.` };
  }

  const invoiceId = getId(invoice);
  const invoiceNumber = String(invoice?.invoiceNumber || "").trim().toLowerCase();
  const currentInvoice = (Array.isArray(invoices) ? invoices : []).find((candidate) =>
    invoiceId ? getId(candidate) === invoiceId : String(candidate?.invoiceNumber || "").trim().toLowerCase() === invoiceNumber,
  ) || invoice;
  const invoicePayments = (Array.isArray(payments) ? payments : []).map((candidate) =>
    samePayment(candidate) ? payment : candidate,
  );
  const invoiceRoom = getInvoiceFinance(currentInvoice, invoicePayments).due;
  if (value > Math.max(0, invoiceRoom - 0.005)) {
    return { valid: false, error: `This invoice has only ₹${invoiceRoom.toLocaleString("en-IN")} remaining.` };
  }

  return { valid: true, error: "" };
}
