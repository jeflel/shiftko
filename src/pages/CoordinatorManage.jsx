import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, Calendar, ChevronRight, Pencil, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NavRow } from '@/components/ui/nav-row'
import { Button } from '@/components/ui/button'
import { PeriodTag } from '@/components/ui/period-tag'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { inputClassName, labelClassName } from '@/components/ui/field'
import { SHIFT_PRESETS, buildShiftTimes } from '@/lib/shiftPresets'
import { formatLocalDateKey, formatShiftTimeRange, getShiftPeriod } from '../lib/shiftFormat'
import { cn } from '@/lib/utils'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

// Coordinator — Manage hub, per CoordinatorManageLinearLight.dc.html. This
// used to be Schedule.jsx's "Manage" tab (Post a Shift form inline, then
// Recent Shifts/Pending Claims/Pending Swaps/Duplicate a Week all stacked
// below it). Those pieces are now their own pushed screens (PostShift,
// CoordinatorApprovals, StaffRoster, DuplicateWeek); this hub ties them
// together per the mockup: a Post a Shift CTA, an Upcoming Shifts list, and
// a Tools nav list. Departments has no live backend (no table, no UI) and
// stays a disabled "Soon" row, per the rollout doc's carried-over open
// decision.
//
// "Recent shifts" (order('created_at', desc) - whatever was posted most
// recently) is renamed and requeried as "Upcoming Shifts" (order('starts_at',
// asc), filtered to today-or-later) to match the mockup's actual content -
// this is a query semantics change, not just a visual one. Kept both the
// edit and delete icon per row (the mockup only draws an edit icon) since
// delete is real, tested functionality already live; dropping it to match
// the mockup exactly would be a regression, not a reskin.
export default function CoordinatorManage({ onBack, onGoToPostShift, onGoToStaff, onGoToDuplicateWeek }) {
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)

  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [upcomingError, setUpcomingError] = useState(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)

  const [openShiftAction, setOpenShiftAction] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)
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

  async function fetchUpcomingShifts() {
    setUpcomingLoading(true)
    setUpcomingError(null)

    const { data, error: fetchError } = await supabase
      .from('shifts')
      .select('id, unit, starts_at, ends_at, status, nurse_id, profiles!nurse_id ( full_name )')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    if (fetchError) {
      setUpcomingError(fetchError.message)
      setUpcomingShifts([])
    } else {
      setUpcomingShifts(data ?? [])
    }

    setUpcomingLoading(false)
  }

  useEffect(() => {
    fetchUpcomingShifts()
  }, [])

  function handleCloseShiftAction() {
    setOpenShiftAction(null)
    setEditForm(null)
    setEditError(null)
    setDeleteError(null)
  }

  function handleOpenEdit(shift) {
    setActionMessage(null)
    setEditError(null)
    setEditForm({
      nurse_id: shift.nurse_id ?? '',
      unit: shift.unit,
      date: formatLocalDateKey(new Date(shift.starts_at)),
      shift_type: getShiftPeriod(shift.starts_at).toLowerCase(),
    })
    setOpenShiftAction({ type: 'edit', shiftId: shift.id })
  }

  function handleOpenDelete(shift) {
    setActionMessage(null)
    setDeleteError(null)
    setOpenShiftAction({ type: 'delete', shiftId: shift.id })
  }

  async function handleSaveEdit(shiftId) {
    if (!editForm.nurse_id) {
      setEditError('Please select a nurse.')
      return
    }
    if (!editForm.date) {
      setEditError('Please choose a date.')
      return
    }

    setEditSaving(true)
    setEditError(null)

    const editPreset = SHIFT_PRESETS.find((p) => p.key === editForm.shift_type) ?? SHIFT_PRESETS[0]
    const { starts_at, ends_at } = buildShiftTimes(editForm.date, editPreset.start, editPreset.end)

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        nurse_id: editForm.nurse_id,
        unit: editForm.unit,
        starts_at,
        ends_at,
        status: 'scheduled',
      })
      .eq('id', shiftId)

    setEditSaving(false)

    if (updateError) {
      setEditError(updateError.message)
      return
    }

    handleCloseShiftAction()
    setActionMessage('Shift updated.')
    fetchUpcomingShifts()
  }

  async function handleConfirmDelete(shiftId) {
    setDeleteSaving(true)
    setDeleteError(null)

    const { error: deleteErr } = await supabase.from('shifts').delete().eq('id', shiftId)

    setDeleteSaving(false)

    if (deleteErr) {
      setDeleteError(deleteErr.message)
      return
    }

    handleCloseShiftAction()
    setActionMessage('Shift deleted.')
    fetchUpcomingShifts()
  }

  const visibleUpcoming = showAllUpcoming ? upcomingShifts : upcomingShifts.slice(0, 5)

  return (
    <div
      className="fixed inset-0 z-[100] mx-auto flex w-full max-w-md flex-col overflow-y-auto bg-page-ground"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <NavRow title="Manage" onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pt-2.5 pb-12">
        <Button
          type="button"
          onClick={onGoToPostShift}
          data-testid="manage-post-shift-cta"
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-card bg-teal-foreground text-[15px] font-semibold tracking-[-0.01em] text-white hover:bg-teal-foreground-hover"
        >
          Post a Shift
        </Button>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">Upcoming Shifts</p>

          {actionMessage && <p className="text-sm text-[#16A34A]">{actionMessage}</p>}
          {upcomingLoading && <p className="text-sm text-ink-secondary">Loading…</p>}
          {!upcomingLoading && upcomingError && (
            <p className="text-sm text-red-700">Could not load upcoming shifts: {upcomingError}</p>
          )}

          {!upcomingLoading && !upcomingError && upcomingShifts.length === 0 && (
            <p className="text-sm text-ink-secondary">No upcoming shifts.</p>
          )}

          {!loading && !upcomingLoading && upcomingShifts.length > 0 && (
            <>
              <ul className={SHIFT_LIST_CLASSNAME}>
                {visibleUpcoming.map((shift, index) => {
                  const date = new Date(shift.starts_at)
                  const period = getShiftPeriod(shift.starts_at)
                  const isEditing = openShiftAction?.type === 'edit' && openShiftAction.shiftId === shift.id
                  const isDeleting = openShiftAction?.type === 'delete' && openShiftAction.shiftId === shift.id

                  return (
                    <li key={shift.id}>
                      <div className="flex w-full items-center gap-3 px-4 py-3.5">
                        <div className="flex w-[34px] shrink-0 flex-col items-center">
                          <span className="text-[11px] font-semibold tracking-wide text-ink-secondary uppercase">
                            {weekdayFormatter.format(date)}
                          </span>
                          <span className="text-[20px] leading-tight font-semibold text-ink">{date.getDate()}</span>
                        </div>

                        <div className="h-full min-h-9 w-px shrink-0 self-stretch bg-hairline" aria-hidden="true" />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-ink">
                            {formatShiftTimeRange(shift.starts_at, shift.ends_at)}
                          </p>
                          <p className="truncate text-[12px] text-ink-secondary">
                            {shift.profiles?.full_name ?? 'Open'} &middot; {shift.unit}
                          </p>
                        </div>

                        <PeriodTag period={period} />

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(shift)}
                            aria-label="Edit shift"
                            className="p-1 text-ink-secondary"
                          >
                            <Pencil size={15} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(shift)}
                            aria-label="Delete shift"
                            className="p-1 text-red-500"
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {isEditing && editForm && (
                        <div className="flex flex-col gap-4 border-t border-hairline bg-card-surface p-4">
                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Nurse</label>
                            <select
                              value={editForm.nurse_id}
                              onChange={(e) => setEditForm({ ...editForm, nurse_id: e.target.value })}
                              className={inputClassName}
                            >
                              <option value="">Select a nurse</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.full_name} {n.credential ? `(${n.credential})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Unit</label>
                            <select
                              value={editForm.unit}
                              onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                              className={inputClassName}
                            >
                              <option value="Unit 1">Unit 1</option>
                              <option value="Unit 2">Unit 2</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Date</label>
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className={inputClassName}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className={labelClassName}>Shift</label>
                            <select
                              value={editForm.shift_type}
                              onChange={(e) => setEditForm({ ...editForm, shift_type: e.target.value })}
                              className={inputClassName}
                            >
                              <option value="day">Day (7am – 7pm)</option>
                              <option value="evening">Evening (3pm – 11pm)</option>
                              <option value="night">Night (11pm – 7am)</option>
                            </select>
                          </div>

                          {editError && <p className="text-sm text-red-700">{editError}</p>}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(shift.id)}
                              disabled={editSaving}
                              className="rounded-button bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              {editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseShiftAction}
                              disabled={editSaving}
                              className="rounded-button border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {isDeleting && (
                        <div className="flex flex-col gap-3 border-t border-hairline bg-card-surface p-4">
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
                              onClick={() => handleConfirmDelete(shift.id)}
                              disabled={deleteSaving}
                              className="rounded-button bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              {deleteSaving ? 'Deleting…' : 'Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseShiftAction}
                              disabled={deleteSaving}
                              className="rounded-button border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {index < visibleUpcoming.length - 1 && !isEditing && !isDeleting && <ShiftListDivider />}
                    </li>
                  )
                })}
              </ul>

              {upcomingShifts.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming((current) => !current)}
                  className="self-start text-sm font-semibold text-teal-foreground"
                >
                  {showAllUpcoming ? 'Show less' : 'Show all shifts'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold tracking-[0.05em] text-ink-secondary uppercase">Tools</p>

          <div className="flex flex-col overflow-hidden rounded-card border border-hairline bg-card-surface shadow-card-lift">
            <button
              type="button"
              onClick={onGoToDuplicateWeek}
              className="flex w-full flex-row items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-press-state text-ink-secondary">
                <Calendar size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Duplicate a Week</p>
                <p className="truncate text-xs text-ink-secondary">Copy a week&rsquo;s schedule forward</p>
              </span>
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
            </button>
            <div className="ml-[62px] h-px bg-hairline" />

            <button
              type="button"
              onClick={onGoToStaff}
              className="flex w-full flex-row items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-press-state"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-press-state text-ink-secondary">
                <Users size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Staff</p>
                <p className="truncate text-xs text-ink-secondary">Manage nurse profiles</p>
              </span>
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-chevron-muted" />
            </button>
            <div className="ml-[62px] h-px bg-hairline" />

            <div
              className={cn(
                'flex w-full flex-row items-center gap-3 px-4 py-3.5 text-left opacity-50',
              )}
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-press-state text-ink-secondary">
                <Building2 size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Departments</p>
                <p className="truncate text-xs text-ink-secondary">Create units, wards &amp; the float pool</p>
              </span>
              <span className="shrink-0 rounded-full bg-press-state px-2 py-[3px] text-[11px] font-semibold text-ink-secondary">
                Soon
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
