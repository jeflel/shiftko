import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FlowTopBar from './FlowTopBar'

const fieldClassName =
  'h-[54px] rounded-button border-hairline bg-white px-4 text-[17px] tracking-[-0.34px] text-ink placeholder:text-ink-secondary focus-visible:border-ink focus-visible:ring-0 focus-visible:outline-none'

export default function Screen2({ step = 1, total = 4, onBack, onContinue }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onContinue({ firstName, lastName })
  }

  return (
    <main className="mx-auto flex h-[100svh] w-full max-w-md flex-col overflow-y-auto px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
      <FlowTopBar step={step} total={total} onBack={onBack} backTestId="screen2-back" />

      <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.6px] text-ink">
        What's your name?
      </h1>
      <p className="mt-2 text-[17px] tracking-[-0.34px] text-ink-secondary">
        This is how your friends and coworkers can find you on Shiftko.
      </p>

      <form className="mt-4 flex flex-col" onSubmit={handleSubmit}>
        <Label htmlFor="firstName" className="mb-2 text-[17px] font-semibold text-ink">
          First name
        </Label>
        <Input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="Enter first name"
          required
          autoComplete="given-name"
          data-testid="screen2-first-name-input"
          className={`mb-4 ${fieldClassName}`}
        />

        <Label htmlFor="lastName" className="mb-2 text-[17px] font-semibold text-ink">
          Last name
        </Label>
        <Input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Enter last name"
          required
          autoComplete="family-name"
          data-testid="screen2-last-name-input"
          className={fieldClassName}
        />

        <Button type="submit" data-testid="screen2-continue" className="mt-4 h-[54px] w-full">
          Continue
        </Button>
      </form>
    </main>
  )
}
