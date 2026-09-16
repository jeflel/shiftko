import { useEffect, useState } from 'react'
import { Repeat, SquarePlus, Upload, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createClaim, deleteClaim } from '../lib/claims'
import { NavRow } from '@/components/ui/nav-row'
import { HeroCard } from '@/components/ui/hero-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import SwapFlow from './SwapFlow'
import OfferShiftConfirm from './OfferShiftConfirm'
import OfferShiftStatus from './OfferShiftStatus'
import { formatShiftTimeRange } from '../lib/shiftFormat'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export default function ShiftDetail({ shift, user, onBack }) {
  const [coworkers, setCoworkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [credential, setCredential] = useState(null)
  const [role, setRole] = useState(null)
  const [shiftState, setShiftState] = useState(null)
  const [hasPendingClaim, setHasPendingClaim] = useState(false)
  const [myClaim, setMyClaim] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState(null)
  const [claimed, setClaimed] = useState(null)
  const [showSwapFlow, setShowSwapFlow] = useState(false)
  const [showOfferConfirm, setShowOfferConfirm] = useState(false)
  const [showOfferStatus, setShowOfferStatus] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchCredential() {
      const { data } = await supabase
        .from('profiles')
        .select('credential, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!cancelled) {
        setCredential(data?.credential ?? null)
        setRole(data?.role ?? null)
      }
    }

    fetchCredential()
    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    let cancelled = false

    async function fetchShiftState() {
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('id, nurse_id, status, is_offered')
        .eq('id', shift.id)
        .maybeSingle()

      if (cancelled) return
      setShiftState(shiftData ?? null)

      const { data: claimsData } = await supabase
        .from('shift_claims')
        .select('id')
        .eq('shift_id', shift.id)
        .eq('status', 'pending')

      if (cancelled) return
      setHasPendingClaim((claimsData ?? []).length > 0)

      const { data: myClaimData } = await supabase
        .from('shift_claims')
        .select('id')
        .eq('shift_id', shift.id)
        .eq('nurse_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (cancelled) return
      setMyClaim(myClaimData ?? null)
    }

    fetchShiftState()
    return () => { cancelled = true }
  }, [shift.id, user.id])

  const isPastShift = new Date(shift.ends_at).getTime() < Date.now()

  const isMine =
    !isPastShift && shiftState?.nurse_id === user.id && shiftState?.status === 'scheduled'

  // Two separate gates now that offering pushes a stepper (Confirm then
  // Status) instead of a 1-tap toggle: starting a fresh offer still needs no
  // pending claim already in flight, but viewing an in-progress offer's
  // status has to stay reachable even after a coworker claims it - that's
  // exactly the state OfferShiftStatus.jsx's Claimed screen shows.
  const canStartOffer = isMine && !hasPendingClaim && !shiftState?.is_offered
  const canViewOfferStatus = isMine && shiftState?.is_offered

  // Swap eligibility mirrors the offer toggle's (mine, scheduled, not past,
  // no pending claim) plus one more: not already offered to the whole unit
  // via the 1-tap offer toggle - offering to anyone and requesting a specific
  // person's shift are two different self-scheduling paths that shouldn't
  // run at once on the same shift.
  const canRequestSwap = isMine && !hasPendingClaim && !shiftState?.is_offered

  const isOpen = shiftState?.status === 'open'
  const isOffered = shiftState?.status === 'scheduled' && shiftState?.is_offered
  const canClaim = (isOpen || isOffered) && !isMine && !isPastShift && !myClaim && !claimed && role === 'nurse'

  useEffect(() => {
    let cancelled = false

    async function fetchCoworkers() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select(`
          id,
          nurse_id,
          starts_at,
          ends_at,
          profiles!nurse_id (
            full_name,
            credential
          )
        `)
        .eq('unit', shift.unit)
        .neq('nurse_id', user.id)
        .lt('starts_at', shift.ends_at)
        .gt('ends_at', shift.starts_at)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setCoworkers([])
        setLoading(false)
        return
      }

      const uniqueCoworkers = []
      const seenNurseIds = new Set()

      for (const row of data ?? []) {
        if (seenNurseIds.has(row.nurse_id)) continue
        seenNurseIds.add(row.nurse_id)

        // PostgREST may return the embed as an object or a single-element array
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles

        uniqueCoworkers.push({
          nurseId: row.nurse_id,
          full_name: profile?.full_name ?? null,
          credential: profile?.credential ?? null,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
        })
      }

      setCoworkers(uniqueCoworkers)
      setLoading(false)
    }

    fetchCoworkers()

    return () => {
      cancelled = true
    }
  }, [shift, user.id])

  async function handleClaim() {
    setClaiming(true)
    setClaimError(null)

    const { claim, error: claimErr } = await createClaim({
      shiftId: shift.id,
      nurseId: user.id,
    })

    setClaiming(false)

    if (claimErr || !claim) {
      setClaimError('This shift is no longer available.')
      setClaimed(null)
      return
    }

    setClaimed(claim)
  }

  async function handleWithdraw() {
    setClaiming(true)
    setClaimError(null)

    const { error: deleteError } = await deleteClaim({
      shiftId: shift.id,
      nurseId: user.id,
    })

    setClaiming(false)

    if (deleteError) {
      setClaimError(deleteError)
      return
    }

    setClaimed(null)
    setMyClaim(null)
  }

  if (showSwapFlow) {
    return (
      <SwapFlow
        user={user}
        shift={shift}
        onBack={() => setShowSwapFlow(false)}
        onSent={() => {
          setShowSwapFlow(false)
          onBack()
        }}
      />
    )
  }

  if (showOfferConfirm) {
    return (
      <OfferShiftConfirm
        shift={shift}
        credential={credential}
        onBack={() => setShowOfferConfirm(false)}
        onOffered={() => {
          setShiftState((current) => (current ? { ...current, is_offered: true } : current))
          setShowOfferConfirm(false)
          setShowOfferStatus(true)
        }}
      />
    )
  }

  if (showOfferStatus) {
    return (
      <OfferShiftStatus
        shift={shift}
        credential={credential}
        onBack={() => setShowOfferStatus(false)}
        onWithdrawn={() => {
          setShiftState((current) => (current ? { ...current, is_offered: false } : current))
          setShowOfferStatus(false)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col bg-page-ground">
      <NavRow onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-3 pb-6">
        <HeroCard
          shift={shift}
          credential={credential}
          subline={isOpen ? `${shift.unit} · No nurse assigned yet` : isOffered ? `${shift.unit} · Offered by ${shift.profiles?.full_name ?? 'a nurse'}` : undefined}
        />

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
            Working with
          </h2>

          {loading && <p className="text-xs text-ink-secondary">Loading coworkers…</p>}

          {!loading && error && (
            <p className="text-xs text-red-700">Could not load coworkers: {error}</p>
          )}

          {!loading && !error && coworkers.length === 0 && (
            <EmptyState
              icon={Users}
              title="No coworkers on this shift"
              layout="row"
              tone="neutral"
            />
          )}

          {!loading &&
            !error &&
            coworkers.map((coworker) => {
              const meta = [coworker.credential, formatShiftTimeRange(coworker.starts_at, coworker.ends_at)]
                .filter(Boolean)
                .join(' · ')

              return (
                <div key={coworker.nurseId} className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-press-state text-[13px] font-semibold text-ink-secondary">
                    {getInitials(coworker.full_name)}
                  </div>

                  <div className="flex min-w-0 flex-col gap-px">
                    <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                      {coworker.full_name}
                    </p>
                    {meta && <p className="text-xs text-ink-secondary">{meta}</p>}
                  </div>
                </div>
              )
            })}
        </section>
      </main>

      <div className="flex shrink-0 flex-col gap-2.5 px-5 pt-2 pb-1">
        {claimError && <p className="text-sm text-red-700">{claimError}</p>}

        {canClaim && (
          <Button
            type="button"
            variant="primary"
            onClick={handleClaim}
            disabled={claiming}
            data-testid="shift-detail-claim"
            className="h-[50px] w-full rounded-[16px]"
          >
            <SquarePlus size={17} strokeWidth={1.9} />
            {claiming ? 'Requesting…' : 'Claim this shift'}
          </Button>
        )}

        {(myClaim || claimed) && (
          <>
            <p className="text-center text-sm text-ink-secondary">
              Requested · waiting for coordinator approval
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleWithdraw}
              disabled={claiming}
              data-testid="shift-detail-withdraw"
              className="h-[50px] w-full rounded-[16px]"
            >
              Withdraw
            </Button>
          </>
        )}

        {canRequestSwap && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowSwapFlow(true)}
            data-testid="shift-detail-swap-request"
            className="h-[50px] w-full rounded-[16px]"
          >
            <Repeat size={17} strokeWidth={1.9} />
            Request a swap
          </Button>
        )}

        {canStartOffer && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowOfferConfirm(true)}
            data-testid="shift-detail-offer-toggle"
            className="h-[50px] w-full rounded-[16px]"
          >
            <Upload size={17} strokeWidth={1.9} />
            Offer this shift
          </Button>
        )}

        {canViewOfferStatus && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowOfferStatus(true)}
            data-testid="shift-detail-offer-toggle"
            className="h-[50px] w-full rounded-[16px]"
          >
            View offer status
          </Button>
        )}
      </div>
    </div>
  )
}
