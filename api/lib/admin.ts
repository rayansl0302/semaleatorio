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
  admin.initializeApp({
    credential: admin.credential.cert(cred),
  })
  initialized = true
  return admin
}

export function getDb() {
  return getAdmin().firestore()
}
