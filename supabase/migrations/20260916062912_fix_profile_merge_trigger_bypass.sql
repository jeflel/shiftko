-- The profile merge added in 20260916061057_merge_profile_on_signup.sql
-- cannot actually run. auth.uid() is null during the signup trigger, so
-- is_coordinator() is false, and shifts_guard_claim_update() rejects the
-- merge's update of shifts.nurse_id. The error is swallowed by the merge's
-- own exception block, so shifts and notifications are silently left
-- pointing at the old profile and the old profile is never deleted.
--
-- This adds an explicit, narrow bypass for the merge only. The bypass is a
-- transaction-local GUC that is off by default, so without it nothing
-- about nurse-facing behavior changes.

-- 1. Give both guard triggers on shifts the same bypass.
create or replace function public.shifts_guard_claim_update()
returns trigger language plpgsql as $function$
  begin
    if coalesce(current_setting('app.profile_merge', true), 'off') = 'on' then
      return new;
    end if;

    if not is_coordinator() then
      if new.unit is distinct from old.unit
        or new.starts_at is distinct from old.starts_at
        or new.ends_at is distinct from old.ends_at
        or new.nurse_id is distinct from old.nurse_id
        or new.id is distinct from old.id
      then
        raise exception 'Nurses may only change status, claimed_by, and
  claimed_at when claiming a shift';
      end if;
    end if;
    return new;
  end;
  $function$;

create or replace function public.enforce_shift_claim_immutable_fields()
returns trigger language plpgsql as $function$
begin
  if coalesce(current_setting('app.profile_merge', true), 'off') = 'on' then
    return new;
  end if;

  if not is_coordinator() then
    if new.unit is distinct from old.unit
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at then
      raise exception 'Nurses may not modify unit or shift times when claiming a shift';
    end if;
  end if;
  return new;
end;
$function$;

-- 2. Set the bypass only around the merge, and turn it back off in every
-- exit path (success or failure) so it can never apply to the profile
-- insert below or leak into any later statement on the connection.
--
-- Ordering note: every one of the 10 reassigned foreign keys points at
-- profiles(id) and none of them are deferrable, so they are checked
-- immediately. The new profile row (new.id) must exist before any of
-- the 10 updates can repoint rows onto it, so the insert has to happen
-- first, not after, despite the original migration's comment order.
-- To insert the new profile while the old (mirror) row still holds the
-- same email, the mirror's email is cleared first: profiles_email_unique
-- is a partial index on email is not null, so a null email never
-- collides with it. The mirror row is deleted a few statements later
-- in the same best-effort block, so the null never persists.
-- The profile insert also gets its own exception handler so a
-- unique_violation there can never abort the auth.users insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  mirror_id uuid;
begin
  begin
    select id into mirror_id
    from public.profiles
    where lower(email) = lower(new.email)
      and id <> new.id
    limit 1;

    if mirror_id is not null then
      update public.profiles set email = null where id = mirror_id;

      insert into public.profiles (id, full_name, role, credential, home_unit, email, requested_role)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
        coalesce(new.raw_user_meta_data->>'role', 'nurse')::public.user_role,
        new.raw_user_meta_data->>'credential',
        new.raw_user_meta_data->>'home_unit',
        new.email,
        (new.raw_user_meta_data->>'requested_role')::public.user_role
      )
      on conflict (id) do nothing;

      perform set_config('app.profile_merge', 'on', true);

      update public.claims set nurse_id = new.id where nurse_id = mirror_id;
      update public.notifications set user_id = new.id where user_id = mirror_id;
      update public.personal_events set nurse_id = new.id where nurse_id = mirror_id;
      update public.saved_shift_presets set user_id = new.id where user_id = mirror_id;
      update public.schedule_patterns set nurse_id = new.id where nurse_id = mirror_id;
      update public.shift_claims set nurse_id = new.id where nurse_id = mirror_id;
      update public.shift_swaps set recipient_id = new.id where recipient_id = mirror_id;
      update public.shift_swaps set requester_id = new.id where requester_id = mirror_id;
      update public.shifts set nurse_id = new.id where nurse_id = mirror_id;
      update public.shifts set previous_nurse_id = new.id where previous_nurse_id = mirror_id;

      delete from public.profiles where id = mirror_id;

      perform set_config('app.profile_merge', 'off', true);
    end if;
  exception when others then
    perform set_config('app.profile_merge', 'off', true);
  end;

  -- Fallback: runs whether or not a mirror was found. If the merge
  -- above already inserted the row, this is a no-op via on conflict.
  -- If no mirror existed, or the merge raised before its own insert
  -- ran, this is what actually creates the profile.
  begin
    insert into public.profiles (id, full_name, role, credential, home_unit, email, requested_role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
      coalesce(new.raw_user_meta_data->>'role', 'nurse')::public.user_role,
      new.raw_user_meta_data->>'credential',
      new.raw_user_meta_data->>'home_unit',
      new.email,
      (new.raw_user_meta_data->>'requested_role')::public.user_role
    )
    on conflict (id) do nothing;
  exception when others then
    null;
  end;

  return new;
end;
$function$;

-- 3. Re-add the unique index now that the merge can actually run before
-- it, so a real duplicate is merged away instead of colliding with it.
-- Only add it if no duplicate lowercased emails exist today; otherwise
-- report the count and leave cleanup for later.
do $$
declare
  dup_count integer;
begin
  select count(*) into dup_count
  from (
    select lower(email)
    from public.profiles
    where email is not null
    group by lower(email)
    having count(*) > 1
  ) d;

  if dup_count = 0 then
    create unique index if not exists profiles_email_unique
      on public.profiles (lower(email)) where email is not null;
  else
    raise notice 'skipping profiles_email_unique: % duplicate lowercased email(s) found', dup_count;
  end if;
end;
$$;
