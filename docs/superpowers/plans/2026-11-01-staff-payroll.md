# Staff Attendance and Payroll Plan

> **For agentic workers:** Native execution is authorized for this checklist item. Follow the design spec; do not add or run tests unless the user asks.

**Goal:** Speed up attendance entry and clarify weekly salary totals without changing saved-data formats.

**Architecture:** Keep the existing Staff Management page and localStorage records. Add a safe quick action for today's attendance, make weekly bulk marking fill only empty cells, and clarify the salary calculation UI.

**Tech Stack:** Existing React, CSS, lucide-react, and localStorage.

**Spec:** `docs/superpowers/specs/2026-11-01-staff-payroll-workflow.md`

## Global Constraints

- Preserve the existing dirty workspace and local business data.
- Do not add dependencies, migrate records, or change storage keys.
- Do not add or run tests; use build, focused lint, and diff review.

## Review Focus

- Today must be saved under its actual Monday week bucket, including when the screen is browsing an older/newer week.
- Bulk actions must preserve existing attendance and leave future days unmarked.
- Existing salary payment entries and attendance records must remain visible.
- Screen reader labels, keyboard focus, and touch targets must remain usable.

---

### Task 1: Safe fast attendance entry

**Files:** Modify `src/pages/StaffManagement/StaffManagement.jsx` and `.css`.

- [x] Add one-tap today marking for active staff; fill blank marks only and show changed/already-marked feedback.
- [x] Make the selected-week bulk action fill blanks through today, preserving existing marks and future days.
- [x] Clarify date range and action scope in labels and confirmation.
- [x] Verify via source review that week bucketing and existing records are preserved.

### Task 2: Salary breakdown clarity and verification

**Files:** Modify `src/pages/StaffManagement/StaffManagement.jsx`, `.css`, and `docs/upgrade-2026-checklist.md`.

- [x] Clarify the weekly salary formula and zero earning for absent/unmarked days.
- [x] Run `npm run build`, focused lint, and `git diff --check`; do not run tests.
- [x] Review the final diff for saved-data compatibility; no storage schema changes or user data edits.

**Verification result:** Build passes (1989 modules). Focused lint exits successfully with pre-existing hook/purity warnings in this legacy component. `git diff --check` passes. No tests were added or run; the browser attendance interaction was not manually exercised.
