# Linear Light rollout — live app implementation plan

**Goal:** bring shiftko.com's live UI to the "Linear Light" design system —
Inter typography, 16px card radii, soft `rgba(53,87,97,.12)` shadow lift,
colored period/status tag pills — replacing the current ink/white v2 system
screen by screen. This supersedes/extends the earlier v2 reskin (see
`HANDOFF.md` in `~/shiftko-design-v2-visual-pass-dup`, which mapped the
*previous* design pass onto the live app and already shipped nurse-only).

**Design source:** `home-linear-light/` in
`~/shiftko-design-v2-visual-pass-dup` (a git repo, sibling to this one) — 37
`.dc.html` mockup screens across 8 flows, published as the Claude Design
canvas artifact **"Shiftko Home — Linear Light"**
(`17d938e1-d2c1-4982-b4bb-ca72691e398b`). That repo's memory file
`shiftko-v2-linear-light-ui-update` documents the established shared CSS
vocabulary (period-tag, status-tag, `.btn`/`.btn-primary`, `.field-group`,
grouped-list patterns, etc.) — read it before building a new flow so screens
reuse vocabulary instead of inventing parallel patterns.

Work happens flow by flow, each as its own session-sized chunk. Order below
is what the user asked for (home first, then schedules, then the rest) —
re-check with the user before assuming the remaining order still holds.

## Status

- [x] **Design tokens** (`src/tailwind.css`) — 2026-09-11
  - `--radius-card`: 14px → 16px
  - `--shadow-card-lift`: `0 6px 20px rgba(20,20,43,.08)` → `0 5px 15px rgba(53,87,97,.12)`
  - `--color-period-day-fg`: `#a85a0f` → `#c96f15`
  - `--color-period-evening-fg`: `#1e7373` → `#268b8b`
  - `--color-period-night-bg`: `#ffc9fa` → `#f5dffa`
  - Added `--color-period-good-bg/fg` (`#dbf9e2`/`#268b8b`) and
    `--color-period-warn-bg/fg` (`#fde4e1`/`#b42318`) for coordinator
    coverage-gap/approval states
- [x] **Home — nurse** (`src/pages/Home.jsx`) — 2026-09-11. Was already
  mostly ported (from `MainHorizontalTiles.dc.html`); this pass fixed
  remaining fidelity gaps:
  - `TodayHero`/`ShiftProgress` restructured — unit/credential line moved
    into the progress row's right column (mockup never had it as its own
    line under the time), added the hourglass icon
  - Numeric fixes: `status-main` and Weekly Progress stat values now
    font-semibold/tracking-[-0.02em] at the mockup's sizes (25px, 26px) —
    were font-bold/-0.01em/22px
- [x] **Home — coordinator** (`src/pages/Home.jsx`) — 2026-09-11. Full
  rebuild, replacing the old flat `CoordinatorSummary` (plain cards, no
  gradient) with `CoverageHero` / `CoordinatorStatRow` /
  `CoordinatorQuickActions` / `CoverageGapRow`, per `CoordinatorHome.dc.html`.
  Now shares the same gradient header as nurse Home.
- [ ] Schedule — My Shifts (list + calendar views)
- [ ] Schedule — Team Schedule (list + calendar views)
- [ ] Claims / Pool (`ClaimShiftsLinearLight`, `ClaimStatusList/Pending/ApprovedLinearLight`)
- [ ] Swaps (**net-new** — no live backend or UI exists at all yet)
- [ ] Offer Shift (`PostShiftLinearLight`, `OfferShiftConfirm/Status/Claimed/PickedUpLinearLight`)
- [ ] Coordinator Manage / Approvals / Staff Roster / Departments / Duplicate Week
- [ ] Profile / Notifications
- [ ] Shift Detail (Mine / Open / Edit)
- [ ] Personal Events (Add / Edit) — mostly ported already via `PersonalEventPanel.jsx`, needs a token-fidelity pass like Home got

## Decisions made / deviations worth knowing about

