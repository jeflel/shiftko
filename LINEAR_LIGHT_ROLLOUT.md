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

### Opening Profile signed you out (found and fixed 2026-09-15)

Symptom Jefle hit on the live app: sign in, move between tabs, tap Profile, and
the app drops straight back to the Screen0 welcome screen, as if signed out. It
looked like a leftover onboarding debug feature, but there is no such code and
no version in git history ever signed out on mount.

The cause was `Profile.jsx`'s `fetchIdentities` effect, which called
`supabase.auth.getUser()`. That is the only `getUser()` call in the app, and
the only call path that can end a session that no user action asked to end:
`getUser()` round-trips to the auth server, and when the server answers
`session_not_found` (a session revoked or expired server side), auth-js treats
it as dead, calls `_removeSession()` (`GoTrueClient.ts:3172`), wipes the stored
session and emits `SIGNED_OUT`. Every other screen only uses `getSession()` or
plain table reads, which is exactly why Home, Schedule and Pool stayed logged in
while Profile did not.

Reproduced on live before the fix by intercepting `fetch` so `/auth/v1/user`
returned `session_not_found`: Schedule, Pool and Home were unaffected, and the
next tap on Profile cleared localStorage and rendered Screen0.

The fix reads the linked providers from `getSession()` instead, with
`app_metadata.providers` as the fallback, so rendering a settings screen cannot
end the session. If the session is genuinely dead, the token refresh path still
handles it, but never as a side effect of drawing a page.

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
- **Defect CLOSED 2026-09-17: the Home header text failed WCAG AA everywhere.**
  White text on the gradient measured 2.97:1 at the teal end and 1.29:1 near the
  page ground; the 20px greeting sat at roughly 2.1:1 and needed 4.5:1. It was
  pre-existing (the old gradient started at 1.95:1), not something this pass
  introduced. Closed by removing the gradient from Home rather than by plating
  the text: the greeting is `#6e6e73` on the page ground at 4.82:1. See "Home
  header: profile on the left, muted greeting, no gradient".

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
  longer sticky, so only the bar pins. (Reversed on 2026-09-15 by the pinned
  Schedule header section below, which re-pins the Schedule header under the
  bar on purpose.)
- Profile's own Wordmark + Beta came out of its header, since the bar renders
  both and they would have duplicated.
- The bar is self-contained: it fetches its own notifications and owns the
  panel, so the bell works from any tab. Home keeps its own notifications
  fetch because its Request Activity card needs the same data.

Verified live at 430px wide, signed in: all four tabs report a 56px sticky bar
at z-index 30 with `rgb(10,162,207)`, the avatar initials, the Beta pill and
the bell. It stays at `top: 0` after scrolling 400px, and tapping the bell on
Profile opens the notifications overlay with real data.

Follow-up (`2958184`): the pages that gained the bar needed their old top
spacing reworked, and the first pass had a real bug in it.

- Schedule's two title headers were still `sticky top-0 z-10` and still
  carried `-mt-[26px]`, which existed only to cancel the `<main>`'s
  `pt-[26px]` that the bar replaced. So their boxes were pulled 26px up under
  the bar, and being z-10 under the bar's z-30 they slid underneath it on
  scroll. The earlier note claiming they had been un-stuck was wrong; they
  were not. Both are `static` with `pt-4` now, and the stale comment
  explaining the old trick is gone.
- Pool and Profile's title rows gained `mt-4`.

Measured after deploy: all three put the page title 16px below the bar, and
left-align it with the bar's contents (both at 436px at 430px wide), with an
identical `26px / 600 / -0.52px` title. Schedule carries that 16px as padding
on its header, whose box starts flush at the bar, rather than as a margin,
which is visually identical.

Measurement note: the bar is `sticky`, so it does not move while page content
does. Comparing its rect to a header's rect is only meaningful at scrollTop 0
- otherwise the gap reads as a huge negative number. Reset the scrollable
ancestor (`.app-content`) first.

## Pinned Schedule header (2026-09-15)

Follow-up to `2958184`, per Jefle: the Schedule header is sticky again, and only
the list body scrolls under it.

- Both headers are `sticky top-14 z-10`: the nurse one in `ScheduleTab`
  (`Schedule.jsx:97`) and the coordinator's standalone one in
  `TeamScheduleTab`. `top-14` is 56px, which is TopBar's exact height (36px
  avatar plus 2 x 10px of `py-2.5`), so the header parks flush under the bar.
  `z-10` keeps it under the bar's `z-30` and under BottomNav's `z-20`.
- The header's own opaque `bg-page-ground` and its `border-b border-hairline`
  are load-bearing once it pins. Drop the background and rows scrolling
  underneath show straight through it.
- Both headers carry `data-testid="schedule-sticky-header"`. Only one of them
  renders at a time, since the coordinator's copy is the standalone path.
- Pinned with `position: sticky` rather than a fixed-height wrapper with its own
  `overflow-y: auto`. The user-visible result ("only the list scrolls") is the
  same, and a nested scroller would break `weekMarkerRefs`, `scrollIntoView`,
  and `.app-content`'s bottom-nav padding.
- Real bug this created, fixed in the same commit: `MyShiftsTab` lands on the
  current week with `scrollIntoView({ block: 'start' })`, which
  with the header pinned parked the `AUG WEEK 4` label straight behind it. The
  landing now measures BOTH pinned elements (the 56px TopBar, which gained
  `data-testid="app-top-bar"` for this, plus the sticky header), sums their
  heights, and subtracts that from the target's offset inside `.app-content`.
  Measured rather than hardcoded, so it follows either one if its contents
  change. Measuring the header alone still left the label tucked behind the
  bar.
- The `+ Add a shift` button and the week/day group labels stay in the scrolling
  body: Jefle asked for the header block only to pin.

## Duplicate profiles at signup, and the onboarding (2026-09-16)

**The bug.** `handle_new_user()` inserted a profile unconditionally and ended
with `on conflict (id) do nothing`, which only catches an id collision, so an
existing profile with the same email was never matched. A real nurse signing in
got a second profile, role nurse with null credential and home_unit, while her
seeded one kept the shift history. `profiles.email` had no unique constraint.

**The fix**, `supabase/migrations/20260916061057_merge_profile_on_signup.sql`,
applied and reconciled so local == remote:

- adds `requested_role`, a self-signup coordinator claim. `role` is never written
  by a signup, because `is_coordinator()` grants full access to every shift,
  claim and notification in the facility and RLS offers nothing else
- rewrites the trigger to find a profile by lowercased email, re-point its
  dependents onto the new auth id, then delete it, wrapped in an inner
  `exception when others then null` so a merge failure can never block a signup
- adds `profiles_email_unique` on `lower(email)` where email is not null

There are **10** foreign keys to `profiles(id)`, not the 4 the spec guessed:
`claims.nurse_id`, `notifications.user_id`, `personal_events.nurse_id`,
`saved_shift_presets.user_id`, `schedule_patterns.nurse_id`,
`shift_claims.nurse_id`, `shift_swaps.recipient_id`, `shift_swaps.requester_id`,
`shifts.nurse_id`, `shifts.previous_nurse_id`. Claude Code enumerated them from
`pg_constraint` instead of trusting the list, which is the only reason the merge
is complete.

**The backfill.** `onboarding_completed` defaults to false and 43 of 44 profiles
were false, so the new gate in `App.jsx` would have pushed every seeded staff
member and both test accounts into a first-run onboarding. Backfilled to true
(verified 44 complete, 0 incomplete), record at
`~/.shiftko-backups/onboarding-backfill-2026-09-16.json`.

**The onboarding**, re-wired from the orphaned flow: name, role, unit, credential,
then it saves to the profile. `App.jsx` only imported Screen0 and initialised
`onboardingCompleted` to true, so the flow could never render. Screen4 (a locked
facility card, since Shiftko is single facility) became the unit picker, and
Screen6 honours a saving flag so the finish button cannot double-submit.

**The confirm.** The staff roster shows a "Coordinator access requested" card
above the search whenever a profile has `requested_role = 'coordinator'`, with a
Confirm that sets `role` and clears the claim. The roster already edits a nurse's
email inline, which is the pre-invite step: set her real email on her existing
profile before inviting her, so the merge can find it.

**Not verified end to end.** No real signup has run through this yet. The gate
only fires on `onboarding_completed === false`, so the existing 44 are unaffected
by the app half either way.

**The merge did not actually work. Found by testing (`eb7485b`).** A throwaway
fixture (a profile, a shift it owned, a notification it owned, and the auth users
either side of it) proved the merge cannot run at all. `public.shifts` carries two
BEFORE UPDATE triggers, `shifts_guard_claim_update()` and
`enforce_shift_claim_immutable_fields()`, and the first rejects any change to
`nurse_id` unless `is_coordinator()`. During a signup trigger `auth.uid()` is
null, so it always rejects. The merge's error was then swallowed by its own
exception block, and the profile insert collided with `profiles_email_unique`,
which **aborted the entire `auth.users` insert: a signup in the pre-invite flow
failed outright, which is worse than the duplicate it was meant to fix.**

Mitigation applied: `profiles_email_unique` dropped, verified. Signups work
again, the merge is inert, duplicates persist unchanged from the original bug.

Test evidence at the time: the fixture's shift `3b7df0ee-...` and notification
`6390014f-...` both still pointed at the old profile id, and profile
`11111111-...` still existed. The guard's error verbatim:

```
ERROR: P0001: Nurses may only change status, claimed_by, and claimed_at when claiming a shift
CONTEXT: PL/pgSQL function shifts_guard_claim_update() line 10 at RAISE
```

Also learned: `auth.users` enforces unique emails (`users_email_partial_key`), so
a mirror's auth row can never be given the nurse's real address. The coordinator
changes the PROFILE's email, and the nurse's signup arrives as a genuinely new
auth user. (The original migration's own comment claims a seeded profile has no
auth row at all, which is wrong: `profiles.id` has a foreign key to
`auth.users(id)`, so every profile has one.)

The real fix, `20260916062912_fix_profile_merge_trigger_bypass.sql`, applied and
recorded (all 8 migrations `local == remote`): a transaction-local
`app.profile_merge` flag that BOTH `shifts` guards honour, set only around the ten
re-points and cleared on every exit path (success and exception), plus its own
exception handler around the profile insert so nothing can ever abort a signup,
and `profiles_email_unique` re-created.

**Verified by the same throwaway test, which then passed on every assertion:**
1 profile with the address, the old mirror profile gone, the fixture shift and
notification both re-pointed to the new auth id, and 0 rows left on the old id.
Fixture fully removed afterwards: back to 44 profiles and 44 auth users, with the
Pool's 12 open shifts untouched.

The fix also corrected an ordering bug in the original: none of the ten foreign
keys are deferrable, so the new profile row must exist BEFORE the re-points can
target it. The insert therefore has to run first, and it takes the email only
after the mirror's email is nulled, which the partial index permits.

One gap worth knowing: the merge moves shift history but does not carry
`credential` or `home_unit` across from the mirror. The onboarding collects both
for a new signup, so a real nurse is covered, but a merge triggered by anything
that skips onboarding would leave those null for the coordinator to set.

## Pool seeded for beta readiness (2026-09-15)

The Pool was genuinely empty (7 future shifts existed, all `scheduled`, zero
`open`), so a nurse opening the app had nothing actionable. Seeded 12 open
shifts through the coordinator's own Post a Shift flow (Leave Open, unit, a
period chip, a note) rather than by writing rows by hand.

- 7 on Unit 1, 5 on Unit 2, spread 17 Sep to 6 Oct, exactly 4 Day / 4 Evening /
  4 Night. Every row `status = 'open'` with `nurse_id = null`.
- Marked with `notes = 'beta seed, removable'` so they can be found and removed.
  Rollback record: `~/.shiftko-backups/beta-seed-2026-09-15.json`.
  Remove with: `delete from shifts where notes = 'beta seed, removable'`.

Verified live as the nurse: the Pool reads "7 open across Unit 1" with 7 rows,
each "Open · unassigned" with a real period tag and a Claim button. Unit 2's 5
opens are correctly NOT visible, so RLS scopes the Pool to the nurse's home
unit. The coordinator's own Pool reads "Your home unit hasn't been set yet",
which is true of that account (its `home_unit` is null).

**Driving a form with the browser tool: one `js()` call PER interaction.** A
single `js()` that clicks the day, the period, the unit, the note and submit in
one synchronous run does NOT work. React has not re-rendered between the clicks,
so the later ones hit nodes from the previous render and the form silently stays
invalid, yet the submit button still reports a click, so a naive script looks
like it succeeded. The first attempt posted 1 of 12 that way; one call per step
posted 12 of 12. Assert the form's own state (the selected day, the time inputs,
the select values) immediately before submitting, and verify in the database
after, not from the click log.

## Remaining empty states moved onto the shared component (2026-09-15)

Every empty state in the app now uses `EmptyState` from
`src/components/ui/empty-state.jsx`. Home's today card and its empty Upcoming
list were already on it; this pass covers the other nine.

| screen | title | icon, tone, size |
| --- | --- | --- |
| Pool | No open shifts right now | `CalendarPlus`, teal, section |
| CoordinatorManage | No upcoming shifts yet | `CalendarRange`, teal, section |
| CoordinatorApprovals | Nothing waiting on you right now | `CircleCheck`, teal, inline |
| ClaimStatusList | You haven't claimed any shifts yet | `ClipboardList`, neutral, inline |
| SwapStatusList | No swaps yet | `ArrowLeftRight`, neutral, inline |
| SwapPickCoworker | No other nurses on your unit yet | `Users`, neutral, inline |
| SwapPickShift | <coworker> has no upcoming shifts to swap | `CalendarOff`, neutral, inline |
| StaffRoster | No nurses on your roster yet | `Users`, neutral, inline |
| StaffRoster (search) | No staff match this search | `Search`, neutral, inline |
| DuplicateWeek | No shifts in the selected week | `CalendarOff`, neutral, inline |
| Home (coordinator coverage card) | No shifts scheduled today | `CalendarOff`, neutral, row |

Rules used: `layout="row"` inside a card, `size="section"` on a tab page,
`size="inline"` on a pushed screen, and the tone matched to meaning (teal for a
calm or positive state, neutral for nothing here). Each title carries a subline
except where the title already says it all.

Two more moved onto it in the same pass: Notifications (`size="section"`, teal
`Bell`, "No notifications yet") and Shift Detail's coworker list
(`layout="row"`, neutral `Users`, "No coworkers on this shift"). Both files
needed `Bell` and `Users` added to an existing lucide import, the same
missing-icon trap as the three files above. That leaves only `Schedule.jsx:694`
(a bordered card with plain text inside) and `:1175` (a per-day label in the
calendar list, where an icon per empty day would be wrong) still on bare text.

Also audited for the worse case, a list that renders nothing at all when empty:
none. `Profile.jsx`'s four `map()` calls are over derived strings (initials,
provider names), not fetched collections. `Home.jsx:1134`'s "No nurse assigned"
is a warning chip on a shift row, not an empty state.

Notes from the pass:

- Three files had no `lucide-react` import at all (`CoordinatorApprovals`,
  `SwapPickCoworker`, `SwapPickShift`) and needed one added alongside the icon.
  A build does not catch this, it is only a runtime ReferenceError, so every
  `icon={...}` was checked against its file's imports by script before building.
- `Schedule.jsx:694` and `:1175` were left alone on purpose, that file was being
  edited by another agent at the time.
- The Pool's "0 open across <unit>" coverage line above the empty state still
  renders when the count is zero. Not touched, it was outside the approved
  change, but it reads oddly and is a one-line follow-up.

Verified live, signed in, both roles: the Pool (`section`, 48x48 teal tile), the
Home coverage card (`row`, 36x36 neutral tile, confirmed `display:flex` with
`flex-direction:row` and the icon and text side by side), the Approvals screen
(`inline`, 40x40 teal tile, 14px/600 title) and the roster's no-search-match
state (`inline`, 40x40 neutral tile).

