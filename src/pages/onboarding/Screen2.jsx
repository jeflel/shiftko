import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fieldClassName =
  'h-[54px] rounded-[15px] border-[#c0c3c4] bg-white px-4 text-[17px] tracking-[-0.34px] text-[#003342] placeholder:text-[#bac2c4] focus-visible:border-[#003342] focus-visible:ring-0 focus-visible:outline-none'

export default function Screen2({ onBack, onContinue }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onContinue({ firstName, lastName })
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 pt-[70px] pb-10">
      <div className="-ml-2 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={20} strokeWidth={2} className="text-[#B8B9B9]" />
        </button>
        <div className="h-[10px] w-[150px] rounded-full bg-[#D7F1F9]">
          <div className="h-full w-[30px] rounded-full bg-[#32A8CA]" />
        </div>
      </div>

      <h1 className="mt-10 font-display text-[30px] font-semibold tracking-[-0.6px] text-[#003342]">
        What's your name?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-[#004458]">
        This is how your friends and coworkers can find you on Shiftko.
      </p>

      <form className="mt-7 flex flex-col" onSubmit={handleSubmit}>
        <Label htmlFor="firstName" className="mb-2 text-[17px] font-semibold text-[#003342]">
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
          className={`mb-4 ${fieldClassName}`}
        />

        <Label htmlFor="lastName" className="mb-2 text-[17px] font-semibold text-[#003342]">
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
          className={fieldClassName}
        />

        <Button
          type="submit"
          className="mt-8 h-[54px] w-full rounded-[20px] bg-[#003342] text-[17px] font-semibold tracking-[-0.34px] text-[#e9faff] hover:bg-[#003342]/90"
        >
          Continue
        </Button>
      </form>
    </main>
  )
}
