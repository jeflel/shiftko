-- Onboarding v2, part 1 of 2: the two preferences the nurse flow collects, plus
-- email delivery state on the existing notifications outbox.
--
-- Every statement here is additive and every default preserves today's
-- behaviour, so the bundle currently deployed keeps working unchanged. Nothing
-- reads these columns yet, so this is safe to apply ahead of the code.
--
-- APPLIED to production 2026-09-21, by running this file directly through the
-- Supabase Management API rather than `supabase db push`, because the local and
-- remote migration histories disagree by two avatar migrations whose effects are
-- live but whose history rows are missing, and a push would try to replay them.
-- No history row was written for this file either, so a future push will re-run
-- it. Every statement here is idempotent, so that is harmless.

-- N5 "When do you usually work?". Values are the SHIFT_PRESETS keys from
-- src/lib/shiftPresets.js ('day' | 'evening' | 'night'), so the chips in
-- onboarding and the presets used by self-scheduling and coordinator posting
-- cannot drift apart.
--
-- Deliberately a soft PREFERENCE, not availability: it sorts Open Shifts and
-- targets alert copy. It must never filter what a nurse can see, and it is not
-- the deferred availability-request feature.
alter table profiles
  add column if not exists preferred_periods text[];

comment on column profiles.preferred_periods is
  'Shift periods the nurse usually picks up, as SHIFT_PRESETS keys (day|evening|night). Sorts Open Shifts and personalises alert copy. A preference, never a filter or an availability record.';

-- N7 "Alerts". Opt-in for email alerts on open shifts.
alter table profiles
  add column if not exists notification_opt_in boolean not null default false;

comment on column profiles.notification_opt_in is
  'Nurse consented to email alerts about open shifts on her unit. Default false: never email someone who did not ask.';

-- Email is a second delivery channel hanging off the notifications table that
-- already exists, not a new outbox. Claim approved, claim denied, and
-- offer-to-pool all already insert here, so all three gain email for free.
--
-- emailed_at is what makes a silent failure visible. The Edge Function marks it
-- on success; a row left null past a few minutes is a send that failed, which
-- pg_net would otherwise swallow (the trigger commits before the function runs,
-- so a failed send leaves no trace anywhere).
alter table notifications
  add column if not exists emailed_at timestamptz,
  add column if not exists email_attempts integer not null default 0,
  add column if not exists email_error text;

comment on column notifications.emailed_at is
  'When the email channel successfully sent this notification. Null on an old row means the send failed or the channel is off.';
comment on column notifications.email_error is
  'Last delivery error from the email provider, for debugging failed sends.';

-- Retry scan support: find rows that are old enough to be considered failed.
create index if not exists notifications_unsent_idx
  on notifications (created_at)
  where emailed_at is null;

-- Write path check. profiles policies as they exist in production:
--   [UPDATE] "users update own profile" using (id = auth.uid()), no WITH CHECK
--   [UPDATE] "Coordinators can update nurse profiles" using is_coordinator()
-- No BEFORE UPDATE guard trigger exists on profiles (verified against
-- pg_trigger), so a nurse writing these two columns on her own row is covered
-- by the existing policy. No RLS change is needed for part 1.
