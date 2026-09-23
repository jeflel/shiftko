import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

// Home's two header controls: the profile control to the left of the greeting
// and the notification bell at the right gutter.
//
// The bell is a filled circle at 42x42 (`size-[42px] rounded-full`): the
// SegmentedControl track's own grey (`bg-track-neutral` #ededf2), no border, and
// an `text-ink` glyph (2026-09-22, Jefle: "use that color for the bell icon...
// then lets remove the outline and make the bell icon color appropriately
// darker"). Two things to know about that pair before changing it:
//   - `bg-track-neutral` on the page ground is 1.06:1, so the disc is a wash
//     rather than a shape; with the 1px border gone the GLYPH is what defines the
//     control. That is the trade he asked for, and `--color-divider-finished`
//     #d8d8dd (1.30:1) is the next grey up if the circle should read as a circle.
//   - the glyph went from `text-ink-secondary` #6e6e73 to `text-ink` #111111,
//     which is 4.30:1 to 14.9:1 on that disc. #6e6e73 is what the unselected
//     segments of that same toggle use, so the middle option is to match them.
// The unread dot's halo follows the disc (`ring-track-neutral` instead of
// `ring-white`), because a white ring on a grey disc reads as a light notch.
//
// Before that it was a white circle with a 1px `--color-control-edge` border and
// a muted `text-ink-secondary` glyph, and before THAT a 36px rounded SQUARE
// (`size-9 rounded-control`, 9px radius) until 2026-09-22, when Jefle asked for a
// circle at 42x42 to match the profile control beside it.
// The two numbers are the whole story and they are different knobs:
//   - `rounded-full` is the shape. The 9px radius was the only rounded-rect left
//     in a row whose other control is a face.
//   - 42px is a VISUAL size match, not a box match. The profile control's box is
//     still 36px; its ring is a 1px outline at 2px offset, painted OUTSIDE that
//     box, so its visible outer diameter is 36 + 2*(2+1) = 42px. The bell's border
//     is painted inside its border-box, so 42px of box IS 42px of visible circle
//     and the two controls now read the same size. Giving the bell a 36px box with
//     its own detached ring would also have matched, and was not the ask.
// Consequence to know about: the row is 78px tall now (16px `pt-4` + 42 + 20px
// `pb-5`), where it was 72px at 36, and the greeting gets 6px less width before it
// truncates (nothing truncates at 390 with a normal first name, measured).
// The glyph did NOT scale with the control: it is still a 20px `Bell` at
// `strokeWidth` 1.75, which leaves 11px of clearance inside the 42px circle where
// 20px in the 36px box left 8px. That is deliberate, one thing at a time: `size`
// on the `Bell` is the knob if it now reads small in the bigger circle, and
// `strokeWidth` is the second one. The teal hero gradient is gone from Home
// (2026-09-17, at Jefle's request), so the old `bg-white/20` fill with a white
// glyph had nothing left to read against, and neither does the diagonal white
// `::before` ring they used to carry. That rule (`.home-glass-ring` in
// `src/tailwind.css`) is deleted with the gradient.
//
// The unread dot is `top-[7px] right-[7px]`, and both numbers are measured against
// the circle's curve, because the two shorter sides of that move are the ones that
// clip. The dot's containing block is the button's padding box, which is now the
// whole 42px because the control has no border: at 6px the 8px disc spanned local
// x 28..36 and y 6..14, its corner furthest from the centre reached 21.21px against
// a 21px radius, and its halo crossed the rim. At 7px it spans x 27..35 and y 7..15,
// that corner is 19.8px, and it has 1.2px of clearance, which is what it had with
// the border on. `ring-track-neutral` rather than `ring-white` because the halo has
// to separate the dot from the disc it sits on, and that disc is grey now.
//
// The profile control is a plain 36px circle instead (2026-09-18): it is the
// nurse's own face or her initials, and a face inside a bordered square would
// read as a photo in a frame rather than as her. It keeps the same 36px
// footprint, so the greeting row's height and rhythm are unchanged. This also
// closes the old note that a generic lucide `User` glyph reads as an avatar that
// failed to load.
//
// The control's edge FLOATS now (2026-09-18, his ask): a 1px ring sitting 2px clear
// of the face instead of a border painted on its rim, and it carries the page's own
// card shadow so it reads as a piece of content rather than as an outline. Nothing
// about the layout moves: an outline is painted outside the box and takes no space,
// so the control is still 36px, the row is still 36px of content and the 10px gap to
// the greeting is unchanged. It is the `outline-*` family rather than `ring-*`
// because a ring with an offset paints its offset band in an opaque colour
// (`--tw-ring-offset-color`, white by default), which would put a second disc behind
// the gap; an outline leaves the gap showing the page ground, and the shadow behind
// it. Three knobs, all in this one class string: `outline-offset-2` is the gap,
// `outline-avatar-ring` is the line's colour (`#a1a1a6`, 2.45:1 on the page ground;
// the first pass used `--color-control-edge` at 1.35:1 and he asked for darker), and
// `shadow-card-lift` is the same `0 5px 15px rgba(53,87,97,.12)` every card on Home
// uses, deliberately not a new shadow value.
//
// The initials fallback is TEAL now (2026-09-22, his ask: "can we use our teal theme
// there too for the empty avatar one, instead of it just being gray"). It was the
// shared avatar's own `bg-press-state` `#f2f2f7` disc with a `text-ink-secondary`
// glyph, which is the grey the app uses for a person row; Home's header is the one
// place the app puts a brand colour, so it takes `bg-teal-tint` + `text-teal-foreground`
// (the same pair as Home's quick-action tiles and Pool's claim button). TWO KNOBS, both
// in the caller's `className`, so the shared `Avatar` default is untouched and Profile's
// 56px identity circle keeps its grey: `bg-teal-tint` is the disc (rgba(56,189,229,.15),
// which composites to #dcf0f8 over the page ground) and `text-teal-foreground` is the
// glyph. Only the fallback is visible at all: with a photo the img covers the disc, so a
// nurse with a picture sees no change. The outline stays `--color-avatar-ring` grey at
// 2.45:1, which is now the second knob if a grey ring around a teal disc reads wrong.
//
// The bell no longer owns the notifications panel. It used to fetch its own
// notifications and return the panel in place of itself, which worked while it
// rendered as a full-width bar; as a 36px control inside the greeting row that
// would render the panel inside the row. Home's own `showNotifications` already
// renders the panel (it is also how the Request Activity card's View All opens
// it), so that is the single owner now and the bell only reports taps.
export function HomeProfileControl({ name, avatarUrl, onOpenProfile }) {
  return (
    <button
      type="button"
      onClick={onOpenProfile}
      aria-label="Profile"
      data-testid="home-profile-control"
      className="shrink-0 rounded-full"
    >
      <Avatar
        name={name}
        src={avatarUrl}
        size="sm"
        className="bg-teal-tint text-teal-foreground outline-1 outline-offset-2 outline-avatar-ring shadow-card-lift"
      />
    </button>
  )
}

export function HomeBellControl({ hasUnread, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Notifications"
      data-testid="home-bell-control"
      className="relative flex size-[42px] shrink-0 items-center justify-center rounded-full bg-track-neutral text-ink"
    >
      <Bell size={20} strokeWidth={1.75} />
      {/* The unread dot is `top-[7px] right-[7px]`, not 6px: the control has no
          border now, so those offsets measure from the border box and the dot sat
          1px further out, with its halo across the rim (furthest corner 21.21px
          against a 21px radius). At 7px it has the 1.2px of clearance it had with
          the border on. A JSX comment cannot be the first child of a `&&` group,
          which is a build error rather than a lint one, so it lives out here. */}
      {hasUnread && (
        <span className="absolute top-[7px] right-[7px] size-2 rounded-full bg-urgency-red ring-2 ring-track-neutral" />
      )}
    </button>
  )
}
