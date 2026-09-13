-- The saved_shift_presets table (20260830060246_saved_shift_presets.sql)
-- enabled RLS and added an owner policy, but never granted table privileges
-- to the authenticated role. RLS decides which ROWS a role may touch; the
-- GRANT is what lets the role touch the table at all. Without it every
-- read/write from the app failed with:
--   permission denied for table saved_shift_presets   (SQLSTATE 42501)
-- which surfaced as a red error on the coordinator's Post a Shift screen.
-- Additive only: grants on the existing table, no policy or schema change.

grant select, insert, update, delete
  on table public.saved_shift_presets
  to authenticated;
