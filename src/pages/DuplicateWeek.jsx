import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { fieldInputClassName, labelClassName } from '@/components/ui/field'
import { formatWeekRangeLabel } from '@/lib/manageFormat'
import { addLocalDays, diffInCalendarDays, getWeekRange, getWeekStart } from '../lib/shiftFormat'

// Coordinator — Duplicate a Week, per DuplicateWeekLinearLight.dc.html.
// Moved out of Schedule.jsx's ManageTab into its own pushed screen, reached
// from the Manage hub's Tools list (wired in a later commit). Same
// source/destination-week copy logic as before, not a new build.
//
// The mockup supports multiple destination weeks at once ("Copy To" with an
// "Add another week" link). Live only ever supported one source and one
// destination week; that's kept as-is here (a genuine feature, not a visual
// detail, so out of scope for a reskin pass) rather than the plain native
// date inputs trying to mimic the mockup's tappable "week-picker" card,
// which implies a picker sheet that doesn't exist live.
export default function DuplicateWeek({ onBack }) {
  const [dupSourceDate, setDupSourceDate] = useState('')
  const [dupDestDate, setDupDestDate] = useState('')
  const [dupSourceShifts, setDupSourceShifts] = useState([])
  const [dupSourceLoading, setDupSourceLoading] = useState(false)
  const [dupChecking, setDupChecking] = useState(false)
  const [dupSaving, setDupSaving] = useState(false)
  const [dupError, setDupError] = useState(null)
  const [dupSuccess, setDupSuccess] = useState(null)
  const [dupConfirm, setDupConfirm] = useState(null)

  useEffect(() => {
    let cancelled = false

    if (!dupSourceDate) {
      setDupSourceShifts([])
      return
    }

    async function fetchSourceWeekShifts() {
      setDupSourceLoading(true)
      setDupError(null)

      const weekStart = getWeekStart(`${dupSourceDate}T00:00:00`)
      const { start, end } = getWeekRange(weekStart)

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select('id, nurse_id, unit, starts_at, ends_at')
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setDupError(fetchError.message)
        setDupSourceShifts([])
      } else {
        setDupSourceShifts(data ?? [])
      }

      setDupSourceLoading(false)
    }

    fetchSourceWeekShifts()
    return () => { cancelled = true }
  }, [dupSourceDate])

  async function handleReviewCopy() {
    setDupError(null)
    setDupSuccess(null)
    setDupConfirm(null)

    if (!dupSourceDate || !dupDestDate) {
      setDupError('Choose both a source week and a destination week.')
      return
    }

    if (dupSourceShifts.length === 0) {
      setDupError('No shifts in the selected week.')
      return
    }

    const sourceStart = getWeekStart(`${dupSourceDate}T00:00:00`)
    const destStart = getWeekStart(`${dupDestDate}T00:00:00`)

    setDupChecking(true)
    const { start: destRangeStart, end: destRangeEnd } = getWeekRange(destStart)
    const { data: destShifts, error: destError } = await supabase
      .from('shifts')
      .select('id')
      .gte('starts_at', destRangeStart.toISOString())
      .lt('starts_at', destRangeEnd.toISOString())
    setDupChecking(false)

    if (destError) {
      setDupError(destError.message)
      return
    }

    setDupConfirm({
      sourceStart,
      destStart,
      count: dupSourceShifts.length,
      destConflictCount: destShifts?.length ?? 0,
    })
  }

  async function handleConfirmCopy() {
    if (!dupConfirm) return

    setDupSaving(true)
    setDupError(null)

    const dayOffset = diffInCalendarDays(dupConfirm.sourceStart, dupConfirm.destStart)

    const rows = dupSourceShifts.map((shift) => ({
      nurse_id: shift.nurse_id,
      unit: shift.unit,
      starts_at: addLocalDays(shift.starts_at, dayOffset),
      ends_at: addLocalDays(shift.ends_at, dayOffset),
    }))

    const { error: insertError } = await supabase.from('shifts').insert(rows)

    setDupSaving(false)

    if (insertError) {
      setDupError(insertError.message)
      return
    }

    setDupSuccess(
      `Copied ${rows.length} shift${rows.length === 1 ? '' : 's'} to the week of ${formatWeekRangeLabel(dupConfirm.destStart)}.`,
    )
    setDupConfirm(null)
    setDupSourceDate('')
    setDupDestDate('')
    setDupSourceShifts([])
  }

  function handleCancelCopy() {
    setDupConfirm(null)
  }

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Duplicate a Week" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 px-5 pt-2.5 pb-12">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Source week (any day in that week)</label>
          <input
            type="date"
            value={dupSourceDate}
            onChange={(e) => {
              setDupSourceDate(e.target.value)
              setDupConfirm(null)
              setDupSuccess(null)
            }}
            className={fieldInputClassName}
          />
          {dupSourceDate && (
            <span className="text-xs text-ink-secondary">
              Week of {formatWeekRangeLabel(getWeekStart(`${dupSourceDate}T00:00:00`))}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Destination week (any day in that week)</label>
          <input
            type="date"
            value={dupDestDate}
            onChange={(e) => {
              setDupDestDate(e.target.value)
              setDupConfirm(null)
              setDupSuccess(null)
            }}
            className={fieldInputClassName}
          />
          {dupDestDate && (
            <span className="text-xs text-ink-secondary">
              Week of {formatWeekRangeLabel(getWeekStart(`${dupDestDate}T00:00:00`))}
            </span>
          )}
        </div>

        {dupSourceDate && !dupSourceLoading && dupSourceShifts.length === 0 && (
          <EmptyState
            icon={CalendarOff}
            title="No shifts in the selected week"
            subline="Pick a week that has shifts to copy."
            size="inline"
            tone="neutral"
          />
        )}

        {dupError && <p className="text-sm text-red-700">{dupError}</p>}
        {dupSuccess && <p className="text-sm text-[#16A34A]">{dupSuccess}</p>}

        {dupConfirm ? (
          <div className="flex flex-col gap-1.5 rounded-card border border-hairline bg-card-surface p-4 shadow-card-lift">
            <p className="text-sm font-semibold tracking-[-0.01em] text-ink">
              {dupConfirm.count} shift{dupConfirm.count === 1 ? '' : 's'} will be created
            </p>
            <p className="text-xs text-ink-secondary">
              Same times, units, and assignments as {formatWeekRangeLabel(dupConfirm.sourceStart)}, applied to the week of {formatWeekRangeLabel(dupConfirm.destStart)}.
            </p>
            {dupConfirm.destConflictCount > 0 && (
              <p className="flex items-start gap-1.5 text-xs font-semibold text-[#D97706]">
                <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                The destination week already has {dupConfirm.destConflictCount} shift
                {dupConfirm.destConflictCount === 1 ? '' : 's'}. Copying may create duplicate bookings.
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                onClick={handleConfirmCopy}
                disabled={dupSaving}
                className="h-[50px] flex-1 rounded-card bg-teal-foreground text-[15px] font-semibold tracking-[-0.01em] text-white hover:bg-teal-foreground-hover disabled:opacity-60"
              >
                {dupSaving
                  ? 'Copying…'
                  : dupConfirm.destConflictCount > 0
                    ? 'Copy anyway'
                    : 'Confirm copy'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCopy}
                disabled={dupSaving}
                className="h-[50px] flex-1 rounded-card border-hairline text-[15px] font-semibold tracking-[-0.01em] text-ink shadow-none hover:bg-press-state"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleReviewCopy}
            disabled={
              !dupSourceDate ||
              !dupDestDate ||
              dupSourceLoading ||
              dupChecking ||
              dupSourceShifts.length === 0
            }
            className="h-[50px] w-full rounded-card bg-teal-foreground text-[15px] font-semibold tracking-[-0.01em] text-white hover:bg-teal-foreground-hover disabled:opacity-60"
          >
            {dupChecking ? 'Checking…' : 'Duplicate Week'}
          </Button>
        )}
      </main>
    </div>
  )
}
