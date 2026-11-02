# Supabase Cloud Backup — Design

## Goal

Add an optional, secure way to sign in and copy the SAO Auto Tractor workspace to a dedicated Supabase project. Local browser storage remains the working copy. The first release offers explicit upload and restore actions so the owner can carry the same records to another device without silent background overwrites.

## What the codebase does today

- Core entities load through `src/context/AppDataContext.jsx`, but many feature pages read and write localStorage directly.
- The browser password in `src/pages/Login/Login.jsx` is a local gate; it is not a cloud identity.
- `src/utils/backup.js` handles a smaller backup set, while Settings contains a broader full-backup and restore flow.
- The connected Supabase account has one active `sao-travels` project with existing production travel tables and Auth users. This tractor app will use a separate project to avoid changing or sharing that database.

## V1 behavior

1. Keep normal trip, billing, staff, and reporting work local and usable when Supabase is not configured or the network is unavailable.
2. Add a Cloud Backup panel in Settings with Supabase email/password sign-in, sign-up, sign-out, and a visible connection state.
3. Upload only when the owner presses **Upload local backup**. Show the data categories and local record counts before the first upload and before replacing an existing cloud snapshot.
4. Restore only when the owner presses **Restore cloud backup** and confirms a preview. Reuse the app's safe-restore behavior so current local data gets a recoverable snapshot before restore.
5. Show the cloud snapshot timestamp and schema version. Do not silently merge two edited devices; the owner explicitly chooses upload or restore.
6. Do not transfer the local app PIN, local login password, login flag, browser UI preferences, dismissed reminders, or backup timestamps. Include business records and settings (including contact/tax details), invoices, expenses, staff attendance/payments, trip templates, and trip-entry preferences. The panel must say that these business records are uploaded to the configured Supabase project.

## Storage and access

- Use one dedicated table, `public.auto_tractor_workspaces`, with one JSONB workspace snapshot per authenticated owner.
- Columns: `owner_id uuid` primary key referencing `auth.users(id)`, `schema_version integer`, `payload jsonb`, and `updated_at timestamptz`.
- Enable RLS. Grant only `SELECT`, `INSERT`, and `UPDATE` to `authenticated`; define each policy with `TO authenticated` and `auth.uid() = owner_id`. The update policy must include both `USING` and `WITH CHECK`. Do not grant access to `anon` and do not add a service-role key to the browser.
- Use only a Supabase publishable key in the Vite client. The project URL and publishable key come from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Keep the current local app login separate in V1. Supabase Auth is only for accessing the cloud backup; this avoids locking the owner's local workspace behind an unconfigured cloud account.

## Project and data safety

- Use a dedicated Supabase project in the user's organization, in the India region when available. Do not reuse the production `sao-travels` project.
- Do not upload existing browser data automatically. The first upload is an explicit, previewed action by the signed-in owner.
- Do not remove local records after upload or restore.
- Never commit `.env.local`, user passwords, access tokens, or a service-role/secret key.

## Out of scope for V1

- Automatic background synchronization, real-time subscriptions, multi-staff roles, per-record conflict merging, and moving the local database source of truth to Supabase.
- Deleting cloud or local data.

## Verification

- Build the Vite app with Supabase variables absent and confirm the current local workflow still compiles.
- In the dedicated Supabase project, verify the table and RLS policies, then make an authenticated test query and an unauthenticated query that must return no workspace data.
- With a test account and synthetic records only, verify sign-up/sign-in, upload, restore preview, local recovery snapshot, and offline/local-only behavior.
- Deploy the configured Vite build only after the user-provided project URL and publishable key are configured. Never include service-role credentials.