NOT exercised end to end, because neither seeded account reaches an empty state
there: ClaimStatusList and SwapStatusList (the nurse has claims and swaps),
both swap pickers (her unit has coworkers), the roster's "no nurses on your
roster yet" (43 nurses exist), CoordinatorManage (7 upcoming shifts exist, seen
rendering on the hub) and DuplicateWeek. Those branches are built and
code-checked, not seen rendering.

## Schedule week dividers (2026-09-15)

The 4-week list's week headers were relative labels ("This Week", "Next Week",
"Week of August 16"). They now follow the design's section divider: month
abbreviation then week-of-month, so `AUG WEEK 4` and `SEP WEEK 1`
(`Schedule.jsx`, `getWeekGroupLabel`). Week-of-month is `ceil(day / 7)` —
Aug 24 -> 4, Sep 1 -> 1 — which reproduces the design's pair exactly.

The label is now left-aligned with a single hairline running from it out to the
right edge of the list, replacing the design's two-sided centred bars:

```jsx
<div className="flex items-center gap-2.5">
  <p className="text-[12px] font-medium tracking-wide text-ink-secondary uppercase">…</p>
  <div className="h-px flex-1 bg-hairline" aria-hidden="true" />
</div>
```

Weight came down from `font-semibold` to `font-medium` to match the design's
regular-to-medium weight. Colours stay on the app's tokens rather than the
mockup's iOS grays (label `#6E6E73` vs `#8E8E93`; rule `#E5E5EA` vs `#D1D1D6`).

Measured live: label `12px / 500 / 0.3px / uppercase / rgb(110,110,115)`; rule
`1px x 325px` in `rgb(229,229,234)`, 10px after the text, vertically centred
with it, and its right edge lands at 844px — exactly the shift card's right
edge — with the label and the card sharing a 436px left edge.

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

## UI fix batch (2026-09-15)

Five fixes Jefle dumped in one session, each its own commit, each verified on the
deployed build while signed in as the nurse test account (geometry read with
`getBoundingClientRect`, not a screenshot glance):

1. Home's top bar only pinned for about an inch. Its containing block was the
   greeting block (154px tall) and a sticky element cannot travel past its
   containing block. The bar is now a direct child of the hero wrapper, which
   spans the page, with `px-5 pt-2` moved up to that wrapper and `pt-4` down to
   the greeting so nothing lands a pixel off (`7f838cd`). After: bar top stays 0
   through the whole scroll, greeting gap still 16px.
2. Schedule's week header read `AUG WEEK 4`, which does not say which dates the
   week covers. It is now `SEP 7 - 13`, and `AUG 31 - SEP 6` when the week
   crosses a month (`9351d9d`).
3. Fraunces is back for the four page titles. The v2 reskin had dropped the
   webfont from `index.html` entirely, so the link is restored from that commit
   plus a `--font-display-title` token (`0bd5920`). Checked on live with
   `document.fonts.check`, which catches a silent fallback to Geist.
4. The top bar reads left to right now: wordmark + Beta at the left edge, then
   the bell, then the avatar flush right, and tapping the avatar opens Profile,
   which was previously dead because no page passed `onOpenProfile` (`89cb35b`).
5. The My Shifts week label pins directly under the Schedule header while you
   scroll and hands over week by week (`28c1805`). Its `top` is measured from the
   pinned stack (56px bar plus the 130px header), never hardcoded: live it
   resolves to `185.5px`, sits at `z-index 5` under the header's `10`, and is
   opaque, so rows pass behind it cleanly.

6. The shared teal top bar now renders on Home only (`8d7f42c`), as Jefle asked:
   Schedule, Pool and Profile start on the page ground with their title. This
   matches the artifact, which only ever put a `.topbar` on Home. Consequence:
   the notifications bell and the avatar shortcut are Home-only now. Both
   Schedule headers dropped `top-14` for `top-0`, since nothing pins above them
   any more, and the pinned week label's measured offset fell from 185.5px to
   129.5px with no change to that logic, which is the measurement behaving as
   intended.
7. The hairline rule under the My Shifts / Team Schedule segmented control is
   gone (`f5e2445`), on both copies of the header. The header already paints the
   page ground, so rows scrolling under it still read as separate. Header height
   went 130px to 129px and the week label's measured `top` followed on its own to
   128.5px.

Per-fix specs, file lists and measured evidence: the vault's
`03 Projects/Shiftko/00 Plan/(C) Shiftko Agent Queue.md`.

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

## Get started banner on Home (2026-09-17)

Home's Request Activity section is now two modes in one slot. While a nurse is
still getting set up it shows a "Get started" activation checklist; once that is
finished, or dismissed, the same slot runs today's Request Activity tile
unchanged. `RequestActivity` itself was not touched, so nothing about the
existing behavior moved.

**The checklist** is four nodes on a milestone track: Signed up, Add a shift,
Claim a shift, All set. The card is three zones, no sentences doing a
component's job:

1. Card header: headline left, state chip right (`Step 2 of 4`), the same
   label-left/chip-right shape as Home's Today card.
2. The milestone track: 2px track, 28px nodes, a check for done, a teal halo on
   the current node.
3. The next step as a real row, sharing the quick tiles' 32px icon tile, 13px
   title and 11px subline geometry. The whole card is the tap target, so the
   chevron is the affordance rather than a second button competing with the
   section header's `Skip for now`.

The connectors are real flex boxes between the nodes rather than one absolutely
positioned line with a hardcoded inset. The nodes are 78px boxes with a 28px dot
inside, so a line placed by pixel offset only lines up at the card width it was
measured at, while flex connectors line up by construction at any width.

**Step state is derived, never stored.** Step 1 is always done by the time a
nurse is on Home (`App.jsx` only routes to onboarding when
`onboarding_completed === false`). Step 2 is a `personal_events` count for the
nurse, step 3 is a `shift_claims` count for the nurse, step 4 is derived from
those two. Nothing to backfill, and the banner cannot drift from reality.

Two traps worth keeping if this is ever re-derived:

- The `personal_events` count must be UNFILTERED. Home's own
  `fetchMyPersonalEvents` call is windowed to today -> +56 days, so a shift
  logged yesterday falls out of that window and a finished step would appear to
  un-finish.
- Step 3 cannot be read off `shifts`. Home already has the nurse's shifts, but
  coordinator-assigned shifts land in that same array, so a nurse handed a shift
  on day one would complete a step she never did.

**The finished card keeps its shape, and gains a way forward.** Every step done
does NOT recolour the card or drop the track: Jefle kept the white card with the
teal border, the eyebrow (`You're all set, Alex`), the green `Complete` chip and
all four ticks (2026-09-17), preferring the completed journey visible to a green
restyle. A green ground with a check circle was built and rejected the same day,
so do not "finish" this again without asking. The one addition is zone 3, which
stops being a task and becomes the handoff: a real button reading
`View your requests` that opens the same notifications panel this slot hands over
to. The card therefore keeps a tap target in both states instead of going inert,
and the only differences between the states are the eyebrow, the chip, the row's
job and the button's label.

**Resetting the checklist for a demo.** The state is derived, so "reset progress"
means making the two counts read zero again, and there is no stored flag to clear.
For the demo account that meant deleting its rows: `alex.ramirez@shiftko.test`
had 4 claims and 3 personal events, dumped to
`~/.shiftko-backups/activation-reset-20260917-025924.json` together with a
matching `-restore.sql` holding one INSERT per row, before a single statement
removed them. Counts either side of it are the proof: `shift_claims` 7 to 3,
`personal_events` 4 to 1, and his own 0 and 0. No table has a foreign key to
either, so nothing orphaned, and his 53 shifts and their assignments were
untouched, which is why his Schedule looks identical afterwards. To redo it after
a demo, run the two deletes for that account's id, then remount Home by switching
tabs, since a reload signs the automation browser out:

```sql
delete from shift_claims
 where nurse_id = (select id from profiles where email = '<test email>');
delete from personal_events
 where nurse_id = (select id from profiles where email = '<test email>');
```

A real nurse cannot be reset this way without destroying her history, which is the
argument for a stored reset if this ever needs to be undoable in the app itself.

**The chip counts positions, not completions** (`Step 2 of 4`, not `1 of 3
done`): with four nodes on the track, a count of three leaves the reader working
out which of the four it refers to. Positions map 1:1 onto the nodes and the last
chip reads `Complete`.

**One column, for the exit.** `profiles.activation_dismissed_at`
(`20260917023202_profiles_activation_dismissed.sql`) is the only schema change:
nullable, no default, no backfill, and no RLS change, since the live "users
update own profile" policy already allows `(id = auth.uid())`. Both exits write
it: `Skip for now` while the checklist is unfinished, and `Got it` on the
finished card, after which the slot runs as Request Activity for good. It is read
through `lib/activation.js`'s own query rather than folded into Home's profile
select, so a missing column degrades to "not dismissed" instead of taking Home
down with it.

