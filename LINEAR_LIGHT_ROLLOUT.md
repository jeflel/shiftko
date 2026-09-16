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
  - Fidelity follow-up, 2026-09-12: the mockup's gradient header (both
    nurse variants and `CoordinatorHome.dc.html`) had its top safe-area
    tightened (`safe-top` 42px to 16px, `.topbar` margin-top 12px to 6px)
    after the design canvas was flagged for an oversized empty band above
    the avatar/wordmark/bell row. Ported the equivalent to live's shared
    gradient header div: `pt-10` to `pt-4` (same ~40% ratio). The
    mockup's separate `225px` to `203px` fixed-background-height tweak has
    no live equivalent (live's gradient is sized by the header div's own
    content, not a longer background layer a card floats over) and wasn't
    ported.
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
- [x] **Coordinator Manage / Approvals / Staff Roster / Duplicate Week**,
  `PostShift.jsx`, `CoordinatorApprovals.jsx`, `StaffRoster.jsx`,
  `DuplicateWeek.jsx`, `CoordinatorManage.jsx`, 2026-09-12. Restructured
  Schedule.jsx's old single "Manage" tab (Post a Shift form inline, then
  Recent Shifts/Pending Claims/Pending Swaps/Duplicate a Week stacked below
  it, plus a separate "Staff" tab) into five pushed screens matching the
  mockups' actual navigation shape, per the user's explicit call to match
  the mockups over keeping today's structure:
  - **Correction mid-session**: this bullet was assumed to be mostly
    net-new feature work (Staff Roster, Duplicate Week, Approvals "don't
    exist live"). Wrong for two of them - a bad initial grep missed
    `StaffTab` (a full working Staff tab with weekly stats and inline
    edit) and the "Duplicate a week" section (full working source/dest
    week copy logic), both already live inside `ManageTab`/Schedule's
    tabbar. Only **Departments** turned out to be genuinely unbuilt. Once
    caught, all five screens were done in one session since four of them
    were relocations of working code, not new builds.
  - `PostShift.jsx`: Post a Shift form, moved out as-is (already Linear
    Light styled from the earlier Offer Shift flow commit). Reachable both
    directly from Home's Post Shift tile and from `CoordinatorManage`'s own
    CTA - these are two different entry points needing different back
    targets, handled with a small `postShiftReturnTo` state in `App.jsx`
    rather than always returning to Home (caught by live click-through
    testing, not by review - the first wiring silently sent Manage's Post
    a Shift back button to Home instead of back to Manage).
  - `CoordinatorApprovals.jsx`: Pending claims + Pending swaps, moved out
    with approve/deny logic unchanged. Flattened claim groups to one
    approval-card per claim (mockup's shape) instead of one card per shift
    with nested claimant rows, dropping the old "RECENT" badge that only
    made sense in the nested view. Swap cards keep full date/time/period
    per side rather than the mockup's terser "Mon 15 Day" text, since that
    detail matters for an approve/deny decision.
  - `StaffRoster.jsx`: built from `StaffTab` (the fuller of the two staff
    implementations - see below), not the plain per-row-shadow version.
    Added the mockup's search input and unit-filter tabs as pure
    client-side filtering (no new query), defaulting to an "All" tab
    rather than the mockup's first-unit default. The mockup's "Add Staff"
    button has no live backend (no invite/create-staff flow exists) and
    wasn't built.
  - **Dead code found and deleted, not ported**: `ManageTab` had its own
    second, older, redundant "Staff" section at the very end (a
    simpler home-unit-only editor, superseded by the real `StaffTab` but
    never removed). Confirmed unused before deleting.
  - `DuplicateWeek.jsx`: source/dest week pickers + conflict-count confirm
    card, moved out with the same copy logic. The mockup supports multiple
    destination weeks at once ("Copy To" list, "Add another week" link);
    live only ever supported one source and one destination week, kept
    as-is since that's a real feature gap, not a visual detail, and out of
    scope for a reskin pass. Kept the native date inputs rather than
    mimicking the mockup's tappable "week-picker" card, which implies a
    picker sheet that doesn't exist live.
  - `CoordinatorManage.jsx`: the hub - Post a Shift CTA, Upcoming Shifts,
    Tools list (Duplicate a Week, Staff, Departments). "Recent shifts"
    (`order('created_at', desc)` - whatever was posted most recently) was
    renamed and requeried as "Upcoming Shifts" (`order('starts_at', asc)`,
    filtered to today-or-later) to match the mockup's actual content - a
    query semantics change, not just visual. Kept both edit and delete
    icons per shift row (mockup only draws edit) since delete is real,
    tested functionality already live. **Departments stays a disabled
    "Soon" row** - no table, no UI, matches the already-carried-over open
    decision below.
  - Schedule.jsx's coordinator tab bar simplified from three tabs (Team
    Schedule / Manage / Staff) down to one (Team Schedule), so the tab
    strip no longer renders for coordinators either (`tabs.length > 1` is
    now false for both roles) - Manage and Staff are reachable only from
    Home/the hub now.
  - New `src/lib/shiftPresets.js` (`SHIFT_PRESETS`/`buildShiftTimes`),
    `src/lib/manageFormat.js` (`getInitials`/`formatTimeAgo`/
    `formatWeekRangeLabel`), `src/components/ui/field.jsx`
    (`inputClassName`/`labelClassName`/`fieldInputClassName`) - shared
    across the five new pages and Schedule.jsx's remaining
    `AddMyShiftPanel` (nurse self-scheduling), which still needs
    `SHIFT_PRESETS`/`buildShiftTimes`/`inputClassName`/`labelClassName`.
    Schedule.jsx's own copies of these (plus the now fully-dead
    `getInitials`/`formatTimeAgo`/`formatWeekRangeLabel`/`ShiftCard`/
    `ShiftTimeLabel`/`ShiftDateColumn`, orphaned once `ManageTab`/
    `StaffTab` were removed) were deleted in favor of importing from the
    shared modules.
  - Verified live signed in as nurse `alex.ramirez@shiftko.test` (no
    coordinator credentials were available this session): all five screens
    render correctly against real data by force-mounting them via a
    temporary `?debugTab=` query param in `App.jsx` (added, verified,
    then fully reverted - never committed). Confirmed Upcoming Shifts'
    edit/delete, Staff's inline edit-expand, and Duplicate Week's full
    review -> conflict-warning -> cancel flow all work against production
    data (didn't confirm the actual copy, to avoid writing duplicate test
    shifts).
  - **Coordinator-session click-through completed 2026-09-12**, signed in
    as `jefleangelo@gmail.com`: all three real Home tile entry points
    (Approvals/Post Shift/Manage) route correctly from the coordinator's
    actual Home (not the debug param). Staff (51 real staff, search +
    unit filter) and Duplicate Week's form both load real data. Approvals
    end-to-end verified against a real pending claim: signed in separately
    as nurse `maria.santos@relay-test.com`, claimed an open Sat 8/15 Night
    shift from Pool, then back in the coordinator session the Home tile's
    badge updated live (0 to 1 waiting), the Approvals screen showed
    "Maria Santos wants this shift", Approve resolved it, and the tile
    badge returned to 0. Coordinator Approve/Deny on swaps still untested
    (needs a real `accepted`-status swap, not just a claim) - same
    limitation noted in the Swaps entry above.