- **Nurse Home built on `MainHorizontalTiles.dc.html`** (icon-left quick
  tiles), not `Main.dc.html` (icon-top) — matches what was already shipped
  live before this pass (confirmed against `2b8d563`'s commit message).
- **Card radius/shadow normalized to the *later*, more mature Linear Light
  values app-wide**, not Home's own `.dc.html` files' original spec. Home's
  own mockups (`Main`/`MainHorizontalTiles`/`CoordinatorHome.dc.html`) still
  say 12px radius / `rgba(53,87,97,.10)` — they predate the standardization
  that happened once Schedule/Claims/Swaps/etc. were built (2026-09-10/11)
  and were never retrofitted. Since every remaining flow will use the later
  16px/`.12` values, the shared tokens were updated to that now rather than
  matching Home's stale numbers — so the whole app converges on one look as
  more flows land, instead of Home being a visible outlier. Flag to the user
  if this wasn't the intended call.
- **Coordinator quick-action tiles (Approvals / Post Shift / Manage) all
  route to the Manage tab** (`onGoToManage`) for now. There's no dedicated
  Approvals screen live yet, and `ManageTab` (`Schedule.jsx`) takes no props
  to deep-link to a specific section (e.g. jump straight to the post-shift
  form or scroll to pending claims). Revisit once Coordinator
  Manage/Approvals is actually built out — likely needs `ManageTab` to
  accept an `initialSection` prop.
- **Coordinator bell has no unread-notification dot.** The mockup shows one,
  but coordinator notifications aren't wired up live (`Home.jsx`'s
  `notificationsQuery` short-circuits to `[]` for coordinators). Add the dot
  once coordinator notifications ship — don't fake it with static state.
- **Coverage Gaps list shows only date + "No nurse assigned"** — real data.
  The mockup's fictional per-slot detail ("Unit 2 · Night shift") isn't
  derivable live without the Departments/staffing-pattern feature (not
  built — see `HANDOFF.md` §6.1 in the design repo). Revisit once that
  exists.
- **Two different "gap" numbers coexist on purpose**: the coverage hero's
  "N Gaps" pill is *today's* shift fill rate (shifts with status
  open/pending vs. scheduled, computed from `shifts.status`); the stat row's
  "Unstaffed" number and the Coverage Gaps list are the *next 7 days* with
  zero shifts scheduled at all (pre-existing `unstaffedDates` logic, kept
  as-is). Don't conflate these if you touch either.
- **Approvals count** comes from `shift_claims` where `status = 'pending'`
  (same table/status Schedule.jsx's `ManageTab` already queries for its
  pending-claims list) — reuse this query, don't invent a new one.

## Open product decisions (carried over from `HANDOFF.md`, still relevant)

- §0.3 Offer-shift: mockup's 4-screen stepper vs. the live 1-tap toggle —
  unresolved. Blocks a faithful Offer Shift flow port until decided.
- Swaps has no live backend at all (no `shift_claims`-equivalent table for
  swaps) — needs schema work (`HANDOFF.md` §6.3) before any UI can be built.
- Departments/multi-tenancy detail is needed for the Staff
  Roster/Departments flow and for richer (per-unit) coverage-gap detail.

## How to resume this in a new session

1. Read this file's Status section for what's done/left, and check
   `git log` here for anything since the dates above.
2. Confirm the next flow with the user (don't just assume the list order
   still holds — priorities may have shifted).
3. Read the flow's `.dc.html` files in
   `~/shiftko-design-v2-visual-pass-dup/home-linear-light/` for exact
   spec, and that repo's `shiftko-v2-linear-light-ui-update` memory for
   established shared vocabulary before inventing new CSS classes.
4. Verify visually with `npm run dev` + claude-in-chrome, signed in as both
   a nurse and (where relevant) a coordinator test account — ask the user
   for credentials if you don't have working ones; don't guess passwords
   more than once or twice before asking.
5. Update this file's Status checklist and "Decisions made" section in the
   same commit as the flow's code.
