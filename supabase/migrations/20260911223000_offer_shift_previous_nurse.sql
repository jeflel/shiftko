-- Offer Shift: preserves who originally offered a shift back to the pool so
-- that nurse can still see the shift's outcome after a coordinator approves
-- another nurse's claim on it. Schedule.jsx's handleApprove overwrites
-- shifts.nurse_id with the claiming nurse's id on approval, so without this
-- column the original nurse has no durable way to find "their" offered
-- shift once someone else has picked it up. Per HANDOFF.md §0.3, flagged
-- "NET-NEW+SCHEMA if kept" when the 4-screen Offer Shift stepper (vs. the
-- existing 1-tap toggle) was chosen for this rollout - see
-- LINEAR_LIGHT_ROLLOUT.md.

alter table shifts add column previous_nurse_id uuid references profiles(id) on delete set null;

-- Additive alongside the existing "nurses see own shifts" policy (nurse_id =
-- auth.uid() OR is_coordinator() OR has_overlapping_shift()) rather than
-- editing it - Postgres OR's every permissive policy for the same command
-- together, so this only widens read access, it never touches that rule.
-- Lets the original nurse keep reading the shift (now owned by whoever
-- picked it up) to render the Approved / Picked Up status screen.
create policy "previous offering nurse reads own offered shift"
  on shifts
  for select
  using (previous_nurse_id = auth.uid());
