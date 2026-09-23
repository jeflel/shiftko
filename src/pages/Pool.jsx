import { useEffect, useState } from 'react'
import { CalendarPlus, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createClaim, deleteClaim } from '../lib/claims'
import { PeriodTag } from '@/components/ui/period-tag'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SHIFT_LIST_BORDERLESS_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { ShiftListSkeleton } from '@/components/ui/list-skeleton'
import { paintCacheKey, readPaintCache, writePaintCache } from '@/lib/paint-cache'
import ClaimStatusList from './ClaimStatusList'
import ShiftDetail from './ShiftDetail'
import { formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

// Pool's row actions sit one step below the Button component's own `sm` size: a
// 13px label in a 34px pill. That is the type treatment the app's other compact
// in-row actions already use (StaffRoster's pill), and it puts the action level
// with the row title's own 13px instead of shouting over it, which is what a
// 15px/600 label in a 38px pill did against a 13px/500 title. Both row actions
// read this one string, so the next value is a one-line change.
const ROW_ACTION_CLASSNAME = 'h-[34px] text-[13px]'

function ShiftCard({ date, title, subtitle, period, trailing, onOpen }) {
  const leftGroup = (
    <>
      <div className="ml-0.5 mr-0.5 flex w-8 shrink-0 flex-col items-center">
        <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
          {weekdayFormatter.format(date)}
        </span>
        <span className="text-[19px] leading-[1.15] font-semibold text-ink">{date.getDate()}</span>
      </div>

      <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PeriodTag period={period} variant="bare" />
        <p className="truncate text-[13px] font-medium text-ink">{title}</p>
        {subtitle}
      </div>
    </>
  )

  return (
    <div data-testid="pool-shift-row" className="flex w-full items-center gap-3 px-4 py-3.5">
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

export default function Pool({ user, homeUnit, onGoToSchedule }) {
  // The last payload for this tab, read once per mount, so coming back to Pool
  // paints from it instead of holding the screen until three reads land.
  const paintKey = paintCacheKey('pool', user.id)
  const [cached] = useState(() => readPaintCache(paintKey))
  const [shifts, setShifts] = useState(cached?.shifts ?? [])
  const [claims, setClaims] = useState(cached?.claims ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [unavailableId, setUnavailableId] = useState(null)
  const [showClaimStatus, setShowClaimStatus] = useState(false)
  const [selectedShift, setSelectedShift] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // One request instead of three (2026-09-22). The home unit comes from App's
  // profile read, which removed the FIRST round trip, and the claims now ride
  // along with the shifts as an embedded resource, which removed the third. The
  // two remaining requests used to run in series, so the count went from three
  // sequential round trips to one.
  //
  // Two things about the embed, both verified against the real database before
  // it was written: the relationship is shifts -> shift_claims on
  // `shift_claims_shift_id_fkey` (a one-to-many, so the value is a list), and
  // RLS's "nurses read claims on their unit" policy is what scopes it, which is
  // exactly the set this screen wants.
  //
  // The claims are deliberately NOT filtered to `pending` in the request:
  // filtering an embedded resource in PostgREST turns the embed into an inner
  // join, which would drop every shift that has no matching claim from the list.
  // They are filtered here instead.
  useEffect(() => {
    let cancelled = false
    const unit = homeUnit ?? null

    async function fetchOpenShifts() {
      if (!cached) setLoading(true)
      setError(null)

      if (!unit) {
        setShifts([])
        setClaims([])
        setLoading(false)
        return
      }

      const { data, error: shiftsError } = await supabase
        .from('shifts')
        .select(
          'id, unit, starts_at, ends_at, status, is_offered, nurse_id, profiles!nurse_id ( full_name ), shift_claims ( id, shift_id, nurse_id, status )',
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

      const nextShifts = data ?? []
      const nextClaims = nextShifts.flatMap((shift) =>
        (shift.shift_claims ?? []).filter((claim) => claim.status === 'pending'),
      )

      setShifts(nextShifts)
      setClaims(nextClaims)
      setLoading(false)
      writePaintCache(paintKey, { shifts: nextShifts, claims: nextClaims })
    }

    fetchOpenShifts()
    return () => { cancelled = true }
  }, [user.id, refreshKey, homeUnit, cached, paintKey])

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

      {loading && (
        <div className="flex flex-col gap-4" aria-hidden="true">
          <span className="h-[19px] w-[220px] rounded bg-track-neutral" />
          <ShiftListSkeleton rows={3} variant="borderless" trailing />
        </div>
      )}
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
            <ul className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
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
                              className={ROW_ACTION_CLASSNAME}
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
                            /* The deep teal now comes from the primary
                               variant itself, so this carries only the touch
                               press step: the variant's hover never fires on a
                               touch screen. */
                            className={`${ROW_ACTION_CLASSNAME} active:bg-teal-field-hover`}
                            onClick={() => handleClaim(shift)}
                            disabled={isClaiming || isPastShift}
                            data-testid="pool-claim-shift"
                          >
                            {isClaiming ? 'Requesting…' : 'Claim'}
                          </Button>
                        )
                      }
                    />

                    {index < shifts.length - 1 && <ShiftListDivider />}
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
