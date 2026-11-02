# Backup and Restore Safeguards

## Goal

Make local backup files complete and make restore reviewable, validated, and recoverable before existing browser records are replaced.

## Current behavior

- Settings can export a JSON backup and preview a selected backup before restore.
- Several saved data groups are omitted from the backup; staff salary payments are read as an array even though Staff Management stores an object keyed by week.
- Invalid types for known categories are sometimes silently skipped during restore.
- A pre-restore download failure is logged but does not stop the restore.
- Writes are applied sequentially without rollback if localStorage fails midway.

## Design

1. Add a versioned backup schema and include every supported business key in `STORAGE_KEYS`, with the correct array/object/string shape. Continue excluding PIN, password, and login credentials.
2. Validate the application, schema version, timestamp when present, and every supplied supported category before showing the preview. Backward-compatible backups may omit categories; omitted categories remain unchanged on restore.
3. Show a readable preview count for records, attendance marks, salary periods, and settings/data included.
4. Require a pre-restore recovery snapshot download to be triggered before writing. Apply only categories supplied by local or cloud backup. If a write fails, restore all affected keys from their captured raw values before reporting failure.
5. Keep the existing JSON backup format readable when `schemaVersion` is absent (treat it as version 1); reject unsupported versions.

## Constraints

- No customer/business data may be created, deleted, migrated, or read into the task output.
- Do not add dependencies or change storage keys.
- Keep restore user-confirmed and preserve categories missing from older backups.
- No tests are added or run; verify with production build, focused lint, diff checks, and source review.

## Acceptance

- A new full backup contains all supported local business categories with accurate types.
- A malformed known category or unsupported version is rejected before preview/restore.
- Preview lists included data before the user confirms restore.
- Recovery download failure blocks restore; partial restore failure rolls localStorage back to its pre-restore values where storage permits.
- PIN/password/login keys are never included, and a legacy version-1 backup that omits newer categories restores only supplied categories.
