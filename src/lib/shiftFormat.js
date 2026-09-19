const userLocale = navigator.language
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const shortDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const timeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: userTimeZone,
}

export function formatLocalDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: userTimeZone }).format(date)
}

export function formatShiftDate(startsAt) {
  return dateFormatter.format(new Date(startsAt))
}

// "Saturday, September 19" - the full date without the year. formatShiftDate
// carries the year because it labels a specific past or future shift; this one
// names the day the reader is standing in, where the year is never in question
// and would cost a second line on a phone.
export function formatLongDateNoYear(date) {
  return longDateFormatter.format(new Date(date))
}

// "Mon, Sep 15" - used by the Swap cards, which pack date + time onto one
// line (swap-card-time in the Linear Light source) rather than the two-line
// full-date layout formatShiftDate serves elsewhere.
export function formatShiftDayShort(startsAt) {
  return shortDayFormatter.format(new Date(startsAt))
}

export function formatShiftTimeRange(startsAt, endsAt) {
  const start = new Date(startsAt).toLocaleTimeString(userLocale, timeFormatOptions)
  const end = new Date(endsAt).toLocaleTimeString(userLocale, timeFormatOptions)
  return `${start} – ${end}`
}

export function getShiftPeriod(startsAt) {
  const hour = Number(
    new Intl.DateTimeFormat(userLocale, {
      hour: 'numeric',
      hour12: false,
      timeZone: userTimeZone,
    })
      .formatToParts(new Date(startsAt))
      .find((part) => part.type === 'hour').value,
  )

  if (hour < 15) return 'Day'
  if (hour < 23) return 'Evening'
  return 'Night'
}

export function isSameLocalDay(dateA, dateB) {
  return formatLocalDateKey(dateA) === formatLocalDateKey(dateB)
}

// A shift or personal event that has started and has not ended yet. An overnight
// shift is the reason this exists: the Night preset runs 23:00 to 07:30 the next
// morning, so it is still on after midnight while its starts_at is still on
// yesterday's date.
export function isInProgress(item, now = new Date()) {
  const start = new Date(item.starts_at).getTime()
  const end = new Date(item.ends_at).getTime()
  const at = now.getTime()
  return start <= at && at < end
}

// Day-ownership rule for a one-day view (2026-09-19). Every surface used to ask
// "does this start today", so an overnight shift dropped out of today at 00:00
// and Home showed "No shift today" with no progress bar while the nurse was
// still working the shift. An item belongs to today when it STARTS today or when
// it is still in progress from an earlier day. It keeps belonging to the day it
// started as well, so it can appear on both.
export function isOnDay(item, now = new Date()) {
  return isInProgress(item, now) || isSameLocalDay(new Date(item.starts_at), now)
}

// The extra entries a day has to show on top of its own: items grouped under an
// earlier start date that are still in progress. Excluding items whose start day
// IS this day is what keeps a normal shift from being listed twice.
export function carriedIntoDay(items, dayKey, now = new Date()) {
  return items.filter(
    (item) => isInProgress(item, now) && formatLocalDateKey(new Date(item.starts_at)) !== dayKey,
  )
}

// Applies the carry above to one grouped-by-day map (the shape groupByDayKey
// returns). The carried entry is merged into today's bucket and the bucket is
// re-sorted by start time, so the day's own rows keep their order. Callers pass
// the same items they grouped, and the map comes back untouched when nothing is
// in progress, which is the usual case.
export function withOvernightCarry(grouped, items, now = new Date()) {
  const dayKey = formatLocalDateKey(now)
  const carry = carriedIntoDay(items, dayKey, now)
  if (carry.length === 0) return grouped

  const next = { ...grouped }
  next[dayKey] = [...(next[dayKey] ?? []), ...carry].sort(
    (a, b) => new Date(a.starts_at) - new Date(b.starts_at),
  )
  return next
}

export function isWithinNextSevenDays(startsAt) {
  const shiftKey = formatLocalDateKey(new Date(startsAt))
  const todayKey = formatLocalDateKey(new Date())
  const end = new Date()
  end.setDate(end.getDate() + 7)
  const endKey = formatLocalDateKey(end)

  return shiftKey >= todayKey && shiftKey < endKey
}

const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  timeZone: userTimeZone,
})

export function formatDayLabel(date) {
  return dayLabelFormatter.format(date)
}

export function getFourWeekRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 28)

  return { start, end }
}

export function getFourWeekDays() {
  const { start } = getFourWeekRange()
  const days = []

  for (let index = 0; index < 28; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    days.push({
      date,
      key: formatLocalDateKey(date),
      label: formatDayLabel(date),
    })
  }

  return days
}

// Sunday-start week boundary, used by the My Shifts week strip. Kept separate from
// getWeekStart (Monday-start) below, which the Manage tab's "Duplicate a week" feature
// and Staff tab already depend on — do not merge these two.
export function getSundayWeekStart(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

export function getWeekStart(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay() // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diffToMonday)
  return start
}

export function getWeekRange(weekStart) {
  const start = new Date(weekStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

// Shifts a timestamp forward/back by a whole number of calendar days using local
// wall-clock components (year/month/day/hour/minute/second) instead of raw
// millisecond arithmetic. This keeps the local time-of-day fixed (e.g. a 7:00am
// shift stays 7:00am) even across a daylight-saving transition — adding
// `days * 86400000` ms directly would drift by the DST offset instead.
export function addLocalDays(isoString, days) {
  const d = new Date(isoString)
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  ).toISOString()
}

// Whole-day difference between two dates, compared by calendar date only
// (ignoring time-of-day, so a DST change between the two doesn't skew the count).
export function diffInCalendarDays(fromDate, toDate) {
  const utcFrom = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const utcTo = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.round((utcTo - utcFrom) / 86400000)
}

// "20 minutes ago" / "2 hours ago" - extracted from Home.jsx's local
// formatRelativeTime once OfferShiftStatus/OfferShiftUpdate needed the same
// relative-time formatting a second place, per the rollout's "duplicate
// once, extract on the second use" pattern.
export function formatRelativeTime(isoString) {
  const diffMinutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
}

export function groupByDayKey(items, getStartsAt) {
  const grouped = {}

  for (const item of items) {
    const key = formatLocalDateKey(new Date(getStartsAt(item)))
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  return grouped
}
