import { PeriodTag } from '@/components/ui/period-tag'
import { formatShiftDate, formatShiftTimeRange, getShiftPeriod } from '@/lib/shiftFormat'
import { cn } from '@/lib/utils'

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
//
// `borderless` drops the 1px hairline so the card's lift shadow carries the
// grouping on its own, the same choice `SHIFT_LIST_BORDERLESS_CLASSNAME` makes
// for a list. ShiftDetail opts in (2026-09-18); the default keeps the outline,
// so the five other callers (ClaimStatusDetail, OfferShiftConfirm,
// OfferShiftStatus, OfferShiftUpdate, PersonalEventDetail) are unchanged. With
// border-box sizing removing the border widens the padding box by 1px each
// side, so the card's box loses 2px of height and its inner content sits 1px
// further out on every edge.
//
// `layout="detail"` is the roomier structure ShiftDetail uses (2026-09-18, his
// ask: "more generous... maybe even add a divider... and add the workspace").
// It splits one block of four lines into two blocks with a rule between them:
//
//   BURLINGAME SNF            [Evening]     `facility`, the workspace name
//   Tuesday, September 22, 2026             the date, on its own line
//   3:00 PM - 11:30 PM                      the headline, unchanged at 25px
//   ------------------------------------
//   Unit 1 - CNA              [Assigned]    the subline slot + `metaRight`
//
// The date used to share its line with the period tag, which is what made the
// top of the card read as one long crammed line. `facility` and `layout` are
// separate knobs from `borderless` on purpose, so either can be reverted alone.
// Omit `layout` and the card is the original three-line card, byte for byte.
export function HeroCard({
  shift,
  credential,
  subline,
  period,
  metaRight,
  borderless,
  layout = 'default',
  facility,
}) {
  const sublineContent = subline ?? (
    <>
      {shift.unit}
      {credential ? ` · ${credential}` : ''}
    </>
  )

  const cardClass = cn(
    'flex flex-col rounded-card bg-card-surface px-4 shadow-card-lift',
    !borderless && 'border border-hairline',
  )

  const periodTag = <PeriodTag period={period ?? getShiftPeriod(shift.starts_at)} />

  if (layout === 'detail') {
    return (
      <div className={cn(cardClass, 'gap-2.5 py-5')}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {facility ? (
              <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
                {facility}
              </span>
            ) : (
              <span />
            )}
            {periodTag}
          </div>

          <div className="text-[13px] text-ink-secondary">{formatShiftDate(shift.starts_at)}</div>

          <div className="text-[25px] font-semibold tracking-[-0.01em] text-ink">
            {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
          </div>
        </div>

        <div className="h-px bg-hairline" aria-hidden="true" />

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

  return (
    <div className={cn(cardClass, 'gap-2 py-[18px]')}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink-secondary">
          {formatShiftDate(shift.starts_at)}
        </span>
        {periodTag}
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
