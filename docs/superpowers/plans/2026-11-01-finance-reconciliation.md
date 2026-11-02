# Finance Reconciliation Implementation Plan

> **For agentic workers:** Native execution is authorized in this session. Track steps in this document; do not add or run tests unless the user requests them.

**Goal:** Reconcile invoice balances with party receipts through explicit, non-destructive allocations, while keeping each receipt counted once.

**Architecture:** Add pure finance helpers for allocation validation and derived invoice balances. Payments remains the owner of receipt data and gets an allocation flow; Invoice reads the shared helpers for preview, history, print and UPI QR amounts. Existing invoice `received` values remain as legacy snapshots, with no automatic migration.

**Tech Stack:** Existing React, Vite, localStorage, `src/utils` modules; no dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-finance-reconciliation-design.md`

## Global Constraints

- Keep data in the existing browser localStorage model; do not delete/reset existing business records.
- Preserve old invoice records and receipt fields; never guess historical matches.
- Keep one receipt total in party balances, regardless of the number of invoice allocations.
- No plugin installation, public deployment, network tunnel, GitHub push or new dependency.
- Do not add or run tests unless requested; use build/lint and non-mutating review only.

## Review Focus

- A reversed receipt must stop reducing invoice due while its original amount and reversal reason remain visible.
- Allocation must be limited to remaining receipt amount and invoice balance.
- Receipt and invoice party names must match before allocation.
- Editing an invoice must keep the same identifier so allocations remain attached.
- Legacy `received` snapshots must remain unchanged unless an explicit edit occurs.
- Allocated receipt corrections cannot move the receipt to a different party or reduce it below its allocated amount.
- The invoice editor keeps the form on the left with a live document preview on the right; printed QR stays beside payment details.

---

### Task 1: Shared allocation math

**Files:** Create `src/utils/financeReconciliation.js`; read `src/utils/paymentRecords.js`.

**Interfaces:** Export `getPaymentAllocations(payment)`, `getInvoiceAllocatedAmount(invoice, payments)`, `getInvoiceFinance(invoice, payments)`, `getPaymentUnallocatedAmount(payment)`, and `validateInvoiceAllocation(payment, invoice, amount, payments, invoices)`. Return derived totals without mutating stored objects; validation returns `{ valid, error }`.

- [x] Normalize IDs and party names consistently; ignore reversed receipts in active allocations.
- [x] Derive current invoice received from legacy `invoice.received` plus explicit active allocations, clamp due at zero, and calculate status/advance.
- [x] Validate same party, positive finite amount, payment remaining amount and invoice remaining balance.
- [x] Review helper behavior against the Review Focus cases without touching localStorage.

### Task 2: Allocate receipts in Payments

**Files:** Modify `src/pages/payments/Payments.jsx` and `.css`.

**Interfaces:** Consume Task 1 helpers. Persist explicit allocation objects on the selected existing payment record; preserve other payment fields and correction history.

- [x] Add an invoice-allocation action to active receipt details and show allocated/unallocated totals.
- [x] List saved invoices for the same party; allow a partial amount allocation and display validation errors.
- [x] Save allocation metadata locally and refresh screens through `saoAutoTractorDataChanged`.
- [x] Keep reversed rows read-only; preserve allocation history and show the reversal reason.
- [x] Add invoice number and allocated amount columns to printable party statements and status-aware CSV rows.

### Task 3: Derive Invoice balances

**Files:** Modify `src/pages/invoice/Invoice.jsx` and `.css`.

**Interfaces:** Consume `getInvoiceFinance(invoice, payments)` for saved invoice preview, history totals/status, print/PDF and UPI QR payable amount. Keep form calculations unchanged for an unsaved invoice.

- [x] Recalculate saved invoice received, due, advance and status from legacy snapshot plus active allocations.
- [x] Use derived due for the amount-encoded UPI QR and saved invoice previews.
- [x] Preserve invoice ID during edits and ensure invoice list status follows allocations.
- [x] Keep the saved legacy `received` value intact; label legacy and allocated amounts separately where displayed.
- [x] Reshape invoice creation with a sticky live preview, amount in words, owner contact note, QR left/payment details right, and optional PAID stamp that prints only when balance due is zero.

### Task 4: Verify and document

**Files:** Modify `docs/upgrade-2026-checklist.md`.

- [x] Run `npm run build` and focused `npm run lint -- ...`; build passes and focused lint exits 0 with existing legacy warnings.
- [x] Inspect the final diff and confirm no local business data changed; no tests were added or run.
- [x] Mark #16 complete after review of allocation guards, reversals, derived invoice balance and QR behavior. Live UPI transfer was not attempted.
