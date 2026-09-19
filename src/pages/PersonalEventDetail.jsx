import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { HeroCard } from '@/components/ui/hero-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SHIFT_LIST_BORDERLESS_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { formatShiftTimeRange } from '@/lib/shiftFormat'
import { getCoworkersOnShift, deletePersonalEvent } from '@/lib/personalEvents'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

// A personal event's detail screen is the same screen as ShiftDetail (2026-09-19,
// his ask: "why is the shift detail on the personal event shift detail page not the
// same as the assigned ones, it should at least show working with section, and the
// burlingame workspace"). It was written on 2026-09-15 against HeroCard's original
// three-line layout and never moved when ShiftDetail's card grew `layout="detail"`,
// `facility` and `borderless` on 2026-09-18, because those knobs are opt-in so the
// other hero-card callers stay put. It opts in now, and it makes the same profiles
// query ShiftDetail makes, because the workspace name is what says whose schedule
// the shift sits on.
//
// The coworker section is ShiftDetail's "Working with" section verbatim: same
// heading, same count line, same loading row, same empty state inside the borderless
// list card with `px-4 py-3.5` on a child, same divider. The event screen's own
// "Also on <unit>" list was hand-rolled and rendered nothing at all when the list was
// empty, which made the section change shape with the data. It also only drew when
// `event.unit` was set; an event with no department has no shift to be on, and it gets
// the same empty card as any shift with no coworkers rather than no section.
export default function PersonalEventDetail({ event, user, onBack, onEdit, onDeleted }) {
  const [coworkers, setCoworkers] = useState([])
  const [loadingCoworkers, setLoadingCoworkers] = useState(true)
  const [coworkerError, setCoworkerError] = useState(null)
  const [credential, setCredential] = useState(null)
  const [facilityName, setFacilityName] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCredential() {
      const { data } = await supabase
        .from('profiles')
        .select('credential, workspaces ( name )')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      setCredential(data?.credential ?? null)
      // PostgREST may return the embed as an object or as a single-element array.
      const workspace = Array.isArray(data?.workspaces) ? data.workspaces[0] : data?.workspaces
      setFacilityName(workspace?.name ?? null)
    }

    fetchCredential()
    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    if (!event.unit) return

    let cancelled = false

    async function fetchCoworkers() {
      setLoadingCoworkers(true)
      setCoworkerError(null)

      try {
        const rows = await getCoworkersOnShift({
          unit: event.unit,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          excludeNurseId: user.id,
        })

        if (cancelled) return
        setCoworkers(rows)
      } catch (err) {
        if (cancelled) return
        setCoworkerError(err.message ?? 'Unknown error')
        setCoworkers([])
      } finally {
        if (!cancelled) setLoadingCoworkers(false)
      }
    }

    fetchCoworkers()

    return () => {
      cancelled = true
    }
  }, [event.unit, event.starts_at, event.ends_at, user.id])

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      await deletePersonalEvent(event.id)
      onDeleted(event.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  // `unit || name` is the app's own convention for an event's label (the panel
  // clears the name whenever a department is set, so only one of the two is ever
  // present), and the credential beside it is the viewer's, the same one
  // ShiftDetail shows. Personal events reach this screen only from the viewer's own
  // My Shifts and My Upcoming lists, so the viewer is always the owner.
  const heroSubline = [event.unit || event.name, credential].filter(Boolean).join(' · ') || undefined

  // An event with no department has no shift to be on, so its section skips the
  // query entirely and goes straight to the empty card. Derived at render instead
  // of written into state by the effect, so there is no reset to keep in sync.
  const hasUnit = Boolean(event.unit)
  const coworkerLoading = hasUnit && loadingCoworkers
  const coworkerFailure = hasUnit ? coworkerError : null
  const coworkerList = hasUnit ? coworkers : []

  return (
    <div className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col bg-page-ground">
      <NavRow title="Shift Detail" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-3 pb-6">
        <HeroCard
          shift={event}
          credential={credential}
          subline={heroSubline}
          borderless
          layout="detail"
          facility={facilityName}
        />

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
              Working with
            </h2>

            {!coworkerLoading && !coworkerFailure && coworkerList.length > 0 && (
              <span className="text-xs text-ink-secondary">
                {coworkerList.length} on this shift
              </span>
            )}
          </div>

          {coworkerLoading && <p className="text-xs text-ink-secondary">Loading coworkers…</p>}

          {!coworkerLoading && coworkerFailure && (
            <p className="text-xs text-red-700">Could not load coworkers: {coworkerFailure}</p>
          )}

          {!coworkerLoading && !coworkerFailure && coworkerList.length === 0 && (
            <div className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
              <div className="px-4 py-3.5">
                <EmptyState
                  icon={Users}
                  title="No coworkers on this shift"
                  layout="row"
                  tone="neutral"
                />
              </div>
            </div>
          )}

          {!coworkerLoading && !coworkerFailure && coworkerList.length > 0 && (
            <ul className={`${SHIFT_LIST_BORDERLESS_CLASSNAME} py-1.5`}>
              {coworkerList.map((coworker, index) => {
                const meta = [
                  coworker.credential,
                  coworker.starts_at && coworker.ends_at
                    ? formatShiftTimeRange(coworker.starts_at, coworker.ends_at)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <li key={`${coworker.full_name}-${index}`}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-press-state text-[13px] font-semibold text-ink-secondary">
                        {getInitials(coworker.full_name)}
                      </div>

                      <div className="flex min-w-0 flex-col gap-px">
                        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                          {coworker.full_name ?? 'A teammate'}
                        </p>
                        {meta && <p className="truncate text-xs text-ink-secondary">{meta}</p>}
                      </div>
                    </div>

                    {index < coworkerList.length - 1 && <ShiftListDivider inset={false} />}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      <div className="flex shrink-0 flex-col gap-2.5 px-5 pt-2 pb-1">
        {confirmDelete && (
          <div className="flex flex-col gap-3 rounded-card border border-hairline bg-card-surface p-4">
            <p className="text-sm font-medium text-ink">Delete this event?</p>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-button bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); setError(null) }}
                disabled={deleting}
                className="rounded-button border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={onEdit}
          data-testid="personal-event-detail-edit"
          className="h-[50px] w-full rounded-[16px]"
        >
          Edit Event
        </Button>

        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmDelete(true)}
          data-testid="personal-event-detail-remove"
          className="w-full"
        >
          Delete Event
        </Button>
      </div>
    </div>
  )
}
