-- Shift Swaps: nurse-to-nurse shift exchange with a coordinator approval gate,
-- per HANDOFF.md §0.2/§6.3's resolution (kept coordinator-gated, matching
-- every SwapStatus*.dc.html mockup as drawn — see LINEAR_LIGHT_ROLLOUT.md).
-- Separate table from shift_claims: a swap always references two existing
-- shifts (requester's and recipient's) rather than claiming one open shift,
-- and its terminal step is a coordinator decision rather than a claim award.

create type swap_status as enum
  ('requested', 'accepted', 'declined', 'approved', 'denied');

create table shift_swaps (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  requester_shift_id uuid not null references shifts(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  recipient_shift_id uuid not null references shifts(id) on delete cascade,
  status swap_status not null default 'requested',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  decided_at timestamptz
);

create index shift_swaps_requester_id_idx on shift_swaps (requester_id);
create index shift_swaps_recipient_id_idx on shift_swaps (recipient_id);
create index shift_swaps_status_idx on shift_swaps (status);

alter table shift_swaps enable row level security;

-- Mirrors shift_claims' RLS model (CLAUDE.md § RLS Security Model): parties
-- to a swap can read their own rows, coordinators can read/manage everything
-- via is_coordinator() with no workspace scoping (same as shifts/shift_claims).
create policy "parties and coordinators read swaps"
  on shift_swaps
  for select
  using (requester_id = auth.uid() or recipient_id = auth.uid() or is_coordinator());

create policy "nurses request swaps of their own shifts"
  on shift_swaps
  for insert
  with check (requester_id = auth.uid());

-- Requester can cancel their own still-pending request (delete, matching
-- shift_claims' withdraw-via-delete pattern for Pool's "Withdraw" action).
create policy "requester cancels own pending swap"
  on shift_swaps
  for delete
  using (requester_id = auth.uid() and status = 'requested');

-- Recipient responds to a request addressed to them (requested -> accepted/declined).
create policy "recipient responds to swap request"
  on shift_swaps
  for update
  using (recipient_id = auth.uid() and status = 'requested')
  with check (recipient_id = auth.uid() and status in ('accepted', 'declined'));

-- Coordinators decide on a recipient-accepted swap (accepted -> approved/denied),
-- and can manage swaps generally, matching shifts/shift_claims' "coordinators
-- manage X: is_coordinator() (ALL)" pattern.
create policy "coordinators manage swaps"
  on shift_swaps
  for all
  using (is_coordinator())
  with check (is_coordinator());

-- RLS alone doesn't grant table-level privileges (see personal_events.sql's
-- same note) — this table was created via a plain migration, not the dashboard.
grant select, insert, update, delete on public.shift_swaps to authenticated;
