import { ArrowLeft } from 'lucide-react'

// Shared top row for every step of onboarding: the back control and the progress
// track.
//
// The fill is DERIVED from step/total rather than written into each screen. It
// used to be hardcoded per screen (30px, 60px, 90px, 120px and a full 150px on a
// 150px track), which meant two things went wrong silently: every screen had to
// be re-tuned by hand whenever the flow gained or lost a step, and the fractions
// stopped agreeing with each other. Screen5 sat at 150px, reading as 100% done
// while two steps still followed it.
//
// `total` counts the steps that show a bar. The invite screen sits before the
// flow and the final celebration has no bar, so neither counts toward it.
const TRACK_WIDTH = 150

export default function FlowTopBar({ step = 1, total = 4, onBack, backTestId }) {
  const fill = Math.round((TRACK_WIDTH * step) / total)

  return (
    <div className="-ml-2 flex items-center gap-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        data-testid={backTestId}
        className="flex h-8 w-8 shrink-0 items-center justify-center"
      >
        <ArrowLeft size={20} strokeWidth={2} className="text-ink-secondary" />
      </button>
      <div
        className="h-[10px] w-[150px] rounded-full bg-track-neutral"
        role="progressbar"
        aria-label={`Step ${step} of ${total}`}
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-teal" style={{ width: `${fill}px` }} />
      </div>
    </div>
  )
}
