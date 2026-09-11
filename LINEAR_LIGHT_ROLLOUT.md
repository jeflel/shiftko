# Linear Light rollout: live app implementation plan

**Goal:** bring shiftko.com's live UI to the "Linear Light" design system
(Inter typography, 16px card radii, soft `rgba(53,87,97,.12)` shadow lift,
colored period/status tag pills), replacing the current ink/white v2 system
screen by screen. This supersedes/extends the earlier v2 reskin (see
`HANDOFF.md` in `~/shiftko-design-v2-visual-pass-dup`, which mapped the
*previous* design pass onto the live app and already shipped nurse-only).

**Design source:** `home-linear-light/` in
`~/shiftko-design-v2-visual-pass-dup` (a git repo, sibling to this one), 37
`.dc.html` mockup screens across 8 flows, published as the Claude Design
canvas artifact **"Shiftko Home, Linear Light"**
(`17d938e1-d2c1-4982-b4bb-ca72691e398b`). That repo's memory file
`shiftko_v2_linear_light_ui_update.md` (full path:
`/Users/jeflelegson/.claude/projects/-Users-jeflelegson-shiftko-design-v2-visual-pass-dup/memory/shiftko_v2_linear_light_ui_update.md`)
documents the established shared CSS vocabulary (period-tag, status-tag,
`.btn`/`.btn-primary`, `.field-group`, grouped-list patterns, etc.). Read it
before building a new flow so screens reuse vocabulary instead of inventing
parallel patterns.

Work happens flow by flow, each as its own session-sized chunk. Order below
is what the user asked for (home first, then schedules, then the rest).
Re-check with the user before assuming the remaining order still holds.

**Standing rules for this project** (from the Obsidian vault at
`~/jefle-os/03 Projects/Shiftko/CLAUDE.md`, which governs Shiftko work
generally, not just this rollout): no em dashes anywhere, including in
anything written for this project; one feature per commit, never bundle
unrelated changes; draft the plan and file list first and wait for approval
before building; run `graphify update .` from `~/shiftko` after every
commit (no need to ask first); ask before editing any vault file that
doesn't already have a `(C)` prefix. A matching plan doc for this rollout
lives in the vault at `00 Plan/(C) Shiftko Linear Light Rollout Plan.md`,
kept in sync with this file's Status section.

## Status

- [x] **Design tokens** (`src/tailwind.css`), 2026-09-11
  - `--radius-card`: 14px to 16px
  - `--shadow-card-lift`: `0 6px 20px rgba(20,20,43,.08)` to `0 5px 15px rgba(53,87,97,.12)`
  - `--color-period-day-fg`: `#a85a0f` to `#c96f15`
  - `--color-period-evening-fg`: `#1e7373` to `#268b8b`
  - `--color-period-night-bg`: `#ffc9fa` to `#f5dffa`
  - Added `--color-period-good-bg/fg` (`#dbf9e2`/`#268b8b`) and
    `--color-period-warn-bg/fg` (`#fde4e1`/`#b42318`) for coordinator
    coverage-gap/approval states
- [x] **Home, nurse** (`src/pages/Home.jsx`), 2026-09-11. Was already
  mostly ported (from `MainHorizontalTiles.dc.html`); this pass fixed
  remaining fidelity gaps:
  - `TodayHero`/`ShiftProgress` restructured: unit/credential line moved
    into the progress row's right column (the mockup never had it as its
    own line under the time), added the hourglass icon
  - Numeric fixes: `status-main` and Weekly Progress stat values now
    font-semibold, tracking-[-0.02em], at the mockup's sizes (25px, 26px).
    Were font-bold, -0.01em, 22px.
- [x] **Home, coordinator** (`src/pages/Home.jsx`), 2026-09-11. Full
  rebuild, replacing the old flat `CoordinatorSummary` (plain cards, no
  gradient) with `CoverageHero`, `CoordinatorStatRow`,
  `CoordinatorQuickActions`, `CoverageGapRow`, per `CoordinatorHome.dc.html`.
  Now shares the same gradient header as nurse Home.
