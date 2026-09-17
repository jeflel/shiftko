import { Home, Calendar, Waves, CircleUserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'more', label: 'Profile', icon: CircleUserRound },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div className="flex min-w-0 items-center gap-1 rounded-full border border-hairline bg-card-surface px-2 py-2 shadow-[0_4px_18px_rgba(29,29,31,0.10),0_1px_3px_rgba(29,29,31,0.06)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`nav-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex w-[76px] flex-col items-center gap-1 rounded-card py-1.5 text-xs text-ink-secondary transition-colors duration-150 ease-out',
                isActive && 'bg-teal-tint font-semibold text-teal-foreground',
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.25 : 2} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
