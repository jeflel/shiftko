# Shiftko motion spec

What moves in the live app, how fast, and what never moves. Drafted 2026-09-16.

## Where the authority sits

`~/shiftko-design-v2-visual-pass-dup/DESIGN.md` has a **Motion** section (plus a
`Named Rule: The No-Spring Rule`). It is authoritative for *feel*, and this file
implements it rather than inventing a parallel system. Where the two disagree,
DESIGN.md wins; where DESIGN.md is silent, this file decides, and each such
decision is marked **[app call]** so nobody mistakes it for the designer's.

Two facts worth knowing before reading either:

- The mockups author exactly one motion rule, repeated 18 times:
  `transition: background-color 0.15s ease-out`. That is the whole authored
  motion signature, and DESIGN.md says why: a static artboard has no live meter,
  so tap feedback carries the liveness instead.
- DESIGN.md explicitly says these values are **starting points to tune against
  the real app**, not locked tokens the way colour and spacing are.

## The rules (from DESIGN.md)

**Duration scale**

| Name | Value | For |
| --- | --- | --- |
| Fast | 150ms | State changes with no spatial movement: press/`:active` background, a toggle's colour swap |
| Base | 200-250ms | Anything that moves or resizes: segmented-control thumb, toggle knob, accordion or sheet expanding |
| Slow | 300-400ms | Full-screen transitions (push/pop, sheet presenting) and value transitions that should read as progress (progress bar filling, stepper advancing, calendar month swipe) |

**Easing**

- `ease-out` for anything entering or starting (screen pushing in, sheet presenting, toggle turning on).
- `ease-in-out` for anything that starts and ends at rest (segmented thumb sliding between two fixed positions, month-to-month swipe).
- **No spring, bounce or overshoot anywhere.** Every curve should feel closer to an iOS system animation than to a consumer or social motion language. This is the same restraint call as the two-colour palette and the moderate corner radius.

**What animates**

- Press feedback on every tappable row and button: background to `#F2F2F7` over `0.15s ease-out`. This is the primary liveness signal, so it belongs on every tappable surface, not just list rows.
- Toggles and segmented controls: thumb position and the active segment's background, Base speed, `ease-in-out`.
- Progress bars and stat meters: the fill transitions at Slow, `ease-out`, whenever the value changes. Never an instant jump.
- Stepper: the connecting line's fill animates at Slow; the step icon's own pending/current/done swap is instant. Do not animate two things for one state change.
- Screen push/pop: one navigation motion for the whole app, slide from the right on push and to the right on pop, at Slow. Do not invent a per-screen transition.
- Calendar month navigation: crossfade **or** horizontal slide, Slow, applied everywhere the month-nav pattern appears. Pick one, never both.
- Badges: appear and update **instantly**, no animation. A count badge is information, not a moment to draw attention to.

## App calls (DESIGN.md is silent on these)

**[app call] Bottom-nav tab switches do not slide.** Tabs are peers; sliding
implies a hierarchy the app does not have. Use a Fast cross-fade of the content
area. The direction-carrying transitions are reserved for push/pop screens
(Shift Detail, Post a Shift, Shift Edit, the swap flow, Duplicate Week).

**[app call] Lists do not animate rows in.** No stagger on first paint, none on
scroll, none on re-render. A schedule re-renders on every tab switch and filter
change, so an entry animation would fire constantly, cost frames on the older
phones nurses actually carry, and read as noise. Liveness comes from press
feedback and the progress meters, per DESIGN.md's own reasoning.

**[app call] Loading to content is a Fast cross-fade, not a slide or a pop.**
Skeletons fade out and content fades in over 150ms, `ease-out`.

**[app call] Nothing animates on a scroll path.** The pinned Schedule header and
the pinned week label track the scroll exactly, with no easing, no lag and no
transition on their offsets. A soft-follow here would look broken, not alive.

**[app call] No celebration motion.** No confetti, no success bursts, no
count-up numbers. `react-confetti` and `lottie-react` are already in
`package.json` and imported only by the unwired onboarding screens; adopting
them would contradict the No-Spring Rule and the professional register.

**[app call] Reduced motion is mandatory, not a nicety.** Under
`prefers-reduced-motion: reduce`, every transition collapses to an instant state
change: no cross-fades, no slides, no shimmer. Implement once, globally in CSS,
plus a `useReducedMotion()` gate for anything JS-driven. Some people set this
for vestibular disorders, and this app is used at 6am by people who did not
choose to be awake.

## Audit: what the live app does today

Measured 2026-09-16, before any of this was written.

| Where | Today | Per the spec |
| --- | --- | --- |
| `Schedule.jsx` row press states | `transition-colors duration-150 ease-out` | correct, matches the authored rule |
| `Home.jsx` shift-progress fill (two places) | `transition-[width] duration-500` | Slow is 300-400ms: should be ~350ms with `ease-out` |
| `StaffRoster.jsx` status text fade | `duration-500` | over the scale, should be Fast |
| `Profile.jsx` accordion chevrons | `transition-transform` with no duration | Base 200-250ms, `ease-in-out` |
| `segmented-control.jsx` | every segment is a background swap at `duration-150 ease-out` (no sliding thumb) | DESIGN.md wants the active segment's background at Base speed, `ease-in-out`: raise to ~225ms and swap the curve |
| `index.css` | a `home-greeting-shimmer` keyframe at 1.2s infinite `ease-in-out`, with **no element in `src/` referencing the rule** | dead CSS: retire it rather than bringing it into the scale |
| press feedback broadly | 26 hand-picked `transition-colors` | keep, but the same timing everywhere |

## Implementation notes

- Put the scale in `src/tailwind.css` `@theme` as `--motion-fast`, `--motion-base`,
  `--motion-slow`, so a duration is never hand-typed again, and keep the values
  easy to tune, since DESIGN.md calls them starting points.
- Keep press feedback in CSS. It is 26 existing class strings, it needs no JS,
  and it must never wait on a hydration or effect.
- Use `framer-motion` only where CSS cannot do the job cleanly: the push/pop
  screen transition and the segmented-control thumb. It is already a dependency
  and imported by exactly zero files today, so nothing is in the bundle until we
  actually use it.
- Never animate layout height, position or width on a scrolling surface. Width
  is only acceptable on a contained progress fill, which is the one case
  DESIGN.md asks for.

## How to verify motion (do not eyeball it)

1. Read the values back: `getComputedStyle(el).transitionDuration` /
   `transitionTimingFunction`, and check them against the scale. "Feels about
   right" is not evidence.
2. Confirm nothing exceeded the scale, and that no animated property sits on a
   scroll path.
3. Emulate reduced motion over CDP
   (`Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`) and
   confirm every animation is off, then check the page still works.
4. For anything JS-driven, confirm it does not re-fire on re-render, tab switch
   or scroll. An entry animation that replays on every tab switch is the most
   common way this kind of work goes wrong.