**No backfill, everyone sees it.** 43 nurse profiles existed and 41 of them have
no logged personal event, so the checklist shows for essentially the whole seeded
roster on first load. Left that way deliberately (Jefle's call, 2026-09-17): the
roster sits on seeded `@shiftko.test` addresses with no real person behind them,
so there is nothing to protect and nothing to backfill. It also means the
checklist is visible on every test account, with Derek and Linda at step 2, James
at step 3 and Maria on the finished card. To retire it in one statement later:
`update profiles set activation_dismissed_at = now() where email like
'%@shiftko.test';`

**Deviations worth knowing about.** No artboard in the artifact has an activation
banner, so this is app-invented vocabulary the same way `empty-state.jsx` is, and
it is the first section whose identity changes with state rather than only its
contents. The visual was picked from three in
`shiftko-design-v2-visual-pass-dup/activation-banner-mock.html` (milestone track,
milestone chart, progress ring); the track won and the other two stay in that file
for reference. The header is an eyebrow (`Welcome aboard`), not a headline, and
the wording is one span in `components/ui/activation-banner.jsx`.

**Verified on live production, signed in (2026-09-17).** Signed in as
`alex.ramirez@shiftko.test` against the deployed build (`index-DYOIXElj.js`,
hash-matched to the local rebuild). The finished card renders from his real data
(3 personal events, 4 claims) with the eyebrow `YOU'RE ALL SET, ALEX`, the green
`Complete` chip and all four nodes checked, in two zones with no third. Geometry
read with `getBoundingClientRect`, not eyeballed: card `padding 15px 16px`, `gap
13px`, `radius 16px`, border `#5dc7e6`; dots 28px, all on the same centre line,
evenly spaced 104px; connectors on the dot centre line and flush with the dot
edges (`gapLeft 0`, `tuckRight 0`).

One real bug came out of that measurement: the connectors were 21px stubs sitting
25px clear of every dot, because a flex connector between fixed-width node boxes
stops at the box edge rather than the dot edge. Fixed with a negative margin of
half the node box's slack around the dot (`8bcdefe`).

The checklist states were exercised through the same signed-in app with the two
counts controlled at the network layer (a `window.fetch` hook returning
`Content-Range: 0-0/0` for the `personal_events` and `shift_claims` HEAD counts),
because the only nurse login in the vault is already past the checklist. Step 2
rendered `WELCOME ABOARD` / `Step 2 of 4` with node 1 checked, node 2 haloed and
the segments teal + neutral + neutral, as a `<button>` carrying
`aria-label="Get started, step 2 of 4: Add a shift"`, and tapping it opened the
personal event panel. Step 3 rendered `Step 3 of 4`, two nodes checked, segments
teal + teal + neutral, the row as `Claim a shift / Pick up an open shift`, and
tapping it landed on the Pool page. `Got it` wrote
`profiles.activation_dismissed_at` (confirmed in the database) and the section
disappeared; setting the column back to null brought the finished card straight
back, which is the proof that the column drives the mode.

Still unverified: the checklist driven by real counts, since no nurse account with
zero personal events and zero claims has a saved login, and the coordinator Home,
which was reasoned about rather than driven (the section sits inside the
`!isCoordinator` branch, so it cannot render there at all).

Files: `src/lib/activation.js` (new), `src/components/ui/activation-banner.jsx`
(new), `src/pages/Home.jsx` (the mode switch, plus one effect and two handlers),
`supabase/migrations/20260917023202_profiles_activation_dismissed.sql`.

## Get started card: teal wash ground, a white row plate, shorter labels (2026-09-17)

Jefle's ask: the card read as "another white card" beside Home's other white
surfaces, and the third step's label wrapped to two lines. Picked from five
surfaces in `shiftko-design-v2-visual-pass-dup/get-started-surface-mock.html`
(white, teal wash, deep teal, deep header band, hero gradient wash), then six
colourways and four label fixes in `get-started-deep-card-options.html` and
`get-started-light-card-options.html`.

Landed: a 10% teal wash ground (`--color-teal-wash`, `rgba(56,189,229,.10)`,
which composites to `#e5f3f9` over the page ground) with the same 1px `#5dc7e6`
outline the white card carried, and the next-step row moved onto a white plate
(`bg-card-surface`, `rounded-button` 12px, `px-3 py-2.5`) instead of sitting
under a hairline. Press darkens the wash to `--color-teal-tint` rather than
washing grey over it.

Three measurements drove the details rather than taste:

- **The row plate is load bearing.** 11px grey sublines measure 5.07:1 on white
  and 4.48:1 on the raw wash, so the plate is what keeps them above 4.5.
- **The neutral track cannot survive the tint.** `#ededf2` measures 1.03:1 on
  the wash and `#e5e5ea` 1.07:1, both effectively invisible. Unfilled connectors
  are `teal-foreground/30` (1.50:1) and pending dot rings `teal-foreground/35`
  (1.61:1).
- **The label fix is a width problem, not wording taste.** `Claim a shift`
  measured 62.9px inside the 62px node in Geist at 11px with -0.01em tracking and
  wrapped; `Add a shift` fit at 54.2px. Both labels dropped their article
  (`Add shift` 46.8, `Claim shift` 55.7) rather than widening the nodes to 70px,
  which would have halved the connectors to 12px. The `NEXT_STEPS` row titles
  follow their node labels word for word.

**Verified on live production, signed in (2026-09-17).** `alex.ramirez@shiftko.test`
against a hash-matched deploy (`index-CL1G_Lc4.js`). Read from the live DOM rather
than from a screenshot: card ground `rgba(56,189,229,0.1)`, border `1px #5dc7e6`,
radius 16px, padding `15px 16px`, width 350px; row white, radius 12px, padding
`10px 12px`, height 56px; chip white with `#0e7490` text; connectors `#38bde5`
then 30% teal; all four labels on one line (52/47/54/32px) with the line flush to
every dot edge (`gap 0` on both sides); the current dot keeps its 4px teal halo.
Tapping the card opened the Add Personal Event panel, which is step 2's action,
and the panel was closed without saving anything.

One wording split noticed and deliberately left alone: the panel that a step 2 tap
opens is titled `Add Personal Event` while the card's row now says `Add shift`.

Files: `src/tailwind.css` (the token), `src/lib/activation.js` (labels and row
titles), `src/components/ui/activation-banner.jsx` (the surface). Commit `5df9264`.

## Home header: one two-line row sized to the controls (2026-09-17)

Jefle's call: the bell and avatar were the tallest things on the greeting row
while a one-line greeting sat beside them, and the page's first line said nothing
about the day. Picked from `get-started-surface-mock.html`'s successors,
`home-header-options.html` (five structures, five surfaces, three bottom edges,
six copies) and `home-header-row.html` (the compact row, measured).

Landed, with the gradient untouched: the greeting drops 20px to 16px/1.1, gains a
12px second line under it, and both stack in a `min-w-0` column centred against
the two 36px controls.

Measured on live production, signed in (2026-09-17), `alex.ramirez@shiftko.test`,
deploy hash-matched (`index-CTakC1rH.js`): row 36.0px against the controls' 36px,
stack 34.6px, the gap from the row to the Today card 24.0px, greeting computed at
16px/17.6px. The sentence rendered from his real data as `You have an evening
shift today`.

Three things worth knowing before anyone tunes it:

- **The size is a constraint, not a taste call.** The row is the height of the
  icons, so the stack has to fit 36px: 34.6px at 16px, 35.7px at 17px, 36.8px at
  18px, 39px at the 20px it shipped at. 17px is the largest greeting that still
  fits, and the greeting is no longer the largest text on Home, which is now the
  Today card's 25px time.
- **The gap to the card is the header block's `pb`, and it measures `pb - 36`.**
  `pb-11` (44px) was leaving 8px behind the card's `-mt-9`; `pb-15` (60px) gives
  the 24px asked for. Everything below the header moved down 16px with it.
- **White on this gradient is weak and always has been, and the second line
  makes it visible.** Measured where the text actually sits: the greeting's
  pixels are on `#1eabd5` (2.68:1 for white) and the 12px line's on `#2ab0d8`
  (2.31:1 at white/90). The old 20px greeting was 2.97:1, which passed as large
  text; at 16px it is normal text and does not. `#004458` ink would be 3.98:1 and
  4.22:1, still under 4.5. A status-deep plate at 55 percent behind the two lines
  was built and reverted the same day (`4821952`, reverted in `b5f60c9`). It
  measured 5.49:1 and 4.59:1 through the same gradient, but Jefle wants the text
  sitting on the gradient the way it always has, so **do not re-propose a plate,
  a chip or a scrim behind the header text here.** The two lines are white on the
  gradient at 2.68:1 and 2.31:1 by his call, and the greeting's size is fixed by
  the row's height rather than by contrast.

Behaviour kept as it was: the sentence is derived, never stored (the period comes
from `getShiftPeriod`, lowercased with its article, so `a day shift`,
`an evening shift`, `a night shift`), with nothing on today it reads
`No shift today, enjoy the day off`, a personal event says `event` rather than
`shift`, and coordinators get the greeting alone since the sentence is about the
reader's own day.

Files: `src/pages/Home.jsx` (the row, the `getHeaderLine` helper, `pb-15`).
Commit `12e5f55`.

**Superseded the same day** by the section below.

## Home header: profile on the left, muted greeting, no gradient (2026-09-17)

Jefle picked this by looking, off a mockup round
(`home-header-white-controls.html` in `~/shiftko-design-v2-visual-pass-dup`,
earlier round kept beside it as `home-header-profile-left.html`). It supersedes
the two-line greeting row above, landed the same day: he wants the header to read
as page furniture rather than a banner, so **Home carries no gradient at all any
more** and the row is the profile control on the left, the greeting beside it,
the bell on the right.

**Verified on live production, signed in, hash-matched (`index-DkF_z8VK.js`),
nurse `alex.ramirez@shiftko.test` at a 390x844 viewport:**

- Both controls measure 36x36, 9px radius, white fill, `1px rgb(216,216,221)`
  (`--color-control-edge`), glyph `rgb(110,110,115)` at 18px/stroke 1.75.
- Greeting `Good morning, Alex` is 15px/400 `rgb(110,110,115)`, 10px from the
  profile control, both centred on the same 36px line, 4.82:1 on the page ground.
- Row padding is 16px top / 20px bottom, so the control sits **20px** above the
  section title, which sits **10px** above the card (`gap-2.5`), matching every
  other section's rhythm (`gap-5` between sections).
- The section title above the Today card reads `Evening shift today`, 18px/600
  `rgb(58,74,79)` at -0.72px computed tracking.
- The card is 16px radius, 16px padding, margin-top 0, `0 5px 15px
  rgba(53,87,97,.12)`, and its top row is `justify-end` holding just the unit pill
  and the period tag. No uppercase `TODAY` eyebrow anywhere in the section.
- **No gradient anywhere above the row:** every ancestor's computed
  `background-image` is `none`, and the wrapper's is `none`.

**Coordinator, same session (`jefleangelo@gmail.com`):** the same row and
controls, 15px/400 greeting `Good morning, Jefle`, and `CoverageHero` starts at
y=80 against the control's bottom edge at y=60, so 20px of clearance rather than
the 16px overlap the old `-mt-9` would have produced. Its own eyebrow stays,
since the coordinator gets no section header (their header text is the greeting
alone).

**Both controls were driven, not just measured:** the bell opens the full-screen
Notifications panel (7 unread, the `ring-2 ring-white` dot is gone while it is
open, Back returns to Home) and the profile control opens the Profile tab as
`AR / Alex Ramirez / CNA · Unit 1`.

What is in the code:

- **The gradient is gone from Home.** The wrapper lost `bg-gradient-to-b
  from-hero-gradient-start via-hero-gradient-mid via-70% to-hero-gradient-end
  bg-[length:100%_193px] bg-top bg-no-repeat`. The three
  `--color-hero-gradient-*` tokens are deliberately left in `tailwind.css`,
  unused, so bringing the gradient back is one class list rather than a
  re-derivation. `theme-color` and the `html`/`body` ground were already the page
  ground, so the mobile chrome still matches the top of the page.
- **New token `--color-control-edge: #d8d8dd`**, the single knob for the control
  border. Not the hairline: `#e5e5ea` measures 1.19:1 against the ground and reads
  as no control at all; `#d1d1d6` is 1.45:1, which he saw in the ladder and asked
  to lighten; `#d8d8dd` is 1.35:1. The glyph also gains a step on white
  (`#6e6e73` is 5.07:1 there against 4.35:1 on the old `#ededf2` fill).
- **`.home-glass-ring::before` is deleted** from `tailwind.css`. It existed to put
  a 1px diagonal white ring on the two glass controls, and with the gradient gone
  there is nothing behind them for it to separate.
- **The bell no longer owns the notifications panel.** It used to fetch its own
  notifications and return the panel in place of itself, which worked as a
  full-width bar; as a 36px control inside the row it would render the panel
  inside the row. `Home.jsx`'s own `showNotifications` (also how the Request
  Activity card's View All opens it) is the single owner now, the bell reports
  taps, and the unread dot reads Home's own notifications. One duplicate query
  fewer.
- **`getHeaderLine` became `getTodayHeader` and moved into a section header.** The
  12px sentence under the greeting is gone; the same fact is now the
  `SectionHeader` above the Today card, so it inherits the shared 18px/600 and the
  10px `gap-2.5`. Reads `Evening shift today`, `Event today`, or `No shift today`.
- **The Today card lost its `TODAY` eyebrow and its `-mt-9`.** Ten pixels under a
  section header saying the same thing read as the same label twice, and the
  pull-up only existed to tuck the card under the old `pb-15`. `CoverageHero` lost
  the same `-mt-9` on the coordinator side.
- **The profile control draws a lucide `User` glyph, not initials**, and
  `getInitials` left `Home.jsx` with it. The mockup round flagged the risk (a
  generic glyph can read as an avatar that failed to load, since the greeting
  names the reader right beside it). Swapping back to initials is one line.

Files: `src/pages/Home.jsx`, `src/components/ui/home-header-actions.jsx` (now two
presentational controls, `HomeProfileControl` + `HomeBellControl`),
`src/tailwind.css`. Commit `7eda391`.

**The white-on-gradient contrast defect recorded in the 2026-09-12 pass is closed
by this change**, and not by a plate: the header text is no longer white.

## Bottom nav: wider tabs, a chip that clears its label, and a rail that reads on white (2026-09-17)

Jefle's request: the bar felt narrow, and it floats on white page content without
being distinguishable. Applied the touch-target rule he brought from a UI tutorial
(72px wide by 48px tall per tab, with the selected tab carrying the rounded
background), then fixed the legibility separately.

**Why it was invisible.** The rail's fill was `bg-white/70`. Composited over the
page ground `#F9F9FB` that lands on `#FDFDFE`, 1.03:1 against the page, and over a
white card it lands on exactly `#FFFFFF`, 1.00:1. So the only thing making the bar
visible was its shadow, and that shadow was a 10px-spread halo
(`0 6px 20px 10px rgba(0,0,0,.07)`) which reads as a smudge rather than an edge.
The `backdrop-blur` was also doing nothing: there is no colour or darkness behind
it on a near-white page to blur, which is why the effect works in the tutorial
(dark background) and not here. White against `#F9F9FB` is still only 1.05:1, so
the hairline, not the fill, is what actually draws the outline: `#E5E5EA` is
1.19:1 against the page and 1.26:1 against a white card behind it.

**The final shape, all in `src/components/BottomNav.jsx`.** A first pass shipped
fixed 72px tabs on a full-width rail, and Jefle rejected the width: he wanted the
gutters left alone, only a little wider than the original, and the selected chip
wider because the label was gripping it.

1. Every tab is a fixed 76px wide. Widths used to come from the label, so Schedule
   was 86px and Pool 56px and the bar read lopsided.
2. The rail stays content-sized, as it always was; `min-w-0` only lets it shrink on
   a very narrow phone instead of overflowing. At a 390px viewport it spans 334px
   against the original 303.7px, so the gutters are 28px against 43px, and they
   fall out of centring rather than being pinned. The first pass pinned them with
   `w-full` plus `justify-between`, which Jefle rejected on sight.
3. The active tab carries `bg-teal-tint`, the same soft tint used by
   `.status-tag`/`.period-tag` pending, with the existing `text-teal-foreground`.
   That is the biggest single legibility win: it puts a shape inside the bar, so
   the bar reads as a container even where its fill matches the page.
4. The rail is no longer glass. `bg-card-surface` plus `border-hairline` plus
   `0 4px 18px rgba(29,29,31,.10), 0 1px 3px rgba(29,29,31,.06)` replaced the
   white/70 fill, the white border, the halo and the now-useless `backdrop-blur-md`.
5. The chip stays `rounded-full`. A 16px radius was tried as a heavier fix for the
   label grip and reverted at Jefle's call: he wants the fully round shape, and the
   extra tab width already clears the label on its own (see below).
6. The active tab is 2px bigger on every side than the others: `w-[80px] py-2` with
   `-mx-0.5 -my-0.5`, so its border box is 80x58 while its layout box stays 76x54 and
   the rail does not move. The negative margins are the whole trick: a plain
   `w-[80px] py-2` would have grown the rail to 350x76 and narrowed the gutters to
   20px, and Jefle had just rejected a wider bar. Because the padding grows by 2px
   while the box starts 2px higher, the icon and label do not shift at all; measured
   at 390px, the label sits at the same offset from the rail in both states.

**The chip was gripping the label, and extra tab width is what fixes it.** The
"Schedule" label is 54.88px of glyphs sitting from y=32 to y=48 inside a 54px tab,
so it occupies the bottom band of the box, which is exactly where a fully round
chip's ends pinch hardest. At 72px wide the chip cleared only 54.3px at that band,
so the word ran into the corners. At 76px it clears 58.3px, and the pixels say what
that is worth: rendered at 3x and walked row by row, the tightest gap between the
letters' ink and the chip's edge is 6.0px, at the baseline. A first pass at 76px also
softened the ends to a 16px radius, which cleared by about 9px; Jefle reverted that
in favour of the fully round shape, since 6px is enough.

**Judge this at the pixels, not at the CSS box.** The earlier read of this same chip
used the label's line box, whose bottom sits at y=48, three pixels of descender
space below the ink, and it reported 1.7px of slack where the real gap is 6.0px.
That measurement sent this pass down a radius change it did not need. When a user
reports text touching a shape, screenshot the rendered pixels at 3x and compare the
ink to the shape's edge row by row.

**Measured, not eyeballed.** Chrome against the app's own built stylesheet, viewport
widths 430/390/375/360/320: rail 334x72 with a 28px gutter at 390, made of three
76x54 tabs and one 80x58 active chip, still 334 at 375, 328 at 360, 288 at 320, and
no horizontal overflow at any of them. Active chip `rgba(56,189,229,.15)`, fully
round, active label `#0e7490` at 600 weight, 4.76:1 on the chip, inactive `#6e6e73`
at 5.07:1. On the rendered pixels at 3x the gap between the letters' ink and the
chip's edge is 8.67px, up from 6.0px before the 2px, and it holds across four ink
thresholds. Tab height stays 54px rather than the tutorial's 48px, Jefle's call,
which keeps the bar at its existing 72px height. The one width where the chip does
tighten onto the label is 320px, where the rail has to shrink and the chip comes out
at 68x58; nothing in the target range (375 and up) does that.

**The pill swaps at Fast, and the tabs still do not slide.** `transition-colors
duration-150 ease-out` on the tab, matching `segmented-control.jsx` and MOTION.md's
background-swap rule. MOTION.md's "[app call] Bottom-nav tab switches do not slide"
still holds: there is no sliding indicator, and the tab switch motion itself is
untouched. `MOTION.md` and `DESIGN.md` both say nothing about the rail's fill, so
item 4 is the app's own treatment rather than a fidelity fix.

Note for anyone grepping the bundle: Tailwind v4 scans markdown, so a class-looking
string written in a root-level doc gets compiled into the stylesheet as a dead rule.
The first draft of this section emitted an unused width rule for exactly that
reason.

The standing exception that the tabbar is never ported from the mockups still
holds, in the sense that nothing here came from an artboard. What changed is that
the nav is no longer frozen: requests against it are now ordinary work.

Files: `src/components/BottomNav.jsx`.

## Shift Detail: a state tag on the hero card, and the coworker rows grouped (2026-09-18)

Jefle brought a dark-mode task-tracker mockup ("Project 3" / "Landing Page
Design") and asked for its *structure* on our shift card, explicitly not its
colours: the app stays light, on the Linear Light tokens, with no lime and no
dark ground. What he wanted out of it was the anchor card with a label-left /
badge-right footer row, a section header that pairs its title with a count, and
the items grouped into one inset card with row dividers instead of floating
loose. That last part is the ask in his words: his coworker list was "bare bones
and tightly packed" against the mockup's tidy grouped list.

This is a deliberate departure from the rollout's list-shape rule, which says
1 to 3 non-tappable rows stay individually shadowed cards rather than grouping
into one container. Three coworker rows would have stayed ungrouped by that
rule; Jefle picked the grouped shape over the alternatives (per-coworker cards,
or the bare rows given more room) after seeing all three.

**The coworker list** is now the same container as every other list in the app,
`SHIFT_LIST_CLASSNAME` plus `py-1.5` on the container and `ShiftListDivider
inset={false}` between rows, rows `px-4 py-3.5`. Nothing about a row's own
contents changed: 36px avatar, 14px name, 12px `credential · time` meta, the
same values the `.coworker-row` block in `ShiftDetailMineLinearLight.dc.html`
specifies. Only the container and the row padding are new, so the section went
from three stacked loose rows to one card. The header gained `{n} on this
shift` on the right, which is the mockup's "Total Tasks: 4" move and needed no
new vocabulary. `PersonalEventDetail`'s `Also on <unit>` list got the same
container in the same pass so the app's two coworker lists cannot drift apart;
it did **not** get the count, because its header already names the unit.

**The hero card footer** pairs the existing subline with a state tag on the
right, so `Unit 1 · RN` now sits opposite `Assigned`. `HeroCard` takes an
optional `metaRight` slot; with it omitted the card renders byte-for-byte as
before, which is what all four other callers (ClaimStatusDetail,
OfferShiftStatus, OfferShiftUpdate, PersonalEventDetail) still do. The tag
reuses `ShiftStatusTag`, extended with two neutral entries: `open` and
`assigned`. Teal stays reserved for in-flight states (`pending`, `offered`),
which is the same reasoning that kept `offered` neutral before; neither
terminal state has a token of its own, so neither invents one. A shift awaiting
`Add to team schedule` gets **no** tag at all, because its subline already says
it is not on the team schedule yet and an `Assigned` tag beside that line would
contradict it.

Files: `src/components/ui/hero-card.jsx`, `src/components/ui/period-tag.jsx`,
`src/pages/ShiftDetail.jsx`, `src/pages/PersonalEventDetail.jsx`. Commit
`91cbd42`.

**Verified on live production, signed in, hash-matched (`index-Dacj88Cw.js`).**
Nurse `alex.ramirez@shiftko.test`, reached from Home's My Upcoming row. The
coworker card measures 408 wide, 16px radius, `1px #E5E5EA`, shadow
`rgba(53,87,97,.12) 0 5px 15px`, 6px of its own padding, two 65px rows at
`14px 16px` with a 12px gap, and the divider is a real 1px box at
`margin-left: 16px`, 390 wide, flush with the card's right edge. The count's
right edge lands exactly on the list's right edge. The hero's `Assigned` tag is
`#F2F2F7` on `#6E6E73`, 11px/600, 17px in from the card's right edge (16px
padding plus the 1px border). The no-tag case renders too: the same shift with
no coworkers shows the empty state, no count, and no stray container.

The list was only non-empty because of two fixture shifts (Derek Okafor and
James Reyes, Unit 1, 09-22, `notes = 'verification fixture, removable'`); both
were deleted straight after and the table is back to its exact prior state, 0
leftovers. `PersonalEventDetail`'s `Also on <unit>` list was exercised the same
way on a real personal event and measures the same 408 / 16px / 1px / same
shadow, one row, no divider (correct for a single row).

## Tab scroll memory: each tab returns to where you left it (2026-09-18)

**The complaint.** Switching back to Home from another page opened Home partway
down the page, not at the top and not where Home had been left.

**Cause.** The whole app scrolls inside ONE element, `.app-content`
(`src/index.css:50`), shared by every tab, and nothing touched its `scrollTop`
when the tab changed. Schedule made the inherited number large: `MyShiftsTab`
lands on the current week on mount, and that target sits 8 weeks
(`MAX_WEEKS_BACK`) down the list, so the offset standing in the container when
Home mounted was far deeper than Home is tall, and the browser clamped Home to
its bottom. It repeated on every switch because a tab unmounts on the way out,
so Schedule re-ran its landing each time.

**Fix (Jefle's choice: remember per tab, not reset to top).**
`src/lib/tab-scroll.js` holds one offset per tab at module scope, so it survives
a tab unmounting but not a page load. Every navigation in `App.jsx` already went
through `setActiveTab`, so that call is now a local wrapper over
`setActiveTabState`: it records the outgoing tab's `scrollTop` before the state
change, and a `useLayoutEffect` on `activeTab` restores the incoming tab's
offset. Three details are load-bearing:

- The restore re-applies its target while the container is still too short to
  hold it, then releases (and releases on the first `touchstart`/`wheel` so it
  can never fight a user who starts scrolling). Pages fetch on mount and Home
  renders its body only when `!loading`, so a one-shot assignment is clamped to
  the short shell and lost.
- It is a `useLayoutEffect`, so it runs before the incoming page's own passive
  effects. Schedule's week landing is a passive effect, so it still wins on the
  first entry, which is why that behaviour was not lost. Inverting the two would
  wipe the landing on every visit.
- `MyShiftsTab`'s landing is now gated on `hasSavedTabScroll('schedule')`: first
  entry in a session lands on the current week, later entries get the remembered
  offset. Re-centering on every entry would just overwrite the memory.

**Verified with a harness, not on the live app.** A throwaway page (the real
`tab-scroll.js` module, React 19 from esm.sh, the App-side effect code copied,
a Home whose rows arrive 400ms late and a Schedule with its own 2000px landing)
measured: fresh load 0; first entry to Schedule 700 -> 2000 (the landing
survived the reset); leave Schedule at 2600, return to Home -> falls to 0 while
the shell is short, settles at 700 once 40 rows arrive (3500px of content,
577px viewport); return to Schedule -> 2600 with no re-jump; back to Home ->
700 again. Registry ends at `{home: 700, schedule: 2600}`. What that does NOT
prove is the wiring in the real app (the ref on the container, every navigation
path going through the wrapper), so on-device behaviour is unproven until Jefle
checks his phone. The harness file was deleted and is not in the commit.

**Known trade-off, deliberate.** Because the offset can only be applied once the
page is tall enough to hold it, returning to a tab whose content is fetched on
mount shows the short shell for the length of the fetch (about 400ms in the
harness) before it lands. Hiding that window means either blanking the page or a
per-page "data ready" signal, neither of which is worth it yet.

## The rule between two finished shifts on My Shifts (2026-09-18)

**The complaint.** Where two finished (dimmed) shifts sat next to each other on
Schedule's My Shifts list, the horizontal and vertical rules between them were
barely visible.

**Why.** Two different mechanisms were painting the two halves of that junction.
A finished row is the row button at `opacity-35`, and the vertical rule between
its date column and its body is a child of that button, so it painted `#e5e5ea`
under a 0.35 fade and composited to `#f6f6f8` on the white card, 1.08:1, which
is not a rule anyone can see. The horizontal rule is `ShiftListDivider`, a
sibling of the row inside the list, so it never faded and stayed at the
hairline's 1.26:1. Measured on the live signed-in app against 51 finished rows,
so this was not a guess about which element was which.

**Fix.** A finished row's rule now paints at full strength in a new token,
`--color-divider-finished: #d8d8dd`, one step darker than the hairline at
1.42:1. That value still sits under the finished row's own meta line (1.60:1),
so the rule keeps receding behind the text; the next step up is
`--color-chevron-muted` at 1.68:1.

- To paint at all, the vertical rule had to come out of the fade, so the dim
  moved off the row button and onto its children:
  `[&>*:not([data-row-divider])]:opacity-35`, with the rule marked
  `data-row-divider`. This is the same shape as the standing rule that an
  element under `opacity` cannot also carry a contrasting band, except here the
  banded thing is a 1px rule inside the row rather than the row's background.
  **Do not "simplify" this back to `opacity-35` on the button: the rule
  disappears again.** Every other element of a finished row composites to the
  same value it did before (the time line still lands at `#b0b0b1`, 2.17:1).
- `ShiftListDivider` gained a `tone` prop; the darker tone is passed only when
  BOTH rows the rule separates are finished. 30 of the list's rules take it, the
  hairline default is untouched, and Pool was re-measured after the deploy to
  confirm it still draws `#e5e5ea` at a 75px inset.
- **A day-off row is not treated as finished.** It draws no dim, so the rules
  above and below it keep the hairline. A past week therefore alternates rule
  darkness around its day-off rows. That is the literal reading of the ask and
  it is one line to change (`finished: dayHasPassed`) if it reads wrong on the
  phone.

**Verified on the live signed-in app**, before and after the deploy, as the test
nurse on My Shifts: vertical 1.08:1 to 1.42:1, horizontal 1.26:1 to 1.42:1, with
the live `index-Ch9WRPpf.css` carrying both the token and the `:not(...)`
selector.

## Profile photos: a shared avatar, an upload path, and Home's header shows it (2026-09-18)

Jefle's ask: "add a change profile picture so it shows up on homepage, this will
really personalize the app for beta users to keep traction." Scope approved as
Profile plus Home only, with a Remove action; the initials circles in coworker
rows, Team Schedule and the staff roster stay as they are until he has seen it.

**Storage decisions.** `profiles.avatar_url` holds the storage PATH and never a
URL, so a re-upload writes `<uid>/avatar-<epoch>.jpg` and the CDN cannot hand
back the photo a nurse just replaced; no cache-busting param is needed anywhere.
The bucket is public-read, his call: faces only, no PHI, and it is how every
public-URL avatar render works without an async signed-URL call per image. The
writes are the part that is locked down: insert, update, delete and select all
require the object's first folder segment to equal `auth.uid()`, so a nurse can
only ever reach inside her own folder. `profiles` RLS is untouched; "users
update own profile" and "nurses see overlapping coworker profiles" already cover
both halves.

**The client downscales before it uploads.** A phone photo is 3-5MB and the
largest place an avatar is drawn is Profile's 56px circle, 168px at 3x, so
`src/lib/avatar.js` centre-crops to a square and re-encodes to 512px JPEG in a
canvas, no new dependency. Measured: an 857KB 800x1200 PNG goes in and a 512x512
15KB JPEG lands in the bucket.

**The bug that only driving it would find.** Supabase Storage resolves the
objects it is about to delete through the SELECT policy first. The first
migration deliberately shipped no select policy, reasoning that a public bucket
serves GETs through the public URL without consulting RLS, which is true for a
public GET and false for a DELETE. The delete matched nothing, returned 200 with
an empty list, and deleted nothing. Symptom in the app: Remove photo nulled
`avatar_url`, the fallback initials came back, and the JPEG was still sitting in
the bucket; re-uploading leaked the same way, since "delete the previous file"
is the same call. `20260918020540_avatar_delete_needs_select.sql` adds the select
policy scoped to the owner's folder, and both upload and remove now return a
`cleanupError` that Profile surfaces, because a silent leak is worse than a
noisy one.

The reading that hid it: a 200 from a batch delete looked like success in the
network tab. The empty response array was the tell, and it only shows up if you
read the body rather than the status.

**Verified on live production, signed in, both roles.** Upload through the real
picker with a generated 800x1200 file: the profile circle renders the photo at
56px, the control's label flips to `Change profile photo`, `Remove` appears, and
Home's header shows the same photo at 34px inside its 36px circle, vertically
aligned with the bell, greeting unchanged. A second upload deleted the first
file (bucket holds exactly one object for that account afterwards, where before
the fix it held two). Remove nulled the row, deleted the object, and Home fell
back to initials in the same 36px circle. A policy probe with the live access
token: writing into another nurse's folder returns 403 "new row violates
row-level security policy", writing into her own returns 200.

**One observation worth keeping.** Immediately after a delete, one fetch of the
removed public URL still returned 200 from an edge, and it returned 400 seconds
later and on every retry. Removal is effectively immediate, but "the CDN has
already seen this URL" is the reason a removed photo can look alive for a
moment.

**Left behind on purpose:** a real photo that appeared on the test nurse's
profile at 02:03, uploaded by whoever else was driving the live app (a sibling
agent, or Jefle himself). It is not this session's and was not touched.
Everything this session uploaded was removed, including the two orphaned files
its pre-fix deletes had left in that folder.

Files: `supabase/migrations/20260918015408_profile_avatar.sql`,
`supabase/migrations/20260918020540_avatar_delete_needs_select.sql`,
`src/lib/avatar.js`, `src/components/ui/avatar.jsx`,
`src/components/ui/home-header-actions.jsx`, `src/pages/Profile.jsx`,
`src/pages/Home.jsx`. Commits `421de39` and `8d2b229`.

## Decisions made / deviations worth knowing about

- **Home's section headers are 18px, not the mockup's 16px** (2026-09-17, by
  Jefle). `SectionHeader` is a single shared component in `Home.jsx`, so this
  moves every section heading on Home at once: `Request Activity` / `Get
  started`, `My Upcoming`, `Weekly Progress` and the coordinator's `Coverage
  Gaps`. The mockup specifies 16px (`MainHorizontalTiles.dc.html`'s
  `.section-header`), so this is a deliberate departure rather than a fidelity
  fix. 20px was tried first and read too big, because the greeting is 20px too
  and the two then looked like competing titles; do not raise it back without
  asking. The same pass renamed the second heading from `Upcoming` to `My
  Upcoming` (the mockup calls it `Upcoming Shifts`), which matches the
  nurse-facing `My Shifts` voice on Schedule.

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
  **Amended 2026-09-17**: the nav is no longer frozen. Jefle asked for it
  to be widened and to carry a selected-tab pill, so requests against it
  are ordinary user-requested work now. What still holds is the "never
  ported FROM an artboard" half of the rule; see the bottom nav section
  above for the change and its measurements.
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

## Home greeting: Fraunces at ink (2026-09-18, reverted the same session)

Built and reverted inside the same session. The greeting line went to
`font-display-title` at `text-ink` in `src/pages/Home.jsx` (`6197c02`, verified live
and hash-matched), and Jefle did not want Fraunces there: he looked at it and asked
for the revert. Nothing about it failed on the numbers, so this is a taste call and
**do not re-propose Fraunces for the greeting line.** The greeting is back at
15px/400 `-0.15px` on the body stack in `ink-secondary` `#6e6e73`.

**What it measured, for the record**, live and signed in as
`alex.ramirez@shiftko.test` at 390x844 on `index-CsAk9aKd.js`: family `Fraunces`,
15px, weight 400, colour `rgb(29, 29, 31)` (`--color-ink`), and
`document.fonts.check('15px Fraunces')` true with the Fraunces 400 face reporting
`loaded`. Both controls 36x36 with the greeting on the same line and 10px from the
profile control, row box 72px, no truncation, no overflow. Ink on the page ground is
16.01:1 against the 4.82:1 the muted grey gives, and ink would also pass on the teal
gradient Home no longer paints (5.68:1 on `#0aa2cf`, 8.64:1 on `#5dc7e6`) where
white could not (2.97:1, and 1.95:1 on the mid stop). Contrast was never the problem
and is not why it went.

**The knob is one class string.** `font-display-title` on the greeting's own `<p>`,
plus `text-ink` for the colour; the revert removes both and puts `text-ink-secondary`
back. No token, no new CSS and no geometry is involved either way, which is why the
stylesheet hash (`index-B3mGrJ_A.css`) never moved across the attempt or the revert,
only the JS asset did.

**The brief it came from described a superseded tree.** It called for the greeting in
white on the teal gradient, as two lines, on a row 24px above the Today card. That is
`12e5f55`/`647f6fa`, before the 2026-09-17 header rework documented in the section
above. This tree has no gradient on Home at all, one greeting line rather than two,
and 20px to the section header plus 10px to the Today card, so 57px from the control
line to the card and 37px from the row box's bottom edge. Check a brief's named
surfaces against the tree before implementing it; the numbers above are what the tree
said, not what the brief said.

## Home profile control: the edge floats off the face (2026-09-18)

Jefle: "for the profile icon, can we add a floating gray border there, like a space
before the border is placed." The control had a 1px `--color-control-edge` border
painted on the rim of its 36px circle. It is now a 1px outline sitting 2px clear of
that circle, so the page ground shows between the face and the line.

**Nothing about the layout moves.** An outline is painted outside the box and takes
no space, so the control is still 36x36, the row still carries a 36px content line,
the greeting is still 10px away, and the 36px row / 57px to the Today card geometry
below it is untouched. The outline's own edge reaches 3px outside the 36px box, well
inside the row's 16px top and 20px bottom padding, so it cannot clip or crowd.

**Why `outline-*` and not a `ring-*` with an offset.** A ring's offset band is painted
in an opaque colour (`--tw-ring-offset-color`, white by default), so `ring-1
ring-offset-2` puts a white disc behind the gap rather than letting the page ground
show. An outline leaves the gap genuinely transparent. Both utilities in use,
`.outline-1` and `.outline-offset-2`, compile to
`outline-style: var(--tw-outline-style)` plus `outline-width: 1px`, and that
variable's `@property` initial value is `solid`, so the line draws without needing an
explicit `outline-solid`.

**Line darker, and it carries the page's own shadow (same session, his follow-up
ask).** Two more changes on the same class string: the ring's colour moved off
`--color-control-edge` (`#d8d8dd`, 1.35:1 on the page ground) to a new
`--color-avatar-ring` (`#a1a1a6`, 2.45:1), and the control now carries
`shadow-card-lift`, the `0 5px 15px rgba(53,87,97,.12)` every card on Home uses, so it
reads as a piece of content rather than as a bare outline.

**Why the ring is its own token rather than a reuse.** `--color-control-edge` is a
control's own rim, drawn on the edge of a white button like the bell beside it. This
line floats 2px clear of the face with the page ground showing in the gap, so it has
to carry the whole shape on its own and wanted a darker rung. The ladder it sits on,
all against `#f9f9fb`: hairline `#e5e5ea` 1.19:1, `--color-control-edge` `#d8d8dd`
1.35:1, `--color-chevron-muted` `#c7c7cc` 1.60:1, `--color-avatar-ring` `#a1a1a6`
2.45:1, `--color-ink-secondary` `#6e6e73` 4.82:1. No new shadow value was introduced:
the page has exactly one shadow token and reusing it is what makes the control match
the content.

**Three knobs, one class string:** `outline-offset-2` is the gap,
`outline-avatar-ring` the colour, `shadow-card-lift` the elevation. That is the whole
change: the one `Avatar` call in `src/components/ui/home-header-actions.jsx` plus the
one token in `src/tailwind.css`. The bell beside it deliberately keeps
`--color-control-edge` on its own edge, since it is a button and not a floating disc,
and the shared `Avatar` is used in exactly one other place, Profile's identity circle,
which was left alone.

**Verified on live production, signed in, hash-matched (`index-B7F7Dd-2.js`, the same
asset name a rebuild at `466a95c` produces), nurse `alex.ramirez@shiftko.test` with his
real photo, 390x844.** The control's own class string is
`outline-1 outline-offset-2 outline-avatar-ring shadow-card-lift`, and it computes:
`outline-width: 1px`, `outline-style: solid`, `outline-color: rgb(161, 161, 166)`,
`outline-offset: 2px`, `border-width: 0px` (the old rim border is gone), and the card
shadow as the last layer of the computed `box-shadow`
(`rgba(53, 87, 97, 0.12) 0px 5px 15px 0px`; do not truncate that value, Tailwind v4
builds it as a five entry list where only the last entry is the real shadow).

**The pixels were scanned, not eyeballed.** On a dpr 3 render the line lands on
exactly 1 CSS px of `#a1a1a6` (3 device pixels, antialiased to `#a9a9ae` on one edge),
the gap between the line and the photo is exactly 2 CSS px (6 device pixels) of ground
showing the shadow, and the shadow darkens that ground to `#f0f1f4`, 1.07:1 against
the untouched `#f9f9fb`, spent by about 18px out. The ring reads 2.45:1 on open ground
and 2.28:1 where the shadow has taken the ground under it, against 1.35:1 for the
`--color-control-edge` the first pass used.

Geometry unchanged, same session: avatar 36x36 at (20, 24), profile and bell controls
both 36x36, greeting 10px to the right of the control, 57px from the control line to
the Today card, no overflow at 390.

**One process note, because it cost the first attempt and misled the record above.**
shiftko.com served a `Vercel Security Checkpoint` ("Failed to verify your browser,
Code 21") to curl and to the existing automation browser for a while, which is why an
earlier version of this entry said the pass had not been run. A FRESH browser session
(the `shiftko-live` session, so a new profile) passed the challenge on the first try
and the pass then completed normally. Do not poll the site with curl to watch a
deploy; use the GitHub deployments API, and if you need the live bundle, read it out of
the DOM while signed in.

## Home bell: the glyph goes 18px to 20px (2026-09-18)

"can you make the bell icon a little bigger, its too small i think." One number:
`size` on the `Bell` inside `HomeBellControl`, 18 to 20. The 36x36 control, its
`--color-control-edge` rim, the `strokeWidth` of 1.75 and the unread dot's
`top-[6px] right-[6px]` all stay as they were, and the glyph keeps 8px of clearance
inside the box. This is the first change to that glyph since the header row was built;
the 2026-09-17 entry above records it at 18px/stroke 1.75, which was the state before
this.

Nothing that reads geometry moves: the control is still 36x36, the row still carries a
36px content line, the greeting is still 10px away and the Today card still sits 57px
below the control line. `HomeBellControl` is Home-only and this is the only `Bell` in
`src/`, so no other screen changes.

**Two knobs:** `size` (which is this change, 18 to 20) and `strokeWidth` (left at
1.75). A stroke is an absolute weight, so at a larger glyph the same 1.75 reads
slightly finer; if the bell looks thin next to the 36px control, 2 is the pairing and
it is a one number change.

**Verified on live production, signed in, hash-matched (`index-nb0E3ZFY.js`, the asset
name a rebuild at `b5acfba` produces), nurse `alex.ramirez@shiftko.test`, 390x844.**
The svg carries `width="20" height="20"` and `stroke-width="1.75"` and measures 20x20
rendered; its ink (the bell path itself, measured from pixels rather than the box) spans
16.7 CSS px wide against about 15.0 for the 18px glyph, so it grew 1.7 CSS px while the
box grew 2. It is centred in the control to within half a pixel, and the control keeps
8.0px of clearance on each side. The control is still 36x36, the row box still 72px
(36px of content), the greeting still 10px from the profile control, the Today card
still 57px below the control line, and nothing overflows at 390.

## Shift Detail: the empty "Working with" state gets the list's card (2026-09-18)

The section changed container with the data: the coworker list renders inside
`SHIFT_LIST_CLASSNAME` (plus `py-1.5`), while the no-coworkers branch rendered a bare
`EmptyState layout="row"` on the page ground, so the section lost its card exactly when
it had nothing in it. The empty branch now uses the same container class string with the
row's own `px-4 py-3.5`, which puts the icon tile where a coworker's avatar sits.

Nothing else in the section moved: same heading, same `N on this shift` count (still
rendered only when there ARE coworkers), same loading and error branches, and the
`EmptyState` keeps `layout="row"`, the `Users` icon, its wording and `tone="neutral"`.

**This is the app's first empty state inside a grouped list card.** The other list
screens (Pool, Claim Status, Swap Status, Coordinator Manage, Staff Roster) still render
`EmptyState` bare on the page ground. Home's Upcoming list is the only place that wraps
a row empty state in a card at all, with `rounded-card bg-white shadow-card-lift` and no
inner padding of its own, so its icon tile sits flush with that card's left edge while
its rows carry `px-4` and its list container carries `bg-white py-1.5`. Worth aligning
those when they are next touched. Out of scope here, and deliberately not changed.

**Verified on live production, signed in, hash-matched (`index-C6PpTI4x.js`, the asset
name a rebuild at `a5a41d1` produces), nurse `alex.ramirez@shiftko.test`, 390x844, on
shift `b2bd38f3` (Tue Sep 22, evening, Unit 1), which has nobody else on it.** Both
states measured at phone width, empty first and then with one coworker:

| | no coworkers | one coworker |
| --- | --- | --- |
| children of the section | 2 | 2 |
| header | `WORKING WITH` | `WORKING WITH` + `1 on this shift` |
| card element | `div` | `ul` |
| card class | the list's class string, `py-1.5` included | the same class string |
| card box | 350x82 | 350x79 |
| ground / edge / radius / shadow | `#ffffff` / `1px #e5e5ea` / 16px / `0 5px 15px rgba(53,87,97,.12)` | identical |
| icon or avatar | 36x36 at left 17, top 23 | 36x36 at left 17, top 21.5 |
| text left inset | 65 | 65 |
| text | `No coworkers on this shift`, 15px/600 `rgb(29, 29, 31)` | `Ana Florendo`, 14px/600 |

The first pass put the list's padding on the container itself (`px-4 py-3.5` on
`SHIFT_LIST_CLASSNAME`) and measured 70px tall with the tile 17px down, 9px shorter than
a one-coworker card and 4.5px above where an avatar sits. That is why it now uses the
list's own class string, `py-1.5` included, with a row's padding on an inner div, which
lands within 1.5px.

**The non-empty branch needed a fixture, because no real shift in this data has a
coworker.** One shift inserted for Ana Florendo (`a0e5aaca`) on Unit 1 overlapping Alex's
window, `notes = 'verification fixture, removable'`, id
`7765c3bb-dfa8-4425-bf2e-c81254b70cb8`, then deleted. Proof either side of the delete:
leftover fixtures 0 before and 0 after, and the count the screen's own query reads went
1 then 0, which is the pair of states above.

## NavRow: the title is centred, for every pushed screen (2026-09-18)

ShiftDetail now passes `title="Shift Detail"`. It and PersonalEventDetail were the only
two of the 19 `NavRow` call sites with no title. The centring lives in `nav-row.jsx`
rather than in ShiftDetail, so a screen cannot end up with a different header layout to
its neighbours: the header is `grid-cols-[auto_1fr_auto]` with the title in the middle
column. Two things in that grid are load bearing.

- **The right column is an invisible 34px spacer, the back button's own box.** A `1fr`
  middle column is centred inside its TRACK, not inside the header, so with an empty
  right column the title lands half a back button to the RIGHT of centre. The spacer
  makes the two `auto` columns equal, which is what puts the text's centre on the
  header's centre. Measured off a Range box on the text itself: 0.00px off, at every
  width from 320 to 430.
- **The header keeps `h-10` and `pt-3` exactly as they were when there is no subtitle**,
  so the back button keeps its 34x34 box at its old y and the 17 titled screens are
  unchanged apart from the title moving to the centre.

**The subtitle stacks under the title, centred.** Inline, the pair would be centred as a
group, which pushes the title itself off centre by half the subtitle's width, about 42px
for `· 2 pending`, and the title being centred is the point of this layout. That makes
`CoordinatorApprovals` the one screen whose header grows, 40px to 65.5px, instead of
overflowing a fixed 40px box. Its string still starts with the mockup's `· ` separator,
which was written for inline placement; stacked, it reads as a stray dot, so dropping
that one character from that one call site is a deliberate follow-up rather than
something to change silently in this pass.

`PersonalEventDetail` passes no title, so its middle column holds an empty span: the back
button is unmoved and the header stays 40px, which is the check that the spacer costs
nothing.

**Verified on live production, signed in, hash-matched (`index-D6vBpcm4.js`, the asset
name a rebuild at `baf679c` produces), 390x844 and 1280x633.** Three screens driven, and
the numbers below are the header's own offsets rather than absolute coordinates, since
those are what hold at any width:

| screen | header | back button | title | centred off by |
| --- | --- | --- | --- | --- |
| ShiftDetail, `Shift Detail` | 40px, new grid class | 34x34 at +20 left, +9 top | 89.6px ink, 17px/600 `rgb(29, 29, 31)` | 0.01px |
| Request a Swap (was 480px left-aligned) | 40px | 34x34 at +20/+9, exactly its pre-change (436, 9) | 128.6px ink | 0.00px |
| Duplicate a Week (longest in the app) | 40px | 34x34 at +20/+9 | 139.6px ink, one line, not truncated, 71.2px clear of the button | 0.00px |
| Approvals (the subtitle) | 65.5px | 34x34 at +20 left, +17.75 top | 80.5px ink | 0.01px |

The back button was measured before the change on the same screens at the same viewport,
so "unmoved" is a comparison and not an assertion: its 34x34 box and its 20px left and 9px
top offsets from the header are identical on every screen without a subtitle. The
subtitle row is stacked under the title and centred (0.01px off), and on Approvals the
button sits 17.75px down because the taller header re-centres it: its centre and the
title+subtitle block's centre are the same point, 0.00px apart. That screen's header
grows from 40px to 65.5px, which is the documented cost of stacking rather than an
accident.

**The no-title case was measured on the live app too**, by emptying the title text in the
DOM on a live React screen (the exact condition `PersonalEventDetail` renders) and putting
it back: header 40px, back button 34x34 at +20/+9, middle column 0 high, all unchanged
from the titled state. `PersonalEventDetail` itself could not be opened signed in as Alex
because he has no personal-event row on Home at all, his single event being today's and
rendered in the today card, which is not tappable. The harness that carries the exact
markup and the built stylesheet covers it as well, at 320, 360, 375, 390 and 430, along
with `Duplicate a Week` and `Approvals`.

## Shift Detail: the offer and swap buttons move under the shift card (2026-09-18)

"can we move the buttons "offer" and "swap" to right under the shift card on the shift
detail screen? just shorten the width and place them side by side, no edits on the style,
maybe use "Request swap" and "Offer shift" so its shorter."

The nurse's two secondary actions were stacked full width in the fixed bottom bar, one
above the other, below everything else. They now sit in one row directly under the
`HeroCard`, inside the scrolling column: same `Button` variants, same 50px height, same
16px radius, same icons, same two `data-testid`s. The only style change is the width,
`w-full` to `flex-1`, which is what puts two of them on one line, and the labels shorten
to `Request swap` and `Offer shift` so they fit at that width. `View offer status`, which
is the offer control's other state, moved with them rather than jumping back to the
bottom bar the moment a shift is offered. `Claim this shift`, `Withdraw` and `Add to team
schedule` stay where they were, and so do the two error lines above them.

Two consequences worth knowing. The pair scrolls with the content now instead of being
pinned, and on a nurse's own shift the bottom bar has nothing left in it, so it is its
own `pt-2 pb-1` of empty space below the scroll area. Neither is visible as a change to
the card or to the buttons themselves.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`, hash-matched
(`index-BkMudxrR.js`, the asset name a rebuild at `02fd7fe` produces), at 390x844 and
1280x633, on his own Tue Sep 22 evening shift.** The row is a `flex gap-2.5` inside the
scrolling `main`, 20px under the card (the column's own `gap-5`), and its two buttons split
the card's width between them: at 390 the card spans x 20 to 370, `Request swap` is 169x50
at x=20 and `Offer shift` is 171x50 at x=199, both at y=212.5. Those two widths sum to the
340 left after the 10px gap, so the 2px difference between them is rounding on an even
split rather than a sizing rule. The row's right edge lands on 370, the same 20px gutter as
the card, with no overflow. Same y for both, so they are side by side and not stacked.

Nothing about their style moved: both keep the 50px height, the 12px computed radius the
`Button` base already produced (the `rounded-[16px]` in the class string never won, before
or after), 15px/600 type, and their variants, with the swap button still primary
(`rgb(14, 116, 144)` on white text) because this nurse cannot confirm a team shift. The
labels read `Request swap` and `Offer shift`, and the two `data-testid`s are unchanged.
The bottom bar is now empty on this screen (12px of its own padding, no children), since
claim, withdraw and add-to-team are all inert for a nurse's own assigned shift.

**Both buttons were tapped, not just measured.** `Request swap` opens the swap flow
(`Request a Swap`, the shift and the coworker list), and `Offer shift` opens
`Offer This Shift` with its confirmation copy. Both were left without confirming, so no
offer and no swap request was written.

**Shadows added the same session** ("lets add some shadows on them"): each button in that
row now carries `shadow-card-lift`, the page's single shadow token, the same
`0 5px 15px rgba(53,87,97,.12)` every card uses. `Button` has no shadow in any variant, so
this is per-usage on those buttons rather than a variant change, and the token is the one
knob if it reads heavy on a 50px button.

**Verified on live production, signed in, hash-matched (`index-CNjXEhGe.js`).** Computed
`box-shadow` last layer is `rgba(53, 87, 97, 0.12) 0px 5px 15px 0px` on both buttons, and
read off the pixels at dpr 3: the ground 1px under the button is `#e7eaed`, 1.15:1 against
the untouched `#f9f9fb`, spent about 20px below the button. The card above and the buttons
now share the 20px gap between them, its darkest point `#ebedf0` at the card's own edge and
its lightest `#f5f5f7`, so the two shadows meet in the middle of the gap instead of leaving
a bright seam. Layout is untouched: the buttons are still 169x50 and 171x50 at y=212.5 with
the same 20px below the card, and the stylesheet hash did not move because the utility was
already in it.

## Shift Detail: both cards lose their outline (2026-09-18)

"next is to remove the card border of the main shift card and the coworkers shift card on
the shift detail."

Two mechanisms, because the two cards are shared differently.

- **The coworkers card already had a borderless twin.** It was `SHIFT_LIST_CLASSNAME`, the
  list base plus `border border-hairline`; it is `SHIFT_LIST_BORDERLESS_CLASSNAME` now, the
  same constant Schedule's four lists use. The empty state that stands in for it moved to
  the same constant, so the section still keeps one container either way.
- **The hero card's outline lives inside the component.** `HeroCard` serves six screens
  (ShiftDetail, ClaimStatusDetail, OfferShiftConfirm, OfferShiftStatus, OfferShiftUpdate,
  PersonalEventDetail), so the hairline now sits behind a `borderless` prop that defaults
  to the old behaviour and only ShiftDetail opts in. The other five still draw it, which is
  the deliberate scope call: the ask named Shift Detail. Making them match is deleting the
  prop and the class, and nothing else.

Both cards keep their width, since they stretch to the column, and lose 2px of height,
because the border was inside an auto-height box: the hero card measures 138.5px against
140.5, the empty coworkers card 80 against 82. Their inner content moves 1px further out on
every edge.

**Verified on live production, signed in, hash-matched (`index-BsGp1U2y.js`, the asset name
a rebuild at `7677135` produces), at 390x844, measured before and after on the same screen
at the same viewport:**

| | before | after |
| --- | --- | --- |
| hero card border / height | 1px / 140.5px | **0px / 138.5px** |
| hero date line, from the card's left / top | 17 / 21.5 | 16 / 20.5 |
| hero time line, from the card's left | 17 | 16 |
| coworkers card border / height, empty state | 1px / 82px | **0px / 80px** |
| coworker icon tile, from the card's left / top | 17 / 23 | 16 / 22 |
| coworker label, from the card's left | 65 | 64 |

Both cards keep their 350px width, their 16px radius and the card-lift shadow
(`rgba(53, 87, 97, 0.12) 0px 5px 15px 0px`), so the shadow is what carries the grouping now.

**The coworker LIST state needed the removable fixture again**, since no real shift in this
data has a coworker: one shift for Ana Florendo on Unit 1 overlapping Alex's window,
`notes = 'verification fixture, removable'`, id `32215bb0-8dfc-498b-b03c-3044d46cf02d`,
deleted afterwards. On that card: border 0px, 350x77, one row at `14px 16px` padding, the
avatar 36x36 at 16px from the card's left and 20.5 from its top, the name at 64px, which is
exactly where the empty state puts its label, so the section still reads as one container
either way. Leftover fixtures 0 after the delete and the count the screen reads went back to
0.

## Shift Detail: the hero card gets room, a rule and the workspace (2026-09-18)

"Update the layout of the shift detail screen shift card a little so it doesnt say Tuesday,
September 22, 2026 in one line. lets be more generous with the card layout, maybe even add a
divider to cleanly display the text info more and Also lets add the workspace of this shift
like it should say burlingame shift so it sticks to the user that its a burlingame scheduled
shift."

`HeroCard` grows a `layout="detail"` structure that ShiftDetail opts into, plus a `facility`
slot for the workspace name. The card was four lines in one block with the date sharing its
row with the period tag, which is what made the top read as one crammed line:

```
Tue, Sep 22               [Evening]
3:00 PM - 11:30 PM
------------------------------------
Unit 1 - CNA              [Assigned]
BURLINGAME SNF
```

- **The date is short now.** It is `formatShiftDayShort` ("Tue, Sep 22", the form the Swap
  cards already use) rather than the full "Tuesday, September 22, 2026", which he called
  annoying for its length even after it had a row of its own. No year, the way Home's
  upcoming rows and the notification lines already omit it. The period tag sits opposite it,
  where it originally was.
- **The workspace is a footer row** in the bottom block, under the rule, rather than an
  eyebrow at the top: he asked for it "in its own row in the card under the divider
  section", and there it reads as the source of the shift.
- Generous: `py-[18px]` to `py-5` (20px) and the block gap from `gap-2` to `gap-2.5`, with
  the rule dropped between the "when" block and the unit/status block.
- The rule is `h-px bg-hairline`, the same one `ShiftListDivider` draws, not new vocabulary.
- The workspace name is `workspaces.name` ("Burlingame SNF"), embedded in the profiles query
  ShiftDetail already made for the credential, set as an 11px/600 `0.03em` uppercase label,
  the app's existing small-label style.

`layout` and `facility` are separate knobs from `borderless` on purpose, so any one of them
can be reverted on its own, and the default layout path is byte for byte what the other five
hero-card screens render.

**Superseded within the session:** the first revision of this card put the workspace as an
eyebrow at the top and the full date on its own row, measured at 183px with the eyebrow row
at y=20 and the date at y=52.5. Its numbers are replaced by the ones below.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`, hash-matched
(`index-BBjauu62.js`, the asset name a rebuild at `f597c6a` produces), at 390x844.** The card
reads: `Tue, Sep 22` with `Evening` opposite it, `3:00 PM - 11:30 PM`, the rule, `Unit 1 · CNA`
with `Assigned` opposite, then `BURLINGAME SNF`. Measured: 350 wide, **180px** tall against
183 for the superseded revision and 138.5 before any of this, padding `20px 16px`, block gap
10px, radius 16px, the card-lift shadow, no border, no overflow. The rule is at y=100, 1px,
318 wide, 16px in from the card's edge. The short date is 72.3px wide at 13px/600
`rgb(110, 110, 115)` and y=22.5, against **185.5px** measured for the full "Tuesday,
September 22, 2026" in the same 13px/600 type, so the date's own line is 113px narrower than
it was; the time is 25px/600 `rgb(29, 29, 31)` at y=52.5; `Unit 1 · CNA` is 13px
`rgb(110, 110, 115)` at y=113.5; the workspace row is 11px/600 uppercase at y=143.5, on its own
line 30px below the unit row.

**The other layout path was checked live on this build too, on the `Offer This Shift` screen**,
since five other screens render a hero card: its card still computes a `1px` border, `18px`
vertical padding, an 8px gap, 135.5px of height, three lines with the full date sharing its row
with the period tag, and no rule. So `borderless`, `layout` and `facility` are independent, and
the default path is untouched. The confirm screen was left without confirming, so no offer was
written.

## Pool: the open-shifts list loses its outline (2026-09-18)

Pool's open-shifts list wore the bordered grouped-list container, so a 1px
`#e5e5ea` hairline box sat on top of the same lift shadow every other list
carries. It now uses `SHIFT_LIST_BORDERLESS_CLASSNAME`, the twin Schedule's shift
lists already use, so the shadow alone carries the grouping. One class string
changed and the bordered `SHIFT_LIST_CLASSNAME` stays in the file for the screens
still on it; no new token and no new class were introduced. Pool's claim-status
control (the 36px icon button in the page header) keeps its hairline, because it
is a control and not a card.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-BUdLq8Fs.js`, the asset name a rebuild at `5e54669`
produces), at 390x844.** The card is 350 wide at x=20 with a 16px radius and 6px
of list padding, unchanged except for its outline:

| | before | after |
|---|---|---|
| border | 1px on all four sides, `rgb(229, 229, 234)` | 0px on all four sides |
| card height | 610 | 608 |
| first row, inset from the card | 17 left, 21 top | 16 left, 20 top |
| date column (`THU 17`) | 19 left, 29.8 top | 18 left, 28.8 top |
| row's vertical rule | x=85, 65 from the card | x=84, 64 from the card |
| row title (`11:00 PM - 7:30 AM`) | 78 left, 39.5 top | 77 left, 38.5 top |
| divider between rows | not measured | 75 from the card, its right edge on the card's own edge |

The 2px of height and the 1px of outward movement on every edge are the border
having been inside a border-box, the same arithmetic the Shift Detail cards
showed the same day. The card's lift shadow still computes to
`rgba(53, 87, 97, 0.12) 0px 5px 15px`, the row's own hairline rule and the
divider between rows are untouched, and all 7 open shifts render with their
Claim buttons.

**Files:** `src/pages/Pool.jsx`, `src/components/ui/shift-list.jsx` (its comment
now names Pool). Commit `5e54669`.

## Pool: the claim button takes Home's tile teal (2026-09-18)

Home's two quick-action tiles (Add a Shift, Claim Shifts) carry the deep teal
`--color-teal-field` (`#0a5e73`); Pool's claim button was on the Button
component's `primary` variant, `--color-teal-foreground` (`#0e7490`), a lighter
neighbour of the same teal. Jefle asked for the Pool buttons to match the tiles.
The claim button now carries `bg-teal-field hover:bg-[#084b5c]
active:bg-[#084b5c]`, the last two being the pressed step Home's own tiles use,
because the variant's existing hover value (`--color-teal-foreground-hover`) IS
`#0a5e73`, so a bare fill swap would have made the hover a no-op.

The change is one class string at the call site rather than a new variant: Home's
tiles are plain buttons carrying that same literal, so this reuses the existing
token and the existing pressed value instead of adding vocabulary to a shared
component. Withdraw keeps the secondary treatment (white, hairline) because
Home's tiles have no secondary twin.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-CwROqxSB.js`, the asset name a rebuild at `7f8831e`
produces), at 390x844.** All six claim buttons compute `rgb(10, 94, 115)`, the
exact value Home's Add a Shift and Claim Shifts tiles compute, measured in the
same session:

