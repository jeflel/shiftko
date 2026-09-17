import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Notifications from '@/pages/Notifications'

// Home's header controls: the notification bell and the profile avatar, sitting
// on the same line as the greeting.
//
// This replaced the shared sticky top bar. That bar carried the wordmark and a
// Beta pill on a solid `#0AA2CF` band and was pinned on all four tab pages;
// Jefle took it off Schedule, Pool and Profile first (2026-09-16), then off Home
// as well, dropping the wordmark along with it and moving these two controls
// down onto the greeting row. Nothing is pinned above Home's hero any more.
//
// Self-contained on purpose: it fetches its own notifications and owns the
// panel, so Home only has to render `<HomeHeaderActions user={user} />`. Home
// keeps its own notifications fetch because its Request Activity card needs the
// same data; that second query is cheap and keeps the card's logic where it lives.
export function HomeHeaderActions({ user, initials: initialsProp, onOpenProfile }) {
  const [initials, setInitials] = useState(initialsProp ?? '')
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (initialsProp) setInitials(initialsProp)
  }, [initialsProp])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function load() {
      const [profileResult, notificationsResult] = await Promise.all([
        initialsProp
          ? Promise.resolve({ data: null })
          : supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return

      if (!initialsProp) {
        const name = profileResult?.data?.full_name?.trim()
        setInitials(name ? getInitials(name) : '')
      }
      setNotifications(notificationsResult?.data ?? [])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, initialsProp])

  const hasUnread = notifications.some((notification) => !notification.read)

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length) {
      setNotifications((current) => current.map((n) => ({ ...n, read: true })))
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    }
  }

  async function openNotification(notification) {
    setNotifications((current) =>
      current.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    )
    await supabase.from('notifications').update({ read: true }).eq('id', notification.id)
  }

  if (showNotifications) {
    return (
      <Notifications
        notifications={notifications}
        onBack={() => setShowNotifications(false)}
        onMarkAllRead={markAllRead}
        onOpenNotification={openNotification}
      />
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setShowNotifications(true)}
        aria-label="Notifications"
        data-testid="top-bar-bell"
        className="home-glass-ring relative flex size-9 shrink-0 items-center justify-center rounded-control bg-white/20 text-white"
      >
        <Bell size={18} strokeWidth={1.75} />
        {hasUnread && (
          <span className="absolute top-[6px] right-[6px] size-2 rounded-full bg-urgency-red ring-2 ring-[#0AA2CF]" />
        )}
      </button>

      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Profile"
        data-testid="top-bar-profile"
        className="home-glass-ring relative flex size-9 shrink-0 items-center justify-center rounded-control bg-white/20 text-xs font-semibold tracking-[0.02em] text-white"
      >
        {initials}
      </button>
    </div>
  )
}

function getInitials(fullName) {
  if (!fullName) return ''
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
