import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { ClaimStatusTag } from '@/components/ui/status-tag'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import ClaimStatusDetail from './ClaimStatusDetail'
import { formatShiftTimeRange } from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

function ClaimRow({ claim, onClick }) {
  const shift = claim.shifts
  const date = new Date(shift.starts_at)

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="claim-status-row"
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
    >
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span className="text-[11px] font-medium tracking-[0.03em] text-[#85969B] uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[19px] leading-[1.15] font-medium text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">
          {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-secondary">{shift.unit}</p>
      </div>

      <ClaimStatusTag status={claim.status} label={claim.status === 'pending' ? 'Pending Approval' : undefined} />
      <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
    </button>
  )
}

function ClaimSection({ title, claims, onSelect }) {
  if (claims.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">{title}</div>
      <ul className={SHIFT_LIST_CLASSNAME}>
        {claims.map((claim, index) => (
          <li key={claim.id}>
            <ClaimRow claim={claim} onClick={() => onSelect(claim)} />
            {index < claims.length - 1 && <ShiftListDivider />}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ClaimStatusList({ user, onBack, onGoToSchedule }) {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedClaim, setSelectedClaim] = useState(null)

  async function fetchClaims() {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('shift_claims')
      .select('id, shift_id, status, claimed_at, denial_message, shifts!shift_id ( id, unit, starts_at, ends_at )')
      .eq('nurse_id', user.id)
      .order('claimed_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setClaims([])
      setLoading(false)
      return
    }

    setClaims((data ?? []).filter((claim) => claim.shifts))
    setLoading(false)
  }

  useEffect(() => {
    fetchClaims()
  }, [user.id])

  if (selectedClaim) {
    return (
      <ClaimStatusDetail
        claim={selectedClaim}
        onBack={() => setSelectedClaim(null)}
        onGoToSchedule={onGoToSchedule}
        onWithdrawn={() => {
          setSelectedClaim(null)
          fetchClaims()
        }}
      />
    )
  }

  const pending = claims.filter((c) => c.status === 'pending')
  const resolved = claims.filter((c) => c.status !== 'pending')

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Claim Status" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5 pb-12">
        {loading && <p className="text-sm text-ink-secondary">Loading…</p>}
        {!loading && error && (
          <p className="text-sm text-red-700">Could not load claim status: {error}</p>
        )}
        {!loading && !error && claims.length === 0 && (
          <p className="text-sm text-ink-secondary">You haven&apos;t claimed any shifts yet.</p>
        )}
        {!loading && !error && (
          <>
            <ClaimSection title="Pending" claims={pending} onSelect={setSelectedClaim} />
            <ClaimSection title="Resolved" claims={resolved} onSelect={setSelectedClaim} />
          </>
        )}
      </main>
    </div>
  )
}