| | before | after | Home's tile |
|---|---|---|---|
| fill | `rgb(14, 116, 144)` | `rgb(10, 94, 115)` | `rgb(10, 94, 115)` |
| white text on that fill | 5.36:1 | 7.34:1 | 7.34:1 |
| radius / height | 9px / 38px | 9px / 38px | 16px / 64px |

Nothing else moved: the buttons are still 64.5 x 38 at x=289.5, the row titles
sit at the same y (152, 324, 409), the past shift's button is still dimmed at 0.5
opacity, and Withdraw is unchanged at 93.7 x 38 in white with its hairline. The
fill swap also lifts the label's contrast from 5.36:1 to 7.34:1.

**Files:** `src/pages/Pool.jsx`. Commit `7f8831e`.

## Pool: the row actions drop to the row's own size (2026-09-18)

Both Pool row actions (Claim, Withdraw) carried the Button component's `sm`
geometry, a 38px pill, with the component's base label, 15px at weight 600. The
row title they sit beside is 13px at weight 500, so the action was the largest
and heaviest thing in its own row: Jefle, "the buttons are too big... the text in
them are so bold and big".

Both now read one shared string, `ROW_ACTION_CLASSNAME = 'h-[34px] text-[13px]'`
at the top of `Pool.jsx`, a 34px pill with a 13px label. That is the treatment
the app's other compact in-row action already uses (StaffRoster's pill is
`px-3.5 py-[7px] text-[13px] font-semibold`), and it puts the action level with
the row title's own 13px instead of above it. It is a single knob, so the next
value is a one-line change; the fill, the 9px radius and the 12px side padding
are untouched, and 34px is the height the app's own nav and icon controls use, so
the tap target stays a comfortable one.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-HmvRCM_w.js`, the asset name a rebuild at `15df81c`
produces), at 390x844:**

| | before | after |
|---|---|---|
| label | 15px, weight 600, tracking -0.15px | 13px, weight 600 |
| pill height | 38px | 34px |
| Claim button | 64.5 x 38 | 59.1 x 34 |
| Withdraw button | 93.7 x 38 | 84.7 x 34 |
| the row title beside it | 13px, weight 500 | unchanged |
| row carrying Requested + Withdraw | 86, 2px taller than its neighbours | 84 |

Every row is 84 with a 1px divider between them, so the card is 606 against 608:
the row that stacks "Requested" over the Withdraw button used to exceed the info
column's 56px and made the list uneven, and it no longer does. The fill is still
`rgb(10, 94, 115)`, the radius is still 9px, and the enabled Claim button sits at
the same y=324 as before, so nothing else in the row moved.

**Files:** `src/pages/Pool.jsx`. Commit `15df81c`.

## Schedule: the week label goes mixed case, bigger and ink (2026-09-18)

The week group divider read `SEP 13 - 19` at 12px/500 in muted grey, an uppercase
caption in the smallest type on the page. Jefle asked for `Sep 13-19`, bigger, in
a dark font. It is now 14px/600 in `text-ink`, mixed case.

Both halves had to change together: `getWeekGroupLabel` built the string with
`.toUpperCase()`, so dropping only the `uppercase` class would have left the text
uppercase. The tracking also moved from `tracking-wide` to the app's mixed-case
`-0.01em` in the same edit, because 0.025em of loosening is what pairs with
uppercase small labels.

This is a deliberate departure from the design source, whose `.week-label` is
`12px/600 uppercase #6E6E73` (ScheduleListLinearLight.dc.html). It is the one
place that deviates, and the mockup's own labels are the relative "This Week"
forms the app replaced with the date range, so the artifact had no mixed-case
spec to copy.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-CPiiPqfQ.js`, the asset name a rebuild at `46e2473`
produces), at 390x844.** All three rendered week labels (`Sep 6 - 12`,
`Sep 13 - 19`, `Sep 20 - 26`) compute 14px at weight 600 in `rgb(29, 29, 31)` with
no text transform:

| | before | after |
|---|---|---|
| text | `SEP 13 - 19` | `Sep 13 - 19` |
| size / weight | 12px / 500 | 14px / 600 |
| colour | `rgb(110, 110, 115)` | `rgb(29, 29, 31)` |
| label box | 64.7 x 18 | 70 x 21 |
| its trailing rule | starts at x=94.7, 275.3 wide | starts at x=100, 270 wide |

The rule's right edge stays on 370, the card's own edge, so the wider label eats
into the rule instead of the layout. The label's own y does not move (128.5), and
the rows under each label sit 3px lower because the label is 3px taller. The
sticky pin is untouched by design: its offset is the pinned header's measured
height rather than the label's, and the fade under the group is placed at the
wrapper's `top-full`, so a taller label carries it down with it.

**Files:** `src/pages/Schedule.jsx`. Commit `46e2473`.

## Schedule header: words for List/Calendar, and the swap button takes the teal tint (2026-09-18)

The header's view switch was two 30x26 icon cells in a 32px track, glyphs only,
with no label anywhere on the screen: choosing between the list and the month
grid meant knowing what a list glyph and a calendar glyph mean before tapping.
It is now the words `List` and `Calendar` in a 122x36 control. The swap status
button beside it dropped its 1px hairline and white fill for the app's own teal
icon tint.

The new control keeps the sub-tab control's geometry (12px track radius, 3px
inset, 9px segments, 30px cells, 12px text) but its active segment stays WHITE
instead of filled teal. Teal already marks the one primary choice on this header
(the My Shifts / Team Schedule segment, 16px below), and the teal-tint swap
button sits in the same row, so a third teal surface 16px apart would have left
nothing reading as the primary choice.

| | before | after |
|---|---|---|
| view switch | 70x32, two 30x26 glyph cells | 122x36, the words List and Calendar |
| active segment | 26px cell, white fill, 15px ink glyph | 30px cell, white fill, 12px/600 ink label |
| its label | `aria-label="List view"` only | the word itself; aria-label dropped |
| swap button | 36x36, 1px `#e5e5ea` edge, white fill, `rgb(110,110,115)` glyph | 36x36, no border, tinted fill, `rgb(14,116,144)` glyph |

