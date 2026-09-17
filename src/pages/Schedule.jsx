import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Calendar, Check, ChevronLeft, ChevronRight, List, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import PersonalEventDetail from './PersonalEventDetail'
import SwapStatusList from './SwapStatusList'
import PersonalEventPanel from '@/components/PersonalEventPanel'
import { PeriodTag, ShiftStatusTag } from '@/components/ui/period-tag'
import { Button } from '@/components/ui/button'
import { CalendarStrip } from '@/components/ui/calendar-strip'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SHIFT_LIST_BORDERLESS_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { inputClassName, labelClassName } from '@/components/ui/field'
import { SHIFT_PRESETS, buildShiftTimes } from '@/lib/shiftPresets'
import { cn } from '@/lib/utils'
import {
  MAX_SAVED_SHIFT_PRESETS,
  deleteShiftPreset,
  fetchSavedShiftPresets,
  parsePresetTime,
  saveShiftPreset,
} from '@/lib/savedShiftPresets'
import { fetchMyPersonalEvents, fetchWorkspacePersonalEvents } from '@/lib/personalEvents'
import {
  formatLocalDateKey,
  formatShiftDate,
  formatShiftTimeRange,
  getFourWeekDays,
  getFourWeekRange,
  getShiftPeriod,
  getSundayWeekStart,
  groupByDayKey,
} from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

const MAX_WEEKS_BACK = 8
const MAX_WEEKS_FORWARD = 8

function getWeekDaysForOffset(offset) {
  const start = getSundayWeekStart(new Date())
  start.setDate(start.getDate() + offset * 7)

  const days = []
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    days.push(date)
  }
  return days
}

// "My Shifts" / "Team Schedule" segmented control, rendered once by
// ScheduleTab's persistent header (not by MyShiftsTab or TeamScheduleTab
// themselves) so it survives switching between the two.
function ScheduleViewToggle({ value, onChange }) {
  return (
    <SegmentedControl
      ariaLabel="Schedule view"
      testidPrefix="schedule-view"
      value={value}
      onChange={onChange}
      options={[
        { id: 'mine', label: 'My Shifts' },
        { id: 'team', label: 'Team Schedule' },
      ]}
    />
  )
}

// Owns the persistent header (title, list/calendar toggle, My Shifts/Team
// Schedule segmented control) so switching sub-tabs never remounts or hides
// it — only MyShiftsTab/TeamScheduleTab's own body swaps and shows its own
// loading state below, per the same fix as the header's scroll-position gap.
function ScheduleTab({ user }) {
  const [view, setView] = useState('mine')
  const [contentView, setContentView] = useState('list')
  const [showSwapStatus, setShowSwapStatus] = useState(false)

  if (showSwapStatus) {
    return (
      <SwapStatusList
        user={user}
        onBack={() => setShowSwapStatus(false)}
        onGoToSchedule={() => setShowSwapStatus(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky header. Nothing is pinned above it any more: the shared top bar
          was removed on 2026-09-16 and its two controls now live on Home's
          greeting row. The header pins at top-0 z-10,
          leaving the list body as the only thing that scrolls. Its own opaque
          bg-page-ground is load-bearing: without it, rows scrolling underneath
          show through. */}
      <div
        data-testid="schedule-sticky-header"
        className="sticky top-0 z-10 -mx-5 flex flex-col gap-4 bg-page-ground px-5 pt-4 pb-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="font-display-title text-[26px] font-semibold tracking-[-0.02em] text-ink">Schedule</h1>
          <div className="flex items-center gap-2">
            {view === 'mine' && (
              <button
                type="button"
                onClick={() => setShowSwapStatus(true)}
                aria-label="Swap status"
                data-testid="schedule-swap-status-button"
                className="flex size-9 shrink-0 items-center justify-center rounded-control border border-hairline bg-card-surface text-ink-secondary"
              >
                <ArrowLeftRight size={16} strokeWidth={1.75} />
              </button>
            )}
            <div className="flex gap-1 rounded-[11px] bg-track-neutral p-[3px]">
              <button
                type="button"
                onClick={() => setContentView('list')}
                aria-label="List view"
                data-testid="schedule-content-view-list"
                aria-pressed={contentView === 'list'}
                className={cn(
                  'flex h-[26px] w-[30px] items-center justify-center rounded-[7px]',
                  contentView === 'list' ? 'bg-card-surface text-ink' : 'text-ink-secondary',
                )}
              >
                <List size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setContentView('calendar')}
                aria-label="Calendar view"
                data-testid="schedule-content-view-calendar"
                aria-pressed={contentView === 'calendar'}
                className={cn(
                  'flex h-[26px] w-[30px] items-center justify-center rounded-[7px]',
                  contentView === 'calendar' ? 'bg-card-surface text-ink' : 'text-ink-secondary',
                )}
              >
                <Calendar size={15} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        <ScheduleViewToggle value={view} onChange={setView} />
      </div>

      {view === 'mine' ? (
        <MyShiftsTab user={user} contentView={contentView} />
      ) : (
        <TeamScheduleTab user={user} onChangeView={setView} contentView={contentView} />
      )}
    </div>
  )
}

// Nurse-scope day-off row per ScheduleList.dc.html — full date-col/divider
// row layout like MyShiftRow (just muted "Day off" text, no tag), grouped
// into the same .shift-list container as the week's other rows.
function MyDayOffRow({ date }) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-4.5">
      <div className="flex w-[42px] shrink-0 flex-col items-center">
        <span className="text-[14px] font-semibold tracking-wide text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[25px] leading-tight font-semibold text-ink">{date.getDate()}</span>
      </div>
      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />
      <p className="text-[14px] font-medium text-ink-secondary">Day off</p>
    </div>
  )
}

