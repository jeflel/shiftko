import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShiftPeriodPill } from '@/components/ui/pill'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

function ShiftCard({ date, title, subtitle, pill, belowPill, trailing, onClick }) {
  const isInteractive = typeof onClick === 'function'
  const Comp = isInteractive ? 'button' : 'div'

  return (
    <Comp
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-card border border-hairline bg-card-surface px-4 py-3.5 shadow-card-lift',
        isInteractive && 'text-left transition-colors active:bg-press-state',
      )}
    >
      <div className="flex w-[34px] shrink-0 flex-col items-center gap-0.5 text-center">
        <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-xl leading-[1.1] font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full self-stretch border-l border-hairline" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        {subtitle}
        {belowPill && <div className="mt-2">{belowPill}</div>}
      </div>

      {pill && <div className="shrink-0">{pill}</div>}
      {trailing && <div className="ml-3 shrink-0">{trailing}</div>}
    </Comp>
  )
}

export default function Pool({ user }) {
  const [shifts, setShifts] = useState([])
  const [claims, setClaims] = useState([])
  const [homeUnit, setHomeUnit] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [unavailableId, setUnavailableId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchOpenShifts() {
      setLoading(true)
      setError(null)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('home_unit')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (profileError) {
        setError(profileError.message)
        setHomeUnit(null)
        setShifts([])
        setClaims([])
        setLoading(false)
        return
      }

      const unit = profile?.home_unit ?? null
      setHomeUnit(unit)

      if (!unit) {
        setShifts([])
        setClaims([])
        setLoading(false)
        return
      }

      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select(
          'id, unit, starts_at, ends_at, status, is_offered, nurse_id, profiles!nurse_id ( full_name )',
        )
        .eq('unit', unit)
        .or('status.eq.open,and(is_offered.eq.true,status.eq.scheduled)')
        .order('starts_at', { ascending: true })

      if (cancelled) return

      if (shiftsError) {
        setError(shiftsError.message)
        setShifts([])
        setClaims([])
        setLoading(false)
        return
      }

      const shiftIds = (shiftsData ?? []).map((s) => s.id)

      if (shiftIds.length === 0) {
        setShifts([])
        setClaims([])
        setLoading(false)
        return
      }

      const { data: claimsData, error: claimsError } = await supabase
        .from('shift_claims')
        .select('id, shift_id, nurse_id, status')
        .in('shift_id', shiftIds)
        .eq('status', 'pending')

      if (cancelled) return

      if (claimsError) {
        setError(claimsError.message)
        setShifts([])
        setClaims([])
        setLoading(false)
        return
      }

      setShifts(shiftsData ?? [])
      setClaims(claimsData ?? [])
      setLoading(false)
    }

    fetchOpenShifts()
    return () => { cancelled = true }
  }, [user.id])

  async function handleClaim(shift) {
    setUnavailableId(null)
    setClaimingId(shift.id)

    // Optimistic UI: show this shift as requested immediately
    const tempId = `temp-${shift.id}`
    setClaims((current) => [
      ...current,
      { id: tempId, shift_id: shift.id, nurse_id: user.id, status: 'pending' },
    ])

    const { data, error: claimError } = await supabase
      .from('shift_claims')
      .insert({
        shift_id: shift.id,
        nurse_id: user.id,
        status: 'pending',
        claimed_at: new Date().toISOString(),
      })
      .select('id, shift_id, nurse_id, status')
      .single()

    setClaimingId(null)

    if (claimError || !data) {
      // Shift is no longer open (or some other race) - roll back and tell the nurse
      setClaims((current) => current.filter((c) => c.id !== tempId))
      setUnavailableId(shift.id)
      return
    }

    setClaims((current) => current.map((c) => (c.id === tempId ? data : c)))
  }

  async function handleWithdraw(shift) {
    const existingClaim = claims.find((c) => c.shift_id === shift.id && c.nurse_id === user.id)
    if (!existingClaim) return

    setWithdrawingId(shift.id)

    // Optimistic UI: remove the claim immediately
    setClaims((current) => current.filter((c) => c.id !== existingClaim.id))

    const { error: deleteError } = await supabase
      .from('shift_claims')
      .delete()
      .eq('nurse_id', user.id)
      .eq('shift_id', shift.id)

    setWithdrawingId(null)

    if (deleteError) {
      // Roll back - keep the claim shown
      setClaims((current) => [...current, existingClaim])
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-[26px] pb-12">
      <h1 className="mb-1 text-[26px] font-semibold text-ink">Pool</h1>

      {loading && <p className="mb-6 text-sm text-ink-secondary">Loading open shifts…</p>}
      {!loading && error && (
        <p className="mb-6 text-sm text-red-700">Could not load open shifts: {error}</p>
      )}

      {!loading && !error && !homeUnit && (
        <p className="mb-6 text-sm text-ink-secondary">
          Your home unit hasn&apos;t been set yet. Contact your coordinator.
        </p>
      )}

      {!loading && !error && homeUnit && (
        <>
          <p className="mb-6 text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{shifts.length} open</span> across{' '}
            {homeUnit} · coordinator-posted opens and coworker offers together, tap to claim
          </p>

          {shifts.length === 0 ? (
            <p className="text-sm text-ink-secondary">No open shifts right now</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {shifts.map((shift) => {
                const myClaim = claims.find((c) => c.shift_id === shift.id && c.nurse_id === user.id)
                const claimCount = claims.filter((c) => c.shift_id === shift.id).length
                const isClaiming = claimingId === shift.id
                const isWithdrawing = withdrawingId === shift.id

                return (
                  <li key={shift.id}>
                    <ShiftCard
                      date={new Date(shift.starts_at)}
                      title={formatShiftTimeRange(shift.starts_at, shift.ends_at)}
                      pill={<ShiftPeriodPill period={getShiftPeriod(shift.starts_at)} />}
                      subtitle={
                        <p className="mt-0.5 truncate text-xs text-ink-secondary">
                          {shift.nurse_id
                            ? `Offered by ${shift.profiles?.full_name ?? 'a nurse'}`
                            : 'Open · unassigned'}
                        </p>
                      }
                      trailing={
                        myClaim ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm text-ink-secondary">Requested</span>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleWithdraw(shift)}
                              disabled={isWithdrawing}
                            >
                              {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleClaim(shift)}
                            disabled={isClaiming}
                          >
                            {isClaiming ? 'Requesting…' : 'Claim'}
                          </Button>
                        )
                      }
                    />

                    {claimCount > 0 && (
                      <p className="mt-1.5 pl-1 text-xs text-ink-secondary">
                        {claimCount} nurse{claimCount === 1 ? '' : 's'} requested
                      </p>
                    )}

                    {unavailableId === shift.id && (
                      <p className="mt-1.5 pl-1 text-xs text-red-700">
                        This shift is no longer available.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
