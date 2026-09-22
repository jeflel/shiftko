import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

// Home's two header controls: the profile control to the left of the greeting
// and the notification bell at the right gutter.
//
// The bell is a white circle (`rounded-full`) at 42x42 (`size-[42px]`) with a 1px
// `--color-control-edge` border and a muted `text-ink-secondary` glyph. It was a
// 36px rounded SQUARE (`size-9 rounded-control`, 9px radius) until 2026-09-22,
// when Jefle asked for a circle at 42x42 to match the profile control beside it.
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
// The unread dot stays `top-[6px] right-[6px]`, and it was measured against the
// circle's curve rather than moved, because the two shorter sides of that move are
// the ones that clip. The dot's containing block is the button's PADDING box, so
// inside a 1px border it spans local x 27..35 and y 7..15; its centre is 14.14px
// from the circle's centre and the corner furthest from that centre is 19.8px,
// against a 21px radius, so it has 1.2px of rim clearance and its white `ring-2`
// halo stays inside the circle. The 36px square control it replaced left 5.3px of
// clearance at the same 6px offsets, so the corner of the box was closer to the
// rim than the circle ever gets.
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
        className="outline-1 outline-offset-2 outline-avatar-ring shadow-card-lift"
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
      className="relative flex size-[42px] shrink-0 items-center justify-center rounded-full border border-control-edge bg-white text-ink-secondary"
    >
      <Bell size={20} strokeWidth={1.75} />
      {hasUnread && (
        <span className="absolute top-[6px] right-[6px] size-2 rounded-full bg-urgency-red ring-2 ring-white" />
      )}
    </button>
  )
}
