import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PeriodTag } from '@/components/ui/period-tag'
import FlowTopBar from './FlowTopBar'

// "Never miss a shift." The alert ask, placed after the payoff screen rather than
// at the end of the flow, because that is the moment the value is felt: she has
// just seen the shifts she would have missed.
//
// The copy is assembled from her own answers, which is what makes the ask read as
// a specific promise instead of a generic nag. It names the periods she picked
// (rendered as the app's own period tags, so the colour code is learned here and
// recognised on every shift card afterwards) and the unit she chose.
//
// Email is the channel because iOS web push only works for a web app added to
// the Home Screen, so a nurse opening shiftko.com in Safari cannot receive push
// at all. Email reaches her with no install. Push is the later upgrade.
const PERIOD_LABEL = { day: 'Day', evening: 'Evening', night: 'Night' }

function PeriodPhrase({ periods }) {
  const labels = periods.map((key) => PERIOD_LABEL[key]).filter(Boolean)
  if (labels.length === 0) return <>an open</>
  if (labels.length === 1) return <>a <PeriodTag period={labels[0]} variant="bare" /></>
  return (
    <>
      {labels.map((label, index) => (
        <span key={label}>
          {index > 0 && (index === labels.length - 1 ? ' or ' : ', ')}
          <PeriodTag period={label} variant="bare" />
        </span>
      ))}
    </>
  )
}

export default function ScreenAlerts({
  step = 6,
  total = 6,
  email = '',
  unit = '',
  periods = [],
  onBack,
  onContinue,
}) {
  const [enabled, setEnabled] = useState(true)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
      <FlowTopBar step={step} total={total} onBack={onBack} backTestId="screenalerts-back" />

      <h1 className="mt-10 text-[30px] leading-[1.2] font-semibold tracking-[-0.6px] text-ink">
        Never miss a shift.
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-ink-secondary">
        Shifts go fast, usually within the hour.
      </p>

      <div className="mt-8 rounded-card border border-hairline bg-card-surface p-5 shadow-card-lift">
        <div className="flex flex-row items-center justify-between">
          <span className="text-[17px] font-semibold text-ink">Email alerts</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Email alerts"
            onClick={() => setEnabled((current) => !current)}
            data-testid="screenalerts-toggle"
            className={`flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors ${
              enabled ? 'justify-end bg-teal-field' : 'justify-start bg-track-neutral'
            }`}
          >
            <span className="block size-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]" />
          </button>
        </div>

        <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.15px] text-ink-secondary">
          We&apos;ll email{' '}
          <span className="font-semibold text-ink">{email || 'your email on file'}</span> when{' '}
          <PeriodPhrase periods={periods} /> shift opens on{' '}
          <span className="font-semibold text-ink">{unit || 'your unit'}</span>.
        </p>
      </div>

      <p className="mt-3 text-[15px] tracking-[0.15px] text-ink-secondary">
        You can turn this off any time in your profile.
      </p>

      <Button
        type="button"
        onClick={() => onContinue(enabled)}
        data-testid="screenalerts-continue"
        className="mt-auto h-[54px] w-full"
      >
        {enabled ? 'Turn on alerts' : 'Continue'}
      </Button>
      <button
        type="button"
        onClick={() => onContinue(false)}
        data-testid="screenalerts-skip"
        className="mt-4 text-center text-[15px] tracking-[-0.3px] text-ink-secondary"
      >
        Not now
      </button>
    </main>
  )
}
