# SAO AUTO TRACTOR — 2026 Sidebar Review

Date: 1 November 2026
Scope: Every sidebar destination and its visible primary screen, plus the shared top bar, mobile navigation structure, dark mode, local data behavior, and the current Add Trip flow.

## What was reviewed

- Read-only screen review in the local app for Dashboard, Transport, Records, Finance, Staff and Settings, including each visible child page.
- Source review of the routed page components, calculations, local storage reads/writes, filters, exports, print actions and navigation callbacks.
- Local data remained unchanged. The local browser showed four active tractors and no parties, materials, trips, payments, invoices, expenses or staff, so data-dependent flows could not be exercised with real entries.
- The dark-mode toggle was switched once and returned to light mode. Small-screen layout and saved-record flows still need a dedicated pass with representative data.

## Sidebar-by-sidebar findings

### 1. Dashboard

**Working:** Today's trips, billing, receipts and outstanding; fleet utilization; trip-type breakdown; recent activity; reminders; seven-day trend; quick actions for Add Trip, Payment, Party and Tractor; links into records, dues and staff.

**Improve:** Add a date-range control so historical overview is not limited to today, and let owners hide/reorder secondary cards. Define “active today” and distinguish saved local data from online status. Add expenses and a clearly defined net operating result after finance totals are reconciled.

### 2. Transport — Tractors

**Working:** Search, status filters, sorting, CSV export, trip/billing totals, maintenance document dates and due reminders, details drawer, print/share and Add Trip shortcut.

**Improve:** Add fuel/service history and per-tractor cost vs income after Expenses and trip billing share one calculation source. Surface missing driver/contact and overdue documents as actionable items. Current local list has four tractors with no trips or assigned drivers, so trip utilization has no sample history to validate.

### 3. Transport — Parties / Party Details

**Working:** Party register search/status/sort/export, account summary, trip/payment activity, invoices, outstanding amount, daily view, print/PDF and WhatsApp statement.

**Improve:** Connect historic records by immutable party ID wherever possible. Current party/trip/payment/invoice summaries also match normalized party names; two customers with the same name can be combined. Provide one consistent “Add trip / Receive payment / Create invoice” action set from the account.

### 4. Transport — Materials

**Working:** Register search/status/sort, units, default rate, usage metrics, date-based activity, recent trip drill-down and print/export.

**Fixed in item 10:** The form stored a material's rate as `defaultRate`, while Add Trip read only `rate`; choosing a material therefore missed the saved default. Selection now applies its default rate and unit, and Material Details has an “Add Trip with Material” shortcut.

**Next improvement:** Make units configurable for local practice and add a “most-used materials” quick pick. Keep trip rate editable because negotiated/site rates can differ from the default.

### 5. Transport — Add Trip

**Working:** Tractor-first selection that remains selected until explicit change, compact grouped form, party/material pickers, templates, recent trips, repeat-field preferences, duplicate warning, amount preview, print/PDF.

**Improve:** Provide inline “add party/material” when a lookup is empty, show whether the material rate came from a default or was edited, and preserve a draft if the user accidentally changes page. Test save, reset, duplicate and repeat-entry using a deliberate test workspace after records exist.

### 6. Records — All Records

**Working:** Search, date range, party/tractor/material/type filters, Today/7 Days/This Month presets, summaries, pagination, selection/bulk delete, CSV and print.

**Improve:** Save named filter views, allow bulk export/mark/assign actions, and make bulk-delete recovery clearer. Keep selection stable when pagination or filters change.

### 7. Records — Date Wise

**Working:** Date presets, range, search and filters, trend, daily summaries, pagination, record actions, CSV and print preview.

**Implemented in checklist #12:** Shared local-date normalization, common amount/quantity aliases, saved report presets and bounded-range filtering. CSV and print remain based on the visible filter result.

**Still useful:** Add a report link from a selected day into its records and clarify the definition of “trip” consistently in the labels. Daily Report currently preserves its existing rule that unloading is paired activity and does not add to actual-trip totals.

### 8. Records — Reports

**Working:** Period selection, trend, top parties/tractors/materials, trip-type breakdown, daily activity, filters, record detail and export/print.

**Implemented in checklist #12:** Saved report presets and shared date/amount handling with Date Wise. The page still overlaps significantly with Date Wise; keep distinct report views accessible as tabs and reduce duplicate charts over time.

### 9. Records — Daily Report

**Working:** Single-day navigation, yesterday/today/tomorrow, search/filter, totals, CSV, print and link to full report.

**Implemented in checklist #12:** Daily Report now shares date normalization with the period reports; trip count no longer reads material quantity as number of trips. Keep this as a fast one-day print view.

### 10. Finance — Billing

**Working:** Party accounts and bill/payment views, payment entry, party/tractor/type/date filters, totals, export/print and written calculation rules.

**Improve:** This overlaps Party Ledger, Payments and Outstanding. Make Billing the trip-charge ledger and route collection actions to the one payment workflow; avoid separate due totals drifting between pages.

### 11. Finance — Party Ledger

**Working:** Party account register, due/overdue/clear filters, smart sort, account history, inline payment, export and print/share.