- [x] **Profile** (`src/pages/Profile.jsx`), 2026-09-12. Restyle plus
  real net-new settings features, not a pure reskin (user's explicit
  call: "anything missing we build it", not skip).
  - Restyle commit (`f0e4842`): identity header down to the mockup's
    56px avatar, Account block converted to the grouped
    `SHIFT_LIST_CLASSNAME`/`ShiftListDivider` container (reused from
    `shift-list.jsx`, not reinvented), Workspace block's existing
    join/leave logic wrapped in the same grouped-list treatment
    untouched, Sign Out restyled to the `.btn.btn-secondary` spec.
    Tabbar left exactly as-is per the standing exception (see
    "Standing rules" below) - mockups are the decided design source
    for every element except the tabbar/navbar, which always stays the
    live implementation.
  - Feature commit (`61112cc`): three settings the mockup shows but
    live never built - Change Password (real
    `supabase.auth.updateUser({ password })` call, inline expand form
    reusing the file's existing `openAction` toggle pattern), Connected
    Accounts (read-only, derived from the real signed-in user's
    `identities` array via `supabase.auth.getUser()`, shows "None" for
    password-only accounts, not invented state), Delete Account (new
    Supabase Edge Function `supabase/functions/delete-account/index.ts`,
    commit `0fdd151`, verifies caller identity from their own JWT before
    using the service role key to delete only that verified caller,
    confirmed `profiles.id -> auth.users(id)` is `ON DELETE CASCADE`
    directly against the production DB via `supabase db query --linked`
    before trusting the cascade). Delete requires typing DELETE to
    enable the confirm button, mirroring a type-to-confirm pattern for
    irreversible actions.
  - Explicitly NOT built this pass: Push Notifications toggle, New Open
    Shifts Alert toggle. Both need push infrastructure (service worker,
    VAPID keypair, a subscriptions table, and trigger wiring across
    shift/claim/approval flows) that doesn't exist yet and is out of
    scope for a Profile-screen feature add. Scoped as its own future
    follow-up, not skipped silently.
  - Verified live signed in as `derek.okafor@relay-test.com`: Change
    Password expands/collapses, Connected Accounts correctly shows "None"
    for this password-only account, Delete Account's confirm button is
    disabled by default and only enables after typing DELETE exactly,
    cancelled without actually invoking the delete function (didn't want
    to destroy a seeded test account without an explicit go-ahead). The
    Edge Function itself was verified independently at the database
    level (cascade check) rather than via a real delete.
    - **Follow-up fix (commit `383c3bc`), 2026-09-12**: a direct side by
      side comparison against the actual mockup file (not a prose
      description of it) found the first pass was not 1:1 despite
      looking visually correct. Three real gaps: (1) the mockup's
      standalone "Facility" settings-list row (icon + real workspace
      name) was missing entirely, added above the Account block, pulling
      from the same `workspace` state the Workspace block already uses,
      not hardcoded; (2) the Account block showed Email/Credential/Home
      unit instead of the mockup's exact Name/Role/Credential/Home
      Department (4 rows, `role` added to the existing profile query,
      Email dropped from display since it has no mockup row - flagged,
      not silently removed; Name renders without the mockup's chevron
      since no edit-name flow exists yet - also flagged as a deliberate
      simplification); (3) Sign Out and Delete Account were in the wrong
      order, swapped to match Sign Out then Delete Account. Root cause:
      the fix pass that built this was driven by a prose description of
      the mockup rather than the agent reading the actual `.dc.html`
      file's real markup/CSS directly - the corrected pass quoted the
      mockup's exact HTML in the prompt instead, which is now the
      required method going forward (see the rollout doc's "Core
      method" section, point 2).
- [x] **Notifications (dedicated page)** (`Notifications.jsx` new,
  `Home.jsx`), 2026-09-12. The last flow. Until now there was no
  Notifications page at all, only an inline bell dropdown in `Home.jsx`.
  Built per the mockup: a pushed screen with an inline nav header (back +
  "Notifications" + "Mark all read"), "New" (unread) and "Earlier" (read)
  grouped lists, and the mockup's notif-icon variants (swap = teal tint,
  success/muted = neutral square) mapped from the real notification types
  (`swap_requested`/`swap_approved` -> swap, `claim_approved`/`offer_claimed`
  -> success, `claim_denied`/`swap_denied` -> muted).
  - **The bell dropdown is gone**: tapping the bell (and Home's "Request
    Activity" View All) opens the full page, per the mockup. User's explicit
    call over keeping both.
  - **Auto-mark-read removed**: previously, merely opening the bell marked
    every unread notification read. The mockup's "Mark all read" action is
    now the only thing that does, otherwise the "New" section would always
    be empty. User's explicit call.
  - **Chevron only where it navigates**: only `offer_claimed` rows actually
    go somewhere (they open `OfferShiftUpdate`); the mockup draws a chevron
    on every row, but a chevron on a dead row is a false affordance, so
    other rows get none. User's explicit call.
  - "Mark all read" renders only when there are unread notifications (a
    small deliberate deviation from the mockup, which always draws it).
  - The page is presentational: `Home.jsx` still owns the notification
    fetch, the mark-read write, and the `offer_claimed` navigation, and
    renders the page as an early-return overlay (same pattern as
    ShiftDetail). `NavRow` was NOT modified - the mockup's header needs a
    trailing action it does not support, so this page builds its header
    inline (`NavRow` is imported by 18 files).
  - Coordinators get an empty list (notifications still are not wired for
    coordinators - unchanged from before).
  - Verified at the code level only: build clean, diff reviewed, graphify
    updated. No live click-through (same browser/password limitation as the
    other flows).
- [x] **Shift Detail (Mine / Open / Edit)** (`ShiftDetail.jsx`,
  `hero-card.jsx`, `ShiftForm.jsx`, `ShiftEdit.jsx`, `CoordinatorManage.jsx`,
  `App.jsx`, `lib/claims.js`, `Pool.jsx`, `Schedule.jsx`), 2026-09-12. All
  three mockup screens, built in four stages, each routed to DeepSeek
  v4.1-flash and reviewed before commit:
  - **Mine** (`9665e4a`): adopted the shared `NavRow` (bare back button, no
    title) and `HeroCard`; dropped the `Users` icon and the row dividers from
    "Working with"; coworker rows now carry one "credential · time" meta
    line; actions moved to a bottom actions-bar in the mockup's order and
    emphasis (Request a swap primary, Offer this shift secondary); page
    ground switched to `bg-page-ground`. Also fixed `HeroCard`'s padding to
    the mockup's `18px 16px` (was 16px all round), which converges Claims and
    Offer Shift too.
  - **Edit** (`23bd7d2`, `e2c273f`): the coordinator's inline edit form in
    the Manage hub is gone, replaced by a pushed `ShiftEdit` screen per the
    mockup. To avoid a second copy of the form, Post a Shift's form was
    extracted into a shared `ShiftForm` (mode="create" | "edit"); `PostShift`
    is now a thin shell. The hub's per-row delete icon was dropped (the
    mockup draws edit only) since delete now lives in Edit Shift as "Remove
    Shift". Two real bugs found in review and fixed: the edit path snapped
    any non-preset shift's times to the nearest Day/Evening/Night preset on
    save (silently rewriting its hours) - it now falls back to 'custom' when
    the times don't match a preset exactly; and the Manage hub's Upcoming
    Shifts query did not select `notes`, so an edit would have blanked a
    shift's notes.
  - **Open** (`443061c`, `7a62c17`): built the mockup's open-shift screen - a
    "Claim this shift" primary CTA on ShiftDetail (hero subline "No nurse
    assigned yet") plus a Requested/Withdraw state mirroring Pool's
    established pattern. Pool's claim insert/delete were extracted into a
    shared `src/lib/claims.js` (second use). ShiftDetail loads the viewer's
    own pending claim to drive that state.
  - **Entry point**: Team Schedule's "Open · tap to claim" rows (list and
    calendar) are now tappable and open Shift Detail; previously they were
    plain rows that never linked out. Claiming is gated on the viewer being a
    nurse (`role === 'nurse'`), because Team Schedule also renders for
    coordinators and an ungated CTA would let a coordinator create a claim.
  - **Known deviation**: `ShiftEdit` deliberately reuses Post a Shift's live
    form, so it inherits Post a Shift's own live deviations from its mockup
    (inline `CalendarStrip` date picker, icon-tile shift presets,
    saved-presets strip) rather than the mockup's single-row Date field and
    Day/Evening/Night segmented control. Same form was the user's explicit
    call (DRY over a duplicated form).
  - Verified at the code level only: `npm run build` clean after every stage,
    each stage's diff reviewed, `graphify` updated per commit. The live
    signed-in click-through was NOT done (the browser tool refuses passwords
    and the vault save was declined - same limitation as Personal Events).
    Open items to check on a real device: the claim/withdraw round trip from
    Team Schedule, the Edit Shift save/remove round trip as a coordinator,
    and that a coordinator sees no claim CTA.
- [x] **Personal Events (Add / Edit)** (`PersonalEventPanel.jsx`,
  `personalEvents.js`, `ui/segmented-control.jsx`), 2026-09-12. Token-fidelity
  pass plus two real feature additions, not a pure reskin. Built with
  DeepSeek v4.1-flash via `opencode run` (first production flow built on
  OpenCode instead of Claude Code), then verified at the code level.
  - Token fixes to the mockups' exact values (verified against the
    `.dc.html` files directly): title `text-sm` (14px) to 17px/600/-0.01em;
    field label weight 500 to 600 and letter-spacing 0.025em to 0.05em;
    text/select inputs from `rounded-control` (9px) to the existing
    `rounded-field` token (14px), padding to 12px 14px, weight 500; primary
    button 48px/12px to 50px/16px (overridden on this screen's buttons only,
    the shared `Button` default untouched); Add-mode helper line-height
    1.375 to 1.4.
  - Date field rebuilt to the mockup's shape (user's explicit call, full
    1:1): the inline `CalendarStrip` grid is now a single compact
    `.field-input`-styled row ("Fri, Sep 26, 2026" plus a calendar icon)
    that toggles the existing `CalendarStrip` open as the picker.
  - Match-card built for real (user's explicit call): new
    `getCoworkersOnShift()` in `personalEvents.js` (scheduled shifts on the
    event's unit overlapping its window, `profiles!nurse_id` join, viewer
    excluded), rendered in Edit mode when a unit is set, styled to the
    mockup's teal tint. No RLS change was needed: the existing "nurses see
    unit shifts" policy (migration `20260830070000`) already lets a nurse
    read coworker shifts on her own home unit, and Team Schedule already
    uses the identical profiles join. `CLAUDE.md`'s RLS summary omits that
    policy and first suggested a new one was required, which was wrong.
  - `SegmentedControl` (shared) brought onto the mockup's tokens (track
    `#ededf2` to `#f2f2f7`, track radius 11px to 12px, segment radius 8px to
    9px, added the active-segment `0 1px 2px rgba(20,20,19,.08)` shadow).
    Converges other screens using it (Post Shift) onto the same standard.
  - Verified at the code level: `npm run build` compiles clean, every token
    value checked against the mockup files and `tailwind.css` at source, and
    the full diff reviewed. A placement bug in the build spec (match-card
    was specified below Department, the mockup has it after the time row)
    was caught in review and fixed. Live signed-in click-through was NOT
    done this pass: the browser tool refuses passwords and the vault save
    was declined, so the render check is still open (user chose to commit on
    the code-level verification).

