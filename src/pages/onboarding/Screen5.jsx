import { useState } from 'react'
import { Button } from '@/components/ui/button'

const PAIN_POINTS = [
  'Shifts posted by phone call',
  "Can't see available shifts",
  'Slow claiming process',
  'Hard to swap shifts',
]

export default function Screen5({ onContinue }) {
  const [selected, setSelected] = useState([])

  function toggle(option) {
    setSelected((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    onContinue(selected)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[90px] pb-11">
      <h1 className="font-display text-[30px] leading-[1.2] font-semibold tracking-[-0.6px] text-[#003342]">
        What's your biggest
        <br />
        scheduling challenge?
      </h1>
      <p className="mt-4 text-[17px] tracking-[-0.34px] text-[#004458]">
        We're building features based on what matters most to you. Select all that applies.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-11 flex flex-col gap-2.5">
          {PAIN_POINTS.map((option) => {
            const isSelected = selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`flex h-[70px] w-full items-center justify-center rounded-[20px] border bg-white px-4 text-center text-[17px] font-semibold tracking-[-0.17px] transition-colors ${
                  isSelected
                    ? 'border-[#003342] text-[#003342] shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-[#e3e3e3] text-[#003342]'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>

        <Button
          type="submit"
          className="mt-auto h-[54px] w-full rounded-[20px] bg-[#003342] text-[17px] font-semibold tracking-[-0.34px] text-[#e9faff] hover:bg-[#003342]/90"
        >
          Continue
        </Button>
      </form>
    </main>
  )
}
