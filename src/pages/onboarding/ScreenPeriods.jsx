import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SHIFT_PRESETS } from '@/lib/shiftPresets'
import FlowTopBar from './FlowTopBar'

// "When do you usually work?" replaces the old pain-points screen.
//
// The pain-points screen asked a nurse to critique her facility's process and
// wrote the answer nowhere (handlePainPoints took no argument and the profile
// update never included it), so it cost a step and collected nothing. This
// screen collects something the app actually uses: Open Shifts sorts to the
// periods a nurse picks up, and the alert copy on the next screen names them.
//
// The chips come from SHIFT_PRESETS rather than a local list, so the times shown
// here and the presets used by self-scheduling and coordinator posting cannot
// drift apart. Keys stored are the preset keys ('day', 'evening', 'night').
//
// This is a soft PREFERENCE, never a filter and never availability: it must not
// hide a shift a nurse could claim, and time-off requests are a separate
// deferred feature.
export default function ScreenPeriods({ step = 4, total = 6, onBack, onContinue }) {
  const [selected, setSelected] = useState([])

  function toggle(key) {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
      <FlowTopBar step={step} total={total} onBack={onBack} backTestId="screenperiods-back" />

      <h1 className="mt-10 text-[30px] leading-[1.2] font-semibold tracking-[-0.6px] text-ink">
        When do you usually work?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-ink-secondary">
        Pick any. We&apos;ll sort open shifts to match.
      </p>

      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          onContinue(selected)
        }}
      >
        <div className="mt-8 flex flex-col gap-2.5">
          {SHIFT_PRESETS.map(({ key, label, time, icon: Icon }) => {
            const isSelected = selected.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                data-testid={`screenperiods-${key}`}
                aria-pressed={isSelected}
                className={`flex h-[70px] w-full items-center gap-4 rounded-card border bg-white px-5 text-left transition-colors ${
                  isSelected
                    ? 'border-teal-foreground bg-teal-tint shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-hairline'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  className={isSelected ? 'shrink-0 text-teal-foreground' : 'shrink-0 text-ink-secondary'}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`text-[17px] tracking-[-0.17px] text-ink ${
                      isSelected ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[15px] tracking-[0.15px] text-ink-secondary">{time}</span>
                </span>
                <span
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${
                    isSelected ? 'bg-teal-field' : 'border border-hairline'
                  }`}
                >
                  {isSelected && <Check size={14} strokeWidth={2} className="text-white" />}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-[15px] tracking-[0.15px] text-ink-secondary">
          Nothing here is a commitment. You can change it any time.
        </p>

        <Button
          type="submit"
          data-testid="screenperiods-continue"
          className="mt-auto h-[54px] w-full"
        >
          Continue
        </Button>
        <button
          type="button"
          onClick={() => onContinue([])}
          data-testid="screenperiods-skip"
          className="mt-4 text-center text-[15px] tracking-[-0.3px] text-ink-secondary"
        >
          Skip for now
        </button>
      </form>
    </main>
  )
}
