# Staff Attendance and Payroll Workflow

## Goal

Make weekly staff attendance quicker to mark and salary easier to review without changing the existing browser storage model or existing attendance/payment records.

## Current behavior

- Attendance is stored by week start, staff ID, and date in `saoAutoTractorStaffAttendance`.
- The attendance screen supports P, HD, A, and unmarked states and currently has a “Mark All P” action that overwrites every date in the selected week.
- Weekly salary is calculated as present days times full-day rate plus half-days times half-day rate. Weekly advance and payments are stored separately in `saoAutoTractorStaffSalaryPayments`.
- The salary table and printable preview already show attendance and payment totals.

## Design

1. Add a one-action “Mark Today Present” control for active staff. It writes to the correct week bucket for today's date, preserves any existing P/HD/A marks, and moves the attendance view to the current week.
2. Change weekly bulk marking to fill only blank days through today as Present. Future dates and existing attendance marks must remain unchanged. The action label and confirmation must say it covers the selected week through today and only fills unmarked cells.
3. Clarify the salary formula and explicitly state that Absent and Not Marked currently earn ₹0. Not Marked remains visually distinct so the user can finish attendance before relying on payroll totals.

## Constraints

- Keep the current localStorage schema and all existing records intact.
- Do not add dependencies or migrate payroll periods.
- No tests are added or run; verify with production build, focused lint, and read-only diff review.
- UI follows existing SAO dashboard tokens and remains keyboard usable with visible focus states.

## Acceptance

- Mark Today Present fills only missing statuses for active staff on today's date and stores under today's correct week start.
- Weekly fill preserves existing statuses, including HD and Absent, and leaves future dates blank.
- Salary view clearly displays the weekly pay period and calculation, including ₹0 earning for Absent and Not Marked.
- Existing salary and attendance records remain readable; production build and focused lint pass.
