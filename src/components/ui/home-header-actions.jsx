import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

// Home's two header controls: the profile control to the left of the greeting
// and the notification bell at the right gutter.
//
// The bell is a WHITE circle at 42x42 (`size-[42px] rounded-full`) with a 1px
// `border-control-edge` rim (#d8d8dd) and a `text-ink` glyph (2026-09-27). Jefle
// picked that pair out of a rendered five-way comparison ("the color isnt right,
// it doesnt feel right"), which reverses the 2026-09-22 call that had given the
// disc the SegmentedControl track's own grey with no border: `bg-track-neutral`
// #ededf2 is 1.11:1 on the page ground, so the disc was a wash rather than a
// shape and the eye got a near-black glyph floating on a ghost of a ring. The
// rim is what makes the circle read as a control, and it is the app's own
// white-button vocabulary rather than a new value: tailwind.css documents
// --color-control-edge as "a control's own rim, drawn on the edge of a white
// button", and this is that role. Glyph unchanged: `text-ink` #1d1d1f, 14.42:1
// on the grey disc it replaces, 16.83:1 on white. The rim's own step is
// 1.35:1, and the ladder either side of it is already measured in tailwind.css
// (hairline #e5e5ea 1.19:1 reads as no control at all, chevron-muted #c7c7cc
// 1.60:1) if the rim should be stronger or softer.
// Three consequences, and the first two are why this is a one-class swap:
//   - the 1px border paints INSIDE the border-box, so the box is still 42x42,
//     the painted circle is still 42px across and nothing outside the control
//     moves: the row stays 78px (16px `pt-4` + 42 + 20px `pb-5`).
//   - the glyph's clearance to the visible rim is still 11px: the content box
//     shrinks to 40px, so the 20px Bell sits 10px in and the 1px rim paints the
//     remaining 1px. `size` on the Bell stays the knob if it reads small.
//   - the unread dot's offsets are back to `top-[6px] right-[6px]`, because its
//     containing block is the button's PADDING box and the border just shrank
//     that 1px a side. 6px lands the dot 7px from the border box, which is exactly
//     where it sits on the borderless disc today: measured corner 19.8px from the
//     centre against a 21px radius, 1.2px of clearance, unchanged. Leaving it at
//     7px would have moved the dot 1px further in (8px from the border box, corner
//     18.38px, 2.62px of clearance), which is a visible move and not the ask. Its
//     halo is `ring-white` again, because the disc it separates the dot from is
//     white; on the grey disc it had to be `ring-track-neutral`, since a white
//     ring there reads as a light notch.
//
// Before 2026-09-22 it was also a white circle with a 1px `--color-control-edge`
// border, but with a muted `text-ink-secondary` glyph, and before THAT a 36px
// rounded SQUARE (`size-9 rounded-control`, 9px radius) until 2026-09-22, when
// Jefle asked for a circle at 42x42 to match the profile control beside it.
// The two numbers are the whole story and they are different knobs:
//   - `rounded-full` is the shape. The 9px radius was the only rounded-rect left
//     in a row whose other control is a face.
//   - 42px is a VISUAL size match, not a box match. The profile control's box is
//     still 36px; its ring is a 1px outline at 2px offset, painted OUTSIDE that
//     box, so its visible outer diameter is 36 + 2*(2+1) = 42px. The bell's border
//     is painted inside its border-box, so 42px of box IS 42px of visible circle
//     and the two controls read the same size.
// The glyph did NOT scale with the control: it is still a 20px `Bell` at
// `strokeWidth` 1.75, which leaves 11px of clearance inside the 42px circle where
// 20px in the 36px box left 8px. `strokeWidth` is the second knob. The teal hero
// gradient is gone from Home (2026-09-17, at Jefle's request), so the old
// `bg-white/20` fill with a white glyph had nothing left to read against, and
// neither does the diagonal white `::before` ring they used to carry. That rule
// (`.home-glass-ring` in `src/tailwind.css`) is deleted with the gradient.
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
      className="relative flex size-[42px] shrink-0 items-center justify-center rounded-full border border-control-edge bg-white text-ink"
    >
      <Bell size={20} strokeWidth={1.75} />
      {/* The unread dot is `top-[6px] right-[6px]`, not 7px: the border is back, so
          the dot's containing block is the padding box and the offsets measure from
          1px inside the border box. 6px lands it 7px from the border box, exactly
          where it sits on the borderless disc today (measured corner 19.8px from the
          centre against a 21px radius, 1.2px of clearance); 7px would push it 1px
          further in. A JSX comment cannot be the first child of a `&&` group, which
          is a build error rather than a lint one, so it lives out here. */}
      {hasUnread && (
        <span className="absolute top-[6px] right-[6px] size-2 rounded-full bg-urgency-red ring-2 ring-white" />
      )}
    </button>
  )
}
