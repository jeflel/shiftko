import { cn } from '@/lib/utils'
import { SHIFT_LIST_BORDERLESS_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'

// The loading shape for a list of shift rows (2026-09-22).
//
// Schedule and Pool used to draw one line of grey text each ("Loading shifts…",
// "Loading team schedule…", "Loading open shifts…") and then the whole list, so
// a screen had no shape until its queries landed. These placeholders mirror the
// real rows' own geometry instead of inventing a skeleton vocabulary: the same
// container class string, the same 32px date column with its 2px margins, the
// same 1px rule, the same three-line body (period tag, time, meta) and the same
// row dividers. That is what makes the placeholder and the real row the same
// height, which is the only thing a skeleton has to get right.
//
// Two knobs, because the app genuinely has two row paddings: `variant="card"`
// is Schedule's `py-4.5` row (Jefle asked for roomier rows there), and
// `variant="borderless"` is Pool's `py-3.5`. Blocks are `bg-track-neutral`, the
// same token as the real progress track, and nothing animates: the app has no
// skeleton vocabulary and a shimmer would be a new motion idea.
//
// The date column's two bars stand in for the weekday and day number, so a row
// reads as "a shift on some day" rather than as an empty box.

const BLOCK = 'bg-track-neutral'

function DateColumnSkeleton() {
  return (
    <div className="ml-0.5 mr-0.5 flex w-8 shrink-0 flex-col items-center gap-1">
      <span className={cn('h-[11px] w-7 rounded', BLOCK)} />
      <span className={cn('h-[19px] w-5 rounded', BLOCK)} />
    </div>
  )
}

function RowBodySkeleton({ tagWidth = 62, timeWidth = 124, metaWidth = 92 }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className={cn('h-[18px] rounded-full', BLOCK)} style={{ width: tagWidth }} />
      <span className={cn('h-[19px] rounded', BLOCK)} style={{ width: timeWidth }} />
      <span className={cn('h-[15px] rounded', BLOCK)} style={{ width: metaWidth }} />
    </div>
  )
}

// The two heights are the real rows', measured at 390px wide: Schedule's
// `py-4.5` row with a 14px time line is 93.5px, Pool's `py-3.5` row with a 13px
// title is 84px. `min-h` carries them because the real height comes from three
// lines of type and text metrics are not worth reproducing with grey blocks; the
// bars only have to fit inside.
export function ShiftRowSkeleton({ variant = 'card', trailing = false, chevron = false }) {
  return (
    <div
      data-testid="list-skeleton-row"
      aria-hidden="true"
      className={cn(
        'flex w-full items-center gap-3 px-4',
        variant === 'card' ? 'min-h-[93.5px] py-4.5' : 'min-h-[84px] py-3.5',
      )}
    >
      <DateColumnSkeleton />
      <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />
      <RowBodySkeleton />
      {trailing && <span className={cn('ml-1 h-[34px] w-[74px] shrink-0 rounded-full', BLOCK)} />}
      {chevron && <span className={cn('size-[18px] shrink-0 rounded', BLOCK)} />}
    </div>
  )
}

// `label="week"` is My Shifts' sticky "Sep 20 - 26" divider (14px + hairline),
// `label="day"` is Team Schedule's 12px uppercase day header.
function LabelSkeleton({ kind }) {
  if (kind === 'week') {
    return (
      <div className="flex items-center gap-2.5">
        <span className={cn('h-[19px] w-[96px] rounded', BLOCK)} />
        <div className="h-px flex-1 bg-hairline" aria-hidden="true" />
      </div>
    )
  }
  return <span className={cn('h-[15px] w-[104px] rounded', BLOCK)} />
}

// One grouped list. My Shifts renders one row per DAY of a week, so its real
// first screen is a whole week (the empty weeks further out are skipped);
// `rows={7}` is that week, not an invented count. Pool's list is however many
// shifts are open, so it claims a shorter list.
export function ShiftListSkeleton({
  rows = 3,
  variant = 'card',
  label = null,
  trailing = false,
  chevron = false,
}) {
  return (
    <div data-testid="list-skeleton" aria-hidden="true" className="flex flex-col">
      {label && <LabelSkeleton kind={label} />}
      <ul className={cn(SHIFT_LIST_BORDERLESS_CLASSNAME, 'py-1.5')}>
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index}>
            <ShiftRowSkeleton variant={variant} trailing={trailing} chevron={chevron} />
            {index < rows - 1 && <ShiftListDivider />}
          </li>
        ))}
      </ul>
    </div>
  )
}

// A day-grouped placeholder for Team Schedule's list, which is one card per day
// rather than one continuous list.
export function DayGroupsSkeleton({ groups = 3, rowsPerGroup = 2 }) {
  return (
    <div data-testid="list-skeleton" aria-hidden="true" className="flex flex-col gap-4">
      {Array.from({ length: groups }).map((_, group) => (
        <div key={group} className="flex flex-col gap-2">
          <LabelSkeleton kind="day" />
          <ul className={cn(SHIFT_LIST_BORDERLESS_CLASSNAME, 'py-1.5')}>
            {Array.from({ length: rowsPerGroup }).map((_, index) => (
              <li key={index}>
                <ShiftRowSkeleton variant="card" />
                {index < rowsPerGroup - 1 && <ShiftListDivider />}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
