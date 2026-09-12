import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { HeroCard } from '@/components/ui/hero-card'

// Confirm step before turning shifts.is_offered on, per
// OfferShiftConfirmLinearLight.dc.html. Replaces ShiftDetail's old 1-tap
// toggle with a ceremony explaining the pool mechanic first - the product
// decision from HANDOFF.md §0.3 (kept the mockup's 4-screen stepper).
export default function OfferShiftConfirm({ shift, credential, onBack, onOffered }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setError(null)
    setSaving(true)

    const { error: rpcError } = await supabase.rpc('toggle_shift_offer', {
      p_shift_id: shift.id,
      p_offer: true,
    })

    setSaving(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    onOffered()
  }

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Offer This Shift" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5">
        <HeroCard shift={shift} credential={credential} />

        <div className="flex gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-secondary" />
          <p className="text-[13px] leading-[1.4] text-ink-tertiary">
            This shift goes back into the open pool for any qualified coworker on {shift.unit} to
            claim. You&rsquo;ll stay assigned until someone picks it up, and get notified when
            they do.
          </p>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
      </main>

      <div
        className="flex flex-col gap-2.5 px-5 pt-2 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button type="button" onClick={handleConfirm} disabled={saving} data-testid="offer-shift-confirm">
          {saving ? 'Offering…' : 'Offer to the Pool'}
        </Button>
        <Button type="button" variant="secondary" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