**Rollout complete**: all eight flows are now on the Linear Light system.
The only carried-over item is the Departments feature (still a disabled
"Soon" row), which is a product gap, not a design-fidelity one.

## Post-rollout fixes and additions (2026-09-12, after the first real-device pass)

A real-device test pass by the user turned up one production bug and four
follow-up requests. All shipped the same day, each as its own commit.

- **Bug: Post a Shift showed `permission denied for table saved_shift_presets`.**
  Root cause: the table's own migration (`20260830060246`) enabled RLS and
  added an owner policy but never granted table privileges to the
  `authenticated` role. RLS decides which ROWS a role may touch; the GRANT is
  what lets the role touch the table at all, so every read/write failed
  (SQLSTATE 42501). Fixed by
  `supabase/migrations/20260912233000_grant_saved_shift_presets.sql`
  (additive GRANT only), applied to production and verified with
  `has_table_privilege('authenticated', ...)`. An audit of every public table
  found this was the only real gap (`units`/`facilities` lack grants too, but
  nothing in the app references them). Commit `cbb15bb`.
- **Pool rows now open the shift detail** (`447364d`). Tapping a row's left
  area (date + text) opens ShiftDetail; the inline Claim/Withdraw buttons stay
  outside the tappable area so no button nests inside another. The detail's
  Claim CTA now also covers offered-to-pool shifts (Pool already treated those
  as claimable) and is now additionally blocked for your OWN shift and for
  non-nurses. Known pre-existing quirk left alone: Pool's inline Claim button
  still lets a nurse claim their own offered shift.
