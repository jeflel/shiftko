import { useState } from 'react'
import SwapPickCoworker from './SwapPickCoworker'
import SwapPickShift from './SwapPickShift'
import SwapReview from './SwapReview'

// Owns the pick-coworker -> pick-shift -> review step state for requesting a
// swap of `shift` (the requester's own shift, from ShiftDetail's "Request a
// swap" button), same multi-screen-flow pattern as onboarding/OnboardingFlow.jsx.
export default function SwapFlow({ user, shift, onBack, onSent }) {
  const [step, setStep] = useState('pick-coworker')
  const [coworker, setCoworker] = useState(null)
  const [coworkerShift, setCoworkerShift] = useState(null)

  if (step === 'pick-coworker') {
    return (
      <SwapPickCoworker
        user={user}
        shift={shift}
        selectedCoworker={coworker}
        onSelect={setCoworker}
        onContinue={() => setStep('pick-shift')}
        onBack={onBack}
      />
    )
  }

  if (step === 'pick-shift') {
    return (
      <SwapPickShift
        coworker={coworker}
        selectedShift={coworkerShift}
        onSelect={setCoworkerShift}
        onContinue={() => setStep('review')}
        onBack={() => setStep('pick-coworker')}
      />
    )
  }

  return (
    <SwapReview
      user={user}
      myShift={shift}
      coworker={coworker}
      coworkerShift={coworkerShift}
      onBack={() => setStep('pick-shift')}
      onCancel={onBack}
      onSent={onSent}
    />
  )
}
