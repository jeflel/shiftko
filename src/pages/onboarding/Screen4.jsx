import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Which unit the nurse works on. Shiftko is single facility, so this replaces the
// old facility picker (which showed one locked card anyway) and is the one field
// here the coordinator would otherwise have to set by hand in the staff roster.
//
// Units match the values already used on shifts and profiles.
const UNITS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4']

export default function Screen4({ onBack, onContinue }) {
  const [unit, setUnit] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    if (!unit) return
    onContinue(unit)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
      <div className="-ml-2 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          data-testid="screen4-back"
          className="flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={20} strokeWidth={2} className="text-ink-secondary" />
        </button>
        <div className="h-[10px] w-[150px] rounded-full bg-track-neutral">
          <div className="h-full w-[90px] rounded-full bg-teal" />
        </div>
      </div>

      <h1 className="mt-10 text-[30px] font-semibold tracking-[-0.6px] text-ink">
        Which unit do you work on?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-ink-secondary">
        This is the unit whose open shifts you will see.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-8 flex flex-col gap-2.5">
          {UNITS.map((option) => {
            const selected = unit === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setUnit(option)}
                data-testid={`screen4-unit-${option.replace(' ', '-').toLowerCase()}`}
                className={`flex h-[62px] w-full items-center justify-between rounded-card border bg-white px-6 text-left transition-colors ${
                  selected
                    ? 'border-teal-foreground shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-hairline'
                }`}
              >
                <span
                  className={`text-[17px] font-semibold ${
                    selected ? 'text-ink' : 'text-ink-secondary'
                  }`}
                >
                  {option}
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

        <p className="mt-3 text-[15px] tracking-[0.15px] text-ink-secondary">
          Ask your coordinator if you cover more than one.
        </p>

        <Button
          type="submit"
          disabled={!unit}
          data-testid="screen4-continue"
          className="mt-auto h-[54px] w-full translate-y-[23px]"
        >
          Continue
        </Button>
      </form>
    </main>
  )
}
