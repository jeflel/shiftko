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
