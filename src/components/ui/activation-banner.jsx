import { Fragment } from 'react'
import { Check, ChevronRight, Plus, Search } from 'lucide-react'
import { ACTIVATION_NODES } from '@/lib/activation'
import { cn } from '@/lib/utils'

// Home's "Get started" banner: the activation checklist that takes the Request
// Activity slot until it is finished or dismissed.
//
// Three zones, no sentences doing a component's job:
//   1. card header, the same label-left / chip-right shape as Home's Today card
//   2. the milestone track, the only thing on Home shaped like this
//   3. the next step as a real row, sharing the quick tiles' 32px icon-tile,
//      13px title and 11px subline geometry
//
// The whole card is the tap target while there is a next step, so the chevron is
// the affordance rather than a second button competing with Skip for now in the
// section header above.
//
// The connectors are real flex boxes between the nodes rather than one
// absolutely positioned line with a hardcoded inset: the nodes are 78px boxes
// with a 28px dot inside them, so a line placed by pixel offset only lines up at
// the exact card width it was measured at, while flex connectors line up by
// construction at any width.
function ActivationTrack({ done, currentIndex }) {
  return (
    <div className="flex items-start pt-[3px]" aria-hidden="true">
      {ACTIVATION_NODES.map((node, index) => {
        const isDone = done[index]
        const isCurrent = index === currentIndex && !isDone

        return (
          <Fragment key={node.key}>
            {index > 0 && (
              <div
                className={cn(
                  'mt-[13px] h-0.5 flex-1 rounded-[2px]',
                  done[index - 1] ? 'bg-teal' : 'bg-track-neutral',
                )}
              />
            )}
            <div className="flex w-[78px] flex-none flex-col items-center gap-[7px]">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold',
                  isDone
                    ? 'border-teal-foreground bg-teal-foreground text-white'
                    : isCurrent
                      ? 'border-teal-foreground bg-card-surface text-teal-foreground shadow-[0_0_0_4px_var(--color-teal-tint)]'
                      : 'border-hairline bg-card-surface text-ink-secondary',
                )}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-center text-[11px] leading-[1.2] tracking-[-0.01em]',
                  isDone || isCurrent
                    ? 'font-semibold text-ink'
                    : 'font-medium text-ink-secondary',
                )}
              >
                {node.label}
              </span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

export function ActivationBanner({ mode, done, currentIndex, nextStep, firstName, onNext }) {
  const isComplete = mode === 'complete'
  const NextIcon = nextStep?.action === 'claim' ? Search : Plus
  const label = isComplete
    ? `You're all set${firstName ? `, ${firstName}` : ''}`
    : 'Welcome aboard'

  // deriveActivation guarantees a next step outside 'complete' mode (node 1 is
  // always done, so the current node is never the terminal one). Guarded anyway:
  // a future edit to the step model should degrade to a read-only card rather
  // than take the whole Home screen down.
  const canAdvance = !isComplete && Boolean(nextStep)

  const shell = cn(
    'flex w-full flex-col gap-[13px] rounded-card border border-[#5dc7e6] bg-white px-4 py-[15px] text-left shadow-card-lift',
    canAdvance && 'transition-colors active:bg-press-state',
  )

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
          {label}
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-control-sm px-2 py-[3px] text-[11px] font-semibold',
            isComplete ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-teal-tint text-teal-foreground',
          )}
        >
          {isComplete && <Check size={10} strokeWidth={3.4} />}
          {isComplete ? 'Complete' : `Step ${currentIndex + 1} of ${ACTIVATION_NODES.length}`}
        </span>
      </div>

      <ActivationTrack done={done} currentIndex={currentIndex} />

      {/* Zone 3 drops out entirely once it is done: there is nothing left to tap,
          and a row that looks tappable but is not reads worse than no row. */}
      {canAdvance && (
        <div className="flex items-center gap-2.5 border-t border-hairline pt-[13px]">
          <span className="flex size-8 flex-none items-center justify-center rounded-control bg-teal-tint text-teal-foreground">
            <NextIcon size={16} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold tracking-[-0.01em] text-ink">
              {nextStep.title}
            </span>
            <span className="block text-[11px] text-ink-secondary">{nextStep.subline}</span>
          </span>
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-chevron-muted" />
        </div>
      )}
    </>
  )

  if (!canAdvance) {
    return <div className={shell}>{body}</div>
  }

  return (
    <button
      type="button"
      onClick={() => onNext?.(nextStep.action)}
      data-testid="home-activation-banner"
      // The track is decorative; the button carries the whole state in one line
      // for a screen reader instead of reading four node labels as prose.
      aria-label={`Get started, step ${currentIndex + 1} of ${ACTIVATION_NODES.length}: ${nextStep.title}`}
      className={shell}
    >
      {body}
    </button>
  )
}
