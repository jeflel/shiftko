import { useState } from 'react'
import { Button } from '@/components/ui/button'

const ROLES = [
  { value: 'nurse', label: 'Nurse', description: 'I view and claim shifts' },
  { value: 'coordinator', label: 'Coordinator', description: 'I post and manage shifts' },
]

export default function Screen3({ firstName = '', onContinue }) {
  const [role, setRole] = useState('nurse')

  function handleSubmit(event) {
    event.preventDefault()
    onContinue(role)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[90px] pb-11">
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.6px] text-[#003342]">
        What's your role{firstName ? `, ${firstName}` : ''}?
      </h1>
      <p className="mt-4 text-[17px] tracking-[-0.34px] text-[#004458]">
        Pick the one that best describes you at work.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-[42px] flex flex-col gap-2.5">
          {ROLES.map((option) => {
            const selected = role === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`flex h-[94px] w-full items-center justify-between rounded-[20px] border bg-white px-6 text-left transition-colors ${
                  selected
                    ? 'border-[#003342] shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-[#e3e3e3]'
                }`}
              >
                <span>
                  <span
                    className={`block text-[17px] font-semibold ${
                      selected ? 'text-[#003342]' : 'text-[#3a798b]'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span
                    className={`mt-1.5 block text-[15px] tracking-[0.15px] ${
                      selected ? 'text-[#004458]' : 'text-[#3a798b]'
                    }`}
                  >
                    {option.description}
                  </span>
                </span>

                <span
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border ${
                    selected ? 'border-[#7aafbe]' : 'border-[#e3e3e3]'
                  }`}
                >
                  {selected && <span className="size-[14px] rounded-full bg-[#003342]" />}
                </span>
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
