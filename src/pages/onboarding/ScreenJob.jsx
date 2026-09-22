import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FlowTopBar from './FlowTopBar'

// Credential and unit used to be two separate screens asking the same shape of
// question (pick one from a short list), which cost a step and told the user
// nothing new. They are one screen now.
//
// Credential keeps the tall selection rows because it carries a description per
// option. Unit is the lighter of the two choices, so it is one row of pills
// rather than four more 62px rows: stacking both would have put 580px of rows on
// a screen with a headline and a button above and below them.
//
// Units match the values already used on shifts and profiles. Which unit a nurse
// picks is what the open-shift RLS rule reads, so this is the field that decides
// which shifts she can see.
const CREDENTIALS = [
  { value: 'RN', label: 'RN', description: 'Registered Nurse' },
  { value: 'LVN', label: 'LVN', description: 'Licensed Vocational Nurse' },
  { value: 'CNA', label: 'CNA', description: 'Certified Nursing Assistant' },
]

const UNITS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4']

// The Selection Row's chip treatment, which the shift presets also use: neutral
// when unselected, the one accent teal when selected.
const unitChipClassName = (selected) =>
  `h-[46px] shrink-0 rounded-full border px-4 text-[15px] font-semibold tracking-[-0.01em] transition-colors ${
    selected
      ? 'border-teal-foreground bg-teal-tint text-teal-foreground'
      : 'border-hairline bg-card-surface text-ink-secondary'
  }`

export default function ScreenJob({
  step = 3,
  total = 4,
  defaultUnit = null,
  onBack,
  onContinue,
}) {
  const [credential, setCredential] = useState('RN')
  const [unit, setUnit] = useState(defaultUnit)

  // Awaited: OnboardingFlow writes credential and home_unit before advancing,
  // because the open-shifts screen reads through a policy that filters on the
  // profile's own home_unit.
  async function handleSubmit(event) {
    event.preventDefault()
    if (!unit) return
    await onContinue({ credential, unit })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
      <FlowTopBar step={step} total={total} onBack={onBack} backTestId="screenjob-back" />

      <h1 className="mt-10 text-[30px] font-semibold tracking-[-0.6px] text-ink">
        What do you work as?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-ink-secondary">
        Your credential and your unit are what open shifts get matched to.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-8 flex flex-col gap-2.5">
          {CREDENTIALS.map((option) => {
            const selected = credential === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCredential(option.value)}
                data-testid={`screenjob-credential-${option.value.toLowerCase()}`}
                className={`flex h-[78px] w-full items-center justify-between rounded-card border bg-white px-6 text-left transition-colors ${
                  selected
                    ? 'border-teal-foreground shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-hairline'
                }`}
              >
                <span>
                  <span
                    className={`block text-[17px] ${
                      selected ? 'font-semibold text-ink' : 'font-medium text-ink-secondary'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-1.5 block text-[15px] tracking-[0.15px] text-ink-secondary">
                    {option.description}
                  </span>
                </span>

                <span
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${
                    selected ? 'bg-teal-field' : 'border border-hairline'
                  }`}
                >
                  {selected && <Check size={14} strokeWidth={2} className="text-white" />}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-7 text-xs font-medium tracking-wide text-ink-secondary uppercase">
          Which unit do you work on?
        </p>
        <div className="mt-3 flex flex-row gap-2 overflow-x-auto pb-1">
          {UNITS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnit(option)}
              data-testid={`screenjob-unit-${option.replace(' ', '-').toLowerCase()}`}
              className={unitChipClassName(unit === option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[15px] tracking-[0.15px] text-ink-secondary">
          This is the unit whose open shifts you will see.
        </p>

        <Button
          type="submit"
          disabled={!unit}
          data-testid="screenjob-continue"
          className="mt-auto h-[54px] w-full"
        >
          Continue
        </Button>
      </form>
    </main>
  )
}
