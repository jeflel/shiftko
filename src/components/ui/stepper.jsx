import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Generic N-step progress stepper (stepper-wrap/stepper-track/stepper-dots in
// the Linear Light source). Extracted from ClaimStatusDetail.jsx's local
// ClaimStepper once the Swap flow needed the same shape a second time (steps
// differ - Claimed/Pending Approval/Approved vs Requested/Accepted/Approved -
// but the visual mechanics don't), per the rollout's "duplicate once, extract
// on the second use" pattern.
//
// `steps`: [{ label, done, current, failed }]. `failed` turns that step (and
// the connector leading into it) red instead of teal - used by both flows'
// invented negative-outcome variants (Claims' Denied, Swaps' Declined/Denied),
// none of which have a mockup: the terminal step's label and color change,
// the rest of the shape stays identical to the positive path.
export function Stepper({ steps }) {
  const segments = steps.length - 1
  const doneCount = Math.min(steps.filter((step) => step.done).length, Math.max(segments, 0))
  const progressPercent = segments > 0 ? (doneCount / segments) * 100 : 0
  const failed = steps.some((step) => step.failed)

  return (
    <div className="relative pt-1">
      <div className="absolute top-[18px] right-[33px] left-[33px] h-0.5 bg-track-neutral" />
      <div
        className={cn('absolute top-[18px] left-[33px] h-0.5', failed ? 'bg-status-denied-fg' : 'bg-teal')}
        style={{ width: `calc((100% - 66px) * ${progressPercent / 100})` }}
      />
      <div className="relative z-10 flex flex-row justify-between">
        {steps.map((step, index) => (
          <div key={step.label} className="flex w-[70px] flex-col items-center gap-1.5">
            <span
              className={cn(
                'flex size-[26px] items-center justify-center rounded-full border-2 text-[11px] font-semibold',
                step.failed
                  ? 'border-status-denied-fg bg-status-denied-fg text-white'
                  : step.done
                    ? 'border-teal-foreground bg-teal-foreground text-white'
                    : step.current
                      ? 'border-teal-foreground bg-card-surface text-teal-foreground'
                      : 'border-hairline bg-card-surface text-ink-secondary',
              )}
            >
              {step.failed || step.done ? <Check size={12} strokeWidth={2.5} /> : index + 1}
            </span>
            <span
              className={cn(
                'text-center text-[11px] leading-tight font-medium tracking-[-0.01em]',
                step.done || step.current || step.failed ? 'font-semibold text-ink' : 'text-ink-secondary',
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
