import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

// Home's two header controls: the profile control to the left of the greeting
// and the notification bell at the right gutter.
//
// The bell is a white 36x36 control (`size-9 rounded-control`) with a 1px
// `--color-control-edge` border and a muted `text-ink-secondary` glyph. The teal
// hero gradient is gone from Home (2026-09-17, at Jefle's request), so the old
// `bg-white/20` fill with a white glyph had nothing left to read against, and
// neither does the diagonal white `::before` ring they used to carry. That rule
// (`.home-glass-ring` in `src/tailwind.css`) is deleted with the gradient.
//
// The profile control is a plain 36px circle instead (2026-09-18): it is the
// nurse's own face or her initials, and a face inside a bordered square would
// read as a photo in a frame rather than as her. It keeps the same 36px
// footprint, so the greeting row's height and rhythm are unchanged, and it
// inherits `--color-control-edge` as a soft edge for pale photos. This also
// closes the old note that a generic lucide `User` glyph reads as an avatar that
// failed to load.
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
        className="border border-control-edge"
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
      className="relative flex size-9 shrink-0 items-center justify-center rounded-control border border-control-edge bg-white text-ink-secondary"
    >
      <Bell size={18} strokeWidth={1.75} />
      {hasUnread && (
        <span className="absolute top-[6px] right-[6px] size-2 rounded-full bg-urgency-red ring-2 ring-white" />
      )}
    </button>
  )
}
