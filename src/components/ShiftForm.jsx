import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { CalendarStrip } from '@/components/ui/calendar-strip'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { inputClassName, labelClassName, fieldInputClassName } from '@/components/ui/field'
import { SHIFT_PRESETS, buildShiftTimes } from '@/lib/shiftPresets'
import { cn } from '@/lib/utils'
import { formatLocalDateKey } from '@/lib/shiftFormat'
import {
  MAX_SAVED_SHIFT_PRESETS,
  deleteShiftPreset,
  fetchSavedShiftPresets,
  parsePresetTime,
  saveShiftPreset,
} from '@/lib/savedShiftPresets'

// Create mode's initial form values, verbatim from PostShift.jsx's original
// useState. Edit mode seeds every field from the shift being edited instead.
function getInitialForm(mode, shift) {
  if (mode === 'edit' && shift) {
    const start = new Date(shift.starts_at)
    const end = new Date(shift.ends_at)
    const customStart = { hours: start.getHours(), minutes: start.getMinutes() }
    const customEnd = { hours: end.getHours(), minutes: end.getMinutes() }

    // Only snap to a standard preset when the shift's times match it exactly.
    // Otherwise fall back to 'custom' - resolveShiftTimes returns the preset's
    // times whenever shift_type is a preset key, so snapping a non-matching
    // shift would silently rewrite its actual hours on save.
    const matchedPreset = SHIFT_PRESETS.find(
      (p) =>
        p.start.hours === customStart.hours &&
        p.start.minutes === customStart.minutes &&
        p.end.hours === customEnd.hours &&
        p.end.minutes === customEnd.minutes,
    )

    return {
      nurse_id: shift.nurse_id ?? '',
      unit: shift.unit,
      date: formatLocalDateKey(start),
      // One of: 'day' | 'evening' | 'night' | `saved:<preset id>` | 'custom'
      shift_type: matchedPreset ? matchedPreset.key : 'custom',
      customStart,
      customEnd,
      unassigned: !shift.nurse_id,
      notes: shift.notes ?? '',
    }
  }

  return {
    nurse_id: '',
    unit: 'Unit 1',
    date: '',
    // One of: 'day' | 'evening' | 'night' | `saved:<preset id>` | 'custom'
    shift_type: 'day',
    customStart: { hours: 7, minutes: 0 },
    customEnd: { hours: 15, minutes: 0 },
    unassigned: false,
    notes: '',
  }
}

