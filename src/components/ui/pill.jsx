import { Sun, Sunset, Moon, Circle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PERIOD_CONFIG = {
  Day: {
    label: 'MORNING',
    icon: Sun,
    className: 'rounded-[7px] bg-[#FCF4DD] px-2 py-1 text-[11px] font-bold tracking-[-0.22px] text-[#C96F15]',
  },
  Evening: {
    label: 'EVENING',
    icon: Sunset,
    className: 'rounded-[7px] bg-[#DBF9E2] px-2 py-1 text-[11px] font-bold tracking-[-0.22px] text-[#278E8E]',
  },
  Night: {
    label: 'NIGHT',
    icon: Moon,
    className: 'rounded-[7px] bg-[#FFE4FC] px-2 py-1 text-[11px] font-bold tracking-[-0.22px] text-[#5132AE]',
  },
}

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Circle, className: 'bg-[#D1FAE5] text-[#059669]' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-[#FEF3C7] text-[#D97706]' },
  scheduled: { label: 'Assigned', icon: CheckCircle2, className: 'bg-[#EDE9FE] text-[#7C3AED]' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-[#F3F4F6] text-[#6B7280]' },
}

function PillBase({ icon: Icon, label, className, iconSize = 12 }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        className,
      )}
    >
      {Icon && <Icon size={iconSize} strokeWidth={2.5} />}
      {label}
    </span>
  )
}

export function ShiftPeriodPill({ period }) {
  const config = PERIOD_CONFIG[period] ?? { label: period, icon: null, className: 'bg-gray-100 text-gray-500' }
  return <PillBase icon={config.icon} label={config.label} className={config.className} iconSize={13} />
}

export function StatusPill({ status, label }) {
  const config = STATUS_CONFIG[status] ?? { label: status, icon: null, className: 'bg-gray-100 text-gray-500' }
  return <PillBase icon={config.icon} label={label ?? config.label} className={config.className} />
}