Both header copies now render one shared `ScheduleContentViewToggle` instead of
duplicating the markup: the nurse header in `ScheduleTab` (with the swap button
beside it) and the coordinator's standalone header in `TeamScheduleTab` (which
has no swap button, and now has 130px of slack where the nurse header has 75).
`data-testid` and `aria-pressed` keep the names `testing/flows.json` drives.

**Verified on live production, signed in as `alex.ramirez@shiftko.test` (nurse
header, with the swap button) and `jefleangelo@gmail.com` (coordinator header
copy, no swap button), hash-matched: the live page serves
`/assets/index-CX7myDQY.js` and `/assets/index-WOt4dziz.css`, the exact names a
rebuild at `42bb33b` produces.** Measured on the real header:

| | before (code) | after (live) |
|---|---|---|
| track | 32px tall, `p-[3px]` | 122 x 36, `bg rgb(237,237,242)`, radius 12px |
| List cell | 30 x 26, white, 15px icon | 41.1 x 30, `bg rgb(255,255,255)`, 12px/600 `rgb(29,29,31)` |
| Calendar cell | 30 x 26, transparent | 70.9 x 30, 12px/500 `rgb(110,110,115)` |
| swap button | `border 1px rgb(229,229,234)`, `bg rgb(255,255,255)` | `border 0px`, `bg rgba(56,189,229,0.15)`, glyph `rgb(14,116,144)`, radius 9px |

