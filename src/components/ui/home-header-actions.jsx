import { Bell, User } from 'lucide-react'

// Home's two header controls: the profile control to the left of the greeting
// and the notification bell at the right gutter.
//
// Both are white 36x36 controls (`size-9 rounded-control`) with a 1px
// `--color-control-edge` border and a muted `text-ink-secondary` glyph. The teal
// hero gradient is gone from Home (2026-09-17, at Jefle's request), so the old
// `bg-white/20` fill with a white glyph had nothing left to read against, and
// neither does the diagonal white `::before` ring they used to carry. That rule
// (`.home-glass-ring` in `src/tailwind.css`) is deleted with the gradient.
//
// The bell no longer owns the notifications panel. It used to fetch its own
// notifications and return the panel in place of itself, which worked while it
// rendered as a full-width bar; as a 36px control inside the greeting row that
// would render the panel inside the row. Home's own `showNotifications` already
// renders the panel (it is also how the Request Activity card's View All opens
// it), so that is the single owner now and the bell only reports taps.
export function HomeProfileControl({ onOpenProfile }) {
  return (
    <button
      type="button"
      onClick={onOpenProfile}
      aria-label="Profile"
      data-testid="home-profile-control"
      className="flex size-9 shrink-0 items-center justify-center rounded-control border border-control-edge bg-white text-ink-secondary"
    >
      <User size={18} strokeWidth={1.75} />
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