// Nurse-scope shift row per ScheduleList.dc.html: date + divider + time/meta
// body + period tag, all inside one card (no external accent bar). Distinct
// from the shared ShiftCard used by ManageTab, which keeps its own look.
function MyShiftRow({ shift, credential, isPast, onClick }) {
  const period = getShiftPeriod(shift.starts_at)
  const isPending = shift.status === 'pending'
  const isOffered = shift.is_offered === true
  const date = new Date(shift.starts_at)
  const metaParts = [shift.unit, credential].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="schedule-my-shift-row"
      className={cn(
        'flex w-full items-center gap-3 px-4 py-4.5 text-left transition-colors duration-150 ease-out active:bg-press-state',
        isPast && 'opacity-35',
      )}
    >
      <div className="flex w-[42px] shrink-0 flex-col items-center">
        <span className="text-[14px] font-semibold tracking-wide text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[25px] leading-tight font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {metaParts.length > 0 && (
          <p className="truncate text-[12px] text-ink-secondary">{metaParts.join(' · ')}</p>
        )}
        {(isPending || isOffered) && (
          <div className="mt-1">
            {isPending ? <ShiftStatusTag status="pending" /> : <ShiftStatusTag status="offered" />}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <PeriodTag period={period} />
      </div>
    </button>
  )
}

// Personal event row — same row shape as MyShiftRow (grouped into the same
// .shift-list container, no border of its own) with a fixed "Personal" tag
// instead of the shift's own period, per ScheduleList.dc.html. Meta line is
// the event's unit if it has one, otherwise its free-text name. No dashed
// border — the colored Personal tag alone carries the distinction, per the
// standing Linear Light rule (dashed borders on personal items were tried
// and explicitly rejected).
function MyPersonalEventRow({ event, isPast, onClick }) {
  const date = new Date(event.starts_at)
  const meta = event.unit || event.name

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="schedule-my-personal-event-row"
      className={cn(
        'flex w-full items-center gap-3 px-4 py-4.5 text-left transition-colors duration-150 ease-out active:bg-press-state',
        isPast && 'opacity-35',
      )}
    >
      <div className="flex w-[42px] shrink-0 flex-col items-center">
        <span className="text-[14px] font-semibold tracking-wide text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[25px] leading-tight font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>

      <div className="shrink-0">
        <PeriodTag period={getShiftPeriod(event.starts_at)} />
      </div>
    </button>
  )
}

// "SEP 7 - 13" per the design's section divider: the month the week starts in
// plus the Sunday-to-Saturday day range, naming both months when the week
// crosses a month boundary ("AUG 31 - SEP 6"). Replaced the old relative This
// Week / Next Week / Last Week labels and then the "AUG WEEK 4" week-number
// form, which did not say which dates the week covered.
function getWeekGroupLabel(weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startMonth = monthFormatter.format(weekStart).toUpperCase()
  const endMonth = monthFormatter.format(weekEnd).toUpperCase()
  const start = `${startMonth} ${weekStart.getDate()}`
  const end = endMonth === startMonth ? `${weekEnd.getDate()}` : `${endMonth} ${weekEnd.getDate()}`

  return `${start} - ${end}`
}

// Simpler shift row for the calendar's day-detail panel, per ScheduleCalendarMine.dc.html:
// no date column (the day-detail label above already carries the date).
function CalendarDayShiftRow({ shift, credential, onClick }) {
  const period = getShiftPeriod(shift.starts_at)
  const isPending = shift.status === 'pending'
  const isOffered = shift.is_offered === true
  const metaParts = [shift.unit, credential].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4.5 text-left transition-colors duration-150 ease-out active:bg-press-state"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {metaParts.length > 0 && (
          <p className="truncate text-[12px] text-ink-secondary">{metaParts.join(' · ')}</p>
        )}
        {(isPending || isOffered) && (
          <div className="mt-1">
            {isPending ? <ShiftStatusTag status="pending" /> : <ShiftStatusTag status="offered" />}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <PeriodTag period={period} />
      </div>
    </button>
  )
}

// Personal-event counterpart to CalendarDayShiftRow — same no-date-column
// shape, no dashed border (see MyPersonalEventRow), fixed "Personal" tag.
function CalendarDayPersonalEventRow({ event, onClick }) {
  const meta = event.unit || event.name

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4.5 text-left transition-colors duration-150 ease-out active:bg-press-state"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={getShiftPeriod(event.starts_at)} />
      </div>
    </button>
  )
}

