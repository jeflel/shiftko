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

        <div className="pointer-events-none absolute inset-x-0 top-0 h-[31.3%] bg-gradient-to-t from-[rgba(136,172,180,0)] to-[#00536c]" />
        <div
          className="pointer-events-none absolute inset-x-0 top-[82%] bottom-0"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0), #ffffff)' }}
        />

        <Wordmark
          size={30}
          className="absolute left-1/2 top-[14.7%] -translate-x-1/2 text-[#f8fdff] [text-shadow:0_3px_17px_rgba(0,53,69,0.2)]"
        />
      </div>

      <div className="flex flex-col items-center gap-6 px-6 pt-3 pb-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.6px] text-[#004458]">
            Built for <span className="italic">nurses</span>.
            <br />
            Made for your unit.
          </h1>
          <p className="max-w-[280px] text-[17px] tracking-[-0.34px] text-[#004458]">
            Track shifts, see who's working, claim open ones.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
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
