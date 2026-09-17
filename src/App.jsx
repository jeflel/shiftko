import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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

// Screen change motion, see MOTION.md. The four tab screens are peers, so they
// cross-fade at Fast. A pushed screen (Manage, Post a Shift, Edit Shift,
// Approvals, Staff, Duplicate Week) carries a short directional slide at Slow,
// which is what makes the app read as a stack you go into and come back out of.
//
// Two deliberate calls here, both recorded in MOTION.md:
// - The exit is much shorter than the enter. mode="wait" means the old screen
//   has to finish before the new one starts, so a full Slow exit on both sides
//   would make every navigation feel like it stalled.
// - The slide is a short offset rather than a full-width push. A real platform
//   push animates the outgoing screen off-screen, which needs each screen to own
//   its own scroll container. This app has one shared scroller and no router, so
//   a full push would either show both screens at once or dump the scroll
//   position. The directional offset gets most of the feel for none of that.
const NAV_MOTION = {
  tab: { enterMs: 150, exitMs: 80, offset: 0 },
  push: { enterMs: 300, exitMs: 80, offset: 18 },
  pop: { enterMs: 300, exitMs: 80, offset: -18 },
}
const NAV_EASE = [0, 0, 0.2, 1]

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
  const [navDirection, setNavDirection] = useState('tab')
  // Post a Shift has two entry points (Home's tile, and the Manage hub's own
  // CTA) that need different back targets - tracks which one was used.
  const [postShiftReturnTo, setPostShiftReturnTo] = useState('home')
  const [editingShift, setEditingShift] = useState(null)
  const prefersReducedMotion = useReducedMotion()

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

  // Every screen change goes through here, for two reasons: the transition has
  // to know which way it is going, and the shared scroll container has to start
  // the new screen at the top rather than wherever the last one was scrolled to.
  function navigate(nextTab, direction) {
    const scroller = document.querySelector('.app-content')
    if (scroller) scroller.scrollTop = 0
    setNavDirection(direction)
    setActiveTab(nextTab)
  }

  function handleBottomNavChange(tab) {
    setScheduleInitialTab('schedule')
    navigate(tab, 'tab')
  }

  function handleGoToManage() {
    navigate('manage', 'push')
  }

  function handleGoToPostShift() {
    setPostShiftReturnTo('home')
    navigate('postshift', 'push')
  }

  function handleGoToPostShiftFromManage() {
    setPostShiftReturnTo('manage')
    navigate('postshift', 'push')
  }

  function handlePostShiftBack() {
    navigate(postShiftReturnTo, 'pop')
  }

  function handleGoToEditShift(shift) {
    setEditingShift(shift)
    navigate('shiftsedit', 'push')
  }

  function handleShiftEditBack() {
    setEditingShift(null)
    navigate('manage', 'pop')
  }

  function handleGoToApprovals() {
    navigate('approvals', 'push')
  }

  function handleGoToStaffRoster() {
    navigate('staffroster', 'push')
  }

  function handleGoToDuplicateWeek() {
    navigate('duplicateweek', 'push')
  }

  function handleBackToHome() {
    navigate('home', 'pop')
  }

  function handleBackToManage() {
    navigate('manage', 'pop')
  }

  function handleGoToPool() {
    navigate('pool', 'tab')
  }

  function handleGoToSchedule() {
    setScheduleInitialTab('schedule')
    navigate('schedule', 'tab')
  }

  // Home's greeting-row avatar opens the Profile tab.
  function handleOpenProfile() {
    navigate('more', 'tab')
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

  const timing = NAV_MOTION[navDirection] ?? NAV_MOTION.tab
  const enterState = prefersReducedMotion
    ? { opacity: 1, x: 0 }
    : { opacity: 0, x: timing.offset }
  const exitState = prefersReducedMotion
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, transition: { duration: timing.exitMs / 1000, ease: NAV_EASE } }

  return (
    <div className="app-shell">
      <div className="app-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={enterState}
            animate={{ opacity: 1, x: 0 }}
            exit={exitState}
            transition={{ duration: prefersReducedMotion ? 0 : timing.enterMs / 1000, ease: NAV_EASE }}
          >
            {activeTab === 'home' && (
              <Home
                user={session.user}
                role={role}
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
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleBottomNavChange} />
    </div>
  )
}

export default App
