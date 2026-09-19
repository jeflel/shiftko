import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  CheckSquare,
  SquarePlus,
  CalendarDays,
  CalendarOff,
  MoonStar,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import PersonalEventDetail from './PersonalEventDetail'
import OfferShiftUpdate from './OfferShiftUpdate'
import Notifications from './Notifications'
import PersonalEventPanel from '@/components/PersonalEventPanel'
import { ActivationBanner } from '@/components/ui/activation-banner'
import { EmptyState } from '@/components/ui/empty-state'
import { dismissActivation, fetchActivation } from '@/lib/activation'
import { avatarPublicUrl } from '@/lib/avatar'
import { HomeBellControl, HomeProfileControl } from '@/components/ui/home-header-actions'
import { fetchMyPersonalEvents } from '@/lib/personalEvents'
import { Wordmark } from '@/components/ui/wordmark'
import { PeriodTag } from '@/components/ui/period-tag'
import { cn } from '@/lib/utils'
import {
  formatLocalDateKey,
  formatShiftDayShort,
  formatShiftTimeRange,
  getShiftPeriod,
  isInProgress,
  isOnDay,
  isWithinNextSevenDays,
} from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

// "Sep 7 - Sep 13": end is the exclusive day after the week, so the
// displayed range ends one day earlier.
function formatWeekRange(start, end) {
  const lastDay = new Date(end)
  lastDay.setDate(lastDay.getDate() - 1)
  return `${monthFormatter.format(start)} ${start.getDate()} – ${monthFormatter.format(lastDay)} ${lastDay.getDate()}`
}

