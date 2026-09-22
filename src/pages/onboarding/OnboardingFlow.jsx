import { useState } from 'react'
import Screen0 from './Screen0'
import Screen2 from './Screen2'
import Screen3 from './Screen3'
import ScreenJob from './ScreenJob'
import ScreenPeriods from './ScreenPeriods'
import ScreenOpenShifts from './ScreenOpenShifts'
import ScreenAlerts from './ScreenAlerts'
import Screen6 from './Screen6'
import { supabase } from '@/lib/supabase'

// Shown once after a first sign-in, while the profile's onboarding_completed is
// false. Collects the name, role, unit, credential and shift preferences, then
// writes them onto the profile the signup trigger already created.
//
// The role choice never writes `role` directly. A self-declared coordinator goes
// into `requested_role` and stays a nurse until the existing coordinator
// confirms it in the staff roster, because `is_coordinator()` grants full access
// to every shift, claim and notification in the facility.
//
// Answers are persisted AS THEY ARE GIVEN, not only at the end. Two reasons:
// the open-shifts screen reads live shifts through a policy that filters on the
// profile's own home_unit, so that column has to be in the database before that
// screen mounts or the policy returns nothing and the screen looks broken; and a
// nurse who abandons the flow halfway keeps what she already typed instead of
// starting over. The final write repeats every field, so a failed incremental
// write still lands.
//
// BAR_TOTAL counts the steps that draw a progress bar. The invite screen sits
// before the flow and the final celebration has no bar, so neither counts.
const BAR_TOTAL = 6

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('nurse')
  const [unit, setUnit] = useState(null)
  const [credential, setCredential] = useState('RN')
  const [periods, setPeriods] = useState([])
  const [alertsOn, setAlertsOn] = useState(false)
  const [saving, setSaving] = useState(false)

  // Returns whether the write landed, so a caller that depends on the row being
  // current (the open-shifts screen) can wait for it. A failure is logged and the
  // flow continues: the final write retries every field, and blocking a nurse
  // mid-onboarding on a network blip is worse than a field arriving late.
  async function saveFields(patch) {
    if (!user?.id) return false
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (error) {
      console.error('onboarding save failed', error)
      return false
    }
    return true
  }

  function handleName({ firstName: first, lastName: last }) {
    setFirstName(first)
    setLastName(last)
    setStep(3)
  }

  function handleRole(selectedRole) {
    setRole(selectedRole)
    setStep(4)
  }

  // Credential and unit arrive together now that they share a screen. Written
  // immediately: the open-shifts screen two steps later cannot see anything
  // through the shifts policy until home_unit is on the row.
  async function handleJob({ credential: selectedCredential, unit: selectedUnit }) {
    setCredential(selectedCredential)
    setUnit(selectedUnit)
    await saveFields({ credential: selectedCredential, home_unit: selectedUnit })
    setStep(5)
  }

  async function handlePeriods(selectedPeriods) {
    setPeriods(selectedPeriods)
    await saveFields({ preferred_periods: selectedPeriods })
    setStep(6)
  }

  async function handleAlerts(enabled) {
    setAlertsOn(enabled)
    await saveFields({ notification_opt_in: enabled })
    setStep(8)
  }

  async function handleFinish() {
    if (saving) return
    setSaving(true)

    const ok = await saveFields({
      full_name: `${firstName} ${lastName}`.trim(),
      role: 'nurse',
      requested_role: role === 'coordinator' ? 'coordinator' : null,
      credential,
      home_unit: unit,
      preferred_periods: periods,
      notification_opt_in: alertsOn,
      onboarding_completed: true,
    })

    if (!ok) {
      // Leave onboarding_completed false so the flow runs again rather than
      // dropping the user into an app with an empty profile.
      setSaving(false)
      return
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
        <ScreenJob step={3} total={BAR_TOTAL} onBack={() => setStep(3)} onContinue={handleJob} />
      )}
      {step === 5 && (
        <ScreenPeriods
          step={4}
          total={BAR_TOTAL}
          onBack={() => setStep(4)}
          onContinue={handlePeriods}
        />
      )}
      {step === 6 && (
        <ScreenOpenShifts
          step={5}
          total={BAR_TOTAL}
          unit={unit}
          onBack={() => setStep(5)}
          onContinue={() => setStep(7)}
        />
      )}
      {step === 7 && (
        <ScreenAlerts
          step={6}
          total={BAR_TOTAL}
          email={user?.email ?? ''}
          unit={unit}
          periods={periods}
          onBack={() => setStep(6)}
          onContinue={handleAlerts}
        />
      )}
      {step === 8 && (
        <Screen6 firstName={firstName} saving={saving} onFinish={handleFinish} />
      )}
    </>
  )
}
