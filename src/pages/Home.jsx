import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Bell,
  X,
  ChevronRight,
  Moon,
  Hourglass,
  CalendarDays,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
import { Wordmark } from '@/components/ui/wordmark'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShiftPeriodPill } from '@/components/ui/pill'
import { cn } from '@/lib/utils'
import {
  formatLocalDateKey,
  formatShiftTimeRange,
  getShiftPeriod,
  isSameLocalDay,
  isWithinNextSevenDays,
} from '../lib/shiftFormat'

const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

// Carousel spans 14 days back through 30 days forward (45 days total). Days with more
// than one shift get one card per shift; days with none get a single empty-state card,
// so the range stays continuously swipeable per the Home carousel spec.
function buildCarouselCards(shifts, today) {
  const cards = []
  for (let offset = -14; offset <= 30; offset += 1) {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    const dayShifts = shifts.filter((shift) => isSameLocalDay(new Date(shift.starts_at), date))

    if (dayShifts.length === 0) {
      cards.push({ key: `${formatLocalDateKey(date)}-empty`, date, shift: null })
    } else {
      dayShifts.forEach((shift) => cards.push({ key: shift.id, date, shift }))
    }
  }
  return cards
}

function formatShiftDuration(startsAt, endsAt) {
  const totalMinutes = Math.round((new Date(endsAt) - new Date(startsAt)) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}hrs ${minutes}mins` : `${hours}hrs`
}

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
const todayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
const headerDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })
const weekdayLongFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

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
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
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

function GlassSquircle({ children, className, innerClassName, shadow = true }) {
  return (
    <div
      className={cn('relative shrink-0 rounded-[20px] p-px', className)}
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.25) 35%, rgba(255,255,255,0.25) 70%, rgba(255,255,255,1) 100%)',
        boxShadow: shadow ? '0 7px 25px rgba(39,60,66,0.12)' : undefined,
      }}
    >
      <div
        className={cn('flex size-full items-center justify-center rounded-[19px]', innerClassName)}
        style={innerClassName ? undefined : { backgroundColor: '#48BDE1' }}
      >
        {children}
      </div>
    </div>
  )
}

function ShiftProgressBar({ shift }) {
  const [now, setNow] = useState(() => Date.now())
  const [showCountdown, setShowCountdown] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const crossfade = setInterval(() => setShowCountdown((current) => !current), 5000)
    return () => clearInterval(crossfade)
  }, [])

  const start = new Date(shift.starts_at).getTime()
  const end = new Date(shift.ends_at).getTime()
  const elapsedRatio = Math.min(1, Math.max(0, (now - start) / (end - start)))
  const percent = Math.round(elapsedRatio * 100)

  const remainingMinutesTotal = Math.max(0, Math.round((end - now) / 60000))
  const remainingHours = Math.floor(remainingMinutesTotal / 60)
  const remainingMinutes = remainingMinutesTotal % 60
  const countdownLabel =
    remainingMinutesTotal <= 0 ? 'Shift In Progress' : `${remainingHours}hrs ${remainingMinutes}mins left`

  return (
    <div className="px-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#C9DFE5' }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%`, backgroundColor: '#35BEE6' }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: '#2DA1C3' }}>
          {showCountdown ? countdownLabel : 'Shift In Progress'}
        </span>
        <span style={{ color: '#7DA0AB' }}>
          <span className="text-sm font-bold">{percent}</span>
          <span className="text-xs">%</span>
        </span>
      </div>
    </div>
  )
}

// Shown instead of the carousel when the nurse has zero shift records at all (not
// just no shift today/this range) - e.g. a brand-new account not yet scheduled by a
// coordinator. Distinct from EmptyDayCard, which handles individual empty days
// within an otherwise-populated carousel.
function NoShiftsCard() {
  return (
    <div className="px-6">
      <GlassSquircle
        className="h-[183px] w-full rounded-[20px]"
        innerClassName="flex-col gap-1.5 rounded-[19px]"
      >
        <CheckCircle2 className="text-white" size={24} strokeWidth={2} />
        <p className="text-sm font-medium text-white">No shifts today</p>
      </GlassSquircle>
    </div>
  )
}

function EmptyDayCard({ date }) {
  return (
    <GlassSquircle
      className="h-[183px] w-full rounded-[20px]"
      innerClassName="flex-col gap-1.5 rounded-[19px] bg-white/95"
      shadow={false}
    >
      <Moon className="text-[#7DA0AB]" size={24} strokeWidth={2} />
      <p className="text-sm font-medium text-[#7DA0AB]">You didn't work this day</p>
      <p className="text-xs text-[#7DA0AB]">{shortDateFormatter.format(date)}</p>
    </GlassSquircle>
  )
}

