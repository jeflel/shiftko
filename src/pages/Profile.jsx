import { useEffect, useState } from 'react'
import { Building2, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/ui/wordmark'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import JoinWorkspaceForm from '../components/JoinWorkspaceForm'

function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function SettingsRow({ label, value, last }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="truncate text-sm text-ink-secondary">{value || 'Not set'}</span>
      </div>
      {!last && <ShiftListDivider inset={false} />}
    </>
  )
}

export default function Profile({ user, onWorkspaceLeft }) {
  const [signingOut, setSigningOut] = useState(false)
  const [profile, setProfile] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [openAction, setOpenAction] = useState(null)
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [leaveError, setLeaveError] = useState(null)

  useEffect(() => {
    let active = true

    async function fetchAccount() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, credential, home_unit, workspace_id')
        .eq('id', user.id)
        .single()

      if (!active || !data) return
      setProfile(data)

      if (data.workspace_id) {
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('id, name')
          .eq('id', data.workspace_id)
          .single()

        if (active && workspaceData) setWorkspace(workspaceData)
      }
    }

    fetchAccount()

    return () => {
      active = false
    }
  }, [user.id])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  function toggleAction(action) {
    setOpenAction((current) => (current === action ? null : action))
    setLeaveError(null)
  }

  async function handleConfirmLeave() {
    setLeaveSaving(true)
    setLeaveError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ workspace_id: null })
      .eq('id', user.id)

    setLeaveSaving(false)

    if (error) {
      setLeaveError('Something went wrong. Try again.')
      return
    }

    setWorkspace(null)
    setOpenAction(null)
    onWorkspaceLeft()
  }

  function handleJoinedAnother(newWorkspace) {
    setWorkspace(newWorkspace)
    setOpenAction(null)
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-[26px] pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-semibold text-[#111111]">Profile</h1>
        <div className="flex flex-col items-end gap-1">
          <Wordmark />
          <span className="rounded-full bg-[#E0F7FA] px-2 py-0.5 text-xs font-medium text-teal-mid">Beta</span>
        </div>
      </div>

      {/* Identity header */}
      {profile && (
        <div className="mt-8 flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-press-state text-[17px] font-semibold text-ink">
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{profile.full_name}</p>
            <p className="truncate text-[13px] text-ink-secondary">
              {[profile.credential, profile.home_unit].filter(Boolean).join(' · ') || 'No details yet'}
            </p>
          </div>
        </div>
      )}

      {/* Account */}
      {profile && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-xs font-medium tracking-wide text-ink-secondary uppercase">Account</p>
          <div className={SHIFT_LIST_CLASSNAME}>
            <SettingsRow label="Email" value={profile.email} />
            <SettingsRow label="Credential" value={profile.credential} />
            <SettingsRow label="Home unit" value={profile.home_unit} last />
          </div>
        </div>
      )}

      {/* Workspace */}
      {profile && (
        <div className={`mt-4 p-4 ${SHIFT_LIST_CLASSNAME}`}>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8F7F5] text-[#6B7280]">
              <Building2 size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium tracking-wide text-[#9CA3AF] uppercase">Workspace</p>
              <p className="truncate text-sm font-medium text-[#111111]">
                {workspace ? workspace.name : "You're not in a workspace yet"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {workspace ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleAction('leave')}
                  data-testid="profile-leave-workspace"
                  className="rounded-full border border-[#E8E6E3] px-4 py-1.5 text-sm font-medium text-red-600"
                >
                  Leave workspace
                </button>
                <button
                  type="button"
                  onClick={() => toggleAction('join')}
                  data-testid="profile-join-workspace"
                  className="rounded-full border border-[#E8E6E3] px-4 py-1.5 text-sm font-medium text-[#111111]"
                >
                  Join another
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => toggleAction('join')}
                data-testid="profile-join-workspace"
                className="rounded-full border border-[#E8E6E3] px-4 py-1.5 text-sm font-medium text-[#111111]"
              >
                Join workspace
              </button>
            )}
          </div>

          {openAction === 'leave' && (
            <div className="mt-4 flex flex-col gap-3 border-t border-[#E8E6E3] pt-4">
              <p className="text-sm font-medium text-[#111111]">Leave this workspace?</p>
              <p className="text-sm text-[#6B7280]">You'll need a code to rejoin.</p>
              {leaveError && <p className="text-sm text-red-700">{leaveError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmLeave}
                  disabled={leaveSaving}
                  data-testid="profile-leave-confirm"
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {leaveSaving ? 'Leaving…' : 'Leave'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleAction('leave')}
                  disabled={leaveSaving}
                  data-testid="profile-leave-cancel"
                  className="rounded-full border border-[#E8E6E3] px-4 py-2 text-sm font-medium text-[#111111] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {openAction === 'join' && (
            <div className="mt-4 border-t border-[#E8E6E3] pt-4">
              <JoinWorkspaceForm user={user} onSuccess={handleJoinedAnother} submitLabel="Join" />
            </div>
          )}
        </div>
      )}

      {/* Sign out */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleSignOut}
        disabled={signingOut}
        data-testid="profile-sign-out"
        className="mt-8 h-[50px] w-full rounded-card"
      >
        <LogOut size={16} strokeWidth={2} />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>

      <p className="mt-6 text-center text-xs text-[#9CA3AF]">Shiftko · Beta</p>
    </main>
  )
}
