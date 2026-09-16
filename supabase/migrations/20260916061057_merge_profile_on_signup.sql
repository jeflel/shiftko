-- Merge a seeded profile into the real auth account on first sign in.
-- A seeded nurse has a profile row but no auth.users row. When she
-- eventually signs in with Google, a brand new profile was being
-- created instead of reusing her seeded one, orphaning her shift
-- history. This merges by email before inserting the new profile.

-- 1. requested_role holds a self-signup coordinator claim until an
-- existing coordinator confirms it. role itself must not change here.
alter table public.profiles add column if not exists requested_role public.user_role;

-- 2. Merge-by-email, then insert. The merge is best effort: if it
-- raises for any reason, the exception is caught so the profile
-- insert below still runs and the new user is never left without a
-- profile row.
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
    end if;
  exception when others then
    null;
  end;

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

  return new;
end;
$function$;

-- 3. Only add the unique index if no duplicate lowercased emails
-- already exist. Duplicates, if any, are left for manual cleanup
-- rather than blocking this migration.
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
