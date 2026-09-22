-- Onboarding v2, part 2 of 2: invite links.
--
-- A coordinator generates one link per unit and texts it to her staff. The
-- invitee's first screen names the facility and the person who invited her,
-- which is the trust screen the whole flow hangs on.
--
-- APPLIED to production 2026-09-21, by running this file directly through the
-- Supabase Management API rather than `supabase db push` (see the note in
-- 20260921120000). No history row was written, so a future push will re-run it;
-- every statement is idempotent.
--
-- Verified after applying, with a throwaway invite that was then deleted:
--   token default -> 64 hex chars, expires_at 30 days out, revoked false, uses 0
--   resolve_invite(live token)    -> facility, inviter, unit
--   resolve_invite(revoked token) -> no rows
--   resolve_invite(expired token) -> no rows
--   resolve_invite(unknown token) -> no rows
--   redeem_invite with no auth.uid() -> false
--   invites 0 rows after cleanup, profiles 45, shifts 932, notifications 14
--
-- The facility name comes back as the WORKSPACE name, 'Burlingame SNF', not the
-- facilities table's 'Burlingame Skilled Nursing'. See the open decision above.
--
-- OPEN DECISION, and this file is the only place it matters: production has
-- BOTH a workspaces table and a facilities table, plus a text home_unit column,
-- and they disagree.
--
--   workspaces : 1 row, 'Burlingame SNF', code BURLINGAME, 8 of 45 profiles linked
--                and public.same_workspace() (used by personal_events RLS) keys on it
--   facilities : 1 row, 'Burlingame Skilled Nursing', 3 units linked via units.facility_id,
--                0 of 45 profiles linked, nothing reads it
--   home_unit  : text, 44 of 45 profiles set, and the field open-shift visibility uses
--
-- This migration anchors the invite to workspace_id, because that is the one
-- RLS already reads. If the intent is instead to adopt the normalized
-- facilities/units pair, that is a bigger change (it means migrating home_unit
-- text to units.id across profiles and shifts, then rewriting the shifts RLS
-- policies) and belongs in its own migration, not this one.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- Text, matching profiles.home_unit and shifts.unit. Not units.id, see above.
  unit text not null,
  -- Generated in the database, never by the client: a weak or guessable token
  -- is the whole security of this feature.
  token text not null unique default encode(sha256((gen_random_uuid()::text || gen_random_uuid()::text)::bytea), 'hex'),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked boolean not null default false,
  uses integer not null default 0
);

comment on table public.invites is
  'Per-unit join links. Reusable and revocable, 30-day default expiry. Carries facility and unit only, never role or credential.';

create index if not exists invites_token_idx on public.invites (token);

alter table public.invites enable row level security;

-- Coordinators manage their own workspace's invites. Nothing else may read the
-- table: an invitee is unauthenticated when she opens the link, so her path goes
-- through resolve_invite() below rather than a SELECT grant.
drop policy if exists "coordinators read invites" on public.invites;
create policy "coordinators read invites"
  on public.invites for select to authenticated
  using (is_coordinator());

drop policy if exists "coordinators insert invites" on public.invites;
create policy "coordinators insert invites"
  on public.invites for insert to authenticated
  with check (is_coordinator() and created_by = auth.uid());

drop policy if exists "coordinators update invites" on public.invites;
create policy "coordinators update invites"
  on public.invites for update to authenticated
  using (is_coordinator())
  with check (is_coordinator());

-- The unauthenticated read path. Returns three fields and nothing else, so an
-- anonymous caller holding a token learns the facility name, the inviter's name
-- and the unit, and cannot enumerate the table or read who else was invited.
create or replace function public.resolve_invite(p_token text)
returns table (out_facility_name text, out_inviter_name text, out_unit text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select w.name, p.full_name, i.unit
  from public.invites i
  join public.workspaces w on w.id = i.workspace_id
  join public.profiles p on p.id = i.created_by
  where i.token = p_token
    and not i.revoked
    and i.expires_at > now()
  limit 1;
$$;

grant execute on function public.resolve_invite(text) to anon, authenticated;

-- The post-auth redemption. SECURITY DEFINER because the caller has no SELECT
-- grant on invites; it touches only the caller's own profile row and only the
-- two fields an invite is allowed to carry.
--
-- It cannot set `role`. A link that could set role would be a link that grants
-- coordinator, and is_coordinator() is full access to every shift, claim and
-- notification in the facility. Coordinator requests keep going through the
-- existing requested_role confirmation in the staff roster.
--
-- p_home_unit lets the nurse change the unit on N4 before redeeming. That is not
-- a new hole: the unit is self-selected today, and the coordinator can already
-- see and correct it in the staff roster.
create or replace function public.redeem_invite(p_token text, p_home_unit text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invite public.invites;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_invite
  from public.invites
  where token = p_token
    and not revoked
    and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  update public.profiles
     set workspace_id = v_invite.workspace_id,
         home_unit = coalesce(nullif(p_home_unit, ''), v_invite.unit)
   where id = auth.uid();

  update public.invites
     set uses = uses + 1
   where id = v_invite.id;

  return true;
end;
$$;

grant execute on function public.redeem_invite(text, text) to authenticated;

-- Verify with a throwaway, not by reading this file: open a real invite link in
-- the app, complete onboarding, then read back the row.
--   select id, workspace_id, home_unit, preferred_periods, notification_opt_in
--     from profiles where id = '<the new user id>';
-- Then delete the throwaway and show the counts on both sides.
