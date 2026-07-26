import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LottieImport from 'lottie-react'
import Confetti from 'react-confetti'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import mascotData from '../assets/mascot.json'

const Lottie = LottieImport.default || LottieImport

const INVITE_CODE = 'BURLINGAME'
const FRAUNCES = { fontFamily: "'Fraunces', serif" }
const DM_SANS = { fontFamily: "'DM Sans', sans-serif" }

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

function WelcomeScreen({ onNext }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-between px-6 py-12 text-center">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        style={FRAUNCES}
        className="text-3xl text-[#4F46E5]"
      >
        shiftko
      </motion.p>

      <div className="flex flex-1 flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Lottie animationData={mascotData} loop autoplay style={{ width: 200, height: 200 }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={FRAUNCES}
          className="mx-auto mt-6 max-w-xs text-3xl font-semibold text-[#1A1A2E]"
        >
          Made for nurses. Built for your unit.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={DM_SANS}
          className="mt-3 text-sm text-[#5C5C7A]"
        >
          Shift scheduling that actually works.
        </motion.p>
      </div>

      <motion.button
        type="button"
        onClick={onNext}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        style={DM_SANS}
        className="w-full rounded-full bg-[#1A1A2E] py-4 font-semibold text-white"
      >
        Let's go
      </motion.button>
    </div>
  )
}

