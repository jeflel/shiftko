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

// `.shift-row-divider`: inset so its start lines up with the info column's text.
// 73px matches the artifact's date column (Pool, Claim Status, Manage, Swap
// Status); `wide` is 79px, for Schedule's date column, which sits 18px from the
// card's left edge (16px row padding plus a 2px margin) with 4px before the
// rule. 16px (`inset={false}`) is for
// lists whose rows carry no date column at all.
const DIVIDER_INSET = {
  default: 'ml-[73px]',
  wide: 'ml-[79px]',
}

export function ShiftListDivider({ inset = true, variant = 'default' }) {
  return (
    <div
      className={cn('h-px bg-hairline', inset ? DIVIDER_INSET[variant] : 'ml-4')}
      aria-hidden="true"
    />
  )
}
