import { Bell, CheckCircle2, ChevronLeft, ChevronRight, Repeat, XCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRelativeTime } from '@/lib/shiftFormat'

function getIconMeta(type) {
  if (type === 'swap_requested' || type === 'swap_approved') {
    return { Icon: Repeat, variantClass: 'bg-teal-tint text-teal-foreground' }
  }

  if (type === 'claim_approved' || type === 'offer_claimed') {
    return { Icon: CheckCircle2, variantClass: 'bg-press-state text-ink-secondary' }
  }

  return { Icon: XCircle, variantClass: 'bg-press-state text-ink-secondary' }
}

function NotificationRow({ notification, onOpen }) {
  const { Icon, variantClass } = getIconMeta(notification.type)
  const navigates = notification.type === 'offer_claimed'

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
    >
      <span
        className={`flex size-[34px] shrink-0 items-center justify-center rounded-control ${variantClass}`}
      >
        <Icon size={17} strokeWidth={1.75} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold leading-[1.35] tracking-[-0.01em] text-ink">
          {notification.message}
        </span>
        <span className="text-xs text-ink-secondary">
          {formatRelativeTime(notification.created_at)}
        </span>
      </span>

      {!notification.read && <span className="size-2 shrink-0 rounded-full bg-teal" />}
      {navigates && (
        <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
      )}
    </button>
  )
}

function NotificationSection({ title, items, onOpen }) {
  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">{title}</p>
      <ul className="flex flex-col overflow-hidden rounded-card border border-hairline bg-card-surface shadow-card-lift">
        {items.map((notification, index) => (
          <li key={notification.id}>
            <NotificationRow notification={notification} onOpen={onOpen} />
            {index < items.length - 1 && <div className="ml-[62px] h-px bg-hairline" />}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Notifications({ notifications, onBack, onMarkAllRead, onOpenNotification }) {
  const unread = notifications.filter((notification) => !notification.read)
  const read = notifications.filter((notification) => notification.read)

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-5 pt-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex size-[34px] shrink-0 items-center justify-center rounded-control border border-hairline bg-card-surface text-ink-secondary"
          >
            <ChevronLeft size={16} strokeWidth={1.9} />
          </button>
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Notifications</span>
        </div>

        {unread.length > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-[13px] font-semibold text-teal-foreground"
          >
            Mark all read
          </button>
        )}
      </div>

      <main className="flex flex-1 flex-col gap-[18px] px-5 pt-2.5 pb-4">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            subline="Claims, swaps and shift updates will show up here."
            size="section"
            tone="teal"
          />
        ) : (
          <>
            <NotificationSection title="New" items={unread} onOpen={onOpenNotification} />
            <NotificationSection title="Earlier" items={read} onOpen={onOpenNotification} />
          </>
        )}
      </main>
    </div>
  )
}