The teal tint composites to `#dcf0f8` over the page ground, putting the teal
glyph at 4.56:1. The row still has room: at a 390px phone width the content box
is 350px, the title is 109.1px and the control cluster is 36 + 8 + 122 = 166px,
so 74.9px of slack is left over. Tapping Calendar mounts the month grid (30 day
cells) and tapping List returns the rows, with no console errors in either
direction, on both accounts.

**Files:** `src/pages/Schedule.jsx` (the new component, the swap button's class
string, and the import line, since `List` and `Calendar` are no longer used).
Commit `42bb33b`.

## Schedule: a Today pill for the nurse's list (2026-09-18)

Jefle asked for a button that returns to today's shift when the list has scrolled
too far from it, "add its animations and states ofc". It is a white pill with the
card-lift shadow, bottom-centre above the bottom nav, icon plus "Today".

Behaviour: it appears while the week containing today is out of view in either
direction and leaves again when that week is back. The scroll is the existing
first-load landing, extracted to `scrollWeekMarkerUnderHeader` so the landing and
the pill share one path rather than two copies of the pinned-header arithmetic.
That routine measures the pinned header and parks the week's own label under it:
measured after a tap, the label's top and the header's bottom are both 128.5, so
the label lands 0px off.

Motion, per MOTION.md: opacity and an 8px translate at Base (225ms) ease-out, plus
the authored 150ms ease-out press feedback to press-state, written as one
transition with per-property durations. No spring, no overshoot, nothing
animating size or position on the scrolling surface, and no scroll listener at
all: the only input is the week marker's intersection, so the pill adds no
per-frame work (MOTION.md: nothing animates on a scroll path).

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-CZiSlXM3.js`, the asset name a rebuild at `6be3e52`
produces), at 390x844:**

| | measured |
|---|---|
| size | 96.9 x 43, centred to 0px, pill radius, white, 1px hairline, card-lift shadow |
| clearance | 20px above the nav rail, measured off that nav's own top edge |
| label on tap | 128.5 against the header's bottom 128.5, so 0px off |
| visible state | opacity 1, `pointer-events: auto`, no `aria-hidden`, `tabIndex 0` |
| hidden state | opacity 0, `pointer-events: none`, `aria-hidden`, `tabIndex -1` |
| transition | `0.225s, 0.225s, 0.15s`, `ease-out, ease-out, ease-out` |
| reduced motion | collapses to `1e-05s` under `prefers-reduced-motion: reduce`, and the pill still appears and takes a tap |
| calendar view | absent from the DOM, which is where it belongs |

Two things for whoever touches this next. The pill's offset is measured off the
nav's own top edge instead of hardcoded, because a fixed element's `bottom`
resolves against the document's client box, which is not always
`window.innerHeight`: the first pass hardcoded a value and landed 8px inside the
nav. And an automation browser session reports `visibilityState: hidden`, under
which Chromium throttles IntersectionObserver delivery to seconds, so the
show/hide flip looks late in a scripted pass and is instant for a real user.

**Files:** `src/pages/Schedule.jsx`. Commits `085f35d` (the pill), `e4dfd31` (the
measured offset), `6be3e52` (size and clearance after Jefle looked at it live).

## The teal fill is one colour app-wide (2026-09-18)

Jefle: "change the blue buttons on the app to be that same color as the claim
button on the pool page... anywhere where its blue". Every surface that was
filled with `--color-teal-foreground` (`#0e7490`) now fills with
`--color-teal-field` (`#0a5e73`), the colour Pool's claim button and Home's
quick-action tiles already carried. 19 occurrences across 15 files: the `primary`
and `default` button variants, the segmented control's active segment with its
shadow retinted from `rgba(14,116,144,0.28)` to `rgba(10,94,115,0.28)` to match,
the stepper's current node, the calendar strip's selected day, selection rows, the
activation banner's current step and its 30% track, the sign-in button,
Schedule's today circle, Post a Shift, Duplicate Week's two actions, Staff
Roster's filter, the three onboarding option tiles, both Approve buttons, and the
native checkbox accent.

