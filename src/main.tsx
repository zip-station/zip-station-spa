import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { loadConfig } from '@/lib/config'
import { AuthProvider } from '@/hooks/useAuth'
import App from './App'
import './i18n'
import './index.css'
import '@/store/themeStore' // Initialize theme on load

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

// Load config (runtime /config.json or Vite .env) before rendering
loadConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
