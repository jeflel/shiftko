import { cn } from '@/lib/utils'

// Shared empty state: an icon in a soft tinted tile, a short title and an
// optional subline, centred.
//
// Introduced for the nurse Home's no-shift-today card and the empty Upcoming
// list. Every other empty state in the app is still a bare line of grey text
// (Pool, Schedule, Approvals, Manage, Swap, Duplicate week, Staff roster) and
// should move onto this component so they all read the same way.
//
// The icon tile reuses the quick-tile chip pattern (bg-teal-tint on
// text-teal-foreground) rather than introducing a new visual language.
export function EmptyState({ icon: Icon, title, subline, size = 'section', tone = 'teal', className }) {
  const isInline = size === 'inline'

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        isInline ? 'gap-2 py-5' : 'gap-3 py-8',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          isInline ? 'size-10' : 'size-12',
          tone === 'teal' && 'bg-teal-tint text-teal-foreground',
          tone === 'neutral' && 'bg-track-neutral text-ink-secondary',
          tone === 'warn' && 'bg-period-warn-bg text-period-warn-fg',
        )}
      >
        <Icon size={isInline ? 18 : 20} strokeWidth={1.75} aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-0.5">
        <p className={cn('font-semibold text-ink', isInline ? 'text-[14px]' : 'text-[15px]')}>
          {title}
        </p>
        {subline && <p className="text-[13px] text-ink-secondary">{subline}</p>}
      </div>
    </div>
  )
}
