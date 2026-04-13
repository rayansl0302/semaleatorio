import admin from 'firebase-admin'

let initialized = false

export function getAdmin(): typeof admin {
  if (initialized) return admin
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim()
  if (!raw?.trim()) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON on Vercel')
  }
  if (!databaseURL) {
    throw new Error(
      'Missing FIREBASE_DATABASE_URL — mesma URL do Realtime Database que VITE_FIREBASE_DATABASE_URL.',
    )
  }
  let cred: admin.ServiceAccount
  try {
    cred = JSON.parse(raw) as admin.ServiceAccount
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON')
  }
  admin.initializeApp({
    credential: admin.credential.cert(cred),
    databaseURL,
  })
  initialized = true
  return admin
}

export function getRtdb(): admin.database.Database {
  return getAdmin().database()
}
