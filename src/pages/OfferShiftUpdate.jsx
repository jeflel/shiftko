import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Stepper } from '@/components/ui/stepper'
import { StatusBanner } from '@/components/ui/status-banner'
import { HeroCard } from '@/components/ui/hero-card'
import { Button } from '@/components/ui/button'
import { CoworkerRow } from './OfferShiftStatus'
import { formatRelativeTime } from '@/lib/shiftFormat'

const STEPS = [{ label: 'Offered', done: true }, { label: 'Claimed', done: true }, { label: 'Approved', done: true }]

// Terminal state of a nurse's own offered shift, per
// OfferShiftPickedUpLinearLight.dc.html ("Shift Update"). Only reachable
// from a notification tap (Home.jsx's offer_claimed handler) since
// shifts.nurse_id no longer equals this nurse once the pickup is approved -
// the shift has dropped off their own upcoming/past lists. Looked up by
// previous_nurse_id (see the migration this flow added) rather than
// nurse_id.
export default function OfferShiftUpdate({ shiftId, onBack, onGoToSchedule }) {
  const [shift, setShift] = useState(null)
  const [claim, setClaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchShiftUpdate() {
      setLoading(true)
      setError(null)

      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id, unit, starts_at, ends_at')
        .eq('id', shiftId)
        .maybeSingle()

      if (cancelled) return

      if (shiftError || !shiftData) {
        setError(shiftError?.message ?? 'This shift is no longer available.')
        setLoading(false)
        return
      }

      setShift(shiftData)

      const { data: claimData } = await supabase
        .from('shift_claims')
        .select('claimed_at, nurse_id, profiles!nurse_id ( full_name, credential )')
        .eq('shift_id', shiftId)
        .eq('status', 'approved')
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setClaim(claimData ?? null)
      setLoading(false)
    }

    fetchShiftUpdate()
    return () => {
      cancelled = true
    }
  }, [shiftId])

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Shift Update" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5">
        {loading && <p className="text-sm text-ink-secondary">Loading…</p>}
        {!loading && error && <p className="text-sm text-red-700">{error}</p>}

        {!loading && !error && shift && (
          <>
            <Stepper steps={STEPS} />

            <StatusBanner icon={CheckCircle2}>
              Approved by your coordinator, no longer on your schedule
            </StatusBanner>

            <HeroCard shift={shift} />

            {claim && (
              <CoworkerRow
                label="Picked Up By"
                profile={claim.profiles}
                timestamp={`claimed ${formatRelativeTime(claim.claimed_at)}`}
              />
            )}
          </>
        )}
      </main>

      <div
        className="flex flex-col gap-2.5 px-5 pt-2 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button type="button" variant="secondary" onClick={onGoToSchedule}>
          Back to Schedule
        </Button>
      </div>
    </div>
  )
}
