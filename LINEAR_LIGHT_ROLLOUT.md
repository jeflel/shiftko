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
- [x] **Claims / Pool** (`src/pages/Pool.jsx`, new `ClaimStatusList.jsx`/
  `ClaimStatusDetail.jsx`), 2026-09-11. Restyled Pool and built the My
  Claims Status list + detail screens, which had no live equivalent before
  this pass:
  - Pool converted to the grouped `shift-list`/`shift-card` container with
    `PeriodTag`, matching `ClaimShiftsLinearLight.dc.html`. Kept the
    existing inline Claim/Withdraw buttons rather than the mockup's
    chevron-only/push-to-detail model (mockup treats Pool as a pushed
    screen; live Pool is the tab root and its inline actions are already
    tested, and this is a visual pass, not a behavior change).
  - New `src/components/ui/nav-row.jsx` (`NavRow`): first live build of the
    `.back-btn`/`.nav-row` pushed-screen header. ShiftDetail should adopt
    this when it's ported instead of its current plain back button.
  - New `src/components/ui/status-tag.jsx` (`ClaimStatusTag`):
    pending/approved/denied pills. Pending reuses `--color-teal-tint`/
    `--color-teal-foreground` exactly; added new exact tokens for approved
    (`--color-status-approved-bg/fg`, `#dcf3e1`/`#1f8a4c`) and denied
    (`--color-status-denied-bg/fg`, `#fbe4e1`/`#b23b3b`) rather than reuse
    the close-but-different `period-good`/`period-warn` pair.
  - Extracted `SHIFT_LIST_CLASSNAME`/`ShiftListDivider` out of
    `Schedule.jsx` into shared `src/components/ui/shift-list.jsx` once Pool
    and Claim Status needed the same grouped-list container a third place;
    `Schedule.jsx` now imports it instead of defining it locally.
  - New `ClaimStatusList.jsx`: Pending/Resolved sections from `shift_claims`
    for the signed-in nurse, joined to `shifts`.
  - New `ClaimStatusDetail.jsx`: 3-step stepper + hero-card, branching by
    status. Pending shows the mockup's explainer card + "Cancel Claim"
    (same delete as Pool's withdraw). Approved shows "Approved by your
    coordinator" + "Back to Schedule" (wired to the existing
    `onGoToSchedule` callback, threaded through `App.jsx` → `Pool` →
    `ClaimStatusList` → `ClaimStatusDetail`).
  - **Denied has no mockup at all**, so this extends the Approved screen's
    shape: stepper's third step and progress bar turn red instead of
    reaching "Approved", status banner reads "Not approved. The shift
    stayed open", and the real `denial_message` column (already written by
    `Schedule.jsx`'s coordinator approve/deny flow) is shown in an
    explainer card instead of a fabricated coworker-row. Button is "Done"
    (returns to the list) rather than the invented "Back to Pool" from the
    original plan, which is simpler and doesn't imply a destination that
    isn't actually wired.
  - Entry point to Claim Status is a new icon-button next to the "Pool"
    title (no mockup shows where this lives, since Pool and Claim Status
    were designed as unrelated screens); pushes `ClaimStatusList` as a
    fixed full-screen overlay (`fixed inset-0 z-[100]`, same convention as
    `ShiftDetail.jsx`'s existing overlay), hiding the tabbar to match every
    pushed screen in the mockup set.
  - Verified signed in as both nurse (`maria.santos@relay-test.com`) and
    coordinator (`jefleangelo@gmail.com`): claimed a shift, approved one
    claim and denied another as coordinator, confirmed all three detail
    states (pending/approved/denied) render correctly for both the nurse
    who claimed and (via `alex.ramirez@shiftko.test`, which already had a
    long claim history) a second nurse.
- [x] **Swaps** (`src/components/ui/stepper.jsx`, `status-banner.jsx`,
  `swap-card.jsx`, `selection-row.jsx`; new `src/pages/SwapFlow.jsx`,
  `SwapPickCoworker.jsx`, `SwapPickShift.jsx`, `SwapReview.jsx`,
  `SwapStatusDetail.jsx`, `SwapStatusList.jsx`), 2026-09-11. Net-new
  feature: no live backend or UI existed at all before this pass.
  - **Resolved §0.2's outstanding piece**: kept coordinator-gated, matching
    every `SwapStatus*.dc.html` mockup as drawn (5-state
    `requested → accepted → declined/approved/denied`), not the lighter
    self-scheduling alternative. User's explicit call, 2026-09-11.
  - New migration `supabase/migrations/20260911214324_shift_swaps.sql`:
    `shift_swaps` table + `swap_status` enum exactly per HANDOFF.md §6.3's
    sketch, RLS mirroring `shift_claims`'s model from `CLAUDE.md`'s RLS
    Security Model section (parties read their own rows, coordinators
    `is_coordinator()` ALL, no workspace scoping, matching precedent).
    Applied to the linked production project.
  - Extracted `ClaimStatusDetail.jsx`'s local `ClaimStepper` into a shared
    `Stepper` component (`ui/stepper.jsx`) now that Swaps needed the same
    3-step shape a second time, per the established "duplicate once,
    extract on second use" pattern. Same for its local `StatusBanner`
    (`ui/status-banner.jsx`), extended to support an avatar-initials variant
    for `SwapIncomingRequest`'s "X wants to swap with you" banner.
  - New `ui/swap-card.jsx` (`SwapStack`/`SwapCard`/`SwapConnector`) built
    shared from the start (not duplicate-then-extract) since every Swap
    screen needing it was built in the same commit.
  - `SwapFlow.jsx` owns the pick-coworker → pick-shift → review step state,
    same pattern as `onboarding/OnboardingFlow.jsx`. Entry point: a new
    "Request a swap" button on `ShiftDetail.jsx` (mine, scheduled, not
    past, no pending claim, not already offered), added without a full
    Linear Light reskin of that page, which is still its own future
    checklist item.
  - `SwapStatusDetail.jsx` is one component branching by `(status, viewer
    role)` rather than a separate page per mockup, covers Requested,
    IncomingRequest, Accepted, Approved, and two invented negative states
    (Declined, Denied) that have no mockup at all, extending the Accepted/
    Approved shape the same way Claims' invented Denied did (the stepper's
    relevant step turns red, everything before it stays done).
  - `SwapStatusList.jsx` is net-new (no mockup, same reasoning as
    `ClaimStatusList`): "Awaiting Your Response" (incoming, needs action)
    then every other swap, either side. Entry point: a new icon button in
    `Schedule.jsx`'s sticky header (`ArrowLeftRight`, only shown on the My
    Shifts sub-tab).
  - Coordinator approval: a new "Pending swaps" section in `ManageTab`
    (`Schedule.jsx`), directly mirroring the existing Pending Claims
    section's structure and (still-unported) old-style classes rather than
    Linear Light tokens, since `ManageTab` itself isn't reskinned yet,
    matching the ShiftDetail precedent of a minimal, style-consistent touch
    rather than bundling an unrelated page's reskin into this commit.
  - **Real bug caught during live verification and fixed before commit**:
    `SwapCard`'s avatar initials were computed from the full display label
    ("Ana Florendo's shift") instead of the bare name, producing "AS"
    instead of "AF". Fixed by splitting `SwapCard` into separate
    `personName` (initials source) and `personLabel` (display text) props.
  - Verified signed in as both nurse (`alex.ramirez@shiftko.test`) and
    coordinator (`jefleangelo@gmail.com`): coordinator posted a real test
    shift for a second nurse (no other nurse had any upcoming shift in
    this data), nurse sent a real swap request against it (confirmed the
    INSERT, the RLS select policies, and the FK-embed query shapes all
    work against production), viewed it in Swap Status, then cancelled it
    (confirmed the DELETE + RLS policy). Test shift deleted afterward.
    **Not yet verified live**: an actual Accept/Decline (needs a second
    nurse's login) or the coordinator's Approve/Deny buttons (needs an
    `accepted` swap to test against). Both are code-reviewed and mirror
    the proven Claims flow closely, but click-through verification is
    still open for whenever real swap traffic exists or more test
    credentials are available.
- [x] **Post a Shift (coordinator)**, `PostShiftLinearLight` (`Schedule.jsx`'s
  `ManageTab`), 2026-09-11. Restyle of the existing coordinator form, no
  behavior change beyond two small additions:
  - New `--radius-field` token (14px, first use of the mockup's
    `.field-input`/`.field-textarea` vocabulary) and a locally-scoped
    `fieldInputClassName`, kept separate from the shared `inputClassName`/
    `labelClassName` pair since those are also used by the nurse-facing "Add
    a shift" self-scheduling modal, which has no mockup and isn't part of
    this pass.
  - The "Leave unassigned" checkbox became the shared `SegmentedControl`
    (Leave Open / Assign Nurse), and the Nurse `<select>` now hides
    entirely under "Leave Open" instead of showing disabled, matching the
    mockup. Kept "Unit" as the field label rather than the mockup's
    "Department" since the Departments feature isn't built yet, same
    reasoning as HANDOFF.md's PostShift/ShiftEdit note.
  - Added the mockup's Notes field (`shifts.notes` already existed with no
    UI writing to it).
  - Kept the live SHIFT_PRESETS icon-tile picker (Day/Evening/Night/Custom
    with saved presets) rather than the mockup's plainer 3-way segmented -
    same "visual pass, not a behavior change" call as Pool's inline
    Claim/Withdraw buttons.
