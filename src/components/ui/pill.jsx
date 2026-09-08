import { Sun, Sunset, Moon, Pencil, Circle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Period Tag and Neutral Tag per DESIGN.md (shiftko-design-v2-visual-pass-dup).
// The Two-Color Rule drops all per-period and per-status hues: period tags are
// icon + gray text with no fill, status tags are one neutral gray pill — category
// and status are carried by text content, never by color.
const PERIOD_CONFIG = {
  Day: { label: 'Day', icon: Sun },
  Evening: { label: 'Evening', icon: Sunset },
  Night: { label: 'Night', icon: Moon },
  // Personal events always show this tag instead of Day/Evening/Night,
  // regardless of what time of day they fall in — per ScheduleList.dc.html,
  // it's what marks a row as self-logged rather than official.
  Personal: { label: 'Personal', icon: Pencil },
}

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Circle },
  pending: { label: 'Pending', icon: Clock },
  scheduled: { label: 'Assigned', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', icon: XCircle },
}

function PillBase({ icon: Icon, label, className, iconSize = 12 }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium text-ink-secondary',
        className,
      )}
    >
      {Icon && <Icon size={iconSize} strokeWidth={2.5} />}
      {label}
    </span>
  )
}

export function ShiftPeriodPill({ period }) {
  const config = PERIOD_CONFIG[period] ?? { label: period, icon: null }
  return <PillBase icon={config.icon} label={config.label} iconSize={13} />
}

export function StatusPill({ status, label }) {
  const config = STATUS_CONFIG[status] ?? { label: status, icon: null }
  return (
    <PillBase
      icon={config.icon}
      label={label ?? config.label}
      className="rounded-full bg-press-state px-3 py-1"
    />
  )
}
