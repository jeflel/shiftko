import { useState } from 'react'
import { Check, Clock, CircleCheck, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { PeriodTag } from '@/components/ui/period-tag'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import { formatShiftDate, formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'

// 3-step Claimed / Pending Approval / Approved stepper, per
// ClaimStatusPendingLinearLight.dc.html and ClaimStatusApprovedLinearLight.dc.html.
// No mockup covers a denied claim, so this extends the same shape: the final
// step turns red instead of reaching "Approved", flagged in
// LINEAR_LIGHT_ROLLOUT.md as an invented variant.
function ClaimStepper({ status }) {
  const isPending = status === 'pending'
  const isDenied = status === 'denied'

  const steps = [
    { label: 'Claimed', done: true },
    { label: 'Pending Approval', done: !isPending, current: isPending },
    { label: isDenied ? 'Denied' : 'Approved', done: !isPending && !isDenied, failed: isDenied },
  ]

  return <Stepper steps={steps} />
}

function StatusBanner({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card bg-press-state px-3.5 py-3">
      <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-secondary" />
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{children}</span>
    </div>
  )
}

function HeroCard({ shift }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-hairline bg-card-surface p-4 shadow-card-lift">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink-secondary">
          {formatShiftDate(shift.starts_at)}
        </span>
        <PeriodTag period={getShiftPeriod(shift.starts_at)} />
      </div>
      <div className="text-[25px] font-semibold tracking-[-0.01em] text-ink">
        {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
      </div>
      <div className="text-[13px] text-ink-secondary">{shift.unit}</div>
    </div>
  )
}

export default function ClaimStatusDetail({ claim, onBack, onGoToSchedule, onWithdrawn }) {
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState(null)
  const shift = claim.shifts

  async function handleCancelClaim() {
    setWithdrawing(true)
    setWithdrawError(null)

    const { error } = await supabase.from('shift_claims').delete().eq('id', claim.id)

    setWithdrawing(false)

    if (error) {
      setWithdrawError(error.message)
      return
    }

    onWithdrawn?.()
  }

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Claim Status" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5">
        <ClaimStepper status={claim.status} />

        {claim.status === 'pending' && (
          <StatusBanner icon={Clock}>
            Waiting for your coordinator to approve the claim
          </StatusBanner>
        )}
        {claim.status === 'approved' && (
          <StatusBanner icon={CircleCheck}>
            Approved by your coordinator, added to your schedule
          </StatusBanner>
        )}
        {claim.status === 'denied' && (
          <StatusBanner icon={CircleAlert}>Not approved. The shift stayed open</StatusBanner>
        )}

        <HeroCard shift={shift} />

        {claim.status === 'pending' && (
          <div className="flex gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-secondary" />
            <p className="text-[13px] leading-[1.4] text-ink-tertiary">
              This shift isn&rsquo;t on your schedule yet. Your coordinator reviews every claim
              before it&rsquo;s added. You&rsquo;ll get a notification either way.
            </p>
          </div>
        )}

        {claim.status === 'approved' && (
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
              Approved
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-press-state text-ink-secondary">
                <Check size={16} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Your coordinator</p>
                <p className="text-xs text-ink-secondary">Added to your schedule</p>
              </div>
            </div>
          </div>
        )}

        {claim.status === 'denied' && claim.denial_message && (
          <div className="flex gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-secondary" />
            <p className="text-[13px] leading-[1.4] text-ink-tertiary">{claim.denial_message}</p>
          </div>
        )}

        {withdrawError && <p className="text-xs text-red-700">{withdrawError}</p>}
      </main>

      <div
        className="flex flex-col gap-2.5 px-5 pt-2 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {claim.status === 'pending' && (
          <button
            type="button"
            onClick={handleCancelClaim}
            disabled={withdrawing}
            data-testid="claim-status-cancel"
            className="text-center text-sm font-semibold text-ink-secondary disabled:opacity-50"
          >
            {withdrawing ? 'Cancelling…' : 'Cancel Claim'}
          </button>
        )}
        {claim.status === 'approved' && (
          <Button type="button" variant="secondary" onClick={onGoToSchedule}>
            Back to Schedule
          </Button>
        )}
        {claim.status === 'denied' && (
          <Button type="button" variant="secondary" onClick={onBack}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
