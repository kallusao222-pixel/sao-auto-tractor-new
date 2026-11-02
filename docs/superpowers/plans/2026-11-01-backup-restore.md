# Backup and Restore Safeguards Plan

> **For agentic workers:** Native execution is authorized for this checklist item. Follow the design spec; do not add or run tests unless the user asks.

**Goal:** Make local backups complete and validate/recover restores before replacing browser data.

**Architecture:** Put local backup schema validation and transactional writes in a small data utility. Settings remains responsible for file download, preview, and user confirmation. Apply the same rollback and recovery-copy ordering to cloud restore. Older backups may omit categories; those keys remain untouched.

**Tech Stack:** Existing React, localStorage, JSON, and browser download API.

**Spec:** `docs/superpowers/specs/2026-11-01-backup-restore-safeguards.md`

## Global Constraints

- Preserve existing workspace edits and all saved user records.
- Do not change storage keys, add dependencies, or include credentials.
- Do not add or run tests; verify with build, focused lint, and diff review.

## Review Focus

- Wrong-shaped known categories must fail before any write.
- Missing categories in older backups must not clear current records.
- Safety snapshot download must precede restore writes.
- A failed write must trigger best-effort rollback of all affected keys.
- Staff salary payments must preserve the existing week-keyed object shape.

---

### Task 1: Versioned backup schema and validation

**Files:** Create `src/data/localWorkspaceBackup.js`; modify `src/pages/settings/Settings.jsx`.

- [x] Add schema version, field type validation, record counts, and complete current-key export.
- [x] Reject corrupted data before preview while accepting legacy version-1 backups with omitted fields.
- [x] Preview every included category and show its record/period/mark count.

### Task 2: Recoverable restore and verification

**Files:** Modify `src/data/localWorkspaceBackup.js`, `src/data/cloudWorkspaceBackup.js`, `src/pages/settings/Settings.jsx`, and `docs/upgrade-2026-checklist.md`.

- [x] Require the pre-restore safety download before writes; restore supplied keys only and roll back on errors.
- [x] Run `npm run build`, focused lint, and `git diff --check`; do not run tests.
- [x] Review compatibility and mark checklist #18 complete only after verification.
