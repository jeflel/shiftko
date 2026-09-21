import { useState } from 'react'
import Screen0 from './Screen0'
import Screen2 from './Screen2'
import Screen3 from './Screen3'
import ScreenJob from './ScreenJob'
import Screen5 from './Screen5'
import Screen6 from './Screen6'
import { supabase } from '@/lib/supabase'

// Shown once after a first sign-in, while the profile's onboarding_completed is
// false. Collects the name, role, unit and credential, then writes them onto the
// profile the signup trigger already created.
//
// The role choice never writes `role` directly. A self-declared coordinator goes
// into `requested_role` and stays a nurse until the existing coordinator
// confirms it in the staff roster, because `is_coordinator()` grants full access
// to every shift, claim and notification in the facility.
//
// BAR_TOTAL is the number of steps that draw a progress bar. The invite screen
// sits before the flow and the final celebration has no bar, so neither counts.
// Keep it equal to the number of bar-bearing steps below: FlowTopBar derives its
// fill from step/BAR_TOTAL, so bumping this is the only edit a new step needs on
// the bar's side. It is 4 today (name, role, job, pain points); the v2 flow takes
// it to 6 once the periods, shifts and alerts screens land, and the pain-points
// screen goes away.
const BAR_TOTAL = 4

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('nurse')
  const [unit, setUnit] = useState(null)
  const [credential, setCredential] = useState('RN')
  const [saving, setSaving] = useState(false)

  function handleName({ firstName: first, lastName: last }) {
    setFirstName(first)
    setLastName(last)
    setStep(3)
  }

  function handleRole(selectedRole) {
    setRole(selectedRole)
    setStep(4)
  }

  // Credential and unit arrive together now that they share a screen.
  function handleJob({ credential: selectedCredential, unit: selectedUnit }) {
    setCredential(selectedCredential)
    setUnit(selectedUnit)
    setStep(5)
  }

  function handlePainPoints() {
    setStep(6)
  }

  async function handleFinish() {
    if (saving) return
    setSaving(true)
    if (user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: `${firstName} ${lastName}`.trim(),
          role: 'nurse',
          requested_role: role === 'coordinator' ? 'coordinator' : null,
          credential,
          home_unit: unit,
          onboarding_completed: true,
        })
        .eq('id', user.id)
      if (error) {
        // Leave onboarding_completed false so the flow runs again rather than
        // dropping the user into an app with an empty profile.
        console.error('onboarding save failed', error)
        setSaving(false)
        return
      }
    }
    onComplete()
  }

  return (
    <>
      {step === 0 && <Screen0 onGetStarted={() => setStep(2)} onSignIn={() => setStep(2)} />}
      {step === 2 && (
        <Screen2 step={1} total={BAR_TOTAL} onBack={() => setStep(0)} onContinue={handleName} />
      )}
      {step === 3 && (
        <Screen3
          step={2}
          total={BAR_TOTAL}
          firstName={firstName}
          onBack={() => setStep(2)}
          onContinue={handleRole}
        />
      )}
      {step === 4 && (
        <ScreenJob
          step={3}
          total={BAR_TOTAL}
          onBack={() => setStep(3)}
          onContinue={handleJob}
        />
      )}
      {step === 5 && (
        <Screen5
          step={4}
          total={BAR_TOTAL}
          onBack={() => setStep(4)}
          onContinue={handlePainPoints}
        />
      )}
      {step === 6 && (
        <Screen6 firstName={firstName} saving={saving} onFinish={handleFinish} />
      )}
    </>
  )
}
