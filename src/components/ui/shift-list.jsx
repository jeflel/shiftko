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

// `.shift-row-divider`: inset 73px when rows carry a date column (My Shifts
// week lists, Pool, Claim Status), 16px when they don't (day-detail lists,
// Team Schedule list), per the established Linear Light vocabulary.
export function ShiftListDivider({ inset = true }) {
  return <div className={cn('h-px bg-hairline', inset ? 'ml-[73px]' : 'ml-4')} aria-hidden="true" />
}
