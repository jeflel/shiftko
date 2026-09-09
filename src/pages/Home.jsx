import { useEffect, useState } from 'react'
import {
  Calendar,
  CalendarPlus,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Waves,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import PersonalEventPanel from '@/components/PersonalEventPanel'
import { Wordmark } from '@/components/ui/wordmark'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatLocalDateKey,
  formatShiftTimeRange,
  getShiftPeriod,
  isSameLocalDay,
  isWithinNextSevenDays,
} from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
const todayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

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
  if (type === 'claim_denied') return 'Claim update'
  return 'Notification'
}

// Today hero card: the shift the nurse is on today, or "No shift today". Per
// DESIGN.md's Today Hero + Shift Progress spec (Main.dc.html), reskinned per
// MainHorizontalTiles.dc.html (home-linear-light) — pulled up over the
// gradient hero, deep-teal time readout, colored period tag.
function TodayHero({ todaysShift, credential }) {
  const period = todaysShift ? getShiftPeriod(todaysShift.starts_at) : null

  return (
    <div className="-mt-9 flex flex-col gap-2.5 rounded-card border border-hairline bg-white p-4 shadow-card-lift">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
          Today
        </span>
        {period && <PeriodTag period={period} />}
      </div>

      {todaysShift ? (
        <>
          <p className="text-[25px] font-bold tracking-[-0.01em] text-status-deep">
            {formatShiftTimeRange(todaysShift.starts_at, todaysShift.ends_at)}
          </p>
          <p className="text-[13px] text-ink-secondary">
            {[todaysShift.unit, credential].filter(Boolean).join(' · ')}
          </p>
          <ShiftProgress shift={todaysShift} />
        </>
      ) : (
        <p className="text-[15px] text-ink-secondary">No shift today</p>
      )}
    </div>
  )
}

function ShiftProgress({ shift }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(tick)
  }, [])

  const start = new Date(shift.starts_at).getTime()
  const end = new Date(shift.ends_at).getTime()
  const clampedNow = Math.min(end, Math.max(start, now))
  const elapsedMinutes = (clampedNow - start) / 60000
  const remainingMinutes = (end - clampedNow) / 60000
  const percent = Math.round((elapsedMinutes / ((end - start) / 60000)) * 100)

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-track-neutral">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-ink-secondary">
        <span className="font-semibold text-ink">{formatHM(elapsedMinutes)}</span> in ·{' '}
        {formatHM(remainingMinutes)} left
      </p>
    </div>
  )
}

