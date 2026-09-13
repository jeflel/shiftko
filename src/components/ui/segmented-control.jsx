import { cn } from '@/lib/utils'

// Per DESIGN.md's Segmented Controls (shiftko-design-v2-visual-pass-dup):
// #F2F2F7 track, 12px radius, 3px inset padding, each segment 9px radius.
// Active state is white fill plus a soft 1px lift shadow.
export function SegmentedControl({ options, value, onChange, ariaLabel, testidPrefix }) {
  return (
    <div
      className="flex gap-1 rounded-[12px] bg-press-state p-[3px]"
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
            data-testid={testidPrefix ? `${testidPrefix}-${option.id}` : undefined}
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex-1 rounded-[9px] px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ease-out',
              isActive
                ? 'bg-card-surface text-ink shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                : 'bg-transparent text-ink-secondary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
