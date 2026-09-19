import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CircleCheck } from 'lucide-react'
import { NavRow } from '@/components/ui/nav-row'
import { PeriodTag } from '@/components/ui/period-tag'
import { EmptyState } from '@/components/ui/empty-state'
import { getInitials, formatTimeAgo } from '@/lib/manageFormat'
import { formatShiftDate, formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'

// Coordinator — Approvals, per CoordinatorApprovalsLinearLight.dc.html.
// Moved out of Schedule.jsx's ManageTab ("Pending claims" + "Pending swaps"
// sections) into its own pushed screen, reached directly from Home's
// Approvals tile. Approve/deny logic is unchanged.
//
// The mockup draws one approval card per claim (not one card per shift with
// nested claimant rows, which is how ManageTab used to group simultaneous
// claims on the same shift) - flattened to match, dropping the old "RECENT"
// badge that only made sense in the nested view. Swap cards keep full
// date/time/period per side (mockup's own text is a terser "Mon 15 Day"
// summary) rather than losing that detail, while still moving to the
// mockup's one-line-per-side layout instead of the old nested divided list.
export default function CoordinatorApprovals({ onBack }) {
  const [claimGroups, setClaimGroups] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actioningShiftId, setActioningShiftId] = useState(null)

  const [pendingSwaps, setPendingSwaps] = useState([])
  const [swapsLoading, setSwapsLoading] = useState(true)
  const [swapsError, setSwapsError] = useState(null)
  const [swapActionError, setSwapActionError] = useState(null)
  const [actioningSwapId, setActioningSwapId] = useState(null)

  async function fetchPendingClaims() {
    setPendingLoading(true)
    setPendingError(null)

    const { data, error: fetchError } = await supabase
      .from('shift_claims')
      .select(`
        id, shift_id, nurse_id, claimed_at, status,
        profiles!nurse_id ( full_name, credential ),
        shifts!shift_id ( id, unit, starts_at, ends_at, status, is_offered, nurse_id )
      `)
      .eq('status', 'pending')
      .order('claimed_at', { ascending: false })

    if (fetchError) {
      setPendingError(fetchError.message)
      setClaimGroups([])
      setPendingLoading(false)
      return
    }

    const groups = new Map()
    for (const claim of data ?? []) {
      const shift = claim.shifts
      const isEligible =
        shift &&
        (shift.status === 'open' ||
          shift.status === 'pending' ||
          (shift.is_offered && shift.status === 'scheduled'))
      if (!isEligible) continue

      if (!groups.has(claim.shift_id)) {
        groups.set(claim.shift_id, { shift, claims: [] })
      }
      groups.get(claim.shift_id).claims.push(claim)
    }

    const groupList = Array.from(groups.values()).sort(
      (a, b) => new Date(a.shift.starts_at) - new Date(b.shift.starts_at),
    )

    setClaimGroups(groupList)
    setPendingLoading(false)
  }

  useEffect(() => {
    fetchPendingClaims()
  }, [])

  async function fetchPendingSwaps() {
    setSwapsLoading(true)
    setSwapsError(null)

    const { data, error: fetchError } = await supabase
      .from('shift_swaps')
      .select(`
        id, status, created_at,
        requester_id, recipient_id, requester_shift_id, recipient_shift_id,
        requester:profiles!requester_id ( full_name, credential ),
        recipient:profiles!recipient_id ( full_name, credential ),
        requester_shift:shifts!requester_shift_id ( id, unit, starts_at, ends_at ),
        recipient_shift:shifts!recipient_shift_id ( id, unit, starts_at, ends_at )
      `)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setSwapsError(fetchError.message)
      setPendingSwaps([])
      setSwapsLoading(false)
      return
    }

    setPendingSwaps((data ?? []).filter((swap) => swap.requester_shift && swap.recipient_shift))
    setSwapsLoading(false)
  }

  useEffect(() => {
    fetchPendingSwaps()
  }, [])

  async function handleApprove(group, claim) {
    setActionError(null)
    setActioningShiftId(group.shift.id)

    // Computed before the update below (from the group's pre-update local
    // state), since approving overwrites shifts.nurse_id with the claimant's
    // id - the original offering nurse's id wouldn't be recoverable from the
    // shift row afterward otherwise.
    const wasOffered =
      group.shift.is_offered && group.shift.nurse_id && group.shift.nurse_id !== claim.nurse_id

    const { error: shiftError } = await supabase
      .from('shifts')
      .update({
        status: 'scheduled',
        nurse_id: claim.nurse_id,
        is_offered: false,
        ...(wasOffered ? { previous_nurse_id: group.shift.nurse_id } : {}),
      })
      .eq('id', group.shift.id)

    if (shiftError) {
      setActioningShiftId(null)
      setActionError(shiftError.message)
      return
    }

    const { error: approveError } = await supabase
      .from('shift_claims')
      .update({ status: 'approved' })
      .eq('id', claim.id)

    if (approveError) {
      setActioningShiftId(null)
      setActionError(approveError.message)
      return
    }

    const otherClaims = group.claims.filter((c) => c.id !== claim.id)

    if (otherClaims.length > 0) {
      const { error: denyOthersError } = await supabase
        .from('shift_claims')
        .update({
          status: 'denied',
          denial_message: 'Sorry, this shift has been filled by another team member.',
        })
        .in('id', otherClaims.map((c) => c.id))

      if (denyOthersError) {
        setActionError(denyOthersError.message)
      }
    }

    const shiftDetails = `${group.shift.unit} · ${formatShiftDate(group.shift.starts_at)} · ${formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)}`

    const notificationRows = [
      {
        user_id: claim.nurse_id,
        type: 'claim_approved',
        message: `Your claim for ${shiftDetails} was approved. You're on the schedule.`,
        shift_id: group.shift.id,
      },
      ...otherClaims.map((c) => ({
        user_id: c.nurse_id,
        type: 'claim_denied',
        message: 'Sorry, this shift has been filled by another team member.',
        shift_id: group.shift.id,
      })),
    ]

    if (wasOffered) {
      notificationRows.push({
        user_id: group.shift.nurse_id,
        type: 'offer_claimed',
        message: `Your ${formatShiftDate(group.shift.starts_at)} shift was picked up by ${claim.profiles?.full_name ?? 'another nurse'}.`,
        shift_id: group.shift.id,
      })
    }

    const { error: notifyError } = await supabase.from('notifications').insert(notificationRows)

    setActioningShiftId(null)

    if (notifyError) {
      setActionError(notifyError.message)
    }

    fetchPendingClaims()
  }

  async function handleDeny(group, claim) {
    setActionError(null)
    setActioningShiftId(group.shift.id)

    const { error: denyError } = await supabase
      .from('shift_claims')
      .update({
        status: 'denied',
        denial_message: 'Your claim was not approved. The shift is open again.',
      })
      .eq('id', claim.id)

    if (denyError) {
      setActioningShiftId(null)
      setActionError(denyError.message)
      return
    }

    const shiftDetails = `${group.shift.unit} · ${formatShiftDate(group.shift.starts_at)} · ${formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)}`

    const { error: notifyError } = await supabase.from('notifications').insert({
      user_id: claim.nurse_id,
      type: 'claim_denied',
      message: `Your claim for ${shiftDetails} was not approved. The shift is open again.`,
      shift_id: group.shift.id,
    })

    setActioningShiftId(null)

    if (notifyError) {
      setActionError(notifyError.message)
    }

    fetchPendingClaims()
  }

  async function handleApproveSwap(swap) {
    setSwapActionError(null)
    setActioningSwapId(swap.id)

    const { error: giveError } = await supabase
      .from('shifts')
      .update({ nurse_id: swap.recipient_id })
      .eq('id', swap.requester_shift_id)

    if (giveError) {
      setActioningSwapId(null)
      setSwapActionError(giveError.message)
      return
    }

    const { error: getError } = await supabase
      .from('shifts')
      .update({ nurse_id: swap.requester_id })
      .eq('id', swap.recipient_shift_id)

    if (getError) {
      setActioningSwapId(null)
      setSwapActionError(getError.message)
      return
    }

    const { error: approveError } = await supabase
      .from('shift_swaps')
      .update({ status: 'approved', decided_at: new Date().toISOString() })
      .eq('id', swap.id)

    if (approveError) {
      setActioningSwapId(null)
      setSwapActionError(approveError.message)
      return
    }

    const { error: notifyError } = await supabase.from('notifications').insert([
      {
        user_id: swap.requester_id,
        type: 'swap_approved',
        message: `Your swap with ${swap.recipient?.full_name ?? 'your coworker'} was approved.`,
        shift_id: swap.recipient_shift_id,
      },
      {
        user_id: swap.recipient_id,
        type: 'swap_approved',
        message: `Your swap with ${swap.requester?.full_name ?? 'your coworker'} was approved.`,
        shift_id: swap.requester_shift_id,
      },
    ])

    setActioningSwapId(null)
    if (notifyError) setSwapActionError(notifyError.message)

    fetchPendingSwaps()
  }

  async function handleDenySwap(swap) {
    setSwapActionError(null)
    setActioningSwapId(swap.id)

    const { error: denyError } = await supabase
      .from('shift_swaps')
      .update({ status: 'denied', decided_at: new Date().toISOString() })
      .eq('id', swap.id)

    if (denyError) {
      setActioningSwapId(null)
      setSwapActionError(denyError.message)
      return
    }

    const { error: notifyError } = await supabase.from('notifications').insert([
      {
        user_id: swap.requester_id,
        type: 'swap_denied',
        message: 'Your coordinator did not approve this swap.',
        shift_id: swap.requester_shift_id,
      },
      {
        user_id: swap.recipient_id,
        type: 'swap_denied',
        message: 'Your coordinator did not approve this swap.',
        shift_id: swap.recipient_shift_id,
      },
    ])

    setActioningSwapId(null)
    if (notifyError) setSwapActionError(notifyError.message)

    fetchPendingSwaps()
  }

  const loading = pendingLoading || swapsLoading
  const pendingCount = claimGroups.reduce((n, g) => n + g.claims.length, 0) + pendingSwaps.length
  const isEmpty = !loading && pendingCount === 0

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow
        title="Approvals"
        subtitle={!loading && pendingCount > 0 ? `· ${pendingCount} pending` : undefined}
        onBack={onBack}
      />

      <main className="flex flex-1 flex-col gap-3 px-5 pt-2.5 pb-12">
        {loading && <p className="text-sm text-ink-secondary">Loading…</p>}
        {pendingError && (
          <p className="text-sm text-red-700">Could not load pending claims: {pendingError}</p>
        )}
        {swapsError && <p className="text-sm text-red-700">Could not load pending swaps: {swapsError}</p>}
        {actionError && <p className="text-sm text-red-700">{actionError}</p>}
        {swapActionError && <p className="text-sm text-red-700">{swapActionError}</p>}

        {isEmpty && (
          <EmptyState
            icon={CircleCheck}
            title="Nothing waiting on you right now"
            subline="Requests that need your approval will appear here."
            size="inline"
            tone="teal"
          />
        )}

        {!loading &&
          claimGroups.map((group) =>
            group.claims.map((claim) => {
              const period = getShiftPeriod(group.shift.starts_at)
              const isActioning = actioningShiftId === group.shift.id

              return (
                <div
                  key={claim.id}
                  className="flex flex-col gap-2.5 rounded-card border border-hairline bg-card-surface p-4 shadow-card-lift"
                >
                  <span className="self-start rounded-control-sm bg-press-state px-2 py-[3px] text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                    Claim
                  </span>

                  <div className="flex flex-row items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-press-state text-xs font-semibold text-ink-secondary">
                      {getInitials(claim.profiles?.full_name)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                        {claim.profiles?.full_name ?? 'Unknown'} wants this shift
                      </p>
                      <p className="truncate text-xs text-ink-secondary">
                        {formatShiftDate(group.shift.starts_at)} · {formatShiftTimeRange(group.shift.starts_at, group.shift.ends_at)} · {group.shift.unit}
                      </p>
                      <p className="text-xs text-ink-secondary">{formatTimeAgo(claim.claimed_at)}</p>
                    </div>
                    <PeriodTag period={period} />
                  </div>

                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(group, claim)}
                      disabled={isActioning}
                      data-testid="schedule-manage-approve-claim"
                      className="flex h-[38px] flex-1 items-center justify-center rounded-button bg-teal-field text-[13px] font-semibold text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeny(group, claim)}
                      disabled={isActioning}
                      data-testid="schedule-manage-deny-claim"
                      className="flex h-[38px] flex-1 items-center justify-center rounded-button border border-hairline bg-card-surface text-[13px] font-semibold text-ink disabled:opacity-60"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              )
            }),
          )}

        {!loading &&
          pendingSwaps.map((swap) => {
            const isActioning = actioningSwapId === swap.id

            return (
              <div
                key={swap.id}
                className="flex flex-col gap-2.5 rounded-card border border-hairline bg-card-surface p-4 shadow-card-lift"
              >
                <span className="self-start rounded-control-sm bg-press-state px-2 py-[3px] text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                  Swap
                </span>

                <div className="flex flex-row items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-press-state text-xs font-semibold text-ink-secondary">
                    {getInitials(swap.requester?.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                      {swap.requester?.full_name ?? 'Unknown'} &harr; {swap.recipient?.full_name ?? 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-hairline pt-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-ink-secondary">
                      {swap.requester?.full_name}&rsquo;s shift &middot; {formatShiftDate(swap.requester_shift.starts_at)} &middot; {formatShiftTimeRange(swap.requester_shift.starts_at, swap.requester_shift.ends_at)}
                    </p>
                    <PeriodTag period={getShiftPeriod(swap.requester_shift.starts_at)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-ink-secondary">
                      {swap.recipient?.full_name}&rsquo;s shift &middot; {formatShiftDate(swap.recipient_shift.starts_at)} &middot; {formatShiftTimeRange(swap.recipient_shift.starts_at, swap.recipient_shift.ends_at)}
                    </p>
                    <PeriodTag period={getShiftPeriod(swap.recipient_shift.starts_at)} />
                  </div>
                </div>

                <div className="flex flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveSwap(swap)}
                    disabled={isActioning}
                    data-testid="schedule-manage-approve-swap"
                    className="flex h-[38px] flex-1 items-center justify-center rounded-button bg-teal-field text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDenySwap(swap)}
                    disabled={isActioning}
                    data-testid="schedule-manage-deny-swap"
                    className="flex h-[38px] flex-1 items-center justify-center rounded-button border border-hairline bg-card-surface text-[13px] font-semibold text-ink disabled:opacity-60"
                  >
                    Deny
                  </button>
                </div>
              </div>
            )
          })}
      </main>
    </div>
  )
}
