import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { ShiftPickerRow } from '@/components/ui/selection-row'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

// Swap 2 - Choose a Shift, per SwapPickShiftLinearLight.dc.html. Lists the
// chosen coworker's own upcoming scheduled shifts (excludes the requester's
// own shift automatically - different nurse_id) rather than every open/team
// shift, since a swap trades two specific shifts, not a pool claim.
export default function SwapPickShift({ coworker, selectedShift, onSelect, onContinue, onBack }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCoworkerShifts() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select('id, unit, starts_at, ends_at, status, nurse_id')
        .eq('nurse_id', coworker.id)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(30)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setShifts([])
      } else {
        setShifts(data ?? [])
      }
      setLoading(false)
    }

    fetchCoworkerShifts()
    return () => { cancelled = true }
  }, [coworker.id])

  return (
    <div
      className="fixed inset-0 z-[110] mx-auto flex w-full max-w-md flex-col bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Choose a Shift" onBack={onBack} />

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2.5 pb-4">
        <div className="flex items-center gap-2.5 rounded-card border border-hairline bg-card-surface p-3.5 shadow-card-lift">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-press-state text-xs font-semibold text-ink-secondary">
            {getInitials(coworker.full_name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
              Swapping with
            </div>
            <div className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
              {coworker.full_name}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
            {coworker.full_name?.split(' ')[0]}&rsquo;s upcoming shifts
          </div>

          {loading && <p className="text-sm text-ink-secondary">Loading shifts…</p>}
          {!loading && error && (
            <p className="text-sm text-red-700">Could not load shifts: {error}</p>
          )}
          {!loading && !error && shifts.length === 0 && (
            <p className="text-sm text-ink-secondary">
              {coworker.full_name} has no upcoming shifts to swap.
            </p>
          )}

          {!loading && !error && (
            <div className="flex flex-col gap-2.5">
              {shifts.map((shift) => (
                <ShiftPickerRow
                  key={shift.id}
                  shift={shift}
                  meta={coworker.credential ? `${shift.unit} · ${coworker.credential}` : shift.unit}
                  selected={selectedShift?.id === shift.id}
                  onClick={() => onSelect(shift)}
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
        <Button type="button" disabled={!selectedShift} onClick={onContinue} data-testid="swap-pick-shift-continue">
          Continue
        </Button>
      </div>
    </div>
  )
}
