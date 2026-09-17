import { Sun, Sunset, Moon, Pencil, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Colored Day/Evening/Night/Personal tag, per the Linear Light source
// (home-linear-light, shiftko-design-v2-visual-pass-dup). Shared by every
// screen already ported to Linear Light (Home, Schedule) — extracted from
// Home's original local PeriodTag (approved 2026-09-09) once Schedule needed
// the same colors, rather than duplicating it a second time. Screens not yet
// ported (ShiftDetail, Pool) keep ui/pill.jsx's two-color rule.
const PERIOD_TAG_CONFIG = {
  Day: { icon: Sun, bg: 'bg-period-day-bg', fg: 'text-period-day-fg' },
  Evening: { icon: Sunset, bg: 'bg-period-evening-bg', fg: 'text-period-evening-fg' },
  Night: { icon: Moon, bg: 'bg-period-night-bg', fg: 'text-period-night-fg' },
  Personal: { icon: Pencil, bg: 'bg-period-personal-bg', fg: 'text-period-personal-fg' },
}

// `variant="bare"`: same colour and icon, no pill background, and the icon
// trails the label instead of leading it. Schedule's own shift rows use it for
// an experiment (label above the time, chevron where the pill used to be);
// everything else keeps the pill.
export function PeriodTag({ period, variant = 'pill' }) {
  const config = PERIOD_TAG_CONFIG[period]
  if (!config) return null
  const Icon = config.icon

  if (variant === 'bare') {
    return (
      <span className={cn('inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold', config.fg)}>
        {period}
        <Icon size={12} strokeWidth={2} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-control-sm py-1 pr-2 pl-1.5 text-[11px] font-semibold',
        config.bg,
        config.fg,
      )}
    >
      <Icon size={12} strokeWidth={2} />
      {period}
    </span>
  )
}

// Status chip for a shift row's pending-claim / offered-to-pool state.
// Not present in any Linear Light mockup (Schedule's 4 target screens never
// show one) — restyled to the same shape/sizing as PeriodTag rather than
// left on the old two-color pill, so it doesn't read as a leftover. "pending"
// reuses the established status-tag teal tint (matches Claims' .pending
// color); "offered" has no established color anywhere yet, so it stays a
// plain neutral pill rather than inventing one.
const STATUS_TAG_CONFIG = {
  pending: { label: 'Pending', icon: Clock, bg: 'bg-teal-tint', fg: 'text-teal-foreground' },
  offered: { label: 'Offered', icon: null, bg: 'bg-press-state', fg: 'text-ink-secondary' },
}

export function ShiftStatusTag({ status, label }) {
  const config = STATUS_TAG_CONFIG[status]
  if (!config) return null
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-control-sm py-1 pr-2 pl-1.5 text-[11px] font-semibold',
        config.bg,
        config.fg,
      )}
    >
      {Icon && <Icon size={12} strokeWidth={2} />}
      {label ?? config.label}
    </span>
  )
}
