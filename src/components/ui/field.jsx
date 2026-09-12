// Shared form-field class names, used by AddMyShiftPanel (nurse self-
// scheduling, in Schedule.jsx), PostShift.jsx, DuplicateWeek.jsx, and
// CoordinatorManage.jsx's inline shift-edit form.

export const inputClassName =
  'w-full rounded-control border border-hairline p-3 text-sm focus:border-ink focus:outline-none'
export const labelClassName = 'text-xs font-medium tracking-wide text-ink-secondary uppercase'

// Linear Light's .field-input/.field-textarea, first used by the coordinator's
// Post a Shift form (PostShiftLinearLight.dc.html) - 14px radius rather than
// inputClassName's 9px, plus explicit ink text. Scoped to coordinator forms
// only, not merged into inputClassName, since inputClassName is also used by
// the nurse-facing "Add a shift" self-scheduling modal, which has no mockup
// and isn't part of this pass.
export const fieldInputClassName =
  'w-full rounded-field border border-hairline bg-card-surface p-3 text-sm font-medium text-ink focus:border-ink focus:outline-none'
