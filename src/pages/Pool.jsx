import { useEffect, useState } from 'react'
import { CalendarPlus, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createClaim, deleteClaim } from '../lib/claims'
import { PeriodTag } from '@/components/ui/period-tag'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import ClaimStatusList from './ClaimStatusList'
import ShiftDetail from './ShiftDetail'
import { formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

function ShiftCard({ date, title, subtitle, period, trailing, onOpen }) {
  const leftGroup = (
    <>
      <div className="ml-0.5 mr-0.5 flex w-8 shrink-0 flex-col items-center">
        <span className="text-[11px] font-medium tracking-[0.03em] text-[#85969B] uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[19px] leading-[1.15] font-medium text-ink">{date.getDate()}</span>
      </div>

      <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PeriodTag period={period} variant="bare" />
        <p className="truncate text-[13px] font-medium text-ink">{title}</p>
        {subtitle}
      </div>
    </>
  )

  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {leftGroup}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{leftGroup}</div>
      )}

      {trailing && <div className="ml-1 shrink-0">{trailing}</div>}
    </div>
  )
}

export default function Pool({ user, onGoToSchedule }) {
  const [shifts, setShifts] = useState([])
  const [claims, setClaims] = useState([])
  const [homeUnit, setHomeUnit] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [unavailableId, setUnavailableId] = useState(null)
  const [showClaimStatus, setShowClaimStatus] = useState(false)
  const [selectedShift, setSelectedShift] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
  }, [user.id, refreshKey])

  async function handleClaim(shift) {
    setUnavailableId(null)
    setClaimingId(shift.id)

    // Optimistic UI: show this shift as requested immediately
    const tempId = `temp-${shift.id}`
    setClaims((current) => [
      ...current,
      { id: tempId, shift_id: shift.id, nurse_id: user.id, status: 'pending' },
    ])

    const { claim, error: claimError } = await createClaim({
      shiftId: shift.id,
      nurseId: user.id,
    })

    setClaimingId(null)

    if (claimError || !claim) {
      // Shift is no longer open (or some other race) - roll back and tell the nurse
      setClaims((current) => current.filter((c) => c.id !== tempId))
      setUnavailableId(shift.id)
      return
    }

    setClaims((current) => current.map((c) => (c.id === tempId ? claim : c)))
  }

  async function handleWithdraw(shift) {
    const existingClaim = claims.find((c) => c.shift_id === shift.id && c.nurse_id === user.id)
    if (!existingClaim) return

    setWithdrawingId(shift.id)

    // Optimistic UI: remove the claim immediately
    setClaims((current) => current.filter((c) => c.id !== existingClaim.id))

    const { error: deleteError } = await deleteClaim({
      shiftId: shift.id,
      nurseId: user.id,
    })

    setWithdrawingId(null)

    if (deleteError) {
      // Roll back - keep the claim shown
      setClaims((current) => [...current, existingClaim])
    }
  }

  if (selectedShift) {
    return (
      <ShiftDetail
        shift={selectedShift}
        user={user}
        onBack={() => {
          setSelectedShift(null)
          setRefreshKey((current) => current + 1)
        }}
      />
    )
  }

  if (showClaimStatus) {
    return (
      <ClaimStatusList
        user={user}
        onBack={() => setShowClaimStatus(false)}
        onGoToSchedule={onGoToSchedule}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-12">
      <div className="mt-4 mb-1 flex items-center justify-between">
        <h1 className="font-display-title text-[26px] font-semibold tracking-[-0.02em] text-ink">Pool</h1>
        <button
          type="button"
          onClick={() => setShowClaimStatus(true)}
          aria-label="Claim status"
          data-testid="pool-claim-status-button"
          className="flex size-9 shrink-0 items-center justify-center rounded-control border border-hairline bg-card-surface text-ink-secondary"
        >
          <ListChecks size={18} strokeWidth={1.75} />
        </button>
      </div>

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
            <EmptyState
              icon={CalendarPlus}
              title="No open shifts right now"
              subline="Shifts posted for pickup will appear here."
              size="section"
              tone="teal"
            />
          ) : (
            <ul className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
              {shifts.map((shift, index) => {
                const myClaim = claims.find((c) => c.shift_id === shift.id && c.nurse_id === user.id)
                const claimCount = claims.filter((c) => c.shift_id === shift.id).length
                const isClaiming = claimingId === shift.id
                const isWithdrawing = withdrawingId === shift.id
                const isPastShift = new Date(shift.ends_at).getTime() < Date.now()

                return (
                  <li key={shift.id}>
                    <ShiftCard
                      date={new Date(shift.starts_at)}
                      title={formatShiftTimeRange(shift.starts_at, shift.ends_at)}
                      period={getShiftPeriod(shift.starts_at)}
                      onOpen={() => setSelectedShift(shift)}
                      subtitle={
                        unavailableId === shift.id ? (
                          <p className="truncate text-xs text-red-700">
                            This shift is no longer available.
                          </p>
                        ) : (
                          <p className="truncate text-xs text-ink-secondary">
                            {shift.nurse_id
                              ? `Offered by ${shift.profiles?.full_name ?? 'a nurse'}`
                              : 'Open · unassigned'}
                            {claimCount > 0 && (
                              <>
                                {' '}
                                · {claimCount} nurse{claimCount === 1 ? '' : 's'} requested
                              </>
                            )}
                          </p>
                        )
                      }
                      trailing={
                        myClaim ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-medium text-ink-secondary">Requested</span>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleWithdraw(shift)}
                              disabled={isWithdrawing}
                              data-testid="pool-withdraw-claim"
                            >
                              {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleClaim(shift)}
                            disabled={isClaiming || isPastShift}
                            data-testid="pool-claim-shift"
                          >
                            {isClaiming ? 'Requesting…' : 'Claim'}
                          </Button>
                        )
                      }
                    />

                    {index < shifts.length - 1 && <ShiftListDivider variant="pool" />}
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
