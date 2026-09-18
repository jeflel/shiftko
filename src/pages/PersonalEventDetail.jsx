import { useEffect, useState } from 'react'
import { NavRow } from '@/components/ui/nav-row'
import { HeroCard } from '@/components/ui/hero-card'
import { Button } from '@/components/ui/button'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { formatShiftTimeRange } from '@/lib/shiftFormat'
import { getCoworkersOnShift, deletePersonalEvent } from '@/lib/personalEvents'

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export default function PersonalEventDetail({ event, user, onBack, onEdit, onDeleted }) {
  const [coworkers, setCoworkers] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!event.unit) {
      setCoworkers([])
      return
    }

    let cancelled = false

    getCoworkersOnShift({
      unit: event.unit,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      excludeNurseId: user.id,
    })
      .then((rows) => {
        if (!cancelled) setCoworkers(rows)
      })
      .catch(() => {
        if (!cancelled) setCoworkers([])
      })

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

  const showCoworkers = Boolean(event.unit) && coworkers.length > 0

  return (
    <div className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col bg-page-ground">
      <NavRow onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-3 pb-6">
        <HeroCard shift={event} subline={event.unit || event.name || ''} />

        {showCoworkers && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
              Also on {event.unit}
            </h2>

            <ul className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
              {coworkers.map((coworker, index) => {
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

                    {index < coworkers.length - 1 && <ShiftListDivider inset={false} />}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
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
