import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const monthLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateKey(date) {
  const d = startOfDay(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Builds a flat list of { date, dateKey, inCurrentMonth } cells for one
// calendar month, padded with leading blanks so the first real day lands
// under the correct weekday column.
function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstOfMonth.getDay()

  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    cells.push({ date, dateKey: toDateKey(date) })
  }
  return cells
}

/**
 * Inline month-view calendar (Airbnb-style), scrollable across a fixed
 * window of months. Past dates are shown greyed out and are not
 * selectable. Controlled component: `selectedDateKey` is a 'YYYY-MM-DD'
 * string, `onSelect` receives the same format.
 */
export function CalendarStrip({ selectedDateKey, onSelect, monthsAhead = 3 }) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayKey = toDateKey(today)

  const months = useMemo(() => {
    const list = []
    for (let i = 0; i < monthsAhead; i++) {
      list.push(new Date(today.getFullYear(), today.getMonth() + i, 1))
    }
    return list
  }, [today, monthsAhead])

  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-control border border-hairline p-3">
      <div className="sticky top-0 grid grid-cols-7 gap-1 bg-card-surface pb-1 text-center text-xs font-medium tracking-wide text-ink-secondary uppercase">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      {months.map((monthDate) => {
        const cells = buildMonthCells(monthDate)
        return (
          <div key={monthDate.toISOString()} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">
              {monthLabelFormatter.format(monthDate)}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, i) => {
                if (!cell) return <span key={`blank-${i}`} />

                const isPast = cell.dateKey < todayKey
                const isSelected = cell.dateKey === selectedDateKey
                const isToday = cell.dateKey === todayKey

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    data-testid={`calendar-day-${cell.dateKey}`}
                    disabled={isPast}
                    onClick={() => onSelect(cell.dateKey)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-sm',
                      isPast && 'text-hairline line-through',
                      !isPast && !isSelected && 'text-ink hover:bg-press-state',
                      isSelected && 'bg-teal-field font-semibold text-white',
                      isToday && !isSelected && 'font-semibold text-teal-foreground',
                    )}
                  >
                    {cell.date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