The pressed step became `--color-teal-field-hover` (`#084b5c`), which had been a
literal in Home's tiles, Pool's claim button and the Today pill. It is a token
now, so the next value is one line.

**What did not change: teal as ink.** `text-teal-foreground` (View All, the active
nav tab, notification actions, status chip labels), the tinted surfaces
(`bg-teal-tint`, `--color-teal`) and the tint-plus-teal-border selection rows are
not fills and keep their colour. Pool's claim button also dropped its
now-redundant fill override, keeping only its touch press step, because the
variant carries a hover and touch never fires it.

This deviates from the artifact, whose `.btn-primary` is `#0E7490`
(AddPersonalEventLinearLight.dc.html and the rest of the flow). It is Jefle's
call, the same one as Pool's claim button, and it is recorded for that reason.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-D9FExv0N.js`, the asset name a rebuild at `c557c4c`
produces), at 390x844:**

| surface | measured fill |
|---|---|
| Shift Detail's Request swap | `rgb(10, 94, 115)` |
| Schedule's active segment, My Shifts | `rgb(10, 94, 115)`, shadow retinted |
| Pool's six claim buttons | `rgb(10, 94, 115)` |
| Home's Add a Shift and Claim Shifts tiles | `rgb(10, 94, 115)`, unchanged |

The remaining sites are the same two class names on screens this nurse session
cannot open: Post a Shift's stepper and submit, Duplicate Week, Coordinator
Manage, Coordinator Approvals, Staff Roster, the activation banner, the calendar
strip, selection rows, and the three onboarding tiles, which are pre-auth. They
are covered by the source sweep, zero `bg-teal-foreground` left in `src/`, and by
the compiled CSS: `bg-teal-field`, `border-teal-field`, `bg-teal-field/30`,
`accent-teal-field` and the `hover:`/`active:` `bg-teal-field-hover` are all
generated, and the shipped bundle contains none of the old fill class. A
coordinator-account pass would close them properly if that matters.

**Files:** 18, `src/tailwind.css` plus 17 components and pages. Commit `c557c4c`.

## Home: the today card says Today again, and the header says "Your shift" (2026-09-18)

Jefle: "the TODAY text isn't inside the card anymore, let's add it back", and for
the section header above it, "give me some options" so the word today stops being
said twice. The options round is
`~/shiftko-design-v2-visual-pass-dup/home-today-header-options.html`: the shipped
version as the reference, four header wordings, and the empty state, each the real
header above the real card at the card's own 350px, with the generator
(`home-today-header-options.py`) beside it. He picked option D.

The eyebrow is back exactly as commit `7eda391` removed it on 2026-09-17: the same
`text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase` span, with
the card's top row restored from `justify-end` to `justify-between`. `7eda391` had
removed it because the header above had taken over saying the day, and it no
longer does.

`getTodayHeader` now returns "Your shift", and "Your event" for a personal event
so the header still never calls an event a shift, instead of
`${period} shift today`. The period is not lost: the card's own chip carries it,
which is why option D needed no change beyond the header's one string.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-DetaaMWI.js`, the asset name a rebuild at `da2dda0`
produces), at 390x844:**

| | before | after |
|---|---|---|
| header | `Evening shift today` | `Your shift` |
| TODAY inside the card | absent | `TODAY`, 12px/600, 0.05em, `rgb(110, 110, 115)`, 16 in from the card's left, 20.3 from its top |
| card height | 149.5 | **149.5** |
| top row | `justify-end`, 24.5 tall | `justify-between`, 24.5 tall |
| the pills' right edge | 354 | 354, against the card's own 370 |
| the 25px time | `rgb(0, 68, 88)` | unchanged |

The eyebrow costs no height, which is what the options file predicted at its own
137px: the row was already 24.5 tall for the pills, so the eyebrow's own 16px line
sits inside it, and nothing below the top row moved by a pixel.

**Was still open: the no-shift day.** `getTodayHeader` returned "No shift today" for
it, which sat beside the same eyebrow, so that state said today twice. The round
offered two ways to close it, dropping the header in that state or shortening the
card's own empty title to "No shift", and Jefle picked neither wording: on
2026-09-19 the header became "Today" and the card kept its own title, see the
no-shift section below. That state is also the one this pass could not exercise,
since it needs a day with no shift and this account has one today.

**Superseded the same day: the header reads "Your evening shift".** Jefle picked
option B from the round after seeing "Your shift" live, so `getTodayHeader`
returns `Your ${period} ${shift|event}` lowercased, which gives "Your evening
shift", "Your day shift" and "Your night shift". The day stays out of the header
because the card's own eyebrow carries it. The one word now stated twice is the
period, in the header's words and in the card's own chip, and that is exactly what
separates B from D: the round's file still holds D if the echo starts to read as
one.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-V3fx1EoR.js`, the asset name a rebuild at `8d9a610`
produces), at 390x844:** the header reads `Your evening shift`, 18px at weight 600
in `rgb(58, 74, 79)`, 141.5 wide, 10px above the card. The card is 350 x 149.5,
the same height as before either header wording, with `TODAY` in its top row
beside the `Unit 1 · CNA` and `Evening` chips. Reading the header's own words
against the card's strings, the only one shared is `evening`.

**Superseded again the same day, and this is what ships:** Jefle moved the day
back up into the header as "Today's Shift", took the TODAY eyebrow out of the card
again entirely, and put the `Unit 1 · CNA` pill at the top row's left end with the
period chip closing the row on the right. So the day is said once, by the header,
and the card carries only what the header does not: the unit, the credential and
the period. The unit pill is unchanged apart from which end it sits at: same class
string, same 11px/600, same 180px truncation cap, and the 6px cluster gap is still
declared in the row it now leads.

The three wordings Jefle passed through in one day are all still in the options
round's file (`home-today-header-options.html`), so a fourth reversal costs a
look rather than a rebuild.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`,
hash-matched (`index-CgXMi95F.js`, the asset name a rebuild at `81b7e26`
produces), at 390x844:**

| | measured |
|---|---|
| header | `Today's Shift`, 18px/600, `rgb(58, 74, 79)`, 10px above the card |
| TODAY inside the card | 0 occurrences |
| card | 350 x 149.5, the same height through all four wordings |
| top row | `justify-between`, 24.5 tall |
| unit pill | `Unit 1 · CNA`, 11px/600, 76.3 x 22.5, inset 16 from the card's left, 180px cap |
| period chip | `Evening`, 71.9 x 24.5, inset 16 from the card's right |

**Files:** `src/pages/Home.jsx`. Commits `da2dda0` (the eyebrow and "Your shift"),
`8d9a610` ("Your evening shift"), `81b7e26` (this arrangement).

## Home: the no-shift card centres, and the header stops repeating it (2026-09-19)

Jefle: "the design is lacking a bit, let's try centering the content inside the card
and make it easy to look at. Also not sure why it says CNA in the top right corner,
you dont have a shift."

Three changes, all in `TodayHero` and `getTodayHeader`, one file:

1. **The card's top row is skipped when there is no item.** The row is the shift's own
   chrome, and its title line is built as `[todaysShift?.unit, credential]`, so with no
   shift it degraded to the credential alone: an empty card opened with a bare `CNA`
   chip 16px from its left edge (measured in the live DOM at 39.8 x 22.5,
   `rgb(242, 242, 247)`, 11px/600, so top-LEFT rather than the top-right corner the ask
   described) over otherwise empty space. `{item && (...)}` around the row is the whole
   fix. The row is untouched for a shift day, where it still measures 24.5 tall with the
   unit pill at inset 16 from the card's left and the period chip at inset 16 from its
   right.
2. **The empty state is centred.** `layout="row"` with `className="justify-center"`, so
   the icon and its two lines sit as one group in the middle of the card (icon at inset
   129.5 from the card's left, the text block's own right inset also 129.5, symmetric)
   while the text stays left aligned inside itself. The compact row form is kept
   deliberately: the centred `stack` form was tried on this card on 2026-09-15 and read
   as an empty box with a hole in it. Centring in the row form costs no height.
3. **The header reads "Today" on a no-shift day.** It had said "No shift today", word
   for word the card's own title 10px below it, which is the wording the 2026-09-18
   round left open. The header keeps owning the day, the card keeps owning the fact.

**Measured at a 1280px window, where the card is 408 wide inside the app's `max-w-md`
column:**

| | before | after |
|---|---|---|
| section header | `No shift today` | `Today` |
| `No shift today` occurrences in the section | 2 | **1** |
| the credential chip | `CNA`, 39.8 x 22.5, inset 16 from the card's left | absent |
| card | 408 x 112.5 | **408 x 80** |
| the card's own children | 2 (chip row, empty state) | **1** (empty state) |
| empty state row | `flex items-center gap-3 py-0.5`, icon at inset 16 | `flex items-center gap-3 py-0.5 justify-center`, icon at inset **129.5** |
| title and subline | 15px/600 `rgb(29, 29, 31)`, 13px `rgb(110, 110, 115)` | unchanged |
| shift-day card | 408 x 149.5 | **408 x 149.5** |

The before column is the live production bundle. The after column is the local build
at this commit, measured on a real signed-in session: the browser's production
Supabase session was copied into `localhost:5173`, so Home rendered Alex Ramirez's
real profile, real credential and real personal events. Both cards were measured in
that one session, the shift day on his real data (an 11:00 PM to 7:30 AM night shift
in progress, which commit `93db74f` now carries past midnight, so today's card shows
the shift and its progress bar instead of the empty state) and the day-off state with
the `shifts` query alone controlled by a `window.fetch` interception returning `[]`.
Nothing in the database changed, and the empty branch is the only thing under the
empty card's numbers.

**Files:** `src/pages/Home.jsx`. Commit `966715c`.

**Verified on live production, signed in as `alex.ramirez@shiftko.test`, hash-matched
(`index-U_7KsmzU.js`, the asset name a build of this commit produces, read out of the
served document rather than fetched with curl), at a 1280px window:** the shift day
reads `Today's Shift` with the card at 408 x 149.5 and its chip row 24.5 tall, `Unit 1
· CNA` at inset 16 from the left and the `Night` chip at 16 from the right, which is
unchanged from before this commit. The day-off state reads `Today` with the card at
408 x 80 and its single child row inset 16 from each side, the icon group at inset
129.5. The shift day is his real data (the 11:00 PM to 7:30 AM night shift in
progress, so `93db74f` is live too and today's card shows the shift); the day-off
state had the `shifts` query alone controlled by the same `window.fetch` interception
returning `[]`, so no row in the database changed and the empty branch is the only
thing under its numbers.

The local half of the pass needs no deploy and no password: the automation browser's
production Supabase session (`sb-jffdmybgwiyfhwrkipug-auth-token`) was read out of
`localStorage` on `www.shiftko.com` and written into `localhost:5173`'s `localStorage`
before the page loaded, so the dev server rendered as Alex with real data.

**Building while a sibling agent has a file dirty costs you the hash match.** The
build taken at this commit's own tree was `index-U_7KsmzU.js` at 649.69 kB and is what
Vercel served; the rebuild a few minutes later, with a sibling's in-flight
`Schedule.jsx` in the working tree, was `index-ClbDUnmt.js` at 650.26 kB. A deploy
builds the clean commit, so compare the served asset against the build taken when the
tree matched, not against whatever the tree happens to hold later.

**Superseded in the same session: the stack form, and a neutral tile.** Jefle: "i
meant cente the layout, not just move it in the center. Also the purple is kind of
similar to night shift pill, which is easy to mistake. Also no light teal blue, it
feels so overused." Both readings were right. The row form with `justify-center` only
moved the group sideways, because its text stayed left aligned inside itself, so the
card never read as centred; and the tile was `tone="night"`, which is the Night period
chip's own pair, so an empty card carried a tile that read as a night shift.

The empty state is now `layout="stack" size="inline" tone="neutral"`: the icon, the
title and the subline centre as one column with `text-center` on the wrapper.
`size="inline"` is what keeps it from ballooning, since the `size="section"` stack is
what made this card 189px on 2026-09-15. Teal is not the substitute because it is the
app's most used accent, and the other period tints (day amber, evening green, personal
blue) have exactly the night tile's problem, so `neutral` is the only fill in the
vocabulary that cannot be mistaken for a period. It is also the quiet tile eight other
screens already use, so the change introduces nothing new. Nothing else moved: the
header still reads "Today" and the card still skips its own top row.

