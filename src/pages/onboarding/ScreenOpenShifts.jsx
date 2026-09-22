import { useEffect, useState } from 'react'
import { Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PeriodTag } from '@/components/ui/period-tag'
import { supabase } from '@/lib/supabase'
import { formatShiftTimeRange, getShiftPeriod } from '@/lib/shiftFormat'
import FlowTopBar from './FlowTopBar'

// The payoff screen: the open shifts on the unit she just chose, read live
// rather than mocked, so the first thing onboarding shows her is the thing the
// app is for.
//
// This depends on `home_unit` already being on her profile. The shifts RLS rule
// for a nurse is "status = 'open' AND unit matches her home_unit", and it reads
// that unit from the profile, not from this query's filter. If the profile is
// still empty the policy returns nothing and the screen falls to its empty state
// while the shift list is full, which reads as a broken screen. OnboardingFlow
// therefore persists credential and home_unit as soon as the job step finishes,
// before this screen mounts.
const PREVIEW_LIMIT = 3

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

export default function ScreenOpenShifts({ step = 5, total = 6, unit = '', onBack, onContinue }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!unit) {
        setShifts([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('shifts')
        .select('id, unit, starts_at, ends_at')
        .eq('status', 'open')
        .eq('unit', unit)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(PREVIEW_LIMIT)

      if (cancelled) return
      if (error) {
        // A failed read is not worth blocking onboarding over; the empty state
        // says what happens next either way.
        console.error('onboarding open shifts failed', error)
        setShifts([])
      } else {
        setShifts(data ?? [])
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [unit])

  const count = shifts.length

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[70px] pb-11">
      <FlowTopBar step={step} total={total} onBack={onBack} backTestId="screenopenshifts-back" />

      <h1 className="mt-10 text-[30px] leading-[1.2] font-semibold tracking-[-0.6px] text-ink">
        {loading
          ? `Checking ${unit || 'your unit'}`
          : count > 0
            ? `${unit} has ${count} open shift${count === 1 ? '' : 's'}.`
            : 'No open shifts right now.'}
      </h1>
      <p className="mt-3 text-[17px] tracking-[-0.34px] text-ink-secondary">
        {loading
          ? 'One moment.'
          : count > 0
            ? 'Claim one and your coordinator approves it.'
            : `You'll know the second one posts on ${unit || 'your unit'}.`}
      </p>

      {!loading && count > 0 && (
        <div className="mt-7 flex flex-col gap-2.5">
          {shifts.map((shift) => {
            const start = new Date(shift.starts_at)
            const period = getShiftPeriod(shift.starts_at)
            return (
              <div
                key={shift.id}
                className="flex items-center gap-3 rounded-card border border-hairline bg-card-surface p-4 shadow-card-lift"
              >
                <div className="flex w-10 shrink-0 flex-col items-center">
                  <span className="text-[11px] font-semibold tracking-[0.03em] text-ink-secondary uppercase">
                    {weekdayFormatter.format(start)}
                  </span>
                  <span className="text-[22px] leading-[1.15] font-semibold text-ink">
                    {start.getDate()}
                  </span>
                </div>
                <div className="min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <PeriodTag period={period} variant="bare" />
                  <span className="truncate text-[14px] font-semibold text-ink">
                    {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
                  </span>
                  <span className="truncate text-[12px] text-ink-secondary">{shift.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && count === 0 && (
        <div className="mt-7 flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline bg-card-surface px-5 py-8">
          <Moon size={26} strokeWidth={1.6} className="text-chevron-muted" />
          <span className="text-[15px] font-semibold text-ink">
            Nothing open on {unit || 'your unit'} today
          </span>
          <span className="text-center text-[13px] text-ink-secondary">
            Shifts usually post the week before.
          </span>
        </div>
      )}

      <Button
        type="button"
        onClick={onContinue}
        data-testid="screenopenshifts-continue"
        className="mt-auto h-[54px] w-full"
      >
        {count > 0 ? 'See all open shifts' : 'Set up alerts'}
      </Button>
    </main>
  )
}
