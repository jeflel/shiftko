import { useEffect, useState } from 'react'
import { Calendar, Users, AlertTriangle, CheckCircle2, Bell, X, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ShiftDetail from './ShiftDetail'
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

const HOME_PERIOD_STYLES = {
  Day: { label: 'Morning', article: 'a', bg: '#FFF1E3', text: '#B57F1A' },
  Evening: { label: 'Evening', article: 'an', bg: '#E5F7FF', text: '#153884' },
  Night: { label: 'Night', article: 'a', bg: '#F5DDFF', text: '#2D199A' },
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

function HomePeriodPill({ period }) {
  const config = HOME_PERIOD_STYLES[period] ?? { label: period, bg: '#F3F4F6', text: '#6B7280' }
  return (
    <span
      className="shrink-0 rounded-[7px] px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  )
}

export default function Home({ user, role, onGoToManage }) {
  const [fullName, setFullName] = useState(null)
  const [credential, setCredential] = useState(null)
  const [workspaceName, setWorkspaceName] = useState(null)
  const [shifts, setShifts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const [bellOpen, setBellOpen] = useState(false)

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
          .select('full_name, credential, workspace_id')
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
        setShifts([])
        setNotifications([])
        setLoading(false)
        return
      }

      if (shiftsResult.error) {
        setError(shiftsResult.error.message)
        setFullName(profileResult.data?.full_name ?? null)
        setCredential(profileResult.data?.credential ?? null)
        setShifts([])
        setNotifications([])
        setLoading(false)
        return
      }

      setFullName(profileResult.data?.full_name ?? null)
      setCredential(profileResult.data?.credential ?? null)
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

  async function handleDismissNotification(id) {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#EFFDFF] via-[#D2F3FC] to-[#EFFDFF]">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pt-10 pb-12">
        <div className="shrink-0 flex items-center justify-between px-5">
          <Wordmark />

          {!isCoordinator && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handleBellClick}
                aria-label="Notifications"
                className="relative"
              >
                <Bell className="text-teal-dark" size={26} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex size-[18px] items-center justify-center rounded-full bg-[#F97316] text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
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
                          const isApproved = notification.type === 'claim_approved'

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
              )}
            </div>
          )}
        </div>

        {!loading && error && (
          <p className="mt-6 px-5 text-sm text-red-700">Could not load home data: {error}</p>
        )}

        {!loading && !error && (
          <div className="mt-[30px] flex flex-1 flex-col">
            {isCoordinator ? (
              <div className="px-5">
                <CoordinatorSummary
                  shifts={shifts}
                  today={today}
                  todayLabel={todayLabel}
                  firstName={firstName}
                  onGoToManage={onGoToManage}
                />
              </div>
            ) : (
              <NurseSummary
                shifts={shifts}
                today={today}
                todayLabel={todayLabel}
                firstName={firstName}
                credential={credential}
                workspaceName={workspaceName}
                userId={user.id}
                onSelectShift={setSelectedShift}
                notifications={notifications}
                onDismissNotification={handleDismissNotification}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function NotificationBanner({ notification, onDismiss }) {
  const isApproved = notification.type === 'claim_approved'

  return (
    <div
      className={cn(
        'relative rounded-xl border-l-4 p-4',
        isApproved ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50',
      )}
    >
      <div className="flex items-start gap-2 pr-6">
        {isApproved ? (
          <CheckCircle2 className="mt-0.5 shrink-0 text-[#16A34A]" size={16} strokeWidth={2} />
        ) : (
          <AlertTriangle className="mt-0.5 shrink-0 text-[#D97706]" size={16} strokeWidth={2} />
        )}
        <p className={cn('text-sm', isApproved ? 'text-[#166534]' : 'text-[#92400E]')}>
          {notification.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
        className={cn('absolute top-3 right-3', isApproved ? 'text-[#16A34A]' : 'text-[#D97706]')}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

function ShiftRow({ shift, workspaceName, onSelectShift }) {
  const period = getShiftPeriod(shift.starts_at)
  const shiftDate = new Date(shift.starts_at)
  const [startTime, endTime] = formatShiftTimeRange(shift.starts_at, shift.ends_at).split(' – ')
  const [startDigits, startMeridiem] = startTime.split(' ')
  const [endDigits, endMeridiem] = endTime.split(' ')

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectShift(shift)}
        className="flex w-full items-center gap-3.5 py-3.5 text-left"
      >
        <div className="flex w-11 shrink-0 flex-col items-center gap-[0.75px] text-center">
          <span className="text-[10px] font-medium tracking-wide text-[#6B7280] uppercase">
            {weekdayFormatter.format(shiftDate)}
          </span>
          <span className="text-[22px] font-bold text-[#111111]">{shiftDate.getDate()}</span>
          <span className="text-[10px] font-medium tracking-wide text-[#6B7280] uppercase">
            {monthFormatter.format(shiftDate)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[#1A1A1A]">
            <span className="text-[17px]">{startDigits}</span>
            <span className="text-[13px]"> {startMeridiem}</span>
            <span className="text-[17px]"> – {endDigits}</span>
            <span className="text-[13px]"> {endMeridiem}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-[#6B7280]">
            <span className="font-semibold text-[#3A798B]">{shift.unit}</span>
            {workspaceName && `  |  ${workspaceName}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <HomePeriodPill period={period} />
          <ChevronRight className="text-[#9CA3AF]" size={18} strokeWidth={2} />
        </div>
      </button>
    </li>
  )
}

function NurseSummary({
  shifts,
  today,
  todayLabel,
  firstName,
  credential,
  workspaceName,
  userId,
  onSelectShift,
  notifications,
  onDismissNotification,
}) {
  const [coworkers, setCoworkers] = useState([])
  const [openShifts, setOpenShifts] = useState([])
  const [openShiftsLoading, setOpenShiftsLoading] = useState(true)

  const todayShifts = shifts.filter((shift) => isSameLocalDay(new Date(shift.starts_at), today))
  const upcomingShifts = shifts.filter((shift) => isWithinNextSevenDays(shift.starts_at))
  const isWorkingToday = todayShifts.length > 0
  const primaryTodayShift = todayShifts[0]
  const primaryPeriod = primaryTodayShift ? getShiftPeriod(primaryTodayShift.starts_at) : null
  const periodConfig = primaryPeriod ? HOME_PERIOD_STYLES[primaryPeriod] : null

  useEffect(() => {
    if (!primaryTodayShift) {
      setCoworkers([])
      return
    }

    let cancelled = false

    async function fetchCoworkers() {
      const { data } = await supabase
        .from('shifts')
        .select(`
          id,
          nurse_id,
          profiles!nurse_id ( full_name )
        `)
        .eq('unit', primaryTodayShift.unit)
        .neq('nurse_id', userId)
        .lt('starts_at', primaryTodayShift.ends_at)
        .gt('ends_at', primaryTodayShift.starts_at)

      if (cancelled) return

      const uniqueCoworkers = []
      const seenNurseIds = new Set()

      for (const row of data ?? []) {
        if (seenNurseIds.has(row.nurse_id)) continue
        seenNurseIds.add(row.nurse_id)
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        uniqueCoworkers.push({ nurseId: row.nurse_id, full_name: profile?.full_name ?? null })
      }

      setCoworkers(uniqueCoworkers)
    }

    fetchCoworkers()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTodayShift?.id, userId])

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
    <div className="flex flex-1 flex-col">
      <div className="shrink-0 px-5">
      <p className="text-sm font-medium text-teal-dark">{todayLabel}</p>
      <p className="font-display mt-1 text-[23px] leading-snug font-semibold">
        <span style={{ color: '#20748C' }}>{getGreeting()},</span>
        {firstName && <span style={{ color: '#7CB9CA' }}> {firstName}</span>}
        <br />
        {isWorkingToday && periodConfig ? (
          <>
            <span style={{ color: '#7CB9CA' }}>You have {periodConfig.article}</span>
            <span style={{ color: '#20748C' }}> {periodConfig.label.toLowerCase()} shift</span>
            <span style={{ color: '#7CB9CA' }}> today.</span>
          </>
        ) : (
          <span style={{ color: '#7CB9CA' }}>You have the day off.</span>
        )}
      </p>

      {isWorkingToday && (
        <div className="mt-5 flex flex-col gap-3">
          {todayShifts.map((shift, index) => {
            const [startTime, endTime] = formatShiftTimeRange(shift.starts_at, shift.ends_at).split(' – ')
            const [startDigits, startMeridiem] = startTime.split(' ')
            const [endDigits, endMeridiem] = endTime.split(' ')

            return (
              <div
                key={shift.id}
                className="rounded-[30px] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-baseline">
                  <span className="text-[36px] font-medium text-[#111111]">{startDigits}</span>
                  <span className="ml-1 text-base font-medium text-[#3A798B]">{startMeridiem}</span>
                  <span className="mx-2 text-xl text-[#6B7280]">→</span>
                  <span className="text-[36px] font-medium text-[#111111]">{endDigits}</span>
                  <span className="ml-1 text-base font-medium text-[#3A798B]">{endMeridiem}</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-[#E0F7FA] px-2.5 py-1 text-xs font-medium text-teal-mid">
                    {shift.unit}
                  </span>
                  {credential && <span className="text-[13px] text-[#1A1A1A]">{credential}</span>}
                </div>

                {index === 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectShift(shift)}
                    className="mt-3 flex items-center"
                  >
                    <div className="flex items-center">
                      {coworkers.slice(0, 3).map((coworker, avatarIndex) => (
                        <div
                          key={coworker.nurseId}
                          className={cn(
                            'flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold',
                            avatarIndex > 0 && '-ml-2.5',
                          )}
                          style={{ backgroundColor: '#20748C', color: '#DDF7FF' }}
                        >
                          {getInitials(coworker.full_name)}
                        </div>
                      ))}
                      {coworkers.length > 3 && (
                        <div className="-ml-2.5 flex size-8 items-center justify-center rounded-full border-2 border-white bg-teal-mid text-xs font-bold text-white">
                          +{coworkers.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="ml-2.5 text-[14px] font-medium" style={{ color: '#20748C' }}>
                      see who's working →
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {notifications.some((n) => !n.read) && (
        <div className="mt-5 flex flex-col gap-2">
          {notifications
            .filter((n) => !n.read)
            .map((notification) => (
              <NotificationBanner
                key={notification.id}
                notification={notification}
                onDismiss={onDismissNotification}
              />
            ))}
        </div>
      )}
      </div>

      <div className="mt-6 flex-1 rounded-t-[40px] bg-white px-6 pt-6 pb-10">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-[#111111]">Upcoming Shifts</h2>
            <span className="text-sm text-[#6B7280]">See All ↓</span>
          </div>

          {upcomingShifts.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No upcoming shifts</p>
          ) : (
            <ul className="mt-1 flex flex-col divide-y divide-[#F3F4F6]">
              {upcomingShifts.map((shift) => (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  workspaceName={workspaceName}
                  onSelectShift={onSelectShift}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-[#111111]">Open Shifts</h2>
            <span className="text-sm text-[#6B7280]">See All ↓</span>
          </div>

          {!openShiftsLoading && openShifts.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No open shifts right now</p>
          ) : (
            <ul className="mt-1 flex flex-col divide-y divide-[#F3F4F6]">
              {openShifts.map((shift) => (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  workspaceName={workspaceName}
                  onSelectShift={onSelectShift}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function CoordinatorSummary({ shifts, today, todayLabel, firstName, onGoToManage }) {
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
      <p className="text-sm font-medium text-teal-dark">{todayLabel}</p>
      <p className="font-display mt-1 text-[23px] leading-snug font-semibold">
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