function NameScreen({ name, onChangeName, onNext }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-12">
      <Lottie animationData={mascotData} loop autoplay style={{ width: 120, height: 120 }} />

      <h1 style={FRAUNCES} className="mt-8 text-center text-3xl font-semibold text-[#1A1A2E]">
        What should we call you?
      </h1>

      <div className="mt-10 flex w-full max-w-xs items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(event) => onChangeName(event.target.value)}
          placeholder="Your name"
          autoFocus
          style={DM_SANS}
          className="w-full border-b-2 border-[#C7D2FE] bg-transparent py-2 text-2xl text-[#1A1A2E] placeholder-[#C7D2FE] focus:outline-none"
        />
        <AnimatePresence>
          {name.trim().length > 0 && (
            <motion.button
              type="button"
              onClick={onNext}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="shrink-0 rounded-full bg-[#4F46E5] p-4 text-white"
              aria-label="Continue"
            >
              <ArrowRight size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function RoleScreen({ firstName, onSelectRole }) {
  const [selected, setSelected] = useState(null)

  const roles = [
    { value: 'nurse', emoji: '🩺', label: 'Nurse', desc: 'I claim and view shifts' },
    { value: 'coordinator', emoji: '📋', label: 'Coordinator', desc: 'I post and manage shifts' },
  ]

  function handleSelect(value) {
    setSelected(value)
    setTimeout(() => onSelectRole(value), 400)
  }

  return (
    <div className="flex min-h-screen w-full flex-col px-6 py-12">
      <h1 style={FRAUNCES} className="text-3xl font-semibold text-[#1A1A2E]">
        Nice to meet you, {firstName}!
      </h1>
      <p style={DM_SANS} className="mt-2 text-sm text-[#5C5C7A]">
        What best describes your role?
      </p>

      <div className="mt-10 flex flex-col gap-4">
        {roles.map((option, index) => (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: selected === option.value ? [1, 1.03, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.4, delay: index * 0.15 },
              y: { duration: 0.4, delay: index * 0.15 },
              scale: { duration: 0.2 },
            }}
            className={`min-h-[80px] rounded-2xl border-2 bg-white p-5 text-left ${
              selected === option.value ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#E8E6E3]'
            }`}
          >
            <p style={DM_SANS} className="text-lg font-bold text-[#1A1A2E]">
              {option.emoji} {option.label}
            </p>
            <p style={DM_SANS} className="mt-1 text-sm text-[#5C5C7A]">
              {option.desc}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function UnitScreen({ onSelectUnit }) {
  const [selected, setSelected] = useState(null)
  const units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4']

  function handleSelect(unit) {
    setSelected(unit)
    setTimeout(() => onSelectUnit(unit), 400)
  }

  return (
    <div className="flex min-h-screen w-full flex-col px-6 py-12">
      <h1 style={FRAUNCES} className="text-3xl font-semibold text-[#1A1A2E]">
        Which unit do you work on?
      </h1>

      <div className="mt-10 flex flex-col gap-4">
        {units.map((unit, index) => (
          <motion.button
            key={unit}
            type="button"
            onClick={() => handleSelect(unit)}
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: selected === unit ? [1, 1.03, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.4, delay: index * 0.15 },
              y: { duration: 0.4, delay: index * 0.15 },
              scale: { duration: 0.2 },
            }}
            style={DM_SANS}
            className={`min-h-[64px] w-full rounded-full border-2 font-semibold ${
              selected === unit
                ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                : 'border-[#E8E6E3] bg-white text-[#1A1A2E]'
            }`}
          >
            {unit}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function CelebrationScreen({ firstName, onFinish }) {
  const { width, height } = useWindowSize()
  const [recycle, setRecycle] = useState(true)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRecycle(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  async function handleCopyCode() {
    await navigator.clipboard.writeText(INVITE_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const shareText = `Join my unit on Shiftko! Use code: ${INVITE_CODE} at shiftko.com`
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        // user dismissed the native share sheet, nothing to do
      }
    } else {
      await navigator.clipboard.writeText(shareText)
    }
  }

  async function handleFinish() {
    setSaving(true)
    await onFinish()
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center px-6 py-12">
      <Confetti width={width} height={height} recycle={recycle} numberOfPieces={250} />

      <h1 style={FRAUNCES} className="mt-4 text-center text-3xl font-semibold text-[#1A1A2E]">
        You're all set, {firstName}!
      </h1>
      <p style={DM_SANS} className="mt-2 text-center text-sm text-[#5C5C7A]">
        Welcome to your unit's Shiftko.
      </p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mt-8 w-full rounded-2xl border border-[#E8E6E3] bg-white p-5 shadow-sm"
      >
        <p style={DM_SANS} className="text-xs tracking-wide text-[#5C5C7A] uppercase">
          Invite your teammates
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span style={DM_SANS} className="rounded-full bg-[#EEF2FF] px-4 py-2 font-mono font-semibold text-[#4F46E5]">
            {INVITE_CODE}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="rounded-full border border-[#E8E6E3] p-2 text-[#5C5C7A]"
            aria-label="Copy invite code"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <p style={DM_SANS} className="mt-3 text-xs text-[#5C5C7A]">
          Share this code so coworkers can join your unit.
        </p>
      </motion.div>

      <div className="mt-auto flex w-full flex-col gap-3 pt-10">
        <button
          type="button"
          onClick={handleFinish}
          disabled={saving}
          style={DM_SANS}
          className="w-full rounded-full bg-[#1A1A2E] py-4 font-semibold text-white disabled:opacity-60"
        >
          Let's go
        </button>
        <button
          type="button"
          onClick={handleShare}
          style={DM_SANS}
          className="w-full rounded-full border border-[#E8E6E3] py-3 text-[#1A1A2E]"
        >
          Share
        </button>
      </div>
    </div>
  )
}

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [, setRole] = useState(null)
  const [, setUnit] = useState(null)

  const firstName = name.trim().split(' ')[0] || 'there'

  function handleRoleSelect(value) {
    setRole(value)
    setStep(value === 'coordinator' ? 5 : 4)
  }

  function handleUnitSelect(value) {
    setUnit(value)
    setStep(5)
  }

  async function handleFinish() {
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    onComplete()
  }

  return (
    <div className="min-h-screen w-full bg-[#F4F3FF]">
      {step === 1 && <WelcomeScreen onNext={() => setStep(2)} />}
      {step === 2 && <NameScreen name={name} onChangeName={setName} onNext={() => setStep(3)} />}
      {step === 3 && <RoleScreen firstName={firstName} onSelectRole={handleRoleSelect} />}
      {step === 4 && <UnitScreen onSelectUnit={handleUnitSelect} />}
      {step === 5 && <CelebrationScreen firstName={firstName} onFinish={handleFinish} />}
    </div>
  )
}
