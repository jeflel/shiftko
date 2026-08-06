import { useState } from 'react'
import Screen0 from './Screen0'
import Screen2 from './Screen2'
import Screen3 from './Screen3'
import Screen4 from './Screen4'
import ScreenCredential from './ScreenCredential'
import Screen5 from './Screen5'
import Screen6 from './Screen6'

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('nurse')
  const [credential, setCredential] = useState('RN')

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
    setStep(4.5)
  }

  function handleCredential(selectedCredential) {
    setCredential(selectedCredential)
    setStep(5)
  }

  function handlePainPoints() {
    setStep(6)
  }

  function handleFinish() {
    onComplete()
  }

  return (
    <>
      {step === 0 && <Screen0 onGetStarted={() => setStep(2)} onSignIn={() => setStep(2)} />}
      {step === 2 && <Screen2 onBack={() => setStep(0)} onContinue={handleName} />}
      {step === 3 && (
        <Screen3 firstName={firstName} onBack={() => setStep(2)} onContinue={handleRole} />
      )}
      {step === 4 && <Screen4 onBack={() => setStep(3)} onContinue={handleFacility} />}
      {step === 4.5 && (
        <ScreenCredential onBack={() => setStep(4)} onContinue={handleCredential} />
      )}
      {step === 5 && <Screen5 onBack={() => setStep(4.5)} onContinue={handlePainPoints} />}
      {step === 6 && <Screen6 firstName={firstName} onFinish={handleFinish} />}
    </>
  )
}
