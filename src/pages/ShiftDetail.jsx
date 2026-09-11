import { useEffect, useState } from 'react'
import { ChevronLeft, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ShiftPeriodPill } from '@/components/ui/pill'
import { Button } from '@/components/ui/button'
import SwapFlow from './SwapFlow'
import {
  formatShiftDate,
  formatShiftTimeRange,
  getShiftPeriod,
} from '../lib/shiftFormat'

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
  const [shiftState, setShiftState] = useState(null)
  const [hasPendingClaim, setHasPendingClaim] = useState(false)
  const [offerSaving, setOfferSaving] = useState(false)
  const [offerError, setOfferError] = useState(null)
  const [showSwapFlow, setShowSwapFlow] = useState(false)

  const period = getShiftPeriod(shift.starts_at)

  useEffect(() => {
    let cancelled = false

    async function fetchCredential() {
      const { data } = await supabase
        .from('profiles')
        .select('credential')
        .eq('id', user.id)
        .maybeSingle()

      if (!cancelled) setCredential(data?.credential ?? null)
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
    }

    fetchShiftState()
    return () => { cancelled = true }
  }, [shift.id])

  async function handleToggleOffer(offer) {
    setOfferError(null)
    setOfferSaving(true)

    const { error: rpcError } = await supabase.rpc('toggle_shift_offer', {
      p_shift_id: shift.id,
      p_offer: offer,
    })

    setOfferSaving(false)

    if (rpcError) {
      setOfferError(rpcError.message)
      return
    }

    setShiftState((current) => (current ? { ...current, is_offered: offer } : current))
  }

  const isPastShift = new Date(shift.ends_at).getTime() < Date.now()

  const canManageOffer =
    !isPastShift &&
    shiftState?.nurse_id === user.id &&
    shiftState?.status === 'scheduled' &&
    !hasPendingClaim

  // Swap eligibility mirrors the offer toggle's (mine, scheduled, not past,
  // no pending claim) plus one more: not already offered to the whole unit
  // via the 1-tap offer toggle - offering to anyone and requesting a specific
  // person's shift are two different self-scheduling paths that shouldn't
  // run at once on the same shift.
  const canRequestSwap =
    !isPastShift &&
    shiftState?.nurse_id === user.id &&
    shiftState?.status === 'scheduled' &&
    !hasPendingClaim &&
    !shiftState?.is_offered

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

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white">
      <main className="mx-auto w-full max-w-md px-5 pt-8 pb-12">
        <button
          type="button"
          onClick={onBack}
          data-testid="shift-detail-back"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink-secondary"
        >
          <ChevronLeft size={18} strokeWidth={2} />
          Back
        </button>

        <div className="rounded-card border border-hairline bg-white p-5 shadow-card-lift">
          <div className="flex items-start justify-between gap-3">
            <p className="text-2xl font-bold text-ink">
              {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
            </p>
            <ShiftPeriodPill period={period} />
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <p className="text-xs text-ink-secondary">{shift.unit}</p>
            {credential && (
              <>
                <span className="h-3 border-l border-hairline" />
                <p className="text-xs text-ink-secondary">{credential}</p>
              </>
            )}
          </div>

          <p className="mt-3 text-sm text-ink-secondary">{formatShiftDate(shift.starts_at)}</p>
        </div>

        {canManageOffer && (
          <div className="mt-6">
            {shiftState.is_offered ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleToggleOffer(false)}
                disabled={offerSaving}
                data-testid="shift-detail-offer-toggle"
                className="h-auto w-full py-4 text-base"
              >
                {offerSaving ? 'Withdrawing…' : 'Withdraw offer'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleToggleOffer(true)}
                disabled={offerSaving}
                data-testid="shift-detail-offer-toggle"
                className="h-auto w-full py-4 text-base"
              >
                {offerSaving ? 'Offering…' : 'Offer this shift'}
              </Button>
            )}

            {offerError && <p className="mt-2 text-sm text-red-700">{offerError}</p>}
          </div>
        )}

        {canRequestSwap && (
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSwapFlow(true)}
              data-testid="shift-detail-swap-request"
              className="h-auto w-full py-4 text-base"
            >
              Request a swap
            </Button>
          </div>
        )}

        <section className="mt-9">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users size={14} strokeWidth={2.5} />
            Working with
          </h2>

          {loading && <p className="text-sm text-ink-secondary">Loading coworkers…</p>}

          {!loading && error && (
            <p className="text-sm text-red-700">Could not load coworkers: {error}</p>
          )}

          {!loading && !error && coworkers.length === 0 && (
            <p className="text-sm text-ink-secondary">No coworkers on this shift</p>
          )}

          {!loading && !error && coworkers.length > 0 && (
            <ul className="flex flex-col">
              {coworkers.map((coworker) => (
                <li
                  key={coworker.nurseId}
                  className="flex items-center gap-3 border-b border-hairline py-3 last:border-b-0"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page-ground text-xs font-semibold text-ink-secondary">
                    {getInitials(coworker.full_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {coworker.full_name}
                    </p>
                    {coworker.credential && (
                      <p className="text-xs text-ink-secondary">{coworker.credential}</p>
                    )}
                  </div>

                  <p className="shrink-0 text-xs text-ink-secondary">
                    {formatShiftTimeRange(coworker.starts_at, coworker.ends_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
