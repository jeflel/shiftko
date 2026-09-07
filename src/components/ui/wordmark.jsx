import { cn } from '@/lib/utils'

export function Wordmark({ className, size = 19.5 }) {
  return (
    <p
      className={cn('font-bold text-ink', className)}
      style={{ fontSize: size }}
    >
      Shift
      <span className="italic">ko</span>
    </p>
  )
}
