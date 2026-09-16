import { useEffect, useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { inputClassName, labelClassName } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/manageFormat'
import { getWeekRange, getWeekStart } from '../lib/shiftFormat'
import { cn } from '@/lib/utils'

// Coordinator — Staff, per StaffRosterLinearLight.dc.html. Moved out of
// Schedule.jsx's separate "Staff" tab into its own pushed screen, reached
// from CoordinatorManage's Tools list (added in a later commit of this
// port). Same query, same inline expand-to-edit interaction as before -
// only the container/list styling changed, plus the mockup's search input
// and unit-filter tabs (new, pure client-side filtering over the already-
// fetched list, no new query). "Add Staff" from the mockup has no live
// backend (no invite/create-staff flow exists) and isn't built here.
export default function StaffRoster({ onBack }) {
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weekStats, setWeekStats] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [savedFading, setSavedFading] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('All')

  useEffect(() => {
    let cancelled = false

    async function fetchStaff() {
      setLoading(true)
      setError(null)

      const { data: nurseData, error: nurseError } = await supabase
        .from('profiles')
        .select('id, full_name, credential, home_unit, email, role, requested_role')
        .eq('role', 'nurse')
        .order('full_name', { ascending: true })

      if (cancelled) return

      if (nurseError) {
        setError(nurseError.message)
        setNurses([])
        setLoading(false)
        return
      }

      const weekStart = getWeekStart(new Date())
      const { start, end } = getWeekRange(weekStart)

      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('nurse_id, starts_at, ends_at')
        .not('nurse_id', 'is', null)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())

      if (cancelled) return

      if (shiftError) {
        setError(shiftError.message)
        setNurses([])
        setLoading(false)
        return
      }

      const stats = {}
      for (const shift of shiftData ?? []) {
        const hours = (new Date(shift.ends_at) - new Date(shift.starts_at)) / 3600000
        if (!stats[shift.nurse_id]) stats[shift.nurse_id] = { count: 0, hours: 0 }
        stats[shift.nurse_id].count += 1
        stats[shift.nurse_id].hours += hours
      }

      setNurses(nurseData ?? [])
      setWeekStats(stats)
      setLoading(false)
    }

    fetchStaff()
    return () => { cancelled = true }
  }, [])

  function handleFieldChange(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  function handleToggleEdit(nurse) {
    setSaveError(null)
    setExpandedId((current) => {
      if (current === nurse.id) return null
      setEditForm({
        email: nurse.email ?? '',
        home_unit: nurse.home_unit ?? '',
        credential: nurse.credential ?? '',
      })
      return nurse.id
    })
  }

  function handleCancelEdit() {
    setExpandedId(null)
    setEditForm(null)
    setSaveError(null)
  }

  async function handleConfirmCoordinator(nurse) {
    setSaving(true)
    setSaveError(null)

    const { error: confirmError } = await supabase
      .from('profiles')
      .update({ role: 'coordinator', requested_role: null })
      .eq('id', nurse.id)

    setSaving(false)

    if (confirmError) {
      setSaveError(confirmError.message)
      return
    }

    setNurses((current) =>
      current.map((n) => (n.id === nurse.id ? { ...n, role: 'coordinator', requested_role: null } : n)),
    )
  }

  async function handleSave(nurse) {
    setSaving(true)
    setSaveError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email: editForm.email || null,
        home_unit: editForm.home_unit || null,
        credential: editForm.credential || null,
      })
      .eq('id', nurse.id)

    setSaving(false)

    if (updateError) {
      setSaveError(updateError.message)
      return
    }

    setNurses((current) => current.map((n) => (n.id === nurse.id ? { ...n, ...editForm } : n)))
    setSavedId(nurse.id)
    setSavedFading(false)
    setTimeout(() => setSavedFading(true), 1500)
    setTimeout(() => {
      setSavedId((current) => (current === nurse.id ? null : current))
      setSavedFading(false)
    }, 2000)
  }

  const units = useMemo(() => {
    const seen = new Set()
    for (const nurse of nurses) {
      if (nurse.home_unit) seen.add(nurse.home_unit)
    }
    return Array.from(seen).sort()
  }, [nurses])

  const visibleNurses = useMemo(() => {
    const query = search.trim().toLowerCase()
    return nurses.filter((nurse) => {
      if (selectedUnit !== 'All' && nurse.home_unit !== selectedUnit) return false
      if (query && !nurse.full_name?.toLowerCase().includes(query)) return false
      return true
    })
  }, [nurses, search, selectedUnit])

  // Self-signups who asked to be a coordinator. They stay nurses until an
  // existing coordinator confirms, because is_coordinator() grants full access
  // to every shift, claim and notification.
  const pendingCoordinators = nurses.filter((n) => n.requested_role === 'coordinator')

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Staff" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 px-5 pt-2.5 pb-12">
        {loading && <p className="text-sm text-ink-secondary">Loading staff…</p>}
        {error && <p className="text-sm text-red-700">Could not load staff: {error}</p>}

        {!loading && !error && (
          <>
            {pendingCoordinators.length > 0 && (
              <div className="flex flex-col gap-2.5 rounded-card border border-teal-foreground bg-card-surface p-4">
                <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
                  Coordinator access requested
                </p>
                {pendingCoordinators.map((nurse) => (
                  <div key={nurse.id} className="flex flex-row items-center gap-3">
                    <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-press-state text-[13px] font-semibold text-ink-secondary">
                      {getInitials(nurse.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                        {nurse.full_name}
                      </p>
                      <p className="truncate text-xs text-ink-secondary">
                        {nurse.home_unit ?? 'No unit'} &middot; asked to be a coordinator
                      </p>
                    </span>
                    <Button
                      type="button"
                      onClick={() => handleConfirmCoordinator(nurse)}
                      disabled={saving}
                      data-testid={`confirm-coordinator-${nurse.id}`}
                      className="h-9 shrink-0 px-4 text-[13px]"
                    >
                      Confirm
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-row items-center gap-2 rounded-field border border-hairline bg-card-surface p-3 text-sm text-ink-secondary">
              <Search size={15} strokeWidth={1.75} className="shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff"
                className="w-full bg-transparent text-ink placeholder:text-ink-secondary focus:outline-none"
              />
            </div>

            {units.length > 0 && (
              <div className="flex flex-row gap-2 overflow-x-auto pb-1">
                {['All', ...units].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setSelectedUnit(unit)}
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-[7px] text-[13px] font-semibold tracking-[-0.01em]',
                      selectedUnit === unit
                        ? 'border-teal-foreground bg-teal-foreground text-white'
                        : 'border-hairline bg-card-surface text-ink-secondary',
                    )}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            )}

            {nurses.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No nurses on your roster yet"
                size="inline"
                tone="neutral"
              />
            ) : visibleNurses.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No staff match this search"
                subline="Try a different name or unit."
                size="inline"
                tone="neutral"
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">
                  {selectedUnit === 'All' ? 'All staff' : selectedUnit} &middot; {visibleNurses.length}
                </p>

                <div className="flex flex-col overflow-hidden rounded-card border border-hairline bg-card-surface shadow-card-lift">
                  {visibleNurses.map((nurse, index) => {
                    const stats = weekStats[nurse.id] ?? { count: 0, hours: 0 }
                    const roundedHours = Math.round(stats.hours * 10) / 10
                    const isExpanded = expandedId === nurse.id

                    return (
                      <div key={nurse.id}>
                        <button
                          type="button"
                          onClick={() => handleToggleEdit(nurse)}
                          className="flex w-full flex-row items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-press-state"
                        >
                          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-press-state text-[13px] font-semibold text-ink-secondary">
                            {getInitials(nurse.full_name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
                              {nurse.full_name}
                            </p>
                            <p className="truncate text-xs text-ink-secondary">
                              {nurse.home_unit ?? 'No unit'} &middot; {stats.count} shift{stats.count === 1 ? '' : 's'} &middot; {roundedHours} hrs
                            </p>
                          </span>
                          {nurse.credential && (
                            <span className="shrink-0 rounded-full bg-press-state px-2 py-[3px] text-[11px] font-semibold text-ink-secondary">
                              {nurse.credential}
                            </span>
                          )}
                        </button>

                        {!isExpanded && index < visibleNurses.length - 1 && (
                          <div className="ml-16 h-px bg-hairline" />
                        )}

                        {isExpanded && editForm && (
                          <div className="flex flex-col gap-4 border-t border-hairline bg-card-surface p-4">
                            <div className="flex flex-col gap-1.5">
                              <label className={labelClassName}>Email</label>
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => handleFieldChange('email', e.target.value)}
                                className={inputClassName}
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className={labelClassName}>Home unit</label>
                              <select
                                value={editForm.home_unit}
                                onChange={(e) => handleFieldChange('home_unit', e.target.value)}
                                className={inputClassName}
                              >
                                <option value="">Select unit</option>
                                <option value="Unit 1">Unit 1</option>
                                <option value="Unit 2">Unit 2</option>
                                <option value="Unit 3">Unit 3</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className={labelClassName}>Credential</label>
                              <input
                                type="text"
                                value={editForm.credential}
                                onChange={(e) => handleFieldChange('credential', e.target.value)}
                                className={inputClassName}
                              />
                            </div>

                            {saveError && <p className="text-sm text-red-700">Could not save: {saveError}</p>}

                            {savedId === nurse.id && (
                              <span
                                className={cn(
                                  'text-xs text-[#16A34A] transition-opacity duration-500',
                                  savedFading ? 'opacity-0' : 'opacity-100',
                                )}
                              >
                                Saved
                              </span>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSave(nurse)}
                                disabled={saving}
                                className="rounded-button bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                              >
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="rounded-button border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {isExpanded && index < visibleNurses.length - 1 && (
                          <div className="h-px bg-hairline" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
