import { cn } from '@/lib/utils'

// Per DESIGN.md's Segmented Controls (shiftko-design-v2-visual-pass-dup):
// track-neutral background, 11px radius, 3px inset padding, each segment 8px
// radius. Active state is carried by white-fill contrast alone, no shadow.
export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      className="flex gap-1 rounded-[11px] bg-track-neutral p-[3px]"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex-1 rounded-[8px] px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ease-out',
              isActive ? 'bg-card-surface text-ink' : 'bg-transparent text-ink-secondary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
