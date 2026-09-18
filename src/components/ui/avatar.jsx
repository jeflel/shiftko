import { cn } from '@/lib/utils'

// One shared avatar: the photo when there is one, initials when there is not.
// Four files had each grown their own getInitials, so the fallback lives here
// now and a face and a set of initials cannot drift apart.
//
// The fallback is a `press-state` circle, which is already the app's avatar
// vocabulary (coworker rows, swap rows, Profile's identity circle), so a nurse
// without a photo looks deliberate rather than broken.
const SIZES = {
  sm: 'size-9 text-[13px]',
  md: 'size-14 text-[17px]',
}

export function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export function Avatar({ name, src, size = 'sm', className }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-press-state font-semibold text-ink-secondary',
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
