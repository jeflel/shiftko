import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// Pushed-screen header, per the Linear Light source's .back-btn/.nav-row
// (home-linear-light/ClaimShiftsLinearLight.dc.html and others). First live
// use is the Claims flow's Claim Status list + detail; ShiftDetail should
// adopt this same component when it's ported instead of its old plain
// back button. `subtitle` is the mockup's `.nav-count` (e.g. "· 2 pending"),
// first used by CoordinatorApprovalsLinearLight.dc.html.
//
// The title is CENTRED as of 2026-09-18, for every pushed screen at once:
// `grid-cols-[auto_1fr_auto]` with the title in the middle column, so a screen
// cannot end up with a different header layout than its neighbours. Two things
// about this grid that are load bearing:
//
// 1. The right column is an invisible spacer the size of the back button. A
//    `1fr` middle column is centred inside ITS TRACK, not inside the header, so
//    with nothing in the right column the title would sit half a back button to
//    the right of the screen's centre. The spacer makes the two `auto` columns
//    equal, which is what puts the title's centre on the header's centre.
// 2. The header keeps its exact 40px height (`h-10`, `pt-3`) whenever there is
//    no subtitle, so the back button keeps its 34px box at the same y and every
//    existing screen is unchanged apart from the title moving to the centre.
//
// `subtitle` STACKS under the title, centred, rather than sitting beside it: a
// inline pair would be centred as a group, which pushes the title itself off
// centre, and the title being centred is the point of this layout. Only
// CoordinatorApprovals passes a subtitle, and it is the one screen that grows
// (h-10 becomes min-height plus a little bottom padding) instead of overflowing
// its fixed box. Note its string still starts with the mockup's "· " separator,
// which read as a separator when it was inline; stacked, it reads as a stray
// dot, so dropping that one character from that one call site is a follow-up
// worth doing rather than something to fix silently here.
export function NavRow({ title, subtitle, onBack }) {
  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2.5 px-5 pt-3',
        subtitle ? 'pb-2' : 'h-10',
      )}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex size-[34px] shrink-0 items-center justify-center rounded-control border border-hairline bg-card-surface text-ink-secondary"
      >
        <ChevronLeft size={16} strokeWidth={1.9} />
      </button>

      <div className="flex min-w-0 flex-col items-center justify-center">
        <span className="w-full truncate text-center text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </span>
        {subtitle && (
          <span className="w-full truncate text-center text-sm font-medium text-ink-secondary">
            {subtitle}
          </span>
        )}
      </div>

      {/* The back button's own box, empty, so the middle column is symmetric. */}
      <div className="size-[34px] shrink-0" aria-hidden="true" />
    </div>
  )
}
