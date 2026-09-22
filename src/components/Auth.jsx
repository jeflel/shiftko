import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signinFieldClassName =
  'h-[54px] rounded-button border-hairline bg-white px-4 text-[17px] tracking-[-0.34px] text-ink placeholder:text-ink-secondary focus-visible:border-ink focus-visible:ring-0 focus-visible:outline-none'

export default function Auth({ initialView = 'signin' }) {
  const [view, setView] = useState(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  function toggleView() {
    setView((current) => (current === 'signin' ? 'signup' : 'signin'))
    setError(null)
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  async function handleSignIn(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
    }
  }

  async function handleSignUp(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'nurse',
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      setSignedUp(true)
    }
  }

  if (signedUp) {
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-6 pb-8">
        <p className="py-8 text-center text-base">Check your email to confirm your account</p>
      </main>
    )
  }

  if (view === 'signup') {
    return (
      <main className="mx-auto flex h-[100svh] w-full max-w-md flex-col overflow-y-auto px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <h1 className="text-[30px] font-semibold tracking-[-0.6px] text-ink">
          Create your account
        </h1>
        <p className="mt-4 text-[17px] tracking-[-0.34px] text-ink-secondary">
          Track shifts, see who's working, claim open ones.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          data-testid="auth-google-signin"
          className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-button border border-hairline bg-white text-[17px] font-semibold tracking-[-0.34px] text-ink disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72c-.18-.54-.28-1.11-.28-1.72s.1-1.18.28-1.72V4.94H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.06l3.01-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.47.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="text-[15px] tracking-[-0.3px] text-ink-secondary">or</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        <form className="flex flex-col" onSubmit={handleSignUp}>
          <Label htmlFor="signupEmail" className="mb-2 text-[17px] font-semibold text-ink">
            Email
          </Label>
          <Input
            id="signupEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email"
            required
            autoComplete="email"
            data-testid="auth-email-input"
            className={`mb-4 ${signinFieldClassName}`}
          />

          <Label htmlFor="signupPassword" className="mb-2 text-[17px] font-semibold text-ink">
            Password
          </Label>
          <Input
            id="signupPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
            autoComplete="new-password"
            data-testid="auth-password-input"
            className={signinFieldClassName}
          />

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            data-testid="auth-submit"
            className="mt-8 h-[54px] w-full"
          >
            {loading ? 'Signing up…' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-4 text-center text-[15px] tracking-[-0.3px] text-ink-secondary">
          Already have an account?{' '}
          <button type="button" onClick={toggleView} data-testid="auth-toggle-view" className="font-semibold">
            Sign in
          </button>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex h-[100svh] w-full max-w-md flex-col overflow-y-auto px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
      <h1 className="text-[30px] font-semibold tracking-[-0.6px] text-ink">
        Welcome back.
      </h1>
      <p className="mt-4 text-[17px] tracking-[-0.34px] text-ink-secondary">
        Sign in to view your shifts and stay connected with your team.
      </p>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        data-testid="auth-google-signin"
        className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-button border border-hairline bg-white text-[17px] font-semibold tracking-[-0.34px] text-ink disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72c-.18-.54-.28-1.11-.28-1.72s.1-1.18.28-1.72V4.94H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.06l3.01-2.34z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.47.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
        {googleLoading ? 'Connecting…' : 'Continue with Google'}
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-[15px] tracking-[-0.3px] text-ink-secondary">or</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>

      <form className="flex flex-col" onSubmit={handleSignIn}>
        <Label htmlFor="email" className="mb-2 text-[17px] font-semibold text-ink">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter email"
          required
          autoComplete="email"
          data-testid="auth-email-input"
          className={`mb-4 ${signinFieldClassName}`}
        />

        <Label htmlFor="password" className="mb-2 text-[17px] font-semibold text-ink">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
            autoComplete="current-password"
            data-testid="auth-password-input"
            className={`pr-11 ${signinFieldClassName}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-ink-secondary"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          data-testid="auth-submit"
          className="mt-8 h-[54px] w-full rounded-button bg-teal-field text-[17px] font-semibold tracking-[-0.34px] text-white hover:bg-teal-field-hover disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-4 text-center text-[15px] tracking-[-0.3px] text-ink-secondary">
        Don't have an account?{' '}
        <button type="button" onClick={toggleView} data-testid="auth-toggle-view" className="font-semibold">
          Sign up
        </button>
      </p>
    </main>
  )
}
