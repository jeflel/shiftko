import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Screen4({ onBack, onContinue }) {
  function handleSubmit(event) {
    event.preventDefault()
    onContinue()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
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
          <div className="h-full w-[90px] rounded-full bg-[#32A8CA]" />
        </div>
      </div>

      <h1 className="mt-10 font-display text-[30px] font-semibold tracking-[-0.6px] text-[#003342]">
        Where do you work?
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-[#004458]">
        Search or select your facility.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-8 flex h-[94px] w-full items-center justify-between rounded-[20px] border border-[#003342] bg-white px-6 shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]">
          <span>
            <span className="block text-[17px] font-semibold text-[#003342]">
              Burlingame Skilled Nursing
            </span>
            <span className="mt-1.5 block text-[15px] tracking-[0.15px] text-[#004458]">
              (selected, locked)
            </span>
          </span>

          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#32A8CA]">
            <Check size={14} strokeWidth={2} className="text-white" />
          </span>
        </div>

        <Button
          type="submit"
          className="mt-auto h-[54px] w-full translate-y-[23px] rounded-[20px] bg-[#003342] text-[17px] font-semibold tracking-[-0.34px] text-[#e9faff] hover:bg-[#003342]/90"
        >
          Continue
        </Button>
      </form>
    </main>
  )
}
