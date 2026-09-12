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
  Waves,
  Hourglass,
  CheckSquare,
  SquarePlus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import OfferShiftUpdate from './OfferShiftUpdate'
import PersonalEventPanel from '@/components/PersonalEventPanel'
import { Wordmark } from '@/components/ui/wordmark'
import { PeriodTag } from '@/components/ui/period-tag'
import { cn } from '@/lib/utils'
import {
  formatLocalDateKey,
  formatRelativeTime,
  formatShiftTimeRange,
  getShiftPeriod,
  isSameLocalDay,
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
  if (type === 'claim_denied') return 'Claim update'
  return 'Notification'
}

// Today hero card: the shift the nurse is on today, or "No shift today". Per
// DESIGN.md's Today Hero + Shift Progress spec (Main.dc.html), reskinned per
// MainHorizontalTiles.dc.html (home-linear-light): pulled up over the
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
          <p className="text-[25px] font-semibold tracking-[-0.02em] text-status-deep">
            {formatShiftTimeRange(todaysShift.starts_at, todaysShift.ends_at)}
          </p>
          <ShiftProgress shift={todaysShift} unit={todaysShift.unit} credential={credential} />
        </>
      ) : (
        <p className="text-[15px] text-ink-secondary">No shift today</p>
      )}
    </div>
  )
}

// Per the mockup, the shift's unit/credential live in the progress row's
// right-hand column (status-sub), not as their own line under the time.
function ShiftProgress({ shift, unit, credential }) {
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
  const unitLine = [unit, credential].filter(Boolean).join(' · ')

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-track-neutral">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-ink-secondary">
          <Hourglass size={12} strokeWidth={2} className="shrink-0 text-teal-foreground" />
          <span className="font-semibold text-ink">{formatHM(elapsedMinutes)}</span> in ·{' '}
          {formatHM(remainingMinutes)} left
        </p>
        {unitLine && <p className="shrink-0 text-[13px] text-ink-secondary">{unitLine}</p>}
      </div>
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
// (home-linear-light, shiftko-design-v2-visual-pass-dup): replaces the
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

      <div className="flex flex-col gap-3.5 rounded-card border border-hairline bg-white p-4 shadow-card-lift">
        <div className="flex items-stretch">
          <div className="flex flex-1 flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.01em] text-ink-secondary">
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-control-sm bg-teal-tint text-teal-foreground">
                <Calendar size={13} strokeWidth={1.75} />
              </span>
              Shifts worked
            </span>
            <p className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink">
              {shiftCount}
              <span className="ml-1.5 text-[15px] font-medium text-ink-secondary">/{shiftsTarget}</span>
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
            <p className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink">
              {totalHours}
              <span className="ml-1.5 text-[15px] font-medium text-ink-secondary">/{hoursTarget}</span>
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
        <p className="text-xs text-ink-secondary">{formatWeekRange(start, end)}</p>
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

function getInitials(fullName) {
  if (!fullName) return null
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || null
}

export default function Home({ user, role, onGoToManage, onGoToPostShift, onGoToApprovals, onGoToPool, onGoToSchedule }) {
  const [fullName, setFullName] = useState(null)
  const [credential, setCredential] = useState(null)
  const [homeUnit, setHomeUnit] = useState(null)
  const [shifts, setShifts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [openCount, setOpenCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [offerUpdateShiftId, setOfferUpdateShiftId] = useState(null)
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
              .select('id, unit, nurse_id, starts_at, ends_at, status')
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
    if (notification.type === 'offer_claimed' && notification.shift_id) {
      setBellOpen(false)
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

  const today = new Date()
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
                <li key={notification.id} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className="flex w-full items-start gap-2 p-4 text-left"
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
                  </button>
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
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 bg-gradient-to-b from-hero-gradient-start to-hero-gradient-end px-5 pt-4 pb-11">
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
                {isCoordinator ? (
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-control border border-white/30 bg-white/20 text-white"
                  >
                    <Bell size={18} strokeWidth={1.75} />
                  </span>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            <p className="ml-1 text-lg font-medium tracking-[-0.01em] text-white">
              {getGreeting()}{nurseFirstName ? `, ${nurseFirstName}` : ''}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-5 px-5 pt-0 pb-10">
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

        {!loading && error && (
          <p className="mt-6 px-5 text-sm text-red-700">Could not load home data: {error}</p>
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

// Coordinator Home body, per CoordinatorHome.dc.html (home-linear-light):
// the coordinator counterpart to the nurse TodayHero/QuickActionTiles/
// WeeklyProgress stack above, sharing the same gradient header.
function CoordinatorHomeContent({ shifts, today, pendingApprovalsCount, onGoToManage, onGoToPostShift, onGoToApprovals }) {
  const todayShifts = shifts.filter((shift) => isSameLocalDay(new Date(shift.starts_at), today))
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

  return (
    <div className="-mt-9 flex flex-col gap-2.5 rounded-card border border-hairline bg-white p-4 shadow-card-lift">
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
                className="h-full rounded-full bg-teal transition-[width] duration-500"
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
        <p className="text-[15px] text-ink-secondary">No shifts scheduled today</p>
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

      <div className="h-full self-stretch border-l border-hairline" />

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
