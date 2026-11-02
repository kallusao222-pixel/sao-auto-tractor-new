# Supabase Local-First Cloud Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add optional Supabase Auth and explicit cloud backup/restore for the SAO Auto Tractor workspace while keeping localStorage as the day-to-day source of truth.

**Architecture:** Use a dedicated Supabase project and one owner-scoped JSONB workspace row protected by RLS. The browser uses only the publishable key, keeps existing local data local by default, and exposes explicit upload and previewed restore actions in Settings. V1 has no background sync or automatic merge, so simultaneous device edits cannot silently overwrite each other.

**Tech Stack:** React 19, Vite 8, pinned `@supabase/supabase-js`, Supabase Auth, Postgres JSONB/RLS, Vercel project environment variables.

**Spec:** `docs/supabase-local-first-backup-spec.md`

## Global Constraints

- Local workflows must continue to work when Supabase variables are absent or the network is offline.
- Never upload existing browser data without an explicit user action.
- Never include local PIN, local password, login flags, or service-role/secret keys in the cloud payload or browser bundle.
- The new Supabase project must be separate from the existing `sao-travels` project.
- Enable RLS and use an owner predicate based on `auth.uid()` for every exposed workspace row.
- Do not add or run automated tests in this task; verify with the existing build and Supabase read-only/authenticated query checks.
- Do not push to GitHub. A Vercel production deploy must use the existing authorized direct CLI workflow after required project configuration is complete.

## Review Focus

- Missing Vite variables: panel reports not configured and the local app remains usable.
- Expired/offline Auth session: local data remains untouched and the panel offers sign-in/retry.
- First upload to a cloud account with existing data: show a replacement warning and timestamp before writing.
- Restore over local data: preview counts and create the existing local safety snapshot before writing.
- Malformed or newer schema payload: reject restore with a clear message; do not partially write it.

---

### Task 1: Create the owner-scoped Supabase schema

**Files:**
- Create: a timestamped SQL migration generated with `npx supabase migration new auto_tractor_workspace_backup`
- Create: `supabase/config.toml` only if required by the CLI-generated local project

**Interfaces:**
- Produces `public.auto_tractor_workspaces(owner_id uuid primary key, schema_version integer, payload jsonb, updated_at timestamptz)`.
- RLS policies grant authenticated users access only when `auth.uid() = owner_id`; updates include both `USING` and `WITH CHECK`.
- No delete grant/policy and no `anon` access.

- [ ] Apply the migration only to the newly created dedicated project.
- [ ] Inspect the table, grants, RLS policies, and Supabase advisors before client wiring.

### Task 2: Add optional Supabase client configuration

**Files:**
- Modify: `package.json` and `package-lock.json`
- Create: `.env.example`
- Create: `src/lib/supabaseClient.js`

**Interfaces:**
- Export a nullable configured client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Do not read or add a service-role key.
- Pin the verified `@supabase/supabase-js` release in the package manifest and lockfile.

- [ ] Install the pinned client package.
- [ ] Confirm the client is `null` with absent variables and initializes only when both variables are present.

### Task 3: Define and validate the cloud workspace bundle

**Files:**
- Create: `src/data/cloudWorkspaceBackup.js`
- Reuse: `src/data/storageKeys.js`, `src/utils/backup.js`, and existing storage event helpers where appropriate

**Interfaces:**
- Export a fixed `CLOUD_WORKSPACE_KEYS` allowlist, snapshot/count builder, payload validator, and a restore helper.
- Include business records, business settings, invoices, expenses, staff attendance/payments, trip templates, and trip-entry preferences.
- Exclude login state, local PIN/password, device UI preferences, dismissed alerts, and backup timestamps.
- Reuse the app's safety-snapshot behavior before a confirmed restore.

- [ ] Add validation for app identity, payload shape, schema version, and supported storage keys.
- [ ] Ensure invalid payloads are rejected before any localStorage writes.

### Task 4: Add cloud authentication and backup controls

**Files:**
- Create: `src/pages/settings/CloudBackupPanel.jsx`
- Create: `src/pages/settings/CloudBackupPanel.css`
- Modify: `src/pages/settings/Settings.jsx` and `src/pages/settings/Settings.css`
- Create: `src/data/cloudWorkspaceApi.js`

**Interfaces:**
- Panel supports sign-up, email/password sign-in, sign-out, status, upload, and restore.
- API functions perform owner-keyed select/upsert and are only callable with an authenticated Supabase session.
- Upload/restore remain user-triggered. Replacing an existing snapshot or local workspace requires a clear confirmation and displays record counts/timestamp.
- Local app authentication remains independent in V1.

- [ ] Handle unconfigured/offline/auth-required/error/ready states with accessible inline feedback.
- [ ] Before restore, preview counts and use existing local backup snapshot logic; retain local records after restore.
- [ ] Reject stale or unsupported schema payloads without partial writes.

### Task 5: Configure local and production environments

**Files:**
- Modify: `.gitignore` only if needed to exclude local env files
- Modify: `docs/supabase-local-first-backup-spec.md` with setup/run notes

**Interfaces:**
- `.env.example` documents the two public Vite variables using placeholders only.
- Local `.env.local` and Vercel production environment receive the new project's URL and publishable key; no passwords or secret keys are stored in the repo.

- [ ] Add the URL and publishable key to the dedicated Vercel project after it exists.
- [ ] Ensure secrets are not printed and local environment files remain ignored.

### Task 6: Verify the integrated flow

**Files:**
- No automated tests added by this task.

- [ ] Run `npm run build` without Supabase variables to confirm offline/local compatibility.
- [ ] Run `npm run build` with configured public variables.
- [ ] In the dedicated Supabase project, verify anonymous access is denied and an authenticated owner can select/upsert only that owner's synthetic workspace row.
- [ ] Exercise sign-up/sign-in, upload, restore preview, recovery snapshot, and offline local use with synthetic records only.
- [ ] Deploy directly to the existing Vercel production project after the configured build succeeds; verify the live app returns the new asset bundle.
