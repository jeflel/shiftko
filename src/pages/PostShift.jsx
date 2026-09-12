import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { CalendarStrip } from '@/components/ui/calendar-strip'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { inputClassName, labelClassName, fieldInputClassName } from '@/components/ui/field'
import { SHIFT_PRESETS, buildShiftTimes } from '@/lib/shiftPresets'
import { cn } from '@/lib/utils'
import {
  MAX_SAVED_SHIFT_PRESETS,
  deleteShiftPreset,
  fetchSavedShiftPresets,
  parsePresetTime,
  saveShiftPreset,
} from '@/lib/savedShiftPresets'

// Coordinator's Post a Shift form, per PostShiftLinearLight.dc.html. Moved
// out of Schedule.jsx's ManageTab into its own pushed screen, reachable both
// directly from Home's Post Shift tile and from CoordinatorManage's hub CTA -
// content and behavior unchanged from the ManageTab version.
export default function PostShift({ onBack }) {
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nurse_id: '',
    unit: 'Unit 1',
    date: '',
    // One of: 'day' | 'evening' | 'night' | `saved:<preset id>` | 'custom'
    shift_type: 'day',
    customStart: { hours: 7, minutes: 0 },
    customEnd: { hours: 15, minutes: 0 },
    unassigned: false,
    notes: '',
  })

  const [currentUserId, setCurrentUserId] = useState(null)
  const [savedPresets, setSavedPresets] = useState([])
  const [savedPresetsLoading, setSavedPresetsLoading] = useState(true)
  const [presetActionError, setPresetActionError] = useState(null)
  const [saveThisShift, setSaveThisShift] = useState(false)

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
      setForm({
        nurse_id: '',
        unit: 'Unit 1',
        date: '',
        shift_type: 'day',
        customStart: { hours: 7, minutes: 0 },
        customEnd: { hours: 15, minutes: 0 },
        unassigned: false,
        notes: '',
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Post a Shift" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 px-5 pt-2.5 pb-12">
        {loading ? (
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
                  value={`${String(form.customStart.hours).padStart(2, '0')}:${String(form.customStart.minutes).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number)
                    setForm({ ...form, shift_type: 'custom', customStart: { hours, minutes } })
                  }}
                  className={inputClassName}
                />
                <span className="text-sm text-[#6B7280]">to</span>
                <input
                  type="time"
                  value={`${String(form.customEnd.hours).padStart(2, '0')}:${String(form.customEnd.minutes).padStart(2, '0')}`}
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
            {success && <p className="text-sm text-[#16A34A]">Shift posted successfully.</p>}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              data-testid="schedule-manage-post-shift"
              className="w-full"
            >
              {saving ? 'Posting…' : 'Post shift'}
            </Button>
          </>
        )}
      </main>
    </div>
  )
}
