-- Personal Events: nurse-logged shifts/events that aren't official staffing
-- data (per HANDOFF.md §0.2/§6.2's resolution of the self-scheduling
-- question). Deliberately its own table, not a flag on shifts, so
-- self-reported entries stay out of every query that treats shifts as
-- coverage data (open-shift counts, has_overlapping_shift(), claim/swap
-- eligibility). `unit` is free text (matching shifts.unit/profiles.home_unit
-- — there's no departments table yet) and nullable: the Add/Edit Personal
-- Event screens let a nurse skip it and give the event a `name` instead
-- (e.g. "Weekend job at Peninsula Landscaping"), so the check constraint
-- requires at least one of the two.

create table personal_events (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references profiles(id) on delete cascade,
  unit text,
  name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint personal_events_unit_or_name check (unit is not null or name is not null)
);

create index personal_events_nurse_id_starts_at_idx on personal_events (nurse_id, starts_at);
create index personal_events_unit_time_idx on personal_events (unit, starts_at, ends_at) where unit is not null;

alter table personal_events enable row level security;

-- Visibility is workspace-wide, not unit-scoped like shifts (personal-events
-- product decision, HANDOFF.md §0.2). Mirrors the SECURITY DEFINER pattern
-- of is_coordinator()/can_view_coworker_profile() so this isn't gated by
-- whether the viewer's own profiles-table SELECT policy already lets them
-- see the event owner's row.
create or replace function public.same_workspace(p_profile_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles viewer
    join public.profiles owner on owner.id = p_profile_id
    where viewer.id = auth.uid()
      and viewer.workspace_id is not null
      and viewer.workspace_id = owner.workspace_id
  );
$$;

create policy "workspace members read personal events"
  on personal_events
  for select
  using (same_workspace(nurse_id));

create policy "nurses insert own personal events"
  on personal_events
  for insert
  with check (nurse_id = auth.uid());

create policy "nurses update own personal events"
  on personal_events
  for update
  using (nurse_id = auth.uid())
  with check (nurse_id = auth.uid());

create policy "nurses delete own personal events"
  on personal_events
  for delete
  using (nurse_id = auth.uid());

-- RLS alone doesn't grant access — Postgres denies at the table-privilege
-- level first. Tables created via the dashboard get this automatically;
-- this one was created via a plain migration, so it needs it explicitly.
-- Matches the grants already on `shifts` for `authenticated`.
grant select, insert, update, delete on public.personal_events to authenticated;
