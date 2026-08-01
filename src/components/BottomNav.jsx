import { Home, Calendar, Waves, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs text-gray-400',
              isActive && 'font-semibold',
            )}
          >
            <Icon className={isActive ? 'text-teal-mid' : undefined} size={22} strokeWidth={isActive ? 2.25 : 2} />
            <span className={isActive ? 'text-[#282828]' : undefined}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
