import { ArrowLeftRight } from 'lucide-react'
import { PeriodTag } from '@/components/ui/period-tag'
import { formatShiftDayShort, formatShiftTimeRange, getShiftPeriod } from '@/lib/shiftFormat'

// The "You give / You get" pair used throughout the Swap flow (SwapReview,
// SwapStatusDetail's every status branch, SwapIncomingRequest), per
// .swap-stack/.swap-card/.swap-connector in the Linear Light source. One
// shared set from the start (not duplicate-then-extract) since this commit
// builds every Swap screen that needs it at once.
function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export function SwapStack({ children }) {
  return <div className="flex flex-col">{children}</div>
}

export function SwapConnector() {
  return (
    <div className="flex justify-center py-2">
      <span className="flex size-[30px] items-center justify-center rounded-full bg-press-state text-teal-foreground">
        <ArrowLeftRight size={16} strokeWidth={1.9} />
      </span>
    </div>
  )
}

// `personName` must be the bare name (e.g. "Ana Florendo") - initials are
// computed from it directly. `personLabel` is the full display text (e.g.
// "Ana Florendo's shift" or "from Ana Florendo"); defaults to `personName`
// itself when not given.
export function SwapCard({ label, shift, meta, personName, personLabel }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-hairline bg-card-surface p-4 shadow-card-lift">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <span className="self-start">
        <PeriodTag period={getShiftPeriod(shift.starts_at)} />
      </span>
      <div className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
        {formatShiftDayShort(shift.starts_at)} · {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
      </div>
      {meta && <div className="text-xs text-ink-secondary">{meta}</div>}
      {personName && (
        <div className="mt-1 flex items-center gap-2">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-press-state text-[11px] font-semibold text-ink-secondary">
            {getInitials(personName)}
          </span>
          <span className="text-xs font-semibold text-ink-secondary">{personLabel ?? personName}</span>
        </div>
      )}
    </div>
  )
}
