import { useEffect, useState } from 'react'
import { Upload, Clock, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Stepper } from '@/components/ui/stepper'
import { StatusBanner } from '@/components/ui/status-banner'
import { HeroCard } from '@/components/ui/hero-card'
import { formatRelativeTime } from '@/lib/shiftFormat'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

// Avatar-initials + name + "{credential} · {relative time}" row, per
// OfferShiftClaimedLinearLight.dc.html's/OfferShiftPickedUpLinearLight.dc.html's
// .coworker-row. Built shared from the start (exported here, reused by
// OfferShiftUpdate.jsx) since both screens land in this same commit.
export function CoworkerRow({ label, profile, timestamp }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-press-state text-xs font-semibold text-ink-secondary">
          {getInitials(profile?.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
            {profile?.full_name ?? 'A coworker'}
          </p>
          <p className="text-xs text-ink-secondary">
            {profile?.credential ? `${profile.credential} · ` : ''}
            {timestamp}
          </p>
        </div>
      </div>
    </div>
  )
}

// Offered / Claimed status detail for a nurse's own offered shift, per
// OfferShiftStatusLinearLight.dc.html and OfferShiftClaimedLinearLight.dc.html.
// The Approved/Picked Up terminal state can't render here - shift.nurse_id
// gets overwritten to the claimant on approval (see the previous_nurse_id
// migration), so this shift stops showing up as "mine" at that point. That
// state only surfaces via OfferShiftUpdate.jsx, reached from a notification.
export default function OfferShiftStatus({ shift, credential, onBack, onWithdrawn }) {
  const [claim, setClaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPendingClaim() {
      setLoading(true)

      const { data } = await supabase
        .from('shift_claims')
        .select('id, claimed_at, nurse_id, profiles!nurse_id ( full_name, credential )')
        .eq('shift_id', shift.id)
        .eq('status', 'pending')
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setClaim(data ?? null)
      setLoading(false)
    }

    fetchPendingClaim()
    return () => {
      cancelled = true
    }
  }, [shift.id])

  async function handleWithdraw() {
    setError(null)
    setWithdrawing(true)

    const { error: rpcError } = await supabase.rpc('toggle_shift_offer', {
      p_shift_id: shift.id,
      p_offer: false,
    })

    setWithdrawing(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    onWithdrawn()
  }

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col bg-page-ground"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <NavRow title="Offered Shift" onBack={onBack} />
        <p className="px-5 pt-4 text-sm text-ink-secondary">Loading…</p>
      </div>
    )
  }

  const isClaimed = !!claim
  const steps = [
    { label: 'Offered', done: isClaimed, current: !isClaimed },
    { label: 'Claimed', current: isClaimed },
    { label: 'Approved' },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Offered Shift" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5">
        <Stepper steps={steps} />

        {isClaimed ? (
          <StatusBanner icon={Clock}>
            Waiting for your coordinator to approve the pickup
          </StatusBanner>
        ) : (
          <StatusBanner icon={Upload}>
            In the open pool · waiting for a coworker to claim
          </StatusBanner>
        )}

        <HeroCard shift={shift} credential={credential} />

        {isClaimed ? (
          <CoworkerRow
            label="Claimed By"
            profile={claim.profiles}
            timestamp={`claimed ${formatRelativeTime(claim.claimed_at)}`}
          />
        ) : (
          <div className="flex gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-secondary" />
            <p className="text-[13px] leading-[1.4] text-ink-tertiary">
              You&rsquo;re still assigned to this shift until a coworker claims it and your
              coordinator approves the pickup, the same approval every open-shift claim goes
              through.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </main>

      {!isClaimed && (
        <div
          className="flex flex-col gap-2.5 px-5 pt-2 pb-6"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            data-testid="offer-shift-withdraw"
            className="text-center text-sm font-semibold text-ink-secondary disabled:opacity-50"
          >
            {withdrawing ? 'Withdrawing…' : 'Withdraw Offer'}
          </button>
        </div>
      )}
    </div>
  )
}
