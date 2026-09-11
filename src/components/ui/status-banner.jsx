// Neutral inline banner for a status detail screen's headline message
// (.status-banner in the Linear Light source). Extracted from
// ClaimStatusDetail.jsx's local StatusBanner once the Swap flow needed the
// same shape a second time - SwapIncomingRequest's variant swaps the leading
// icon for the requester's avatar initials (per SwapIncomingRequestLinearLight
// .dc.html's .avatar-md), so both are supported here rather than forking the
// component.
export function StatusBanner({ icon: Icon, avatarInitials, children }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card bg-press-state px-3.5 py-3">
      {avatarInitials ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-surface text-xs font-semibold text-ink-secondary">
          {avatarInitials}
        </span>
      ) : (
        Icon && <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-secondary" />
      )}
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{children}</span>
    </div>
  )
}
