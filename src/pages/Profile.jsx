import { useEffect, useState } from 'react'
import { Building2, ChevronDown, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SHIFT_LIST_CLASSNAME, ShiftListDivider } from '@/components/ui/shift-list'
import { TopBar } from '@/components/ui/top-bar'
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

function SettingsRow({ label, value, icon, last }) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {icon}
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="ml-auto truncate text-sm text-ink-secondary">{value || 'Not set'}</span>
      </div>
      {!last && <ShiftListDivider inset={false} />}
    </>
  )
}

function capitalize(value) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function Profile({ user, onWorkspaceLeft }) {
  const [signingOut, setSigningOut] = useState(false)
  const [profile, setProfile] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [identities, setIdentities] = useState([])
  const [openAction, setOpenAction] = useState(null)
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [leaveError, setLeaveError] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let active = true

    async function fetchAccount() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, role, credential, home_unit, workspace_id')
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

  useEffect(() => {
    let active = true

    async function fetchIdentities() {
      const { data } = await supabase.auth.getUser()
      if (active && data?.user) setIdentities(data.user.identities ?? [])
    }

    fetchIdentities()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!passwordSuccess) return undefined
    const timer = setTimeout(() => setPasswordSuccess(false), 4000)
    return () => clearTimeout(timer)
  }, [passwordSuccess])

  const connectedAccounts = identities
    .filter((identity) => identity.provider !== 'email')
    .map((identity) => identity.provider.charAt(0).toUpperCase() + identity.provider.slice(1))
    .join(', ')

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  function toggleAction(action) {
    setOpenAction((current) => (current === action ? null : action))
    setLeaveError(null)
    setPasswordError(null)
    setPasswordSuccess(false)
    setDeleteError(null)
    setDeleteConfirmText('')
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

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setOpenAction(null)
    setPasswordSuccess(true)
  }

  async function handleDeleteAccount() {
    setDeleteSaving(true)
    setDeleteError(null)

    const { error } = await supabase.functions.invoke('delete-account')

    if (error) {
      let message = error.message || 'Something went wrong. Try again.'
      try {
        const body = await error.context?.json?.()
        if (body?.error) message = body.error
      } catch {
        // keep the fallback message
      }
      setDeleteError(message)
      setDeleteSaving(false)
      return
    }

    await supabase.auth.signOut()
  }

  function handleJoinedAnother(newWorkspace) {
    setWorkspace(newWorkspace)
    setOpenAction(null)
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-12">
      <TopBar user={user} />
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Profile</h1>
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

      {/* Facility */}
      {profile && (
        <div className="mt-6">
          <div className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
            <SettingsRow
              icon={<Building2 size={16} strokeWidth={1.75} className="text-ink-secondary" />}
              label="Facility"
              value={workspace?.name}
              last
            />
          </div>
        </div>
      )}

      {/* Account */}
      {profile && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-xs font-medium tracking-wide text-ink-secondary uppercase">Account</p>
          <div className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
            <SettingsRow label="Name" value={profile.full_name} />
            <SettingsRow label="Role" value={capitalize(profile.role)} />
            <SettingsRow label="Credential" value={profile.credential} />
            <SettingsRow label="Home Department" value={profile.home_unit} last />
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

      {/* Security */}
      <div className="mt-4">
        <p className="mb-2 px-1 text-xs font-medium tracking-wide text-ink-secondary uppercase">Security</p>
        <div className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
          <button
            type="button"
            onClick={() => toggleAction('password')}
            data-testid="profile-change-password"
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-medium text-ink">Change Password</span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={`text-ink-secondary transition-transform ${openAction === 'password' ? 'rotate-180' : ''}`}
            />
          </button>

          {openAction === 'password' ? (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3 border-t border-hairline px-4 pt-4 pb-4">
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                data-testid="profile-new-password"
                className="h-auto border-hairline bg-white px-3.5 py-3 text-sm focus-visible:border-ink focus-visible:ring-0"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                data-testid="profile-confirm-password"
                className="h-auto border-hairline bg-white px-3.5 py-3 text-sm focus-visible:border-ink focus-visible:ring-0"
              />
              {passwordError && <p className="text-sm text-red-700">{passwordError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  data-testid="profile-password-save"
                  className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {passwordSaving ? 'Saving…' : 'Update password'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleAction('password')}
                  disabled={passwordSaving}
                  data-testid="profile-password-cancel"
                  className="rounded-full border border-[#E8E6E3] px-4 py-2 text-sm font-medium text-[#111111] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <ShiftListDivider inset={false} />
          )}

          <SettingsRow label="Connected Accounts" value={connectedAccounts || 'None'} last />
        </div>
        {passwordSuccess && <p className="mt-2 px-1 text-sm text-teal-foreground">Password updated.</p>}
      </div>

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

      {/* Delete account */}
      <div className="mt-4">
        <div className={`${SHIFT_LIST_CLASSNAME} py-1.5`}>
          <button
            type="button"
            onClick={() => toggleAction('delete')}
            data-testid="profile-delete-account"
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-medium text-red-600">Delete Account</span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={`text-red-600 transition-transform ${openAction === 'delete' ? 'rotate-180' : ''}`}
            />
          </button>

          {openAction === 'delete' && (
            <div className="flex flex-col gap-3 border-t border-hairline px-4 pt-4 pb-4">
              <p className="text-sm font-medium text-[#111111]">Delete your account?</p>
              <p className="text-sm text-[#6B7280]">
                This is permanent and cannot be undone. Your profile and all associated data will be removed.
              </p>
              <p className="text-sm text-[#6B7280]">Type DELETE below to confirm.</p>
              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="DELETE"
                autoCapitalize="characters"
                autoComplete="off"
                data-testid="profile-delete-confirm-input"
                className="h-auto border-hairline bg-white px-3.5 py-3 text-sm focus-visible:border-ink focus-visible:ring-0"
              />
              {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleteSaving}
                  data-testid="profile-delete-confirm"
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {deleteSaving ? 'Deleting…' : 'Delete account'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleAction('delete')}
                  disabled={deleteSaving}
                  data-testid="profile-delete-cancel"
                  className="rounded-full border border-[#E8E6E3] px-4 py-2 text-sm font-medium text-[#111111] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[#9CA3AF]">Shiftko · Beta</p>
    </main>
  )
}
