import { useState, useEffect } from 'react'
import { Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { api } from '@/lib/api'
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'

interface InviteSetupPageProps {
  code: string
  onComplete: () => void
}

export function InviteSetupPage({ code, onComplete }: InviteSetupPageProps) {
  const [status, setStatus] = useState<'loading' | 'valid' | 'error'>('loading')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get<{ email: string; displayName?: string }>(`/api/v1/public/invite/${code}`)
      .then((data) => {
        setEmail(data.email)
        setDisplayName(data.displayName || '')
        setStatus('valid')
      })
      .catch((err: Error) => {
        setError(err.message || 'Invalid or expired invite link')
        setStatus('error')
      })
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      // Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth.current, email, password)
      const firebaseUserId = credential.user.uid

      // Link Firebase account to the pre-created user record
      await api.post(`/api/v1/public/invite/${code}/complete`, {
        firebaseUserId,
        displayName: displayName || undefined,
      })

      onComplete()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account'
      if (message.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try signing in instead.')
      } else {
        setError(message)
      }
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-bold">Invalid Invite</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-6" onClick={() => window.location.href = '/'}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Inbox className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Welcome to Zip Station</h1>
          <p className="mt-1 text-muted-foreground">Set up your account to get started</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
