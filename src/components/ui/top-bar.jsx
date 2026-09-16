import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Wordmark } from '@/components/ui/wordmark'
import Notifications from '@/pages/Notifications'

// Sticky app bar for the four tab pages: avatar, Shiftko wordmark, bell.
//
// The mockups only put this topbar on the Home screens (`.topbar`, a
// 1fr/auto/1fr grid, transparent over the hero gradient). Jefle asked for the
// same bar pinned on Schedule, Pool and Profile too, on a solid
// `#0AA2CF` band, which is the gradient's own start colour, so on Home it is
// seamless against the hero and elsewhere it reads as the "blue bar".
//
// Self-contained on purpose: it fetches its own notifications and owns the
// panel, so a page only has to render `<TopBar user={user} />`. Home keeps its
// own notifications fetch because its Request Activity card needs the same
// data; that second query is cheap and keeps the card's logic where it lives.
export function TopBar({ user, initials: initialsProp, onOpenProfile }) {
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
    <div className="sticky top-0 z-30 -mx-5 bg-[#0AA2CF] px-5 py-2.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Profile"
          data-testid="top-bar-profile"
          className="home-glass-ring relative flex size-9 shrink-0 items-center justify-center justify-self-start rounded-control bg-white/20 text-xs font-semibold tracking-[0.02em] text-white"
        >
          {initials}
        </button>

        <div className="flex items-center justify-center gap-1.5">
          <Wordmark size={16} className="text-white" />
          <span className="rounded-full border border-white/30 bg-white/20 px-[7px] py-[2px] text-[9px] font-bold tracking-[0.04em] text-white uppercase">
            Beta
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowNotifications(true)}
          aria-label="Notifications"
          data-testid="top-bar-bell"
          className="home-glass-ring relative flex size-9 shrink-0 items-center justify-center justify-self-end rounded-control bg-white/20 text-white"
        >
          <Bell size={18} strokeWidth={1.75} />
          {hasUnread && (
            <span className="absolute top-[6px] right-[6px] size-2 rounded-full bg-urgency-red ring-2 ring-[#0AA2CF]" />
          )}
        </button>
      </div>
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