// Shared Post/Edit a Shift form, per PostShiftLinearLight.dc.html. Moved out
// of PostShift.jsx so Post a Shift and the upcoming Edit Shift screen share
// one set of fields, fetches, preset logic, and time resolution. Create mode
// is behavior-identical to the original PostShift body; edit mode updates the
// passed shift and exposes a Remove Shift action.
export default function ShiftForm({ mode = 'create', shift = null, onSaved, onRemoved }) {
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState(() => getInitialForm(mode, shift))

  const [currentUserId, setCurrentUserId] = useState(null)
  const [savedPresets, setSavedPresets] = useState([])
  const [savedPresetsLoading, setSavedPresetsLoading] = useState(true)
  const [presetActionError, setPresetActionError] = useState(null)
  const [saveThisShift, setSaveThisShift] = useState(false)

  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    async function fetchNurses() {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, credential')
        .eq('role', 'nurse')
        .order('full_name', { ascending: true })

      if (!fetchError) setNurses(data ?? [])
      setLoading(false)
    }
    fetchNurses()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadUserAndPresets() {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      if (cancelled) return
      setCurrentUserId(userId)

      if (!userId) {
        setSavedPresetsLoading(false)
        return
      }

      try {
        const presets = await fetchSavedShiftPresets(userId)
        if (!cancelled) setSavedPresets(presets)
      } catch (err) {
        if (!cancelled) setPresetActionError(err.message)
      } finally {
        if (!cancelled) setSavedPresetsLoading(false)
      }
    }

    loadUserAndPresets()
    return () => { cancelled = true }
  }, [])

  // Resolves the currently selected shift_type into a concrete
  // { start: {hours, minutes}, end: {hours, minutes} } pair, whether it's
  // a standard preset, a saved custom preset, or a one-off custom entry.
  function resolveShiftTimes() {
    const preset = SHIFT_PRESETS.find((p) => p.key === form.shift_type)
    if (preset) return { start: preset.start, end: preset.end }

    if (form.shift_type.startsWith('saved:')) {
      const id = form.shift_type.slice('saved:'.length)
      const saved = savedPresets.find((p) => p.id === id)
      if (saved) {
        return { start: parsePresetTime(saved.start_time), end: parsePresetTime(saved.end_time) }
      }
    }

    return { start: form.customStart, end: form.customEnd }
  }

  async function handleSaveThisShift() {
    if (!currentUserId) return
    if (savedPresets.length >= MAX_SAVED_SHIFT_PRESETS) {
      setPresetActionError(`You can save up to ${MAX_SAVED_SHIFT_PRESETS} custom shifts. Delete one to save a new one.`)
      return
    }

    setPresetActionError(null)
    const { start, end } = resolveShiftTimes()

    try {
      const saved = await saveShiftPreset(currentUserId, {
        startHours: start.hours,
        startMinutes: start.minutes,
        endHours: end.hours,
        endMinutes: end.minutes,
      })
      setSavedPresets((prev) => [...prev, saved])
      setForm((f) => ({ ...f, shift_type: `saved:${saved.id}` }))
      setSaveThisShift(false)
    } catch (err) {
      setPresetActionError(err.message)
    }
  }

  async function handleDeletePreset(presetId) {
    setPresetActionError(null)
    try {
      await deleteShiftPreset(presetId)
      setSavedPresets((prev) => prev.filter((p) => p.id !== presetId))
      if (form.shift_type === `saved:${presetId}`) {
        setForm((f) => ({ ...f, shift_type: 'day' }))
      }
    } catch (err) {
      setPresetActionError(err.message)
    }
  }

  async function handleSubmit() {
    setError(null)
    setSuccess(false)

    if (!form.date || (!form.unassigned && !form.nurse_id)) {
      setError('Please fill out all fields.')
      return
    }

    setSaving(true)
    const { start, end } = resolveShiftTimes()
    const { starts_at, ends_at } = buildShiftTimes(form.date, start, end)

    if (mode === 'edit') {
      const payload = form.unassigned
        ? { unit: form.unit, starts_at, ends_at, status: 'open', nurse_id: null, notes: form.notes || null }
        : { nurse_id: form.nurse_id, unit: form.unit, starts_at, ends_at, status: 'scheduled', notes: form.notes || null }

      const { error: updateError } = await supabase.from('shifts').update(payload).eq('id', shift.id)

      setSaving(false)

      if (updateError) {
        setError(updateError.message)
      } else {
        onSaved?.()
      }
      return
    }

    const payload = form.unassigned
      ? { unit: form.unit, starts_at, ends_at, status: 'open', nurse_id: null, notes: form.notes || null }
      : { nurse_id: form.nurse_id, unit: form.unit, starts_at, ends_at, notes: form.notes || null }

    const { error: insertError } = await supabase.from('shifts').insert(payload)

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(true)
      setSaveThisShift(false)
      setForm(getInitialForm('create', null))
    }
  }

  async function handleConfirmDelete() {
    setDeleteError(null)
    setDeleteSaving(true)

    const { error: deleteErr } = await supabase.from('shifts').delete().eq('id', shift.id)

    setDeleteSaving(false)

    if (deleteErr) {
      setDeleteError(deleteErr.message)
    } else {
      onRemoved?.()
    }
  }

  // The inputs below always show the effective times for the current
  // shift_type (standard preset, saved preset, or custom) so the form never
  // displays times different from what submit will save.
  const effectiveTimes = resolveShiftTimes()

  return loading ? (
    <p className="text-sm text-ink-secondary">Loading…</p>
  ) : (
    <>
      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Assign</label>
        <SegmentedControl
          ariaLabel="Assign shift"
          testidPrefix="schedule-manage-assign"
          value={form.unassigned ? 'leaveOpen' : 'assignNurse'}
          onChange={(id) =>
            setForm({ ...form, unassigned: id === 'leaveOpen', nurse_id: '' })
          }
          options={[
            { id: 'leaveOpen', label: 'Leave Open' },
            { id: 'assignNurse', label: 'Assign Nurse' },
          ]}
        />
      </div>

      {!form.unassigned && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Nurse</label>
          <select
            value={form.nurse_id}
            onChange={(e) => setForm({ ...form, nurse_id: e.target.value })}
            className={fieldInputClassName}
          >
            <option value="">Select a nurse</option>
            {nurses.map((n) => (
              <option key={n.id} value={n.id}>
                {n.full_name} {n.credential ? `(${n.credential})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Unit</label>
        <select
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          className={fieldInputClassName}
        >
          <option value="Unit 1">Unit 1</option>
          <option value="Unit 2">Unit 2</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Date</label>
        <CalendarStrip
          selectedDateKey={form.date}
          onSelect={(dateKey) => setForm({ ...form, date: dateKey })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Shift</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SHIFT_PRESETS.map((preset) => {
            const Icon = preset.icon
            const isSelected = form.shift_type === preset.key
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setForm({ ...form, shift_type: preset.key })}
                data-testid={`schedule-manage-shift-preset-${preset.key}`}
                className={cn(
                  'flex shrink-0 flex-col items-start gap-1 rounded-xl px-3 py-2 text-left',
                  isSelected ? preset.selectedClassName : preset.className,
                )}
              >
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                  <Icon size={13} strokeWidth={2.5} />
                  {preset.label}
                </span>
                <span className="text-[11px] font-medium">{preset.time}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!savedPresetsLoading && savedPresets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Your saved shifts</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedPresets.map((preset) => {
              const isSelected = form.shift_type === `saved:${preset.id}`
              const { hours: sh, minutes: sm } = parsePresetTime(preset.start_time)
              const { hours: eh, minutes: em } = parsePresetTime(preset.end_time)
              const timeLabel = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')} – ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
              return (
                <span
                  key={preset.id}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                    isSelected
                      ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white'
                      : 'border-[#E5E5EA] bg-white text-[#1D1D1F]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, shift_type: `saved:${preset.id}` })}
                  >
                    {preset.label || timeLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset.id)}
                    aria-label="Delete saved shift"
                    className="opacity-60 hover:opacity-100"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Custom time</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={`${String(effectiveTimes.start.hours).padStart(2, '0')}:${String(effectiveTimes.start.minutes).padStart(2, '0')}`}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number)
              setForm({ ...form, shift_type: 'custom', customStart: { hours, minutes } })
            }}
            className={inputClassName}
          />
          <span className="text-sm text-[#6B7280]">to</span>
          <input
            type="time"
            value={`${String(effectiveTimes.end.hours).padStart(2, '0')}:${String(effectiveTimes.end.minutes).padStart(2, '0')}`}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number)
              setForm({ ...form, shift_type: 'custom', customEnd: { hours, minutes } })
            }}
            className={inputClassName}
          />
        </div>

        {form.shift_type === 'custom' && currentUserId && (
          <label className="flex items-center gap-2 pt-1 text-sm text-[#1D1D1F]">
            <input
              type="checkbox"
              checked={saveThisShift}
              onChange={(e) => {
                setSaveThisShift(e.target.checked)
                if (e.target.checked) handleSaveThisShift()
              }}
              disabled={savedPresets.length >= MAX_SAVED_SHIFT_PRESETS}
              className="h-4 w-4 rounded border-[#E5E5EA] accent-[#1D1D1F]"
            />
            Save this shift for next time
          </label>
        )}
        {presetActionError && <p className="text-xs text-red-700">{presetActionError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Add a note (optional)"
          rows={2}
          className={cn(fieldInputClassName, 'resize-none placeholder:text-ink-secondary')}
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {mode === 'create' && success && <p className="text-sm text-[#16A34A]">Shift posted successfully.</p>}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        data-testid={mode === 'edit' ? 'shift-edit-save' : 'schedule-manage-post-shift'}
        className="w-full"
      >
        {mode === 'edit'
          ? (saving ? 'Saving…' : 'Save Changes')
          : (saving ? 'Posting…' : 'Post shift')}
      </Button>

      {mode === 'edit' && !showRemoveConfirm && (
        <button
          type="button"
          onClick={() => setShowRemoveConfirm(true)}
          data-testid="shift-edit-remove"
          className="self-center text-sm font-semibold text-ink-secondary"
        >
          Remove Shift
        </button>
      )}

      {mode === 'edit' && showRemoveConfirm && (
        <div className="flex flex-col gap-3 rounded-card border border-hairline bg-card-surface p-4">
          <p className="text-sm font-medium text-ink">Delete this shift?</p>

          {shift.status === 'pending' && (
            <div className="flex items-start gap-1.5 text-sm text-[#D97706]">
              <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
              <p>This shift has a pending claim. Deleting it will remove the claim.</p>
            </div>
          )}

          {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteSaving}
              className="rounded-button bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {deleteSaving ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => { setShowRemoveConfirm(false); setDeleteError(null) }}
              disabled={deleteSaving}
              className="rounded-button border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
