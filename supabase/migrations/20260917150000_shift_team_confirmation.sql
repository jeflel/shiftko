-- Beta: a nurse adding her own shift used to land on Team Schedule immediately,
-- with nothing to confirm it. team_confirmed records whether a shift belongs on
-- the team schedule: the add-shift panel writes false, everything else defaults
-- to true, so every existing row and every coordinator-created shift is
-- unaffected.
--
-- Confirming runs through a SECURITY DEFINER function because production has no
-- UPDATE policy on shifts for nurses (only INSERT own + the SELECT policies,
-- plus "coordinators manage shifts" for coordinators), so a client-side UPDATE
-- would silently affect zero rows. This mirrors public.toggle_shift_offer, the
-- established pattern for a nurse changing her own shift.

alter table public.shifts
  add column if not exists team_confirmed boolean not null default true;

comment on column public.shifts.team_confirmed is
  'false while a nurse-added shift is waiting for her to add it to the team schedule; true otherwise.';

create or replace function public.confirm_shift_for_team(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_shift public.shifts%rowtype;
begin
  select * into v_shift
  from public.shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'Shift not found';
  end if;

  if v_shift.nurse_id is distinct from auth.uid() then
    raise exception 'You can only add your own shifts to the team schedule';
  end if;

  if v_shift.status is distinct from 'scheduled'::shift_status then
    raise exception 'Only scheduled shifts can be added to the team schedule';
  end if;

  update public.shifts
  set team_confirmed = true
  where id = p_shift_id;
end;
$function$;

revoke all on function public.confirm_shift_for_team(uuid) from public;
grant execute on function public.confirm_shift_for_team(uuid) to authenticated;
