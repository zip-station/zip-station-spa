import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Inbox, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

const firebaseErrorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Unable to create account. Please try a different email or sign in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
}

function firebaseErrorToMessage(message: string): string | null {
  for (const [code, text] of Object.entries(firebaseErrorMessages)) {
    if (message.includes(code)) return text
  }
  return null
}

interface SetupPageProps {
  onComplete: () => void
}

type Step = 'welcome' | 'account' | 'company' | 'complete'

export function SetupPage({ onComplete }: SetupPageProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await createUserWithEmailAndPassword(auth.current, email, password)
      setStep('company')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      setError(firebaseErrorToMessage(message) || 'Account creation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAccount = async () => {
    setError(null)
    setLoading(true)

    try {
      const result = await signInWithPopup(auth.current, googleProvider.current)
      setDisplayName(result.user.displayName || '')
      setEmail(result.user.email || '')
      setStep('company')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      setError(firebaseErrorToMessage(message) || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const firebaseUser = auth.current.currentUser
      if (!firebaseUser) {
        setError('No authenticated user. Please go back and sign in.')
        setLoading(false)
        return
      }

      api.setTokenProvider(() => firebaseUser.getIdToken())

      await api.post('/api/v1/system/setup', {
        companyName,
        displayName: displayName || firebaseUser.displayName || email.split('@')[0],
      })

      setStep('complete')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Setup failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Inbox className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Zip Station</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Zip Station</h2>
              <p className="text-muted-foreground">
                Let's set up your helpdesk. This will only take a minute.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-left space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <div>
                  <p className="font-medium">Create your admin account</p>
                  <p className="text-sm text-muted-foreground">Sign up with email or Google</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <div>
                  <p className="font-medium">Name your company</p>
                  <p className="text-sm text-muted-foreground">This is your organization in Zip Station</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                <div>
                  <p className="font-medium">You're ready!</p>
                  <p className="text-sm text-muted-foreground">Start creating projects and receiving tickets</p>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep('account')}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: Account */}
        {step === 'account' && (
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold">Create your admin account</h2>
              <p className="text-sm text-muted-foreground">This will be the owner account for your helpdesk</p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">Your Name</label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Jane Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <PasswordInput
                  id="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Account
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleAccount} disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <button
              type="button"
              onClick={() => setStep('welcome')}
              className="block w-full text-center text-sm text-muted-foreground hover:underline"
            >
              Back
            </button>
          </div>
        )}

        {/* Step: Company */}
        {step === 'company' && (
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold">Name your company</h2>
              <p className="text-sm text-muted-foreground">
                This is your organization in Zip Station. You can change it later.
              </p>
            </div>

            <form onSubmit={handleSetupComplete} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !companyName.trim()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground">
                Your helpdesk is ready. Create your first project to start receiving tickets.
              </p>
            </div>
            <Button className="w-full" onClick={onComplete}>
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
