import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getConfig } from './config'

const config = (() => {
  try { return getConfig() } catch { return null }
})()

const firebaseConfig = {
  apiKey: config?.firebaseApiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: config?.firebaseAuthDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config?.firebaseProjectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
