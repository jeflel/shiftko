-- Home's "Get started" activation checklist retires itself for good once a nurse
-- either finishes it (taps "Got it" on the finished card) or taps "Skip for now".
--
-- Additive and nullable only, so it is safe on live rows: no default, no backfill,
-- and existing profiles read as "not dismissed", which is the correct meaning for
-- them. No RLS change either: the live "users update own profile" policy already
-- allows (id = auth.uid()), so a nurse can write her own dismissal and nobody
-- else's.
--
-- The column is read through lib/activation.js's fetchActivationDismissed, which
-- returns false if the read fails, so the checklist degrades to "not dismissed"
-- rather than taking Home down if this migration has not been applied yet.
alter table public.profiles
  add column if not exists activation_dismissed_at timestamptz;
