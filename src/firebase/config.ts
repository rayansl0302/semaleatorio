import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
  | string
  | undefined

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(measurementId ? { measurementId } : {}),
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

/** Chaves obrigatórias no `.env` da raiz (prefixo VITE_ — exigido pelo Vite). */
export const REQUIRED_FIREBASE_VITE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export function missingFirebaseViteEnvVars(): readonly string[] {
  const env = import.meta.env as Record<string, string | undefined>
  return REQUIRED_FIREBASE_VITE_KEYS.filter((k) => !str(env[k]))
}

function createFirebase(): { app: FirebaseApp } | null {
  const apiKey = str(firebaseConfig.apiKey)
  const authDomain = str(firebaseConfig.authDomain)
  const projectId = str(firebaseConfig.projectId)
  const storageBucket = str(firebaseConfig.storageBucket)
  const messagingSenderId = str(firebaseConfig.messagingSenderId)
  const appId = str(firebaseConfig.appId)
  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null
  }
  const mid = str(measurementId)
  const app = initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(mid ? { measurementId: mid } : {}),
  })
  return { app }
}

const fb = createFirebase()
export const firebaseReady = fb !== null
export const app = fb?.app ?? null

export const auth = fb ? getAuth(fb.app) : null

const firestoreSettings = import.meta.env.DEV
  ? { localCache: memoryLocalCache() }
  : {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }

function createFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, firestoreSettings)
  } catch {
    return getFirestore(app)
  }
}

export const db = fb ? createFirestore(fb.app) : null

/** @returns `core` se faltam chaves Web · `null` se ok */
export function firebaseFeedBlockedReason(): 'core' | null {
  if (!firebaseReady) return 'core'
  if (!db) return 'core'
  return null
}
