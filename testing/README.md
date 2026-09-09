# Testing Shiftko with Chrome automation

This app has **no URL routing**. `src/App.jsx` holds all navigation as in-memory
`useState` (`activeTab: 'home' | 'schedule' | 'pool' | 'more'`, plus per-page
state like `selectedShift`, `authView`, etc). There is nothing to deep-link to
— every screen is reached only by clicking through from whatever state the
app is currently in when the browser loads it. That means:

- You cannot navigate to a screen by URL. Load the app root, then drive it
  through clicks/fills starting from a known base state (signed out at
  Screen0, or signed in and landing on whichever tab was active last).
- Every flow in `flows.json` documents its `assumesBaseState` — get the app
  into that state first (sign in/out manually if needed) before running the
  flow's steps.
- A page reload always drops you back to Screen0 (signed out) or the
  "loading" spinner → whatever tab `App.jsx`'s `useState('home')` defaults to
  (signed in, always lands on Home).

## How `data-testid` is organized

Interactive elements that matter for navigation or for a flow in
`flows.json` carry a `data-testid`, kebab-case, prefixed by area:

- `nav-home`, `nav-schedule`, `nav-pool`, `nav-more` — BottomNav tabs
- `screen0-*` — the initial signed-out welcome screen
- `auth-*` — Auth.jsx sign-in/sign-up form
- `home-*` — Home.jsx (bell, action rows, upcoming-shift rows, coordinator's Go to Manage)
- `personal-event-*` — PersonalEventPanel.jsx (Add/Edit Personal Event sheet)
- `pool-*` — Pool.jsx open-shift claim/withdraw actions
- `shift-detail-*` — ShiftDetail.jsx (back, offer/withdraw-offer toggle)
- `profile-*` — Profile.jsx (sign out, leave/join workspace)
- `join-workspace-*` — JoinWorkspaceForm.jsx (code input + submit; used inside Profile and the standalone, currently-unreachable JoinWorkspace.jsx page)
- `schedule-*` — Schedule.jsx (top coordinator tab bar, nurse My Shifts/Team Schedule toggle, list/calendar toggle, add-shift, shift/personal-event rows, Manage tab's post-shift form and claim approve/deny)
- `calendar-day-<YYYY-MM-DD>` — day cells in both the shared `CalendarStrip` date picker (used by PersonalEventPanel and Schedule's Manage tab) and Schedule's own month-grid calendar view (`MonthCalendarGrid`, used by both My Shifts and Team Schedule's calendar toggle) — same convention, two different components, never mounted at once; each cell's testid is its own date, so substitute the actual date you want to click
- `screen2-*` … `screen6-*`, `credential-*` — the onboarding screens (Screen2–6, ScreenCredential). **Not currently reachable**: `OnboardingFlow.jsx`, which wires these together, is not imported anywhere in `App.jsx` (verified by grep — it's dead code). They're still testid'd per spec in case/when they get wired back in, but no flow in `flows.json` exercises them; sign-up today goes straight from `screen0-get-started` to the Auth form.

Not every clickable thing has a testid — only what a flow would click or
fill: nav tabs, primary CTAs, form fields, submit buttons, tab/segment
switches, list-item rows that navigate somewhere, and confirm/cancel actions
in modals/panels. Decorative elements, week/month pagination chevrons, the
password show/hide eye icon, etc. are intentionally left untouched.

Some testids are **shared across multiple rendered instances** by design
(e.g. every `schedule-my-shift-row`, every `pool-claim-shift` button, one per
open shift). When a flow needs a *specific* row, read the page first
(`get_page_text` / `read_page`) to disambiguate, or use an nth-match
selector — `flows.json`'s notes call this out where it matters.

## Driving a flow via claude-in-chrome

1. Load `[Shiftko root URL]` in a tab (`mcp__claude-in-chrome__navigate`).
2. Get the app into the flow's `assumesBaseState` (see `flows.json`).
3. For each step in the flow:
   - `action: "click"` → click the element matching `[data-testid="<testid>"]`
     (e.g. via `mcp__claude-in-chrome__find` or `computer`'s click, scoped to
     that CSS selector).
   - `action: "fill"` → focus `[data-testid="<testid>"]` and type/set `value`
     (`mcp__claude-in-chrome__form_input` is the most reliable tool for this).
   - Read the step's `note` first — it explains what should be visible/true
     after the step (a panel opening, a row's label changing to "Requested",
     an inline error appearing, etc.) so you can verify before moving on.
4. Prefer `get_page_text` or `read_page` to confirm state (e.g. which tab is
   active, whether a modal is open) rather than assuming a click landed —
   this app has no route to assert against, so the DOM/testid state is the
   only ground truth.

Example selector for a step `{ "action": "click", "testid": "nav-schedule" }`:
click the element found by `[data-testid="nav-schedule"]`.

## Keeping `flows.json` in sync

**This file is maintained by hand, not generated.** Whenever a flow's UI
changes — a button is renamed/removed, a screen is restructured, a new step
is inserted into an existing user journey — update both of the following
**in the same change**:

1. The `data-testid` attribute(s) on the actual component (`src/**/*.jsx`).
2. The corresponding step(s) in `testing/flows.json`.

If you add a brand-new flow that's fully wired end-to-end in the app (not a
planned/future feature), add a new top-level entry to `flows.json` with
`description`, `assumesBaseState`, and its `steps`, and testid whatever new
elements it needs following the kebab-case, area-prefixed convention above.

Do not encode flows for screens/features that aren't wired into the live app
yet (check `src/App.jsx` and the actual component tree, not just design docs
or HANDOFF.md) — `flows.json` should only ever describe what's actually
clickable in the code today.