- **Personal Events gained a Day/Evening/Night Shift Period picker**
  (`f64e0c9`), net-new rather than a mockup match (the mockups have only the
  Starts/Ends time fields). Picking a period fills the two time inputs with the
  standard shift times; the picker derives its selected state from the times,
  so hand-editing a time simply leaves no segment highlighted.
- **Personal Events gained a detail screen** (`88f9b26`). Tapping an event now
  opens a read-only detail (hero with a Personal tag, plus an "Also on <unit>"
  coworker list) with Edit and Delete, instead of jumping straight into the
  edit form. Required an optional `period` override on the shared `HeroCard`,
  and made `getCoworkersOnShift` return credential + times (it previously
  returned names only, so the list had no meta line to show).
- **Personal events now appear on Home's upcoming list** (`9ceb816`), merged
  with shifts and sorted by start time, on the nurse view only. That section's
  heading changed from "Upcoming Shifts" to "Upcoming" since it is no longer
  shifts only.
- **Noted, not fixed**: `Schedule.jsx` and `PersonalEventPanel.jsx` contain
  pre-existing em dashes in comments (20+ lines), which the project's
  no-em-dash rule forbids. Left alone because they predate this work and
  touching them would bloat unrelated diffs; worth its own cleanup commit.

## Signed-in verification pass (2026-09-12, second pass)

The rollout had only ever been verified at code level. This pass actually
signed in on the live production site and clicked through both roles.
Credentials were typed by the user into masked vault prompts and filled
server-side, so no password was ever handled by the agent or placed in the
repo. Playwright was tried first and abandoned: its browser window opened on
a macOS Space the user could not reach.

**Coordinator pass**: login, Home (coverage, stats, gaps, tiles), Post a Shift
(the form now loads with saved presets and no `permission denied`), Manage hub,
Edit Shift (prefills times, nurse, unit and date correctly), Schedule 4-week
view, Profile.

**Nurse pass**: login, Home, Upcoming, the Notifications page, Pool, the shift
detail opened from a Pool row (including the WORKING WITH coworker rows), the
Day/Evening/Night period picker on Add Personal Event (Night to 23:00-07:30,
Day to 07:00-15:30, Evening to 15:00-23:30, identical to Post a Shift's
presets), personal events appearing in Home's Upcoming list, the personal event
detail screen (hero plus "Also on <unit>" plus Edit/Delete), the Edit panel
prefill, the two-step delete confirm, and the full claim round trip
(Claim this shift, then Requested, then Withdraw).

**Three real bugs found and fixed** (`03b6b10`, `534b8ef`, `c3daca2`):

1. `ShiftForm` displayed stale times. The Shift Period cards set `shift_type`
   only, while the visible time inputs rendered `form.customStart` /
   `customEnd`, which never synced with it. Picking "Evening" saved 15:00-23:30
   while the form still showed 07:00-15:00. The inputs now render
   `resolveShiftTimes()`, so what is displayed always matches what submit
   saves; editing a time still switches the selection to custom.
2. `Pool` offered Claim on shifts already in the past (three July shifts had
   enabled Claim buttons). Now guarded with the same
   `isPastShift = ends_at < now` predicate ShiftDetail already used.
3. `getCoworkersOnShift` ended with `.filter((row) => row.full_name)`, silently
   dropping any coworker whose `profiles!nurse_id` join returned null, which
   happens when the shift row is readable but the profile is not. The
   "Also on <unit>" list and the Edit-mode match card now keep those rows and
   show "A teammate". This is why the teal "Also on Unit 1" card looked dead
   earlier: a missing name was indistinguishable from nobody working.

**Open decisions**: the coordinator profile has no `home_unit`, so Pool shows a
coordinator the nurse-facing empty state; Departments remains a "Soon" stub.
The coordinator also still appears in the Post a Shift nurse dropdown, because
that list is not filtered to `role = 'nurse'` (harmless, but it lets a shift be
assigned to the coordinator).

**Data hygiene: done (2026-09-12).** The staff list was cleaned on the live
database: 8 zero-activity junk profiles deleted (`Test Nurse`, three nameless
signups, two of Jefle's own accounts, and two accounts that were most likely
invited testers), plus all 20 stale past open shifts (July 14 to Aug 30, in
units the app no longer even offers). Profiles went 52 to 44, every remaining
profile has shifts, no orphans, no dangling auth users. A rollback record of
exactly what was removed is saved outside the repo at
`~/.shiftko-backups/cleanup-2026-09-12.json`. The Pool is now legitimately
empty and its "No open shifts right now" empty state is confirmed rendering,
so post a few real future open shifts before beta starts.

## Home design pass (2026-09-12, post-rollout)