// Team-scope day-detail row for TeamMonthCalendarView, like CalendarDayShiftRow
// but naming whose shift it is (the day-detail label above carries the date, not
// who's on it, since Team Schedule spans every nurse). Open-shift rows are
// tappable and open the Shift Detail screen, where a nurse can claim; other rows
// stay plain.
function TeamCalendarDayShiftRow({ shift, onOpenShift }) {
  const period = getShiftPeriod(shift.starts_at)
  const isOpen = shift.status === 'open'
  const isPending = shift.status === 'pending'
  const displayName = isPending ? (shift.claimant?.full_name ?? 'Pending claim') : shift.profiles?.full_name
  const displayCredential = isPending ? shift.claimant?.credential : shift.profiles?.credential
  const metaParts = isOpen
    ? ['Open · tap to claim', shift.unit].filter(Boolean)
    : [displayName, displayCredential, shift.unit].filter(Boolean)

  const content = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {metaParts.length > 0 && <p className="truncate text-[12px] text-ink-secondary">{metaParts.join(' · ')}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={period} />
      </div>
      {isOpen && <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" aria-hidden="true" />}
    </>
  )

  if (isOpen && onOpenShift) {
    return (
      <button
        type="button"
        onClick={() => onOpenShift(shift)}
        className="flex w-full items-center gap-3 px-4 py-4.5 text-left"
      >
        {content}
      </button>
    )
  }

  return <div className="flex w-full items-center gap-3 px-4 py-4.5">{content}</div>
}

// Team-scope counterpart to TeamCalendarDayShiftRow for personal events —
// names whose event it is, since Team Schedule spans every nurse. No dashed
// border (see MyPersonalEventRow).
function TeamCalendarDayPersonalEventRow({ event }) {
  const ownerName = event.profiles?.full_name ?? 'A teammate'
  const meta = [ownerName, event.unit].filter(Boolean).join(' · ')

  return (
    <div className="flex w-full items-center gap-3 px-4 py-4.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={getShiftPeriod(event.starts_at)} />
      </div>
    </div>
  )
}

// Team Schedule list-view shift row per ScheduleListTeamLinearLight.dc.html —
// flat one-row-per-shift (replaces the old per-time-slot grouped card with
// nested avatar rows, so every list in the app shares the same .shift-card
// shape). `isMatch` tints the row when this shift shares the viewer's own
// unit + start/end time that day (see TeamScheduleTab's isMatch check).
function TeamShiftRow({ shift, isMatch, onOpenShift }) {
  const period = getShiftPeriod(shift.starts_at)
  const isOpen = shift.status === 'open'
  const isPending = shift.status === 'pending'
  const displayName = isPending ? (shift.claimant?.full_name ?? 'Pending claim') : shift.profiles?.full_name
  const displayCredential = isPending ? shift.claimant?.credential : shift.profiles?.credential
  const metaParts = isOpen
    ? ['Open', shift.unit, 'tap to claim'].filter(Boolean)
    : [displayName, displayCredential, shift.unit].filter(Boolean)

  const content = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {metaParts.length > 0 && <p className="truncate text-[12px] text-ink-secondary">{metaParts.join(' · ')}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={period} />
      </div>
      {isOpen && <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" aria-hidden="true" />}
    </>
  )

  if (isOpen && onOpenShift) {
    return (
      <button
        type="button"
        onClick={() => onOpenShift(shift)}
        className={cn('flex w-full items-center gap-3 px-4 py-4.5 text-left', isMatch && 'bg-[rgba(56,189,229,0.08)]')}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn('flex w-full items-center gap-3 px-4 py-4.5', isMatch && 'bg-[rgba(56,189,229,0.08)]')}>
      {content}
    </div>
  )
}

// Team Schedule list-view personal-event row — flat counterpart to
// TeamShiftRow, names whose event it is since Team Schedule spans every nurse.
function TeamPersonalEventRow({ event }) {
  const ownerName = event.profiles?.full_name ?? 'A teammate'
  const meta = [ownerName, event.unit].filter(Boolean).join(' · ')

  return (
    <div className="flex w-full items-center gap-3 px-4 py-4.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={getShiftPeriod(event.starts_at)} />
      </div>
    </div>
  )
}

// Inline note shown directly under a run of TeamShiftRow matches, per
// ScheduleListTeamLinearLight.dc.html's ".match-note".
function TeamMatchNote({ unit, startsAt, endsAt }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold text-teal-foreground">
      <Check size={12} strokeWidth={2} />
      Same {unit}, {formatShiftTimeRange(startsAt, endsAt)} shift as you
    </div>
  )
}

const CAL_WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const calMonthLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const dayDetailFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

// Sunday-first month grid, padded with leading/trailing blanks to full weeks —
// same shape as calendar-strip.jsx's buildMonthCells, kept separate since this
// one only needs the Date (no dateKey/inCurrentMonth bookkeeping).
function buildMonthGridDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstOfMonth.getDay()

  const cells = []
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// Per-period colored day-dots (ScheduleCalendarMine/ScheduleCalendarLinearLight)
// replacing the old flat gray count-dots — day/evening/night are filled,
// personal/open are rings. Capped at 3, first-seen order, since a day can
// only show 3 dots' worth of room in the grid cell.
const CAL_DOT_CLASSNAME = {
  day: 'bg-period-day-fg',
  evening: 'bg-period-evening-fg',
  night: 'bg-period-night-fg',
  personal: 'border border-period-personal-fg bg-transparent',
  open: 'border-[1.4px] border-teal bg-white',
}

function getDayDots(items) {
  const seen = []
  for (const item of items) {
    let dot
    if (item._kind === 'personal') {
      dot = 'personal'
    } else if (item.status === 'open') {
      dot = 'open'
    } else {
      dot = getShiftPeriod(item.starts_at).toLowerCase()
    }
    if (!seen.includes(dot)) seen.push(dot)
  }
  return seen.slice(0, 3)
}

// Month-grid calendar card (nav + weekday labels + day cells with shift-density
// dots) shared between MonthCalendarView (My Shifts) and TeamMonthCalendarView
// (Team Schedule) — the day-detail panel below it differs enough per surface
// (click-through behavior, whose shift each row is) that each keeps its own.
function MonthCalendarGrid({ calendarMonth, onChangeMonth, shiftsByDay, selectedDateKey, onSelectDate }) {
  const todayKey = formatLocalDateKey(new Date())
  const cells = buildMonthGridDays(calendarMonth)

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-ink">{calMonthLabelFormatter.format(calendarMonth)}</p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onChangeMonth(-1)}
            className="flex size-6 items-center justify-center rounded-control-sm border border-hairline text-ink-secondary"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onChangeMonth(1)}
            className="flex size-6 items-center justify-center rounded-control-sm border border-hairline text-ink-secondary"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {CAL_WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-center text-[11px] font-semibold tracking-wide text-ink-secondary uppercase"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} />

          const dateKey = formatLocalDateKey(date)
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDateKey
          const dots = getDayDots(shiftsByDay[dateKey] ?? [])

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              data-testid={`calendar-day-${dateKey}`}
              className={cn(
                'flex flex-col items-center gap-[3px] rounded-[10px] py-0.5',
                isSelected && 'bg-press-state',
              )}
            >
              <span
                className={cn(
                  'flex size-[26px] items-center justify-center rounded-full text-[13px] font-semibold',
                  isToday ? 'bg-teal-foreground text-white' : 'text-ink',
                )}
              >
                {date.getDate()}
              </span>
              <div className="flex h-1.5 items-center gap-0.5">
                {dots.map((dot) => (
                  <span key={dot} className={cn('size-[5px] rounded-full', CAL_DOT_CLASSNAME[dot])} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Month-grid Calendar view per ScheduleCalendarMine.dc.html — the signed-in
// nurse's own shifts. Shift-density dots only reflect whatever MyShiftsTab
// already fetched (+/-8 weeks from today) — a month navigated further out
// shows no dots even if shifts exist there, since this view doesn't do its
// own fetch.
function MonthCalendarView({
  calendarMonth,
  onChangeMonth,
  shiftsByDay,
  selectedDateKey,
  onSelectDate,
  selectedDayShifts,
  credential,
  onOpenShift,
  onOpenPersonalEvent,
}) {
  const selectedDate = new Date(`${selectedDateKey}T00:00:00`)

  return (
    <div className="flex flex-col gap-4">
      <MonthCalendarGrid
        calendarMonth={calendarMonth}
        onChangeMonth={onChangeMonth}
        shiftsByDay={shiftsByDay}
        selectedDateKey={selectedDateKey}
        onSelectDate={onSelectDate}
      />

      <div className="flex flex-col gap-2.5">
        <p className="text-[14px] font-bold text-ink">{dayDetailFormatter.format(selectedDate)}</p>
        {selectedDayShifts.length === 0 ? (
          <div className="rounded-card border border-hairline px-4 py-4 text-center text-[13px] text-ink-secondary">
            Day off
          </div>
        ) : (
          <ul className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
            {selectedDayShifts.map((item, index) => (
              <li key={item._kind === 'personal' ? `personal-${item.id}` : item.id}>
                {item._kind === 'personal' ? (
                  <CalendarDayPersonalEventRow event={item} onClick={() => onOpenPersonalEvent(item)} />
                ) : (
                  <CalendarDayShiftRow shift={item} credential={credential} onClick={() => onOpenShift(item)} />
                )}
                {index < selectedDayShifts.length - 1 && <ShiftListDivider inset={false} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Team-scope month-grid Calendar view per ScheduleCalendar.dc.html, same grid
// as MonthCalendarView, but the day-detail rows span every nurse on the unit
// (name + credential per row, "Open · tap to claim" for unassigned shifts)
// instead of just the signed-in nurse's own shifts. Open-shift rows are
// tappable and open the Shift Detail screen, where a nurse can claim; other
// rows stay plain.
function TeamMonthCalendarView({ calendarMonth, onChangeMonth, shiftsByDay, selectedDateKey, onSelectDate, selectedDayItems, onOpenShift }) {
  const selectedDate = new Date(`${selectedDateKey}T00:00:00`)

  return (
    <div className="flex flex-col gap-4">
      <MonthCalendarGrid
        calendarMonth={calendarMonth}
        onChangeMonth={onChangeMonth}
        shiftsByDay={shiftsByDay}
        selectedDateKey={selectedDateKey}
        onSelectDate={onSelectDate}
      />

      <div className="flex flex-col gap-2.5">
        <p className="text-[14px] font-bold text-ink">{dayDetailFormatter.format(selectedDate)}</p>
        {selectedDayItems.length === 0 ? (
          <div className="rounded-card border border-hairline px-4 py-4 text-center text-[13px] text-ink-secondary">
            No shifts
          </div>
        ) : (
          <ul className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
            {selectedDayItems.map((item, index) => (
              <li key={item._kind === 'personal' ? `personal-${item.id}` : item.id}>
                {item._kind === 'personal' ? (
                  <TeamCalendarDayPersonalEventRow event={item} />
                ) : (
                  <TeamCalendarDayShiftRow shift={item} onOpenShift={onOpenShift} />
                )}
                {index < selectedDayItems.length - 1 && <ShiftListDivider inset={false} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// contentView (list/calendar) is owned by ScheduleTab and passed down, not
// local state here — so the persistent header up there can drive it and the
// loading/error returns below only ever replace this tab's own body, never
// the header, when switching to/from Team Schedule.
function MyShiftsTab({ user, contentView }) {
  const [shifts, setShifts] = useState([])
  const [credential, setCredential] = useState(null)
  const [homeUnit, setHomeUnit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [personalEvents, setPersonalEvents] = useState([])
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState(null)
  const [editingPersonalEvent, setEditingPersonalEvent] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState(() => formatLocalDateKey(new Date()))

  const weekMarkerRefs = useRef({})
  const hasScrolledInitiallyRef = useRef(false)

  // Where each week's "SEP 7 - 13" label pins: directly under the pinned header,
  // so the user always sees the week the visible rows belong to. Sticky only
  // travels inside the week's own block, so when the next week arrives its label
  // takes the pinned spot and pushes this one up and out. The offset is that
  // header's measured height, never a hardcoded number, so it follows the header
  // if its contents change. The label sits at z-[5], below the header's z-10, so
  // the header is never covered.
  const [weekLabelTop, setWeekLabelTop] = useState(null)

  useEffect(() => {
    const pinnedHeader = document.querySelector('[data-testid="schedule-sticky-header"]')
    const pinnedHeight = pinnedHeader?.getBoundingClientRect().height ?? 0

    // No pinned stack in the DOM means no measured offset to pin against, so the
    // label stays in normal flow rather than parking at top 0 over the header.
    if (pinnedHeight > 0) setWeekLabelTop(pinnedHeight)
  }, [])

  useEffect(() => {
    let cancelled = false
    const currentSunday = getSundayWeekStart(new Date())
    const start = new Date(currentSunday)
    start.setDate(start.getDate() - MAX_WEEKS_BACK * 7)
    const end = new Date(currentSunday)
    end.setDate(end.getDate() + (MAX_WEEKS_FORWARD + 1) * 7)

    async function fetchMyShifts() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select('id, unit, starts_at, ends_at, status, is_offered')
        .eq('nurse_id', user.id)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setShifts([])
        setLoading(false)
        return
      }

      setShifts(data ?? [])
      setLoading(false)
    }

    fetchMyShifts()
    return () => { cancelled = true }
  }, [user.id, refreshKey])

  useEffect(() => {
    let cancelled = false
    const currentSunday = getSundayWeekStart(new Date())
    const start = new Date(currentSunday)
    start.setDate(start.getDate() - MAX_WEEKS_BACK * 7)
    const end = new Date(currentSunday)
    end.setDate(end.getDate() + (MAX_WEEKS_FORWARD + 1) * 7)

    async function fetchMyPersonalEventsForRange() {
      try {
        const data = await fetchMyPersonalEvents(user.id, { start, end })
        if (!cancelled) setPersonalEvents(data)
      } catch {
        if (!cancelled) setPersonalEvents([])
      }
    }

    fetchMyPersonalEventsForRange()
    return () => { cancelled = true }
  }, [user.id, refreshKey])

  useEffect(() => {
    let cancelled = false

    async function fetchCredential() {
      const { data } = await supabase
        .from('profiles')
        .select('credential, home_unit')
        .eq('id', user.id)
        .maybeSingle()

      if (!cancelled) {
        setCredential(data?.credential ?? null)
        setHomeUnit(data?.home_unit ?? null)
      }
    }

    fetchCredential()
    return () => { cancelled = true }
  }, [user.id])

  const combinedItems = [
    ...shifts.map((shift) => ({ ...shift, _kind: 'shift' })),
    ...personalEvents.map((event) => ({ ...event, _kind: 'personal' })),
  ]
  const combinedByDay = groupByDayKey(combinedItems, (item) => item.starts_at)

  const weekOffsets = []
  for (let offset = -MAX_WEEKS_BACK; offset <= MAX_WEEKS_FORWARD; offset += 1) {
    weekOffsets.push(offset)
  }

  // Land on today's week on first load, so the user opens Schedule already
  // looking at the current week instead of scrolled 8 weeks back. The Schedule
  // header is pinned, so the scroll target is pulled down by that header's
  // measured height: scrollIntoView({ block: 'start' }) on its own parks the
  // "SEP 7 - 13" label behind the pinned header. Measured, never hardcoded, so
  // the offset follows the header if its contents change.
  useEffect(() => {
    if (loading || hasScrolledInitiallyRef.current) return
    const target = weekMarkerRefs.current[0]
    if (!target) return
    hasScrolledInitiallyRef.current = true

    const scroller = target.closest('.app-content')
    if (!scroller) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    }

    // The pinned header sits above the target, so without this the week label
    // lands tucked behind it.
    const pinnedHeader = document.querySelector('[data-testid="schedule-sticky-header"]')
    const pinnedHeight = pinnedHeader?.getBoundingClientRect().height ?? 0
    const scrollerTop = scroller.getBoundingClientRect().top
    const targetTop = target.getBoundingClientRect().top - scrollerTop + scroller.scrollTop

    scroller.scrollTop = targetTop - pinnedHeight
  }, [loading])

  if (selectedShift) {
    return (
      <ShiftDetail
        shift={selectedShift}
        user={user}
        onBack={() => {
          setSelectedShift(null)
          setRefreshKey((current) => current + 1)
        }}
      />
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading shifts…</p>
  if (error) return <p className="text-sm text-red-700">Could not load shifts: {error}</p>

  const selectedDayShifts = combinedByDay[selectedCalendarDateKey] ?? []

  return (
    <>
      {contentView === 'calendar' ? (
        <MonthCalendarView
          calendarMonth={calendarMonth}
          onChangeMonth={(delta) => {
            setCalendarMonth((current) => {
              const next = new Date(current)
              next.setMonth(next.getMonth() + delta)
              return next
            })
          }}
          shiftsByDay={combinedByDay}
          selectedDateKey={selectedCalendarDateKey}
          onSelectDate={setSelectedCalendarDateKey}
          selectedDayShifts={selectedDayShifts}
          credential={credential}
          onOpenShift={setSelectedShift}
          onOpenPersonalEvent={setSelectedPersonalEvent}
        />
      ) : (
        <>
          {showAddPanel ? (
            <AddMyShiftPanel
              userId={user.id}
              homeUnit={homeUnit}
              onClose={() => setShowAddPanel(false)}
              onSaved={() => {
                setShowAddPanel(false)
                setRefreshKey((k) => k + 1)
              }}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddPanel(true)}
              data-testid="schedule-add-shift"
              className="w-full"
            >
              + Add a shift
            </Button>
          )}

          <div className="flex flex-col gap-5">
            {weekOffsets.map((offset) => {
              const days = getWeekDaysForOffset(offset)
              const hasAnyShift = days.some((date) => (combinedByDay[formatLocalDateKey(date)] ?? []).length > 0)
              if (!hasAnyShift && Math.abs(offset) > 1) return null

              // Flatten the week's days into one row list so the whole week
              // renders inside a single grouped .shift-list container (one
              // shadow/border, row dividers between) instead of each row
              // carrying its own card chrome.
              const rows = []
              days.forEach((date) => {
                const key = formatLocalDateKey(date)
                const dayItems = combinedByDay[key] ?? []

                if (dayItems.length === 0) {
                  rows.push({ key, node: <MyDayOffRow date={date} /> })
                  return
                }

                dayItems.forEach((item) => {
                  const isPast = new Date(item.ends_at).getTime() < Date.now()

                  if (item._kind === 'personal') {
                    rows.push({
                      key: `personal-${item.id}`,
                      node: (
                        <MyPersonalEventRow
                          event={item}
                          isPast={isPast}
                          onClick={() => setSelectedPersonalEvent(item)}
                        />
                      ),
                    })
                  } else {
                    rows.push({
                      key: item.id,
                      node: (
                        <MyShiftRow
                          shift={item}
                          credential={credential}
                          isPast={isPast}
                          onClick={() => setSelectedShift(item)}
                        />
                      ),
                    })
                  }
                })
              })

              return (
                <div
                  key={offset}
                  ref={(el) => { weekMarkerRefs.current[offset] = el }}
                  className="flex flex-col gap-2.5"
                >
                  {/* The opaque -mx-5/px-5 strip spans the full width the rows
                      occupy (it cancels the page container's px-5, same as the
                      sticky header above does) so nothing scrolling under the
                      pinned label shows through at the edges. The 20px gradient
                      below it carries the page ground down to transparent, so
                      the top of the card list dissolves into the page as it
                      slides up instead of being cut off at the label's edge.
                      It is absolutely placed so it adds no height to the list
                      and never intercepts a tap. */}
                  <div className="sticky z-[5] -mx-5 bg-page-ground px-5" style={{ top: weekLabelTop }}>
                    <div className="flex items-center gap-2.5">
                      <p className="text-[12px] font-medium tracking-wide text-ink-secondary uppercase">
                        {getWeekGroupLabel(days[0])}
                      </p>
                      <div className="h-px flex-1 bg-hairline" aria-hidden="true" />
                    </div>
                    <div
                      className="pointer-events-none absolute inset-x-0 top-full h-5 bg-gradient-to-b from-page-ground to-transparent"
                      aria-hidden="true"
                    />
                  </div>
                  <ul className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
                    {rows.map((row, index) => (
                      <li key={row.key}>
                        {row.node}
                        {index < rows.length - 1 && <ShiftListDivider variant="wide" />}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}

      {selectedPersonalEvent && (
        <PersonalEventDetail
          event={selectedPersonalEvent}
          user={user}
          onBack={() => setSelectedPersonalEvent(null)}
          onEdit={() => setEditingPersonalEvent(selectedPersonalEvent)}
          onDeleted={() => {
            setSelectedPersonalEvent(null)
            setEditingPersonalEvent(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      {editingPersonalEvent && (
        <PersonalEventPanel
          userId={user.id}
          event={editingPersonalEvent}
          onClose={() => setEditingPersonalEvent(null)}
          onSaved={() => {
            setEditingPersonalEvent(null)
            setSelectedPersonalEvent(null)
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
            setEditingPersonalEvent(null)
            setSelectedPersonalEvent(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </>
  )
}

// Two call sites: the nurse's ScheduleTab passes view/onChangeView (so the
// My Shifts / Team Schedule segmented control below the title can flip back)
// plus contentView (the persistent header up there owns the list/calendar
// toggle too, so switching sub-tabs never remounts the header — only this
// tab's body swaps and loads). The coordinator's dedicated "Team Schedule"
// nav tab renders this with no props at all — it has its own top tab bar for
// Team Schedule/Manage/Staff and no wrapping header to defer to, so this tab
// falls back to owning its own local list/calendar state and renders its own
// (unsegmented) header for that toggle.
function TeamScheduleTab({ user, onChangeView, contentView: contentViewProp }) {
  const [shifts, setShifts] = useState([])
  const [personalEvents, setPersonalEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [localContentView, setLocalContentView] = useState('list')
  const isNested = Boolean(onChangeView)
  const contentView = isNested ? contentViewProp : localContentView
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState(() => formatLocalDateKey(new Date()))
  const [selectedShift, setSelectedShift] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const { start, end } = getFourWeekRange()

    async function fetchTeamShifts() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select(`
          id, unit, starts_at, ends_at, status, nurse_id,
          profiles!nurse_id ( full_name, credential )
        `)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setShifts([])
      } else {
        setShifts(data ?? [])
      }

      setLoading(false)
    }

    fetchTeamShifts()
    return () => { cancelled = true }
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false
    const { start, end } = getFourWeekRange()

    async function fetchTeamPersonalEvents() {
      try {
        const data = await fetchWorkspacePersonalEvents({ start, end })
        // Team Schedule only shows personal events that carry a unit — a
        // name-only event (no department) stays My-Shifts-only, per the
        // personal-events visibility rule.
        if (!cancelled) setPersonalEvents(data.filter((event) => event.unit))
      } catch {
        if (!cancelled) setPersonalEvents([])
      }
    }

    fetchTeamPersonalEvents()
    return () => { cancelled = true }
  }, [refreshKey])

  const shiftsByDay = groupByDayKey(shifts, (shift) => shift.starts_at)
  const personalEventsByDay = groupByDayKey(personalEvents, (event) => event.starts_at)
  const days = getFourWeekDays()

  const combinedItems = [
    ...shifts.map((shift) => ({ ...shift, _kind: 'shift' })),
    ...personalEvents.map((event) => ({ ...event, _kind: 'personal' })),
  ]
  const combinedByDay = groupByDayKey(combinedItems, (item) => item.starts_at)
  const selectedDayItems = combinedByDay[selectedCalendarDateKey] ?? []

  if (loading) return <p className="text-sm text-[#6B7280]">Loading team schedule…</p>
  if (error) return <p className="text-sm text-red-700">Could not load team schedule: {error}</p>

  if (selectedShift) {
    return (
      <ShiftDetail
        shift={selectedShift}
        user={user}
        onBack={() => {
          setSelectedShift(null)
          setRefreshKey((current) => current + 1)
        }}
      />
    )
  }

  // Nested (nurse) case: the persistent header ScheduleTab already renders owns
  // the title, list/calendar toggle, and segmented control, so this is just the
  // body. Standalone (coordinator) case below renders its own header around it.
  const bodyContent = contentView === 'calendar' ? (
        <TeamMonthCalendarView
          calendarMonth={calendarMonth}
          onChangeMonth={(delta) => {
            setCalendarMonth((current) => {
              const next = new Date(current)
              next.setMonth(next.getMonth() + delta)
              return next
            })
          }}
          shiftsByDay={combinedByDay}
          selectedDateKey={selectedCalendarDateKey}
          onSelectDate={setSelectedCalendarDateKey}
          selectedDayItems={selectedDayItems}
          onOpenShift={setSelectedShift}
        />
      ) : (
      <ul className="flex flex-col gap-4">
      {days.map((day) => {
        const dayShifts = shiftsByDay[day.key] ?? []
        const dayPersonalEvents = personalEventsByDay[day.key] ?? []
        const dayHeaderLabel = `${weekdayFormatter.format(day.date)} ${day.date.getDate()} ${monthFormatter.format(day.date)}`

        if (dayShifts.length === 0 && dayPersonalEvents.length === 0) {
          return (
            <li key={day.key} className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold tracking-wide text-ink-secondary uppercase">{dayHeaderLabel}</p>
              <p className="px-1 text-[13px] text-ink-secondary">No shifts scheduled</p>
            </li>
          )
        }

        // A shift "matches" the viewer's own shift that day when it shares
        // the same unit and exact start/end time — highlighted per
        // ScheduleListTeamLinearLight.dc.html's teal .match tint + note.
        const myShift = dayShifts.find((shift) => shift.nurse_id === user?.id)
        const isMatch = (shift) =>
          Boolean(myShift) &&
          shift.id !== myShift.id &&
          shift.status !== 'open' &&
          shift.status !== 'pending' &&
          shift.unit === myShift.unit &&
          shift.starts_at === myShift.starts_at &&
          shift.ends_at === myShift.ends_at

        const dayItems = [
          ...dayPersonalEvents.map((event) => ({ ...event, _kind: 'personal' })),
          ...dayShifts.map((shift) => ({ ...shift, _kind: 'shift' })),
        ].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

        return (
          <li key={day.key}>
            <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-secondary uppercase">
              {dayHeaderLabel}
            </p>

            <ul className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
              {dayItems.map((item, index) => {
                const isLast = index === dayItems.length - 1
                const match = item._kind === 'shift' && isMatch(item)
                const next = dayItems[index + 1]
                const nextIsMatch = !isLast && next._kind === 'shift' && isMatch(next)
                const showNoteAfter = match && !nextIsMatch

                return (
                  <li key={item._kind === 'personal' ? `personal-${item.id}` : item.id}>
                    {item._kind === 'personal' ? (
                      <TeamPersonalEventRow event={item} />
                    ) : (
                      <TeamShiftRow shift={item} isMatch={match} onOpenShift={setSelectedShift} />
                    )}
                    {showNoteAfter && (
                      <TeamMatchNote unit={myShift.unit} startsAt={myShift.starts_at} endsAt={myShift.ends_at} />
                    )}
                    {!isLast && <ShiftListDivider inset={false} />}
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
      </ul>
      )

  if (isNested) return bodyContent

  return (
    <div className="flex flex-col gap-4">
      {/* Coordinator's own copy of the sticky header, same top-0 z-10 pin. No
          swap button and no segmented control here: a coordinator has a single
          schedule scope, so there is nothing to switch between and nothing to
          offer a swap against. */}
      <div
        data-testid="schedule-sticky-header"
        className="sticky top-0 z-10 -mx-5 flex flex-col gap-4 bg-page-ground px-5 pt-4 pb-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="font-display-title text-[26px] font-semibold tracking-[-0.02em] text-ink">Schedule</h1>
          <div className="flex gap-1 rounded-[11px] bg-track-neutral p-[3px]">
            <button
              type="button"
              onClick={() => setLocalContentView('list')}
              aria-label="List view"
              data-testid="schedule-content-view-list"
              aria-pressed={contentView === 'list'}
              className={cn(
                'flex h-[26px] w-[30px] items-center justify-center rounded-[7px]',
                contentView === 'list' ? 'bg-card-surface text-ink' : 'text-ink-secondary',
              )}
            >
              <List size={15} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setLocalContentView('calendar')}
              aria-label="Calendar view"
              data-testid="schedule-content-view-calendar"
              aria-pressed={contentView === 'calendar'}
              className={cn(
                'flex h-[26px] w-[30px] items-center justify-center rounded-[7px]',
                contentView === 'calendar' ? 'bg-card-surface text-ink' : 'text-ink-secondary',
              )}
            >
              <Calendar size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {bodyContent}
    </div>
  )
}

// Nurse self-scheduling panel — lets a nurse add her own shift directly
// to her schedule (goes live immediately, status 'scheduled', no
// coordinator approval since beta has none). Reuses the same
// CalendarStrip / SHIFT_PRESETS / saved-preset pieces as PostShift.jsx's
// coordinator form.
function AddMyShiftPanel({ userId, homeUnit, onClose, onSaved }) {
  const [date, setDate] = useState('')
  const [shiftType, setShiftType] = useState('day')
  const [customStart, setCustomStart] = useState({ hours: 7, minutes: 0 })
  const [customEnd, setCustomEnd] = useState({ hours: 15, minutes: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [savedPresets, setSavedPresets] = useState([])
  const [savedPresetsLoading, setSavedPresetsLoading] = useState(true)
  const [presetActionError, setPresetActionError] = useState(null)
  const [saveThisShift, setSaveThisShift] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const presets = await fetchSavedShiftPresets(userId)
        if (!cancelled) setSavedPresets(presets)
      } catch (err) {
        if (!cancelled) setPresetActionError(err.message)
      } finally {
        if (!cancelled) setSavedPresetsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  function resolveShiftTimes() {
    const preset = SHIFT_PRESETS.find((p) => p.key === shiftType)
    if (preset) return { start: preset.start, end: preset.end }

    if (shiftType.startsWith('saved:')) {
      const id = shiftType.slice('saved:'.length)
      const saved = savedPresets.find((p) => p.id === id)
      if (saved) {
        return { start: parsePresetTime(saved.start_time), end: parsePresetTime(saved.end_time) }
      }
    }

    return { start: customStart, end: customEnd }
  }

  async function handleSaveThisShift() {
    if (savedPresets.length >= MAX_SAVED_SHIFT_PRESETS) {
      setPresetActionError(`You can save up to ${MAX_SAVED_SHIFT_PRESETS} custom shifts. Delete one to save a new one.`)
      return
    }
    setPresetActionError(null)
    const { start, end } = resolveShiftTimes()
    try {
      const saved = await saveShiftPreset(userId, {
        startHours: start.hours,
        startMinutes: start.minutes,
        endHours: end.hours,
        endMinutes: end.minutes,
      })
      setSavedPresets((prev) => [...prev, saved])
      setShiftType(`saved:${saved.id}`)
      setSaveThisShift(false)
    } catch (err) {
      setPresetActionError(err.message)
    }
  }

  async function handleDeletePreset(presetId) {
    setPresetActionError(null)
    try {
      await deleteShiftPreset(presetId)
      setSavedPresets((prev) => prev.filter((p) => p.id !== presetId))
      if (shiftType === `saved:${presetId}`) setShiftType('day')
    } catch (err) {
      setPresetActionError(err.message)
    }
  }

  async function handleSubmit() {
    setError(null)
    if (!date) {
      setError('Please choose a date.')
      return
    }
    if (!homeUnit) {
      setError('Set your home unit in your profile before adding a shift.')
      return
    }

    setSaving(true)
    const { start, end } = resolveShiftTimes()
    const { starts_at, ends_at } = buildShiftTimes(date, start, end)

    const { error: insertError } = await supabase
      .from('shifts')
      .insert({ nurse_id: userId, unit: homeUnit, starts_at, ends_at, status: 'scheduled' })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      onSaved()
    }
  }

  // Fixed full-screen overlay, not inline in the page flow: MyShiftsTab
  // auto-scrolls to "today's week" on load, which can be many weeks past
  // the top of the page. An inline panel would render at the top of that
  // scrollable list and end up invisible above the fold. A fixed overlay
  // is always visible regardless of the page's scroll position.
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl border border-hairline bg-card-surface p-4 shadow-card-lift sm:rounded-card"
      >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Add a shift</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="text-ink-secondary hover:text-ink">
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Date</label>
        <CalendarStrip selectedDateKey={date} onSelect={setDate} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Shift</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SHIFT_PRESETS.map((preset) => {
            const Icon = preset.icon
            const isSelected = shiftType === preset.key
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setShiftType(preset.key)}
                className={cn(
                  'flex shrink-0 flex-col items-start gap-1 rounded-control px-3 py-2 text-left transition-colors duration-150 ease-out',
                  isSelected ? preset.selectedClassName : preset.className,
                )}
              >
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                  <Icon size={13} strokeWidth={2.5} />
                  {preset.label}
                </span>
                <span className="text-[11px] font-medium">{preset.time}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!savedPresetsLoading && savedPresets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Your saved shifts</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedPresets.map((preset) => {
              const isSelected = shiftType === `saved:${preset.id}`
              const { hours: sh, minutes: sm } = parsePresetTime(preset.start_time)
              const { hours: eh, minutes: em } = parsePresetTime(preset.end_time)
              const timeLabel = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')} – ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
              return (
                <span
                  key={preset.id}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                    isSelected
                      ? 'border-teal-foreground bg-teal-tint text-teal-foreground'
                      : 'border-hairline bg-card-surface text-ink',
                  )}
                >
                  <button type="button" onClick={() => setShiftType(`saved:${preset.id}`)}>
                    {preset.label || timeLabel}
                  </button>
                  <button type="button" onClick={() => handleDeletePreset(preset.id)} aria-label="Delete saved shift" className="opacity-60 hover:opacity-100">
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Custom time</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={`${String(customStart.hours).padStart(2, '0')}:${String(customStart.minutes).padStart(2, '0')}`}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number)
              setCustomStart({ hours, minutes })
              setShiftType('custom')
            }}
            className={inputClassName}
          />
          <span className="text-sm text-ink-secondary">to</span>
          <input
            type="time"
            value={`${String(customEnd.hours).padStart(2, '0')}:${String(customEnd.minutes).padStart(2, '0')}`}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number)
              setCustomEnd({ hours, minutes })
              setShiftType('custom')
            }}
            className={inputClassName}
          />
        </div>

        {shiftType === 'custom' && (
          <label className="flex items-center gap-2 pt-1 text-sm text-ink">
            <input
              type="checkbox"
              checked={saveThisShift}
              onChange={(e) => {
                setSaveThisShift(e.target.checked)
                if (e.target.checked) handleSaveThisShift()
              }}
              disabled={savedPresets.length >= MAX_SAVED_SHIFT_PRESETS}
              className="h-4 w-4 rounded border-hairline accent-teal-foreground"
            />
            Save this shift for next time
          </label>
        )}
        {presetActionError && <p className="text-xs text-red-700">{presetActionError}</p>}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save shift'}
      </Button>
      </div>
    </div>
  )
}

export default function Schedule({ user, role, initialTab = 'schedule' }) {
  const isCoordinator = role === 'coordinator'

  const tabs = isCoordinator
    ? [
        { id: 'team', label: 'Team Schedule' },
      ]
    : [
        { id: 'schedule', label: 'Schedule' },
      ]

  const [activeTab, setActiveTab] = useState(
    tabs.some((tab) => tab.id === initialTab) ? initialTab : tabs[0].id,
  )

  // Only re-check when role changes (e.g. resolves after Schedule mounts), not on every tab switch.
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [isCoordinator])

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-12">
      {tabs.length > 1 && (
        <div className="mb-6 flex border-b border-[#E5E5EA]" role="tablist" aria-label="Schedule views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-testid={`schedule-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 border-b-2 px-2 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[#1D1D1F] font-semibold text-[#1D1D1F]'
                  : 'border-transparent text-[#9CA3AF]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div role="tabpanel">
        {activeTab === 'schedule' && !isCoordinator && <ScheduleTab user={user} />}
        {activeTab === 'team' && isCoordinator && <TeamScheduleTab user={user} />}
      </div>
    </main>
  )
}
