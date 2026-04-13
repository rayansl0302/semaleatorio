import admin from 'firebase-admin'

let initialized = false

export function getAdmin(): typeof admin {
  if (initialized) return admin
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw?.trim()) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON on Vercel')
  }
  let cred: admin.ServiceAccount
  try {
    cred = JSON.parse(raw) as admin.ServiceAccount
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON')
  }
  const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim()
  const opts: admin.AppOptions = {
    credential: admin.credential.cert(cred),
  }
  if (databaseURL) {
    opts.databaseURL = databaseURL
  }
  admin.initializeApp(opts)
  initialized = true
  return admin
}

/** RTDB no servidor — exige `FIREBASE_DATABASE_URL` (gravação com Admin). */
export function getRtdb(): admin.database.Database {
  const url = process.env.FIREBASE_DATABASE_URL?.trim()
  if (!url) {
    throw new Error(
      'Missing FIREBASE_DATABASE_URL — mesma URL do Realtime Database que VITE_FIREBASE_DATABASE_URL.',
    )
  }
  return getAdmin().database(url)
}
