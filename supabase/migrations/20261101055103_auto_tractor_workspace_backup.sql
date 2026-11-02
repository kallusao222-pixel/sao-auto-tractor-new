create table public.auto_tractor_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.auto_tractor_workspaces enable row level security;

revoke all on table public.auto_tractor_workspaces from anon, authenticated;
grant select, insert, update on table public.auto_tractor_workspaces to authenticated;

create policy "Owners can read their workspace backup"
on public.auto_tractor_workspaces
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owners can create their workspace backup"
on public.auto_tractor_workspaces
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update their workspace backup"
on public.auto_tractor_workspaces
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
