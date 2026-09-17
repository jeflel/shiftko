import { cn } from '@/lib/utils'

// Linear Light grouped-list container (home-linear-light's .shift-list),
// one shared border/shadow/radius for a whole group of rows. `overflow-hidden`
// clips the first/last row to the container's own rounded corners so
// individual rows never need their own radius. Extracted from Schedule.jsx
// once Pool/Claim Status needed the same container a third time.
const SHIFT_LIST_BASE =
  'flex flex-col overflow-hidden rounded-card bg-card-surface shadow-card-lift'

export const SHIFT_LIST_CLASSNAME = `${SHIFT_LIST_BASE} border border-hairline`

// Same container without the hairline outline, for lists where the lift shadow
// alone carries the grouping. Schedule's shift lists use this: the outline read
// as a box drawn around the list on that page.
export const SHIFT_LIST_BORDERLESS_CLASSNAME = SHIFT_LIST_BASE

// `.shift-row-divider`: inset so its start lands on the info column's text, which
// the artifact tucks the line 2px short of. The number follows the row's own
// geometry, so it is named per set of rows that share one:
//   default  32px date column, no side margins: 16 + 32 + 12 + 1 + 12 = 73
//   pool     32px date column, 2px each side:   16 + 2 + 32 + 2 + 12 + 1 + 12 = 77, inset 75
//   schedule 34px date column, 2px each side:   16 + 2 + 34 + 2 + 12 + 1 + 12 = 79, inset 77
// 16px (`inset={false}`) is for lists whose rows carry no date column at all.
const DIVIDER_INSET = {
  default: 'ml-[73px]',
  pool: 'ml-[75px]',
  schedule: 'ml-[77px]',
}

export function ShiftListDivider({ inset = true, variant = 'default' }) {
  return (
    <div
      className={cn('h-px bg-hairline', inset ? DIVIDER_INSET[variant] : 'ml-4')}
      aria-hidden="true"
    />
  )
}
