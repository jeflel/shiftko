import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Calendar, Check, ChevronLeft, ChevronRight, List, Pencil, Sun, Sunset, Moon, X, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import SwapStatusList from './SwapStatusList'
import PersonalEventPanel from '@/components/PersonalEventPanel'
import { ShiftPeriodPill, StatusPill } from '@/components/ui/pill'
import { PeriodTag, ShiftStatusTag } from '@/components/ui/period-tag'
import { Button } from '@/components/ui/button'
import { CalendarStrip } from '@/components/ui/calendar-strip'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
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
  addLocalDays,
  diffInCalendarDays,
  formatLocalDateKey,
  formatShiftDate,
  formatShiftTimeRange,
  getFourWeekDays,
  getFourWeekRange,
  getShiftPeriod,
  getSundayWeekStart,
  getWeekRange,
  getWeekStart,
  groupByDayKey,
} from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

function formatTimeAgo(claimedAt) {
  const diffMins = Math.max(0, Math.round((Date.now() - new Date(claimedAt).getTime()) / 60000))
  if (diffMins < 60) return `${diffMins} mins ago`
  return `${Math.round(diffMins / 60)} hrs ago`
}

function formatWeekRangeLabel(weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

function ShiftTimeLabel({ startsAt, endsAt }) {
  const [startTime, endTime] = formatShiftTimeRange(startsAt, endsAt).split(' – ')
  const [startDigits, startMeridiem] = startTime.split(' ')
  const [endDigits, endMeridiem] = endTime.split(' ')

  return (
    <p className="truncate text-[18px] font-medium text-[#282828]">
      {startDigits}
      <span className="text-[13px] font-semibold text-[#5B5B5B]"> {startMeridiem}</span>
      <span className="text-[#A4A4A4]"> – </span>
      {endDigits}
      <span className="text-[13px] font-semibold text-[#5B5B5B]"> {endMeridiem}</span>
    </p>
  )
}

// The weekday/day-number column that sits to the left of, and outside, the shift
// card / day-off row. Fixed 30px wide, both lines centered within it, no gap between
// the weekday label and the day number.
function ShiftDateColumn({ date }) {
  return (
    <div className="flex w-[30px] shrink-0 flex-col items-center text-center">
      <span className="text-[12px] leading-tight font-medium text-[#2DA1C3]">
        {weekdayFormatter.format(date)}
      </span>
      <span className="text-[18px] leading-tight font-semibold text-[#282828]">
        {date.getDate()}
      </span>
    </div>
  )
}

function ShiftCard({ date, title, subtitle, pill, belowPill, trailing, onClick, isPast, accentColor = '#2DA1C3' }) {
  const isInteractive = typeof onClick === 'function'
  const Comp = isInteractive ? 'button' : 'div'

  return (
    <div className="flex items-center gap-5">
      <ShiftDateColumn date={date} />

      <Comp
        type={isInteractive ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'flex h-[78px] w-full min-w-0 flex-1 items-center gap-2.5 rounded-[20px] border border-[#DDE5E8] bg-white pr-4 pl-4 shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)] transition-opacity',
          isInteractive && 'text-left active:shadow-none',
          isPast && 'opacity-45',
        )}
      >
        <span
          className="h-[46px] w-1 shrink-0 self-center rounded-full"
          style={{ background: accentColor }}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            {title}
            {pill}
          </div>
          {subtitle}
          {belowPill && <div className="mt-2">{belowPill}</div>}
        </div>

        {trailing && <div className="ml-1 shrink-0">{trailing}</div>}
      </Comp>
    </div>
  )
}

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
      {/* -mt-[26px] cancels the parent <main>'s pt-[26px] and pt-[38px] puts that
          same 26px (plus the header's own 12px) back as the header's own padding.
          A sticky element pinned at container-top-0 loses whatever gap came from
          an ancestor's padding the instant you scroll past it, but never loses
          its own padding — baking the gap in here keeps it constant regardless
          of scroll position. */}
      <div className="sticky top-0 z-10 -mx-5 -mt-[26px] flex flex-col gap-4 border-b border-hairline bg-page-ground px-5 pt-[38px] pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Schedule</h1>
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
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      <div className="flex w-[34px] shrink-0 flex-col items-center">
        <span className="text-[11px] font-semibold tracking-wide text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[20px] leading-tight font-semibold text-ink">{date.getDate()}</span>
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
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out active:bg-press-state',
        isPast && 'opacity-45',
      )}
    >
      <div className="flex w-[34px] shrink-0 flex-col items-center">
        <span className="text-[11px] font-semibold tracking-wide text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[20px] leading-tight font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="min-w-0 flex-1">
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
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out active:bg-press-state',
        isPast && 'opacity-45',
      )}
    >
      <div className="flex w-[34px] shrink-0 flex-col items-center">
        <span className="text-[11px] font-semibold tracking-wide text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[20px] leading-tight font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>

      <div className="shrink-0">
        <PeriodTag period="Personal" />
      </div>
    </button>
  )
}

function getWeekGroupLabel(offset, weekStart) {
  if (offset === 0) return 'This Week'
  if (offset === 1) return 'Next Week'
  if (offset === -1) return 'Last Week'
  return `Week of ${monthFormatter.format(weekStart)} ${weekStart.getDate()}`
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
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out active:bg-press-state"
    >
      <div className="min-w-0 flex-1">
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
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out active:bg-press-state"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period="Personal" />
      </div>
    </button>
  )
}

// Team-scope day-detail row for TeamMonthCalendarView — like CalendarDayShiftRow
// but names whose shift it is (the day-detail label above carries the date, not
// who's on it, since Team Schedule spans every nurse). Non-clickable, matching
// the plain list view above.
function TeamCalendarDayShiftRow({ shift }) {
  const period = getShiftPeriod(shift.starts_at)
  const isOpen = shift.status === 'open'
  const isPending = shift.status === 'pending'
  const displayName = isPending ? (shift.claimant?.full_name ?? 'Pending claim') : shift.profiles?.full_name
  const displayCredential = isPending ? shift.claimant?.credential : shift.profiles?.credential
  const metaParts = isOpen
    ? ['Open · tap to claim', shift.unit].filter(Boolean)
    : [displayName, displayCredential, shift.unit].filter(Boolean)

  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {metaParts.length > 0 && <p className="truncate text-[12px] text-ink-secondary">{metaParts.join(' · ')}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={period} />
      </div>
      {isOpen && <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" aria-hidden="true" />}
    </div>
  )
}

// Team-scope counterpart to TeamCalendarDayShiftRow for personal events —
// names whose event it is, since Team Schedule spans every nurse. No dashed
// border (see MyPersonalEventRow).
function TeamCalendarDayPersonalEventRow({ event }) {
  const ownerName = event.profiles?.full_name ?? 'A teammate'
  const meta = [ownerName, event.unit].filter(Boolean).join(' · ')

  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period="Personal" />
      </div>
    </div>
  )
}

