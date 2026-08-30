-- Saved custom shift presets: lets a user (nurse or coordinator) save a
-- one-off custom start/end time from the Add Shift form so it can be
-- reselected later instead of retyping it. Private per user, capped at 5
-- in the app layer (not enforced in SQL).

create table if not exists saved_shift_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

alter table saved_shift_presets enable row level security;

-- Users manage only their own saved presets (read/insert/delete).
create policy "users manage own saved shift presets"
  on saved_shift_presets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