function ShiftCarouselCard({ shift, workspaceName, onSelectShift }) {
  const period = getShiftPeriod(shift.starts_at)
  const [startTime, endTime] = formatShiftTimeRange(shift.starts_at, shift.ends_at).split(' – ')
  const [startDigits, startMeridiem] = startTime.split(' ')
  const [endDigits, endMeridiem] = endTime.split(' ')
  const duration = formatShiftDuration(shift.starts_at, shift.ends_at)
  const shortDate = shortDateFormatter.format(new Date(shift.starts_at))

  return (
    <button
      type="button"
      onClick={() => onSelectShift(shift)}
      className="flex h-[183px] w-full flex-col rounded-[25px] p-5 text-left"
      style={{
        background: 'linear-gradient(to bottom, #E7FAFF 0%, #FFFFFF 50%, #FFFFFF 100%)',
        border: '1px solid #92D6EB',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-[17px] font-semibold" style={{ color: '#20748C' }}>
          {workspaceName ?? 'Shiftko'}
        </span>
        <span
          className="shrink-0 rounded-[7px] px-1.5 py-0.5 text-xs font-bold uppercase"
          style={{ backgroundColor: '#2DA1C3', color: '#E9FAFF' }}
        >
          {shift.unit}
        </span>
        <div className="flex-1" />
        <ShiftPeriodPill period={period} />
      </div>

      <div className="mt-3 flex items-baseline">
        <span className="text-[34px] font-semibold tracking-[-0.02em]" style={{ color: '#004458' }}>
          {startDigits}
        </span>
        <span className="ml-1 text-xl font-semibold" style={{ color: '#7DA0AB' }}>
          {startMeridiem}
        </span>
        <span className="mx-2 text-xl font-medium" style={{ color: '#7DA0AB' }}>
          →
        </span>
        <span className="text-[34px] font-semibold tracking-[-0.02em]" style={{ color: '#004458' }}>
          {endDigits}
        </span>
        <span className="ml-1 text-xl font-semibold" style={{ color: '#7DA0AB' }}>
          {endMeridiem}
        </span>
      </div>

      <div className="mt-3 flex-1" style={{ borderTop: '1.5px dashed #C9DFE5' }} />

      <div className="mt-3 flex items-center gap-4 text-sm font-medium" style={{ color: '#2DA1C3' }}>
        <span className="flex items-center gap-1.5">
          <Hourglass size={14} strokeWidth={2} />
          {duration}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} strokeWidth={2} />
          {shortDate}
        </span>
      </div>
    </button>
  )
}

function HeroCarousel({ shifts, today, workspaceName, onSelectShift, onCenterChange }) {
  const cards = useMemo(() => buildCarouselCards(shifts, today), [shifts, today])
  const containerRef = useRef(null)
  const cardRefs = useRef([])
  const [centeredIndex, setCenteredIndex] = useState(0)

  useEffect(() => {
    const initialIndex = Math.max(
      cards.findIndex((card) => isSameLocalDay(card.date, today)),
      0,
    )
    setCenteredIndex(initialIndex)
    cardRefs.current[initialIndex]?.scrollIntoView({ inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cards[centeredIndex]) onCenterChange?.(cards[centeredIndex])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centeredIndex])

  function handleScroll() {
    const container = containerRef.current
    if (!container) return

    window.requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      let closestIndex = 0
      let closestDistance = Infinity

      cardRefs.current.forEach((node, index) => {
        if (!node) return
        const rect = node.getBoundingClientRect()
        const distance = Math.abs(rect.left + rect.width / 2 - containerCenter)
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      })

      setCenteredIndex((current) => (current === closestIndex ? current : closestIndex))
    })
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ scrollPaddingInline: '24px' }}
    >
      {cards.map((card, index) => (
        <div
          key={card.key}
          ref={(node) => {
            cardRefs.current[index] = node
          }}
          className="shrink-0 snap-center transition-opacity duration-200"
          style={{ width: '354px', opacity: index === centeredIndex ? 1 : 0.4 }}
        >
          {card.shift ? (
            <ShiftCarouselCard
              shift={card.shift}
              workspaceName={workspaceName}
              onSelectShift={onSelectShift}
            />
          ) : (
            <EmptyDayCard date={card.date} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Home({ user, role, onGoToManage }) {
  const [fullName, setFullName] = useState(null)
  const [workspaceName, setWorkspaceName] = useState(null)
  const [shifts, setShifts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [bellOpen, setBellOpen] = useState(false)
  const [centeredCard, setCenteredCard] = useState({ date: new Date(), shift: null })

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
          .select('full_name, workspace_id')
          .eq('id', user.id)
          .maybeSingle(),
        shiftsQuery,
        notificationsQuery,
      ])

      if (cancelled) return

      if (profileResult.error) {
        setError(profileResult.error.message)
        setFullName(null)
        setShifts([])
        setNotifications([])
        setLoading(false)
        return
      }

      if (shiftsResult.error) {
        setError(shiftsResult.error.message)
        setFullName(profileResult.data?.full_name ?? null)
        setShifts([])
        setNotifications([])
        setLoading(false)
        return
      }

      setFullName(profileResult.data?.full_name ?? null)
      setShifts(shiftsResult.data ?? [])
      setNotifications(notificationsResult.error ? [] : (notificationsResult.data ?? []))
      setLoading(false)

      const workspaceId = profileResult.data?.workspace_id
      if (workspaceId) {
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .maybeSingle()

        if (!cancelled) setWorkspaceName(workspaceData?.name ?? null)
      }
    }

    fetchHomeData()

    return () => {
      cancelled = true
    }
  }, [user.id, isCoordinator])

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
  const unreadCount = notifications.filter((n) => !n.read).length
  const isWorkingToday = shifts.some((shift) => isSameLocalDay(new Date(shift.starts_at), today))

  const notificationDropdown = bellOpen && (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={() => setBellOpen(false)}
        className="fixed inset-0 z-10 cursor-default"
      />
      <div className="absolute top-full right-0 z-20 mt-2 w-80 max-w-[80vw] rounded-xl border border-[#E8E6E3] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E8E6E3] p-4">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          <button
            type="button"
            onClick={() => setBellOpen(false)}
            aria-label="Close notifications"
            className="text-[#6B7280]"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-[#6B7280]">No notifications yet</p>
        ) : (
          <ul className="flex max-h-80 flex-col overflow-y-auto">
            {notifications.map((notification) => {
              const isApproved =
                notification.type === 'claim_approved' || notification.type === 'offer_claimed'

              return (
                <li
                  key={notification.id}
                  className="flex items-start gap-2 border-b border-[#E8E6E3] p-4 last:border-b-0"
                >
                  {isApproved ? (
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-[#16A34A]"
                      size={16}
                      strokeWidth={2}
                    />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 shrink-0 text-[#D97706]"
                      size={16}
                      strokeWidth={2}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{notification.message}</p>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">
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
    <div className="flex min-h-screen w-full flex-col bg-[#FCFCFC]">
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
          <div
            className="relative shrink-0"
            style={{ background: 'linear-gradient(to bottom, #009ECD 0%, #5DC7E6 50%, #FCFCFC 100%)' }}
          >
            <div className="flex items-center gap-3 px-6 pt-10">
              <GlassSquircle className="size-12">
                <span className="text-base font-bold text-white">{getInitials(fullName)}</span>
              </GlassSquircle>

              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-semibold text-white">
                  {headerDateFormatter.format(today)}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
                  <span className="size-2 shrink-0 rounded-full bg-white" />
                  {isWorkingToday ? 'You have a shift today' : 'No shift today'}
                </span>
              </div>

              <div className="flex-1" />

              <div className="relative shrink-0">
                <button type="button" onClick={handleBellClick} aria-label="Notifications">
                  <GlassSquircle className="size-12">
                    <Bell className="text-white" size={20} strokeWidth={2} />
                  </GlassSquircle>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-2.5 items-center justify-center rounded-full bg-red-500 ring-[1.5px] ring-white" />
                  )}
                </button>

                {notificationDropdown}
              </div>
            </div>

            <div className="mt-8 flex items-center px-6 pr-[26px]">
              <h1
                className="font-display text-[26px] font-bold"
                style={{ color: '#EAFAFF' }}
              >
                {weekdayLongFormatter.format(centeredCard.date)}
              </h1>

              <div className="flex-1" />

              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-white/60" />
                <span className="h-2 w-[18px] rounded-full bg-white" />
                <span className="size-2 rounded-full bg-white/60" />
              </div>
            </div>

            {!loading && !error && (
              <div className="mt-4 pb-6">
                {shifts.length === 0 ? (
                  <NoShiftsCard />
                ) : (
                  <>
                    <HeroCarousel
                      shifts={shifts}
                      today={today}
                      workspaceName={workspaceName}
                      onSelectShift={setSelectedShift}
                      onCenterChange={setCenteredCard}
                    />

                    {centeredCard.shift && (
                      <div className="mt-4">
                        <ShiftProgressBar shift={centeredCard.shift} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && error && (
          <p className="mt-6 px-5 text-sm text-red-700">Could not load home data: {error}</p>
        )}

        {!loading && !error && (
          <div className={cn('flex flex-1 flex-col', isCoordinator && 'mt-[30px]')}>
            {isCoordinator ? (
              <div className="px-5">
                <CoordinatorSummary
                  shifts={shifts}
                  today={today}
                  firstName={firstName}
                  onGoToManage={onGoToManage}
                />
              </div>
            ) : (
              <NurseSummary
                shifts={shifts}
                userId={user.id}
                onSelectShift={setSelectedShift}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// Home's list-section card, used identically by both "My Upcoming Shifts" and "Open
// Shifts" (same layout, different data source/header per product decision). Facility
// line matches Schedule's "Burlingame SNF · UNIT 1" convention (Shiftko is
// single-facility, Burlingame-only, per the pivot decision) rather than the iOS
// spec's original department+facility pattern, so Home and Schedule read consistently.
function HomeShiftCard({ shift, onSelectShift }) {
  const period = getShiftPeriod(shift.starts_at)
  const shiftDate = new Date(shift.starts_at)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectShift(shift)}
        className="flex h-[86px] w-full items-center gap-3.5 rounded-[20px] border border-[#DDE5E8] bg-[#FCFCFC] px-4 text-left shadow-[0px_2px_7px_rgba(0,0,0,0.08)]"
      >
        <div className="flex w-11 shrink-0 flex-col items-center gap-[0.75px] text-center">
          <span className="text-[12px] font-medium tracking-wide text-[#888888] uppercase">
            {weekdayFormatter.format(shiftDate)}
          </span>
          <span className="text-[18px] font-semibold text-[#282828]">{shiftDate.getDate()}</span>
          <span className="text-[12px] font-medium tracking-wide text-[#888888] uppercase">
            {monthFormatter.format(shiftDate)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium text-[#282828]">
            {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-[7px]">
            <span className="size-[5px] shrink-0 rounded-full bg-[#2DA1C3]" aria-hidden="true" />
            <p className="truncate text-[14px] font-medium text-[#282828]">Burlingame SNF</p>
            <span className="text-[#C9DFE5]" aria-hidden="true">
              |
            </span>
            <p className="shrink-0 text-[14px] font-medium text-[#2DA1C3] uppercase">
              {shift.unit}
            </p>
          </div>
        </div>

        <ShiftPeriodPill period={period} />
      </button>
    </li>
  )
}

function NurseSummary({ shifts, userId, onSelectShift }) {
  const [openShifts, setOpenShifts] = useState([])
  const [openShiftsLoading, setOpenShiftsLoading] = useState(true)

  const upcomingShifts = shifts.filter((shift) => isWithinNextSevenDays(shift.starts_at))

  useEffect(() => {
    let cancelled = false

    async function fetchOpenShifts() {
      setOpenShiftsLoading(true)

      const { data: profile } = await supabase
        .from('profiles')
        .select('home_unit')
        .eq('id', userId)
        .maybeSingle()

      if (cancelled) return

      const unit = profile?.home_unit ?? null
      if (!unit) {
        setOpenShifts([])
        setOpenShiftsLoading(false)
        return
      }

      const { data } = await supabase
        .from('shifts')
        .select('id, unit, starts_at, ends_at')
        .eq('status', 'open')
        .eq('unit', unit)
        .order('starts_at', { ascending: true })
        .limit(3)

      if (cancelled) return

      setOpenShifts(data ?? [])
      setOpenShiftsLoading(false)
    }

    fetchOpenShifts()

    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#282828]" style={{ letterSpacing: '-0.4px' }}>
            My Upcoming Shifts
          </h2>
          <span className="flex items-center gap-0.5 text-[15px] font-medium" style={{ color: '#3A798B' }}>
            See All <ChevronRight size={14} strokeWidth={2.5} />
          </span>
        </div>

        {upcomingShifts.length === 0 ? (
          <p className="mt-3 text-[15px]" style={{ color: '#7DA0AB' }}>
            Nothing in the next 7 days
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcomingShifts.map((shift) => (
              <HomeShiftCard key={shift.id} shift={shift} onSelectShift={onSelectShift} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#282828]" style={{ letterSpacing: '-0.4px' }}>
            Open Shifts
          </h2>
          <span className="flex items-center gap-0.5 text-[15px] font-medium" style={{ color: '#3A798B' }}>
            See All <ChevronRight size={14} strokeWidth={2.5} />
          </span>
        </div>

        {!openShiftsLoading && openShifts.length === 0 ? (
          <p className="mt-3 text-[15px]" style={{ color: '#7DA0AB' }}>
            No open shifts right now
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {openShifts.map((shift) => (
              <HomeShiftCard key={shift.id} shift={shift} onSelectShift={onSelectShift} />
            ))}
          </ul>
        )}
      </section>
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
        className="font-display text-[26px] font-semibold"
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
                <div className="flex items-center gap-4 rounded-card bg-white p-4 shadow-sm border border-[#E8E6E3]">
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
        className="mt-9 h-auto w-full rounded-full bg-ink py-4 text-base font-semibold text-white hover:bg-ink/90"
      >
        Go to Manage
      </Button>
    </section>
  )
}
