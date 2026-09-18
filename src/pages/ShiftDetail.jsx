import { useEffect, useState } from 'react'
import { Repeat, SquarePlus, Upload, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createClaim, deleteClaim } from '../lib/claims'
import { NavRow } from '@/components/ui/nav-row'
import { HeroCard } from '@/components/ui/hero-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ShiftStatusTag } from '@/components/ui/period-tag'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
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
  const [confirmingForTeam, setConfirmingForTeam] = useState(false)
  const [confirmForTeamError, setConfirmForTeamError] = useState(null)
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
        .select('id, nurse_id, status, is_offered, team_confirmed')
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

  // A shift the nurse added herself stays off the team schedule until she
  // confirms it from here: team_confirmed defaults true, the add-shift panel
  // writes false.
  const canConfirmForTeam = isMine && shiftState?.team_confirmed === false

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

  async function handleConfirmForTeam() {
    setConfirmingForTeam(true)
    setConfirmForTeamError(null)

    const { error: confirmError } = await supabase.rpc('confirm_shift_for_team', {
      p_shift_id: shift.id,
    })

    setConfirmingForTeam(false)

    if (confirmError) {
      setConfirmForTeamError(confirmError.message)
      return
    }

    setShiftState((current) => (current ? { ...current, team_confirmed: true } : current))
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

  // The hero card's trailing tag, pairing "Unit 1 · RN" with the shift's state
  // rather than leaving the state to be inferred. canConfirmForTeam is the one
  // exception: its subline already says the shift is not on the team schedule
  // yet, so tagging it "Assigned" would contradict the line it sits next to.
  let heroTag = null
  if (!canConfirmForTeam) {
    if (claimed || myClaim) heroTag = { status: 'pending', label: 'Requested' }
    else if (isOpen) heroTag = { status: 'open' }
    else if (isOffered) heroTag = { status: 'offered' }
    else if (shiftState?.status === 'scheduled') heroTag = { status: 'assigned' }
  }

  return (
    <div className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col bg-page-ground">
      <NavRow title="Shift Detail" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-3 pb-6">
        <HeroCard
          shift={shift}
          credential={credential}
          subline={isOpen ? `${shift.unit} · No nurse assigned yet` : isOffered ? `${shift.unit} · Offered by ${shift.profiles?.full_name ?? 'a nurse'}` : canConfirmForTeam ? `${shift.unit} · Not on the team schedule yet` : undefined}
          metaRight={heroTag ? <ShiftStatusTag status={heroTag.status} label={heroTag.label} /> : null}
        />

        {/* The nurse's own two secondary actions sit here, right under the shift card
            and side by side, instead of stacked full width in the bottom bar
            (2026-09-18, his ask). Same Button variants, same 50px height, same 16px
            radius, same icons; only the width changed, `w-full` to `flex-1`, and the
            labels are shortened to fit two per row: "Request swap" and "Offer shift".
            `View offer status` is the offer control's other state, so it moves with
            them rather than jumping between two places when a shift is offered. The
            claim, withdraw and add-to-team actions stay in the bottom bar.

            Each button carries `shadow-card-lift` (2026-09-18): the page's single
            shadow token, the same `0 5px 15px rgba(53,87,97,.12)` every card uses, so
            they lift off the page ground the way the cards above them do. `Button`
            has no shadow in any variant, so this is per-usage, and the token is the
            one knob if it reads heavy on a 50px button. */}
        {(canRequestSwap || canStartOffer || canViewOfferStatus) && (
          <div className="flex gap-2.5">
            {canRequestSwap && (
              <Button
                type="button"
                variant={canConfirmForTeam ? 'secondary' : 'primary'}
                onClick={() => setShowSwapFlow(true)}
                data-testid="shift-detail-swap-request"
                className="h-[50px] flex-1 rounded-[16px] shadow-card-lift"
              >
                <Repeat size={17} strokeWidth={1.9} />
                Request swap
              </Button>
            )}

            {canStartOffer && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowOfferConfirm(true)}
                data-testid="shift-detail-offer-toggle"
                className="h-[50px] flex-1 rounded-[16px] shadow-card-lift"
              >
                <Upload size={17} strokeWidth={1.9} />
                Offer shift
              </Button>
            )}

            {canViewOfferStatus && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowOfferStatus(true)}
                data-testid="shift-detail-offer-toggle"
                className="h-[50px] flex-1 rounded-[16px] shadow-card-lift"
              >
                View offer status
              </Button>
            )}
          </div>
        )}

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
              Working with
            </h2>

            {!loading && !error && coworkers.length > 0 && (
              <span className="text-xs text-ink-secondary">
                {coworkers.length} on this shift
              </span>
            )}
          </div>

          {loading && <p className="text-xs text-ink-secondary">Loading coworkers…</p>}

          {!loading && error && (
            <p className="text-xs text-red-700">Could not load coworkers: {error}</p>
          )}

          {/* The empty state sits in the SAME card the coworker list uses, so the
              section keeps one container either way (2026-09-18). Before this it was
              a bare row on the page ground, which made the section change shape with
              the data. The class string is the list's own, py-1.5 included, and the
              inner div carries a row's padding, so the icon tile lands where a
              coworker's avatar does. Layout, icon, wording and tone are unchanged. */}
          {!loading && !error && coworkers.length === 0 && (
            <div className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
              <div className="px-4 py-3.5">
                <EmptyState
                  icon={Users}
                  title="No coworkers on this shift"
                  layout="row"
                  tone="neutral"
                />
              </div>
            </div>
          )}

          {!loading && !error && coworkers.length > 0 && (
            <ul className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
              {coworkers.map((coworker, index) => {
                const meta = [coworker.credential, formatShiftTimeRange(coworker.starts_at, coworker.ends_at)]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <li key={coworker.nurseId}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-press-state text-[13px] font-semibold text-ink-secondary">
                        {getInitials(coworker.full_name)}
                      </div>

                      <div className="flex min-w-0 flex-col gap-px">
                        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                          {coworker.full_name}
                        </p>
                        {meta && <p className="truncate text-xs text-ink-secondary">{meta}</p>}
                      </div>
                    </div>

                    {index < coworkers.length - 1 && <ShiftListDivider inset={false} />}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      <div className="flex shrink-0 flex-col gap-2.5 px-5 pt-2 pb-1">
        {claimError && <p className="text-sm text-red-700">{claimError}</p>}

        {confirmForTeamError && <p className="text-sm text-red-700">{confirmForTeamError}</p>}

        {canConfirmForTeam && (
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmForTeam}
            disabled={confirmingForTeam}
            data-testid="shift-detail-add-to-team"
            className="h-[50px] w-full rounded-[16px]"
          >
            <Users size={17} strokeWidth={1.9} />
            {confirmingForTeam ? 'Adding…' : 'Add to team schedule'}
          </Button>
        )}

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
      </div>
    </div>
  )
}
