import { useState } from 'react'
import { ArrowLeft, Frown, Meh } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAIN_POINTS = [
  { label: 'Shifts posted by phone call', icon: Meh },
  { label: "Can't see available shifts", icon: Frown },
  { label: 'Slow claiming process', icon: Meh },
  { label: 'Hard to swap shifts', icon: Frown },
]

export default function Screen5({ onBack, onContinue }) {
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[93px] pb-11">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={20} strokeWidth={2} className="text-[#B8B9B9]" />
        </button>
        <div className="h-[10px] w-[150px] rounded-full bg-[#D7F1F9]">
          <div className="h-full w-[150px] rounded-full bg-[#32A8CA]" />
        </div>
      </div>

      <h1 className="mt-10 font-display text-[30px] leading-[1.2] font-semibold tracking-[-0.6px] text-[#003342]">
        What's your biggest
        <br />
        scheduling challenge?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-[#004458]">
        We're building features based on what matters most to you. Select all that applies.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-11 flex flex-col gap-2.5">
          {PAIN_POINTS.map(({ label, icon: Icon }) => {
            const isSelected = selected.includes(label)
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
                className={`flex h-[70px] w-full items-center gap-4 rounded-[20px] border bg-white px-5 text-left text-[17px] tracking-[-0.17px] transition-colors ${
                  isSelected
                    ? 'border-[#003342] font-semibold text-[#003342] shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-[#e3e3e3] font-medium text-[#003342]'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  className={isSelected ? 'shrink-0 text-[#3A798B]' : 'shrink-0 text-[#A4A4A4]'}
                />
                {label}
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
