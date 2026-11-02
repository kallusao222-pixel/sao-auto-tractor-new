# Finance Reconciliation Design

## Intent

Keep party receipts, invoice balances, outstanding totals and invoice UPI QR amounts consistent while preserving all existing local records.

## Current behavior

- Trips are the source for party billing and global outstanding totals.
- The payment ledger stores party receipts; active receipt totals feed Billing, Outstanding, Party Ledger, Party Details and Dashboard.
- Invoices save their own `received`, `due` and `advance` snapshot. The invoice form can record a received amount without creating a receipt in the party payment ledger.
- Therefore invoice balance and party account balance can disagree. Existing invoice snapshots and unallocated payments may describe the same historical event, and there is no safe automatic way to match them.

## Goals

- Make each payment ledger record count once toward party totals.
- Allow an existing active receipt to be allocated across one or more invoices for the same party, up to its unallocated amount and each invoice's remaining balance.
- Derive an invoice's current received/due/status/UPI QR amount from its legacy received snapshot plus active receipt allocations.
- Preserve reversed receipts and allocation history for audit; reversal releases its allocations and recalculates invoices.
- Preserve all current localStorage records and avoid automatic migration of ambiguous historical invoice receipts.

## Non-goals

- Multi-user accounting, cloud sync, payment gateway confirmation, tax/legal advice, automatic matching of historic receipts, or deleting receipt/invoice history.
- Adding a new dependency.

## Approaches

1. **Keep invoice and party balances separate.** Lowest risk, but continues disagreement; rejected.
2. **Replace all invoice receipts with ledger allocations immediately.** Clean model for new data, but historical invoice `received` fields cannot be matched safely to existing receipts; rejected as an automatic migration.
3. **Add receipt allocations alongside legacy invoice snapshots.** Recommended. Keep each existing value intact; add explicit allocations on active payment records; calculate invoice due from its saved legacy received amount plus only explicitly allocated active receipts. Each party receipt is still counted once in the global payment total. This supports an incremental and reversible transition without changing existing saved business data.

## Design calls

- Store allocations on payment records as `allocations: [{ invoiceId, invoiceNumber, amount, allocatedAt }]`.
- Match party names case-insensitively and require the payment and invoice to belong to the same party.
- Reject allocations above the active payment's unallocated amount or above the invoice's remaining due.
- A reversed receipt contributes zero to party totals and zero to invoice allocations; keep its allocation metadata in history.
- Show legacy received amount and allocated receipts separately in reconciliation UI when relevant; do not silently migrate or overwrite legacy values.
- UPI QR uses the derived current invoice due.

## Scope

Implement through the existing Payments and Invoice screens and a shared utility. Billing, Outstanding, Party Ledger, Party Details and Dashboard continue to use the same active party receipt total. The change must retain local-only persistence and existing routes.

## Review focus

- Reversed receipt releases its invoice allocation while retaining its history.
- One receipt split over several invoices never allocates more than its amount.
- An allocation cannot cross party boundaries or overpay an invoice.
- Editing an invoice preserves its ID and existing receipt allocations.
- Existing invoice received snapshots and unallocated historical receipts remain unchanged until an explicit user action.
