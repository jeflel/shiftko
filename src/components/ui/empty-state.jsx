import { cn } from '@/lib/utils'

// Shared empty state: an icon in a soft tinted tile, a short title and an
// optional subline.
//
// Introduced for the nurse Home's no-shift-today card and the empty Upcoming
// list. Every other empty state in the app is still a bare line of grey text
// (Pool, Schedule, Approvals, Manage, Swap, Duplicate week, Staff roster) and
// should move onto this component so they all read the same way.
//
// The icon tile reuses existing tint pairs (teal from the quick-tile chips,
// night from the night shift period tag) rather than introducing a new visual
// language.
//
// layout="row" is the compact form: icon beside left-aligned text, no vertical
// padding of its own, so it sits inside a card without ballooning it.
// layout="stack" is the centred form for a whole empty section.
export function EmptyState({
  icon: Icon,
  title,
  subline,
  size = 'section',
  tone = 'teal',
  layout = 'stack',
  className,
}) {
  const isInline = size === 'inline'

  const toneClass = cn(
    tone === 'teal' && 'bg-teal-tint text-teal-foreground',
    tone === 'night' && 'bg-period-night-bg text-period-night-fg',
    tone === 'neutral' && 'bg-track-neutral text-ink-secondary',
    tone === 'warn' && 'bg-period-warn-bg text-period-warn-fg',
  )

  if (layout === 'row') {
    return (
      <div className={cn('flex items-center gap-3 py-0.5', className)}>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', toneClass)}>
          <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          {subline && <p className="text-[13px] text-ink-secondary">{subline}</p>}
        </div>
      </div>
    )
  }

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
          toneClass,
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