The nurse Home was reworked against a new design artifact
(`8bf42c0b-2472-4de6-b517-05a8a40bdd99`, "MainCopy" family). The artifact itself
needs Claude auth, but the design session that produced it is on disk at
`~/.claude/projects/-Users-jeflelegson-shiftko-design-v2-visual-pass-dup/`,
so every value here was read out of the real CSS, not approximated from prose.
`~/shiftko-design-v2-visual-pass-dup/.artifact-live.html` is a symlink to the
OLDER `17d938e1` artifact, not this one. Commits `47af6b1` and `30ecb96`.

Ten changes, all measured on the live site after deploy:

1. **Geist app-wide.** The app had no webfont at all (`--font-sans` was a
   system stack, and `index.html` never linked Geist despite `CLAUDE.md`
   claiming it). Now linked and prepended to `--font-sans`. Verified via
   `document.fonts.check('600 20px Geist')` returning true, so it is not
   silently falling back.
2. **Hero gradient** `#0AA2CF` -> `#F9F9FB` (was `#5DC7E6` -> `#0AA2CF`),
   223px tall, no-repeat, anchored top.
3. **16px radius** on the Today hero, both quick tiles, the status tile, the
   Upcoming list and the report card. All already resolved to 16px via
   `rounded-card`, so no churn was needed.
4. **Borders removed** from those cards; kept and forced to `1px solid #5DC7E6`
   on the status tile in both states.
5. **Unit pill.** "Unit 1 · CNA" moved out of the progress row into a neutral
   pill (`11px/600`, `3px 8px`, `8px` radius, `#F2F2F7`, `#6E6E73`) to the left
   of the period tag; the progress row's right column now shows the shift date.
6. **Solid tile icons.** Replaced with Heroicons solid glyphs (20x20 viewBox,
   `fill="currentColor"`): a calendar for Add a Shift, a magnifier for Claim
   Shifts. Lucide is stroke-only, so these are inline paths.
7. **Icon chips** on those two tiles only: `linear-gradient(135deg, #5DC7E6 0%,
   #0AA2CF 100%)` with a white icon.
8. **Section headers** `#002D3A` -> `#3A4A4F`, tracking `-0.04em`.
9. **Greeting** 18px -> 20px, tracking `-0.04em`.
10. **Bell and avatar** get a 1px diagonal 4-stop white ring via a masked
    `::before` (rule `.home-glass-ring` in `src/tailwind.css`), keeping the flat
    `bg-white/20` fill and the 9px radius untouched.

**Bug found and fixed by measuring, not by reading the diff:** the 223px
gradient was first painted on a 142px-tall wrapper, and backgrounds clip to
their element box, so the fade truncated at ~64% and hard-cut to the page
ground in the gutters beside the hero card. `30ecb96` moved it to the parent
that actually spans the content (now 940px tall), so the full fade renders.

**Known deviations from the artifact:**

- Tailwind v4 interpolates gradients in `oklab`, the artifact used sRGB. The
  stops and geometry are exact; only the mid-gradient blend differs slightly.
- The date uses the existing `formatShiftDayShort`, which renders "Sun, Sep 13"
  rather than the artifact's four-letter "Sun, Sept 16". No new formatter added.
- The glass fill stays at the app's existing 20% white (the artifact's own
  `.icon-btn` used 22%), kept flat per the instruction not to touch the fill.

**Scope note:** the Home sheet is shared by the nurse and coordinator views, so
the gradient, greeting, bell/ring and section-header changes apply to both. The
coordinator's own tiles (Approvals / Post Shift / Manage) were NOT restyled -
they are not part of that artifact.

**Reverted (same day):** a gray frame around the Request Activity section
(`rounded-[20px] bg-track-neutral p-3`) was added in `7e208d0` and `b4a69a5`,
then removed at Jefle's request. The section is back to a plain
`flex flex-col gap-2.5`, and `Home.jsx` is byte-identical to its pre-frame
state (`git diff` against `72d1c80` is empty).

The analysis is kept because the findings outlive the frame:

- **The fill had to be a neutral.** `press-state #F2F2F7` separates from the
  page ground by only 1.061:1, versus the 1.052:1 a white card gets there, so
  it read as a smudge rather than a group. `track-neutral #EDEDF2` separates
  1.110:1, about twice a white card. A brand-tinted frame was rejected because
  the activity tile *inside* it already uses `bg-teal-tint` in its approved
  state, so a teal frame would swallow it; spending the accent on decoration is
  also what the `Operate` guidance warns against.
- **Open defect: the Home hero header text fails WCAG AA everywhere.** White
  text on the gradient measures 2.97:1 at the teal end and 1.29:1 near the page
  ground; the 20px greeting sits at roughly 2.1:1 and needs 4.5:1. This is
  pre-existing (the old gradient started at 1.95:1), not something the design
  pass introduced, and `impeccable detect` flagged the same pattern
  independently on the unauthenticated landing page. Candidate fix: hold the
  darkest teal for the first ~120px where the text sits and fade after it,
  instead of fading from 0.

## Request Activity card restructure (2026-09-12, same day)

The Home "Request Activity" card rendered the raw notification sentence in one
truncated line. Every claim message has the shape
`Your claim for <unit> · <date> · <time> was [not] approved. <tail>`, so
truncation cut at "Your claim for Unit 1 · Friday, July 24, 2..." - the nurse
saw which shift it was about but never what happened to it.

Now the title carries the outcome from `type` (`Claim not approved`, replacing
the vague `Claim update`, plus a `swap_approved` case that previously fell
through to "Notification"), and the second line carries the context, extracted
from the sentence and compacted to
`Unit 1 · Fri, Jul 24 · 7:00 AM – 7:00 PM`. A `chevron-muted` chevron marks it
as tappable. It falls back to the raw message if the sentence shape ever
changes, so a wording change degrades instead of breaking.

Verified live: both lines report `scrollWidth === clientWidth` (no clipping),
the card is 408x64, and the chevron renders at `#C7C7CC`. Commit `f4658e0`.

## Edge-to-edge status bar and tinted browser chrome (2026-09-12, same day)

The app now paints under the status bar, so iOS Safari's toolbar and the strip
revealed above the page on scroll both take the app's own surface colour. One
colour for every screen: the page ground `#F9F9FB`.

Three things make that work, and the first attempt only had two of them:

- `index.html` had no `theme-color` meta at all, and its viewport meta lacked
  `viewport-fit=cover`, so the page never extended under the status bar.