function formatHM(totalMinutes) {
  const clamped = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${hours}h ${minutes}m`
}

// Monday-start week containing today, shifted by weekOffset weeks.
function getWeekBounds(weekOffset) {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = (day + 6) % 7
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() - diffToMonday + weekOffset * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

function notificationTitle(type) {
  if (type === 'offer_claimed') return 'Offer picked up'
  if (type === 'claim_approved') return 'Claim approved'
  if (type === 'claim_denied') return 'Claim not approved'
  if (type === 'swap_approved') return 'Swap approved'
  return 'Notification'
}

// Each notification is stored as one fixed sentence, e.g. "Your claim for
// Unit 1 · Friday, July 24, 2026 · 7:00 AM – 7:00 PM was not approved. The
// shift is open again." The outcome sits at the END of that sentence, so a
// single truncated line used to show which shift it was about while hiding
// what actually happened to it. The title now carries the outcome (from
// `type`); this pulls out the context the notification is about.
function notificationContext(message) {
  if (!message) return null
  const match =
    message.match(/^Your claim for (.+?) was (?:not )?approved/) ||
    message.match(/^Your swap with (.+?) was approved/)
  return match ? match[1] : null
}

// "Unit 1 · Friday, July 24, 2026 · 7:00 AM – 7:00 PM" does not fit on one
// line. The weekday is redundant at this size, so the date collapses to
// "Fri, Jul 24" and the whole thing fits without clipping.
function compactContext(context) {
  const parts = context.split(' · ')
  if (parts.length === 3) {
    const parsed = new Date(parts[1].replace(/^[A-Za-z]+,\s*/, ''))
    if (!Number.isNaN(parsed.getTime())) parts[1] = formatShiftDayShort(parsed)
  }
  return parts.join(' · ')
}

// Today hero card: the shift the nurse is on today, or "No shift today". Per
// DESIGN.md's Today Hero + Shift Progress spec (Main.dc.html), reskinned per
// MainHorizontalTiles.dc.html (home-linear-light): pulled up over the
// gradient hero, deep-teal time readout, colored period tag.
function TodayHero({ todaysShift, todaysEvent, credential }) {
  // A personal event fills the same card as a shift, so a nurse adding their
  // own events for beta gets the same layout rather than a second-class row.
  // A shift wins when both land on the same day.
  const item = todaysShift ?? todaysEvent
  const isEvent = !todaysShift && Boolean(todaysEvent)
  const period = item ? getShiftPeriod(item.starts_at) : null
  const titleLine = isEvent
    ? todaysEvent.unit || todaysEvent.name || ''
    : [todaysShift?.unit, credential].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-2.5 rounded-card bg-white p-4 shadow-card-lift">
      {/* The unit pill leads the top row and the period chip closes it
          (2026-09-18, Jefle): the day moved back up into the section header
          ("Today's Shift"), so the card opens with what the shift is rather than
          carrying a TODAY eyebrow that repeats the header 10px above it. The unit
          pill keeps its own class string, its 180px truncation cap and the 6px
          cluster gap it had; only the row's two ends changed.

          The whole row is skipped when there is no item (2026-09-19, Jefle). It
          is the shift's own chrome, and with no shift the title line degrades to
          the credential alone, so an empty card used to open with a stray "CNA"
          chip 16px from its left edge over nothing. */}
      {item && (
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-[6px]">
            {titleLine && (
              <span className="inline-flex max-w-[180px] items-center truncate rounded-[8px] bg-press-state px-2 py-[3px] text-[11px] font-semibold text-ink-secondary">
                {titleLine}
              </span>
            )}
          </div>
          {period && <PeriodTag period={period} />}
        </div>
      )}

      {item ? (
        <>
          <p className="text-[25px] font-semibold tracking-[-0.02em] text-status-deep">
            {formatShiftTimeRange(item.starts_at, item.ends_at)}
          </p>
          <ShiftProgress item={item} />
        </>
      ) : (
        /* Centred (2026-09-19, Jefle). The icon and its two lines sit as one
           group in the middle of the card instead of hugging its left edge, and
           the compact row form is kept so centring costs no height: the card is
           80px, against 112.5px while the stray credential chip row was above it.
           The group's own text stays left aligned inside itself. */
        <EmptyState
          icon={MoonStar}
          title="No shift today"
          subline="Enjoy the day off"
          layout="row"
          className="justify-center"
          tone="night"
        />
      )}
    </div>
  )
}

// Per the design, the shift's unit/credential moved up into the hero's top
// row; the progress row's right-hand column now shows the shift date.
function ShiftProgress({ item }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(tick)
  }, [])

  const start = new Date(item.starts_at).getTime()
  const end = new Date(item.ends_at).getTime()
  const clampedNow = Math.min(end, Math.max(start, now))
  const elapsedMinutes = (clampedNow - start) / 60000
  const remainingMinutes = (end - clampedNow) / 60000
  const percent = Math.round((elapsedMinutes / ((end - start) / 60000)) * 100)

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-track-neutral">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-[350ms] ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-ink-secondary">
          <Hourglass size={12} strokeWidth={2} className="shrink-0 text-teal-foreground" />
          <span className="font-semibold text-ink">{formatHM(elapsedMinutes)}</span> in ·{' '}
          {formatHM(remainingMinutes)} left
        </p>
        <p className="shrink-0 text-[13px] text-ink-secondary">
          {formatShiftDayShort(item.starts_at)}
        </p>
      </div>
    </div>
  )
}

// Section header with an optional "View All" link, shared by the Request
// Activity / Upcoming Shifts / Weekly Progress sections below.
function SectionHeader({ title, onViewAll, children }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[18px] font-semibold tracking-[-0.04em] text-[#3A4A4F]">{title}</span>
      {children ??
        (onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-teal-foreground"
          >
            View All
          </button>
        ))}
    </div>
  )
}

// Quick-action row: Add a Shift (opens the Personal Event panel) and Claim
// Shifts (net-new per the Reskin Plan, links to the Pool tab), as two
// icon-left horizontal tiles side by side. Per MainHorizontalTiles.dc.html
// (home-linear-light, shiftko-design-v2-visual-pass-dup): replaces the
// earlier full-width stacked ActionList.
function QuickActionTiles({ openCount, onGoToPool, onAddPersonalEvent }) {
  return (
    <div className="-mt-1 flex gap-2">
      <button
              type="button"
              onClick={onAddPersonalEvent}
              data-testid="home-quick-add-shift"
              className="relative flex h-16 flex-1 items-center overflow-hidden rounded-card bg-teal-field pr-3 pl-4 text-left shadow-[0_6px_16px_rgba(10,94,115,0.30)] transition-colors active:bg-teal-field-hover"
      >
        <span className="pointer-events-none absolute -right-2 -bottom-3.5 opacity-[0.12]" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="76" height="76" fill="#fff">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">Add a Shift</p>
          <p className="truncate text-[12px] text-white/75">Log a shift</p>
        </span>
      </button>

      <button
        type="button"
        onClick={onGoToPool}
        data-testid="home-claim-shifts-row"
        className="relative flex h-16 flex-1 items-center overflow-hidden rounded-card bg-teal-field pr-3 pl-4 text-left shadow-[0_6px_16px_rgba(10,94,115,0.30)] transition-colors active:bg-teal-field-hover"
      >
        {openCount > 0 && (
          <span className="absolute top-[9px] right-[9px] flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[7px] bg-white px-1.5 text-[11px] font-semibold text-status-deep">
            {openCount}
          </span>
        )}
        <span className="pointer-events-none absolute -right-2 -bottom-3.5 opacity-[0.12]" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="76" height="76" fill="#fff">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">Claim Shifts</p>
          <p className="truncate text-[12px] text-white/75">{openCount} open</p>
        </span>
      </button>
    </div>
  )
}

// Latest notification, shown as a single teal-tinted tile. Per
// MainHorizontalTiles.dc.html's "Request Activity" section (status-tile).
function RequestActivity({ notification, onOpen }) {
  const isNegative = notification.type === 'claim_denied'
  const NotifIcon = isNegative ? AlertTriangle : CheckCircle2
  const context = notificationContext(notification.message)
  const detail = context ? compactContext(context) : notification.message

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      data-testid="home-notification-row"
      className={cn(
        'flex items-center gap-2 rounded-card border border-[#5dc7e6] p-3 text-left shadow-card-lift transition-colors',
        isNegative ? 'bg-white active:bg-press-state' : 'bg-teal-tint active:bg-teal-tint/70',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
        <NotifIcon size={17} strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[13px] font-semibold text-ink">{notificationTitle(notification.type)}</p>
        <p className="truncate text-[11px] text-ink-secondary">{detail}</p>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 text-chevron-muted"
      />
    </button>
  )
}

function UpcomingShiftRow({ shift, isFirst, isLast, onSelectShift }) {
  const period = getShiftPeriod(shift.starts_at)
  const shiftDate = new Date(shift.starts_at)

  return (
    <button
      type="button"
      onClick={() => onSelectShift(shift)}
      data-testid="home-upcoming-shift-row"
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state',
        isFirst && 'rounded-t-card',
        isLast && 'rounded-b-card',
      )}
    >
      <div className="ml-0.5 mr-0.5 flex w-8 shrink-0 flex-col items-center text-center">
        <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
          {weekdayFormatter.format(shiftDate)}
        </span>
        <span className="text-[19px] leading-[1.15] font-semibold text-ink">
          {shiftDate.getDate()}
        </span>
      </div>

      <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PeriodTag period={period} variant="bare" />
        <p className="truncate text-[13px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        <p className="truncate text-xs text-ink-secondary">{shift.unit}</p>
      </div>

      <ChevronRight size={18} strokeWidth={2.25} className="shrink-0 text-chevron-muted" aria-hidden="true" />
    </button>
  )
}

function UpcomingPersonalEventRow({ event, isFirst, isLast, onSelectEvent }) {
  const eventDate = new Date(event.starts_at)

  return (
    <button
      type="button"
      onClick={() => onSelectEvent(event)}
      data-testid="home-upcoming-personal-event-row"
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state',
        isFirst && 'rounded-t-card',
        isLast && 'rounded-b-card',
      )}
    >
      <div className="ml-0.5 mr-0.5 flex w-8 shrink-0 flex-col items-center text-center">
        <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
          {weekdayFormatter.format(eventDate)}
        </span>
        <span className="text-[19px] leading-[1.15] font-semibold text-ink">
          {eventDate.getDate()}
        </span>
      </div>

      <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PeriodTag period={getShiftPeriod(event.starts_at)} variant="bare" />
        <p className="truncate text-[13px] font-semibold text-ink">
          {formatShiftTimeRange(event.starts_at, event.ends_at)}
        </p>
        <p className="truncate text-xs text-ink-secondary">{event.unit || event.name}</p>
      </div>

      <ChevronRight size={18} strokeWidth={2.25} className="shrink-0 text-chevron-muted" aria-hidden="true" />
    </button>
  )
}

function WeeklyProgress({ shifts, weekOffset, onChangeWeekOffset }) {
  const { start, end } = getWeekBounds(weekOffset)
  const weekShifts = shifts.filter((shift) => {
    const startsAt = new Date(shift.starts_at)
    return startsAt >= start && startsAt < end
  })
  const shiftCount = weekShifts.length
  const totalHours = Math.round(
    weekShifts.reduce(
      (sum, shift) => sum + (new Date(shift.ends_at) - new Date(shift.starts_at)) / 3600000,
      0,
    ),
  )
  const shiftsTarget = 7
  const hoursTarget = 40

  return (
    <section className="flex flex-col gap-2.5">
      <SectionHeader title="Weekly Progress" />

      <div className="flex flex-col gap-3 rounded-card bg-white px-4 pt-4 pb-3 shadow-card-lift">
        <div className="flex items-stretch">
          <div className="flex flex-1 flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.01em] text-ink-secondary">
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-control-sm bg-teal-tint text-teal-foreground">
                <Calendar size={13} strokeWidth={1.75} />
              </span>
              Shifts worked
            </span>
            <p className="text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {shiftCount}
              <span className="ml-1.5 text-[16px] font-medium text-ink-secondary">/{shiftsTarget}</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-track-neutral">
              <div
                className="h-full rounded-full bg-teal"
                style={{ width: `${Math.min(100, (shiftCount / shiftsTarget) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mx-5 my-px w-px shrink-0 bg-hairline" />

          <div className="flex flex-1 flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.01em] text-ink-secondary">
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-control-sm bg-stat-hours-tint text-stat-hours-fg">
                <Clock size={13} strokeWidth={1.75} />
              </span>
              Hours worked
            </span>
            <p className="text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {totalHours}
              <span className="ml-1.5 text-[16px] font-medium text-ink-secondary">/{hoursTarget}</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-track-neutral">
              <div
                className="h-full rounded-full bg-stat-hours-fg"
                style={{ width: `${Math.min(100, (totalHours / hoursTarget) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-hairline" />
        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => onChangeWeekOffset(weekOffset - 1)}
            aria-label="Previous week"
            className="flex size-6 shrink-0 items-center justify-center rounded-control-sm border border-hairline bg-white text-ink-secondary"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <span className="text-xs text-ink-secondary">{formatWeekRange(start, end)}</span>
          <button
            type="button"
            onClick={() => onChangeWeekOffset(weekOffset + 1)}
            aria-label="Next week"
            className="flex size-6 shrink-0 items-center justify-center rounded-control-sm border border-hairline bg-white text-ink-secondary"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// The header's second line (2026-09-17). One short sentence about today, because
// the greeting row is what the page gets read for first and the card below it is
// where the detail lives. Sized to the controls beside it: 12px on one line.
//
// The section header above the Today card (2026-09-17). It replaced the 12px
// sentence line that used to sit under the greeting: the same fact, promoted to
// a real section header, so it gets SectionHeader's 18px/600 and the 10px gap
// above the card that every other section already uses.
//
// "Today's Shift" since 2026-09-18 (Jefle, third wording of the day). The header
// owns the day again and the card no longer carries a TODAY eyebrow for it, so
// the two say it once between them: the header names the day, and the card opens
// with the unit pill and closes with the period chip, neither of which the header
// repeats.
//
// A personal event says event rather than shift: the app dropped the Personal
// tag from its rows, but the panel behind it is still Add Personal Event, so
// calling an event a shift here would be the only place that lies.
//
// The no-shift day says "Today" (2026-09-19, Jefle). It used to repeat the card's
// own "No shift today" word for word, 10px above it, which was the one wording the
// 2026-09-18 round left open. The header keeps owning the day and the card keeps
// owning the fact, so the two now say it once between them.
function getTodayHeader(item, isShift) {
  if (!item) return 'Today'
  return isShift ? "Today's Shift" : "Today's Event"
}

function getSummaryRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 8)
  return { start, end }
}


export default function Home({ user, role, onGoToManage, onGoToPostShift, onGoToApprovals, onGoToPool, onGoToSchedule, onOpenProfile }) {
  const [fullName, setFullName] = useState(null)
  const [credential, setCredential] = useState(null)
  const [avatarPath, setAvatarPath] = useState(null)
  const [homeUnit, setHomeUnit] = useState(null)
  const [shifts, setShifts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [openCount, setOpenCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [personalEvents, setPersonalEvents] = useState([])
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState(null)
  const [editingPersonalEvent, setEditingPersonalEvent] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [offerUpdateShiftId, setOfferUpdateShiftId] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAddPersonalEvent, setShowAddPersonalEvent] = useState(false)
  const [activation, setActivation] = useState(null)

  const isCoordinator = role === 'coordinator'

  useEffect(() => {
    let cancelled = false

    async function fetchHomeData() {
      setLoading(true)
      setError(null)

      const shiftsQuery = isCoordinator
        ? (() => {
            const { start, end } = getSummaryRange()
            // One day of slack at the bottom edge (2026-09-19): a night shift
            // that started at 23:00 yesterday is still running and belongs to
            // today's coverage, and no filter can bring back a row this query
            // never fetched.
            const queryStart = new Date(start)
            queryStart.setDate(queryStart.getDate() - 1)
            return supabase
              .from('shifts')
              .select('id, unit, nurse_id, starts_at, ends_at, status')
              // Coverage is a picture of the team schedule, so a shift still
              // waiting on its nurse's confirmation does not count yet.
              .eq('team_confirmed', true)
              .gte('starts_at', queryStart.toISOString())
              .lt('starts_at', end.toISOString())
              .order('starts_at', { ascending: true })
          })()
        : supabase
            .from('shifts')
            .select('id, unit, starts_at, ends_at')
            .eq('nurse_id', user.id)
            .order('starts_at', { ascending: true })

      const notificationsQuery = isCoordinator
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from('notifications')
            .select('id, type, message, shift_id, created_at, read')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

      const personalEventsQuery = isCoordinator
        ? Promise.resolve({ data: [], error: null })
        : fetchMyPersonalEvents(user.id, {
            start: new Date(),
            end: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),
          })
            .then((data) => ({ data, error: null }))
            .catch((err) => ({ data: [], error: err }))

      const [profileResult, shiftsResult, notificationsResult, personalEventsResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, credential, home_unit, avatar_url')
            .eq('id', user.id)
            .maybeSingle(),
          shiftsQuery,
          notificationsQuery,
          personalEventsQuery,
        ])

      if (cancelled) return

      if (profileResult.error) {
        setError(profileResult.error.message)
        setFullName(null)
        setCredential(null)
        setAvatarPath(null)
        setHomeUnit(null)
        setShifts([])
        setNotifications([])
        setPersonalEvents([])
        setLoading(false)
        return
      }

      if (shiftsResult.error) {
        setError(shiftsResult.error.message)
        setFullName(profileResult.data?.full_name ?? null)
        setCredential(profileResult.data?.credential ?? null)
        setAvatarPath(profileResult.data?.avatar_url ?? null)
        setHomeUnit(profileResult.data?.home_unit ?? null)
        setShifts([])
        setNotifications([])
        setPersonalEvents([])
        setLoading(false)
        return
      }

      setFullName(profileResult.data?.full_name ?? null)
      setCredential(profileResult.data?.credential ?? null)
      setAvatarPath(profileResult.data?.avatar_url ?? null)
      setHomeUnit(profileResult.data?.home_unit ?? null)
      setShifts(shiftsResult.data ?? [])
      setNotifications(notificationsResult.error ? [] : (notificationsResult.data ?? []))
      setPersonalEvents(personalEventsResult.data ?? [])
      setLoading(false)
    }

    fetchHomeData()

    return () => {
      cancelled = true
    }
  }, [user.id, isCoordinator, refreshKey])

  useEffect(() => {
    if (isCoordinator) {
      setOpenCount(0)
      let cancelled = false

      async function fetchPendingApprovals() {
        const { count } = await supabase
          .from('shift_claims')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (!cancelled) setPendingApprovalsCount(count ?? 0)
      }

      fetchPendingApprovals()

      return () => {
        cancelled = true
      }
    }

    setPendingApprovalsCount(0)

    if (!homeUnit) {
      setOpenCount(0)
      return
    }

    let cancelled = false

    async function fetchOpenCount() {
      const { count } = await supabase
        .from('shifts')
        .select('id', { count: 'exact', head: true })
        .eq('unit', homeUnit)
        .or('status.eq.open,and(is_offered.eq.true,status.eq.scheduled)')

      if (!cancelled) setOpenCount(count ?? 0)
    }

    fetchOpenCount()

    return () => {
      cancelled = true
    }
  }, [isCoordinator, homeUnit])

  // Home's activation checklist ("Get started"). Nurses only: the coordinator
  // body is a different screen with no Request Activity section to take over.
  useEffect(() => {
    if (isCoordinator) {
      setActivation(null)
      return
    }

    let cancelled = false

    async function loadActivation() {
      const next = await fetchActivation(user.id)
      if (!cancelled) setActivation(next)
    }

    loadActivation()

    return () => {
      cancelled = true
    }
  }, [user.id, isCoordinator, refreshKey])

  // Retires the checklist for good. Both exits write this: "Skip for now" while
  // it is unfinished, and "Got it" on the finished card. Optimistic so the tap
  // always feels like it landed, and rolled back on failure rather than leaving
  // a hidden checklist that quietly returns on the next load.
  async function handleDismissActivation() {
    const previous = activation
    setActivation((current) => (current ? { ...current, mode: 'notification' } : current))

    try {
      await dismissActivation(user.id)
    } catch (err) {
      console.error('activation dismissal failed', err)
      setActivation(previous)
    }
  }

  // The card's own action: the next step while the checklist is running, then
  // the notifications this slot hands over to once it is finished.
  function handleActivationNext(action) {
    if (action === 'requests') {
      setShowNotifications(true)
      return
    }
    if (action === 'claim') {
      onGoToPool()
      return
    }
    setShowAddPersonalEvent(true)
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  async function handleOpenNotification(notification) {
    if (notification.type === 'offer_claimed' && notification.shift_id) {
      setShowNotifications(false)
      setOfferUpdateShiftId(notification.shift_id)
    }

    if (notification.read) return

    setNotifications((current) =>
      current.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    )
    await supabase.from('notifications').update({ read: true }).eq('id', notification.id)
  }

  if (selectedShift) {
    return (
      <ShiftDetail
        shift={selectedShift}
        user={user}
        onBack={() => setSelectedShift(null)}
      />
    )
  }

  if (selectedPersonalEvent) {
    return (
      <PersonalEventDetail
        event={selectedPersonalEvent}
        user={user}
        onBack={() => setSelectedPersonalEvent(null)}
        onEdit={() => {
          setEditingPersonalEvent(selectedPersonalEvent)
          setSelectedPersonalEvent(null)
        }}
        onDeleted={() => {
          setSelectedPersonalEvent(null)
          setRefreshKey((k) => k + 1)
        }}
      />
    )
  }

  if (offerUpdateShiftId) {
    return (
      <OfferShiftUpdate
        shiftId={offerUpdateShiftId}
        onBack={() => setOfferUpdateShiftId(null)}
        onGoToSchedule={() => {
          setOfferUpdateShiftId(null)
          onGoToSchedule()
        }}
      />
    )
  }

  if (showNotifications) {
    return (
      <Notifications
        notifications={notifications}
        onBack={() => setShowNotifications(false)}
        onMarkAllRead={handleMarkAllRead}
        onOpenNotification={handleOpenNotification}
      />
    )
  }

  const today = new Date()
  const nurseFirstName = fullName?.trim().split(' ')[0] ?? null
  // isOnDay, not "starts today": an overnight shift that began at 23:00 is
  // still today's shift after midnight, which is when this card used to lose
  // it, and the progress bar with it (2026-09-19).
  const todaysShift = shifts.find((shift) => isOnDay(shift, today))
  const todaysEvent =
    personalEvents
      .filter((event) => isOnDay(event, today))
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] ?? null
  // isWithinNextSevenDays still sets the seven day window, and isInProgress is
  // the second way in: a shift already running has a start date behind today, so
  // the window test alone would keep rejecting it.
  const upcomingShifts = shifts.filter(
    (shift) =>
      shift.id !== todaysShift?.id &&
      (isWithinNextSevenDays(shift.starts_at) || isInProgress(shift, today)),
  )
  const upcomingPersonalEvents = personalEvents.filter(
    (event) => isWithinNextSevenDays(event.starts_at) || isInProgress(event, today),
  )
  const upcomingItems = [
    ...upcomingShifts.map((shift) => ({ kind: 'shift', item: shift })),
    ...upcomingPersonalEvents.map((event) => ({ kind: 'personal', item: event })),
  ].sort((a, b) => new Date(a.item.starts_at) - new Date(b.item.starts_at))
  const latestNotification = notifications.find((n) => !n.read) ?? notifications[0] ?? null
  // Nurses only: this names the reader's own day, and the coordinator's body is a
  // different screen whose first section is the coverage card.
  const todayHeader = isCoordinator
    ? null
    : getTodayHeader(todaysShift ?? todaysEvent, Boolean(todaysShift))
  const hasUnreadNotifications = notifications.some((notification) => !notification.read)

  return (
    <div className="flex min-h-screen w-full flex-col bg-page-ground">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-12">
        {/* No gradient and no bar on Home any more (2026-09-17, at Jefle's
            request): the page ground runs to the top edge and this row is the
            page's first line. The profile control sits on the left, the greeting
            runs beside it in muted ink at 15px/400 (the lightest weight Geist
            loads is 400), and the bell sits flush on the right gutter. pb-5 is
            what leaves 20px between the row and the first section header, so the
            top of the page keeps the same rhythm as the sections below it (the
            sections container carries gap-5). Both controls are 36px, which is
            what sets the row's height. */}
        <div className="flex flex-1 flex-col px-5 pt-2">
          <div className="flex items-center gap-2.5 pt-4 pb-5">
            <HomeProfileControl
              name={fullName}
              avatarUrl={avatarPublicUrl(avatarPath)}
              onOpenProfile={onOpenProfile}
            />
            <p className="min-w-0 flex-1 truncate text-[15px] tracking-[-0.01em] text-ink-secondary">
              {getGreeting()}{nurseFirstName ? `, ${nurseFirstName}` : ''}
            </p>
            <HomeBellControl
              hasUnread={hasUnreadNotifications}
              onOpen={() => setShowNotifications(true)}
            />
          </div>

          <div className="flex flex-1 flex-col gap-5 pt-0 pb-10">
            {!loading && !error && isCoordinator && (
              <CoordinatorHomeContent
                shifts={shifts}
                today={today}
                pendingApprovalsCount={pendingApprovalsCount}
                onGoToManage={onGoToManage}
                onGoToPostShift={onGoToPostShift}
                onGoToApprovals={onGoToApprovals}
              />
            )}

            {!loading && !error && !isCoordinator && (
              <>
                <section className="flex flex-col gap-2.5" data-testid="home-today">
                  <SectionHeader title={todayHeader} />
                  <TodayHero
                    todaysShift={todaysShift}
                    todaysEvent={todaysEvent}
                    credential={credential}
                  />
                </section>

                <QuickActionTiles
                  openCount={openCount}
                  onGoToPool={onGoToPool}
                  onAddPersonalEvent={() => setShowAddPersonalEvent(true)}
                />

                {activation?.mode === 'checklist' && (
                  <section className="flex flex-col gap-2.5" data-testid="home-get-started">
                    <SectionHeader title="Get started">
                      <button
                        type="button"
                        onClick={handleDismissActivation}
                        data-testid="home-skip-activation"
                        className="text-xs font-semibold text-ink-secondary"
                      >
                        Skip for now
                      </button>
                    </SectionHeader>
                    <ActivationBanner
                      mode="checklist"
                      done={activation.done}
                      currentIndex={activation.currentIndex}
                      nextStep={activation.nextStep}
                      onNext={handleActivationNext}
                    />
                  </section>
                )}

                {activation?.mode === 'complete' && (
                  <section className="flex flex-col gap-2.5" data-testid="home-get-started">
                    <SectionHeader title="Get started">
                      <button
                        type="button"
                        onClick={handleDismissActivation}
                        data-testid="home-acknowledge-activation"
                        className="text-xs font-semibold text-ink-secondary"
                      >
                        Got it
                      </button>
                    </SectionHeader>
                    <ActivationBanner
                      mode="complete"
                      done={activation.done}
                      currentIndex={activation.currentIndex}
                      firstName={nurseFirstName}
                      onNext={handleActivationNext}
                    />
                  </section>
                )}

                {/* The checklist owns this slot while it is unfinished, so a
                    request notification landing mid-setup does not push Upcoming
                    down the page. The bell keeps its dot, so nothing is hidden.
                    While activation is still loading this falls through to the
                    tile, which is exactly today's behavior, so an established
                    nurse never sees the section flicker. */}
                {latestNotification &&
                  activation?.mode !== 'checklist' &&
                  activation?.mode !== 'complete' && (
                    <section className="flex flex-col gap-2.5">
                      <SectionHeader title="Request Activity" onViewAll={() => setShowNotifications(true)} />
                      <RequestActivity notification={latestNotification} onOpen={handleOpenNotification} />
                    </section>
                  )}

                <section className="flex flex-col gap-2.5">
                  <SectionHeader title="My Upcoming" onViewAll={onGoToSchedule} />
                  {upcomingItems.length > 0 ? (
                    <div className="rounded-card bg-white py-1.5 shadow-card-lift">
                      {upcomingItems.map((entry, index) => (
                        <div key={entry.item.id}>
                          {index > 0 && <div className="ml-[73px] h-px bg-hairline" />}
                          {entry.kind === 'shift' ? (
                            <UpcomingShiftRow
                              shift={entry.item}
                              isFirst={index === 0}
                              isLast={index === upcomingItems.length - 1}
                              onSelectShift={setSelectedShift}
                            />
                          ) : (
                            <UpcomingPersonalEventRow
                              event={entry.item}
                              isFirst={index === 0}
                              isLast={index === upcomingItems.length - 1}
                              onSelectEvent={setSelectedPersonalEvent}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-card bg-white shadow-card-lift">
                      <EmptyState
                        icon={CalendarDays}
                        title="Nothing on the horizon"
                        subline="Shifts you pick up will show here"
                        layout="row"
                      />
                    </div>
                  )}
                </section>

                <WeeklyProgress
                  shifts={shifts}
                  weekOffset={weekOffset}
                  onChangeWeekOffset={setWeekOffset}
                />
              </>
            )}
          </div>
        </div>

        {!loading && error && (
          <p className="mt-6 px-5 text-sm text-red-700">Could not load home data: {error}</p>
        )}
      </main>

      {showAddPersonalEvent && (
        <PersonalEventPanel
          userId={user.id}
          onClose={() => setShowAddPersonalEvent(false)}
          onSaved={() => {
            setShowAddPersonalEvent(false)
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
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
            setEditingPersonalEvent(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}

// Coordinator Home body, per CoordinatorHome.dc.html (home-linear-light):
// the coordinator counterpart to the nurse TodayHero/QuickActionTiles/
// WeeklyProgress stack above, sharing the same gradient header.
function CoordinatorHomeContent({ shifts, today, pendingApprovalsCount, onGoToManage, onGoToPostShift, onGoToApprovals }) {
  // isOnDay: a night shift still running from yesterday counts toward today's
  // coverage until it ends at 07:30 (2026-09-19).
  const todayShifts = shifts.filter((shift) => isOnDay(shift, today))
  const staffedTodayShifts = todayShifts.filter(
    (shift) => shift.status !== 'open' && shift.status !== 'pending',
  )
  const gapsToday = todayShifts.length - staffedTodayShifts.length
  const uniqueNursesToday = new Set(staffedTodayShifts.map((shift) => shift.nurse_id)).size
  const uniqueUnitsToday = new Set(todayShifts.map((shift) => shift.unit).filter(Boolean)).size

  const { start } = getSummaryRange()
  const scheduledDayKeys = new Set(
    shifts.map((shift) => formatLocalDateKey(new Date(shift.starts_at))),
  )
  const unstaffedDates = []
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    if (!scheduledDayKeys.has(formatLocalDateKey(date))) {
      unstaffedDates.push(date)
    }
  }

  return (
    <>
      <CoverageHero
        totalToday={todayShifts.length}
        staffedToday={staffedTodayShifts.length}
        gapsToday={gapsToday}
        nursesScheduled={uniqueNursesToday}
        unitsCount={uniqueUnitsToday}
      />

      <CoordinatorStatRow
        shiftsToday={todayShifts.length}
        approvals={pendingApprovalsCount}
        unstaffed={unstaffedDates.length}
      />

      <CoordinatorQuickActions
        pendingApprovalsCount={pendingApprovalsCount}
        onGoToManage={onGoToManage}
        onGoToPostShift={onGoToPostShift}
        onGoToApprovals={onGoToApprovals}
      />

      {unstaffedDates.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Coverage Gaps" onViewAll={onGoToManage} />
          <div className="rounded-card border border-hairline bg-white shadow-card-lift">
            {unstaffedDates.map((date, index) => (
              <div key={formatLocalDateKey(date)}>
                {index > 0 && <div className="ml-[73px] h-px bg-hairline" />}
                <CoverageGapRow date={date} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function CoverageHero({ totalToday, staffedToday, gapsToday, nursesScheduled, unitsCount }) {
  const hasGaps = gapsToday > 0
  const percent = totalToday > 0 ? Math.round((staffedToday / totalToday) * 100) : 100

  // No -mt-9 any more: that pull-up existed to tuck this card under the header
  // block's pb-15, and the header row now ends 20px above the sections container
  // (pb-5), so keeping it would pull the card 16px over the row. The card keeps
  // its own eyebrow: the coordinator has no section header above it.
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-hairline bg-white p-4 shadow-card-lift">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
          Today&rsquo;s coverage
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-control-sm py-1 pr-2 pl-1.5 text-[11px] font-semibold',
            hasGaps ? 'bg-period-warn-bg text-period-warn-fg' : 'bg-period-good-bg text-period-good-fg',
          )}
        >
          {hasGaps ? (
            <AlertTriangle size={12} strokeWidth={2} />
          ) : (
            <CheckCircle2 size={12} strokeWidth={2} />
          )}
          {hasGaps ? `${gapsToday} Gap${gapsToday === 1 ? '' : 's'}` : 'Fully staffed'}
        </span>
      </div>

      {totalToday > 0 ? (
        <>
          <p className="text-[25px] font-semibold tracking-[-0.02em] text-status-deep">
            {staffedToday}{' '}
            <span className="text-[15px] font-medium text-ink-secondary">
              of {totalToday} shifts staffed
            </span>
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-track-neutral">
              <div
                className="h-full rounded-full bg-teal transition-[width] duration-[350ms] ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs text-ink-secondary">
                <Users size={12} strokeWidth={2} className="shrink-0 text-teal-foreground" />
                <span className="font-semibold text-ink">{nursesScheduled}</span> nurses scheduled
              </p>
              <p className="shrink-0 text-[13px] text-ink-secondary">
                {unitsCount} unit{unitsCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={CalendarOff}
          title="No shifts scheduled today"
          layout="row"
          tone="neutral"
        />
      )}
    </div>
  )
}

function CoordinatorStatRow({ shiftsToday, approvals, unstaffed }) {
  const hasUnstaffed = unstaffed > 0

  return (
    <div className="-mt-1 flex gap-2">
      <div className="flex flex-1 flex-col gap-2 rounded-card border border-hairline bg-white px-2.5 py-3 shadow-card-lift">
        <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-teal-tint text-teal-foreground">
          <Clock size={14} strokeWidth={1.75} />
        </span>
        <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">
          {shiftsToday}
        </span>
        <span className="text-[11px] leading-tight tracking-[-0.01em] text-ink-secondary">
          Shifts today
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 rounded-card border border-hairline bg-white px-2.5 py-3 shadow-card-lift">
        <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-teal-tint text-teal-foreground">
          <CheckSquare size={14} strokeWidth={1.75} />
        </span>
        <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">
          {approvals}
        </span>
        <span className="text-[11px] leading-tight tracking-[-0.01em] text-ink-secondary">
          Approvals
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 rounded-card border border-hairline bg-white px-2.5 py-3 shadow-card-lift">
        <span
          className={cn(
            'flex size-[26px] items-center justify-center rounded-[7px]',
            hasUnstaffed ? 'bg-period-warn-bg text-period-warn-fg' : 'bg-teal-tint text-teal-foreground',
          )}
        >
          <AlertTriangle size={14} strokeWidth={1.75} />
        </span>
        <span
          className={cn(
            'text-[22px] leading-none font-semibold tracking-[-0.02em]',
            hasUnstaffed ? 'text-period-warn-fg' : 'text-ink',
          )}
        >
          {unstaffed}
        </span>
        <span className="text-[11px] leading-tight tracking-[-0.01em] text-ink-secondary">
          Unstaffed
        </span>
      </div>
    </div>
  )
}

// Manage still routes into the Manage tab for now (there's no dedicated
// Approvals screen wiring left to do; see LINEAR_LIGHT_ROLLOUT.md's
// Coordinator Manage flow entry for the remaining hub restructure). Post
// Shift and Approvals each have their own screen as of these commits.
function CoordinatorQuickActions({ pendingApprovalsCount, onGoToManage, onGoToPostShift, onGoToApprovals }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onGoToApprovals}
        data-testid="home-approvals-tile"
        className="relative flex flex-1 flex-col items-center gap-1.5 rounded-card border border-hairline bg-white px-2 py-2.5 text-center shadow-card-lift transition-colors active:bg-press-state"
      >
        {pendingApprovalsCount > 0 && (
          <span className="absolute top-2.5 right-2.5 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-control-sm bg-urgency-red px-1 text-[10px] font-semibold text-white">
            {pendingApprovalsCount}
          </span>
        )}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
          <CheckSquare size={17} strokeWidth={1.9} />
        </span>
        <span>
          <p className="text-[12px] font-medium text-ink">Approvals</p>
          <p className="text-[11px] text-ink-secondary">{pendingApprovalsCount} waiting</p>
        </span>
      </button>

      <button
        type="button"
        onClick={onGoToPostShift}
        data-testid="home-post-shift-tile"
        className="flex flex-1 flex-col items-center gap-1.5 rounded-card border border-hairline bg-white px-2 py-2.5 text-center shadow-card-lift transition-colors active:bg-press-state"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
          <SquarePlus size={17} strokeWidth={1.9} />
        </span>
        <span>
          <p className="text-[12px] font-medium text-ink">Post Shift</p>
          <p className="text-[11px] text-ink-secondary">Open a slot</p>
        </span>
      </button>

      <button
        type="button"
        onClick={onGoToManage}
        data-testid="home-manage-tile"
        className="flex flex-1 flex-col items-center gap-1.5 rounded-card border border-hairline bg-white px-2 py-2.5 text-center shadow-card-lift transition-colors active:bg-press-state"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
          <Calendar size={17} strokeWidth={1.9} />
        </span>
        <span>
          <p className="text-[12px] font-medium text-ink">Manage</p>
          <p className="text-[11px] text-ink-secondary">Roster &amp; shifts</p>
        </span>
      </button>
    </div>
  )
}

// Coverage-gap row: reuses the shift-list/date-col pattern from Upcoming
// Shifts, but the live data only knows a day has zero shifts scheduled (not
// which unit/period is short-staffed, per the mockup's fictional detail).
// See LINEAR_LIGHT_ROLLOUT.md for the Departments/staffing-pattern work that
// would make a per-unit gap callout possible.
function CoverageGapRow({ date }) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      <div className="flex w-8 shrink-0 flex-col items-center text-center">
        <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[19px] leading-[1.15] font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-period-warn-fg">No nurse assigned</p>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 rounded-control-sm bg-period-warn-bg py-1 pr-2 pl-1.5 text-[11px] font-semibold text-period-warn-fg">
        <AlertTriangle size={12} strokeWidth={2} />
        Unstaffed
      </span>
    </div>
  )
}
