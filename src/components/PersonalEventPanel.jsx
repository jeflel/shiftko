import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarStrip } from '@/components/ui/calendar-strip'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { createPersonalEvent, updatePersonalEvent, deletePersonalEvent } from '@/lib/personalEvents'

const inputClassName =
  'w-full rounded-control border border-hairline p-3 text-sm focus:border-ink focus:outline-none'
const labelClassName = 'text-xs font-medium tracking-wide text-ink-secondary uppercase'

function toDateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toTimeValue(date) {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Combines a 'YYYY-MM-DD' date with { hours, minutes } start/end into ISO
// timestamps, rolling the end date forward a day for an overnight event —
// same shape as Schedule.jsx's buildShiftTimes, kept local since this panel
// doesn't otherwise depend on that file.
function buildEventTimes(dateKey, start, end) {
  const pad = (n) => String(n).padStart(2, '0')
  const starts_at = new Date(`${dateKey}T${pad(start.hours)}:${pad(start.minutes)}:00`)
  const ends_at = new Date(`${dateKey}T${pad(end.hours)}:${pad(end.minutes)}:00`)
  if (ends_at <= starts_at) ends_at.setDate(ends_at.getDate() + 1)
  return { starts_at: starts_at.toISOString(), ends_at: ends_at.toISOString() }
}

function parseTimeValue(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return { hours, minutes }
}

// Add/Edit Personal Event — per AddPersonalEvent.dc.html / PersonalEventEdit.dc.html
// and HANDOFF.md §6.2: a nurse-logged date + start/end time with either a unit
// (shows on Team Schedule) or a free-text event name, no coordinator approval.
export default function PersonalEventPanel({ userId, event, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(event)

  const [hasUnit, setHasUnit] = useState(isEdit ? Boolean(event.unit) : true)
  const [dateKey, setDateKey] = useState(() => toDateKey(event ? event.starts_at : new Date()))
  const [unit, setUnit] = useState(event?.unit ?? 'Unit 1')
  const [name, setName] = useState(event?.name ?? '')
  const [startTime, setStartTime] = useState(() => (event ? toTimeValue(event.starts_at) : '18:00'))
  const [endTime, setEndTime] = useState(() => (event ? toTimeValue(event.ends_at) : '22:00'))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setError(null)

    if (!dateKey) {
      setError('Please choose a date.')
      return
    }
    if (!hasUnit && !name.trim()) {
      setError('Give the event a name since no department is set.')
      return
    }

    const { starts_at, ends_at } = buildEventTimes(dateKey, parseTimeValue(startTime), parseTimeValue(endTime))

    setSaving(true)
    try {
      if (isEdit) {
        const saved = await updatePersonalEvent(event.id, {
          unit: hasUnit ? unit : null,
          name: hasUnit ? null : name.trim(),
          startsAt: starts_at,
          endsAt: ends_at,
        })
        onSaved(saved)
      } else {
        const saved = await createPersonalEvent({
          nurseId: userId,
          unit: hasUnit ? unit : null,
          name: hasUnit ? null : name.trim(),
          startsAt: starts_at,
          endsAt: ends_at,
        })
        onSaved(saved)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      await deletePersonalEvent(event.id)
      onDeleted(event.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl border border-hairline bg-card-surface p-4 shadow-card-lift sm:rounded-card"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">{isEdit ? 'Edit Personal Event' : 'Add Personal Event'}</h3>
          <button type="button" data-testid="personal-event-close" onClick={onClose} aria-label="Close" className="text-ink-secondary hover:text-ink">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {!isEdit && (
          <p className="text-[13px] leading-snug text-ink-secondary">
            Log a shift you're working. Shows on your calendar and Team Schedule, no coordinator
            approval needed.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Date</label>
          <CalendarStrip selectedDateKey={dateKey} onSelect={setDateKey} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Department</label>
          <SegmentedControl
            ariaLabel="Department"
            testidPrefix="personal-event-department"
            value={hasUnit ? 'set' : 'none'}
            onChange={(id) => setHasUnit(id === 'set')}
            options={[
              { id: 'set', label: 'Set Department' },
              { id: 'none', label: 'No Department' },
            ]}
          />
          {hasUnit ? (
            <>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                data-testid="personal-event-unit-select"
                className={inputClassName}
              >
                <option value="Unit 1">Unit 1</option>
                <option value="Unit 2">Unit 2</option>
              </select>
              <span className="text-[11px] text-ink-secondary">Sets what shows on Team Schedule.</span>
            </>
          ) : (
            <>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend job at Peninsula Landscaping"
                data-testid="personal-event-name-input"
                className={inputClassName}
              />
              <span className="text-[11px] text-ink-secondary">Required since no department is set.</span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Time</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              data-testid="personal-event-start-time"
              className={inputClassName}
            />
            <span className="text-sm text-ink-secondary">to</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              data-testid="personal-event-end-time"
              className={inputClassName}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <Button type="button" data-testid="personal-event-save" onClick={handleSubmit} disabled={saving} className="w-full">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Event'}
        </Button>

        {isEdit && (
          <Button
            type="button"
            variant="destructive"
            data-testid="personal-event-delete"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full"
          >
            {deleting ? 'Deleting…' : 'Delete Event'}
          </Button>
        )}
      </div>
    </div>
  )
}
