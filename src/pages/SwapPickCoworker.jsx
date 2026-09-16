import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users } from 'lucide-react'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PersonPickerRow } from '@/components/ui/selection-row'
import { formatShiftDayShort, formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'
import { PeriodTag } from '@/components/ui/period-tag'

// Swap 1 - Pick Coworker, per SwapPickCoworkerLinearLight.dc.html. Candidates
// are nurses on the requester's own unit (same scoping Pool uses for open
// shifts) - a swap only makes sense between nurses who can cover the same
// unit.
export default function SwapPickCoworker({ user, shift, selectedCoworker, onSelect, onContinue, onBack }) {
  const [coworkers, setCoworkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCoworkers() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, credential')
        .eq('role', 'nurse')
        .eq('home_unit', shift.unit)
        .neq('id', user.id)
        .order('full_name', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setCoworkers([])
      } else {
        setCoworkers(data ?? [])
      }
      setLoading(false)
    }

    fetchCoworkers()
    return () => { cancelled = true }
  }, [user.id, shift.unit])

  return (
    <div
      className="fixed inset-0 z-[110] mx-auto flex w-full max-w-md flex-col bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Request a Swap" onBack={onBack} />

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2.5 pb-4">
        <div className="flex items-center gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
          <PeriodTag period={getShiftPeriod(shift.starts_at)} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
              Your shift
            </div>
            <div className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
              {formatShiftDayShort(shift.starts_at)} · {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">Swap with</div>

          {loading && <p className="text-sm text-ink-secondary">Loading coworkers…</p>}
          {!loading && error && (
            <p className="text-sm text-red-700">Could not load coworkers: {error}</p>
          )}
          {!loading && !error && coworkers.length === 0 && (
            <EmptyState
              icon={Users}
              title="No other nurses on your unit yet"
              subline="Swaps need a coworker to swap with."
              size="inline"
              tone="neutral"
            />
          )}

          {!loading && !error && (
            <div className="flex flex-col gap-2.5">
              {coworkers.map((coworker) => (
                <PersonPickerRow
                  key={coworker.id}
                  name={coworker.full_name}
                  meta={coworker.credential ? `${coworker.credential} · ${shift.unit}` : shift.unit}
                  selected={selectedCoworker?.id === coworker.id}
                  onClick={() => onSelect(coworker)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <div
        className="flex shrink-0 flex-col gap-2.5 px-5 pt-2 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button type="button" disabled={!selectedCoworker} onClick={onContinue} data-testid="swap-pick-coworker-continue">
          Continue
        </Button>
      </div>
    </div>
  )
}
