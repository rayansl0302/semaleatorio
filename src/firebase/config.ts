import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
  | string
  | undefined

const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL as
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
  ...(databaseURL ? { databaseURL } : {}),
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

/**
 * Auth (Google popup etc.) exige o mesmo objeto do Console: apiKey, authDomain,
 * projectId, storageBucket, messagingSenderId, appId. Se faltar authDomain/appId,
 * o SDK até inicia, mas signIn dispara auth/configuration-not-found.
 */
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
  const dbu = str(databaseURL)
  const app = initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(mid ? { measurementId: mid } : {}),
    ...(dbu ? { databaseURL: dbu } : {}),
  })
  return { app }
}

const fb = createFirebase()
export const firebaseReady = fb !== null
export const app = fb?.app ?? null

export const auth = fb ? getAuth(fb.app) : null

/**
 * Sem experimentalForceLongPolling: o WebChannel normal é mais rápido; o SDK já
 * usa auto-detect de long-polling quando preciso. Forçar long-polling em tudo
 * deixava getDoc/setDoc visivelmente lentos.
 */
const firestoreSettings = import.meta.env.DEV
  ? { localCache: memoryLocalCache() }
  : {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }

/**
 * Dev: cache em memória + long polling. HMR/Strict Mode: se já existir instância, usa getFirestore.
 */
function createFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, firestoreSettings)
  } catch {
    return getFirestore(app)
  }
}

export const db = fb ? createFirestore(fb.app) : null

const functionsRegion =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined)?.trim() ||
  'us-central1'
export const functions = fb ? getFunctions(fb.app, functionsRegion) : null
export const rtdb: Database | null =
  fb && str(databaseURL) ? getDatabase(fb.app) : null
