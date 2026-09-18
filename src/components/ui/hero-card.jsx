import { PeriodTag } from '@/components/ui/period-tag'
import { formatShiftDate, formatShiftTimeRange, getShiftPeriod } from '@/lib/shiftFormat'

// A status-detail screen's headline shift card (.hero-card in the Linear
// Light source) - date + period tag, big time range, unit/credential
// subline. Extracted from ClaimStatusDetail.jsx's local HeroCard once the
// Offer Shift flow needed the same shape a second place, per the rollout's
// "duplicate once, extract on second use" pattern. `credential` is optional
// (Claims' original use never passed one, showing unit alone).
//
// `metaRight` is an optional slot on the subline row, used by ShiftDetail to
// pair "Unit 1 · RN" with a state tag on the right, the way the reference
// mockup's card pairs its label with a badge. Omit it and the card renders
// exactly as before, which is what every other caller does.
export function HeroCard({ shift, credential, subline, period, metaRight }) {
  const sublineContent = subline ?? (
    <>
      {shift.unit}
      {credential ? ` · ${credential}` : ''}
    </>
  )

  return (
    <div className="flex flex-col gap-2 rounded-card border border-hairline bg-card-surface px-4 py-[18px] shadow-card-lift">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink-secondary">
          {formatShiftDate(shift.starts_at)}
        </span>
        <PeriodTag period={period ?? getShiftPeriod(shift.starts_at)} />
      </div>
      <div className="text-[25px] font-semibold tracking-[-0.01em] text-ink">
        {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
      </div>
      {metaRight ? (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-[13px] text-ink-secondary">{sublineContent}</span>
          {metaRight}
        </div>
      ) : (
        <div className="text-[13px] text-ink-secondary">{sublineContent}</div>
      )}
    </div>
  )
}