- [x] **Schedule, My Shifts + Team Schedule** (`src/pages/Schedule.jsx`),
  2026-09-11. Both list and calendar views, both sub-tabs:
  - New shared `src/components/ui/period-tag.jsx`: colored `PeriodTag`
    (Day/Evening/Night/Personal, extracted from Home's original local one
    now that Schedule needs it too) and `ShiftStatusTag` (pending/offered
    chips, not in any mockup, restyled to match rather than left on the old
    two-color pill). `ui/pill.jsx` untouched — still used by ShiftDetail/Pool.
  - Added `--color-period-personal-bg/fg` (`#e4ecfe`/`#3556c7`) token pair.
  - Every shift/day-off/personal-event row that used to carry its own
    border+shadow+radius now folds into one shared `.shift-list`-style
    grouped container per week/day (new `SHIFT_LIST_CLASSNAME`/
    `ShiftListDivider` helpers) with row dividers between — matches the
    Linear Light grouped-list pattern used everywhere else.
  - Dropped `border-dashed` from every personal-event row (My Shifts list,
    My Shifts calendar, Team Schedule calendar) per the standing
    no-dashed-borders-for-personal rule.
  - `MyDayOffRow` upgraded from a condensed one-liner to the full
    date-col/divider row layout, matching the day-off rule established in
    Claims/Swaps.
  - Calendar day-dots recolored from flat gray count-dots to per-period
    colored dots (day/evening/night filled, personal/open as rings), capped
    at 3 (new `getDayDots`/`CAL_DOT_CLASSNAME`).
  - Team Schedule's list flattened from per-time-slot nested-avatar cards to
    one flat `.shift-card` row per shift/person (removed now-dead
    `groupByTimeSlot`/`DayOffRow`), matching every other list in the app.
    Added the mockup's teal `.match` highlight + inline "Same Unit X, time
    as you" note (`TeamMatchNote`) for a team shift matching the viewer's
    own unit+time that day — required threading `user` into `TeamScheduleTab`
    (both call sites) since it had none before.
  - Team Schedule's zero-shift days now show a plain muted "No shifts
    scheduled" line instead of the old accent-bar `DayOffRow` card.
- [ ] Claims / Pool (`ClaimShiftsLinearLight`, `ClaimStatusList/Pending/ApprovedLinearLight`)
- [ ] Swaps (net-new: no live backend or UI exists at all yet)
- [ ] Offer Shift (`PostShiftLinearLight`, `OfferShiftConfirm/Status/Claimed/PickedUpLinearLight`)
- [ ] Coordinator Manage / Approvals / Staff Roster / Departments / Duplicate Week
- [ ] Profile / Notifications
- [ ] Shift Detail (Mine / Open / Edit)
- [ ] Personal Events (Add / Edit): mostly ported already via
  `PersonalEventPanel.jsx`, needs a token-fidelity pass like Home got

## Decisions made / deviations worth knowing about

- **Nurse Home built on `MainHorizontalTiles.dc.html`** (icon-left quick
  tiles), not `Main.dc.html` (icon-top). Matches what was already shipped
  live before this pass (confirmed against `2b8d563`'s commit message).
- **Card radius/shadow normalized to the later, more mature Linear Light
  values app-wide**, not Home's own `.dc.html` files' original spec. Home's
  own mockups (`Main`/`MainHorizontalTiles`/`CoordinatorHome.dc.html`) still
  say 12px radius, `rgba(53,87,97,.10)`. They predate the standardization
  that happened once Schedule/Claims/Swaps/etc. were built (2026-09-10/11)
  and were never retrofitted. Since every remaining flow will use the later
  16px/`.12` values, the shared tokens were updated to that now rather than
  matching Home's stale numbers, so the whole app converges on one look as
  more flows land instead of Home being a visible outlier. Flag to the user
  if this wasn't the intended call.
- **Coordinator quick-action tiles (Approvals, Post Shift, Manage) all
  route to the Manage tab** (`onGoToManage`) for now. There's no dedicated
  Approvals screen live yet, and `ManageTab` (`Schedule.jsx`) takes no props
  to deep-link to a specific section (e.g. jump straight to the post-shift
  form or scroll to pending claims). Revisit once Coordinator
  Manage/Approvals is actually built out; likely needs `ManageTab` to
  accept an `initialSection` prop.
- **Coordinator bell has no unread-notification dot.** The mockup shows one,
  but coordinator notifications aren't wired up live (`Home.jsx`'s
  `notificationsQuery` short-circuits to `[]` for coordinators). Add the dot
  once coordinator notifications ship; don't fake it with static state.
