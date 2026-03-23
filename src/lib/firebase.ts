import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getConfig } from './config'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _googleProvider: GoogleAuthProvider | null = null

function ensureInitialized() {
  if (!_app) {
    const config = getConfig()
    const firebaseConfig = {
      apiKey: config.firebaseApiKey,
      authDomain: config.firebaseAuthDomain,
      projectId: config.firebaseProjectId,
    }
    _app = initializeApp(firebaseConfig)
    _auth = getAuth(_app)
    _googleProvider = new GoogleAuthProvider()
  }
}

// These getters are accessed after loadConfig() completes in main.tsx
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    ensureInitialized()
    return (_auth as never)[prop]
  },
})

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    ensureInitialized()
    return (_googleProvider as never)[prop]
  },
})
