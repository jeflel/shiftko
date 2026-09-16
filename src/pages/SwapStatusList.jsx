import { useEffect, useState } from 'react'
import { ArrowLeftRight, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { SwapStatusTag } from '@/components/ui/status-tag'
import { EmptyState } from '@/components/ui/empty-state'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import SwapStatusDetail from './SwapStatusDetail'
import { formatShiftTimeRange } from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

const SWAP_SELECT = `
  id, status, created_at, responded_at, decided_at,
  requester_id, recipient_id, requester_shift_id, recipient_shift_id,
  requester:profiles!requester_id ( full_name, credential ),
  recipient:profiles!recipient_id ( full_name, credential ),
  requester_shift:shifts!requester_shift_id ( id, unit, starts_at, ends_at ),
  recipient_shift:shifts!recipient_shift_id ( id, unit, starts_at, ends_at )
`

function SwapRow({ swap, viewerId, onClick }) {
  const isRequester = swap.requester_id === viewerId
  const otherParty = isRequester ? swap.recipient : swap.requester
  const myShift = isRequester ? swap.requester_shift : swap.recipient_shift
  const date = new Date(myShift.starts_at)

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="swap-status-row"
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
    >
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span className="text-[11px] font-medium tracking-[0.03em] text-[#85969B] uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[19px] leading-[1.15] font-medium text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[13px] font-medium text-ink">
          {formatShiftTimeRange(myShift.starts_at, myShift.ends_at)}
        </p>
        <p className="truncate text-xs text-ink-secondary">with {otherParty?.full_name ?? 'a coworker'}</p>
      </div>

      <SwapStatusTag status={swap.status} />
      <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
    </button>
  )
}

function SwapSection({ title, swaps, viewerId, onSelect }) {
  if (swaps.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">{title}</div>
      <ul className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
        {swaps.map((swap, index) => (
          <li key={swap.id}>
            <SwapRow swap={swap} viewerId={viewerId} onClick={() => onSelect(swap)} />
            {index < swaps.length - 1 && <ShiftListDivider />}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Net-new aggregate list (no mockup - same reasoning as ClaimStatusList):
// "Awaiting your response" surfaces incoming requests needing action first,
// then every other swap the nurse is party to (either side, any status).
export default function SwapStatusList({ user, onBack, onGoToSchedule }) {
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSwap, setSelectedSwap] = useState(null)

  async function fetchSwaps() {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('shift_swaps')
      .select(SWAP_SELECT)
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setSwaps([])
      setLoading(false)
      return
    }

    setSwaps((data ?? []).filter((swap) => swap.requester_shift && swap.recipient_shift))
    setLoading(false)
  }

  useEffect(() => {
    fetchSwaps()
  }, [user.id])

  if (selectedSwap) {
    return (
      <SwapStatusDetail
        swap={selectedSwap}
        viewerId={user.id}
        onBack={() => setSelectedSwap(null)}
        onGoToSchedule={onGoToSchedule}
        onChanged={() => {
          setSelectedSwap(null)
          fetchSwaps()
        }}
      />
    )
  }

  const awaitingResponse = swaps.filter((s) => s.status === 'requested' && s.recipient_id === user.id)
  const rest = swaps.filter((s) => !(s.status === 'requested' && s.recipient_id === user.id))

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Swap Status" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5 pb-12">
        {loading && <p className="text-sm text-ink-secondary">Loading…</p>}
        {!loading && error && <p className="text-sm text-red-700">Could not load swaps: {error}</p>}
        {!loading && !error && swaps.length === 0 && (
          <EmptyState
            icon={ArrowLeftRight}
            title="No swaps yet"
            subline="Requests you send or receive will show up here."
            size="inline"
            tone="neutral"
          />
        )}
        {!loading && !error && (
          <>
            <SwapSection title="Awaiting Your Response" swaps={awaitingResponse} viewerId={user.id} onSelect={setSelectedSwap} />
            <SwapSection title="Swaps" swaps={rest} viewerId={user.id} onSelect={setSelectedSwap} />
          </>
        )}
      </main>
    </div>
  )
}
