import { cn } from '@/lib/utils'

// Segmented control, 12px track radius with 3px inset padding and 9px
// segments, per DESIGN.md's geometry. The active treatment departs from the
// source's white-on-#F2F2F7 (2026-09-17, Jefle): that pair is 1.05:1 apart in
// both directions, so on the Schedule header the control had no visible edge and
// no visible thumb. The active segment is now filled with teal-foreground
// (#0E7490, white text at 5.6:1, the same dark teal the app already uses for
// primary buttons and the selected calendar day), on a track-neutral #EDEDF2
// track that the header's small list/calendar toggle already used, so the two
// controls read as one family and teal marks only the primary choice.
export function SegmentedControl({ options, value, onChange, ariaLabel, testidPrefix }) {
  return (
    <div
      className="flex gap-1 rounded-[12px] bg-track-neutral p-[3px]"
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
              'flex-1 rounded-[9px] px-3 py-2 text-[13px] whitespace-nowrap transition-colors duration-[var(--motion-base)] ease-in-out',
              isActive
                ? 'bg-teal-foreground font-semibold text-white shadow-[0_2px_6px_rgba(14,116,144,0.28)]'
                : 'bg-transparent font-medium text-ink-secondary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
