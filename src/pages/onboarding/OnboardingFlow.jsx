import { useState } from 'react'
import Screen0 from './Screen0'
import Screen2 from './Screen2'
import Screen3 from './Screen3'
import Screen4 from './Screen4'
import ScreenCredential from './ScreenCredential'
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

  function handleUnit(selectedUnit) {
    setUnit(selectedUnit)
    setStep(4.5)
  }

  function handleCredential(selectedCredential) {
    setCredential(selectedCredential)
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
      {step === 2 && <Screen2 onBack={() => setStep(0)} onContinue={handleName} />}
      {step === 3 && (
        <Screen3 firstName={firstName} onBack={() => setStep(2)} onContinue={handleRole} />
      )}
      {step === 4 && <Screen4 onBack={() => setStep(3)} onContinue={handleUnit} />}
      {step === 4.5 && (
        <ScreenCredential onBack={() => setStep(4)} onContinue={handleCredential} />
      )}
      {step === 5 && <Screen5 onBack={() => setStep(4.5)} onContinue={handlePainPoints} />}
      {step === 6 && (
        <Screen6 firstName={firstName} saving={saving} onFinish={handleFinish} />
      )}
    </>
  )
}
