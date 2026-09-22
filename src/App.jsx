import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { getTabScroll, saveTabScroll } from './lib/tab-scroll'
import { clearHomeCache } from './lib/home-cache'
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
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import Screen0 from './pages/onboarding/Screen0'

function App() {
  const [session, setSession] = useState(null)
  const [authView, setAuthView] = useState(null)
  const [role, setRole] = useState(null)
  const [workspaceId, setWorkspaceId] = useState(null)
  const [fullName, setFullName] = useState(null)
  // Home's own unit, carried here so the header's open-shift count does not have
  // to wait for Home's own profile query (2026-09-22). Home's "N open shifts"
  // query filters on `home_unit`, and it used to read that value out of the
  // profile row IT fetches on mount, so the count could not start until that
  // row landed: a second network wave on every return to Home. This function
  // already reads the same row for role, so the value is free here and is
  // handed down as a prop. Home still refreshes it from its own query, which is
  // what keeps a unit changed in the Staff tab from going stale.
  const [homeUnit, setHomeUnit] = useState(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  const [justJoinedWorkspace, setJustJoinedWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTabState] = useState('home')
  const contentRef = useRef(null)
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
      } else {
        // Signing out drops Home's cached payload (home-cache.js). The cache is
        // keyed by user, so this is hygiene rather than correctness: nothing
        // should hold one nurse's name, unit and shifts in memory for whatever
        // session loads next.
        clearHomeCache()
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Every navigation in this app goes through here (the wrapper keeps the
  // original setActiveTab call sites untouched), which makes it the one place
  // that can still read the outgoing tab's offset. .app-content is a single
  // scroller shared by every tab, so the moment the children swap, the browser
  // clamps its scrollTop to the incoming page's height and the old value is
  // gone.
  function setActiveTab(tab) {
    if (contentRef.current) saveTabScroll(activeTab, contentRef.current.scrollTop)
    setActiveTabState(tab)
  }

  // Put the incoming tab back where the user left it. Pages fetch their data on
  // mount, so for the first frames the content is too short to hold the offset:
  // setting it once is clamped to nothing and lost, which is why this re-applies
  // it while the content is still growing and then releases. It also releases on
  // the first real input, so the loop can never fight a user who starts
  // scrolling immediately.
  useLayoutEffect(() => {
    const scroller = contentRef.current
    if (!scroller) return undefined

    const target = getTabScroll(activeTab) ?? 0
    scroller.scrollTop = target
    if (target === 0) return undefined

    let frameId = 0
    let frames = 0

    function release() {
      cancelAnimationFrame(frameId)
      window.removeEventListener('touchstart', release)
      window.removeEventListener('wheel', release)
    }

    function step() {
      scroller.scrollTop = target
      if (scroller.scrollHeight - scroller.clientHeight >= target) {
        release()
        return
      }
      frames += 1
      if (frames < 120) frameId = requestAnimationFrame(step)
      else release()
    }

    window.addEventListener('touchstart', release, { passive: true })
    window.addEventListener('wheel', release, { passive: true })
    frameId = requestAnimationFrame(step)

    return release
  }, [activeTab])

  async function fetchRole(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, workspace_id, full_name, onboarding_completed, home_unit')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setRole(data.role)
      setWorkspaceId(data.workspace_id)
      setFullName(data.full_name)
      setOnboardingCompleted(data.onboarding_completed)
      setHomeUnit(data.home_unit ?? null)
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

  // Home's greeting-row avatar opens the Profile tab.
  function handleOpenProfile() {
    setActiveTab('more')
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
      <div className="app-content" ref={contentRef}>
        {activeTab === 'home' && (
          <Home
            user={session.user}
            role={role}
            homeUnit={homeUnit}
            onGoToManage={handleGoToManage}
            onGoToPostShift={handleGoToPostShift}
            onGoToApprovals={handleGoToApprovals}
            onGoToPool={handleGoToPool}
            onGoToSchedule={handleGoToSchedule}
            onOpenProfile={handleOpenProfile}
          />
        )}
        {activeTab === 'schedule' && (
          <Schedule
            user={session.user}
            role={role}
            initialTab={scheduleInitialTab}
          />
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
          <Pool
            user={session.user}
            onGoToSchedule={handleGoToSchedule}
          />
        )}
        {activeTab === 'more' && (
          <Profile
            user={session.user}
            onWorkspaceLeft={() => setWorkspaceId(null)}
          />
        )}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleBottomNavChange} />
    </div>
  )
}

export default App
