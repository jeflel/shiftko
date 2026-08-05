import { Button } from '@/components/ui/button'

export default function Screen4({ onContinue }) {
  function handleSubmit(event) {
    event.preventDefault()
    onContinue()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[90px] pb-11">
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.6px] text-[#003342]">
        Where do you work?
      </h1>
      <p className="mt-4 text-[17px] tracking-[-0.34px] text-[#004458]">
        Search or select your facility.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-[42px] flex h-[94px] w-full items-center justify-between rounded-[20px] border border-[#003342] bg-white px-6 shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]">
          <span>
            <span className="block text-[17px] font-semibold text-[#003342]">
              Burlingame Skilled Nursing
            </span>
            <span className="mt-1.5 block text-[15px] tracking-[0.15px] text-[#004458]">
              (selected, locked)
            </span>
          </span>

          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border border-[#7aafbe]">
            <span className="size-[14px] rounded-full bg-[#003342]" />
          </span>
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