- **Coverage Gaps list shows only date plus "No nurse assigned"**, real
  data. The mockup's fictional per-slot detail ("Unit 2, Night shift") isn't
  derivable live without the Departments/staffing-pattern feature (not
  built, see `HANDOFF.md` section 6.1 in the design repo). Revisit once
  that exists.
- **Two different "gap" numbers coexist on purpose**: the coverage hero's
  "N Gaps" pill is *today's* shift fill rate (shifts with status
  open/pending vs. scheduled, computed from `shifts.status`); the stat row's
  "Unstaffed" number and the Coverage Gaps list are the *next 7 days* with
  zero shifts scheduled at all (pre-existing `unstaffedDates` logic, kept
  as-is). Don't conflate these if you touch either.
- **Approvals count** comes from `shift_claims` where `status = 'pending'`
  (same table/status `Schedule.jsx`'s `ManageTab` already queries for its
  pending-claims list). Reuse this query, don't invent a new one.
- **`ShiftStatusTag`'s "offered" color is invented**, not from any mockup —
  none of the 4 Schedule screens show a pending/offered chip at all. Kept
  neutral gray (no established color exists for it anywhere in the app) so
  it doesn't imply a status meaning that isn't real. Revisit if a future
  flow (e.g. Offer Shift) establishes a real color for "offered".
- **Team Schedule's zero-shift-day text ("No shifts scheduled") is
  genericized**, not the mockup's literal "No other shifts scheduled at
  Burlingame" — the workspace name isn't threaded into `TeamScheduleTab` as
  data, and hardcoding "Burlingame" would break for any other workspace.
  Revisit if workspace name becomes available there.
- **Match-highlight logic added net-new**: `TeamScheduleTab` had no `user`
  prop before this pass (needed it for nothing). Now threaded through both
  call sites (nested nurse case in `ScheduleTab`, standalone coordinator
  case in `Schedule()`) so a team shift can be compared against the
  viewer's own same-day shift (same unit + exact start/end = match, only
  against non-open/non-pending shifts). No-ops harmlessly for coordinators,
  who don't have shifts of their own to match against.

## Open product decisions (carried over from `HANDOFF.md`, still relevant)

- Section 0.3, Offer-shift: mockup's 4-screen stepper vs. the live 1-tap
  toggle, unresolved. Blocks a faithful Offer Shift flow port until decided.
- Swaps has no live backend at all (no `shift_claims`-equivalent table for
  swaps). Needs schema work (`HANDOFF.md` section 6.3) before any UI can be
  built.
- Departments/multi-tenancy detail is needed for the Staff
  Roster/Departments flow and for richer (per-unit) coverage-gap detail.

## How to resume this in a new session

1. Read this file's Status section for what's done and left, and check
   `git log` here for anything since the dates above.
2. Confirm the next flow with the user. Don't just assume the list order
   still holds; priorities may have shifted.
3. Read the flow's `.dc.html` files in
   `~/shiftko-design-v2-visual-pass-dup/home-linear-light/` for exact
   spec, and that repo's `shiftko_v2_linear_light_ui_update.md` memory
   (path above) for established shared vocabulary before inventing new CSS
   classes.
4. Draft the file list and plan, and wait for the user's approval before
   building, per the vault's standing rule.
5. Verify visually with `npm run dev` plus claude-in-chrome, signed in as
   both a nurse and (where relevant) a coordinator test account. Ask the
   user for credentials if you don't have working ones; don't guess
   passwords more than once or twice before asking.
6. Commit one feature at a time, then run `graphify update .` from
   `~/shiftko` after each commit.
7. Update this file's Status checklist and "Decisions made" section, and
   the vault's matching plan doc, in the same commit as the flow's code.