// Section header with an optional "View All" link, shared by the Request
// Activity / Upcoming Shifts / Weekly Progress sections below.
function SectionHeader({ title, onViewAll, children }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</span>
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
// (home-linear-light, shiftko-design-v2-visual-pass-dup) — replaces the
// earlier full-width stacked ActionList.
function QuickActionTiles({ openCount, onGoToPool, onAddPersonalEvent }) {
  return (
    <div className="-mt-1 flex gap-2">
      <button
        type="button"
        onClick={onAddPersonalEvent}
        data-testid="home-add-shift-row"
        className="flex flex-1 items-center gap-2 rounded-card border border-hairline bg-white px-3 py-2.5 text-left shadow-card-lift transition-colors active:bg-press-state"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
          <CalendarPlus size={17} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">Add a Shift</p>
          <p className="truncate text-[11px] text-ink-secondary">Log a shift</p>
        </span>
      </button>

      <button
        type="button"
        onClick={onGoToPool}
        data-testid="home-claim-shifts-row"
        className="relative flex flex-1 items-center gap-2 rounded-card border border-hairline bg-white px-3 py-2.5 text-left shadow-card-lift transition-colors active:bg-press-state"
      >
        {openCount > 0 && (
          <span className="absolute top-2.5 right-2.5 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-control-sm bg-urgency-red px-1 text-[10px] font-semibold text-white">
            {openCount}
          </span>
        )}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
          <Waves size={17} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">Claim Shifts</p>
          <p className="truncate text-[11px] text-ink-secondary">{openCount} open</p>
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

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      data-testid="home-notification-row"
      className={cn(
        'flex items-center gap-2 rounded-card border p-3 text-left shadow-card-lift transition-colors',
        isNegative
          ? 'border-hairline bg-white active:bg-press-state'
          : 'border-teal bg-teal-tint active:bg-teal-tint/70',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
        <NotifIcon size={17} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{notificationTitle(notification.type)}</p>
        <p className="truncate text-[11px] text-ink-secondary">{notification.message}</p>
      </div>
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
      <div className="flex w-8 shrink-0 flex-col items-center text-center">
        <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
          {weekdayFormatter.format(shiftDate)}
        </span>
        <span className="text-[19px] leading-[1.15] font-semibold text-ink">
          {shiftDate.getDate()}
        </span>
      </div>

      <div className="h-full self-stretch border-l border-hairline" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        <p className="truncate text-xs text-ink-secondary">{shift.unit}</p>
      </div>

      <PeriodTag period={period} />
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
      <SectionHeader title="Weekly Progress">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChangeWeekOffset(weekOffset - 1)}
            aria-label="Previous week"
            className="flex size-6 items-center justify-center rounded-control-sm border border-hairline bg-white text-ink-secondary"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onChangeWeekOffset(weekOffset + 1)}
            aria-label="Next week"
            className="flex size-6 items-center justify-center rounded-control-sm border border-hairline bg-white text-ink-secondary"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>
      </SectionHeader>

      <div className="flex items-stretch rounded-card border border-hairline bg-white p-4 shadow-card-lift">
        <div className="flex flex-1 flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.01em] text-ink-secondary">
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-control-sm bg-teal-tint text-teal-foreground">
              <Calendar size={13} strokeWidth={1.75} />
            </span>
            Shifts worked
          </span>
          <p className="text-[22px] leading-none font-bold tracking-[-0.01em] text-ink">
            {shiftCount}
            <span className="ml-0.5 text-sm font-medium text-ink-secondary">/{shiftsTarget}</span>
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
          <p className="text-[22px] leading-none font-bold tracking-[-0.01em] text-ink">
            {totalHours}
            <span className="ml-0.5 text-sm font-medium text-ink-secondary">/{hoursTarget}</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-track-neutral">
            <div
              className="h-full rounded-full bg-stat-hours-fg"
              style={{ width: `${Math.min(100, (totalHours / hoursTarget) * 100)}%` }}
            />
          </div>
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

function getSummaryRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 8)
  return { start, end }
}

function getFirstName(fullName) {
  if (!fullName) return null
  const firstName = fullName.trim().split(' ')[0]
  return firstName.endsWith('.') ? firstName : `${firstName}.`
}

function getInitials(fullName) {
  if (!fullName) return null
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || null
}

// Colored Day/Evening/Night tag for the Home hero reskin. Deliberately
// local to Home.jsx rather than a change to ui/pill.jsx's ShiftPeriodPill —
// the rest of the app keeps the two-color rule (icon + gray text only);
// this screen's full-color port was approved 2026-09-09.
const PERIOD_TAG_CONFIG = {
  Day: { icon: Sun, bg: 'bg-period-day-bg', fg: 'text-period-day-fg' },
  Evening: { icon: Sunset, bg: 'bg-period-evening-bg', fg: 'text-period-evening-fg' },
  Night: { icon: Moon, bg: 'bg-period-night-bg', fg: 'text-period-night-fg' },
}

function PeriodTag({ period }) {
  const config = PERIOD_TAG_CONFIG[period]
  if (!config) return null
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-control-sm py-1 pr-2 pl-1.5 text-[11px] font-semibold',
        config.bg,
        config.fg,
      )}
    >
      <Icon size={12} strokeWidth={2} />
      {period}
    </span>
  )
}

