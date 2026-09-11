import { ChevronLeft } from 'lucide-react'

// Pushed-screen header, per the Linear Light source's .back-btn/.nav-row
// (home-linear-light/ClaimShiftsLinearLight.dc.html and others). First live
// use is the Claims flow's Claim Status list + detail; ShiftDetail should
// adopt this same component when it's ported instead of its old plain
// back button.
export function NavRow({ title, onBack }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2.5 px-5 pt-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex size-[34px] shrink-0 items-center justify-center rounded-control border border-hairline bg-card-surface text-ink-secondary"
      >
        <ChevronLeft size={16} strokeWidth={1.9} />
      </button>
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</span>
    </div>
  )
}
