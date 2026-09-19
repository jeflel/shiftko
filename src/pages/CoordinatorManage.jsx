import { useEffect, useState } from 'react'
import { Building2, Calendar, CalendarRange, ChevronRight, Pencil, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PeriodTag } from '@/components/ui/period-tag'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'
import { cn } from '@/lib/utils'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

// Coordinator — Manage hub, per CoordinatorManageLinearLight.dc.html. This
// used to be Schedule.jsx's "Manage" tab (Post a Shift form inline, then
// Recent Shifts/Pending Claims/Pending Swaps/Duplicate a Week all stacked
// below it). Those pieces are now their own pushed screens (PostShift,
// CoordinatorApprovals, StaffRoster, DuplicateWeek); this hub ties them
// together per the mockup: a Post a Shift CTA, an Upcoming Shifts list, and
// a Tools nav list. Departments has no live backend (no table, no UI) and
// stays a disabled "Soon" row, per the rollout doc's carried-over open
// decision.
//
// "Recent shifts" (order('created_at', desc) - whatever was posted most
// recently) is renamed and requeried as "Upcoming Shifts" (order('starts_at',
// asc), filtered to today-or-later) to match the mockup's actual content -
// this is a query semantics change, not just a visual one. Kept the edit icon
// per row (matching the mockup); it opens the pushed ShiftEdit screen, where
// delete lives as "Remove Shift".
export default function CoordinatorManage({ onBack, onGoToPostShift, onGoToStaff, onGoToDuplicateWeek, onEditShift }) {
  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [upcomingError, setUpcomingError] = useState(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  async function fetchUpcomingShifts() {
    setUpcomingLoading(true)
    setUpcomingError(null)

    const { data, error: fetchError } = await supabase
      .from('shifts')
      .select('id, unit, starts_at, ends_at, status, nurse_id, notes, profiles!nurse_id ( full_name )')
      // Not yet finished rather than not yet started (2026-09-19): an overnight
      // shift that began at 23:00 is still upcoming at 00:30, and the old
      // predicate dropped it out of this list the moment the date rolled over.
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    if (fetchError) {
      setUpcomingError(fetchError.message)
      setUpcomingShifts([])
    } else {
      setUpcomingShifts(data ?? [])
    }

    setUpcomingLoading(false)
  }

  useEffect(() => {
    fetchUpcomingShifts()
  }, [])

  const visibleUpcoming = showAllUpcoming ? upcomingShifts : upcomingShifts.slice(0, 5)

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Manage" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5 pb-12">
        <Button
          type="button"
          onClick={onGoToPostShift}
          data-testid="manage-post-shift-cta"
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-card bg-teal-field text-[15px] font-semibold tracking-[-0.01em] text-white hover:bg-teal-field-hover"
        >
          Post a Shift
        </Button>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">Upcoming Shifts</p>

          {upcomingLoading && <p className="text-sm text-ink-secondary">Loading…</p>}
          {!upcomingLoading && upcomingError && (
            <p className="text-sm text-red-700">Could not load upcoming shifts: {upcomingError}</p>
          )}

          {!upcomingLoading && !upcomingError && upcomingShifts.length === 0 && (
            <EmptyState
              icon={CalendarRange}
              title="No upcoming shifts yet"
              subline="Shifts you post will show up here."
              size="section"
              tone="teal"
            />
          )}

          {!upcomingLoading && upcomingShifts.length > 0 && (
            <>
              <ul className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
                {visibleUpcoming.map((shift, index) => {
                  const date = new Date(shift.starts_at)
                  const period = getShiftPeriod(shift.starts_at)

                  return (
                    <li key={shift.id}>
                      <div className="flex w-full items-center gap-3 px-4 py-3.5">
                        <div className="ml-0.5 mr-0.5 flex w-8 shrink-0 flex-col items-center">
                          <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
                            {weekdayFormatter.format(date)}
                          </span>
                          <span className="text-[19px] leading-[1.15] font-semibold text-ink">{date.getDate()}</span>
                        </div>

                        <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <PeriodTag period={period} variant="bare" />
                          <p className="truncate text-[14px] font-semibold text-ink">
                            {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
                          </p>
                          <p className="truncate text-[12px] text-ink-secondary">
                            {shift.profiles?.full_name ?? 'Open'} &middot; {shift.unit}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditShift(shift)}
                            aria-label="Edit shift"
                            data-testid={`manage-edit-shift-${shift.id}`}
                            className="p-1 text-ink-secondary"
                          >
                            <Pencil size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {index < visibleUpcoming.length - 1 && <ShiftListDivider />}
                    </li>
                  )
                })}
              </ul>

              {upcomingShifts.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming((current) => !current)}
                  className="self-start text-sm font-semibold text-teal-foreground"
                >
                  {showAllUpcoming ? 'Show less' : 'Show all shifts'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">Tools</p>

          <div className="flex flex-col overflow-hidden rounded-card border border-hairline bg-card-surface shadow-card-lift">
            <button
              type="button"
              onClick={onGoToDuplicateWeek}
              className="flex w-full flex-row items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-press-state text-ink-secondary">
                <Calendar size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Duplicate a Week</p>
                <p className="truncate text-xs text-ink-secondary">Copy a week&rsquo;s schedule forward</p>
              </span>
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
            </button>
            <div className="ml-[62px] h-px bg-hairline" />

            <button
              type="button"
              onClick={onGoToStaff}
              className="flex w-full flex-row items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-press-state text-ink-secondary">
                <Users size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Staff</p>
                <p className="truncate text-xs text-ink-secondary">Manage nurse profiles</p>
              </span>
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
            </button>
            <div className="ml-[62px] h-px bg-hairline" />

            <div
              className={cn(
                'flex w-full flex-row items-center gap-3 px-4 py-3.5 text-left opacity-50',
              )}
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-press-state text-ink-secondary">
                <Building2 size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Departments</p>
                <p className="truncate text-xs text-ink-secondary">Create units, wards &amp; the float pool</p>
              </span>
              <span className="shrink-0 rounded-full bg-press-state px-2 py-[3px] text-[11px] font-semibold text-ink-secondary">
                Soon
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
