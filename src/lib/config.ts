// Runtime config — loaded from /config.json (Docker) or falls back to Vite env vars (local dev)

interface AppConfig {
  apiUrl: string
  firebaseApiKey: string
  firebaseAuthDomain: string
  firebaseProjectId: string
}

let _config: AppConfig | null = null
let _loaded = false

export async function loadConfig(): Promise<AppConfig> {
  if (_config) return _config

  // Try runtime config first (Docker container generates this)
  if (!_loaded) {
    try {
      const response = await fetch('/config.json')
      if (response.ok) {
        const json = await response.json()
        if (json.apiUrl) {
          _config = {
            apiUrl: json.apiUrl,
            firebaseApiKey: json.firebaseApiKey || '',
            firebaseAuthDomain: json.firebaseAuthDomain || '',
            firebaseProjectId: json.firebaseProjectId || '',
          }
          _loaded = true
          console.log('[Config] Loaded from /config.json (runtime)')
          return _config
        }
      }
    } catch {
      // config.json doesn't exist — fall back to Vite env vars
    }
    _loaded = true
  }

  // Fall back to Vite env vars (local development with .env file)
  _config = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5100',
    firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  }
  console.log('[Config] Loaded from Vite env vars (local dev)')
  return _config
}

// Synchronous getter — only works after loadConfig() has been called
export function getConfig(): AppConfig {
  if (!_config) {
    throw new Error('Config not loaded yet. Call loadConfig() first.')
  }
  return _config
}
