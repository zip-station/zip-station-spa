import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getConfig } from './config'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _googleProvider: GoogleAuthProvider | null = null

function ensureInitialized() {
  if (!_app) {
    const config = getConfig()
    _app = initializeApp({
      apiKey: config.firebaseApiKey,
      authDomain: config.firebaseAuthDomain,
      projectId: config.firebaseProjectId,
    })
    _auth = getAuth(_app)
    _googleProvider = new GoogleAuthProvider()
  }
}

// Lazy getters — safe to call after loadConfig() completes
export const auth = {
  get current(): Auth {
    ensureInitialized()
    return _auth!
  }
}

export const googleProvider = {
  get current(): GoogleAuthProvider {
    ensureInitialized()
    return _googleProvider!
  }
}
