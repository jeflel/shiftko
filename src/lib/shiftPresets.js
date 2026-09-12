import { Sun, Sunset, Moon } from 'lucide-react'

// Standard Burlingame shift blocks (30-min overlap for handoff/report). Two-Color
// Rule: no per-period hue — unselected chips are neutral, selected uses the one
// accent teal (Selection Row pattern), same as the onboarding credential/unit pickers.
// Shared by AddMyShiftPanel (nurse self-scheduling, in Schedule.jsx), PostShift.jsx
// (coordinator posting), and CoordinatorManage.jsx (Upcoming Shifts inline edit).
export const SHIFT_PRESETS = [
  {
    key: 'day',
    label: 'Day',
    time: '7:00 AM – 3:30 PM',
    start: { hours: 7, minutes: 0 },
    end: { hours: 15, minutes: 30 },
    icon: Sun,
    className: 'border border-hairline bg-card-surface text-ink-secondary',
    selectedClassName: 'border border-teal-foreground bg-teal-tint text-teal-foreground',
  },
  {
    key: 'evening',
    label: 'Evening',
    time: '3:00 PM – 11:30 PM',
    start: { hours: 15, minutes: 0 },
    end: { hours: 23, minutes: 30 },
    icon: Sunset,
    className: 'border border-hairline bg-card-surface text-ink-secondary',
    selectedClassName: 'border border-teal-foreground bg-teal-tint text-teal-foreground',
  },
  {
    key: 'night',
    label: 'Night',
    time: '11:00 PM – 7:30 AM',
    start: { hours: 23, minutes: 0 },
    end: { hours: 7, minutes: 30 },
    icon: Moon,
    className: 'border border-hairline bg-card-surface text-ink-secondary',
    selectedClassName: 'border border-teal-foreground bg-teal-tint text-teal-foreground',
  },
]

// Builds ISO start/end timestamps for `date` (YYYY-MM-DD) given
// { hours, minutes } start/end pairs. Handles overnight shifts (e.g.
// Night: 11pm-7:30am) by rolling the end date forward one day.
export function buildShiftTimes(date, start, end) {
  const pad = (n) => String(n).padStart(2, '0')
  const starts_at = new Date(`${date}T${pad(start.hours)}:${pad(start.minutes)}:00`)
  const ends_at = new Date(`${date}T${pad(end.hours)}:${pad(end.minutes)}:00`)
  if (ends_at <= starts_at) ends_at.setDate(ends_at.getDate() + 1)
  return { starts_at: starts_at.toISOString(), ends_at: ends_at.toISOString() }
}
