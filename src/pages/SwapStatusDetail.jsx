import { useState } from 'react'
import { Clock, CircleCheck, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import { StatusBanner } from '@/components/ui/status-banner'
import { SwapStack, SwapCard, SwapConnector } from '@/components/ui/swap-card'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

function firstName(fullName) {
  return fullName?.split(' ')[0] ?? 'They'
}

// One component branching by (status, viewer role) rather than a separate
// page per SwapStatus*/SwapIncomingRequest mockup - every branch shares the
// same stepper/swap-card shape, only the banner text, stepper state, and
// bottom action differ. Declined has no mockup at all (only accepted/approved
// are drawn from the requester's side) - extends the Accepted shape the same
// way ClaimStatusDetail's invented Denied extends its Approved shape: the
// step where things stopped turns red, everything before stays done.
export default function SwapStatusDetail({ swap, viewerId, onBack, onGoToSchedule, onChanged }) {
  const [acting, setActing] = useState(false)
  const [error, setError] = useState(null)

  const isRequester = swap.requester_id === viewerId
  const otherParty = isRequester ? swap.recipient : swap.requester
  const myShift = isRequester ? swap.requester_shift : swap.recipient_shift
  const theirShift = isRequester ? swap.recipient_shift : swap.requester_shift
  const isIncoming = !isRequester && swap.status === 'requested'

  const steps = [
    { label: 'Requested', done: swap.status !== 'requested', current: swap.status === 'requested' },
    {
      label: swap.status === 'declined' ? 'Declined' : 'Accepted',
      done: swap.status === 'approved' || swap.status === 'denied',
      current: swap.status === 'accepted',
      failed: swap.status === 'declined',
    },
    {
      label: swap.status === 'denied' ? 'Denied' : 'Approved',
      done: swap.status === 'approved',
      failed: swap.status === 'denied',
    },
  ]

  async function handleCancel() {
    setActing(true)
    setError(null)
    const { error: deleteError } = await supabase.from('shift_swaps').delete().eq('id', swap.id)
    setActing(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onChanged?.()
  }

  async function respond(newStatus) {
    setActing(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('shift_swaps')
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq('id', swap.id)

    if (updateError) {
      setActing(false)
      setError(updateError.message)
      return
    }

    const { error: notifyError } = await supabase.from('notifications').insert({
      user_id: swap.requester_id,
      type: newStatus === 'accepted' ? 'swap_accepted' : 'swap_declined',
      message:
        newStatus === 'accepted'
          ? `${otherParty?.full_name ?? 'Your coworker'} accepted your swap request.`
          : `${otherParty?.full_name ?? 'Your coworker'} declined your swap request.`,
      shift_id: swap.requester_shift_id,
    })

    setActing(false)
    if (notifyError) setError(notifyError.message)
    onChanged?.()
  }

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Swap Request" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5">
        <Stepper steps={steps} />

        {isIncoming && (
          <StatusBanner avatarInitials={getInitials(otherParty?.full_name)}>
            {otherParty?.full_name ?? 'A coworker'} wants to swap shifts with you
          </StatusBanner>
        )}
        {!isIncoming && swap.status === 'requested' && (
          <StatusBanner icon={Clock}>Waiting for {otherParty?.full_name ?? 'them'} to respond</StatusBanner>
        )}
        {swap.status === 'accepted' && (
          <StatusBanner icon={Clock}>
            {isRequester
              ? `${firstName(otherParty?.full_name)} accepted — waiting for coordinator approval`
              : 'You accepted — waiting for coordinator approval'}
          </StatusBanner>
        )}
        {swap.status === 'approved' && (
          <StatusBanner icon={CircleCheck}>Approved by your coordinator — the swap is final</StatusBanner>
        )}
        {swap.status === 'declined' && (
          <StatusBanner icon={CircleAlert}>
            {isRequester
              ? `${firstName(otherParty?.full_name)} declined. Nothing changed.`
              : 'You declined. Nothing changed.'}
          </StatusBanner>
        )}
        {swap.status === 'denied' && (
          <StatusBanner icon={CircleAlert}>Not approved by your coordinator. Nothing changed.</StatusBanner>
        )}

        <SwapStack>
          <SwapCard
            label={swap.status === 'approved' ? 'You gave' : 'You give'}
            shift={myShift}
            meta={myShift?.unit}
          />
          <SwapConnector />
          <SwapCard
            label={swap.status === 'approved' ? 'You got' : 'You get'}
            shift={theirShift}
            meta={theirShift?.unit}
            personName={otherParty?.full_name}
            personLabel={
              swap.status === 'approved' ? `from ${otherParty?.full_name}` : `${otherParty?.full_name}'s shift`
            }
          />
        </SwapStack>

        {swap.status === 'accepted' && (
          <p className="text-center text-xs text-ink-secondary">
            You&rsquo;ll be notified once your coordinator reviews this.
          </p>
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}
      </main>

      <div
        className="flex flex-col gap-2.5 px-5 pt-2 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {isIncoming && (
          <>
            <Button type="button" disabled={acting} onClick={() => respond('accepted')} data-testid="swap-accept">
              {acting ? 'Accepting…' : 'Accept'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={acting}
              onClick={() => respond('declined')}
              data-testid="swap-decline"
            >
              {acting ? 'Declining…' : 'Decline'}
            </Button>
          </>
        )}
        {!isIncoming && swap.status === 'requested' && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={acting}
            data-testid="swap-cancel-request"
            className="text-center text-sm font-semibold text-ink-secondary disabled:opacity-50"
          >
            {acting ? 'Cancelling…' : 'Cancel Request'}
          </button>
        )}
        {swap.status === 'approved' && (
          <Button type="button" variant="secondary" onClick={onGoToSchedule}>
            Back to Schedule
          </Button>
        )}
        {(swap.status === 'declined' || swap.status === 'denied') && (
          <Button type="button" variant="secondary" onClick={onBack}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
