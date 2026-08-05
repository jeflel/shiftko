import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/ui/wordmark'
import heroImage from '@/assets/onboarding-hero.png'

export default function Screen0({ onGetStarted, onSignIn }) {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-white">
      <div className="relative aspect-[402/550] w-full overflow-hidden bg-[#81a7af]">
        <img
          src={heroImage}
          alt="Shiftko schedule shown on a phone"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-x-0 top-0 h-[54px] bg-[#81a7af]" />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background:
              'radial-gradient(120% 100% at 50% 0%, rgba(0,53,69,0.45) 0%, rgba(0,53,69,0) 75%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, #ffffff 92%)',
          }}
        />

        <Wordmark
          size={30}
          className="absolute left-1/2 top-16 -translate-x-1/2 text-[#f8fdff] [text-shadow:0_3px_17px_rgba(0,53,69,0.2)]"
        />
      </div>

      <div className="flex flex-1 flex-col items-center px-6 pb-10 text-center">
        <h1 className="font-display text-[30px] leading-[1.15] font-semibold tracking-[-0.6px] text-[#004458]">
          Built for <span className="italic">nurses</span>.
          <br />
          Made for your unit.
        </h1>
        <p className="mt-4 max-w-[280px] text-[17px] tracking-[-0.34px] text-[#004458]">
          Track shifts, see who's working, claim open ones.
        </p>

        <div className="mt-auto flex w-full flex-col gap-3 pt-10">
          <Button
            type="button"
            onClick={onGetStarted}
            className="h-[54px] w-full rounded-[20px] bg-[#003342] text-[17px] font-semibold tracking-[-0.34px] text-[#e9faff] hover:bg-[#003342]/90"
          >
            Get Started
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSignIn}
            className="h-[54px] w-full rounded-[20px] border-[#c0c3c4] bg-white text-[17px] font-medium tracking-[-0.34px] text-black hover:bg-white"
          >
            I already have an account
          </Button>
        </div>
      </div>
    </main>
  )
}
