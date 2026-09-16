import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import Pool from './pages/Pool'
import Profile from './pages/Profile'
import PostShift from './pages/PostShift'
import ShiftEdit from './pages/ShiftEdit'
import CoordinatorApprovals from './pages/CoordinatorApprovals'
import CoordinatorManage from './pages/CoordinatorManage'
import StaffRoster from './pages/StaffRoster'
import DuplicateWeek from './pages/DuplicateWeek'
import Screen0 from './pages/onboarding/Screen0'

function App() {
  const [session, setSession] = useState(null)
  const [authView, setAuthView] = useState(null)
  const [role, setRole] = useState(null)
  const [workspaceId, setWorkspaceId] = useState(null)
  const [fullName, setFullName] = useState(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  const [justJoinedWorkspace, setJustJoinedWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [scheduleInitialTab, setScheduleInitialTab] = useState('schedule')
  // Post a Shift has two entry points (Home's tile, and the Manage hub's own
  // CTA) that need different back targets - tracks which one was used.
  const [postShiftReturnTo, setPostShiftReturnTo] = useState('home')
  const [editingShift, setEditingShift] = useState(null)

  useEffect(() => {
    let active = true

    async function initAuth() {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!active) return

      setSession(currentSession)
      if (currentSession) {
        fetchRole(currentSession.user.id)
      } else {
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession) {
        fetchRole(currentSession.user.id)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchRole(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, workspace_id, full_name, onboarding_completed')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setRole(data.role)
      setWorkspaceId(data.workspace_id)
      setFullName(data.full_name)
      setOnboardingCompleted(data.onboarding_completed)
    }
    setLoading(false)
  }

  function handleBottomNavChange(tab) {
    setScheduleInitialTab('schedule')
    setActiveTab(tab)
  }

  function handleGoToManage() {
    setActiveTab('manage')
  }

  function handleGoToPostShift() {
    setPostShiftReturnTo('home')
    setActiveTab('postshift')
  }

  function handleGoToPostShiftFromManage() {
    setPostShiftReturnTo('manage')
    setActiveTab('postshift')
  }

  function handlePostShiftBack() {
    setActiveTab(postShiftReturnTo)
  }

  function handleGoToEditShift(shift) {
    setEditingShift(shift)
    setActiveTab('shiftsedit')
  }

  function handleShiftEditBack() {
    setEditingShift(null)
    setActiveTab('manage')
  }

  function handleGoToApprovals() {
    setActiveTab('approvals')
  }

  function handleGoToStaffRoster() {
    setActiveTab('staffroster')
  }

  function handleGoToDuplicateWeek() {
    setActiveTab('duplicateweek')
  }

  function handleBackToHome() {
    setActiveTab('home')
  }

  function handleBackToManage() {
    setActiveTab('manage')
  }

  function handleGoToPool() {
    setActiveTab('pool')
  }

  function handleGoToSchedule() {
    setScheduleInitialTab('schedule')
    setActiveTab('schedule')
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
      </div>
    )
  }
  if (!session) {
    if (!authView) {
      return (
        <Screen0
          onGetStarted={() => setAuthView('signup')}
          onSignIn={() => setAuthView('signin')}
        />
      )
    }
    return <Auth initialView={authView} />
  }

  // A profile whose onboarding is still incomplete gets the flow before the app
  // shell. The signup trigger creates the profile, this fills it in.
  if (onboardingCompleted === false) {
    return (
      <OnboardingFlow user={session.user} onComplete={() => setOnboardingCompleted(true)} />
    )
  }

  return (
    <div className="app-shell">
      <div className="app-content">
        {activeTab === 'home' && (
          <Home
            user={session.user}
            role={role}
            onGoToManage={handleGoToManage}
            onGoToPostShift={handleGoToPostShift}
            onGoToApprovals={handleGoToApprovals}
            onGoToPool={handleGoToPool}
            onGoToSchedule={handleGoToSchedule}
          />
        )}
        {activeTab === 'schedule' && (
          <Schedule user={session.user} role={role} initialTab={scheduleInitialTab} />
        )}
        {activeTab === 'postshift' && <PostShift onBack={handlePostShiftBack} />}
        {activeTab === 'shiftsedit' && editingShift && (
          <ShiftEdit
            shift={editingShift}
            onBack={handleShiftEditBack}
            onSaved={handleShiftEditBack}
            onRemoved={handleShiftEditBack}
          />
        )}
        {activeTab === 'approvals' && <CoordinatorApprovals onBack={handleBackToHome} />}
        {activeTab === 'manage' && (
          <CoordinatorManage
            onBack={handleBackToHome}
            onGoToPostShift={handleGoToPostShiftFromManage}
            onGoToStaff={handleGoToStaffRoster}
            onGoToDuplicateWeek={handleGoToDuplicateWeek}
            onEditShift={handleGoToEditShift}
          />
        )}
        {activeTab === 'staffroster' && <StaffRoster onBack={handleBackToManage} />}
        {activeTab === 'duplicateweek' && <DuplicateWeek onBack={handleBackToManage} />}
        {activeTab === 'pool' && (
          <Pool user={session.user} onGoToSchedule={handleGoToSchedule} />
        )}
        {activeTab === 'more' && (
          <Profile user={session.user} onWorkspaceLeft={() => setWorkspaceId(null)} />
        )}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleBottomNavChange} />
    </div>
  )
}

export default App
