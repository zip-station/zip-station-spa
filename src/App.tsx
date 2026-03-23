import { useEffect, useState } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { SetupPage } from '@/pages/SetupPage'
import { api } from '@/lib/api'
import { router } from '@/routes'

function App() {
  const { user, loading } = useAuth()
  const [systemStatus, setSystemStatus] = useState<'loading' | 'uninitialized' | 'ready'>('loading')

  useEffect(() => {
    api.get<{ initialized: boolean }>('/api/v1/system/status')
      .then(({ initialized }) => setSystemStatus(initialized ? 'ready' : 'uninitialized'))
      .catch(() => setSystemStatus('ready'))
  }, [])

  if (loading || systemStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (systemStatus === 'uninitialized') {
    return (
      <SetupPage
        onComplete={() => {
          setSystemStatus('ready')
          window.location.reload()
        }}
      />
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <RouterProvider router={router} />
}

export default App
