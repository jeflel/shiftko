import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Screen2 from './Screen2'
import Screen3 from './Screen3'
import Screen4 from './Screen4'
import Screen5 from './Screen5'
import Screen6 from './Screen6'

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(2)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('nurse')

  function handleName({ firstName: first, lastName: last }) {
    setFirstName(first)
    setLastName(last)
    setStep(3)
  }

  function handleRole(selectedRole) {
    setRole(selectedRole)
    setStep(4)
  }

  function handleFacility() {
    setStep(5)
  }

  function handlePainPoints() {
    setStep(6)
  }

  async function handleFinish() {
    await supabase
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`.trim(),
        role,
        onboarding_completed: true,
      })
      .eq('id', user.id)
    onComplete()
  }

  return (
    <>
      {step === 2 && <Screen2 onContinue={handleName} />}
      {step === 3 && <Screen3 firstName={firstName} onContinue={handleRole} />}
      {step === 4 && <Screen4 onContinue={handleFacility} />}
      {step === 5 && <Screen5 onContinue={handlePainPoints} />}
      {step === 6 && <Screen6 firstName={firstName} onFinish={handleFinish} />}
    </>
  )
}
