import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { SwapStack, SwapCard, SwapConnector } from '@/components/ui/swap-card'

// Swap 3 - Review Swap, per SwapReviewLinearLight.dc.html. Sends the actual
// shift_swaps row on confirm; the recipient's and (later) coordinator's steps
// happen elsewhere (SwapStatusDetail / ManageTab), this screen only creates
// the request.
export default function SwapReview({ user, myShift, coworker, coworkerShift, onSent, onBack, onCancel }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [myName, setMyName] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchMyName() {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (!cancelled) setMyName(data?.full_name ?? null)
    }

    fetchMyName()
    return () => { cancelled = true }
  }, [user.id])

  async function handleSend() {
    setSending(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('shift_swaps')
      .insert({
        requester_id: user.id,
        requester_shift_id: myShift.id,
        recipient_id: coworker.id,
        recipient_shift_id: coworkerShift.id,
        status: 'requested',
      })
      .select('id, requester_id, requester_shift_id, recipient_id, recipient_shift_id, status, created_at')
      .single()

    if (insertError || !data) {
      setSending(false)
      setError(insertError?.message ?? 'Could not send the swap request.')
      return
    }

    const { error: notifyError } = await supabase.from('notifications').insert({
      user_id: coworker.id,
      type: 'swap_requested',
      message: `${myName ?? 'A coworker'} wants to swap shifts with you.`,
      shift_id: myShift.id,
    })

    setSending(false)

    if (notifyError) {
      setError(notifyError.message)
    }

    onSent(data)
  }

  return (
    <div
      className="fixed inset-0 z-[110] mx-auto flex w-full max-w-md flex-col bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Review Swap" onBack={onBack} />

      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-2.5">
        <SwapStack>
          <SwapCard label="You give" shift={myShift} meta={myShift.unit} />
          <SwapConnector />
          <SwapCard
            label="You get"
            shift={coworkerShift}
            meta={coworkerShift.unit}
            personName={coworker.full_name}
            personLabel={`${coworker.full_name}'s shift`}
          />
        </SwapStack>

        <div className="flex gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-secondary" />
          <p className="text-[13px] leading-[1.4] text-ink-tertiary">
            {coworker.full_name} needs to accept this request. Once they do, your coordinator reviews it
            before the swap is final.
          </p>
        </div>

        {error && <p className="text-xs text-red-700">{error}</p>}
      </main>

      <div
        className="flex shrink-0 flex-col gap-2.5 px-5 pt-2 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button type="button" disabled={sending} onClick={handleSend} data-testid="swap-review-send">
          {sending ? 'Sending…' : 'Send Swap Request'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          data-testid="swap-review-cancel"
          className="text-center text-sm font-semibold text-ink-secondary disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