**Improve:** Consolidate it with Party Details/Outstanding and use stable party IDs. Today-vs-overdue date rules and outstanding formula should come from shared finance calculations.

### 12. Finance — Invoice

**Working:** Select trips by party/tractor/date, invoice history, duplicate-number checks with a local sequence reservation, discounts, extra charge, GST, received amount, due, and saved invoice line/business snapshots. Checklist #14 adds the requested amount-matched UPI QR to preview and print/PDF.

**Improve:** The invoice sequence is local-browser only, so simultaneous devices cannot guarantee a unique number. Make invoice status and receipt allocations agree with Payments and Outstanding; add clear edit/void history and more explicit tax/rounding settings.

**Implemented:** UPI QR uses `kallusao218@okaxis` (payee `SAO TRANSPORT`) and current balance due in INR. A manual decode confirmed the generated URI and the image is included in preview and print/PDF. QR generation uses the owner-supplied QR Server URL, which receives the VPA and amount in its request URL. Browser printing waits for the QR to load; live image rendering was not exercised with a populated invoice because the local dataset contains no trips.

### 13. Finance — Payments

**Working:** Receipt ledger, date/mode filters, search, party statements, receipt print and CSV export.

**Improve:** Add allocation to one or more invoices/bills, correction/reversal instead of destructive edits, duplicate reference warnings and clear unallocated/advance balances.

### 14. Finance — Outstanding

**Working:** Party balances, filters, quick payment, export and bulk reminders.

**Improve:** Treat this as a view over the shared party ledger, not a second balance calculator. Tie reminders to an accurate aging bucket and support partial invoice allocation.

### 15. Finance — Expenses

**Working:** Expense categories, vendor/tractor filters, date presets, selection, undo, category/tractor/vendor summaries, CSV and print.

**Improve:** Add receipt photo/attachment with local backup, service/fuel odometer details and a net income view after finance reconciliation. Clearly separate an undo window from permanent deletion.

### 16. Staff — Staff Management

**Working:** Staff directory, roles/status, weekly attendance, full/half/absent/not-marked status, weekly salary and payment entry, preview/print/export.

**Improve:** Add bulk attendance marking with review, pay-period summaries, salary component explanation and protected staff data backup. Confirm reports exclude unmarked attendance consistently.

### 17. Settings

**Working:** 13 settings sections for company, transport, party, billing, date/time, dashboard, notifications, appearance, backup/data, cloud, security, account and about; settings search and explicit save; local backup and manual Supabase upload/restore.

**Improve:** Replace “Configure Later” account placeholders with either accurate local-only wording or a working account flow. The cloud feature is a manual backup/restore; it is not live sync. Clearly label which account is local app access versus optional cloud backup access.

## Shared shell: top bar, mobile, theme and storage

- Top bar exposes page title/breadcrumb, date, weather, notifications, search/quick actions, theme and account/sign-out controls. The displayed Administrator / Office Account identity is fixed in the UI; load a real profile only when authentication and roles exist.
- Sidebar and mobile header have collapse/menu controls, escape handling and focus management in code. Verify at narrow widths and on touch; wide ledgers and drawers still need representative-device review.
- Light/dark toggle works and theme state is persisted. There are two theme-related modules in the source tree; keep one canonical implementation and check contrast for every page during the theme pass.
- Business data is primarily browser `localStorage`; it stays on that browser unless manually exported or uploaded through Backup & Data. A local login/PIN is not multi-user authentication. The sidebar “Live” badge can be mistaken for cloud synchronization and should be relabeled to describe actual local/cloud state.
- Several finance/report screens independently read local storage and calculate balances. Centralize data access and money/date calculations before relying on them for cross-device or audited accounting.

## Navigation cleanup recommendation

The extra sidebar entries are **Daily Report, Party Ledger, Outstanding and Expenses**. Expenses is a distinct business function and should stay. Daily Report is useful as a print-friendly one-day view. Party Ledger and Outstanding overlap Party Details/Billing/Payments; converge them into one account ledger with tabs for activity, invoices, receipts and aging. Keep Billing focused on trip charges and Invoice focused on issued documents. This removes duplicate ways of entering or interpreting money without taking away the underlying tasks.

## Suggested 2026 order

1. Materials shortcuts (complete): correct default rate/unit and start a trip from a material.
2. All Records saved views and safe bulk actions.
3. Reuse one date/filter engine for Date Wise, Reports and Daily Report.
4. Unify account, invoice, receipt, advance and outstanding calculations; define correction history.
5. Streamline staff attendance and pay-period review.
6. Protect local data: validated versioned backups, restore preview/recovery, storage health and honest local/cloud status.
7. Add proper account/roles only when multi-user access is enabled; keep `sao-travels` separate from this app.
8. Finish mobile, dark-mode contrast, keyboard, forms, table and print/PDF review with representative records.

## Implementation notes

- Item 10 implementation and build verification are tracked in `upgrade-2026-checklist.md`.
- This review is based on local screen snapshots and source inspection. No public deployment, GitHub push, plugin install, network tunnel or business-record mutation was performed for the audit.
