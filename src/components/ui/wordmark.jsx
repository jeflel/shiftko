import { cn } from '@/lib/utils'

export function Wordmark({ className, size = 19.5 }) {
  return (
    <p
      className={cn('font-display font-bold text-[#002833]', className)}
      style={{ fontSize: size }}
    >
      Shift
      <span className="italic">ko</span>
    </p>
  )
}
