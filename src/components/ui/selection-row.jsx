import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PeriodTag } from '@/components/ui/period-tag'
import { formatShiftTimeRange, getShiftPeriod } from '@/lib/shiftFormat'

// Selection-row family per DESIGN.md's Selection Rows / SwapPickCoworker &
// SwapPickShift's .picker-row/.shift-pick-card + shared .check-circle. Two
// shapes (person vs. shift) rather than one over-flexible component - their
// layouts genuinely differ (avatar+name vs. date-col+divider+time), only the
// check-circle affordance is truly shared.
function CheckCircle({ checked }) {
  return (
    <span
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
        checked ? 'border-teal-foreground bg-teal-foreground text-white' : 'border-hairline text-transparent',
      )}
    >
      <Check size={12} strokeWidth={2.5} />
    </span>
  )
}

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export function PersonPickerRow({ name, meta, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="swap-pick-coworker-row"
      className={cn(
        'flex w-full items-center gap-3 rounded-card border p-3.5 text-left shadow-card-lift',
        selected ? 'border-teal-foreground bg-teal-tint' : 'border-hairline bg-card-surface',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-press-state text-[13px] font-semibold text-ink-secondary">
        {getInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{name}</p>
        {meta && <p className="truncate text-xs text-ink-secondary">{meta}</p>}
      </div>
      <CheckCircle checked={selected} />
    </button>
  )
}

export function ShiftPickerRow({ shift, meta, selected, onClick }) {
  const date = new Date(shift.starts_at)
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' })

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="swap-pick-shift-row"
      className={cn(
        'flex w-full items-center gap-3 rounded-card border p-3.5 text-left shadow-card-lift',
        selected ? 'border-teal-foreground bg-teal-tint' : 'border-hairline bg-card-surface',
      )}
    >
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span className="text-[11px] font-medium tracking-[0.03em] text-[#85969B] uppercase">{weekday}</span>
        <span className="text-[19px] leading-[1.15] font-medium text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[13px] font-medium text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {meta && <p className="mt-0.5 truncate text-xs text-ink-secondary">{meta}</p>}
      </div>

      <PeriodTag period={getShiftPeriod(shift.starts_at)} />
      <CheckCircle checked={selected} />
    </button>
  )
}
