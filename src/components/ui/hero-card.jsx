import { Building2 } from 'lucide-react'
import { PeriodTag } from '@/components/ui/period-tag'
import { formatShiftDate, formatShiftDayShort, formatShiftTimeRange, getShiftPeriod } from '@/lib/shiftFormat'
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
// for a list. ShiftDetail opts in (2026-09-18) and PersonalEventDetail follows
// (2026-09-19); the default keeps the outline, so the four other callers
// (ClaimStatusDetail, OfferShiftConfirm, OfferShiftStatus, OfferShiftUpdate) are
// unchanged. With
// border-box sizing removing the border widens the padding box by 1px each
// side, so the card's box loses 2px of height and its inner content sits 1px
// further out on every edge.
//
// `layout="detail"` is the roomier structure ShiftDetail uses (2026-09-18, his
// ask: "more generous... maybe even add a divider... and add the workspace") and
// PersonalEventDetail opts into (2026-09-19, so a personal event's detail screen
// reads as the same screen as an assigned shift's). It
// splits one block of four lines into two blocks with a rule between them:
//
//   Tue, Sep 22     [Evening] [Assigned]     the SHORT date, the period tag, `metaRight`
//   3:00 PM - 11:30 PM                       the headline, unchanged at 25px
//   ------------------------------------
//   [bldg] WORKSPACE   Unit 1 - CNA          the subline slot, right aligned
//          Burlingame SNF
//
// The date is `formatShiftDayShort` ("Tue, Sep 22", the same form the Swap
// cards already use) rather than the full "Tuesday, September 22, 2026", which
// he called annoying for its length even after it got its own row. No year, the
// way Home's upcoming rows and the notification lines already omit it. The
// period tag sits opposite the short date, where it started.
//
// **The bottom block is Profile's Workspace card, moved here (2026-09-19).**
// His ask: "i want that exact layout and design on the shift detail page, it
// should be whats under the shift card divider then the Unit 1, CNA can be on
// the right side instead." `facility` used to be a bare 11px/600 uppercase
// footer with the unit line above it; it is now the same block Profile.jsx
// renders, values copied rather than restyled: a 36px round `#F8F7F5` tile with
// a `Building2` 16px glyph in `#6B7280`, `WORKSPACE` at 11px/500 uppercase
// `#9CA3AF`, and the name at 14px/500 `#111111`. The subline slot sits on the
// RIGHT of that row, which is where the unit/credential line used to be on the
// left. With no `facility` the block falls back to the old subline row, so a
// caller whose workspace query has not resolved (or the four screens that never
// pass one) renders as before.
//
// **`metaRight` lives in the TOP row now, beside the period tag**, because the
// bottom block read as crowded with two tags and a workspace in it (same day:
// "its so crowded under the divider, can we put the Assigned pill, next to the
// shift pill rn, where it says evening"). It keeps its place in the no-`facility`
// fallback too, so the pill cannot hop rows mid-load, and the bottom block no
// longer renders it at all: leaving the old branch in drew the tag TWICE while
// the workspace query was in flight, which only showed up because the fallback
// was measured rather than assumed.
//
// `facility` and `layout` are separate knobs from `borderless` on purpose, so
// either can be reverted alone. Omit `layout` and the card is the original
// three-line card, byte for byte, which is what the four screens still on the
// default render.
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
            <span className="text-[13px] font-semibold text-ink-secondary">
              {formatShiftDayShort(shift.starts_at)}
            </span>

            {/* The period tag and the state tag sit together on the right of the short
                date (2026-09-19). His ask: "its so crowded under the divider, can we put
                the Assigned pill, next to the shift pill rn, where it says evening". So
                `metaRight` moved OUT of the bottom block, which now carries only the
                workspace and the unit line, and joined the period tag it belongs beside:
                one pair of pills, one row. 8px apart, the app's own gap between two
                adjacent tags. It stays here in the no-`facility` fallback too, so the
                pill cannot jump rows when the workspace query resolves. */}
            <div className="flex shrink-0 items-center gap-2">
              {periodTag}
              {metaRight}
            </div>
          </div>

          <div className="text-[25px] font-semibold tracking-[-0.01em] text-ink">
            {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
          </div>
        </div>

        <div className="h-px bg-hairline" aria-hidden="true" />

        <div className="flex flex-col gap-2">
          {facility ? (
            // The workspace gets its own block, copied from Profile.jsx's Workspace card
            // (2026-09-19, his ask: "i want that exact layout and design on the shift
            // detail page, it should be whats under the shift card divider then the Unit 1,
            // CNA can be on the right side instead"). Same 36px round tile, same
            // `Building2` 16px glyph, same 11px/500 uppercase label over the 14px/500 name,
            // same values, so the two screens are the same object. The unit/credential line
            // sits on the right of it, which is where the unit used to be on the left.
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8F7F5] text-[#6B7280]">
                  <Building2 size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium tracking-wide text-[#9CA3AF] uppercase">
                    Workspace
                  </p>
                  <p className="truncate text-sm font-medium text-[#111111]">{facility}</p>
                </div>
              </div>

              <span className="shrink-0 text-[13px] text-ink-secondary">{sublineContent}</span>
            </div>
          ) : (
            // No workspace name yet: the unit line on its own. `metaRight` is NOT
            // rendered here any more, it lives in the top row now, and leaving this
            // branch in drew the state tag twice (caught by measuring the fallback,
            // 2026-09-19).
            <div className="text-[13px] text-ink-secondary">{sublineContent}</div>
          )}
        </div>
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