// Team Schedule list-view shift row per ScheduleListTeamLinearLight.dc.html —
// flat one-row-per-shift (replaces the old per-time-slot grouped card with
// nested avatar rows, so every list in the app shares the same .shift-card
// shape). `isMatch` tints the row when this shift shares the viewer's own
// unit + start/end time that day (see TeamScheduleTab's isMatch check).
function TeamShiftRow({ shift, isMatch }) {
  const period = getShiftPeriod(shift.starts_at)
  const isOpen = shift.status === 'open'
  const isPending = shift.status === 'pending'
  const displayName = isPending ? (shift.claimant?.full_name ?? 'Pending claim') : shift.profiles?.full_name
  const displayCredential = isPending ? shift.claimant?.credential : shift.profiles?.credential
  const metaParts = isOpen
    ? ['Open', shift.unit, 'tap to claim'].filter(Boolean)
    : [displayName, displayCredential, shift.unit].filter(Boolean)

  return (
    <div className={cn('flex w-full items-center gap-3 px-4 py-3.5', isMatch && 'bg-[rgba(56,189,229,0.08)]')}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        {metaParts.length > 0 && <p className="truncate text-[12px] text-ink-secondary">{metaParts.join(' · ')}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period={period} />
      </div>
      {isOpen && <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" aria-hidden="true" />}
    </div>
  )
}

// Team Schedule list-view personal-event row — flat counterpart to
// TeamShiftRow, names whose event it is since Team Schedule spans every nurse.
function TeamPersonalEventRow({ event }) {
  const ownerName = event.profiles?.full_name ?? 'A teammate'
  const meta = [ownerName, event.unit].filter(Boolean).join(' · ')

  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        {meta && <p className="truncate text-[12px] text-ink-secondary">{meta}</p>}
      </div>
      <div className="shrink-0">
        <PeriodTag period="Personal" />
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
          <ul className={SHIFT_LIST_CLASSNAME}>
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

// Team-scope month-grid Calendar view per ScheduleCalendar.dc.html — same grid
// as MonthCalendarView, but the day-detail rows span every nurse on the unit
// (name + credential per row, "Open · tap to claim" for unassigned shifts)
// instead of just the signed-in nurse's own shifts. Rows aren't clickable:
// Team Schedule has never linked out to ShiftDetail or a claim flow — open
// shifts are claimed from the Pool tab, same as the list view above.
function TeamMonthCalendarView({ calendarMonth, onChangeMonth, shiftsByDay, selectedDateKey, onSelectDate, selectedDayItems }) {
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
          <ul className={SHIFT_LIST_CLASSNAME}>
            {selectedDayItems.map((item, index) => (
              <li key={item._kind === 'personal' ? `personal-${item.id}` : item.id}>
                {item._kind === 'personal' ? (
                  <TeamCalendarDayPersonalEventRow event={item} />
                ) : (
                  <TeamCalendarDayShiftRow shift={item} />
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

  // Land on today's week on first load — the user opens Schedule already
  // looking at the current week, not scrolled 8 weeks back. Natural document
  // flow throughout (no fixed-height/overflow-hidden wrapper, no sticky
  // panel) per the Reskin Plan's carried-over responsive rule.
  useEffect(() => {
    if (loading || hasScrolledInitiallyRef.current) return
    const target = weekMarkerRefs.current[0]
    if (!target) return
    hasScrolledInitiallyRef.current = true
    target.scrollIntoView({ behavior: 'auto', block: 'start' })
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
                  <p className="text-[12px] font-semibold tracking-wide text-ink-secondary uppercase">
                    {getWeekGroupLabel(offset, days[0])}
                  </p>
                  <ul className={SHIFT_LIST_CLASSNAME}>
                    {rows.map((row, index) => (
                      <li key={row.key}>
                        {row.node}
                        {index < rows.length - 1 && <ShiftListDivider />}
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
        <PersonalEventPanel
          userId={user.id}
          event={selectedPersonalEvent}
          onClose={() => setSelectedPersonalEvent(null)}
          onSaved={() => {
            setSelectedPersonalEvent(null)
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
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
  }, [])

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
  }, [])

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

            <ul className={SHIFT_LIST_CLASSNAME}>
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
                      <TeamShiftRow shift={item} isMatch={match} />
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
      <div className="sticky top-0 z-10 -mx-5 flex flex-col gap-4 border-b border-hairline bg-page-ground px-5 pt-3 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Schedule</h1>
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

const inputClassName =
  'w-full rounded-control border border-hairline p-3 text-sm focus:border-ink focus:outline-none'
const labelClassName = 'text-xs font-medium tracking-wide text-ink-secondary uppercase'

// Standard Burlingame shift blocks (30-min overlap for handoff/report). Two-Color
// Rule: no per-period hue — unselected chips are neutral, selected uses the one
// accent teal (Selection Row pattern), same as the onboarding credential/unit pickers.
const SHIFT_PRESETS = [
  {
    key: 'day',
    label: 'Day',
    time: '7:00 AM – 3:30 PM',
    start: { hours: 7, minutes: 0 },
    end: { hours: 15, minutes: 30 },
    icon: Sun,
    className: 'border border-hairline bg-card-surface text-ink-secondary',
    selectedClassName: 'border border-teal-foreground bg-teal-tint text-teal-foreground',
  },
  {
    key: 'evening',
    label: 'Evening',
    time: '3:00 PM – 11:30 PM',
    start: { hours: 15, minutes: 0 },
    end: { hours: 23, minutes: 30 },
    icon: Sunset,
    className: 'border border-hairline bg-card-surface text-ink-secondary',
    selectedClassName: 'border border-teal-foreground bg-teal-tint text-teal-foreground',
  },
  {
    key: 'night',
    label: 'Night',
    time: '11:00 PM – 7:30 AM',
    start: { hours: 23, minutes: 0 },
    end: { hours: 7, minutes: 30 },
    icon: Moon,
    className: 'border border-hairline bg-card-surface text-ink-secondary',
    selectedClassName: 'border border-teal-foreground bg-teal-tint text-teal-foreground',
  },
]

// Builds ISO start/end timestamps for `date` (YYYY-MM-DD) given
// { hours, minutes } start/end pairs. Handles overnight shifts (e.g.
// Night: 11pm-7:30am) by rolling the end date forward one day.
// Module-level so both ManageTab (coordinator posting) and
// AddMyShiftPanel (nurse self-scheduling) share one implementation.
function buildShiftTimes(date, start, end) {
  const pad = (n) => String(n).padStart(2, '0')
  const starts_at = new Date(`${date}T${pad(start.hours)}:${pad(start.minutes)}:00`)
  const ends_at = new Date(`${date}T${pad(end.hours)}:${pad(end.minutes)}:00`)
  if (ends_at <= starts_at) ends_at.setDate(ends_at.getDate() + 1)
  return { starts_at: starts_at.toISOString(), ends_at: ends_at.toISOString() }
}

// Nurse self-scheduling panel — lets a nurse add her own shift directly
// to her schedule (goes live immediately, status 'scheduled', no
// coordinator approval since beta has none). Reuses the same
// CalendarStrip / SHIFT_PRESETS / saved-preset pieces as the
// coordinator's Post a Shift form in ManageTab.
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

function ManageTab() {
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nurse_id: '',
    unit: 'Unit 1',
    date: '',
    // One of: 'day' | 'evening' | 'night' | `saved:<preset id>` | 'custom'
    shift_type: 'day',
    customStart: { hours: 7, minutes: 0 },
    customEnd: { hours: 15, minutes: 0 },
    unassigned: false,
  })

  const [currentUserId, setCurrentUserId] = useState(null)
  const [savedPresets, setSavedPresets] = useState([])
  const [savedPresetsLoading, setSavedPresetsLoading] = useState(true)
  const [presetActionError, setPresetActionError] = useState(null)
  const [saveThisShift, setSaveThisShift] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadUserAndPresets() {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      if (cancelled) return
      setCurrentUserId(userId)

      if (!userId) {
        setSavedPresetsLoading(false)
        return
      }

      try {
        const presets = await fetchSavedShiftPresets(userId)
        if (!cancelled) setSavedPresets(presets)
      } catch (err) {
        if (!cancelled) setPresetActionError(err.message)
      } finally {
        if (!cancelled) setSavedPresetsLoading(false)
      }
    }

    loadUserAndPresets()
    return () => { cancelled = true }
  }, [])

  // Resolves the currently selected shift_type into a concrete
  // { start: {hours, minutes}, end: {hours, minutes} } pair, whether it's
  // a standard preset, a saved custom preset, or a one-off custom entry.
  function resolveShiftTimes() {
    const preset = SHIFT_PRESETS.find((p) => p.key === form.shift_type)
    if (preset) return { start: preset.start, end: preset.end }

    if (form.shift_type.startsWith('saved:')) {
      const id = form.shift_type.slice('saved:'.length)
      const saved = savedPresets.find((p) => p.id === id)
      if (saved) {
        return { start: parsePresetTime(saved.start_time), end: parsePresetTime(saved.end_time) }
      }
    }

    return { start: form.customStart, end: form.customEnd }
  }

  async function handleSaveThisShift() {
    if (!currentUserId) return
    if (savedPresets.length >= MAX_SAVED_SHIFT_PRESETS) {
      setPresetActionError(`You can save up to ${MAX_SAVED_SHIFT_PRESETS} custom shifts. Delete one to save a new one.`)
      return
    }

    setPresetActionError(null)
    const { start, end } = resolveShiftTimes()

    try {
      const saved = await saveShiftPreset(currentUserId, {
        startHours: start.hours,
        startMinutes: start.minutes,
        endHours: end.hours,
        endMinutes: end.minutes,
      })
      setSavedPresets((prev) => [...prev, saved])
      setForm((f) => ({ ...f, shift_type: `saved:${saved.id}` }))
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
      if (form.shift_type === `saved:${presetId}`) {
        setForm((f) => ({ ...f, shift_type: 'day' }))
      }
    } catch (err) {
      setPresetActionError(err.message)
    }
  }

  const [claimGroups, setClaimGroups] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actioningShiftId, setActioningShiftId] = useState(null)

  const [recentShifts, setRecentShifts] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState(null)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [recentActionMessage, setRecentActionMessage] = useState(null)

  const [openShiftAction, setOpenShiftAction] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [dupSourceDate, setDupSourceDate] = useState('')
  const [dupDestDate, setDupDestDate] = useState('')
  const [dupSourceShifts, setDupSourceShifts] = useState([])
  const [dupSourceLoading, setDupSourceLoading] = useState(false)
  const [dupChecking, setDupChecking] = useState(false)
  const [dupSaving, setDupSaving] = useState(false)
  const [dupError, setDupError] = useState(null)
  const [dupSuccess, setDupSuccess] = useState(null)
  const [dupConfirm, setDupConfirm] = useState(null)

  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState(null)
  const [savedStaffId, setSavedStaffId] = useState(null)
  const [savedStaffVisible, setSavedStaffVisible] = useState(false)

  useEffect(() => {
    async function fetchNurses() {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, credential')
        .eq('role', 'nurse')
        .order('full_name', { ascending: true })

      if (!fetchError) setNurses(data ?? [])
      setLoading(false)
    }
    fetchNurses()
  }, [])

  async function fetchPendingClaims() {
    setPendingLoading(true)
    setPendingError(null)

    const { data, error: fetchError } = await supabase
      .from('shift_claims')
      .select(`
        id, shift_id, nurse_id, claimed_at, status,
        profiles!nurse_id ( full_name, credential ),
        shifts!shift_id ( id, unit, starts_at, ends_at, status, is_offered, nurse_id )
      `)
      .eq('status', 'pending')
      .order('claimed_at', { ascending: false })

    if (fetchError) {
      setPendingError(fetchError.message)
      setClaimGroups([])
      setPendingLoading(false)
      return
    }

    const groups = new Map()
    for (const claim of data ?? []) {
      const shift = claim.shifts
      const isEligible =
        shift &&
        (shift.status === 'open' ||
          shift.status === 'pending' ||
          (shift.is_offered && shift.status === 'scheduled'))
      if (!isEligible) continue

      if (!groups.has(claim.shift_id)) {
        groups.set(claim.shift_id, { shift, claims: [] })
      }
      groups.get(claim.shift_id).claims.push(claim)
    }

    const groupList = Array.from(groups.values()).sort(
      (a, b) => new Date(a.shift.starts_at) - new Date(b.shift.starts_at),
    )

    setClaimGroups(groupList)
    setPendingLoading(false)
  }

  useEffect(() => {
    fetchPendingClaims()
  }, [])

  const [pendingSwaps, setPendingSwaps] = useState([])
  const [swapsLoading, setSwapsLoading] = useState(true)
  const [swapsError, setSwapsError] = useState(null)
  const [swapActionError, setSwapActionError] = useState(null)
  const [actioningSwapId, setActioningSwapId] = useState(null)

  async function fetchPendingSwaps() {
    setSwapsLoading(true)
    setSwapsError(null)

    const { data, error: fetchError } = await supabase
      .from('shift_swaps')
      .select(`
        id, status, created_at,
        requester_id, recipient_id, requester_shift_id, recipient_shift_id,
        requester:profiles!requester_id ( full_name, credential ),
        recipient:profiles!recipient_id ( full_name, credential ),
        requester_shift:shifts!requester_shift_id ( id, unit, starts_at, ends_at ),
        recipient_shift:shifts!recipient_shift_id ( id, unit, starts_at, ends_at )
      `)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setSwapsError(fetchError.message)
      setPendingSwaps([])
      setSwapsLoading(false)
      return
    }

    setPendingSwaps((data ?? []).filter((swap) => swap.requester_shift && swap.recipient_shift))
    setSwapsLoading(false)
  }

  useEffect(() => {
    fetchPendingSwaps()
  }, [])

  async function handleApproveSwap(swap) {
    setSwapActionError(null)
    setActioningSwapId(swap.id)

    const { error: giveError } = await supabase
      .from('shifts')
      .update({ nurse_id: swap.recipient_id })
      .eq('id', swap.requester_shift_id)

    if (giveError) {
      setActioningSwapId(null)
      setSwapActionError(giveError.message)
      return
    }

    const { error: getError } = await supabase
      .from('shifts')
      .update({ nurse_id: swap.requester_id })
      .eq('id', swap.recipient_shift_id)

    if (getError) {
      setActioningSwapId(null)
      setSwapActionError(getError.message)
      return
    }

    const { error: approveError } = await supabase
      .from('shift_swaps')
      .update({ status: 'approved', decided_at: new Date().toISOString() })
      .eq('id', swap.id)

    if (approveError) {
      setActioningSwapId(null)
      setSwapActionError(approveError.message)
      return
    }

    const { error: notifyError } = await supabase.from('notifications').insert([
      {
        user_id: swap.requester_id,
        type: 'swap_approved',
        message: `Your swap with ${swap.recipient?.full_name ?? 'your coworker'} was approved.`,
        shift_id: swap.recipient_shift_id,
      },
      {
        user_id: swap.recipient_id,
        type: 'swap_approved',
        message: `Your swap with ${swap.requester?.full_name ?? 'your coworker'} was approved.`,
        shift_id: swap.requester_shift_id,
      },
    ])

    setActioningSwapId(null)
    if (notifyError) setSwapActionError(notifyError.message)

    fetchPendingSwaps()
  }

  async function handleDenySwap(swap) {
    setSwapActionError(null)
    setActioningSwapId(swap.id)

    const { error: denyError } = await supabase
      .from('shift_swaps')
      .update({ status: 'denied', decided_at: new Date().toISOString() })
      .eq('id', swap.id)

    if (denyError) {
      setActioningSwapId(null)
      setSwapActionError(denyError.message)
      return
    }

    const { error: notifyError } = await supabase.from('notifications').insert([
      {
        user_id: swap.requester_id,
        type: 'swap_denied',
        message: 'Your coordinator did not approve this swap.',
        shift_id: swap.requester_shift_id,
      },
      {
        user_id: swap.recipient_id,
        type: 'swap_denied',
        message: 'Your coordinator did not approve this swap.',
        shift_id: swap.recipient_shift_id,
      },
    ])

    setActioningSwapId(null)
    if (notifyError) setSwapActionError(notifyError.message)

    fetchPendingSwaps()
  }

  async function fetchRecentShifts() {
    setRecentLoading(true)
    setRecentError(null)

    const { data, error: fetchError } = await supabase
      .from('shifts')
      .select('id, unit, starts_at, ends_at, status, nurse_id, profiles!nurse_id ( full_name )')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setRecentError(fetchError.message)
      setRecentShifts([])
    } else {
      setRecentShifts(data ?? [])
    }

    setRecentLoading(false)
  }

  useEffect(() => {
    fetchRecentShifts()
  }, [])

  function handleCloseShiftAction() {
    setOpenShiftAction(null)
    setEditForm(null)
    setEditError(null)
    setDeleteError(null)
  }

  function handleOpenEdit(shift) {
    setRecentActionMessage(null)
    setEditError(null)
    setEditForm({
      nurse_id: shift.nurse_id ?? '',
      unit: shift.unit,
      date: formatLocalDateKey(new Date(shift.starts_at)),
      shift_type: getShiftPeriod(shift.starts_at).toLowerCase(),
    })
    setOpenShiftAction({ type: 'edit', shiftId: shift.id })
  }

  function handleOpenDelete(shift) {
    setRecentActionMessage(null)
    setDeleteError(null)
    setOpenShiftAction({ type: 'delete', shiftId: shift.id })
  }

  async function handleSaveEdit(shiftId) {
    if (!editForm.nurse_id) {
      setEditError('Please select a nurse.')
      return
    }
    if (!editForm.date) {
      setEditError('Please choose a date.')
      return
    }

    setEditSaving(true)
    setEditError(null)

    const editPreset = SHIFT_PRESETS.find((p) => p.key === editForm.shift_type) ?? SHIFT_PRESETS[0]
    const { starts_at, ends_at } = buildShiftTimes(editForm.date, editPreset.start, editPreset.end)

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        nurse_id: editForm.nurse_id,
        unit: editForm.unit,
        starts_at,
        ends_at,
        status: 'scheduled',
      })
      .eq('id', shiftId)

    setEditSaving(false)

    if (updateError) {
      setEditError(updateError.message)
      return
    }

    handleCloseShiftAction()
    setRecentActionMessage('Shift updated.')
    fetchRecentShifts()
  }

  async function handleConfirmDelete(shiftId) {
    setDeleteSaving(true)
    setDeleteError(null)

    const { error: deleteErr } = await supabase.from('shifts').delete().eq('id', shiftId)

    setDeleteSaving(false)

    if (deleteErr) {
      setDeleteError(deleteErr.message)
      return
    }

    handleCloseShiftAction()
    setRecentActionMessage('Shift deleted.')
    fetchRecentShifts()
  }

  useEffect(() => {
    let cancelled = false

    if (!dupSourceDate) {
      setDupSourceShifts([])
      return
    }

    async function fetchSourceWeekShifts() {
      setDupSourceLoading(true)
      setDupError(null)

      const weekStart = getWeekStart(`${dupSourceDate}T00:00:00`)
      const { start, end } = getWeekRange(weekStart)

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select('id, nurse_id, unit, starts_at, ends_at')
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setDupError(fetchError.message)
        setDupSourceShifts([])
      } else {
        setDupSourceShifts(data ?? [])
      }

      setDupSourceLoading(false)
    }

    fetchSourceWeekShifts()
    return () => { cancelled = true }
  }, [dupSourceDate])

  async function handleSubmit() {
    setError(null)
    setSuccess(false)

    if (!form.date || (!form.unassigned && !form.nurse_id)) {
      setError('Please fill out all fields.')
      return
    }

    setSaving(true)
    const { start, end } = resolveShiftTimes()
    const { starts_at, ends_at } = buildShiftTimes(form.date, start, end)

    const payload = form.unassigned
      ? { unit: form.unit, starts_at, ends_at, status: 'open', nurse_id: null }
      : { nurse_id: form.nurse_id, unit: form.unit, starts_at, ends_at }

    const { error: insertError } = await supabase.from('shifts').insert(payload)

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(true)
      setSaveThisShift(false)
      setForm({
        nurse_id: '',
        unit: 'Unit 1',
        date: '',
        shift_type: 'day',
        customStart: { hours: 7, minutes: 0 },
        customEnd: { hours: 15, minutes: 0 },
        unassigned: false,
      })
      fetchRecentShifts()
    }
  }

  async function handleApprove(group, claim) {
    setActionError(null)
    setActioningShiftId(group.shift.id)

    const { error: shiftError } = await supabase
      .from('shifts')
      .update({ status: 'scheduled', nurse_id: claim.nurse_id, is_offered: false })
      .eq('id', group.shift.id)

    if (shiftError) {
      setActioningShiftId(null)
      setActionError(shiftError.message)
      return
    }

    const { error: approveError } = await supabase
      .from('shift_claims')
      .update({ status: 'approved' })
      .eq('id', claim.id)

    if (approveError) {
      setActioningShiftId(null)
      setActionError(approveError.message)
      return
    }

    const otherClaims = group.claims.filter((c) => c.id !== claim.id)

    if (otherClaims.length > 0) {
      const { error: denyOthersError } = await supabase
        .from('shift_claims')
        .update({
          status: 'denied',
          denial_message: 'Sorry, this shift has been filled by another team member.',
        })
        .in('id', otherClaims.map((c) => c.id))

      if (denyOthersError) {
        setActionError(denyOthersError.message)
      }
    }

    const shiftDetails = `${group.shift.unit} · ${formatShiftDate(group.shift.starts_at)} · ${formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)}`

    const wasOffered =
      group.shift.is_offered && group.shift.nurse_id && group.shift.nurse_id !== claim.nurse_id

    const notificationRows = [
      {
        user_id: claim.nurse_id,
        type: 'claim_approved',
        message: `Your claim for ${shiftDetails} was approved. You're on the schedule.`,
        shift_id: group.shift.id,
      },
      ...otherClaims.map((c) => ({
        user_id: c.nurse_id,
        type: 'claim_denied',
        message: 'Sorry, this shift has been filled by another team member.',
        shift_id: group.shift.id,
      })),
    ]

    if (wasOffered) {
      notificationRows.push({
        user_id: group.shift.nurse_id,
        type: 'offer_claimed',
        message: `Your ${formatShiftDate(group.shift.starts_at)} shift was picked up by ${claim.profiles?.full_name ?? 'another nurse'}.`,
        shift_id: group.shift.id,
      })
    }

    const { error: notifyError } = await supabase.from('notifications').insert(notificationRows)

    setActioningShiftId(null)

    if (notifyError) {
      setActionError(notifyError.message)
    }

    fetchPendingClaims()
  }

  async function handleDeny(group, claim) {
    setActionError(null)
    setActioningShiftId(group.shift.id)

    const { error: denyError } = await supabase
      .from('shift_claims')
      .update({
        status: 'denied',
        denial_message: 'Your claim was not approved. The shift is open again.',
      })
      .eq('id', claim.id)

    if (denyError) {
      setActioningShiftId(null)
      setActionError(denyError.message)
      return
    }

    const shiftDetails = `${group.shift.unit} · ${formatShiftDate(group.shift.starts_at)} · ${formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)}`

    const { error: notifyError } = await supabase.from('notifications').insert({
      user_id: claim.nurse_id,
      type: 'claim_denied',
      message: `Your claim for ${shiftDetails} was not approved. The shift is open again.`,
      shift_id: group.shift.id,
    })

    setActioningShiftId(null)

    if (notifyError) {
      setActionError(notifyError.message)
    }

    fetchPendingClaims()
  }

  async function handleReviewCopy() {
    setDupError(null)
    setDupSuccess(null)
    setDupConfirm(null)

    if (!dupSourceDate || !dupDestDate) {
      setDupError('Choose both a source week and a destination week.')
      return
    }

    if (dupSourceShifts.length === 0) {
      setDupError('No shifts in the selected week.')
      return
    }

    const sourceStart = getWeekStart(`${dupSourceDate}T00:00:00`)
    const destStart = getWeekStart(`${dupDestDate}T00:00:00`)

    setDupChecking(true)
    const { start: destRangeStart, end: destRangeEnd } = getWeekRange(destStart)
    const { data: destShifts, error: destError } = await supabase
      .from('shifts')
      .select('id')
      .gte('starts_at', destRangeStart.toISOString())
      .lt('starts_at', destRangeEnd.toISOString())
    setDupChecking(false)

    if (destError) {
      setDupError(destError.message)
      return
    }

    setDupConfirm({
      sourceStart,
      destStart,
      count: dupSourceShifts.length,
      destConflictCount: destShifts?.length ?? 0,
    })
  }

  async function handleConfirmCopy() {
    if (!dupConfirm) return

    setDupSaving(true)
    setDupError(null)

    const dayOffset = diffInCalendarDays(dupConfirm.sourceStart, dupConfirm.destStart)

    const rows = dupSourceShifts.map((shift) => ({
      nurse_id: shift.nurse_id,
      unit: shift.unit,
      starts_at: addLocalDays(shift.starts_at, dayOffset),
      ends_at: addLocalDays(shift.ends_at, dayOffset),
    }))

    const { error: insertError } = await supabase.from('shifts').insert(rows)

    setDupSaving(false)

    if (insertError) {
      setDupError(insertError.message)
      return
    }

    setDupSuccess(
      `Copied ${rows.length} shift${rows.length === 1 ? '' : 's'} to the week of ${formatWeekRangeLabel(dupConfirm.destStart)}.`,
    )
    setDupConfirm(null)
    setDupSourceDate('')
    setDupDestDate('')
    setDupSourceShifts([])
    fetchRecentShifts()
  }

  function handleCancelCopy() {
    setDupConfirm(null)
  }

  useEffect(() => {
    async function fetchStaff() {
      setStaffLoading(true)
      setStaffError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, credential, home_unit')
        .eq('role', 'nurse')
        .order('full_name', { ascending: true })

      if (fetchError) {
        setStaffError(fetchError.message)
        setStaff([])
      } else {
        setStaff(data ?? [])
      }

      setStaffLoading(false)
    }

    fetchStaff()
  }, [])

  async function handleHomeUnitChange(nurseId, homeUnit) {
    setStaff((current) =>
      current.map((n) => (n.id === nurseId ? { ...n, home_unit: homeUnit } : n)),
    )

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ home_unit: homeUnit })
      .eq('id', nurseId)

    if (updateError) {
      setStaffError(updateError.message)
      return
    }

    setSavedStaffId(nurseId)
    setSavedStaffVisible(true)
    setTimeout(() => setSavedStaffVisible(false), 1500)
    setTimeout(() => {
      setSavedStaffId((current) => (current === nurseId ? null : current))
    }, 2000)
  }

  if (loading) return <p className="text-sm text-[#6B7280]">Loading…</p>

  const visibleRecentShifts = showAllRecent ? recentShifts : recentShifts.slice(0, 3)

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-4 text-[20px] font-semibold text-[#1D1D1F]">Post a shift</h2>

        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">
            <input
              type="checkbox"
              checked={form.unassigned}
              onChange={(e) =>
                setForm({ ...form, unassigned: e.target.checked, nurse_id: '' })
              }
              data-testid="schedule-manage-unassigned-checkbox"
              className="h-4 w-4 rounded border-[#E5E5EA] accent-[#1D1D1F]"
            />
            Leave unassigned (open shift)
          </label>

          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Nurse</label>
            <select
              value={form.nurse_id}
              onChange={(e) => setForm({ ...form, nurse_id: e.target.value })}
              disabled={form.unassigned}
              className={cn(inputClassName, 'disabled:opacity-50')}
            >
              <option value="">Select a nurse</option>
              {nurses.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.full_name} {n.credential ? `(${n.credential})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className={inputClassName}
            >
              <option value="Unit 1">Unit 1</option>
              <option value="Unit 2">Unit 2</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Date</label>
            <CalendarStrip
              selectedDateKey={form.date}
              onSelect={(dateKey) => setForm({ ...form, date: dateKey })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Shift</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SHIFT_PRESETS.map((preset) => {
                const Icon = preset.icon
                const isSelected = form.shift_type === preset.key
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setForm({ ...form, shift_type: preset.key })}
                    data-testid={`schedule-manage-shift-preset-${preset.key}`}
                    className={cn(
                      'flex shrink-0 flex-col items-start gap-1 rounded-xl px-3 py-2 text-left',
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
                  const isSelected = form.shift_type === `saved:${preset.id}`
                  const { hours: sh, minutes: sm } = parsePresetTime(preset.start_time)
                  const { hours: eh, minutes: em } = parsePresetTime(preset.end_time)
                  const timeLabel = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')} – ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
                  return (
                    <span
                      key={preset.id}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                        isSelected
                          ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white'
                          : 'border-[#E5E5EA] bg-white text-[#1D1D1F]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, shift_type: `saved:${preset.id}` })}
                      >
                        {preset.label || timeLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        aria-label="Delete saved shift"
                        className="opacity-60 hover:opacity-100"
                      >
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
                value={`${String(form.customStart.hours).padStart(2, '0')}:${String(form.customStart.minutes).padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number)
                  setForm({ ...form, shift_type: 'custom', customStart: { hours, minutes } })
                }}
                className={inputClassName}
              />
              <span className="text-sm text-[#6B7280]">to</span>
              <input
                type="time"
                value={`${String(form.customEnd.hours).padStart(2, '0')}:${String(form.customEnd.minutes).padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number)
                  setForm({ ...form, shift_type: 'custom', customEnd: { hours, minutes } })
                }}
                className={inputClassName}
              />
            </div>

            {form.shift_type === 'custom' && currentUserId && (
              <label className="flex items-center gap-2 pt-1 text-sm text-[#1D1D1F]">
                <input
                  type="checkbox"
                  checked={saveThisShift}
                  onChange={(e) => {
                    setSaveThisShift(e.target.checked)
                    if (e.target.checked) handleSaveThisShift()
                  }}
                  disabled={savedPresets.length >= MAX_SAVED_SHIFT_PRESETS}
                  className="h-4 w-4 rounded border-[#E5E5EA] accent-[#1D1D1F]"
                />
                Save this shift for next time
              </label>
            )}
            {presetActionError && <p className="text-xs text-red-700">{presetActionError}</p>}
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-[#16A34A]">Shift posted successfully.</p>}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            data-testid="schedule-manage-post-shift"
            className="h-auto w-full rounded-full bg-[#1D1D1F] py-4 text-base font-semibold text-white hover:bg-[#1D1D1F]/90 disabled:opacity-60"
          >
            {saving ? 'Posting…' : 'Post shift'}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-semibold text-[#1D1D1F]">Recent shifts</h2>

        {recentActionMessage && (
          <p className="mb-3 text-sm text-[#16A34A]">{recentActionMessage}</p>
        )}

        {recentLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}
        {!recentLoading && recentError && (
          <p className="text-sm text-red-700">Could not load recent shifts: {recentError}</p>
        )}

        {!recentLoading && !recentError && (
          recentShifts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No shifts posted yet.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {visibleRecentShifts.map((shift) => (
                  <li key={shift.id}>
                    <ShiftCard
                      date={new Date(shift.starts_at)}
                      title={<ShiftTimeLabel startsAt={shift.starts_at} endsAt={shift.ends_at} />}
                      pill={<StatusPill status={shift.status} />}
                      subtitle={
                        <div className="mt-1">
                          <p className="truncate text-xs text-[#9CA3AF]">
                            {shift.profiles?.full_name ?? 'Open'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#9CA3AF]">{shift.unit}</p>
                        </div>
                      }
                      trailing={
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(shift)}
                            aria-label="Edit shift"
                            className="p-1 text-[#6B7280]"
                          >
                            <Pencil size={15} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(shift)}
                            aria-label="Delete shift"
                            className="p-1 text-[#EF4444]"
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      }
                    />

                    {openShiftAction?.type === 'edit' &&
                      openShiftAction.shiftId === shift.id &&
                      editForm && (
                        <div className="mt-2 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]">
                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Nurse</label>
                            <select
                              value={editForm.nurse_id}
                              onChange={(e) =>
                                setEditForm({ ...editForm, nurse_id: e.target.value })
                              }
                              className={inputClassName}
                            >
                              <option value="">Select a nurse</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.full_name} {n.credential ? `(${n.credential})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Unit</label>
                            <select
                              value={editForm.unit}
                              onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                              className={inputClassName}
                            >
                              <option value="Unit 1">Unit 1</option>
                              <option value="Unit 2">Unit 2</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Date</label>
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className={inputClassName}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Shift</label>
                            <select
                              value={editForm.shift_type}
                              onChange={(e) =>
                                setEditForm({ ...editForm, shift_type: e.target.value })
                              }
                              className={inputClassName}
                            >
                              <option value="day">Day (7am – 7pm)</option>
                              <option value="evening">Evening (3pm – 11pm)</option>
                              <option value="night">Night (11pm – 7am)</option>
                            </select>
                          </div>

                          {editError && <p className="text-sm text-red-700">{editError}</p>}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(shift.id)}
                              disabled={editSaving}
                              className="rounded-full bg-[#1D1D1F] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              {editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseShiftAction}
                              disabled={editSaving}
                              className="rounded-full border border-[#E5E5EA] px-4 py-2 text-sm font-medium text-[#1D1D1F] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                    {openShiftAction?.type === 'delete' && openShiftAction.shiftId === shift.id && (
                      <div className="mt-2 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]">
                        <p className="text-sm font-medium text-[#1D1D1F]">Delete this shift?</p>

                        {shift.status === 'pending' && (
                          <div className="flex items-start gap-1.5 text-sm text-[#D97706]">
                            <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
                            <p>This shift has a pending claim. Deleting it will remove the claim.</p>
                          </div>
                        )}

                        {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(shift.id)}
                            disabled={deleteSaving}
                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {deleteSaving ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCloseShiftAction}
                            disabled={deleteSaving}
                            className="rounded-full border border-[#E5E5EA] px-4 py-2 text-sm font-medium text-[#1D1D1F] disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {recentShifts.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((current) => !current)}
                  className="mt-3 text-sm text-[#6B7280] hover:underline"
                >
                  {showAllRecent ? 'Show less' : 'Show all'}
                </button>
              )}
            </>
          )
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-semibold text-[#1D1D1F]">Pending claims</h2>

        {pendingLoading && <p className="text-sm text-[#6B7280]">Loading pending claims…</p>}
        {pendingError && (
          <p className="text-sm text-red-700">Could not load pending claims: {pendingError}</p>
        )}
        {actionError && <p className="mb-3 text-sm text-red-700">{actionError}</p>}

        {!pendingLoading && !pendingError && claimGroups.length === 0 && (
          <p className="text-sm text-[#6B7280]">No pending claims.</p>
        )}

        {!pendingLoading && claimGroups.length > 0 && (
          <ul className="flex flex-col gap-3">
            {claimGroups.map((group) => {
              const period = getShiftPeriod(group.shift.starts_at)
              const isActioning = actioningShiftId === group.shift.id

              return (
                <li
                  key={group.shift.id}
                  className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#1D1D1F]">
                      {formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)}
                    </p>
                    <ShiftPeriodPill period={period} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="text-xs text-[#9CA3AF]">{group.shift.unit}</p>
                    <span className="h-3 border-l border-[#E5E5EA]" />
                    <p className="text-xs text-[#9CA3AF]">
                      {formatShiftDate(group.shift.starts_at)}
                    </p>
                  </div>

                  <div className="mt-3 border-b border-[#E5E5EA]" />

                  <ul className="flex flex-col">
                    {group.claims.map((claim, index) => (
                      <li
                        key={claim.id}
                        className="flex items-center gap-3 border-b border-[#E5E5EA] py-3 last:border-b-0"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F9F9FB] text-xs font-semibold text-[#6B7280]">
                          {getInitials(claim.profiles?.full_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {index === 0 && (
                              <span className="rounded-full bg-[#1D1D1F] px-2 py-0.5 text-xs text-white">
                                RECENT
                              </span>
                            )}
                            <p className="truncate text-sm font-medium text-[#1D1D1F]">
                              {claim.profiles?.full_name ?? 'Unknown'}
                            </p>
                            {claim.profiles?.credential && (
                              <>
                                <span className="h-3 border-l border-[#E5E5EA]" />
                                <p className="text-xs text-[#9CA3AF]">
                                  {claim.profiles.credential}
                                </p>
                              </>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#9CA3AF]">
                            {formatTimeAgo(claim.claimed_at)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(group, claim)}
                            disabled={isActioning}
                            data-testid="schedule-manage-approve-claim"
                            className="rounded-full bg-[#1D1D1F] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeny(group, claim)}
                            disabled={isActioning}
                            data-testid="schedule-manage-deny-claim"
                            className="rounded-full border border-[#E5E5EA] px-3 py-1 text-xs font-medium text-[#1D1D1F] disabled:opacity-60"
                          >
                            Deny
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-semibold text-[#1D1D1F]">Pending swaps</h2>

        {swapsLoading && <p className="text-sm text-[#6B7280]">Loading pending swaps…</p>}
        {swapsError && <p className="text-sm text-red-700">Could not load pending swaps: {swapsError}</p>}
        {swapActionError && <p className="mb-3 text-sm text-red-700">{swapActionError}</p>}

        {!swapsLoading && !swapsError && pendingSwaps.length === 0 && (
          <p className="text-sm text-[#6B7280]">No pending swaps.</p>
        )}

        {!swapsLoading && pendingSwaps.length > 0 && (
          <ul className="flex flex-col gap-3">
            {pendingSwaps.map((swap) => {
              const isActioning = actioningSwapId === swap.id

              return (
                <li key={swap.id} className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F9F9FB] text-xs font-semibold text-[#6B7280]">
                      {getInitials(swap.requester?.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1D1D1F]">
                        {swap.requester?.full_name ?? 'Unknown'} &harr; {swap.recipient?.full_name ?? 'Unknown'}
                      </p>
                      <p className="mt-0.5 text-xs text-[#9CA3AF]">Both nurses have accepted this swap</p>
                    </div>
                  </div>

                  <div className="mt-3 border-b border-[#E5E5EA]" />

                  <ul className="flex flex-col">
                    <li className="flex items-center justify-between gap-3 border-b border-[#E5E5EA] py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#9CA3AF]">{swap.requester?.full_name}&rsquo;s shift</p>
                        <p className="truncate text-sm font-medium text-[#1D1D1F]">
                          {formatShiftDate(swap.requester_shift.starts_at)} ·{' '}
                          {formatShiftTimeRange(swap.requester_shift.starts_at, swap.requester_shift.ends_at)}
                        </p>
                      </div>
                      <ShiftPeriodPill period={getShiftPeriod(swap.requester_shift.starts_at)} />
                    </li>
                    <li className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#9CA3AF]">{swap.recipient?.full_name}&rsquo;s shift</p>
                        <p className="truncate text-sm font-medium text-[#1D1D1F]">
                          {formatShiftDate(swap.recipient_shift.starts_at)} ·{' '}
                          {formatShiftTimeRange(swap.recipient_shift.starts_at, swap.recipient_shift.ends_at)}
                        </p>
                      </div>
                      <ShiftPeriodPill period={getShiftPeriod(swap.recipient_shift.starts_at)} />
                    </li>
                  </ul>

                  <div className="mt-3 flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveSwap(swap)}
                      disabled={isActioning}
                      data-testid="schedule-manage-approve-swap"
                      className="rounded-full bg-[#1D1D1F] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDenySwap(swap)}
                      disabled={isActioning}
                      data-testid="schedule-manage-deny-swap"
                      className="rounded-full border border-[#E5E5EA] px-3 py-1 text-xs font-medium text-[#1D1D1F] disabled:opacity-60"
                    >
                      Deny
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-semibold text-[#1D1D1F]">Duplicate a week</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Source week (any day in that week)</label>
            <input
              type="date"
              value={dupSourceDate}
              onChange={(e) => {
                setDupSourceDate(e.target.value)
                setDupConfirm(null)
                setDupSuccess(null)
              }}
              className={inputClassName}
            />
            {dupSourceDate && (
              <span className="text-xs text-[#9CA3AF]">
                Week of {formatWeekRangeLabel(getWeekStart(`${dupSourceDate}T00:00:00`))}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Destination week (any day in that week)</label>
            <input
              type="date"
              value={dupDestDate}
              onChange={(e) => {
                setDupDestDate(e.target.value)
                setDupConfirm(null)
                setDupSuccess(null)
              }}
              className={inputClassName}
            />
            {dupDestDate && (
              <span className="text-xs text-[#9CA3AF]">
                Week of {formatWeekRangeLabel(getWeekStart(`${dupDestDate}T00:00:00`))}
              </span>
            )}
          </div>

          {dupSourceDate && !dupSourceLoading && dupSourceShifts.length === 0 && (
            <p className="text-sm text-[#6B7280]">No shifts in the selected week.</p>
          )}

          {dupError && <p className="text-sm text-red-700">{dupError}</p>}
          {dupSuccess && <p className="text-sm text-[#16A34A]">{dupSuccess}</p>}

          {dupConfirm ? (
            <div className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]">
              <p className="text-sm text-[#1D1D1F]">
                Copy {dupConfirm.count} shift{dupConfirm.count === 1 ? '' : 's'} to the week of{' '}
                {formatWeekRangeLabel(dupConfirm.destStart)}?
              </p>
              {dupConfirm.destConflictCount > 0 && (
                <p className="mt-2 text-sm text-[#D97706]">
                  The destination week already has {dupConfirm.destConflictCount} shift
                  {dupConfirm.destConflictCount === 1 ? '' : 's'}. Copying may create duplicate
                  bookings.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  onClick={handleConfirmCopy}
                  disabled={dupSaving}
                  className="h-auto flex-1 rounded-full bg-[#1D1D1F] py-4 text-sm font-semibold text-white hover:bg-[#1D1D1F]/90 disabled:opacity-60"
                >
                  {dupSaving
                    ? 'Copying…'
                    : dupConfirm.destConflictCount > 0
                      ? 'Copy anyway'
                      : 'Confirm copy'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCopy}
                  disabled={dupSaving}
                  className="h-auto flex-1 rounded-full border-[#E5E5EA] py-4 text-sm font-semibold text-[#1D1D1F] shadow-none hover:bg-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleReviewCopy}
              disabled={
                !dupSourceDate ||
                !dupDestDate ||
                dupSourceLoading ||
                dupChecking ||
                dupSourceShifts.length === 0
              }
              className="h-auto w-full rounded-full bg-[#1D1D1F] py-4 text-base font-semibold text-white hover:bg-[#1D1D1F]/90 disabled:opacity-60"
            >
              {dupChecking ? 'Checking…' : 'Copy shifts'}
            </Button>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-1.5 text-[20px] font-semibold text-[#1D1D1F]">
          <Users size={16} strokeWidth={2.5} />
          Staff
        </h2>

        {staffLoading && <p className="text-sm text-[#6B7280]">Loading staff…</p>}
        {!staffLoading && staffError && (
          <p className="text-sm text-red-700">Could not load staff: {staffError}</p>
        )}

        {!staffLoading && !staffError && (
          staff.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No staff found.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {staff.map((nurse) => (
                <li
                  key={nurse.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-[#1D1D1F]">{nurse.full_name}</p>
                    {nurse.credential && (
                      <>
                        <span className="h-3 border-l border-[#E5E5EA]" />
                        <p className="text-xs text-[#9CA3AF]">{nurse.credential}</p>
                      </>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {savedStaffId === nurse.id && (
                      <span
                        className={cn(
                          'text-xs text-[#16A34A] transition-opacity duration-500',
                          savedStaffVisible ? 'opacity-100' : 'opacity-0',
                        )}
                      >
                        Saved
                      </span>
                    )}
                    <select
                      value={nurse.home_unit ?? ''}
                      onChange={(e) => handleHomeUnitChange(nurse.id, e.target.value)}
                      className="rounded-xl border border-[#E5E5EA] p-2 text-sm"
                    >
                      <option value="" disabled>
                        Select unit
                      </option>
                      <option value="Unit 1">Unit 1</option>
                      <option value="Unit 2">Unit 2</option>
                      <option value="Unit 3">Unit 3</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </div>
  )
}

function StaffTab() {
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weekStats, setWeekStats] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [savedFading, setSavedFading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchStaff() {
      setLoading(true)
      setError(null)

      const { data: nurseData, error: nurseError } = await supabase
        .from('profiles')
        .select('id, full_name, credential, home_unit, email')
        .eq('role', 'nurse')
        .order('full_name', { ascending: true })

      if (cancelled) return

      if (nurseError) {
        setError(nurseError.message)
        setNurses([])
        setLoading(false)
        return
      }

      const weekStart = getWeekStart(new Date())
      const { start, end } = getWeekRange(weekStart)

      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('nurse_id, starts_at, ends_at')
        .not('nurse_id', 'is', null)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())

      if (cancelled) return

      if (shiftError) {
        setError(shiftError.message)
        setNurses([])
        setLoading(false)
        return
      }

      const stats = {}
      for (const shift of shiftData ?? []) {
        const hours = (new Date(shift.ends_at) - new Date(shift.starts_at)) / 3600000
        if (!stats[shift.nurse_id]) stats[shift.nurse_id] = { count: 0, hours: 0 }
        stats[shift.nurse_id].count += 1
        stats[shift.nurse_id].hours += hours
      }

      setNurses(nurseData ?? [])
      setWeekStats(stats)
      setLoading(false)
    }

    fetchStaff()
    return () => { cancelled = true }
  }, [])

  function handleFieldChange(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  function handleToggleEdit(nurse) {
    setSaveError(null)
    setExpandedId((current) => {
      if (current === nurse.id) return null
      setEditForm({
        email: nurse.email ?? '',
        home_unit: nurse.home_unit ?? '',
        credential: nurse.credential ?? '',
      })
      return nurse.id
    })
  }

  function handleCancelEdit() {
    setExpandedId(null)
    setEditForm(null)
    setSaveError(null)
  }

  async function handleSave(nurse) {
    setSaving(true)
    setSaveError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email: editForm.email || null,
        home_unit: editForm.home_unit || null,
        credential: editForm.credential || null,
      })
      .eq('id', nurse.id)

    setSaving(false)

    if (updateError) {
      setSaveError(updateError.message)
      return
    }

    setNurses((current) => current.map((n) => (n.id === nurse.id ? { ...n, ...editForm } : n)))
    setSavedId(nurse.id)
    setSavedFading(false)
    setTimeout(() => setSavedFading(true), 1500)
    setTimeout(() => {
      setSavedId((current) => (current === nurse.id ? null : current))
      setSavedFading(false)
    }, 2000)
  }

  if (loading) return <p className="text-sm text-[#6B7280]">Loading staff…</p>
  if (error) return <p className="text-sm text-red-700">Could not load staff: {error}</p>

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-1.5 text-[20px] font-semibold text-[#1D1D1F]">
        <Users size={16} strokeWidth={2.5} />
        Staff
      </h2>

      {nurses.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No nurses found.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {nurses.map((nurse) => {
            const stats = weekStats[nurse.id] ?? { count: 0, hours: 0 }
            const roundedHours = Math.round(stats.hours * 10) / 10
            const isExpanded = expandedId === nurse.id

            return (
              <li key={nurse.id}>
                <div className="relative rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]">
                  <button
                    type="button"
                    onClick={() => handleToggleEdit(nurse)}
                    aria-label="Edit nurse"
                    className="absolute top-4 right-4 text-[#9CA3AF]"
                  >
                    <Pencil size={15} strokeWidth={2} />
                  </button>

                  <div className="flex items-center gap-3 pr-6">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F9F9FB] text-xs font-semibold text-[#6B7280]">
                      {getInitials(nurse.full_name)}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-[#1D1D1F]">
                        {nurse.full_name}
                      </p>
                      {nurse.credential && (
                        <>
                          <span className="h-3 border-l border-[#E5E5EA]" />
                          <p className="text-xs text-[#9CA3AF]">{nurse.credential}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-[#6B7280]">
                    {stats.count} shift{stats.count === 1 ? '' : 's'} · {roundedHours} hrs
                  </p>
                </div>

                {isExpanded && editForm && (
                  <div className="mt-2 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm border border-[#E5E5EA]">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClassName}>Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="w-full rounded-xl border border-[#E5E5EA] p-2 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClassName}>Home unit</label>
                      <select
                        value={editForm.home_unit}
                        onChange={(e) => handleFieldChange('home_unit', e.target.value)}
                        className="w-full rounded-xl border border-[#E5E5EA] p-2 text-sm"
                      >
                        <option value="">Select unit</option>
                        <option value="Unit 1">Unit 1</option>
                        <option value="Unit 2">Unit 2</option>
                        <option value="Unit 3">Unit 3</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClassName}>Credential</label>
                      <input
                        type="text"
                        value={editForm.credential}
                        onChange={(e) => handleFieldChange('credential', e.target.value)}
                        className="w-full rounded-xl border border-[#E5E5EA] p-2 text-sm"
                      />
                    </div>

                    {saveError && <p className="text-sm text-red-700">Could not save: {saveError}</p>}

                    {savedId === nurse.id && (
                      <span
                        className={cn(
                          'text-xs text-[#16A34A] transition-opacity duration-500',
                          savedFading ? 'opacity-0' : 'opacity-100',
                        )}
                      >
                        Saved
                      </span>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(nurse)}
                        disabled={saving}
                        className="rounded-full bg-[#1D1D1F] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="rounded-full border border-[#E5E5EA] px-4 py-2 text-sm font-medium text-[#1D1D1F] disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Schedule({ user, role, initialTab = 'schedule' }) {
  const isCoordinator = role === 'coordinator'

  const tabs = isCoordinator
    ? [
        { id: 'team', label: 'Team Schedule' },
        { id: 'manage', label: 'Manage' },
        { id: 'staff', label: 'Staff' },
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
    <main className="mx-auto w-full max-w-md px-5 pt-[26px] pb-12">
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
        {activeTab === 'manage' && isCoordinator && <ManageTab />}
        {activeTab === 'staff' && isCoordinator && <StaffTab />}
      </div>
    </main>
  )
}
