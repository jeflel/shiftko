import { cn } from '@/lib/utils'

// Claim outcome pill, per ClaimStatusListLinearLight.dc.html's .status-tag
// family, parallel to period-tag.jsx's colored pills: gives pending/
// approved/denied their own color instead of one undifferentiated gray pill.
const CLAIM_STATUS_CONFIG = {
  pending: { label: 'Pending Approval', bg: 'bg-teal-tint', fg: 'text-teal-foreground' },
  approved: { label: 'Approved', bg: 'bg-status-approved-bg', fg: 'text-status-approved-fg' },
  denied: { label: 'Denied', bg: 'bg-status-denied-bg', fg: 'text-status-denied-fg' },
}

export function ClaimStatusTag({ status, label }) {
  const config = CLAIM_STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'shrink-0 rounded-control-sm px-[9px] py-1 text-[11px] font-semibold whitespace-nowrap',
        config.bg,
        config.fg,
      )}
    >
      {label ?? config.label}
    </span>
  )
}

// Swap outcome pill for SwapStatusList (net-new, no mockup - same reasoning
// as ClaimStatusList). "requested" reuses the same teal tint as claims'
// pending; "approved"/"denied" reuse the exact claim colors too. "accepted"
// and "declined" have no established color anywhere (no mockup shows a swap
// status pill at all), so they stay neutral gray rather than inventing new
// hues, matching ShiftStatusTag's "offered" precedent.
const SWAP_STATUS_CONFIG = {
  requested: { label: 'Requested', bg: 'bg-teal-tint', fg: 'text-teal-foreground' },
  accepted: { label: 'Awaiting Approval', bg: 'bg-press-state', fg: 'text-ink-secondary' },
  declined: { label: 'Declined', bg: 'bg-status-denied-bg', fg: 'text-status-denied-fg' },
  approved: { label: 'Approved', bg: 'bg-status-approved-bg', fg: 'text-status-approved-fg' },
  denied: { label: 'Denied', bg: 'bg-status-denied-bg', fg: 'text-status-denied-fg' },
}

export function SwapStatusTag({ status, label }) {
  const config = SWAP_STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'shrink-0 rounded-control-sm px-[9px] py-1 text-[11px] font-semibold whitespace-nowrap',
        config.bg,
        config.fg,
      )}
    >
      {label ?? config.label}
    </span>
  )
}
