-- Nurse self-scheduling for beta (no coordinator in the loop yet).
-- Lets a nurse add her own shift (insert) and see teammates' shifts on
-- her own unit (select), so a Team Schedule view works without any
-- coordinator involvement. Purely additive — existing coordinator ALL
-- policy and existing nurse SELECT policies are untouched.

-- Nurses can insert shifts for themselves only.
create policy "nurses insert own shifts"
  on shifts
  for insert
  with check (nurse_id = auth.uid());

-- Nurses can see any shift (any status, any nurse) on their own home_unit,
-- not just their own or overlapping ones — needed so Team Schedule shows
-- teammates' shifts, not just the viewer's.
create policy "nurses see unit shifts"
  on shifts
  for select
  using (
    unit = (select profiles.home_unit from profiles where profiles.id = auth.uid())
  );
