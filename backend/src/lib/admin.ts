import admin from 'firebase-admin'
import { ApiError } from './errors.js'

let initialized = false

export function getAdmin(): typeof admin {
  if (initialized) return admin
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw?.trim()) {
    throw new ApiError(
      503,
      'failed-precondition',
      'Defina FIREBASE_SERVICE_ACCOUNT_JSON no .env da pasta backend (JSON da conta de serviço, uma linha) ou nas variáveis do Railway — o mesmo projeto Firebase do front-end.',
    )
  }
  let cred: admin.ServiceAccount
  try {
    cred = JSON.parse(raw) as admin.ServiceAccount
  } catch {
    throw new ApiError(
      503,
      'failed-precondition',
      'FIREBASE_SERVICE_ACCOUNT_JSON tem de ser JSON válido (ficheiro da conta de serviço numa única linha).',
    )
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(cred),
    })
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new ApiError(
      503,
      'failed-precondition',
      `Firebase Admin não iniciou (credenciais ou projeto). Detalhe: ${detail}`,
    )
  }
  initialized = true
  return admin
}

export function getDb() {
  return getAdmin().firestore()
}
