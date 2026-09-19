import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CREDENTIALS = [
  { value: 'RN', label: 'RN', description: 'Registered Nurse' },
  { value: 'LVN', label: 'LVN', description: 'Licensed Vocational Nurse' },
  { value: 'CNA', label: 'CNA', description: 'Certified Nursing Assistant' },
]

export default function ScreenCredential({ onBack, onContinue }) {
  const [credential, setCredential] = useState('RN')

  function handleSubmit(event) {
    event.preventDefault()
    onContinue(credential)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
      <div className="-ml-2 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          data-testid="credential-back"
          className="flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={20} strokeWidth={2} className="text-ink-secondary" />
        </button>
        <div className="h-[10px] w-[150px] rounded-full bg-track-neutral">
          <div className="h-full w-[120px] rounded-full bg-teal" />
        </div>
      </div>

      <h1 className="mt-10 text-[30px] font-semibold tracking-[-0.6px] text-ink">
        What's your credential?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-ink-secondary">
        Pick the one that best describes you at work.
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
                data-testid={`credential-option-${option.value.toLowerCase()}`}
                className={`flex h-[94px] w-full items-center justify-between rounded-card border bg-white px-6 text-left transition-colors ${
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

        <Button type="submit" data-testid="credential-continue" className="mt-auto h-[54px] w-full translate-y-[23px]">
          Continue
        </Button>
      </form>
    </main>
  )
}