- [x] **Offer This Shift (nurse)**, `OfferShiftConfirmLinearLight`,
  `OfferShiftStatusLinearLight` (Offered/Claimed sub-states),
  `OfferShiftPickedUpLinearLight` (as `OfferShiftUpdate.jsx`'s "Shift
  Update"), 2026-09-11. Resolves HANDOFF.md §0.3 in favor of the mockup's
  4-screen stepper over the existing 1-tap toggle - user's explicit call,
  2026-09-11. New `OfferShiftConfirm.jsx`, `OfferShiftStatus.jsx` (also
  exports `CoworkerRow`, reused by `OfferShiftUpdate.jsx`),
  `OfferShiftUpdate.jsx`; `ShiftDetail.jsx`'s old `handleToggleOffer`
  1-tap button split into `canStartOffer` (pushes Confirm) and
  `canViewOfferStatus` (pushes Status) - the two need different gates now,
  since viewing status has to stay reachable even after a coworker's claim
  makes `hasPendingClaim` true.
  - New shared `ui/hero-card.jsx`, extracted from `ClaimStatusDetail.jsx`'s
    local `HeroCard` once this flow needed the same shift-summary card
    shape a second place (added an optional `credential` line Claims never
    used). Extended `shiftFormat.js` with `formatRelativeTime`, extracted
    from `Home.jsx`'s local copy for the same reason.
  - **Schema gap identified in HANDOFF.md §0.3 ("NET-NEW+SCHEMA if kept")**:
    approving a claim on an offered shift overwrites `shifts.nurse_id` with
    the claimant's id (`Schedule.jsx`'s `handleApprove`), so the original
    offering nurse had no durable way to find "their" shift again once it's
    picked up. New migration
    `supabase/migrations/20260911223000_offer_shift_previous_nurse.sql`
    adds `shifts.previous_nurse_id` (set by `handleApprove` when the
    approved claim was on an offered shift) plus an additive RLS policy
    (`previous_nurse_id = auth.uid()`) alongside the existing "nurses see
    own shifts" rule rather than editing it. Applied to the linked
    production project.
  - The Approved/Picked Up terminal state is unreachable from
    `ShiftDetail`/`OfferShiftStatus` (the shift no longer shows up as
    "mine" once `nurse_id` changes), so it only surfaces via a notification
    tap: `Home.jsx`'s `offer_claimed` notification handling, previously
    dead code that only marked notifications read, now also opens
    `OfferShiftUpdate.jsx` (queried by `shiftId` via `previous_nurse_id`).
    Made the notification dropdown's list rows clickable too (previously
    only the single `RequestActivity` hero tile was); other notification
    types still just mark read, unchanged.
  - Verified live signed in as nurse `alex.ramirez@shiftko.test`: offered a
    real shift, confirmed the Confirm -> Status(Offered) -> Withdraw loop
    round-trips correctly (`is_offered` toggles, entry point button swaps
    between "Offer this shift" and "View offer status", "Request a swap"
    correctly hidden while offered). **Not yet click-verified**: the
    Claimed sub-state, coordinator approval, and the Picked Up/notification
    path all need a second nurse account to claim the shift - same
    limitation noted for Swaps' Accept/Decline. Code-reviewed but unverified
    live until a second test account claims a real offered shift.
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

- ~~Section 0.3, Offer-shift: mockup's 4-screen stepper vs. the live 1-tap
  toggle~~ resolved 2026-09-11: kept the 4-screen stepper, user's explicit
  call. See the Status section's Offer This Shift entry above for the full
  decisions log, including the schema gap this uncovered.
- ~~Swaps has no live backend at all~~ resolved 2026-09-11: kept
  coordinator-gated per the mockups, `shift_swaps` table + RLS built and
  live. See the Status section's Swaps entry above for the full decisions
  log.
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
