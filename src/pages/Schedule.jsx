import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Calendar, ChevronLeft, Pencil, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import { ShiftPeriodPill, StatusPill } from '@/components/ui/pill'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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

function groupByTimeSlot(dayShifts) {
  const groups = new Map()

  for (const shift of dayShifts) {
    const key = `${shift.starts_at}__${shift.ends_at}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(shift)
  }

  return Array.from(groups.values())
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

// My Shifts card, top line: hardcoded facility name (Shiftko is single-facility,
// Burlingame-only, per the pivot decision — there's no facility column in the
// shifts table) + a dot separator + the unit, e.g. "Burlingame SNF · UNIT 1".
function MyShiftFacilityLine({ unit }) {
  return (
    <div className="flex min-w-0 items-center gap-[7px]">
      <p className="truncate text-[14px] font-medium text-[#002D3A]">Burlingame SNF</p>
      <span className="size-[5px] shrink-0 rounded-full bg-[#8CA5AD]" aria-hidden="true" />
      <p className="shrink-0 text-[14px] font-medium text-[#2DA1C3] uppercase">{unit}</p>
    </div>
  )
}

// My Shifts card, second line: the shift's time range.
function MyShiftTimeLine({ startsAt, endsAt }) {
  return (
    <p className="truncate text-[17px] font-medium text-[#8CA5AD]">
      {formatShiftTimeRange(startsAt, endsAt)}
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
          'flex h-[78px] w-[312px] shrink-0 items-center gap-2.5 rounded-[20px] border border-[#DDE5E8] bg-white pr-4 pl-4 shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)] transition-opacity',
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

function DayOffRow({ date, text }) {
  return (
    <li className="flex items-center gap-5">
      <ShiftDateColumn date={date} />
      <div className="flex h-[78px] w-[312px] shrink-0 items-center gap-2.5 pl-4">
        <span className="h-[46px] w-1 shrink-0 self-center rounded-full bg-[#E9E9E9]" aria-hidden="true" />
        <p className="text-sm font-medium text-[#ADADAD]">{text}</p>
      </div>
    </li>
  )
}

const MAX_WEEKS_BACK = 8
const MAX_WEEKS_FORWARD = 8
const SWIPE_THRESHOLD_PX = 40

// No real shift data is wired into this header yet, so shift dots fall back to this
// deterministic weekday pattern (Wed/Thu/Sat/Sun) for every week until it is.
const DEFAULT_SHIFT_WEEKDAY_INDEXES = new Set([2, 3, 5, 6])

const weekdayLetterFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })

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

// Precise 5px-dash / 5px-gap rounded dashed border for the date-strip cells. Plain
// CSS `border-style: dashed` can't be told an exact dash/gap length on a rounded
// rect, so the border is drawn as a background SVG instead — sized to match the
// 44x61 cell and 15px corner radius exactly.
const DASHED_CELL_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='61' viewBox='0 0 44 61'%3E%3Crect x='0.5' y='0.5' width='43' height='60' rx='14.5' ry='14.5' fill='none' stroke='%23D7DFE2' stroke-width='1' stroke-dasharray='5 5'/%3E%3C/svg%3E\")"

const monthLongFormatter = new Intl.DateTimeFormat(undefined, { month: 'long' })

function WeekRow({ days, selectedKey, todayKey, onSelect, shiftDateKeys }) {
  return (
    <div className="flex w-full justify-center gap-2">
      {days.map((date) => {
        const dateKey = formatLocalDateKey(date)
        const isToday = dateKey === todayKey
        const isSelected = dateKey === selectedKey
        const isHighlighted = isSelected || isToday
        const mondayFirstIndex = (date.getDay() + 6) % 7
        const hasShift = shiftDateKeys
          ? shiftDateKeys.has(dateKey)
          : DEFAULT_SHIFT_WEEKDAY_INDEXES.has(mondayFirstIndex)
        const stateColor = isHighlighted ? '#2DA1C3' : '#A4A4A4'

        return (
          <button
            key={dateKey}
            type="button"
            onClick={() => onSelect(dateKey)}
            className="flex flex-col items-center"
          >
            <div
              className={cn(
                'flex h-[61px] w-11 flex-col items-center justify-center rounded-[15px] bg-white',
                isHighlighted && 'border border-[#2DA1C3]',
              )}
              style={isHighlighted ? undefined : { backgroundImage: DASHED_CELL_SVG }}
            >
              <span className="text-[11px] leading-none font-semibold" style={{ color: stateColor }}>
                {weekdayLetterFormatter.format(date)}
              </span>
              <span className="text-[18px] leading-none tracking-[-0.36px]" style={{ color: stateColor }}>
                {date.getDate()}
              </span>
              <span
                className={cn('mt-2 size-1 rounded-full', hasShift ? 'bg-[#2DA1C3]' : 'bg-transparent')}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// The week strip shown above My Shifts. It has no scroll state of its own — which
// week's days it displays is fully controlled by `activeOffset`, which the parent
// (MyShiftsTab) derives from which week is currently scrolled into view in the list
// below. Swiping or tapping a date here just asks the parent to scroll there; the
// strip updates once the parent confirms via the new activeOffset, keeping the two
// permanently in agreement.
function MyShiftsWeekStrip({ activeOffset, onSwipe, onSelectDate, shiftDateKeys, onOpenCalendarView }) {
  const pointerStartXRef = useRef(null)
  const todayKey = formatLocalDateKey(new Date())
  const days = getWeekDaysForOffset(activeOffset)

  function handlePointerDown(event) {
    pointerStartXRef.current = event.clientX
  }

  function handlePointerUp(event) {
    if (pointerStartXRef.current === null) return
    const deltaX = event.clientX - pointerStartXRef.current
    pointerStartXRef.current = null
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return

    const direction = deltaX < 0 ? 1 : -1
    const targetOffset = activeOffset + direction
    if (targetOffset < -MAX_WEEKS_BACK || targetOffset > MAX_WEEKS_FORWARD) return
    onSwipe(targetOffset)
  }

  return (
    <div onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      <div className="relative mb-4 flex items-center justify-center">
        <p className="font-display text-[30px] font-semibold text-[#282828]">
          {monthLongFormatter.format(days[3])}
        </p>
        <div className="absolute right-0">
          <CalendarIconButton onClick={onOpenCalendarView} />
        </div>
      </div>
      <WeekRow
        days={days}
        selectedKey={null}
        todayKey={todayKey}
        onSelect={onSelectDate}
        shiftDateKeys={shiftDateKeys}
      />
    </div>
  )
}

// Top-right glass icon button that opens the (placeholder, for now) Calendar View.
// The left-side "back" button seen in the Figma frame is intentionally not built here —
// Schedule is a bottom-nav root tab, not a pushed screen, so "back" has no natural
// destination on this page. It'll make sense once Calendar View itself needs a way
// back to Schedule.
function CalendarIconButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Calendar view"
      className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/70 shadow-[0_7px_25px_3px_rgba(39,60,66,0.10)] backdrop-blur-md"
    >
      <Calendar size={20} strokeWidth={2} className="text-[#282828]" />
    </button>
  )
}

// Full-screen stub — the real month-grid Calendar View is deliberately deferred.
// This exists so the new Calendar button has somewhere real to go instead of being dead.
function CalendarViewPlaceholder({ onBack }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-5">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-8 left-5 inline-flex items-center gap-1 text-sm font-medium text-[#6B7280]"
      >
        <ChevronLeft size={18} strokeWidth={2} />
        Back
      </button>
      <Calendar size={40} strokeWidth={1.5} className="mb-4 text-[#D7DFE2]" />
      <p className="text-lg font-semibold text-[#282828]">Calendar view</p>
      <p className="mt-1 text-sm text-[#9CA3AF]">Coming soon.</p>
    </div>
  )
}

function ScheduleViewToggle({ value, onChange }) {
  const options = [
    { id: 'mine', label: 'My Events' },
    { id: 'team', label: 'Team' },
  ]

  return (
    <div className="flex justify-center gap-2.5" role="tablist" aria-label="Schedule view">
      {options.map((option) => {
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex h-[34px] w-[172px] items-center justify-center rounded-[12px] px-4 text-[14px] font-medium whitespace-nowrap transition-colors',
              isActive ? 'bg-[#282828] text-white' : 'bg-[#F2F2F2] text-[#5B5B5B]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function ScheduleTab({ user }) {
  const [view, setView] = useState('mine')
  const [showCalendarView, setShowCalendarView] = useState(false)

  if (showCalendarView) {
    return <CalendarViewPlaceholder onBack={() => setShowCalendarView(false)} />
  }

  return view === 'mine' ? (
    <MyShiftsTab
      user={user}
      onOpenCalendarView={() => setShowCalendarView(true)}
      view={view}
      onChangeView={setView}
    />
  ) : (
    <TeamScheduleTab view={view} onChangeView={setView} />
  )
}

function MyShiftsTab({ user, onOpenCalendarView, view, onChangeView }) {
  const [shifts, setShifts] = useState([])
  const [credential, setCredential] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeWeekOffset, setActiveWeekOffset] = useState(0)

  const dayRefs = useRef({})
  const weekMarkerRefs = useRef({})
  const suppressObserverRef = useRef(false)
  const suppressTimeoutRef = useRef(null)
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

    async function fetchCredential() {
      const { data } = await supabase
        .from('profiles')
        .select('credential')
        .eq('id', user.id)
        .maybeSingle()

      if (!cancelled) setCredential(data?.credential ?? null)
    }

    fetchCredential()
    return () => { cancelled = true }
  }, [user.id])

  const shiftsByDay = groupByDayKey(shifts, (shift) => shift.starts_at)
  const shiftDateKeys = new Set(Object.keys(shiftsByDay))

  const weekOffsets = []
  for (let offset = -MAX_WEEKS_BACK; offset <= MAX_WEEKS_FORWARD; offset += 1) {
    weekOffsets.push(offset)
  }

  // Keeps the week strip in sync as the user scrolls the card list: whichever week's
  // marker is closest to the top of the viewport becomes the strip's active week.
  // Suppressed briefly during a programmatic scroll (tap/swipe) so it doesn't fight
  // the scroll it's causing.
  useEffect(() => {
    if (selectedShift || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserverRef.current) return
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const offset = Number(visible[0].target.dataset.weekOffset)
        setActiveWeekOffset(offset)
      },
      { root: null, rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    )

    Object.values(weekMarkerRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [selectedShift, loading, shifts])

  // Land on today's week on first load, instantly (no animation) — the user opens
  // My Shifts and is already looking at the current week, not scrolled 8 weeks back.
  // This intentionally scrolls past ScheduleTab's own header (My Shifts/Team toggle) —
  // that's the normal, expected pattern for a calendar-style view (Google Calendar,
  // Fantastical, etc. all open straight to "now"). The Calendar button lives inside
  // this sticky panel itself (not that header) specifically so it stays reachable
  // regardless of scroll position, rather than fighting this behavior.
  useEffect(() => {
    if (loading || hasScrolledInitiallyRef.current) return
    const target = weekMarkerRefs.current[0]
    if (!target) return
    hasScrolledInitiallyRef.current = true
    target.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [loading])

  function scrollToWeek(offset, dateKey) {
    const target = dateKey ? dayRefs.current[dateKey] : weekMarkerRefs.current[offset]
    if (!target) return

    suppressObserverRef.current = true
    setActiveWeekOffset(offset)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })

    window.clearTimeout(suppressTimeoutRef.current)
    suppressTimeoutRef.current = window.setTimeout(() => {
      suppressObserverRef.current = false
    }, 600)
  }

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

  if (loading) return <p className="text-sm text-[#6B7280]">Loading shifts…</p>
  if (error) return <p className="text-sm text-red-700">Could not load shifts: {error}</p>

  const isOnTodayWeek = activeWeekOffset === 0

  return (
    <div>
      <div className="sticky top-0 z-10">
        <div className="-mx-5 rounded-b-[25px] border border-white bg-white px-5 pt-2 pb-3 shadow-[0_7px_15px_0_rgba(53,87,97,0.05)]">
          <MyShiftsWeekStrip
            activeOffset={activeWeekOffset}
            onSwipe={(offset) => scrollToWeek(offset)}
            onSelectDate={(dateKey) => {
              const days = getWeekDaysForOffset(activeWeekOffset)
              const date = days.find((d) => formatLocalDateKey(d) === dateKey)
              if (!date) return
              const targetOffset = Math.round(
                diffInCalendarDays(getSundayWeekStart(new Date()), date) / 7,
              )
              scrollToWeek(targetOffset, dateKey)
            }}
            shiftDateKeys={shiftDateKeys}
            onOpenCalendarView={onOpenCalendarView}
          />

          <div className="mt-5">
            <ScheduleViewToggle value={view} onChange={onChangeView} />
          </div>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
            isOnTodayWeek ? 'grid-rows-[0fr] opacity-0' : 'mt-1 grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="flex justify-center overflow-hidden py-3">
            <button
              type="button"
              onClick={() => scrollToWeek(0)}
              className="rounded-full bg-white px-4 py-1.5 text-[14px] font-semibold text-[#282828] shadow-[0px_5px_14px_0px_rgba(40,40,40,0.15)]"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {weekOffsets.map((offset) => {
          const days = getWeekDaysForOffset(offset)

          return days.map((date, index) => {
            const key = formatLocalDateKey(date)
            const dayShifts = shiftsByDay[key] ?? []

            return (
              <li
                key={key}
                data-week-offset={offset}
                ref={(el) => {
                  dayRefs.current[key] = el
                  if (index === 0) weekMarkerRefs.current[offset] = el
                }}
              >
                {dayShifts.length === 0 ? (
                  <DayOffRow date={date} text="You have the day off." />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {dayShifts.map((shift) => {
                      const period = getShiftPeriod(shift.starts_at)
                      const isPending = shift.status === 'pending'
                      const isOffered = shift.is_offered === true
                      const isPast = new Date(shift.ends_at).getTime() < Date.now()

                      return (
                        <li key={shift.id}>
                          <ShiftCard
                            date={new Date(shift.starts_at)}
                            isPast={isPast}
                            title={<MyShiftFacilityLine unit={shift.unit} />}
                            pill={<ShiftPeriodPill period={period} />}
                            belowPill={
                              isPending ? (
                                <StatusPill status="pending" label="Pending" />
                              ) : isOffered ? (
                                <StatusPill status="open" label="Offered" />
                              ) : null
                            }
                            subtitle={
                              <div className="mt-1.5">
                                <MyShiftTimeLine startsAt={shift.starts_at} endsAt={shift.ends_at} />
                              </div>
                            }
                            onClick={() => setSelectedShift(shift)}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })
        })}
      </ul>
    </div>
  )
}

function TeamScheduleTab({ view, onChangeView }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const shiftsByDay = groupByDayKey(shifts, (shift) => shift.starts_at)
  const days = getFourWeekDays()

  if (loading) return <p className="text-sm text-[#6B7280]">Loading team schedule…</p>
  if (error) return <p className="text-sm text-red-700">Could not load team schedule: {error}</p>

  return (
    <div>
      <div className="mb-4">
        <ScheduleViewToggle value={view} onChange={onChangeView} />
      </div>

      <ul className="flex flex-col gap-4">
      {days.map((day) => {
        const dayShifts = shiftsByDay[day.key] ?? []

        if (dayShifts.length === 0) {
          return <DayOffRow key={day.key} date={day.date} text="No shifts" />
        }

        const timeSlots = groupByTimeSlot(dayShifts)
        const dayHeaderLabel = `${weekdayFormatter.format(day.date)} ${day.date.getDate()} ${monthFormatter.format(day.date)}`

        return (
          <li key={day.key}>
            <p className="mb-2 text-sm font-medium text-[#6B7280] uppercase">{dayHeaderLabel}</p>

            <div className="flex flex-col gap-3">
              {timeSlots.map((slotShifts) => {
                const [firstShift] = slotShifts
                const period = getShiftPeriod(firstShift.starts_at)
                const units = Array.from(new Set(slotShifts.map((shift) => shift.unit)))

                return (
                  <div
                    key={`${firstShift.starts_at}__${firstShift.ends_at}`}
                    className="rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#111111]">
                        {formatShiftTimeRange(firstShift.starts_at, firstShift.ends_at)}
                      </p>
                      <ShiftPeriodPill period={period} />
                    </div>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">{units.join(', ')}</p>

                    <div className="mt-3 border-b border-[#E8E6E3]" />

                    <ul className="flex flex-col">
                      {slotShifts.map((shift) => {
                        if (shift.status === 'open') {
                          return (
                            <li
                              key={shift.id}
                              className="flex items-center justify-between border-b border-[#E8E6E3] py-3 last:border-b-0"
                            >
                              <p className="text-sm text-[#9CA3AF]">Open shift</p>
                              <StatusPill status="open" />
                            </li>
                          )
                        }

                        const displayName =
                          shift.status === 'pending'
                            ? (shift.claimant?.full_name ?? 'Pending claim')
                            : shift.profiles?.full_name
                        const displayCredential =
                          shift.status === 'pending'
                            ? shift.claimant?.credential
                            : shift.profiles?.credential

                        return (
                          <li
                            key={shift.id}
                            className="flex items-center gap-3 border-b border-[#E8E6E3] py-3 last:border-b-0"
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8F7F5] text-xs font-semibold text-[#6B7280]">
                              {getInitials(displayName)}
                            </div>

                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <p className="truncate text-sm font-medium text-[#111111]">
                                {displayName}
                              </p>
                              {displayCredential && (
                                <>
                                  <span className="h-3 border-l border-[#E8E6E3]" />
                                  <p className="text-xs text-[#9CA3AF]">{displayCredential}</p>
                                </>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          </li>
        )
      })}
      </ul>
    </div>
  )
}

const inputClassName =
  'w-full rounded-xl border border-[#E8E6E3] p-3 text-sm focus:border-[#111111] focus:outline-none'
const labelClassName = 'text-xs font-medium tracking-wide text-[#6B7280] uppercase'

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
    shift_type: 'day',
    unassigned: false,
  })

  const SHIFT_HOURS = {
    day:     { start: 7,  end: 19 },
    evening: { start: 15, end: 23 },
    night:   { start: 23, end: 7  },
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

    const { starts_at, ends_at } = buildShiftTimes(editForm.date, editForm.shift_type)

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

  function buildShiftTimes(date, shift_type) {
    const { start, end } = SHIFT_HOURS[shift_type]
    const starts_at = new Date(`${date}T${String(start).padStart(2, '0')}:00:00`)
    const ends_at = new Date(`${date}T${String(end).padStart(2, '0')}:00:00`)
    if (ends_at <= starts_at) ends_at.setDate(ends_at.getDate() + 1)
    return { starts_at: starts_at.toISOString(), ends_at: ends_at.toISOString() }
  }

  async function handleSubmit() {
    setError(null)
    setSuccess(false)

    if (!form.date || (!form.unassigned && !form.nurse_id)) {
      setError('Please fill out all fields.')
      return
    }

    setSaving(true)
    const { starts_at, ends_at } = buildShiftTimes(form.date, form.shift_type)

    const payload = form.unassigned
      ? { unit: form.unit, starts_at, ends_at, status: 'open', nurse_id: null }
      : { nurse_id: form.nurse_id, unit: form.unit, starts_at, ends_at }

    const { error: insertError } = await supabase.from('shifts').insert(payload)

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(true)
      setForm({ nurse_id: '', unit: 'Unit 1', date: '', shift_type: 'day', unassigned: false })
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
        <h2 className="mb-4 text-[20px] font-semibold text-[#111111]">Post a shift</h2>

        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-[#111111]">
            <input
              type="checkbox"
              checked={form.unassigned}
              onChange={(e) =>
                setForm({ ...form, unassigned: e.target.checked, nurse_id: '' })
              }
              className="h-4 w-4 rounded border-[#E8E6E3] accent-[#111111]"
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
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClassName}>Shift</label>
            <select
              value={form.shift_type}
              onChange={(e) => setForm({ ...form, shift_type: e.target.value })}
              className={inputClassName}
            >
              <option value="day">Day (7am – 7pm)</option>
              <option value="evening">Evening (3pm – 11pm)</option>
              <option value="night">Night (11pm – 7am)</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-[#16A34A]">Shift posted successfully.</p>}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-auto w-full rounded-full bg-[#111111] py-4 text-base font-semibold text-white hover:bg-[#111111]/90 disabled:opacity-60"
          >
            {saving ? 'Posting…' : 'Post shift'}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-semibold text-[#111111]">Recent shifts</h2>

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
                        <div className="mt-2 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]">
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
                              className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              {editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseShiftAction}
                              disabled={editSaving}
                              className="rounded-full border border-[#E8E6E3] px-4 py-2 text-sm font-medium text-[#111111] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                    {openShiftAction?.type === 'delete' && openShiftAction.shiftId === shift.id && (
                      <div className="mt-2 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]">
                        <p className="text-sm font-medium text-[#111111]">Delete this shift?</p>

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
                            className="rounded-full border border-[#E8E6E3] px-4 py-2 text-sm font-medium text-[#111111] disabled:opacity-60"
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
        <h2 className="mb-4 text-[20px] font-semibold text-[#111111]">Pending claims</h2>

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
                  className="rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#111111]">
                      {formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)}
                    </p>
                    <ShiftPeriodPill period={period} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="text-xs text-[#9CA3AF]">{group.shift.unit}</p>
                    <span className="h-3 border-l border-[#E8E6E3]" />
                    <p className="text-xs text-[#9CA3AF]">
                      {formatShiftDate(group.shift.starts_at)}
                    </p>
                  </div>

                  <div className="mt-3 border-b border-[#E8E6E3]" />

                  <ul className="flex flex-col">
                    {group.claims.map((claim, index) => (
                      <li
                        key={claim.id}
                        className="flex items-center gap-3 border-b border-[#E8E6E3] py-3 last:border-b-0"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8F7F5] text-xs font-semibold text-[#6B7280]">
                          {getInitials(claim.profiles?.full_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {index === 0 && (
                              <span className="rounded-full bg-[#111111] px-2 py-0.5 text-xs text-white">
                                RECENT
                              </span>
                            )}
                            <p className="truncate text-sm font-medium text-[#111111]">
                              {claim.profiles?.full_name ?? 'Unknown'}
                            </p>
                            {claim.profiles?.credential && (
                              <>
                                <span className="h-3 border-l border-[#E8E6E3]" />
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
                            className="rounded-full bg-[#111111] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeny(group, claim)}
                            disabled={isActioning}
                            className="rounded-full border border-[#E8E6E3] px-3 py-1 text-xs font-medium text-[#111111] disabled:opacity-60"
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
        <h2 className="mb-4 text-[20px] font-semibold text-[#111111]">Duplicate a week</h2>

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
            <div className="rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]">
              <p className="text-sm text-[#111111]">
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
                  className="h-auto flex-1 rounded-full bg-[#111111] py-4 text-sm font-semibold text-white hover:bg-[#111111]/90 disabled:opacity-60"
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
                  className="h-auto flex-1 rounded-full border-[#E8E6E3] py-4 text-sm font-semibold text-[#111111] shadow-none hover:bg-white"
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
              className="h-auto w-full rounded-full bg-[#111111] py-4 text-base font-semibold text-white hover:bg-[#111111]/90 disabled:opacity-60"
            >
              {dupChecking ? 'Checking…' : 'Copy shifts'}
            </Button>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-1.5 text-[20px] font-semibold text-[#111111]">
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
                    <p className="truncate text-sm font-medium text-[#111111]">{nurse.full_name}</p>
                    {nurse.credential && (
                      <>
                        <span className="h-3 border-l border-[#E8E6E3]" />
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
                      className="rounded-xl border border-[#E8E6E3] p-2 text-sm"
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
      <h2 className="mb-4 flex items-center gap-1.5 text-[20px] font-semibold text-[#111111]">
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
                <div className="relative rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]">
                  <button
                    type="button"
                    onClick={() => handleToggleEdit(nurse)}
                    aria-label="Edit nurse"
                    className="absolute top-4 right-4 text-[#9CA3AF]"
                  >
                    <Pencil size={15} strokeWidth={2} />
                  </button>

                  <div className="flex items-center gap-3 pr-6">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8F7F5] text-xs font-semibold text-[#6B7280]">
                      {getInitials(nurse.full_name)}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-[#111111]">
                        {nurse.full_name}
                      </p>
                      {nurse.credential && (
                        <>
                          <span className="h-3 border-l border-[#E8E6E3]" />
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
                  <div className="mt-2 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm border border-[#E8E6E3]">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClassName}>Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="w-full rounded-xl border border-[#E8E6E3] p-2 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClassName}>Home unit</label>
                      <select
                        value={editForm.home_unit}
                        onChange={(e) => handleFieldChange('home_unit', e.target.value)}
                        className="w-full rounded-xl border border-[#E8E6E3] p-2 text-sm"
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
                        className="w-full rounded-xl border border-[#E8E6E3] p-2 text-sm"
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
                        className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="rounded-full border border-[#E8E6E3] px-4 py-2 text-sm font-medium text-[#111111] disabled:opacity-60"
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
        <div className="mb-6 flex border-b border-[#E8E6E3]" role="tablist" aria-label="Schedule views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 border-b-2 px-2 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[#111111] font-semibold text-[#111111]'
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
        {activeTab === 'team' && isCoordinator && <TeamScheduleTab />}
        {activeTab === 'manage' && isCoordinator && <ManageTab />}
        {activeTab === 'staff' && isCoordinator && <StaffTab />}
      </div>
    </main>
  )
}