function formatRelativeTime(isoString) {
  const diffMinutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
}

export default function Home({ user, role, onGoToManage, onGoToPool, onGoToSchedule }) {
  const [fullName, setFullName] = useState(null)
  const [credential, setCredential] = useState(null)
  const [homeUnit, setHomeUnit] = useState(null)
  const [shifts, setShifts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [openCount, setOpenCount] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [bellOpen, setBellOpen] = useState(false)
  const [showAddPersonalEvent, setShowAddPersonalEvent] = useState(false)

  const isCoordinator = role === 'coordinator'

  useEffect(() => {
    let cancelled = false

    async function fetchHomeData() {
      setLoading(true)
      setError(null)

      const shiftsQuery = isCoordinator
        ? (() => {
            const { start, end } = getSummaryRange()
            return supabase
              .from('shifts')
              .select('id, unit, nurse_id, starts_at, ends_at')
              .gte('starts_at', start.toISOString())
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

      const [profileResult, shiftsResult, notificationsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, credential, home_unit')
          .eq('id', user.id)
          .maybeSingle(),
        shiftsQuery,
        notificationsQuery,
      ])

      if (cancelled) return

      if (profileResult.error) {
        setError(profileResult.error.message)
        setFullName(null)
        setCredential(null)
        setHomeUnit(null)
        setShifts([])
        setNotifications([])
        setLoading(false)
        return
      }

      if (shiftsResult.error) {
        setError(shiftsResult.error.message)
        setFullName(profileResult.data?.full_name ?? null)
        setCredential(profileResult.data?.credential ?? null)
        setHomeUnit(profileResult.data?.home_unit ?? null)
        setShifts([])
        setNotifications([])
        setLoading(false)
        return
      }

      setFullName(profileResult.data?.full_name ?? null)
      setCredential(profileResult.data?.credential ?? null)
      setHomeUnit(profileResult.data?.home_unit ?? null)
      setShifts(shiftsResult.data ?? [])
      setNotifications(notificationsResult.error ? [] : (notificationsResult.data ?? []))
      setLoading(false)
    }

    fetchHomeData()

    return () => {
      cancelled = true
    }
  }, [user.id, isCoordinator])

  useEffect(() => {
    if (isCoordinator || !homeUnit) {
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

  async function handleBellClick() {
    if (bellOpen) {
      setBellOpen(false)
      return
    }

    setBellOpen(true)

    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  async function handleOpenNotification(notification) {
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

  const today = new Date()
  const todayLabel = todayLabelFormatter.format(today)
  const firstName = getFirstName(fullName)
  const nurseFirstName = fullName?.trim().split(' ')[0] ?? null
  const initials = getInitials(fullName)
  const todaysShift = shifts.find((shift) => isSameLocalDay(new Date(shift.starts_at), today))
  const upcomingShifts = shifts.filter(
    (shift) => isWithinNextSevenDays(shift.starts_at) && shift.id !== todaysShift?.id,
  )
  const latestNotification = notifications.find((n) => !n.read) ?? notifications[0] ?? null

  const notificationDropdown = bellOpen && (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={() => setBellOpen(false)}
        className="fixed inset-0 z-10 cursor-default"
      />
      <div className="absolute top-full right-0 z-20 mt-2 w-80 max-w-[80vw] rounded-card border border-hairline bg-white shadow-card-lift">
        <div className="flex items-center justify-between border-b border-hairline p-4">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          <button
            type="button"
            onClick={() => setBellOpen(false)}
            aria-label="Close notifications"
            className="text-ink-secondary"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-ink-secondary">No notifications yet</p>
        ) : (
          <ul className="flex max-h-80 flex-col overflow-y-auto">
            {notifications.map((notification) => {
              const isApproved =
                notification.type === 'claim_approved' || notification.type === 'offer_claimed'

              return (
                <li
                  key={notification.id}
                  className="flex items-start gap-2 border-b border-hairline p-4 last:border-b-0"
                >
                  {isApproved ? (
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-teal-foreground"
                      size={16}
                      strokeWidth={2}
                    />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 shrink-0 text-ink-secondary"
                      size={16}
                      strokeWidth={2}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{notification.message}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen w-full flex-col bg-page-ground">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-12">
        {isCoordinator ? (
          <div className="shrink-0 px-5 pt-10">
            <div className="flex items-center justify-between">
              <Wordmark />
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-teal-dark">
              <span className="size-1.5 shrink-0 rounded-full bg-[#F97316]" />
              {todayLabel}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-col gap-4 bg-gradient-to-b from-hero-gradient-start to-hero-gradient-end px-5 pt-10 pb-11">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <span
                  aria-hidden={!initials}
                  className="flex size-9 shrink-0 items-center justify-center justify-self-start rounded-control border border-white/30 bg-white/20 text-xs font-semibold tracking-[0.02em] text-white"
                >
                  {initials}
                </span>

                <div className="flex items-center justify-center justify-self-center gap-1.5">
                  <Wordmark size={16} className="text-white" />
                  <span className="rounded-full border border-white/30 bg-white/20 px-[7px] py-[2px] text-[9px] font-bold tracking-[0.04em] text-white uppercase">
                    Beta
                  </span>
                </div>

                <div className="relative shrink-0 justify-self-end">
                  <button
                    type="button"
                    onClick={handleBellClick}
                    aria-label="Notifications"
                    data-testid="home-bell-button"
                    className="flex size-9 items-center justify-center rounded-control border border-white/30 bg-white/20 text-white"
                  >
                    <Bell size={18} strokeWidth={1.75} />
                  </button>

                  {notificationDropdown}
                </div>
              </div>

              <p className="ml-1 text-lg font-medium tracking-[-0.01em] text-white">
                {getGreeting()}{nurseFirstName ? `, ${nurseFirstName}` : ''}
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-5 px-5 pt-0 pb-10">
              {!loading && !error && (
                <>
                  <TodayHero todaysShift={todaysShift} credential={credential} />

                  <QuickActionTiles
                    openCount={openCount}
                    onGoToPool={onGoToPool}
                    onAddPersonalEvent={() => setShowAddPersonalEvent(true)}
                  />

                  {latestNotification && (
                    <section className="flex flex-col gap-2.5">
                      <SectionHeader title="Request Activity" onViewAll={handleBellClick} />
                      <RequestActivity notification={latestNotification} onOpen={handleOpenNotification} />
                    </section>
                  )}

                  {upcomingShifts.length > 0 && (
                    <section className="flex flex-col gap-2.5">
                      <SectionHeader title="Upcoming Shifts" onViewAll={onGoToSchedule} />
                      <div className="rounded-card border border-hairline bg-white shadow-card-lift">
                        {upcomingShifts.map((shift, index) => (
                          <div key={shift.id}>
                            {index > 0 && <div className="ml-[73px] h-px bg-hairline" />}
                            <UpcomingShiftRow
                              shift={shift}
                              isFirst={index === 0}
                              isLast={index === upcomingShifts.length - 1}
                              onSelectShift={setSelectedShift}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <WeeklyProgress
                    shifts={shifts}
                    weekOffset={weekOffset}
                    onChangeWeekOffset={setWeekOffset}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {!loading && error && (
          <p className="mt-6 px-5 text-sm text-red-700">Could not load home data: {error}</p>
        )}

        {!loading && !error && isCoordinator && (
          <div className="flex flex-1 flex-col mt-[30px]">
            <div className="px-5">
              <CoordinatorSummary
                shifts={shifts}
                today={today}
                firstName={firstName}
                onGoToManage={onGoToManage}
              />
            </div>
          </div>
        )}
      </main>

      {showAddPersonalEvent && (
        <PersonalEventPanel
          userId={user.id}
          onClose={() => setShowAddPersonalEvent(false)}
          onSaved={() => setShowAddPersonalEvent(false)}
        />
      )}
    </div>
  )
}

function CoordinatorSummary({ shifts, today, firstName, onGoToManage }) {
  const todayShifts = shifts.filter((shift) => isSameLocalDay(new Date(shift.starts_at), today))
  const uniqueNursesToday = new Set(todayShifts.map((shift) => shift.nurse_id)).size

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

  const hasUnstaffed = unstaffedDates.length > 0

  return (
    <section>
      <p
        className="text-[26px] font-semibold"
        style={{ letterSpacing: '-0.03em', lineHeight: '115%' }}
      >
        <span style={{ color: '#20748C' }}>{getGreeting()},</span>
        {firstName && <span style={{ color: '#7CB9CA' }}> {firstName}</span>}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="gap-2 rounded-card border-none bg-surface p-5 text-center shadow-none">
          <Calendar className="mx-auto text-[#9CA3AF]" size={20} strokeWidth={2} />
          <p className="text-3xl font-bold text-ink">{todayShifts.length}</p>
          <p className="text-xs tracking-wide text-[#9CA3AF] uppercase">Shifts today</p>
        </Card>

        <Card className="gap-2 rounded-card border-none bg-surface p-5 text-center shadow-none">
          <Users className="mx-auto text-[#9CA3AF]" size={20} strokeWidth={2} />
          <p className="text-3xl font-bold text-ink">{uniqueNursesToday}</p>
          <p className="text-xs tracking-wide text-[#9CA3AF] uppercase">Nurses scheduled</p>
        </Card>

        <Card
          className={cn(
            'gap-2 rounded-card border-none p-5 text-center shadow-none',
            hasUnstaffed ? 'bg-[#FEF9C3]' : 'bg-surface',
          )}
        >
          <AlertTriangle
            className={cn('mx-auto', hasUnstaffed ? 'text-[#CA8A04]' : 'text-[#9CA3AF]')}
            size={20}
            strokeWidth={2}
          />
          <p className={cn('text-3xl font-bold', hasUnstaffed ? 'text-[#92400E]' : 'text-ink')}>
            {unstaffedDates.length}
          </p>
          <p
            className={cn(
              'text-xs tracking-wide uppercase',
              hasUnstaffed ? 'text-[#A16207]' : 'text-[#9CA3AF]',
            )}
          >
            Unstaffed days
          </p>
        </Card>
      </div>

      {hasUnstaffed && (
        <div className="mt-7">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <AlertTriangle className="text-[#D97706]" size={16} strokeWidth={2.5} />
            Coverage gaps
          </h2>
          <ul className="flex flex-col gap-3">
            {unstaffedDates.map((date) => (
              <li key={formatLocalDateKey(date)}>
                <div className="flex items-center gap-4 rounded-card bg-white p-4 shadow-sm border border-[#E5E5EA]">
                  <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 text-center">
                    <span className="text-xs font-medium tracking-wide text-[#9CA3AF] uppercase">
                      {weekdayFormatter.format(date)}
                    </span>
                    <span className="text-2xl font-bold text-ink">{date.getDate()}</span>
                    <span className="text-xs font-medium tracking-wide text-[#9CA3AF] uppercase">
                      {monthFormatter.format(date)}
                    </span>
                  </div>

                  <div className="h-12 w-px shrink-0 bg-line" />

                  <p className="min-w-0 flex-1 text-sm text-[#6B7280]">No shifts scheduled</p>

                  <AlertTriangle className="shrink-0 text-[#D97706]" size={14} strokeWidth={2.5} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        type="button"
        onClick={onGoToManage}
        data-testid="home-go-to-manage"
        className="mt-9 h-auto w-full rounded-full bg-ink py-4 text-base font-semibold text-white hover:bg-ink/90"
      >
        Go to Manage
      </Button>
    </section>
  )
}
