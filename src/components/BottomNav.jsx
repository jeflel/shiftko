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
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-1 rounded-full border border-white bg-white/70 px-2 py-2 shadow-[0_6px_20px_10px_rgba(0,0,0,0.07)] backdrop-blur-md">
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
                'flex flex-col items-center gap-1 rounded-full px-4 py-1.5 text-xs text-gray-400',
                isActive && 'font-semibold',
              )}
            >
              <Icon className={isActive ? 'text-teal-mid' : undefined} size={22} strokeWidth={isActive ? 2.25 : 2} />
              <span className={isActive ? 'text-[#282828]' : undefined}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
