import { useRef } from 'react'
import LottieImport from 'lottie-react'
import { Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/ui/wordmark'
import confettiData from '@/assets/confetti.json'
import mascotData from '@/assets/mascot.json'

const Lottie = LottieImport.default || LottieImport

const INVITE_CODE = 'BURLINGAME'
const MASCOT_SPEED = 0.7

export default function Screen6({ firstName = '', onFinish }) {
  const mascotRef = useRef(null)

  async function handleShare() {
    const shareText = `Join my unit on Shiftko! Use code: ${INVITE_CODE} at shiftko.com`
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        // user dismissed the native share sheet, nothing to do
      }
    } else {
      await navigator.clipboard.writeText(shareText)
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-gradient-to-b from-[#ddf6fb] to-white to-[52.354%] px-6 pt-[160px] pb-11">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] w-full bg-gradient-to-b from-[#32A8CA] to-transparent"
      />

      <Lottie
        animationData={confettiData}
        loop={false}
        autoplay
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] w-full"
      />

      <Wordmark size={22} className="absolute left-1/2 top-11 -translate-x-1/2 text-[#003342]" />

      <Lottie
        lottieRef={mascotRef}
        animationData={mascotData}
        loop
        autoplay
        onDOMLoaded={() => mascotRef.current?.setSpeed(MASCOT_SPEED)}
        className="mx-auto h-[140px] w-[140px]"
      />

      <h1 className="text-center font-display text-[30px] font-semibold tracking-[-0.6px] text-[#003342]">
        You're all set{firstName ? `, ${firstName}` : ''}!
      </h1>
      <p className="mt-2 text-center text-[17px] tracking-[-0.34px] text-[#004458]">
        Welcome to your unit's Shiftko.
      </p>

      <p className="mt-[75px] text-[14px] font-bold tracking-[0.14px] text-[#3a798b]">
        INVITE YOUR TEAMMATES
      </p>
      <div className="relative mt-2 rounded-[20px] border border-[#e3e3e3] bg-white px-6 pt-5 pb-5">
        <span className="inline-flex h-[28px] items-center rounded-[10px] bg-[#e3f9ff] px-2.5 text-[14px] font-semibold text-[#004d63]">
          {INVITE_CODE}
        </span>
        <p className="mt-2.5 max-w-[224px] text-[14px] tracking-[-0.28px] text-[#004458]">
          Share this code so coworkers can join your unit.
        </p>
        <button
          type="button"
          onClick={handleShare}
          className="absolute top-[48px] right-8 text-[#3a798b]"
          aria-label="Share invite code"
        >
          <Share size={22} strokeWidth={1.83} />
        </button>
      </div>

      <Button
        type="button"
        onClick={onFinish}
        className="mt-auto h-[54px] w-full rounded-[20px] bg-[#003342] text-[17px] font-semibold tracking-[-0.34px] text-[#e9faff] hover:bg-[#003342]/90"
      >
        Let's Go
      </Button>
    </main>
  )
}