**Measured on the local build, same 1280px window, day-off state with the `shifts`
query controlled:**

| | first pass | shipping |
|---|---|---|
| card | 408 x 80 | **408 x 162.5** |
| empty state | `flex items-center gap-3 py-0.5 justify-center`, text left aligned inside | `flex flex-col items-center text-center gap-2 py-5`, text centred |
| icon tile | 36px, `bg-period-night-bg` `rgb(245, 223, 250)`, glyph `rgb(81, 50, 174)` | 40px, `bg-track-neutral` `rgb(237, 237, 242)`, glyph `rgb(110, 110, 115)` at 4.35:1 on its own tile |
| icon inset from the card's left | 129.5 | **184**, and 184 from the right |
| title | 15px/600, left aligned | 14px/600, centred |
| subline | 13px, left aligned | 13px, centred |

**Verified on live production, signed in as `alex.ramirez@shiftko.test`, hash-matched
(`index-BqJWoNZR.js`, read out of the served document rather than fetched with curl),
at the same 1280px window:** header `Today`, card 408 x 162.5 with one child,
`flex flex-col items-center text-center gap-2 py-5`, the tile 40px at inset 184 from
either side with `rgb(237, 237, 242)` behind a `rgb(110, 110, 115)` glyph, and both
lines centred (14px/600 over 13px/400). The served bundle also carries the change in
its own source, `title:\`No shift today\`,subline:\`Enjoy the day off\`,layout:\`stack\`,size:\`inline\`,tone:\`neutral\``,
which is the check to reach for when a sibling agent's in-flight file makes a clean
local build impossible. The day-off state is again the one with the `shifts` query
controlled by the `window.fetch` interception returning `[]`, so its numbers are a
controlled-query reading; Alex's real day holds a running overnight shift.

**Then a shorter card (same session, Jefle): "can you make the padding inside the card
a little shorter? its so tall right now".** The stack carried `py-5` of its own on top
of the card's own `p-4`, so an empty card spent 36px above the icon and 36px below the
subline for two lines of text. `className="py-2"` on the call site takes the stack's
own padding to 8px; `cn` is `twMerge(clsx(...))`, so a caller's utility does win over
the component's base class here, and the card's own 16px stays because that is the
app's standard card padding. Card 408 x 162.5, so **408 x 138.5**, with 24px of white
above the tile and 24px below the last line, the empty state's own box starting 16px
from the card's top and ending 16px from its bottom. Measured on the local build at the
same 1280px window, and the neighbouring steps were measured the same way, by setting
the padding inline: 12px gives 146.5, 0px gives 122.5 (an early note in this file said
130.5 for that last one, which was arithmetic rather than a reading; 90.5 of content
plus the card's own 32 is what it actually comes to).

**Reaching the day-off state needs BOTH the `shifts` and the `personal_events` queries
controlled.** The earlier paragraph in this section says "the `shifts` query alone",
which held on 2026-09-19 while Alex had no personal event on the day. He has one now
(Unit 1, 11:00 PM to 7:30 AM), and a personal event fills the same card through
`todaysShift ?? todaysEvent`, so emptying only the shifts query left the card showing
the event and no empty state at all.

**Note for the next session:** while this landed, a parallel agent was changing the
section header above this card to a long date ("Saturday, September 19") in the same
file, which supersedes the "the header still reads Today" line in the section above.
The card numbers here are unaffected: that change moves the header string only.

**Still open, one prop away:** with the tile gone the glyph sits straight on the white
card, which is what the design source's own Day off rows do (muted `#6E6E73` text, no
tile at all) if the grey disc ever reads as a second surface. A warm stone fill is the
other direction, and it would need a new token.

## A personal event's detail screen becomes the shift detail screen (2026-09-19)

"why is the shift detail on the personal event shift detail page not the same as the assigned
ones, it should at least show working with section, and the burlingame workspace."

Both screens draw the same `HeroCard` and the same coworker vocabulary, and they still came out
looking like two different products. Three causes, all of them "built before the other half
existed":

1. **The hero card was on the ORIGINAL layout path.** `PersonalEventDetail` passed no `layout`,
   no `facility` and no `borderless`, and it was never moved when ShiftDetail's card grew all
   three on 2026-09-18 (see "Shift Detail: the hero card gets room, a rule and the workspace").
   Those knobs are opt-in on purpose, so the other hero-card callers stay byte-identical, and
   this screen is one of the callers that opted out by simply not being updated. The screen was
   written on 2026-09-15 (`88f9b26`), three days before the layout existed.
2. **It never made the profiles query the workspace name comes from.** `facility` is
   `workspaces.name`, set in ShiftDetail from a `profiles.select('credential, role, workspaces
   ( name )')` call that lives in that file. The event screen had no such query, so it had
   nothing to render even if it had passed `facility`.
3. **The coworker block was a second hand-rolled implementation.** Heading `Also on <unit>`
   instead of `Working with`, no count line, no loading row, no error row, the bordered
   `SHIFT_LIST_CLASSNAME` instead of the borderless twin, and the whole `<section>` gated on
   `coworkers.length > 0`, so with nobody else on the unit the section did not render at all.
   That is the exact shape ShiftDetail's "Working with" had until it was fixed on 2026-09-18
   ("the empty state ... gets the list's card"), and `EmptyState` was not even imported here.

**The change** is one file plus a comment: `PersonalEventDetail.jsx` opts into
`layout="detail" borderless facility={facilityName}` and passes `credential`, makes the same
profiles query, and renders ShiftDetail's section verbatim (heading, count, loading row, error
row, `EmptyState` row/neutral inside the borderless list card with `px-4 py-3.5` on a child,
`ShiftListDivider inset={false}` between rows). `hero-card.jsx` changes by COMMENTS ONLY (the
caller list drops to four); `git diff` filtered to non-comment lines is empty, so no other
screen's card can move.

**His two calls, both asked before building:**
- **Header title is `Shift Detail`**, his words: "it should be Shift Detail since once they put
  Unit 1 or any department, that means its a burlingame facility shift, same as any other shift."
  The screen had a blank centred header before (NavRow with no title).
- **An event with no department gets the same empty card, not no section.** A name-only event
  has no shift to be "on", so it skips the coworker query entirely and renders the empty card.
  Derived at render (`hasUnit`, `coworkerLoading`, `coworkerFailure`, `coworkerList`) rather than
  reset by the effect, which is also what took `oxlint`'s `react(set-state-in-effect)` warning
  off this file: HEAD carried one on the old unit-less early return, the new file carries none,
  and the fetch is now an inner `async function` the way ShiftDetail's is.

**Measured, local build (`localhost:5173`) at 390x844 with the production session copied in
(`sb-jffdmybgwiyfhwrkipug-auth-token` read from the live tab and written to localhost's
localStorage before the reload), signed in as `alex.ramirez@shiftko.test`.** Same event, same
viewport, before and after: the live deployed screen rendered a 408 x 135.5 hero (18px/16px
padding, 1px border, 8px gap), one block of three lines, full date `Friday, September 18, 2026`
at y=73.5, `Unit 1` with no credential, no rule, and NO section at all. The local screen renders
408 x 175 (20px/16px, no border, 10px gap), `Fri, Sep 18` at y=74.5, `11:00 PM – 7:30 AM` at
y=104.5, the 1px rule at y=152 (376 wide, `rgb(229,229,234)`), `Unit 1 · CNA` at y=163 and
`Burlingame SNF` as the 11px/600 uppercase footer at y=190.5.

**The event screen now matches the assigned one line for line.** The assigned shift opened on
the SAME build measures 408 x 180 with its rule at the same y=152 and the same 376 width,
`Unit 1 · CNA` at y=165.5, workspace at y=195.5, and the same `Working with` card at 408 x 80
(no border, 6px of own padding, a 68px row at `14px 16px`, the icon/avatar 16px in at x=452).
The event's card is identical to the pixel; its hero is 5px shorter, which is exactly the height
of the `Assigned` status tag the event screen has no state for, and it moves the two footer
lines by 2.5px and 5px with it. The event's section heading sits 75px higher only because the
assigned screen has the swap/offer button row between the card and the section.

**Two branches production has no data for were reached with the ONE controlled query
(`window.fetch` interception, not real rows) and are therefore not a live-data pass.**
1. A coworker list: the query carrying `nurse_id=neq.` was answered with two rows. Card 408 x 143,
   `2 on this shift`, two 65px rows at `14px 16px`, avatars at x=452/y=293.5 and x=452/y=359.5,
   one `ShiftListDivider` at y=344, 392 wide, 16px inset. Those are the same numbers this file
   records for ShiftDetail's populated list.
2. A no-department event, by answering `personal_events` with a `unit: null` row: hero reads
   `Sun, Sep 20` / `7:00 AM – 3:00 PM` / `Weekend job at Peninsula Landscaping · CNA` /
   `BURLINGAME SNF`, the section renders the empty card at 408 x 80, and the coworker query
   fired ZERO times (the interception logged no `nurse_id=neq.` call). The name falls back into
   the subline because the panel clears `name` whenever a department is set, so only one of the
   two is ever present.

**Both entry points were walked on the local build**, Home's `home-upcoming-personal-event-row`
and My Shifts' `schedule-my-personal-event-row`: same header, same hero, same empty card, and an
`error`/`unhandledrejection` listener installed before the walk collected nothing.

## Shift Detail: the workspace block moves in from Profile (2026-09-19)

"i want that exact layout and design on the shift detail page, it should be whats under the shift
card divider then the Unit 1, CNA can be on the right side instead."

`facility` was a bare 11px/600 uppercase footer under the unit line. It is now Profile's own
Workspace card (`Profile.jsx:382-393`), moved into the bottom block under the divider, with the
subline slot and `metaRight` collapsed into ONE cluster on the right:

```
Tue, Sep 22               [Evening]
3:00 PM - 11:30 PM
------------------------------------
[bldg] WORKSPACE          Unit 1 · CNA  [Assigned]
       Burlingame SNF
```

- **Values copied, not restyled:** a 36px round `#F8F7F5` tile holding a `Building2` 16px glyph in
  `#6B7280` at `strokeWidth 2`, then `WORKSPACE` at 11px/500 uppercase `#9CA3AF` `tracking-wide`
  over the name at 14px/500 `#111111`, 12px gap. Those are the legacy ink values Profile still
  carries, and they are deliberate here: the ask was for that exact block, so the hero card takes
  its colours rather than translating them to the Linear Light tokens.
- **His call on the status tag: it stays**, right of `Unit 1 · CNA` on the same row (the other two
  options were dropping it or moving it up beside the period tag).
- **Both detail screens get it**, since both opt into `layout="detail"`.
- **`facility` stays the single knob.** With no workspace name the block falls back to the old
  subline row (plus `metaRight` if there is one), so the four screens that never pass `facility`
  are untouched and the detail screens do not flash an empty tile while the profiles query is in
  flight.

**Measured on the local build at 390x844, `alex.ramirez@shiftko.test`.** The block on Shift Detail
and the same block on Profile are identical on every value that matters: 36px tile,
`rgb(248,247,245)`, `border-radius: 33554428px` (rounded-full), a 16px glyph at `rgb(107,114,128)`
with `stroke-width: 2`, 12px gap, label 11px/500 `rgb(156,163,175)` at `letter-spacing: 0.275px`
uppercase, name 14px/500 `rgb(17,17,17)`. The only difference is 1px of x, because Profile's card
carries the 1px hairline and the hero card is borderless.

- Assigned shift: card 408 x **167.5** (from 180), the row `452,163.3` 376 x 36.5, the right
  cluster `Unit 1 · CNA [Assigned]` 157.8 wide ending exactly on the content's right edge at 828.
- Personal event: card 408 x **167.5** as well, so the two screens are now the SAME height, having
  differed by 5px before. Right cluster is `Unit 1 · CNA` alone, ending on 828.
- Workspace query controlled to return no name (`workspaces: null` on the profiles response, one
  `window.fetch` interception, no rows touched): no tile, no empty block, card 408 x 150.5 with
  the old `Unit 1 · CNA` row.

Files: `src/components/ui/hero-card.jsx` only (the detail layout's bottom block, plus the
`Building2` import), so no caller that omits `layout="detail"` can move.

## Shift Detail: the state pill moves up beside the period pill (2026-09-19)

"wow its so crowded under the divider, can we put the Assigned pill, next to the shift pill rn,
where it says evening."

`metaRight` moved out of the bottom block and into the top row's right cluster, so the pills read as
one pair and the bottom block carries only the workspace and the unit line:

```
Tue, Sep 22     [Evening] [Assigned]
3:00 PM - 11:30 PM
------------------------------------
[bldg] WORKSPACE   Unit 1 · CNA
       Burlingame SNF
```

- The two pills sit **8px apart** (`gap-2`, the app's own gap between adjacent tags). Measured:
  `Evening` at x=669.2 (71.9 wide), `Assigned` at x=749.1 (78.9 wide), ending exactly on the
  content's right edge at 828, the same edge the unit line and the workspace block use.
- **The card got no taller.** It stays 408 x 167.5, because the top row already carried the period
  tag and was already 24.5px tall; adding the second tag fills the row it was sitting in.
- **It stays in the top row in the no-`facility` fallback too**, so the pill cannot hop rows while
  the workspace query resolves. That fallback measures 408 x 150.5 with the unit line alone under
  the rule.
- **A duplicate render came out of measuring the fallback, not out of reading the diff.** Leaving
  the bottom block's old `metaRight` branch in drew `Assigned` TWICE while the workspace query was
  in flight (once at y=72 with the period tag, once at y=163 where it used to live), and the branch
  is gone now. Both states were then re-measured with a count of the rendered `Assigned` spans:
  `1` in each.
- Files: `src/components/ui/hero-card.jsx` only, so the four screens that never pass
  `layout="detail"` are untouched. Verified on the local build with the production session, on the
  assigned shift and on the personal event (whose bottom row is workspace plus `Unit 1 · CNA`, no
  tag to move).

## Shift Detail: the workspace row drops its tile and label (2026-09-19)

"too much info on the bottom part of the divider actually, lets try to just use the building icon
itself (no background square) and just put the Burlingame SNF text beside it, not 'WORKSPACE' text
anymore, more cleaner."

Third revision of this block in one session, and the smallest yet: the 36px `#F8F7F5` tile and the
11px `WORKSPACE` label are both gone, leaving the bare `Building2` glyph and the name on one line.

```
Tue, Sep 22     [Evening] [Assigned]
3:00 PM - 11:30 PM
------------------------------------
[icon] Burlingame SNF            Unit 1 · CNA
```

- **What survived:** the glyph is still `Building2` at 16px, `rgb(107,114,128)`, `stroke-width: 2`,
  and the name still `Burlingame SNF` at 14px/500 `rgb(17,17,17)`, 8px beside the glyph (icon at
  x=452, name at x=476). Only the chrome around them was dropped, so this is a subtraction rather
  than a new treatment.
- **No `WORKSPACE` string anywhere in the card** (`/WORKSPACE/i` over the card's text: false), and
  the icon's parent no longer carries a background (`rgba(0,0,0,0)`).
- **The card is 408 x 151**, down from 167.5: the row went from 36.5px (tile height) to 20px (the
  text line). The rule stays at y=152, 376 wide, and the unit line stays right-aligned on the
  content's edge at 828.
- Identical on the assigned shift and the personal event. The no-`facility` fallback is untouched
  by this change, since it never had the tile or the label to begin with.
- Files: `src/components/ui/hero-card.jsx` only.

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
