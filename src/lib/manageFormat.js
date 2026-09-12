// Coordinator-management formatting helpers, shared by the Approvals,
// Staff, and Duplicate Week pages. Moved out of Schedule.jsx once those
// sections became their own pages.

export function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export function formatTimeAgo(claimedAt) {
  const diffMins = Math.max(0, Math.round((Date.now() - new Date(claimedAt).getTime()) / 60000))
  if (diffMins < 60) return `${diffMins} mins ago`
  return `${Math.round(diffMins / 60)} hrs ago`
}

export function formatWeekRangeLabel(weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}