- `html`/`body` had no background in `tailwind.css`; the page background came
  from the legacy `index.css` (`#f9f9f9`), not the brand `#F9F9FB`.

The meta tints the toolbar. **`html`/`body` paint the strip revealed above the
page when you scroll or pull down** - setting only the meta leaves that strip
white, which is the piece that makes this look broken on a phone. The recipe
was confirmed against a site that does it well
(`hermes-agent.nousresearch.com`), which sets all three:

```html
<meta name="theme-color" content="#0000f2" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
```css
html { background: #0000f2; }
body { background: #0000f2; }
```

Two things worth knowing:

- **The colour has to be visibly a colour.** The first attempt tinted with
  `#F9F9FB`, which sits 6/255 from pure white (contrast 1.052): technically
  applied, visually identical to white. An explicit `theme-color` also
  *overrides* the tint Safari derives from the page by itself, so pinning a
  near-white suppressed a correct result on the landing page's teal header.
- **The hero gradient no longer runs under the status bar.** It was briefly
  pulled up to the very top edge so the hero colour reached it, but that put a
  grey chrome bar directly above a teal header. The gradient now starts below
  the inset, so every screen's top edge is the page ground and matches the
  chrome. `.app-content` reserves `env(safe-area-inset-top)` for every tab.

The mechanism is entirely static: `index.html` carries the meta and
`tailwind.css` points `html`/`body` at `--color-page-ground`. The per-screen
machinery (`src/lib/themeColor.js` plus its effects in `App.jsx` and
`Home.jsx`) existed briefly and was removed in `755d0a5` when the Home was
brought in line with the other screens.

Verified live on the deployed build: the meta reads `#F9F9FB` and `html`/`body`
compute to `rgb(249,249,251)` on Home, Schedule and Pool with no inline
override, and Home's gradient still renders as a 223px teal-to-page-ground
band that is not clipped. Live asset `index-B32Iq9Yc.js` matches a fresh local
build.

**Not verified, and only testable on a real iPhone:** whether content clears
the notch. `env(safe-area-inset-top)` resolves to 0 in a desktop browser, so
the inset behaviour itself cannot be confirmed off-device.

Caveat worth knowing: iOS honours the tint only when the user has Safari's
"Show Color in Tab Bar" setting on, so it is not fully in our control.

## Empty states (started, Home only) (2026-09-15)

Every empty state in the app was a single line of grey text, and the mockups
carry no empty-state vocabulary to port from (only "Day off"), so this is new
vocabulary rather than a fidelity task. `src/components/ui/empty-state.jsx`
renders an icon in a soft tinted tile, reusing the quick-tile chip pattern
(`bg-teal-tint` on `text-teal-foreground`) rather than inventing a new visual
language, plus a short title and an optional subline, in `section` and
`inline` sizes.

Applied so far to the nurse Home only (`26ef4b4`, refined in `aeff41b`):

- no shift today: a `MoonStar` tile, "No shift today" / "Enjoy the day off"
- empty Upcoming list: a `CalendarDays` tile, "Nothing on the horizon" /
  "Shifts you pick up will show here". The section previously hid itself
  entirely when there were no items, so it now always renders.

Both use `layout="row"`: icon beside left-aligned text with no vertical padding
of its own, so it sits inside a card without ballooning it. The first version
used the centred `stack` layout and made the today card 189px tall, which read
as an empty card with a hole in it.

The moon tile uses the night shift period tint (`period-night-bg` `#F5DFFA` on
`period-night-fg` `#5132AE`) rather than the teal chip, since a moon in the
same lavender as the night shift tag is the app's own vocabulary rather than a
generic grey placeholder.

Verified live, signed in as a real nurse, on a day they genuinely had no shift:
the today card is 106px (was 189px), the tile is 36x36 at `rgb(245,223,250)`
with a `rgb(81,50,174)` icon, the icon is a 17px SVG rendered from three paths
(MoonStar's crescent plus star), the layout reports `flexDirection: row`, and
the title is 15px/600.

The empty Upcoming branch is not exercisable on the test account (it always
has shifts in the next seven days), so that one is built and compiling but
unproven on a device.

Still on bare text, to move onto the component later: Schedule (My Shifts, Open
shifts), Pool, Manage recent shifts, Approvals, the swap picker, Duplicate week
and Staff roster.

## Sticky top bar on every tab page (2026-09-15)

Every tab page now carries the same pinned bar: avatar, Shiftko wordmark with
the Beta pill, and the bell, on a solid `#0AA2CF` band (the hero gradient's own
start colour, so it is seamless against Home's hero and reads as the blue bar
everywhere else). Lives in `src/components/ui/top-bar.jsx`.

This is a new decision rather than a port: the mockups only put `.topbar` on
the Home screens, and the standing rule was that the navbar/tabbar is the one
thing NOT ported from them.

- Home's inline `.topbar` grid was replaced by the shared component, so the
  markup lives in one place now.
- Schedule, Pool and Profile gained it at the top of `<main>`; their
  `pt-[26px]` came off since the bar supplies its own padding.
- Per Jefle's call, page titles stay below the bar, and Schedule's title is no
  longer sticky, so only the bar pins.
- Profile's own Wordmark + Beta came out of its header, since the bar renders
  both and they would have duplicated.
- The bar is self-contained: it fetches its own notifications and owns the
  panel, so the bell works from any tab. Home keeps its own notifications
  fetch because its Request Activity card needs the same data.

Verified live at 430px wide, signed in: all four tabs report a 56px sticky bar
at z-index 30 with `rgb(10,162,207)`, the avatar initials, the Beta pill and
the bell. It stays at `top: 0` after scrolling 400px, and tapping the bell on
Profile opens the notifications overlay with real data.

## A personal event fills the today card (2026-09-15)

The today card only ever looked at `shifts`, so an event a nurse added never
appeared there even when it was on today. For beta the intent is that nurses
add their own shifts and events into the same workspace and see coworkers on
them, so an event should read as a shift rather than as a separate class of
thing.

`TodayHero` now takes `todaysEvent` and renders whichever of the two lands on
today (a shift wins), through the same skeleton: the header pill, the period
tag, the 25px time range, and the progress row. `ShiftProgress` now takes a
generic `item`, since it only ever reads `starts_at`/`ends_at`, which an event
has.

Two things were wrong in the first cut and are worth remembering:

- The period was computed from `todaysShift` only, so an event showed no
  Day/Evening/Night pill. It comes from whichever item is on today now.
- The pill fell back to an invented `'Personal event'` string for a nameless
  event, which then duplicated the `Personal` tag beside it. It uses the unit
  instead, following the app's own `unit || name` convention.

## Personal tags removed (2026-09-15)

All seven `PeriodTag period="Personal"` instances are gone (`889e962`): Home's
today card and its Upcoming event row, four Schedule event rows, and the
personal event detail's hero. Each shows the item's real period now, so an
event row is indistinguishable from a shift row except by its content.

This is a deliberate beta decision and it is reversible: the distinction still
exists in the data and in the edit panel, it just is not surfaced as a tag.

## Quick tiles matched to the artifact (2026-09-15)

The Add a Shift and Claim Shifts tiles were `px-3 py-2.5` (12px/10px) against
the artifact's `padding: 16px 12px 16px 16px`. Matched (`98001b5`), measured
after deploy at 16/12/16/16 and 200x68 each. The row gap (8px) already
matched; the artifact's `.quick-row` also pulls up by -12px where the app uses
-4px, unchanged and worth a look since the hero composition differs.

Note: the artifact URL is behind Claude auth, so these values came from the
design source on disk (the mockup plus the latest `.quick-tile` edit in the
design session), both of which agree on 16/12/16/16.

## Row spacing applied to every shift list (2026-09-12, same day)

The 2px info gap and the 6px card padding that Home's Upcoming card got were
then applied to the rest of the shift lists (`6be4b7e`, `2aa2b9c`):

- `py-1.5` (6px) on 12 list containers: Claim Status, Schedule (four),
  Coordinator Manage, Swap Status, Pool, and Profile (four). Applied per usage
  rather than inside `SHIFT_LIST_CLASSNAME`, so Profile's Workspace card, which
  reuses the class but carries its own `p-4`, keeps its padding.
- The 2px `.shift-info` gap added to the remaining shift-info blocks: Pool,
  Claim Status, Swap Status, Coordinator Manage, the two swap pickers, and
  `ui/selection-row`.
- Five hand-rolled `mt-0.5` (2px) margins on the second line, written before
  the gap existed, were removed so the total stays 2px rather than 4px.

Measured after deploy: Schedule's 10 list containers and the Claim Status
container all report `padTop=6px padBottom=6px` with an info gap of exactly
2.0px.

Deliberately untouched, because the mockup specs them differently: person rows
use `.coworker-body { gap: 1px }` (a separate family), and the quick tiles and
Manage nav rows have no gap in the mockup at all, which is why they already
look right.

## Upcoming card got breathing room top and bottom (2026-09-12, same day)

The Upcoming list card had no padding of its own, so its content sat flush
against the card's top and bottom edges, with only the rows' own `py-3.5`
(14px) inside. `py-1.5` (6px) was added to the card container alone
(`b797207`); the rows and the spacing between them are unchanged.

Measured after deploy: padding-top and padding-bottom are both 6px, the card is
280px tall with its 4 rows intact, and the gaps above the first row and below
the last are 6px each. That puts 20px between the card edge and the text
(6 + the row's 14).

This is a deliberate deviation from the mockup, which has no padding on
`.shift-list`, and the shared `SHIFT_LIST_CLASSNAME` still has none, so the
other list cards (Schedule, Pool, Claim Status) continue to sit flush. Only
Home's Upcoming card was changed.

## Two-line row info blocks got the mockup's 2px gap (2026-09-12, same day)

The shift info in the row lists was two `<p>`s with nothing between them, so
the time and the unit/meta read as one pancaked block. The mockup defines
`.shift-info { display: flex; flex-direction: column; gap: 2px; flex: 1 1 auto;
min-width: 0; }`, so those blocks are now `flex min-w-0 flex-1 flex-col
gap-0.5` (`845c8eb`).

Eleven blocks: Home's two Upcoming rows, the Request Activity card's own
outcome/context pair (same two-line shape, same screen), and Schedule's eight
list rows. A single-line block (`No nurse assigned`, coordinator coverage-gap
row) was deliberately left alone, since a gap there would do nothing.

Measured after deploy: the gap between the two lines is exactly 2px in the
Upcoming rows, up from 0. Row height stays 66px because the date column drives
it and the info block is vertically centred, so the extra 2px is absorbed
inside the block rather than growing the row.

## Row dividers were collapsing to zero height (2026-09-12, same day)

The vertical divider between the date column and the shift info was invisible
on Home's Upcoming list, Pool, Claim Status and Swap Status. The element was
present in the DOM and carried the right colour, but measured `w=1px h=0px`:

```jsx
<div className="h-full self-stretch border-l border-hairline" />
```

`h-full` is `height: 100%`, which computes to `auto` against the row's
indefinite height, and a non-`auto` cross-size stops `align-self: stretch` from
applying, so the box collapsed and its left border drew nothing. Schedule and
Coordinator Manage already used the working construction, which is why they
looked right:

```jsx
<div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />
```

That is a real 1px box with a background and a 36px floor. All seven copies of
the broken pattern were replaced (`b0bec4e`) across `Home.jsx` (three, one of
them the coordinator coverage-gap row), `Pool.jsx`, `ClaimStatusList.jsx`,
`SwapStatusList.jsx` and `ui/selection-row.jsx`.

Measured after deploy: the Home's dividers are `w=1px h=36px #E5E5EA` inside
66px rows, matching the Schedule's `w=1px h=36px` inside 70px rows.

Rule for future row work: never build a hairline divider from a border on a
zero-width box combined with `h-full`. It collapses on any row whose height is
not definite, and it fails silently, since the colour and the DOM node are both
still correct.

## Hero gradient mid stop moved to 70% (2026-09-12, same day)

The Home hero gradient was only two stops (`--color-hero-gradient-start`
`#0AA2CF` to `--color-hero-gradient-end` `#F9F9FB`), so the teal fell away
across the first half of the 223px band. The design's gradient family carries
a light-blue middle (`#5DC7E6`), so a `--color-hero-gradient-mid: #5dc7e6`
token was added and the middle stop placed at 70% (`4905bd4`):

```css
linear-gradient(in oklab, #0AA2CF 0%, #5DC7E6 70%, #F9F9FB 100%)
```

painted at `100% 223px`, unchanged.

Verified on the deployed build: the computed gradient reports three stops with
the middle at 70%, so the teal holds for 156px of the 223px band instead of
111px. Tailwind emits both `via-hero-gradient-mid` and `via-70%`
(`--tw-gradient-via-position:70%`), confirming the position is real and not
silently falling back to the 50% default.

## Page titles aligned to the mockup spec (2026-09-12, same day)

Schedule, Pool and Profile had drifted apart: Schedule was `22px/700/-0.01em`,
Pool `26px/600` with no tracking, and Profile `26px/600` with a hardcoded
`#111111` instead of the ink token. The rollout mockups carry a single
`.page-title` declaration across five screens, so that is the target:

```css
.page-title { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; color: #1D1D1F; }
```

`#1D1D1F` is exactly `--color-ink`, so the fix was four byte-identical class
strings (`3ee4404`). Measured on the deployed build, all three headers report
`26px / 600 / -0.52px / rgb(29,29,31)` and resolve to Geist, with
`document.fonts.check('600 26px Geist')` true, so the 600 weight is a real
face and not a synthesised one.

Two things deliberately left alone:

- The mockup's `.content` has no top padding; the title sits flush under a
  `.safe-top { height: 54px }` spacer. Live has 12px (Schedule) and 26px
  (Pool, Profile) of extra top space, and the measured box tops still differ
  (38 / 26 / 33) because Schedule's title lives in a sticky header while
  Profile's sits in a flex row beside the wordmark. That is a layout question,
  not a title-style one.
- The Pool mockup draws its title as `<span class="nav-title">Pool</span>`
  (the 17px pushed-screen style) because it models Pool as a sub-screen. Pool
  is a tabbar tab in the live app and the rule is page-title for tabbar
  screens, so 26px stands.

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
- **The tabbar/navbar is the one standing exception to "match the
  mockup"**: every other visual element in every flow should match the
  Linear Light artifact, but the bottom tabbar always stays the live
  app's existing implementation, never the mockup's tabbar markup. User's
  explicit standing rule, applies to every flow, not just Profile.
- **Profile's settings features (Change Password, Connected Accounts,
  Delete Account) were built as real Supabase-backed features, not
  skipped or stubbed**, even though no backend existed for any of them
  before this pass. User's explicit call: "anything missing we build
  it." This is the precedent for future flows that hit the same kind of
  gap - default to building the missing piece for real, not skipping it
  silently, unless the user says otherwise for that specific case.
- **Personal Events Date field was a full 1:1 rebuild**, not a token
  reskin (user's explicit call, 2026-09-12): the live inline
  `CalendarStrip` grid was replaced by the mockup's single compact
  `.field-input`-styled Date row that opens the strip as a picker.
- **Personal Events match-card built for real, and it needed NO RLS
  change.** The existing "nurses see unit shifts" policy
  (`20260830070000_nurse_self_scheduling.sql`) already grants a nurse
  read access to any shift on her own home unit, and the
  `profiles!nurse_id` join already works (Team Schedule uses the same
  join). `CLAUDE.md`'s RLS summary predates that policy and omits it, so
  treat the summary as incomplete and check `supabase/migrations/`
  before concluding a new policy is required. RLS was NOT modified.
- **`SegmentedControl` tokens now match the Linear Light mockup
  app-wide** (track `#ededf2` to `#f2f2f7`, track radius 11px to 12px,
  segment radius 8px to 9px, active-segment `0 1px 2px rgba(20,20,19,.08)`
  shadow). It is a shared component, so this also updates Post Shift's
  segmented control: intended convergence, not a regression.
- **First Shiftko flow built with OpenCode (DeepSeek v4.1-flash) instead
  of Claude Code** (user's call, 2026-09-12). A head-to-head on this
  same Personal Events fidelity audit showed v4.1-flash matched Claude on
  every extracted token value and caught two deviations Claude missed, so
  token-fidelity and other mechanical flow work routes to OpenCode now.
  See the `shiftko-linear-light-rollout` skill's routing section.
- **Shift Detail's Edit screen reuses Post a Shift's live form**
  (`ShiftForm`, mode prop) rather than duplicating it. Consequence:
  `ShiftEdit` inherits Post a Shift's own live deviations from its mockup
  (inline `CalendarStrip` date picker, icon-tile shift presets,
  saved-presets strip) instead of the mockup's single-row Date field and
  Day/Evening/Night segmented control. User's explicit call (DRY over a
  second copy of the form).
- **The Manage hub's per-row delete icon was removed** (`e2c273f`). The
  mockup draws edit only, and delete now lives in the pushed Edit Shift
  screen as "Remove Shift", so no capability is lost. This supersedes the
  earlier "kept both icons" call from the Coordinator Manage flow.
- **Open-shift claiming is gated on `role === 'nurse'`.** Team Schedule
  renders for coordinators too and its open rows are now tappable, so
  without the gate a coordinator could create a shift claim (RLS only
  requires `nurse_id = auth.uid()`, which a coordinator's own profile
  satisfies).
- **ShiftDetail's post-claim "Requested + Withdraw" state is not in any
  mockup.** It mirrors Pool's established post-claim pattern rather than
  inventing a new one, so a nurse claiming from the detail screen isn't
  left at a dead end. Revisit if a mockup ever covers that state.
- **Team Schedule's open-shift rows are now tappable** (`7a62c17`),
  reversing the earlier "Team Schedule never links out to ShiftDetail or a
  claim flow" decision. Only rows with `status === 'open'` became buttons;
  every other row stays a plain div.
- **The Notifications bell dropdown was replaced by a full pushed page**
  (`7acaef1`), user's explicit call. Home's "Request Activity" View All
  opens it too (it previously opened the dropdown).
- **Opening Notifications no longer auto-marks everything read.** Before,
  merely opening the bell marked all unread read, which would have left the
  mockup's "New" section permanently empty. The mockup's explicit "Mark all
  read" action is now the only thing that marks read (user's explicit call),
  and it renders only when there is something unread.
- **The notification row chevron only appears where the row navigates**
  (`offer_claimed`), not on every row as the mockup draws it - a chevron on
  a row that goes nowhere is a false affordance (user's explicit call).
- **The Notifications page builds its own header rather than using
  `NavRow`**, because the mockup's header needs a trailing "Mark all read"
  action NavRow does not support, and NavRow is imported by 18 files.

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
